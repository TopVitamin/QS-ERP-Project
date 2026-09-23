import { skuOptions } from '../data/masterData.js';
import { computeLinesTotals } from './format.js';
import { emptyFieldMessage } from './formValidation.js';
import { hasNegativePrice } from './validation.js';
import { isCnAddressComplete } from './cnAddress.js';
import { readMockRows, upsertMockRow, writeMockRows } from './mockStorage.js';

export const SALES_ORDER_STORAGE_KEY = 'qs-erp:sales-orders:v1';
export const DELIVERY_NOTICE_STORAGE_KEY = 'qs-erp:sales-delivery-notices:v1';

const BLOCKING_NOTICE_STATUSES = new Set(['pushing', 'pending_ship', 'cancelling']);

export function loadOrderDeliveryNotices(orderId) {
  if (!orderId) return [];
  return readMockRows(DELIVERY_NOTICE_STORAGE_KEY, []).filter((notice) => notice.sourceOrderId === orderId);
}

export function hasBlockingOrderNotices(orderId) {
  return loadOrderDeliveryNotices(orderId).some((notice) => BLOCKING_NOTICE_STATUSES.has(notice.status));
}

export function nowStamp() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export function computePushableQty(line) {
  return Math.max(0, Number(line.quantity || 0) - Number(line.shipped || 0) - Number(line.notifyQty || 0));
}

export function computeRemainingShip(line) {
  return Math.max(0, Number(line.quantity || 0) - Number(line.shipped || 0));
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
      remainingShip: computeRemainingShip(enriched),
    };
  });
}

export function sumShippedQty(lines = []) {
  return lines.reduce((sum, line) => sum + Number(line.shipped || 0), 0);
}

export function sumOrderQty(lines = []) {
  return lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
}

export function sumPushableQty(lines = []) {
  return lines.reduce((sum, line) => sum + Math.max(0, Number(line.pushableQty || 0)), 0);
}

export function computeTotalPushableQty(row) {
  if (row.auditStatus !== 'approved' || row.businessStatus !== 'normal') return 0;
  return sumPushableQty(row.lines || []);
}

export function computeShipStatus(lines = []) {
  const totalQty = lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
  const shipped = sumShippedQty(lines);
  if (shipped <= 0) return 'not_shipped';
  if (shipped >= totalQty) return 'completed';
  return 'partial';
}

export function canPushDeliveryNotice(row) {
  return row.auditStatus === 'approved'
    && row.businessStatus === 'normal'
    && row.lines?.some((line) => Number(line.pushableQty || 0) > 0);
}

export function canDeleteDraftOrder(row) {
  return row.businessStatus === 'normal' && row.auditStatus === 'draft';
}

export function canCancelPendingOrder(row) {
  return row.businessStatus === 'normal' && row.auditStatus === 'pending';
}

export function canCancelApprovedOrder(row) {
  if (row.businessStatus !== 'normal' || row.auditStatus !== 'approved') return false;

  const hasOutbound = Number(row.shippedQty || 0) > 0 || row.lines?.some((line) => Number(line.shipped || 0) > 0);
  if (hasOutbound) return false;

  if (hasBlockingOrderNotices(row.id)) return false;

  return true;
}

export function isOrderFullyShipped(row) {
  const shipStatus = row.shipStatus || computeShipStatus(row.lines || []);
  return shipStatus === 'completed';
}

export function canCloseOrder(row) {
  return row.businessStatus === 'normal'
    && row.auditStatus === 'approved'
    && !isOrderFullyShipped(row);
}

export function canAdjustDeliveryDate(row) {
  return canCloseOrder(row);
}

export function canCancelOrder(row) {
  return canCancelPendingOrder(row) || canCancelApprovedOrder(row);
}

export function getCancelBlockReason(row) {
  if (row.businessStatus !== 'normal') return '当前业务状态不可取消';
  if (row.auditStatus === 'approved') {
    const hasOutbound = Number(row.shippedQty || 0) > 0 || row.lines?.some((line) => Number(line.shipped || 0) > 0);
    if (hasOutbound) return '已有实际出库，只能关闭余量';
    if (hasBlockingOrderNotices(row.id)) return '存在执行中的发货通知，请先处理后再取消';
  }
  return null;
}

export function checkInventoryForApprove(row) {
  for (const line of row.lines || []) {
    const sku = skuOptions.find((item) => item.value === line.product);
    const available = Number(sku?.availableStock ?? 0);
    const qty = Number(line.quantity || 0);
    if (qty > available) return false;
  }
  return true;
}

export function validateOrderRequiredFields(form) {
  const fieldErrors = {};
  if (!form.customer) fieldErrors.customer = emptyFieldMessage('客户');
  if (!form.date) fieldErrors.date = emptyFieldMessage('单据日期');
  if (!form.warehouse) fieldErrors.warehouse = emptyFieldMessage('发货仓库');
  if (!form.deliveryDate) fieldErrors.deliveryDate = emptyFieldMessage('交期');
  if (!form.shipMethod) fieldErrors.shipMethod = emptyFieldMessage('发货方式');
  if (form.shipMethod === 'logistics') {
    if (!isCnAddressComplete(form.deliveryAddress)) {
      fieldErrors.deliveryAddress = '请选择完整的省市区和详细地址';
    }
    if (!form.logisticsProduct) fieldErrors.logisticsProduct = emptyFieldMessage('物流服务产品');
  }
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
    if (Number(line.quantity) <= 0) return { message: `第${index + 1}行销售数量必须大于0` };
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

export function maybeAutoCloseOrder(row) {
  if (row.businessStatus !== 'normal' || row.auditStatus !== 'approved') return row;
  if (!isOrderFullyShipped(row)) return row;
  const stamp = nowStamp();
  return persistOrder({
    ...row,
    businessStatus: 'closed',
    closeType: 'auto',
    closeReason: '全部发货自动关单',
    closeTime: stamp,
    closeOperator: '系统',
  });
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
    shippedQty: sumShippedQty(lines),
    totalPushableQty: computeTotalPushableQty({ ...row, lines }),
    shipStatus: computeShipStatus(lines),
    createdAt: row.createdAt || stamp,
    updatedAt: stamp,
    updater: row.updater || '当前用户',
  };
}

export function persistOrder(row) {
  const next = normalizeOrderRow(row);
  upsertMockRow(SALES_ORDER_STORAGE_KEY, next);
  return next;
}

export function loadOrderById(id) {
  const rows = readMockRows(SALES_ORDER_STORAGE_KEY, []);
  return rows.find((item) => item.id === id) || null;
}

export function deleteOrderById(id) {
  const rows = readMockRows(SALES_ORDER_STORAGE_KEY, []).filter((item) => item.id !== id);
  writeMockRows(SALES_ORDER_STORAGE_KEY, rows);
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
  if (!checkInventoryForApprove(row)) {
    return { error: '发货仓库可用库存不足，审核失败' };
  }
  return { row: persistOrder({
    ...row,
    auditStatus: 'approved',
    auditor: '当前用户',
    auditTime: nowStamp(),
  }) };
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
