import { inboundOrders } from '../data/inboundData.js';
import { skuOptions } from '../data/masterData.js';
import { getSelectableSupplierOptions } from '../data/supplierData.js';
import { getSelectableLogicalWarehouseOptions } from '../data/warehouseData.js';
import { nextDocumentNo } from './documentNo.js';
import { computeLinesTotals, EMPTY_PLACEHOLDER } from './format.js';
import { emptyFieldMessage } from './formValidation.js';
import { loadAllInbounds } from './inboundLogic.js';
import { readMockRows, writeMockRows } from './mockStorage.js';
import { hasNegativePrice } from './validation.js';

/**
 * 采购退货单模块逻辑。
 * 业务规则依据《采购退货单主PRD》§6.4 状态—功能矩阵与 R01～R15；字段与枚举依据《采购退货单（详细稿）》。
 * 数量口径：可下推数量 = 退货数量 − 已结束通知实出 − 未结束通知通知量（不同 SKU 不互抵）。
 * 来源额度：草稿不占额度，审核才占用；取消/关闭后未执行部分释放。
 */

export const PURCHASE_RETURN_STORAGE_KEY = 'qs-erp:purchase-returns:v1';
export const RETURN_NOTICE_STORAGE_KEY = 'qs-erp:purchase-return-notices:v1';
export const RETURN_OUTBOUND_STORAGE_KEY = 'qs-erp:purchase-return-outbounds:v1';

/** 未结束通知状态：创建即占用退货单可下推量，取消成功才释放（主PRD R08）。 */
const BLOCKING_NOTICE_STATUSES = new Set(['pushing', 'pending_ship', 'cancelling']);
/** 可随退货单取消的通知状态：待推送、推送失败（主PRD R11）。 */
const CANCELLABLE_NOTICE_STATUSES = new Set(['pending_push', 'push_failed']);

let returnSeedRows = [];
let returnNoticeSeedRows = [];
let returnOutboundSeedRows = [];

/** 种子数据注册：由各 data 文件调用，保证未访问列表页时也能读到演示数据。 */
export function registerReturnSeedRows(rows = []) {
  returnSeedRows = rows;
}

export function registerReturnNoticeSeedRows(rows = []) {
  returnNoticeSeedRows = rows;
}

export function registerReturnOutboundSeedRows(rows = []) {
  returnOutboundSeedRows = rows;
}

export function getReturnNoticeSeedRows() {
  return returnNoticeSeedRows;
}

export function getReturnOutboundSeedRows() {
  return returnOutboundSeedRows;
}

export function loadAllReturns() {
  return readMockRows(PURCHASE_RETURN_STORAGE_KEY, returnSeedRows);
}

/** 缺出数量只在发货完成后计算展示；未结束（含取消中、已取消）为 0，见通知单列表页 Demo PRD §4.2 */
export function resolveReturnNoticeShortQty(status, notifyQty, shippedQty) {
  return status === 'shipped' ? Math.max(0, Number(notifyQty || 0) - Number(shippedQty || 0)) : 0;
}

/** 读取时按当前状态重算缺出与三列合计，避免本地存储中的历史值口径漂移 */
export function normalizeReturnNoticeTotals(row) {
  const lines = (row.lines || []).map((line) => {
    const notifyQty = Number(line.notifyQty || 0);
    const shippedQty = Number(line.shippedQty || 0);
    return {
      ...line,
      notifyQty,
      shippedQty,
      shortQty: resolveReturnNoticeShortQty(row.status, notifyQty, shippedQty),
    };
  });
  return {
    ...row,
    lines,
    totalNotifyQty: lines.reduce((sum, line) => sum + line.notifyQty, 0),
    totalShippedQty: lines.reduce((sum, line) => sum + line.shippedQty, 0),
    totalShortQty: lines.reduce((sum, line) => sum + line.shortQty, 0),
  };
}

export function loadAllReturnNotices() {
  return readMockRows(RETURN_NOTICE_STORAGE_KEY, returnNoticeSeedRows).map(normalizeReturnNoticeTotals);
}

