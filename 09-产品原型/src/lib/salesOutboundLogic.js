import { skuOptions } from '../data/masterData.js';
import { computeLineTaxMetrics, computeLinesTotals } from './format.js';
import { nextDocumentNo } from './documentNo.js';
import { upsertMockRow, readMockRows, writeMockRows } from './mockStorage.js';
import { loadOrderById, nowStamp, DELIVERY_NOTICE_STORAGE_KEY } from './salesOrderLogic.js';
import { getAvailableStock, getReservationRemaining, loadStockFlows, postStockEntries } from './inventoryStockLogic.js';
import { captureSalesDocumentNames, loadRowsWithNameSnapshots } from './documentNameSnapshots.js';

export const SALES_OUTBOUND_STORAGE_KEY = 'qs-erp:sales-outbounds:v2';

export const auditStatusLabels = {
  approved: '已审核',
};

export const financeErpPushStatusLabels = {
  un_pushed: '未推送',
  pushing: '推送中',
  push_success: '推送成功',
  push_failed: '推送失败',
};

export const sourceTypeLabels = {
  b2b_notice: 'B2B发货通知',
  shopify: '独立站订单',
  external_toc: '外部ToC',
};

const FINANCE_ERP_AUTO_RETRY_MAX = 3;
const financeErpTimers = new Map();

export function enrichOutboundLine(line) {
  const sku = skuOptions.find((item) => item.value === line.product);
  const quantity = Number(line.quantity || 0);
  const metrics = computeLineTaxMetrics({ ...line, quantity });
  return {
    ...line,
    productCode: line.productCode || sku?.skuCode || '',
    barcode: line.barcode || sku?.barcode || '',
    productName: line.productName || sku?.productName || '',
    unit: line.unit || sku?.unit || '个',
    quantity,
    price: Number(line.price || 0),
    taxRate: line.taxRate ?? '',
    netPrice: metrics.netUnit,
    netAmount: metrics.netAmount,
    grossAmount: metrics.grossAmount,
    taxAmount: metrics.taxAmount,
  };
}

export function refreshOutboundLines(lines = []) {
  return lines.map(enrichOutboundLine);
}

export function normalizeOutboundRow(row) {
  const lines = refreshOutboundLines(row.lines || []);
  const totals = computeLinesTotals(lines);
  return {
    ...row,
    lines,
    totalOutboundQty: totals.quantity,
    amount: totals.grossAmount,
    taxAmount: totals.taxAmount,
    netAmount: totals.netAmount,
    totalAmount: totals.netAmount,
    businessDate: row.businessDate || String(row.actualOutboundTime || '').slice(0, 10),
    updatedAt: row.updatedAt || nowStamp(),
    updater: row.updater || '系统',
  };
}

export function persistOutbound(row) {
  const previous = readMockRows(SALES_OUTBOUND_STORAGE_KEY, []).find((item) => item.id === row.id) || null;
  const next = normalizeOutboundRow(captureSalesDocumentNames(row, { previous }));
  upsertMockRow(SALES_OUTBOUND_STORAGE_KEY, next);
  return next;
}

export function loadAllOutbounds(seed = []) {
  const rows = readMockRows(SALES_OUTBOUND_STORAGE_KEY, seed);
  const legacyTocSeed = rows.find((row) => row.id === 'sales-outbound-toc-seed'
    && row.sourceType === 'external_toc'
    && row.sourceOrderNo === 'TOC-20260922-0001'
    && row.warehouse === 'LWH000009'
    && row.lines?.some((line) => line.product === 'SP0101020001'));
  if (legacyTocSeed) {
    const next = rows.map((row) => row.id !== legacyTocSeed.id ? row : normalizeOutboundRow({
      ...row,
      sourceOrderNo: '',
      externalOrderNo: row.externalOrderNo || row.sourceOrderNo,
      warehouse: 'LWH000001',
      warehouseNameSnapshot: '',
      warehouseSnapshotCode: '',
      lines: row.lines.map((line) => line.product === 'SP0101020001'
        ? { ...line, product: 'SP0101010001', price: 128 }
        : line),
    }));
    writeMockRows(SALES_OUTBOUND_STORAGE_KEY, next);
  }
  const currentRows = readMockRows(SALES_OUTBOUND_STORAGE_KEY, seed);
  const missingSeeds = seed.filter((row) => !currentRows.some((item) => item.id === row.id));
  if (missingSeeds.length) writeMockRows(SALES_OUTBOUND_STORAGE_KEY, [...currentRows, ...missingSeeds]);
  return loadRowsWithNameSnapshots(SALES_OUTBOUND_STORAGE_KEY, seed, captureSalesDocumentNames);
}

export function loadOutboundById(id) {
  return loadAllOutbounds([]).find((item) => item.id === id) || null;
}

export function loadOutboundByNoticeId(noticeId) {
  return loadAllOutbounds([]).find((item) => item.sourceNoticeId === noticeId) || null;
}

