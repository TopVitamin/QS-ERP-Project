import { skuOptions } from '../data/masterData.js';
import { computeLinesTotals } from './format.js';
import { emptyFieldMessage } from './formValidation.js';
import { hasNegativePrice } from './validation.js';
import { upsertMockRow, readMockRows, writeMockRows } from './mockStorage.js';

export const ORDER_STORAGE_KEY = 'qs-erp:purchase-orders:v4';
export const NOTICE_STORAGE_KEY = 'qs-erp:purchase-receipt-notices:v1';

const BLOCKING_NOTICE_STATUSES = new Set(['pushing', 'pending_receive', 'cancelling']);

export function loadOrderNotices(orderId) {
  if (!orderId) return [];
  return readMockRows(NOTICE_STORAGE_KEY, []).filter((notice) => notice.sourceOrderId === orderId);
}

export function hasBlockingOrderNotices(orderId) {
  return loadOrderNotices(orderId).some((notice) => BLOCKING_NOTICE_STATUSES.has(notice.status));
}

export function nowStamp() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export function computePushableQty(line) {
  return Math.max(0, Number(line.quantity || 0) - Number(line.received || 0) - Number(line.notifyQty || 0));
}

export function computeRemainingInbound(line) {
  return Math.max(0, Number(line.quantity || 0) - Number(line.received || 0));
}

export function enrichOrderLine(line) {
  const sku = skuOptions.find((item) => item.value === line.product);
  if (!sku) return line;
  return {
    ...line,
    productCode: line.productCode || sku.skuCode,
    productName: line.productName || sku.productName,
    barcode: line.barcode || sku.barcode,
  };
}

export function refreshOrderLines(lines = []) {
  return lines.map((line) => {
    const enriched = enrichOrderLine(line);
    return {
      ...enriched,
      pushableQty: computePushableQty(enriched),
      remainingInbound: computeRemainingInbound(enriched),
    };
  });
}

export function sumReceivedQty(lines = []) {
  return lines.reduce((sum, line) => sum + Number(line.received || 0), 0);
}

export function sumOrderQty(lines = []) {
  return lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
}

export function sumPushableQty(lines = []) {
  return lines.reduce((sum, line) => sum + Math.max(0, Number(line.pushableQty || 0)), 0);
}

/** 列表展示：仅已审核且业务正常时汇总各行可下推数量，否则为 0 */
export function computeTotalPushableQty(row) {
  if (row.auditStatus !== 'approved' || row.businessStatus !== 'normal') return 0;
  return sumPushableQty(row.lines || []);
}

export function computeReceiveStatus(lines = []) {
  const totalQty = lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
  const received = sumReceivedQty(lines);
  if (received <= 0) return 'not_received';
  if (received >= totalQty) return 'completed';
  return 'partial';
}

export function canPushNotice(row) {
  return row.auditStatus === 'approved'
    && row.businessStatus === 'normal'
    && row.lines?.some((line) => Number(line.pushableQty || 0) > 0);
}

/** 草稿：物理删除，不走「取消」 */
export function canDeleteDraftOrder(row) {
  return row.businessStatus === 'normal' && row.auditStatus === 'draft';
}

/** 待审核：终止审核流程 */
export function canCancelPendingOrder(row) {
  return row.businessStatus === 'normal' && row.auditStatus === 'pending';
}

/** 已审核+正常：须满足 R09 */
export function canCancelApprovedOrder(row) {
  if (row.businessStatus !== 'normal' || row.auditStatus !== 'approved') return false;

  const hasInbound = Number(row.receivedQty || 0) > 0 || row.lines?.some((line) => Number(line.received || 0) > 0);
  if (hasInbound) return false;

  if (hasBlockingOrderNotices(row.id)) return false;

  return true;
}

export function isOrderFullyReceived(row) {
  const receiveStatus = row.receiveStatus || computeReceiveStatus(row.lines || []);
  return receiveStatus === 'completed';
}

/** 已审核+正常，且仍有未收足的余量可关闭 */
export function canCloseOrder(row) {
  return row.businessStatus === 'normal'
    && row.auditStatus === 'approved'
    && !isOrderFullyReceived(row);
}

/** 与关闭同口径：全部收足后交期已无业务意义 */
export function canAdjustDeliveryDate(row) {
  return canCloseOrder(row);
}

/** 行内「取消」：仅待审核或已审核且满足 R09；草稿用删除 */
export function canCancelOrder(row) {
  return canCancelPendingOrder(row) || canCancelApprovedOrder(row);
}

