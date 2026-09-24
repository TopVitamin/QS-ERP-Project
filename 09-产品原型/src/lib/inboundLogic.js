import { skuOptions } from '../data/masterData.js';
import { computeLineTaxMetrics, computeLinesTotals } from './format.js';
import { nextDocumentNo } from './documentNo.js';
import { upsertMockRow, readMockRows, writeMockRows } from './mockStorage.js';
import { loadOrderById, nowStamp, NOTICE_STORAGE_KEY } from './purchaseOrderLogic.js';
import { ensureStockRow, loadStockFlows, postStockEntries } from './inventoryStockLogic.js';
import { capturePurchaseDocumentNames, loadRowsWithNameSnapshots } from './documentNameSnapshots.js';

export const INBOUND_STORAGE_KEY = 'qs-erp:purchase-inbounds:v4';

export const auditStatusLabels = {
  approved: '已审核',
};

export const financeErpPushStatusLabels = {
  un_pushed: '未推送',
  pushing: '推送中',
  push_success: '推送成功',
  push_failed: '推送失败',
};

const FINANCE_ERP_AUTO_RETRY_MAX = 3;
const financeErpTimers = new Map();

export function enrichInboundLine(line) {
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

export function refreshInboundLines(lines = []) {
  return lines.map(enrichInboundLine);
}

export function normalizeInboundRow(row) {
  const lines = refreshInboundLines(row.lines || []);
  const totals = computeLinesTotals(lines);
  return {
    ...row,
    lines,
    totalInboundQty: totals.quantity,
    amount: totals.grossAmount,
    taxAmount: totals.taxAmount,
    netAmount: totals.netAmount,
    totalAmount: totals.netAmount,
    businessDate: row.businessDate || String(row.actualInboundTime || '').slice(0, 10),
    updatedAt: row.updatedAt || nowStamp(),
    updater: row.updater || '系统',
  };
}

export function persistInbound(row) {
  const previous = readMockRows(INBOUND_STORAGE_KEY, []).find((item) => item.id === row.id) || null;
  const next = normalizeInboundRow(capturePurchaseDocumentNames(row, { previous }));
  upsertMockRow(INBOUND_STORAGE_KEY, next);
  return next;
}

export function loadAllInbounds(seed = []) {
  const stored = readMockRows(INBOUND_STORAGE_KEY, []);
  const missingSeeds = seed.filter((row) => !stored.some((item) => item.id === row.id));
  if (missingSeeds.length) writeMockRows(INBOUND_STORAGE_KEY, [...stored, ...missingSeeds]);
  return loadRowsWithNameSnapshots(INBOUND_STORAGE_KEY, seed, capturePurchaseDocumentNames);
}

/** 清理旧Demo中把实体仓编码误存为入库逻辑仓的结果行；仅按来源通知/订单映射，不猜仓库编码。 */
export function cleanLegacyInboundWarehouseRows(seedRows = [], seedNotices = [], orders = []) {
  const stored = readMockRows(INBOUND_STORAGE_KEY, null);
  if (!Array.isArray(stored)) return seedRows;
  const notices = readMockRows('qs-erp:purchase-receipt-notices:v2', seedNotices);
  const kept = [];
  const removedIds = new Set();
  let changed = false;

  for (const row of stored) {
    if (!/^WH\d+/.test(String(row.warehouse || ''))) {
      kept.push(row);
      continue;
    }
    const notice = notices.find((item) => item.id === row.sourceNoticeId || item.noticeNo === row.sourceNoticeNo);
    const order = orders.find((item) => item.id === (notice?.sourceOrderId || row.sourceOrderId)
      || item.orderNo === (notice?.sourceOrderNo || row.sourceOrderNo));
    const logicalWarehouse = [notice?.warehouse, order?.warehouse].find((value) => /^LWH\d+$/.test(String(value || '')));
    changed = true;
    if (!logicalWarehouse) {
      removedIds.add(row.id);
      continue;
    }
    const warehouseSource = notice?.warehouse === logicalWarehouse ? notice : order?.warehouse === logicalWarehouse ? order : null;
    kept.push({
      ...row,
      warehouse: logicalWarehouse,
      warehouseNameSnapshot: warehouseSource?.warehouseNameSnapshot || '',
      warehouseSnapshotCode: logicalWarehouse,
    });
  }

  if (changed) writeMockRows(INBOUND_STORAGE_KEY, kept);
  if (removedIds.size) {
    const nextNotices = notices.map((notice) => removedIds.has(notice.inboundId)
      ? { ...notice, inboundId: '', inboundNo: '' }
      : notice);
    writeMockRows('qs-erp:purchase-receipt-notices:v2', nextNotices);
  }
  return kept;
}

export function loadInboundById(id) {
  return loadAllInbounds([]).find((item) => item.id === id) || null;
}

export function loadInboundByNoticeId(noticeId) {
  return loadAllInbounds([]).find((item) => item.sourceNoticeId === noticeId) || null;
}

export function loadInboundsByOrderId(orderId, orderNo) {
  return loadAllInbounds([])
    .filter((item) => item.sourceOrderId === orderId || (orderNo && item.sourceOrderNo === orderNo))
    .sort((left, right) => String(right.actualInboundTime || right.createdAt || '').localeCompare(String(right.actualInboundTime || right.createdAt || '')));
}

function resolveOrderLine(orderRow, sourceOrderLineId, product) {
  return orderRow?.lines?.find((line) => line.id === sourceOrderLineId || line.product === product) || null;
}

function buildInboundLinesFromNotice(noticeRow, orderRow) {
  return refreshInboundLines(
    (noticeRow.lines || [])
      .filter((line) => Number(line.receivedQty || 0) > 0)
      .map((line, index) => {
        const orderLine = resolveOrderLine(orderRow, line.sourceOrderLineId || line.id, line.product);
        const quantity = Number(line.receivedQty || 0);
        return enrichInboundLine({
          id: line.id || `inbound-line-${index + 1}`,
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

function clearFinanceErpTimer(inboundId) {
  const timer = financeErpTimers.get(inboundId);
  if (timer) {
    window.clearTimeout(timer);
    financeErpTimers.delete(inboundId);
  }
}

function scheduleFinanceErpAttempt(inboundId, attempt = 1, forceFail = false) {
  clearFinanceErpTimer(inboundId);
  const current = loadInboundById(inboundId);
  if (!current || current.financeErpPushStatus === 'push_success') return current;

  persistInbound({
    ...current,
    financeErpPushStatus: 'pushing',
    pushFailReason: attempt > 1 ? current.pushFailReason : '',
  });

  const timer = window.setTimeout(() => {
    financeErpTimers.delete(inboundId);
    const latest = loadInboundById(inboundId);
    if (!latest || latest.financeErpPushStatus !== 'pushing') return;

    const shouldFail = forceFail && attempt >= FINANCE_ERP_AUTO_RETRY_MAX;
    if (shouldFail) {
      persistInbound({
        ...latest,
        financeErpPushStatus: 'push_failed',
        pushFailReason: latest.pushFailReason || '接口超时，财务ERP未确认接收',
      });
      return;
    }

    if (forceFail && attempt < FINANCE_ERP_AUTO_RETRY_MAX) {
      persistInbound({
        ...latest,
        financeErpPushStatus: 'push_failed',
        pushFailReason: `第${attempt}次推送失败，系统将自动重试`,
      });
      scheduleFinanceErpAttempt(inboundId, attempt + 1, true);
      return;
    }

    persistInbound({
      ...latest,
      financeErpPushStatus: 'push_success',
      pushTime: nowStamp(),
      pushFailReason: '',
    });
  }, attempt === 1 ? 800 : 600);

  financeErpTimers.set(inboundId, timer);
  return loadInboundById(inboundId);
}

export function simulateFinanceErpPush(inboundId, { forceFail = false } = {}) {
  return scheduleFinanceErpAttempt(inboundId, 1, forceFail);
}

export function generateInboundFromNotice(noticeRow) {
  if (!noticeRow || noticeRow.status !== 'received') return null;
  if (loadInboundByNoticeId(noticeRow.id)) return loadInboundByNoticeId(noticeRow.id);

  const receivedTotal = (noticeRow.lines || []).reduce((sum, line) => sum + Number(line.receivedQty || 0), 0);
  if (receivedTotal <= 0) return null;

  const orderRow = loadOrderById(noticeRow.sourceOrderId);
  const lines = buildInboundLinesFromNotice(noticeRow, orderRow);
  if (!lines.length) return null;

  const actualInboundTime = noticeRow.finalReceiveTime || nowStamp();
  const businessDate = actualInboundTime.slice(0, 10);
  const existingNos = loadAllInbounds([]).map((row) => row.inboundNo);
  const inboundNo = noticeRow.inboundNo || nextDocumentNo('CGRK', businessDate, existingNos);
  const inboundId = noticeRow.inboundId || `inbound-${noticeRow.id}`;
  const alreadyPosted = loadStockFlows().some((flow) => flow.sourceType === '采购入库单' && flow.sourceNo === inboundNo);
  if (!alreadyPosted) {
    lines.forEach((line) => ensureStockRow(noticeRow.warehouse, line.product, actualInboundTime));
    postStockEntries(lines.map((line) => ({
      logicalWarehouse: noticeRow.warehouse,
      product: line.product,
      instantDelta: Number(line.quantity || 0),
    })), {
      eventType: 'result_in',
      sourceType: '采购入库单',
      sourceNo: inboundNo,
      businessType: '采购入库',
      operator: '系统',
      time: actualInboundTime,
    });
  }

  const inbound = persistInbound({
    id: inboundId,
    inboundNo,
    sourceNoticeId: noticeRow.id,
    sourceNoticeNo: noticeRow.noticeNo,
    sourceOrderId: noticeRow.sourceOrderId,
    sourceOrderNo: noticeRow.sourceOrderNo,
    supplier: noticeRow.supplier,
    supplierNameSnapshot: noticeRow.supplierNameSnapshot,
    supplierSnapshotCode: noticeRow.supplierSnapshotCode,
    warehouse: noticeRow.warehouse,
    warehouseNameSnapshot: noticeRow.warehouseNameSnapshot,
    warehouseSnapshotCode: noticeRow.warehouseSnapshotCode,
    currency: orderRow?.currency || '人民币',
    auditStatus: 'approved',
    financeErpPushStatus: 'un_pushed',
    businessDate,
    actualInboundTime,
    pushTime: '',
    pushFailReason: '',
    remark: '',
    auditor: '',
    auditTime: actualInboundTime,
    creator: '系统',
    createdAt: actualInboundTime,
    updater: '系统',
    lines,
  });

  upsertMockRow(NOTICE_STORAGE_KEY, {
    ...noticeRow,
    inboundId: inbound.id,
    inboundNo: inbound.inboundNo,
  });

  simulateFinanceErpPush(inbound.id);
  return inbound;
}

export function buildSeedInboundFromNotice(noticeRow, orderRow, overrides = {}) {
  const lines = buildInboundLinesFromNotice(noticeRow, orderRow);
  const actualInboundTime = noticeRow.finalReceiveTime || nowStamp();
  const businessDate = actualInboundTime.slice(0, 10);
  return normalizeInboundRow({
    id: overrides.id || `inbound-seed-${noticeRow.id}`,
    inboundNo: overrides.inboundNo || nextDocumentNo('CGRK', businessDate, []),
    sourceNoticeId: noticeRow.id,
    sourceNoticeNo: noticeRow.noticeNo,
    sourceOrderId: noticeRow.sourceOrderId,
    sourceOrderNo: noticeRow.sourceOrderNo,
    supplier: noticeRow.supplier,
    supplierNameSnapshot: noticeRow.supplierNameSnapshot,
    supplierSnapshotCode: noticeRow.supplierSnapshotCode,
    warehouse: noticeRow.warehouse,
    warehouseNameSnapshot: noticeRow.warehouseNameSnapshot,
    warehouseSnapshotCode: noticeRow.warehouseSnapshotCode,
    currency: orderRow?.currency || '人民币',
    auditStatus: 'approved',
    financeErpPushStatus: overrides.financeErpPushStatus || 'push_success',
    businessDate,
    actualInboundTime,
    pushTime: overrides.pushTime !== undefined ? overrides.pushTime : actualInboundTime,
    pushFailReason: overrides.pushFailReason !== undefined ? overrides.pushFailReason : '',
    remark: '',
    auditor: '',
    auditTime: actualInboundTime,
    creator: '系统',
    createdAt: actualInboundTime,
    updater: '系统',
    updatedAt: overrides.updatedAt || actualInboundTime,
    lines,
    ...overrides,
  });
}
