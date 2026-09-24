/**
 * 分步式调拨单模块逻辑（第1层业务安排单）。
 *
 * 业务规则依据《分步式调拨单主PRD》§6.4 状态—功能矩阵、§6.5 状态流转表与 R01～R18；
 * 字段与枚举依据《分步式调拨单（详细稿）》。
 *
 * 关键口径：
 * - 审核通过时按计划调拨数量预占调出仓可用库存（INV-FR05），可用不足阻断；
 * - 预占的消耗与释放不记库存流水（《库存流水主PRD》），实出消耗与未发释放由调出端直接调拨单
 *   通过 `postStockEntries` 一次完成，零调出与通知单取消只做「释放」，因此不走记账入口；
 * - 两端结果回写：累计实际调出／累计实际调入由已审核直接调拨单按来源行回写；在途＝实出−实入；
 * - 主单不推送仓库、不推送金蝶；两端结果分别形成直接调拨单。
 */
import { skuOptions } from '../data/masterData.js';
import { isTransitLogicalWarehouse } from '../data/warehouseData.js';
import { nextDocumentNo } from './documentNo.js';
import {
  loadReservations,
  loadStockRows,
  nowStamp,
  persistReservations,
  persistStockRows,
  reserveStock,
} from './inventoryStockLogic.js';
import { readMockRows, upsertMockRow, writeMockRows } from './mockStorage.js';

export const TRANSFER_ORDER_STORAGE_KEY = 'qs-erp:transfer-orders:v1';

/** 审核状态（无已驳回态，待审核不同意用撤回）。 */
export const transferAuditLabels = {
  draft: '草稿',
  pending: '待审核',
  approved: '已审核',
};

/** 业务状态原始取值；「已关闭」在页面展示为「已完结」。 */
export const transferBusinessLabels = {
  normal: '正常',
  closed: '已关闭',
  cancelled: '已取消',
};

/** 页面展示用业务状态文案（主PRD §6.2）。 */
export const transferBusinessDisplayLabels = {
  normal: '正常',
  closed: '已完结',
  cancelled: '已取消',
};

/** 列表状态列语义色文字（《列表页 Demo PRD》§4.3）。 */
export const transferStatusTones = {
  auditStatus: {
    draft: 'text-erp-warning',
    pending: 'text-erp-info',
    approved: 'text-erp-success',
  },
  businessStatus: {
    normal: 'text-erp-info',
    closed: 'text-erp-success',
    cancelled: 'text-erp-text-muted',
  },
};

/** 详情页头 StatusBadge 语义键（只传 success／warning／danger／info／neutral）。 */
export const transferStatusBadgeTones = {
  auditStatus: {
    draft: 'warning',
    pending: 'info',
    approved: 'success',
  },
  businessStatus: {
    normal: 'info',
    closed: 'success',
    cancelled: 'neutral',
  },
};

export function formatTransferBusinessStatus(rowOrValue) {
  const value = typeof rowOrValue === 'string' ? rowOrValue : rowOrValue?.businessStatus;
  return transferBusinessDisplayLabels[value] || value || '';
}

let transferOrderSeedRows = [];

/** 种子数据注册：由 `data/transferOrderData.js` 调用，保证未访问列表页时也能读到演示数据。 */
export function registerTransferOrderSeedRows(rows = []) {
  transferOrderSeedRows = rows;
}

export function getTransferOrderSeedRows() {
  return transferOrderSeedRows;
}

// —— 明细与合计 ——

export function enrichTransferOrderLine(line, index = 0) {
  const sku = skuOptions.find((item) => item.value === line.product) || {};
  const quantity = Number(line.quantity || 0);
  const hasOut = line.actualOutQty !== undefined && line.actualOutQty !== null && line.actualOutQty !== '';
  const hasIn = line.actualInQty !== undefined && line.actualInQty !== null && line.actualInQty !== '';
  const actualOutQty = hasOut ? Number(line.actualOutQty) : undefined;
  const actualInQty = hasIn ? Number(line.actualInQty) : undefined;

  return {
    ...line,
    lineNo: Number(line.lineNo || index + 1),
    productCode: line.productCode || sku.skuCode || '',
    productName: line.productName || sku.productName || '',
    unit: line.unit || sku.unit || '',
    quantity,
    actualOutQty,
    actualInQty,
    // 未调出数量＝计划调拨数量−累计实际调出；未确认时等于计划数量
    remainingQty: actualOutQty === undefined ? quantity : Math.max(0, quantity - actualOutQty),
    // 在途数量＝累计实际调出−累计实际调入；实出未确认时留空（页面显示 `-`），实入未确认按0计
    inTransitQty: actualOutQty === undefined
      ? undefined
      : Math.max(0, actualOutQty - Number(actualInQty || 0)),
  };
}