export function loadAllReturnOutbounds() {
  return readMockRows(RETURN_OUTBOUND_STORAGE_KEY, returnOutboundSeedRows);
}

export function nowStamp() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

let returnLineSequence = 0;

export function createReturnLineId() {
  return `return-line-${Date.now()}-${returnLineSequence++}`;
}

/* ------------------------------------------------------------------ *
 * 明细：商品信息补全、数量口径与行合计
 * ------------------------------------------------------------------ */

export function enrichReturnLine(line) {
  const sku = skuOptions.find((item) => item.value === line.product);
  return {
    ...line,
    productCode: line.productCode || sku?.skuCode || '',
    barcode: line.barcode || sku?.barcode || '',
    productName: line.productName || sku?.productName || '',
    unit: line.unit || sku?.unit || '个',
    receivedQty: Number(line.receivedQty || 0),
    inTransitQty: Number(line.inTransitQty || 0),
  };
}

/** 可下推数量 = 退货数量 − 累计实出 − 在途通知（不小于 0） */
export function computePushableQty(line) {
  return Math.max(0, Number(line.quantity || 0) - Number(line.receivedQty || 0) - Number(line.inTransitQty || 0));
}

export function refreshReturnLines(lines = []) {
  return lines.map((line) => {
    const enriched = enrichReturnLine(line);
    return { ...enriched, pushableQty: computePushableQty(enriched) };
  });
}

export function sumReturnLineQty(lines = [], field) {
  return (lines || []).reduce((sum, line) => sum + Number(line[field] || 0), 0);
}

export function normalizeReturnRow(row) {
  const lines = refreshReturnLines(row.lines || []);
  const totals = computeLinesTotals(lines);
  return {
    ...row,
    returnDeadline: String(row.returnDeadline || '').slice(0, 10),
    lines,
    amount: totals.grossAmount,
    taxAmount: totals.taxAmount,
    netAmount: totals.netAmount,
    totalReturnQty: totals.quantity,
    totalShippedQty: sumReturnLineQty(lines, 'receivedQty'),
    totalNotifyQty: sumReturnLineQty(lines, 'inTransitQty'),
    totalPushableQty: sumReturnLineQty(lines, 'pushableQty'),
    updatedAt: row.updatedAt || nowStamp(),
    updater: row.updater || '当前用户',
  };
}

export function persistReturn(row) {
  const next = normalizeReturnRow(row);
  const rows = loadAllReturns();
  const index = rows.findIndex((item) => item.id === next.id);
  const nextRows = index < 0
    ? [next, ...rows]
    : rows.map((item, itemIndex) => (itemIndex === index ? next : item));
  writeMockRows(PURCHASE_RETURN_STORAGE_KEY, nextRows);
  return next;
}

export function loadReturnById(id) {
  if (!id) return null;
  return loadAllReturns().find((item) => item.id === id) || null;
}

export function deleteReturnById(id) {
  const nextRows = loadAllReturns().filter((item) => item.id !== id);
  writeMockRows(PURCHASE_RETURN_STORAGE_KEY, nextRows);
  return nextRows;
}

/** 通知/出库单侧回写与 Mock 生成共用的带种子兜底的写入。 */
export function upsertReturnNoticeRow(row) {
  const rows = loadAllReturnNotices();
  const index = rows.findIndex((item) => item.id === row.id);
  const nextRows = index < 0
    ? [row, ...rows]
    : rows.map((item, itemIndex) => (itemIndex === index ? row : item));
  writeMockRows(RETURN_NOTICE_STORAGE_KEY, nextRows);
  return row;
}

export function upsertReturnOutboundRow(row) {
  const rows = loadAllReturnOutbounds();
  const index = rows.findIndex((item) => item.id === row.id);
  const nextRows = index < 0
    ? [row, ...rows]
    : rows.map((item, itemIndex) => (itemIndex === index ? row : item));
  writeMockRows(RETURN_OUTBOUND_STORAGE_KEY, nextRows);
  return row;
}