export function loadOutboundsByOrderId(orderId, orderNo) {
  return loadAllOutbounds([])
    .filter((item) => item.sourceOrderId === orderId || (orderNo && item.sourceOrderNo === orderNo))
    .sort((left, right) => String(right.actualOutboundTime || right.createdAt || '').localeCompare(String(left.actualOutboundTime || left.createdAt || '')));
}

function resolveOrderLine(orderRow, sourceOrderLineId, product) {
  return orderRow?.lines?.find((line) => line.id === sourceOrderLineId || line.product === product) || null;
}

function buildOutboundLinesFromNotice(noticeRow, orderRow) {
  return refreshOutboundLines(
    (noticeRow.lines || [])
      .filter((line) => Number(line.shippedQty || 0) > 0)
      .map((line, index) => {
        const orderLine = resolveOrderLine(orderRow, line.sourceOrderLineId || line.id, line.product);
        const quantity = Number(line.shippedQty || 0);
        return enrichOutboundLine({
          id: line.id || `outbound-line-${index + 1}`,
          sourceNoticeLineId: line.id,
          product: line.product,
          productCode: line.productCode,
          barcode: line.barcode,
          productName: line.productName,
          unit: line.unit,
          quantity,
          price: orderLine?.price ?? 0,
          taxRate: orderLine?.taxRate ?? '13',
        });
      }),
  );
}

function clearFinanceErpTimer(outboundId) {
  const timer = financeErpTimers.get(outboundId);
  if (timer) {
    window.clearTimeout(timer);
    financeErpTimers.delete(outboundId);
  }
}

function scheduleFinanceErpAttempt(outboundId, attempt = 1, forceFail = false) {
  clearFinanceErpTimer(outboundId);
  const current = loadOutboundById(outboundId);
  if (!current || current.financeErpPushStatus === 'push_success') return current;

  persistOutbound({
    ...current,
    financeErpPushStatus: 'pushing',
    pushFailReason: attempt > 1 ? current.pushFailReason : '',
  });

  const timer = window.setTimeout(() => {
    financeErpTimers.delete(outboundId);
    const latest = loadOutboundById(outboundId);
    if (!latest || latest.financeErpPushStatus !== 'pushing') return;

    const shouldFail = forceFail && attempt >= FINANCE_ERP_AUTO_RETRY_MAX;
    if (shouldFail) {
      persistOutbound({
        ...latest,
        financeErpPushStatus: 'push_failed',
        pushFailReason: latest.pushFailReason || '接口超时，财务ERP未确认接收',
      });
      return;
    }

    if (forceFail && attempt < FINANCE_ERP_AUTO_RETRY_MAX) {
      persistOutbound({
        ...latest,
        financeErpPushStatus: 'push_failed',
        pushFailReason: `第${attempt}次推送失败，系统将自动重试`,
      });
      scheduleFinanceErpAttempt(outboundId, attempt + 1, true);
      return;
    }

    persistOutbound({
      ...latest,
      financeErpPushStatus: 'push_success',
      pushTime: nowStamp(),
      pushFailReason: '',
    });
  }, attempt === 1 ? 800 : 600);

  financeErpTimers.set(outboundId, timer);
  return loadOutboundById(outboundId);
}

export function simulateFinanceErpPush(outboundId, { forceFail = false } = {}) {
  return scheduleFinanceErpAttempt(outboundId, 1, forceFail);
}