export function refreshTransferOrderLines(lines = []) {
  return lines.map(enrichTransferOrderLine);
}

export function sumTransferOrderQty(lines = []) {
  return lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
}

export function sumTransferOrderRemainingQty(lines = []) {
  return lines.reduce((sum, line) => sum + Number(line.remainingQty ?? line.quantity ?? 0), 0);
}

/** 最终结果未确认前留空（返回 undefined，页面显示 `-`）。 */
export function sumTransferOrderActualOutQty(lines = []) {
  if (!lines.length || lines.some((line) => line.actualOutQty === undefined)) return undefined;
  return lines.reduce((sum, line) => sum + Number(line.actualOutQty || 0), 0);
}

export function sumTransferOrderActualInQty(lines = []) {
  if (!lines.length || lines.some((line) => line.actualInQty === undefined)) return undefined;
  return lines.reduce((sum, line) => sum + Number(line.actualInQty || 0), 0);
}

/**
 * 在途数量合计＝累计实际调出−累计实际调入；实出未确认时留空（页面显示 `-`）。
 * 已调出未调入阶段（实入未确认）在途按实出展示，少收差额继续留在途（主PRD R09、列表页 Demo PRD §9.1）。
 */
export function sumTransferOrderInTransitQty(lines = []) {
  const outQty = sumTransferOrderActualOutQty(lines);
  if (outQty === undefined) return undefined;
  return Math.max(0, outQty - Number(sumTransferOrderActualInQty(lines) || 0));
}

export function normalizeTransferOrderRow(row) {
  const lines = refreshTransferOrderLines(row.lines || []);
  return {
    ...row,
    lines,
    totalQuantity: sumTransferOrderQty(lines),
    totalActualOutQty: sumTransferOrderActualOutQty(lines),
    totalActualInQty: sumTransferOrderActualInQty(lines),
    totalInTransitQty: sumTransferOrderInTransitQty(lines),
    totalRemainingQty: sumTransferOrderRemainingQty(lines),
    updatedAt: row.updatedAt || nowStamp(),
    updater: row.updater || '当前用户',
  };
}

export function buildTransferOrderSeedRow(raw, index = 0) {
  const lines = (raw.lines || []).map((line, lineIndex) => enrichTransferOrderLine({
    id: `${raw.orderNo}-line-${lineIndex + 1}`,
    lineNo: lineIndex + 1,
    product: line.product,
    quantity: line.quantity,
    actualOutQty: line.actualOutQty,
    actualInQty: line.actualInQty,
  }, lineIndex));

  return normalizeTransferOrderRow({
    ...raw,
    id: raw.id || `transfer-order-seed-${index + 1}`,
    lines,
  });
}

// —— 读写 ——

export function loadAllTransferOrders() {
  return readMockRows(TRANSFER_ORDER_STORAGE_KEY, transferOrderSeedRows);
}

export function loadTransferOrderById(id) {
  if (!id) return null;
  return loadAllTransferOrders().find((row) => row.id === id) || null;
}

export function loadTransferOrderByNo(orderNo) {
  if (!orderNo) return null;
  return loadAllTransferOrders().find((row) => row.orderNo === orderNo) || null;
}

export function persistTransferOrder(row) {
  const next = normalizeTransferOrderRow(row);
  upsertMockRow(TRANSFER_ORDER_STORAGE_KEY, next);
  return next;
}

export function removeTransferOrder(id) {
  writeMockRows(
    TRANSFER_ORDER_STORAGE_KEY,
    loadAllTransferOrders().filter((row) => row.id !== id),
  );
}