/* ------------------------------------------------------------------ *
 * 来源采购入库单（只读）与原入库可退额度
 * ------------------------------------------------------------------ */

function loadSourceInbounds() {
  return loadAllInbounds(inboundOrders);
}

export function getSelectableSourceInboundOptions() {
  return loadSourceInbounds()
    .filter((row) => row.auditStatus === 'approved')
    .map((row) => ({ value: row.inboundNo, label: row.inboundNo }));
}

export function loadSourceInboundByNo(inboundNo) {
  if (!inboundNo) return null;
  return loadSourceInbounds().find((row) => row.inboundNo === inboundNo) || null;
}

function findSourceInboundLine(inboundLineId) {
  if (!inboundLineId) return null;
  for (const inbound of loadSourceInbounds()) {
    const index = (inbound.lines || []).findIndex((line) => line.id === inboundLineId);
    if (index >= 0) {
      return { inbound, line: inbound.lines[index], lineNo: index + 1 };
    }
  }
  return null;
}

/**
 * 原入库行已占用数量：已审核退货单占用（草稿、待审核不占）；
 * 已关闭/已取消退货单只保留已实际退回部分（主PRD R03、AC05）。
 */
export function computeInboundOccupiedQty(inboundLineId, { excludeReturnId } = {}) {
  if (!inboundLineId) return 0;
  return loadAllReturns()
    .filter((row) => row.id !== excludeReturnId && row.auditStatus === 'approved')
    .flatMap((row) => (row.lines || []).map((line) => ({ row, line })))
    .filter(({ line }) => line.sourceInboundLineId === inboundLineId)
    .reduce((sum, { row, line }) => {
      const occupied = row.businessStatus === 'normal'
        ? Number(line.quantity || 0)
        : Number(line.receivedQty || 0);
      return sum + occupied;
    }, 0);
}

/** 原入库行剩余可退额度 = 实际入库数量 − 其他已审核退货单占用 */
export function computeInboundLineRemaining(inboundLineId, { excludeReturnId } = {}) {
  const matched = findSourceInboundLine(inboundLineId);
  if (!matched) return null;
  return Math.max(0, Number(matched.line.quantity || 0) - computeInboundOccupiedQty(inboundLineId, { excludeReturnId }));
}

function validateSourceQuotaLine(line, index, excludeReturnId) {
  if (!line.sourceInboundLineId) return null;
  const remaining = computeInboundLineRemaining(line.sourceInboundLineId, { excludeReturnId });
  if (remaining == null) return `第${index + 1}行来源入库单行不存在，请重新选择来源采购入库单`;
  if (Number(line.quantity || 0) > remaining) return `第${index + 1}行退货数量超过该入库单剩余可退额度`;
  return null;
}

/** 提交级额度复核：含其他已审核、办理中的退货（主PRD §4.4） */
export function validateReturnSourceQuota(row) {
  const lines = row?.lines || [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.sourceInboundLineId) continue;
    const remaining = computeInboundLineRemaining(line.sourceInboundLineId, { excludeReturnId: row.id });
    if (remaining == null) return `第${index + 1}行来源入库单行不存在，请重新选择来源采购入库单`;
    if (Number(line.quantity || 0) > remaining) return '累计退货数量超过该入库单剩余可退额度';
  }
  return null;
}

/** 来源联动：按原入库明细带出商品、基本单位、来源入库单行、数量与价格（Demo PRD §5） */
export function buildReturnLinesFromSourceInbound(inboundRow) {
  return refreshReturnLines((inboundRow?.lines || []).map((line, index) => ({
    id: createReturnLineId(),
    sourceInboundLineId: line.id,
    sourceInboundLine: `${inboundRow.inboundNo} 行${index + 1}`,
    product: line.product,
    productCode: line.productCode,
    barcode: line.barcode,
    productName: line.productName,
    unit: line.unit,
    quantity: line.quantity,
    price: line.price,
    taxRate: line.taxRate,
    receivedQty: 0,
    inTransitQty: 0,
  })));
}

