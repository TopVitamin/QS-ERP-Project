import { skuOptions } from '../data/masterData.js';
import { computeLineTaxMetrics, computeLinesTotals } from './format.js';
import { nextDocumentNo } from './documentNo.js';
import { upsertMockRow, readMockRows } from './mockStorage.js';
import { loadOrderById, nowStamp, DELIVERY_NOTICE_STORAGE_KEY } from './salesOrderLogic.js';

export const SALES_OUTBOUND_STORAGE_KEY = 'qs-erp:sales-outbounds:v1';

export const auditStatusLabels = {
  approved: '已审核',
};

export const kingdeePushStatusLabels = {
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

const KINGDEE_AUTO_RETRY_MAX = 3;
const kingdeeTimers = new Map();

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
  const next = normalizeOutboundRow(row);
  upsertMockRow(SALES_OUTBOUND_STORAGE_KEY, next);
  return next;
}

export function loadAllOutbounds(seed = []) {
  return readMockRows(SALES_OUTBOUND_STORAGE_KEY, seed);
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

function clearKingdeeTimer(outboundId) {
  const timer = kingdeeTimers.get(outboundId);
  if (timer) {
    window.clearTimeout(timer);
    kingdeeTimers.delete(outboundId);
  }
}

function scheduleKingdeeAttempt(outboundId, attempt = 1, forceFail = false) {
  clearKingdeeTimer(outboundId);
  const current = loadOutboundById(outboundId);
  if (!current || current.kingdeePushStatus === 'push_success') return current;

  persistOutbound({
    ...current,
    kingdeePushStatus: 'pushing',
    pushFailReason: attempt > 1 ? current.pushFailReason : '',
  });

  const timer = window.setTimeout(() => {
    kingdeeTimers.delete(outboundId);
    const latest = loadOutboundById(outboundId);
    if (!latest || latest.kingdeePushStatus !== 'pushing') return;

    const shouldFail = forceFail && attempt >= KINGDEE_AUTO_RETRY_MAX;
    if (shouldFail) {
      persistOutbound({
        ...latest,
        kingdeePushStatus: 'push_failed',
        pushFailReason: latest.pushFailReason || '接口超时，金蝶未确认接收',
      });
      return;
    }

    if (forceFail && attempt < KINGDEE_AUTO_RETRY_MAX) {
      persistOutbound({
        ...latest,
        kingdeePushStatus: 'push_failed',
        pushFailReason: `第${attempt}次推送失败，系统将自动重试`,
      });
      scheduleKingdeeAttempt(outboundId, attempt + 1, true);
      return;
    }

    persistOutbound({
      ...latest,
      kingdeePushStatus: 'push_success',
      pushTime: nowStamp(),
      pushFailReason: '',
    });
  }, attempt === 1 ? 800 : 600);

  kingdeeTimers.set(outboundId, timer);
  return loadOutboundById(outboundId);
}

export function simulateKingdeePush(outboundId, { forceFail = false } = {}) {
  return scheduleKingdeeAttempt(outboundId, 1, forceFail);
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
  const outboundNo = nextDocumentNo('XSCK', businessDate, existingNos);

  const outbound = persistOutbound({
    id: `outbound-${Date.now()}`,
    outboundNo,
    sourceType: 'b2b_notice',
    sourceNoticeId: noticeRow.id,
    sourceNoticeNo: noticeRow.noticeNo,
    sourceOrderId: noticeRow.sourceOrderId,
    sourceOrderNo: noticeRow.sourceOrderNo,
    customer: noticeRow.customer,
    warehouse: noticeRow.warehouse,
    currency: orderRow?.currency || '人民币',
    auditStatus: 'approved',
    kingdeePushStatus: 'un_pushed',
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

  simulateKingdeePush(outbound.id);
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
    warehouse: noticeRow.warehouse,
    currency: orderRow?.currency || '人民币',
    auditStatus: 'approved',
    kingdeePushStatus: overrides.kingdeePushStatus || 'push_success',
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