/** 保存草稿时分配单号，前缀 FBDB（R01）。 */
export function generateTransferOrderNo() {
  const today = nowStamp().slice(0, 10);
  return nextDocumentNo('FBDB', today, loadAllTransferOrders().map((row) => row.orderNo));
}

// —— 状态判定（主PRD §6.4；不满足条件的按钮直接隐藏）——

export function canEditTransferOrder(row) {
  return row?.auditStatus === 'draft' && row?.businessStatus === 'normal';
}

export function canSubmitTransferOrder(row) {
  return canEditTransferOrder(row);
}

export function canDeleteTransferOrder(row) {
  return canEditTransferOrder(row);
}

export function canApproveTransferOrder(row) {
  return row?.auditStatus === 'pending' && row?.businessStatus === 'normal';
}

export function canWithdrawTransferOrder(row) {
  return canApproveTransferOrder(row);
}

export function canCancelTransferOrder(row) {
  return canApproveTransferOrder(row);
}

/**
 * 主单不推送仓库、不推送金蝶（R16），已审核+正常也不提供主单取消（§6.4 说明、Q05）；
 * 调出通知单推送失败后的重试推送入口在调出通知单侧（《调出通知单主PRD》F07）。
 * 因此主单侧不存在「重试推送」，本判定恒为 false，避免后续误加主单重推按钮。
 */
export function canRetryPushTransferOrder() {
  return false;
}

/** Demo Mock（F09）入口：仅已审核+正常可模拟两端回传；实际能否回传还要看通知单当前状态。 */
export function canMockOutboundTransferOrder(row) {
  return row?.auditStatus === 'approved' && row?.businessStatus === 'normal';
}

// —— 校验（文案按《分步式调拨单前端Demo版PRD_新增编辑页》§4）——

export function validateTransferOrderWarehouses(outWarehouse, inWarehouse) {
  if (!outWarehouse) return '请选择调出仓';
  if (!inWarehouse) return '请选择接收仓';
  if (outWarehouse === inWarehouse) return '接收仓不能与调出仓相同';
  if (isTransitLogicalWarehouse(outWarehouse) || isTransitLogicalWarehouse(inWarehouse)) {
    return '虚拟在途仓不能作为调出仓或接收仓，只用于分步式调拨在途记账';
  }
  return null;
}

export function validateTransferOrderLineQty(lines = []) {
  for (const line of lines) {
    const quantity = Number(line.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) return '计划调拨数量须为大于0的整数';
  }
  return null;
}

export function findDuplicateTransferOrderProducts(lines = []) {
  const seen = new Set();
  const duplicates = new Set();
  lines.forEach((line) => {
    if (!line.product) return;
    if (seen.has(line.product)) duplicates.add(line.product);
    seen.add(line.product);
  });
  return [...duplicates];
}

export function validateTransferOrderForSave(form) {
  const warehouseError = validateTransferOrderWarehouses(form?.outWarehouse, form?.inWarehouse);
  if (warehouseError) return { message: warehouseError };
  if (!form?.lines?.length) return { message: '请至少添加一行有效商品明细' };
  const filled = form.lines.filter((line) => line.product);
  if (!filled.length) return { message: '请至少添加一行有效商品明细' };
  const qtyError = validateTransferOrderLineQty(filled);
  if (qtyError) return { message: qtyError };
  return null;
}

export function validateTransferOrderForSubmit(form) {
  const saveError = validateTransferOrderForSave(form);
  if (saveError) return saveError;
  const validLines = form.lines.filter((line) => line.product && Number(line.quantity) > 0);
  if (!validLines.length) return { message: '请至少添加一行有效商品明细' };
  return null;
}

// —— 建单、提交、撤回、取消、删除 ——