/** 清空来源：断开来源入库单行，保留已录商品、数量与价格，转无来源口径 */
export function detachReturnLinesFromSource(lines = []) {
  return refreshReturnLines(lines.map((line) => ({
    ...line,
    sourceInboundLineId: '',
    sourceInboundLine: '',
  })));
}

/* ------------------------------------------------------------------ *
 * 状态—功能矩阵（主PRD §6.4）
 * ------------------------------------------------------------------ */

/** 退货截止日期按天粒度展示，兼容历史带时间的存量数据 */
export function formatDeadlineDate(value) {
  const text = String(value || '').slice(0, 10);
  return text || EMPTY_PLACEHOLDER;
}

export function canEditReturn(row) {
  return row?.auditStatus === 'draft' && row?.businessStatus === 'normal';
}

export function canSubmitReturn(row) {
  return canEditReturn(row);
}

export function canApproveReturn(row) {
  return row?.auditStatus === 'pending' && row?.businessStatus === 'normal';
}

export function canWithdrawReturn(row) {
  return canApproveReturn(row);
}

export function canCancelPendingReturn(row) {
  return row?.auditStatus === 'pending' && row?.businessStatus === 'normal';
}

/** 累计实出 = 退货数量：全部退足，仅查看追溯（S07、R13） */
export function isReturnFullyCompleted(row) {
  const total = Number(row?.totalReturnQty ?? sumReturnLineQty(row?.lines || [], 'quantity'));
  const shipped = Number(row?.totalShippedQty ?? sumReturnLineQty(row?.lines || [], 'receivedQty'));
  return total > 0 && shipped >= total;
}

/**
 * 已审核+正常时的「取消」入口：按状态矩阵展示；
 * R11 条件（无实出、无阻挡通知）在动作入口用 getReturnCancelBlockReason 校验并阻断。
 */
export function canCancelApprovedReturn(row) {
  return row?.auditStatus === 'approved'
    && row?.businessStatus === 'normal'
    && !isReturnFullyCompleted(row);
}

export function canCloseReturn(row) {
  return row?.auditStatus === 'approved'
    && row?.businessStatus === 'normal'
    && !isReturnFullyCompleted(row);
}

/** 已审核后仅可调整退货截止日期，全部退足后不再提供（R09、R13） */
export function canAdjustReturnDeadline(row) {
  return canCloseReturn(row);
}

export function canDeleteDraftReturn(row) {
  return canEditReturn(row);
}

export function canPushReturnNotice(row) {
  return row?.auditStatus === 'approved'
    && row?.businessStatus === 'normal'
    && !isReturnFullyCompleted(row)
    && (row.lines || []).some((line) => Number(line.pushableQty ?? computePushableQty(line)) > 0);
}

/** 取消阻断原因：返回文案时按阻断 Toast 处理，不进入成功流（主PRD R11、弹窗PRD §3.5）。 */
export function getReturnCancelBlockReason(row) {
  if (row?.businessStatus !== 'normal') return '当前业务状态不可取消';
  if (row?.auditStatus === 'approved') {
    const hasShipped = Number(row.totalShippedQty || 0) > 0
      || (row.lines || []).some((line) => Number(line.receivedQty || 0) > 0);
    if (hasShipped) return '退货单已有实际出库，无法取消整单，请使用关闭余量';
    if (hasBlockingReturnNotices(row.id)) return '存在推送中、待发货或取消中的采退发货通知，请先处理后再取消';
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * 校验（主PRD §7.7、新增编辑页 PRD §4.3/§4.4）
 * ------------------------------------------------------------------ */

export function findZeroPriceLines(form) {
  return (form?.lines || [])
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => Number(line.price) === 0);
}

export function validateReturnForSave(form) {
  const fieldErrors = {};
  if (!form.supplier) fieldErrors.supplier = emptyFieldMessage('供应商');
  if (!form.currency) fieldErrors.currency = emptyFieldMessage('币别');
  if (!form.warehouse) fieldErrors.warehouse = emptyFieldMessage('出库仓库');
  if (!form.returnDeadline) fieldErrors.returnDeadline = emptyFieldMessage('退货截止日期');
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const lines = form.lines || [];
  if (!lines.length) return { message: '请至少添加一行有效商品明细' };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.product) return { message: `第${index + 1}行请选择商品` };
    if (!(Number(line.quantity) > 0)) return { message: `第${index + 1}行退货数量必须大于 0` };
    const quotaMessage = validateSourceQuotaLine(line, index, form.id);
    if (quotaMessage) return { message: quotaMessage };
  }
  if (hasNegativePrice(lines)) return { message: '含税单价不能为负数' };
  return null;
}