export function getCancelBlockReason(row) {
  if (row.businessStatus !== 'normal') return '当前业务状态不可取消';
  if (row.auditStatus === 'approved') {
    const hasInbound = Number(row.receivedQty || 0) > 0 || row.lines?.some((line) => Number(line.received || 0) > 0);
    if (hasInbound) return '已有实际入库，只能关闭余量';
    if (hasBlockingOrderNotices(row.id)) return '存在执行中的收货通知，请先处理后再取消';
  }
  return null;
}

export function validateOrderRequiredFields(form) {
  const fieldErrors = {};
  if (!form.supplier) fieldErrors.supplier = emptyFieldMessage('供应商');
  if (!form.date) fieldErrors.date = emptyFieldMessage('单据日期');
  if (!form.warehouse) fieldErrors.warehouse = emptyFieldMessage('收货仓库');
  if (!form.deliveryDate) fieldErrors.deliveryDate = emptyFieldMessage('承诺交期');
  return fieldErrors;
}

export function validateOrderForSave(form) {
  const fieldErrors = validateOrderRequiredFields(form);
  if (Object.keys(fieldErrors).length) {
    return { fieldErrors };
  }
  if (!form.lines?.length || form.lines.some((line) => !line.product || Number(line.quantity) <= 0)) {
    return { message: '请至少添加一行有效商品明细' };
  }
  if (hasNegativePrice(form.lines)) {
    return { message: '含税单价不能为负数' };
  }
  return null;
}

export function validateOrderForSubmit(form) {
  const saveResult = validateOrderForSave(form);
  if (saveResult) return saveResult;

  for (let index = 0; index < form.lines.length; index += 1) {
    const line = form.lines[index];
    if (!line.product) return { message: `第${index + 1}行请选择商品` };
    if (Number(line.quantity) <= 0) return { message: `第${index + 1}行采购数量必须大于0` };
    if (line.price === '' || line.price == null) return { message: `第${index + 1}行含税单价不能为空` };
    if (Number(line.price) < 0) return { message: `第${index + 1}行含税单价不能为负` };
  }
  return null;
}

export function findZeroPriceLines(form) {
  return form.lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => Number(line.price) === 0);
}

export function normalizeOrderRow(row) {
  const lines = refreshOrderLines(row.lines || []);
  const totals = computeLinesTotals(lines);
  const stamp = nowStamp();
  return {
    ...row,
    lines,
    amount: totals.grossAmount,
    taxAmount: totals.taxAmount,
    netAmount: totals.netAmount,
    totalOrderQty: sumOrderQty(lines),
    receivedQty: sumReceivedQty(lines),
    totalPushableQty: computeTotalPushableQty({ ...row, lines }),
    receiveStatus: computeReceiveStatus(lines),
    createdAt: row.createdAt || stamp,
    updatedAt: stamp,
    updater: row.updater || '当前用户',
  };
}

export function persistOrder(row) {
  const next = normalizeOrderRow(row);
  upsertMockRow(ORDER_STORAGE_KEY, next);
  return next;
}

export function loadOrderById(id) {
  const rows = readMockRows(ORDER_STORAGE_KEY, []);
  return rows.find((item) => item.id === id) || null;
}

export function deleteOrderById(id) {
  const rows = readMockRows(ORDER_STORAGE_KEY, []).filter((item) => item.id !== id);
  writeMockRows(ORDER_STORAGE_KEY, rows);
  return rows;
}

export function applySubmit(row) {
  const stamp = nowStamp();
  return persistOrder({
    ...row,
    auditStatus: 'pending',
    submittedAt: stamp,
    submitter: '当前用户',
    updatedAt: stamp,
    updater: '当前用户',
  });
}

export function applyApprove(row) {
  return persistOrder({
    ...row,
    auditStatus: 'approved',
    auditor: '当前用户',
    auditTime: nowStamp(),
  });
}

export function applyReject(row, returnComment) {
  const stamp = nowStamp();
  return persistOrder({
    ...row,
    auditStatus: 'draft',
    returnComment,
    returnedAt: stamp,
    returnOperator: '当前用户',
    updatedAt: stamp,
    updater: '当前用户',
  });
}

export function applyCancel(row, cancelReason) {
  return persistOrder({
    ...row,
    businessStatus: 'cancelled',
    cancelReason,
    cancelTime: nowStamp(),
    cancelOperator: '当前用户',
  });
}

export function applyClose(row, closeReason) {
  return persistOrder({
    ...row,
    businessStatus: 'closed',
    closeType: 'manual',
    closeReason,
    closeTime: nowStamp(),
    closeOperator: '当前用户',
  });
}

export function applyAdjustDelivery(row, deliveryDate) {
  const stamp = nowStamp();
  return persistOrder({
    ...row,
    deliveryDate,
    deliveryAdjustedAt: stamp,
    deliveryAdjustedBy: '当前用户',
    updatedAt: stamp,
    updater: '当前用户',
  });
}