export function createTransferOrder(form, { operator = '当前用户', time } = {}) {
  const stamp = time || nowStamp();
  const lines = refreshTransferOrderLines(form.lines || []).map((line, index) => ({ ...line, lineNo: index + 1 }));
  const row = persistTransferOrder({
    id: `transfer-order-${Date.now()}`,
    orderNo: form.orderNo && form.orderNo !== '保存后自动生成' ? form.orderNo : generateTransferOrderNo(),
    outWarehouse: form.outWarehouse || '',
    inWarehouse: form.inWarehouse || '',
    remark: form.remark || '',
    auditStatus: 'draft',
    businessStatus: 'normal',
    closeType: '',
    closeTime: '',
    cancelReason: '',
    cancelOperator: '',
    cancelTime: '',
    auditor: '',
    auditTime: '',
    returnComment: '',
    returnedAt: '',
    returnOperator: '',
    submitter: '',
    submittedAt: '',
    creator: operator,
    createdAt: stamp,
    updater: operator,
    updatedAt: stamp,
    lines,
  });
  return row;
}

export function updateTransferOrder(row, form, { operator = '当前用户', time } = {}) {
  const stamp = time || nowStamp();
  const lines = refreshTransferOrderLines(form.lines || []).map((line, index) => ({ ...line, lineNo: index + 1 }));
  return persistTransferOrder({
    ...row,
    orderNo: form.orderNo && form.orderNo !== '保存后自动生成' ? form.orderNo : row.orderNo,
    outWarehouse: form.outWarehouse || '',
    inWarehouse: form.inWarehouse || '',
    remark: form.remark || '',
    lines,
    updater: operator,
    updatedAt: stamp,
  });
}

export function applySubmitTransferOrder(row, { operator = '当前用户', time } = {}) {
  if (!canSubmitTransferOrder(row)) throw new Error('当前单据状态不可提交，请刷新后重试');
  const stamp = time || nowStamp();
  return persistTransferOrder({
    ...row,
    auditStatus: 'pending',
    submitter: operator,
    submittedAt: stamp,
    updater: operator,
    updatedAt: stamp,
  });
}

export function applyWithdrawTransferOrder(row, comment, { operator = '当前用户', time } = {}) {
  if (!canWithdrawTransferOrder(row)) throw new Error('当前单据状态不可撤回，请刷新后重试');
  const stamp = time || nowStamp();
  return persistTransferOrder({
    ...row,
    auditStatus: 'draft',
    returnComment: comment || '',
    returnedAt: stamp,
    returnOperator: operator,
    updater: operator,
    updatedAt: stamp,
  });
}

/** 待审核取消：终止审核流程，保留取消原因与操作人（R15）。 */
export function applyCancelTransferOrder(row, cancelReason, { operator = '当前用户', time } = {}) {
  if (!canCancelTransferOrder(row)) throw new Error('当前单据状态不可取消，请刷新后重试');
  const stamp = time || nowStamp();
  return persistTransferOrder({
    ...row,
    businessStatus: 'cancelled',
    cancelReason: cancelReason || '',
    cancelOperator: operator,
    cancelTime: stamp,
    updater: operator,
    updatedAt: stamp,
  });
}

export function applyDeleteTransferOrder(row) {
  removeTransferOrder(row.id);
}

// —— 审核与预占 ——

/**
 * 审核通过：按计划调拨数量逐行预占调出仓可用库存；任一行为空或可用不足时整单不成立并报错（R07、AC02）。
 * 调出通知单的生成由调出通知单侧承接（见 `approveTransferOrderWithNotice`）。
 */
export function applyApproveTransferOrder(row, { operator = '当前用户', time } = {}) {
  const order = loadTransferOrderById(row?.id) || row;
  // 只允许「待审核 + 正常」审核；重复调用（双击、陈旧入口）不得二次预占（R07、§11.2）
  if (!canApproveTransferOrder(order)) throw new Error('当前单据状态不可审核，请刷新后重试');
  const warehouseError = validateTransferOrderWarehouses(order.outWarehouse, order.inWarehouse);
  if (warehouseError) throw new Error(warehouseError);
  const qtyError = validateTransferOrderLineQty(order.lines || []);
  if (qtyError) throw new Error(qtyError);

  const stamp = time || nowStamp();
  const reservedLines = [];
  try {
    order.lines.forEach((line) => {
      reserveStock({
        logicalWarehouse: order.outWarehouse,
        product: line.product,
        quantity: Number(line.quantity || 0),
        sourceType: '分步式调拨单',
        sourceNo: order.orderNo,
        sourceLineNo: Number(line.lineNo || 1),
        time: stamp,
      });
      reservedLines.push(line);
    });
  } catch (error) {
    // 整单回滚：已占用部分全部释放，不留下半单预占（审核幂等，只占一次）
    releaseTransferOrderReservations({ ...order, lines: reservedLines }, { time: stamp });
    throw new Error('调出仓可用库存不足，无法审核');
  }

  return persistTransferOrder({
    ...order,
    auditStatus: 'approved',
    auditor: operator,
    auditTime: stamp,
    updater: operator,
    updatedAt: stamp,
  });
}

