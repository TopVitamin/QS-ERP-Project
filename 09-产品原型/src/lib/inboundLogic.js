import { skuOptions } from '../data/masterData.js';
import { computeLineTaxMetrics, computeLinesTotals } from './format.js';
import { nextDocumentNo } from './documentNo.js';
import { upsertMockRow, readMockRows } from './mockStorage.js';
import { loadOrderById, nowStamp, NOTICE_STORAGE_KEY } from './purchaseOrderLogic.js';

export const INBOUND_STORAGE_KEY = 'qs-erp:purchase-inbounds:v2';

export const auditStatusLabels = {
  approved: '已审核',
};

export const kingdeePushStatusLabels = {
  un_pushed: '未推送',
  pushing: '推送中',
  push_success: '推送成功',
  push_failed: '推送失败',
};

const KINGDEE_AUTO_RETRY_MAX = 3;
const kingdeeTimers = new Map();

export function canRetryKingdeePush(row) {
  return row?.auditStatus === 'approved' && row?.kingdeePushStatus === 'push_failed';
}

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
    updatedAt: row.updatedAt || nowStamp(),
    updater: row.updater || '系统',
  };
}

export function persistInbound(row) {
  const next = normalizeInboundRow(row);
  upsertMockRow(INBOUND_STORAGE_KEY, next);
  return next;
}

export function loadAllInbounds(seed = []) {
  return readMockRows(INBOUND_STORAGE_KEY, seed);
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

function clearKingdeeTimer(inboundId) {
  const timer = kingdeeTimers.get(inboundId);
  if (timer) {
    window.clearTimeout(timer);
    kingdeeTimers.delete(inboundId);
  }
}

function scheduleKingdeeAttempt(inboundId, attempt = 1, forceFail = false) {
  clearKingdeeTimer(inboundId);
  const current = loadInboundById(inboundId);
  if (!current || current.kingdeePushStatus === 'push_success') return current;

  persistInbound({
    ...current,
    kingdeePushStatus: 'pushing',
    pushFailReason: attempt > 1 ? current.pushFailReason : '',
  });

  const timer = window.setTimeout(() => {
    kingdeeTimers.delete(inboundId);
    const latest = loadInboundById(inboundId);
    if (!latest || latest.kingdeePushStatus !== 'pushing') return;

    const shouldFail = forceFail && attempt >= KINGDEE_AUTO_RETRY_MAX;
    if (shouldFail) {
      persistInbound({
        ...latest,
        kingdeePushStatus: 'push_failed',
        pushFailReason: latest.pushFailReason || '接口超时，金蝶未确认接收',
      });
      return;
    }

    if (forceFail && attempt < KINGDEE_AUTO_RETRY_MAX) {
      persistInbound({
        ...latest,
        kingdeePushStatus: 'push_failed',
        pushFailReason: `第${attempt}次推送失败，系统将自动重试`,
      });
      scheduleKingdeeAttempt(inboundId, attempt + 1, true);
      return;
    }

    persistInbound({
      ...latest,
      kingdeePushStatus: 'push_success',
      pushTime: nowStamp(),
      pushFailReason: '',
    });
  }, attempt === 1 ? 800 : 600);

  kingdeeTimers.set(inboundId, timer);
  return loadInboundById(inboundId);
}

export function simulateKingdeePush(inboundId, { forceFail = false } = {}) {
  return scheduleKingdeeAttempt(inboundId, 1, forceFail);
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
  const inboundNo = nextDocumentNo('CGRK', businessDate, existingNos);

  const inbound = persistInbound({
    id: `inbound-${Date.now()}`,
    inboundNo,
    sourceNoticeId: noticeRow.id,
    sourceNoticeNo: noticeRow.noticeNo,
    sourceOrderId: noticeRow.sourceOrderId,
    sourceOrderNo: noticeRow.sourceOrderNo,
    supplier: noticeRow.supplier,
    warehouse: noticeRow.warehouse,
    currency: orderRow?.currency || '人民币',
    auditStatus: 'approved',
    kingdeePushStatus: 'un_pushed',
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

  simulateKingdeePush(inbound.id);
  return inbound;
}

export function applyRetryKingdeePush(row) {
  if (!canRetryKingdeePush(row)) {
    throw new Error('当前状态不可重推金蝶');
  }
  return scheduleKingdeeAttempt(row.id, 1, false);
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
    warehouse: noticeRow.warehouse,
    currency: orderRow?.currency || '人民币',
    auditStatus: 'approved',
    kingdeePushStatus: overrides.kingdeePushStatus || 'push_success',
    businessDate,
    actualInboundTime,
    pushTime: overrides.pushTime || actualInboundTime,
    pushFailReason: overrides.pushFailReason || '',
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