export function generateOutboundFromNotice(noticeRow) {
  if (!noticeRow || noticeRow.status !== 'shipped') return null;
  if (loadOutboundByNoticeId(noticeRow.id)) return loadOutboundByNoticeId(noticeRow.id);

  const shippedTotal = (noticeRow.lines || []).reduce((sum, line) => sum + Number(line.shippedQty || 0), 0);
  if (shippedTotal <= 0) return null;

  const orderRow = loadOrderById(noticeRow.sourceOrderId);
  const lines = buildOutboundLinesFromNotice(noticeRow, orderRow);
  if (!lines.length) return null;

  const actualOutboundTime = noticeRow.finalShipTime || nowStamp();
  const businessDate = actualOutboundTime.slice(0, 10);
  const existingNos = loadAllOutbounds([]).map((row) => row.outboundNo);
  if (!orderRow) throw new Error('来源销售订单不存在，不能生成销售出库单');
  const outboundNo = noticeRow.outboundNo || nextDocumentNo('XSCK', businessDate, existingNos);
  const outboundId = noticeRow.outboundId || `outbound-${noticeRow.id}`;
  const alreadyPosted = loadStockFlows().some((flow) => flow.sourceType === '销售出库单' && flow.sourceNo === outboundNo);
  if (!alreadyPosted) {
    postStockEntries(lines.map((line) => {
      const noticeLine = (noticeRow.lines || []).find((item) => item.id === line.sourceNoticeLineId);
      const shippedQty = Number(line.quantity || 0);
      const shortQty = Math.max(0, Number(noticeLine?.notifyQty || 0) - shippedQty);
      const reservationSourceLineNo = noticeLine?.sourceOrderLineId;
      const reservationRemaining = getReservationRemaining({
        logicalWarehouse: noticeRow.warehouse,
        product: line.product,
        sourceNo: orderRow.orderNo,
        sourceLineNo: reservationSourceLineNo,
      });
      if (reservationRemaining === 0) {
        if (getAvailableStock(noticeRow.warehouse, line.product) < shippedQty) {
          throw new Error(`逻辑仓${noticeRow.warehouse}商品${line.product}可用库存不足，不能生成出库结果`);
        }
        return { logicalWarehouse: noticeRow.warehouse, product: line.product, instantDelta: -shippedQty };
      }
      if (reservationRemaining < shippedQty + (orderRow.businessStatus === 'closed' ? shortQty : 0)) {
        throw new Error(`来源订单商品${line.product}预占数量不足，不能生成出库结果`);
      }
      return {
        logicalWarehouse: noticeRow.warehouse,
        product: line.product,
        instantDelta: -shippedQty,
        consumeReserved: shippedQty,
        releaseReserved: orderRow.businessStatus === 'closed' ? shortQty : 0,
        reservationSourceNo: orderRow.orderNo,
        reservationSourceLineNo,
      };
    }), {
      eventType: 'result_out',
      sourceType: '销售出库单',
      sourceNo: outboundNo,
      businessType: '销售出库',
      reservationSourceNo: orderRow.orderNo,
      operator: '系统',
      time: actualOutboundTime,
    });
  }

  const outbound = persistOutbound({
    id: outboundId,
    outboundNo,
    sourceType: 'b2b_notice',
    sourceNoticeId: noticeRow.id,
    sourceNoticeNo: noticeRow.noticeNo,
    sourceOrderId: noticeRow.sourceOrderId,
    sourceOrderNo: noticeRow.sourceOrderNo,
    customer: noticeRow.customer,
    customerNameSnapshot: noticeRow.customerNameSnapshot,
    customerSnapshotCode: noticeRow.customerSnapshotCode,
    warehouse: noticeRow.warehouse,
    warehouseNameSnapshot: noticeRow.warehouseNameSnapshot,
    warehouseSnapshotCode: noticeRow.warehouseSnapshotCode,
    currency: orderRow?.currency || '人民币',
    auditStatus: 'approved',
    financeErpPushStatus: 'un_pushed',
    businessDate,
    actualOutboundTime,
    pushTime: '',
    pushFailReason: '',
    remark: '',
    auditor: '',
    auditTime: actualOutboundTime,
    creator: '系统',
    createdAt: actualOutboundTime,
    updater: '系统',
    lines,
  });

  upsertMockRow(DELIVERY_NOTICE_STORAGE_KEY, {
    ...noticeRow,
    outboundId: outbound.id,
    outboundNo: outbound.outboundNo,
  });

  simulateFinanceErpPush(outbound.id);
  return outbound;
}

export function buildSeedOutboundFromNotice(noticeRow, orderRow, overrides = {}) {
  const lines = buildOutboundLinesFromNotice(noticeRow, orderRow);
  const actualOutboundTime = noticeRow.finalShipTime || nowStamp();
  const businessDate = actualOutboundTime.slice(0, 10);
  return normalizeOutboundRow({
    id: overrides.id || `outbound-seed-${noticeRow.id}`,
    outboundNo: overrides.outboundNo || nextDocumentNo('XSCK', businessDate, []),
    sourceType: 'b2b_notice',
    sourceNoticeId: noticeRow.id,
    sourceNoticeNo: noticeRow.noticeNo,
    sourceOrderId: noticeRow.sourceOrderId,
    sourceOrderNo: noticeRow.sourceOrderNo,
    customer: noticeRow.customer,
    customerNameSnapshot: noticeRow.customerNameSnapshot,
    customerSnapshotCode: noticeRow.customerSnapshotCode,
    warehouse: noticeRow.warehouse,
    warehouseNameSnapshot: noticeRow.warehouseNameSnapshot,
    warehouseSnapshotCode: noticeRow.warehouseSnapshotCode,
    currency: orderRow?.currency || '人民币',
    auditStatus: 'approved',
    financeErpPushStatus: overrides.financeErpPushStatus || 'push_success',
    businessDate,
    actualOutboundTime,
    pushTime: overrides.pushTime || actualOutboundTime,
    pushFailReason: overrides.pushFailReason || '',
    remark: '',
    auditor: '',
    auditTime: actualOutboundTime,
    creator: '系统',
    createdAt: actualOutboundTime,
    updater: '系统',
    updatedAt: overrides.updatedAt || actualOutboundTime,
    lines,
    ...overrides,
  });
}