/** 审核失败回滚（调出通知单生成失败时使用）：释放预占并回到待审核。 */
export function revertTransferOrderApproval(row, { time } = {}) {
  const stamp = time || nowStamp();
  releaseTransferOrderReservations(row, { time: stamp });
  return persistTransferOrder({
    ...row,
    auditStatus: 'pending',
    auditor: '',
    auditTime: '',
    updater: '系统',
    updatedAt: stamp,
  });
}

/**
 * 释放未执行预占（零调出取消、调出通知单取消成功）。
 *
 * 《库存流水主PRD》：预占的占用与释放不记库存流水，因此这里直接更新库存行预占数量与预占记录，
 * 不经过 `postStockEntries`；实出消耗与未发释放由调出端直接调拨单记账时统一处理。
 */
export function releaseTransferOrderReservations(order, { lines, time } = {}) {
  if (!order?.orderNo) return;
  const targetLines = lines?.length ? lines : (order.lines || []);
  if (!targetLines.length) return;
  const stamp = time || nowStamp();
  const reservations = loadReservations();
  const stockRows = loadStockRows();
  let stockChanged = false;
  let reservationChanged = false;

  targetLines.forEach((line) => {
    const lineNo = Number(line.lineNo || 1);
    const candidates = reservations
      .filter((record) => record.logicalWarehouse === order.outWarehouse
        && record.product === line.product
        && record.status === 'active'
        && record.sourceType === '分步式调拨单'
        && record.sourceNo === order.orderNo
        && Number(record.sourceLineNo) === lineNo)
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));

    let releaseLeft = candidates.reduce(
      (sum, record) => sum + Math.max(0, Number(record.reservedQty || 0) - Number(record.consumedQty || 0) - Number(record.releasedQty || 0)),
      0,
    );
    if (releaseLeft <= 0) return;

    const rowIndex = stockRows.findIndex((row) => row.logicalWarehouse === order.outWarehouse && row.product === line.product);
    if (rowIndex >= 0) {
      const current = stockRows[rowIndex];
      stockRows[rowIndex] = {
        ...current,
        reservedQty: Math.max(0, Number(current.reservedQty || 0) - releaseLeft),
        updatedAt: stamp,
      };
      stockChanged = true;
    }

    candidates.forEach((record) => {
      if (releaseLeft <= 0) return;
      const open = Math.max(0, Number(record.reservedQty || 0) - Number(record.consumedQty || 0) - Number(record.releasedQty || 0));
      const release = Math.min(releaseLeft, open);
      if (release <= 0) return;
      releaseLeft -= release;
      const releasedQty = Number(record.releasedQty || 0) + release;
      const closed = Number(record.consumedQty || 0) + releasedQty >= Number(record.reservedQty || 0);
      const index = reservations.findIndex((item) => item.id === record.id);
      if (index >= 0) {
        reservations[index] = {
          ...record,
          releasedQty,
          status: closed ? 'closed' : 'active',
          updatedAt: stamp,
        };
        reservationChanged = true;
      }
    });
  });

  if (stockChanged) persistStockRows(stockRows);
  if (reservationChanged) persistReservations(reservations);
}

/** 零调出：按零出取消整张主单，释放未执行预占，取消操作人留空（R13、AC05）。 */
export function applyTransferOrderZeroOutCancel(order, { reason = '仓库确认零调出', time } = {}) {
  const stamp = time || nowStamp();
  releaseTransferOrderReservations(order, { time: stamp });
  return persistTransferOrder({
    ...order,
    businessStatus: 'cancelled',
    cancelReason: reason,
    cancelOperator: '',
    // 零调出：累计实际调出按 0 回写，列表与明细显示 0 而不是 `-`（详情页 Demo PRD §7.2）
    lines: refreshTransferOrderLines((order.lines || []).map((line) => ({ ...line, actualOutQty: 0 }))),
    cancelTime: stamp,
    updater: '系统',
    updatedAt: stamp,
  });
}