export function validateReturnForSubmit(form) {
  const saveResult = validateReturnForSave(form);
  if (saveResult) return saveResult;

  for (let index = 0; index < form.lines.length; index += 1) {
    const line = form.lines[index];
    if (line.price === '' || line.price == null) return { message: `第${index + 1}行含税单价不能为空` };
    if (line.taxRate === '' || line.taxRate == null) return { message: `第${index + 1}行税率不能为空` };
  }

  const quotaMessage = validateReturnSourceQuota(form);
  if (quotaMessage) return { message: quotaMessage };

  if (form.supplier && !getSelectableSupplierOptions().some((option) => option.value === form.supplier)) {
    return { message: '所选供应商不可用' };
  }
  if (form.warehouse && !getSelectableLogicalWarehouseOptions().some((option) => option.value === form.warehouse)) {
    return { message: '所选出库仓库不可用' };
  }
  return null;
}

/** 审核占用可用库存（R07）：Demo 用商品主数据 availableStock 按逻辑仓简单模拟 */
export function findStockShortageLine(row) {
  const lines = refreshReturnLines(row?.lines || []);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const sku = skuOptions.find((item) => item.value === line.product);
    const available = Number(sku?.availableStock ?? 0);
    if (Number(line.quantity || 0) > available) return { line, index };
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * 状态变更（列表、详情与表单页共用）
 * ------------------------------------------------------------------ */

export function applySubmitReturn(row) {
  const stamp = nowStamp();
  return persistReturn({
    ...row,
    auditStatus: 'pending',
    submittedAt: stamp,
    submitter: '当前用户',
    updatedAt: stamp,
    updater: '当前用户',
  });
}

export function applyApproveReturn(row) {
  if (findStockShortageLine(row)) throw new Error('出库仓库可用库存不足，无法审核');
  const quotaMessage = validateReturnSourceQuota(row);
  if (quotaMessage) throw new Error(quotaMessage);
  return persistReturn({
    ...row,
    auditStatus: 'approved',
    auditor: '当前用户',
    auditTime: nowStamp(),
    updatedAt: nowStamp(),
    updater: '当前用户',
  });
}

/** 撤回意见保留在 returnComment（R09 审核记录） */
export function applyWithdrawReturn(row, returnComment) {
  const stamp = nowStamp();
  return persistReturn({
    ...row,
    auditStatus: 'draft',
    returnComment,
    returnedAt: stamp,
    returnOperator: '当前用户',
    updatedAt: stamp,
    updater: '当前用户',
  });
}

export function applyCloseReturn(row, closeReason) {
  const stamp = nowStamp();
  return persistReturn({
    ...row,
    businessStatus: 'closed',
    closeType: 'manual',
    closeReason,
    closeTime: stamp,
    closeOperator: '当前用户',
    updatedAt: stamp,
    updater: '当前用户',
  });
}

export function applyCancelReturn(row, cancelReason) {
  cancelReturnNoticesWithReturn(row.id, cancelReason);
  const latest = loadReturnById(row.id) || row;
  const stamp = nowStamp();
  return persistReturn({
    ...latest,
    businessStatus: 'cancelled',
    cancelReason,
    cancelTime: stamp,
    cancelOperator: '当前用户',
    updatedAt: stamp,
    updater: '当前用户',
  });
}

export function applyAdjustReturnDeadline(row, deadline) {
  const stamp = nowStamp();
  return persistReturn({
    ...row,
    returnDeadline: deadline,
    deadlineAdjustedAt: stamp,
    deadlineAdjustedBy: '当前用户',
    updatedAt: stamp,
    updater: '当前用户',
  });
}

/* ------------------------------------------------------------------ *
 * 采退发货通知单联动（只读读取与随单取消；通知单内部流程见 purchaseReturnNoticeLogic）
 * ------------------------------------------------------------------ */

export function loadReturnNotices(returnId) {
  if (!returnId) return [];
  return loadAllReturnNotices().filter((notice) => notice.sourceReturnId === returnId);
}

export function hasBlockingReturnNotices(returnId) {
  return loadReturnNotices(returnId).some((notice) => BLOCKING_NOTICE_STATUSES.has(notice.status));
}

/** 草稿是否被下游（采退发货通知单）引用：被引用不可删除（R14） */
export function hasReturnDownstreamRefs(returnId) {
  return loadReturnNotices(returnId).length > 0;
}

/** 退货单取消时，待推送/推送失败通知随单取消并释放占用（R11） */
export function cancelReturnNoticesWithReturn(returnId, reason) {
  const cancellable = loadReturnNotices(returnId)
    .filter((notice) => CANCELLABLE_NOTICE_STATUSES.has(notice.status));
  if (!cancellable.length) return [];

  const stamp = nowStamp();
  cancellable.forEach((notice) => {
    upsertReturnNoticeRow({
      ...notice,
      status: 'cancelled',
      cancelReason: reason,
      cancelTime: stamp,
      cancelOperator: '当前用户',
      updatedAt: stamp,
      updater: '当前用户',
    });
  });

  const returnRow = loadReturnById(returnId);
  if (returnRow) {
    const releaseMap = new Map();
    cancellable.forEach((notice) => {
      (notice.lines || []).forEach((line) => {
        const key = line.sourceReturnLineId || line.id;
        releaseMap.set(key, (releaseMap.get(key) || 0) + Number(line.notifyQty || 0));
      });
    });
    const nextLines = returnRow.lines.map((line) => {
      const release = releaseMap.get(line.id);
      if (!release) return line;
      return { ...line, inTransitQty: Math.max(0, Number(line.inTransitQty || 0) - release) };
    });
    persistReturn({ ...returnRow, lines: nextLines, updatedAt: stamp, updater: '当前用户' });
  }

  return cancellable;
}

/**
 * Demo Mock：审核后生成演示用采退发货通知单（弹窗PRD §4.4，非正式验收）。
 * 通知数量 = 当前可下推数量；占用退货单可下推量；返回 { returnRow, notice }，由调用方决定是否模拟推送。
 */
export function createMockReturnNotice(returnRow) {
  const latest = loadReturnById(returnRow?.id) || returnRow;
  if (!latest) throw new Error('采购退货单不存在');

  const lines = refreshReturnLines(latest.lines || [])
    .map((line, index) => ({ line, lineNo: index + 1 }))
    .filter(({ line }) => Number(line.pushableQty || 0) > 0)
    .map(({ line, lineNo }) => ({
      id: createReturnLineId(),
      sourceReturnLineId: line.id,
      sourceReturnLine: `${latest.returnNo} 行${lineNo}`,
      product: line.product,
      productCode: line.productCode,
      barcode: line.barcode,
      productName: line.productName,
      unit: line.unit,
      notifyQty: line.pushableQty,
      shippedQty: 0,
      shortQty: 0,
    }));
  if (!lines.length) throw new Error('当前采购退货单没有可下推数量');

  const stamp = nowStamp();
  const noticeNo = nextDocumentNo(
    'CTFHTZ',
    stamp.slice(0, 10),
    loadAllReturnNotices().map((row) => row.noticeNo),
  );
  const notice = upsertReturnNoticeRow({
    id: `return-notice-${Date.now()}`,
    noticeNo,
    sourceReturnId: latest.id,
    sourceReturnNo: latest.returnNo,
    supplier: latest.supplier,
    warehouse: latest.warehouse,
    shipMode: 'warehouse',
    status: 'pending_push',
    remark: '',
    pushTime: '',
    finalShipTime: '',
    pushFailReason: '',
    lastProcessTime: '',
    isMock: true,
    creator: '当前用户',
    createdAt: stamp,
    lines,
    totalNotifyQty: sumReturnLineQty(lines, 'notifyQty'),
    totalShippedQty: 0,
    totalShortQty: 0,
  });

  const occupyMap = new Map(lines.map((line) => [line.sourceReturnLineId, Number(line.notifyQty || 0)]));
  const nextLines = latest.lines.map((line) => {
    const occupy = occupyMap.get(line.id);
    if (!occupy) return line;
    return { ...line, inTransitQty: Number(line.inTransitQty || 0) + occupy };
  });
  return {
    returnRow: persistReturn({ ...latest, lines: nextLines, updatedAt: stamp, updater: '当前用户' }),
    notice,
  };
}

/* ------------------------------------------------------------------ *
 * 操作日志（结构与 lib/operationLog.js 一致，模块内自维护）
 * ------------------------------------------------------------------ */

function hasValue(value) {
  return value != null && value !== '' && value !== EMPTY_PLACEHOLDER;
}

export function pushLogEntry(entries, { time, operator, action, remark }) {
  if (!hasValue(time) && !hasValue(operator) && !hasValue(action)) return;
  entries.push({
    id: `${action}-${time || entries.length}`,
    time: time || EMPTY_PLACEHOLDER,
    operator: operator || EMPTY_PLACEHOLDER,
    action,
    remark: remark || EMPTY_PLACEHOLDER,
  });
}

export function mergeLogEntries(...sources) {
  const map = new Map();
  sources.flat().forEach((entry) => {
    if (!entry) return;
    map.set(entry.id, entry);
  });
  return [...map.values()].sort((left, right) => String(right.time).localeCompare(String(left.time)));
}

export function buildPurchaseReturnOperationLogs(row) {
  const entries = [];

  pushLogEntry(entries, {
    time: row.createdAt,
    operator: row.creator,
    action: '创建',
    remark: '创建采购退货单',
  });

  if (row.auditStatus === 'pending' || row.auditStatus === 'approved') {
    pushLogEntry(entries, {
      time: row.submittedAt || row.createdAt,
      operator: row.submitter || row.creator,
      action: '提交',
      remark: '提交审核',
    });
  }

  if (row.returnComment) {
    pushLogEntry(entries, {
      time: row.returnedAt || row.updatedAt,
      operator: row.returnOperator || row.updater,
      action: '撤回',
      remark: row.returnComment,
    });
  }

  if (row.auditStatus === 'approved' && row.auditTime) {
    pushLogEntry(entries, {
      time: row.auditTime,
      operator: row.auditor,
      action: '审核',
      remark: '审核通过，占用原入库可退额度与出库仓可用库存',
    });
  }

  if (row.businessStatus === 'cancelled') {
    pushLogEntry(entries, {
      time: row.cancelTime,
      operator: row.cancelOperator,
      action: '取消',
      remark: row.cancelReason,
    });
  }

  if (row.businessStatus === 'closed') {
    pushLogEntry(entries, {
      time: row.closeTime,
      operator: row.closeOperator,
      action: '关闭',
      remark: row.closeReason || (row.closeType === 'auto' ? '到期自动关闭' : '手动关闭'),
    });
  }

  if (row.deadlineAdjustedAt) {
    pushLogEntry(entries, {
      time: row.deadlineAdjustedAt,
      operator: row.deadlineAdjustedBy || row.updater,
      action: '调整退货截止日期',
      remark: row.returnDeadline ? `退货截止日期调整为 ${row.returnDeadline}` : '调整退货截止日期',
    });
  }

  return mergeLogEntries(entries, row.operationLogs || []);
}