// —— 两端结果回写（R09、R10、数量回写）——

/** 调出回传回写：按来源行累计实际调出。 */
export function applyTransferOutWriteBack(orderId, noticeLines = [], { time } = {}) {
  const order = loadTransferOrderById(orderId);
  if (!order) return null;
  const actualMap = new Map(
    noticeLines.map((line) => [Number(line.sourceOrderLineNo || line.lineNo || 1), Number(line.actualQty || 0)]),
  );
  const lines = order.lines.map((line) => {
    const actualQty = actualMap.get(Number(line.lineNo));
    if (actualQty === undefined) return line;
    return { ...line, actualOutQty: Number(line.actualOutQty || 0) + actualQty };
  });
  return persistTransferOrder({ ...order, lines, updater: '系统', updatedAt: time || nowStamp() });
}

/**
 * 调入回传回写：按来源行累计实际调入，并自动完结主单
 * （业务状态=已关闭，页面展示「已完结」；关闭方式=两端执行完成自动完结，关闭原因与操作人留空）。
 */
export function applyTransferInWriteBack(orderId, inNoticeLines = [], { time } = {}) {
  const order = loadTransferOrderById(orderId);
  if (!order) return null;
  const stamp = time || nowStamp();
  const actualMap = new Map(
    inNoticeLines.map((line) => [Number(line.sourceOrderLineNo || line.lineNo || 1), Number(line.actualQty || 0)]),
  );
  const lines = order.lines.map((line) => {
    const actualQty = actualMap.get(Number(line.lineNo));
    if (actualQty === undefined) return line;
    return { ...line, actualInQty: Number(line.actualInQty || 0) + actualQty };
  });
  return persistTransferOrder({
    ...order,
    lines,
    businessStatus: 'closed',
    closeType: 'auto',
    closeTime: stamp,
    updater: '系统',
    updatedAt: stamp,
  });
}

// —— 操作日志 ——

export function pushTransferLogEntry(entries, { time, operator, action, remark }) {
  if (!time && !operator && !action) return;
  entries.push({
    id: `${action}-${time || entries.length}`,
    time: time || '-',
    operator: operator || '-',
    action,
    remark: remark || '-',
  });
}

export function mergeTransferLogs(...sources) {
  const map = new Map();
  sources.flat().forEach((entry) => {
    if (!entry) return;
    map.set(entry.id, entry);
  });
  return [...map.values()].sort((left, right) => String(right.time).localeCompare(String(left.time)));
}

export function buildTransferOrderOperationLogs(row) {
  const entries = [];
  pushTransferLogEntry(entries, {
    time: row.createdAt,
    operator: row.creator,
    action: '创建',
    remark: '创建分步式调拨单',
  });
  if (row.submittedAt) {
    pushTransferLogEntry(entries, {
      time: row.submittedAt,
      operator: row.submitter,
      action: '提交',
      remark: '提交审核',
    });
  }
  if (row.returnComment) {
    pushTransferLogEntry(entries, {
      time: row.returnedAt,
      operator: row.returnOperator,
      action: '撤回',
      remark: row.returnComment,
    });
  }
  if (row.auditTime) {
    pushTransferLogEntry(entries, {
      time: row.auditTime,
      operator: row.auditor,
      action: '审核',
      remark: '审核通过，已预占调出仓库存',
    });
  }
  if (row.businessStatus === 'cancelled') {
    pushTransferLogEntry(entries, {
      time: row.cancelTime,
      operator: row.cancelOperator,
      action: '取消',
      remark: row.cancelReason,
    });
  }
  if (row.businessStatus === 'closed') {
    pushTransferLogEntry(entries, {
      time: row.closeTime,
      operator: '',
      action: '完结',
      remark: '两端执行完成自动完结',
    });
  }
  return mergeTransferLogs(entries, row.operationLogs || []);
}
