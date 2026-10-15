/**
 * 调出通知单模块逻辑（第2层执行指令单·发货版）。
 *
 * 业务规则依据《调出通知单主PRD》§6.4 状态—功能矩阵、§6.5 状态流转表与 R01～R11；
 * 字段与枚举依据《调出通知单（详细稿）》。
 *
 * 关键口径：
 * - 由分步式调拨单审核通过后系统自动生成并自动推送，无新增、编辑、导入入口；
 * - 只接受一次回传：实出必须大于0且不超过通知调出数量，超量整次拒绝；
 * - 实出>0：通知已发货，生成调出端直接调拨单（调出仓减、在途加，消耗实出预占、释放未发），
 *   并按实际调出量生成调入通知单；
 * - 实出=0：来源主单按零调出取消整单，释放未执行预占，不生成后续单据；
 * - 通知单不增减库存、不推送财务ERP。
 */
import { skuOptions } from '../data/masterData.js';
import { nextDocumentNo } from './documentNo.js';
import {
  generateDirectTransferFromOutNotice,
  generateDirectTransferNo,
  loadDirectTransfersByNoticeId,
  persistDirectTransfer,
  TRANSIT_WAREHOUSE_CODE,
} from './directTransferLogic.js';
import { nowStamp } from './format.js';
import { readMockRows, upsertMockRow, writeMockRows } from './mockStorage.js';
import {
  applyApproveTransferOrder,
  applyTransferOrderZeroOutCancel,
  applyTransferOutWriteBack,
  loadTransferOrderById,
  mergeTransferLogs,
  pushTransferLogEntry,
  refreshTransferOrderLines,
  releaseTransferOrderReservations,
  revertTransferOrderApproval,
} from './transferOrderLogic.js';
import { generateTransferInNoticeFromDirectTransfer } from './transferInNoticeLogic.js';

export const TRANSFER_OUT_NOTICE_STORAGE_KEY = 'qs-erp:transfer-out-notices:v1';

export const transferOutNoticeStatusLabels = {
  pending_push: '待推送',
  pushing: '推送中',
  push_failed: '推送失败',
  pending_ship: '待发货',
  cancelling: '取消中',
  shipped: '已发货',
  cancelled: '已取消',
};

/** 列表状态列语义色文字（《列表页 Demo PRD》§4.3）。 */
export const transferOutNoticeStatusTones = {
  pending_push: 'text-erp-warning',
  pushing: 'text-erp-info',
  push_failed: 'text-erp-danger',
  pending_ship: 'text-erp-info',
  cancelling: 'text-erp-warning',
  shipped: 'text-erp-success',
  cancelled: 'text-erp-text-muted',
};

/** 详情页头 StatusBadge 语义键。 */
export const transferOutNoticeBadgeTones = {
  pending_push: 'warning',
  pushing: 'info',
  push_failed: 'danger',
  pending_ship: 'info',
  cancelling: 'warning',
  shipped: 'success',
  cancelled: 'neutral',
};

let transferOutNoticeSeedRows = [];

/** 种子数据注册：由 `data/transferOutNoticeData.js` 调用。 */
export function registerTransferOutNoticeSeedRows(rows = []) {
  transferOutNoticeSeedRows = rows;
}

export function getTransferOutNoticeSeedRows() {
  return transferOutNoticeSeedRows;
}

// —— 明细与合计 ——

export function enrichTransferOutNoticeLine(line, index = 0) {
  const sku = skuOptions.find((item) => item.value === line.product) || {};
  const quantity = Number(line.quantity || 0);
  const hasActual = line.actualQty !== undefined && line.actualQty !== null && line.actualQty !== '';
  const actualQty = hasActual ? Number(line.actualQty) : undefined;
  return {
    ...line,
    lineNo: Number(line.lineNo || index + 1),
    productCode: line.productCode || sku.skuCode || '',
    barcode: line.barcode || sku.barcode || '',
    productName: line.productName || sku.productName || '',
    unit: line.unit || sku.unit || '',
    quantity,
    actualQty,
    // 未发数量＝通知调出数量−实际调出数量；未确认时等于通知数量
    remainingQty: actualQty === undefined ? quantity : Math.max(0, quantity - actualQty),
  };
}

export function refreshTransferOutNoticeLines(lines = []) {
  return lines.map(enrichTransferOutNoticeLine);
}

export function sumTransferOutNoticeQty(lines = []) {
  return lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
}

export function sumTransferOutNoticeActualQty(lines = []) {
  if (!lines.length || lines.some((line) => line.actualQty === undefined)) return undefined;
  return lines.reduce((sum, line) => sum + Number(line.actualQty || 0), 0);
}

export function sumTransferOutNoticeRemainingQty(lines = []) {
  return lines.reduce((sum, line) => sum + Number(line.remainingQty ?? line.quantity ?? 0), 0);
}

export function normalizeTransferOutNoticeRow(row) {
  const lines = refreshTransferOutNoticeLines(row.lines || []);
  return {
    ...row,
    lines,
    totalQuantity: sumTransferOutNoticeQty(lines),
    totalActualQty: sumTransferOutNoticeActualQty(lines),
    totalRemainingQty: sumTransferOutNoticeRemainingQty(lines),
    confirmBy: row.confirmBy || '',
    confirmAt: row.confirmAt || '',
    confirmContent: row.confirmContent || '',
    manualConfirmLogs: row.manualConfirmLogs || [],
    updatedAt: row.updatedAt || nowStamp(),
    updater: row.updater || '系统',
  };
}

// —— 读写 ——

export function loadAllTransferOutNotices() {
  return readMockRows(TRANSFER_OUT_NOTICE_STORAGE_KEY, transferOutNoticeSeedRows);
}

export function loadTransferOutNoticeById(id) {
  if (!id) return null;
  return loadAllTransferOutNotices().find((row) => row.id === id) || null;
}

export function loadTransferOutNoticeByNo(noticeNo) {
  if (!noticeNo) return null;
  return loadAllTransferOutNotices().find((row) => row.noticeNo === noticeNo) || null;
}

export function loadTransferOutNoticesByOrderId(orderId, orderNo) {
  return loadAllTransferOutNotices()
    .filter((row) => row.sourceOrderId === orderId || (orderNo && row.sourceOrderNo === orderNo))
    .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
}

export function persistTransferOutNotice(row) {
  const next = normalizeTransferOutNoticeRow(row);
  upsertMockRow(TRANSFER_OUT_NOTICE_STORAGE_KEY, next);
  return next;
}

export function removeTransferOutNotice(id) {
  writeMockRows(
    TRANSFER_OUT_NOTICE_STORAGE_KEY,
    loadAllTransferOutNotices().filter((row) => row.id !== id),
  );
}

// —— 状态判定（主PRD §6.4；不满足条件的按钮直接隐藏）——

export function canRetryPush(row) {
  return row?.status === 'push_failed';
}

/** 待推送直接取消；推送失败确认仓库未接收后取消；待发货申请取消进入取消中。 */
export function canCancelNotice(row) {
  return row?.status === 'pending_push' || row?.status === 'push_failed' || row?.status === 'pending_ship';
}

export function canApplyCancelNotice(row) {
  return row?.status === 'pending_ship';
}

export function canMockShip(row) {
  return row?.status === 'pending_ship';
}

/**
 * 人工确认（F09／R09）：只适用于已交给仓库的通知——推送中（发送结果不确定）、待发货、取消中；
 * 待推送先推送、推送失败先重试，不能用人工确认代替（主PRD §6.4）。详情页入口，列表行不提供。
 */
export function canManualConfirm(row) {
  return row?.status === 'pushing' || row?.status === 'pending_ship' || row?.status === 'cancelling';
}

/** 人工确认类型文案（弹窗与Mock §4；类型与填写内容随操作日志保留）。 */
export const manualConfirmTypeLabels = {
  accept: '确认接单',
  finish: '确认执行结束',
  cancel_result: '确认取消结果',
};

/** 确认类型按当前状态给出可选项：推送中—确认接单；待发货—确认执行结束；取消中—确认取消结果。 */
export function resolveManualConfirmType(row) {
  if (row?.status === 'pushing') return 'accept';
  if (row?.status === 'pending_ship') return 'finish';
  if (row?.status === 'cancelling') return 'cancel_result';
  return '';
}

export function buildManualConfirmStatusMessage(row) {
  const label = transferOutNoticeStatusLabels[row?.status] || row?.status || '-';
  return `当前单据状态为${label}，不可执行人工确认`;
}

// —— 生成与自动推送 ——

/** 主单审核通过后系统自动生成：一张主单最多一张调出通知单（R01、R02）。 */
export function generateTransferOutNoticeFromOrder(orderRow) {
  if (!orderRow || orderRow.auditStatus !== 'approved' || orderRow.businessStatus !== 'normal') return null;
  const existing = loadTransferOutNoticesByOrderId(orderRow.id, orderRow.orderNo)[0];
  if (existing) return existing;

  const stamp = nowStamp();
  const lines = refreshTransferOrderLines(orderRow.lines || []).map((line, index) => enrichTransferOutNoticeLine({
    id: `${orderRow.orderNo}-out-notice-line-${line.lineNo}`,
    lineNo: line.lineNo,
    sourceOrderLineId: line.id,
    sourceOrderLineNo: line.lineNo,
    sourceTransferLine: `${orderRow.orderNo} 行${line.lineNo}`,
    product: line.product,
    productCode: line.productCode,
    productName: line.productName,
    unit: line.unit,
    quantity: line.quantity,
    actualQty: null,
  }, index));

  return persistTransferOutNotice({
    id: `transfer-out-notice-${Date.now()}`,
    noticeNo: nextDocumentNo('DCTZ', stamp.slice(0, 10), loadAllTransferOutNotices().map((row) => row.noticeNo)),
    sourceOrderId: orderRow.id,
    sourceOrderNo: orderRow.orderNo,
    outWarehouse: orderRow.outWarehouse,
    status: 'pending_push',
    pushTime: '',
    finalShipTime: '',
    pushFailReason: '',
    cancelReason: '',
    cancelOperator: '',
    cancelTime: '',
    creator: '系统',
    createdAt: stamp,
    updater: '系统',
    updatedAt: stamp,
    lines,
  });
}

/** 生成后系统自动推送调出仓；明确失败后自动重试最多3次（Demo 只演示一次结果）。 */
export function simulateAutoPushOutNotice(noticeId, { forceFail = false } = {}) {
  const notice = loadTransferOutNoticeById(noticeId);
  if (!notice || notice.status !== 'pending_push') return notice;

  const shouldFail = forceFail || notice.demoPushFail;
  const pushing = persistTransferOutNotice({ ...notice, status: 'pushing' });

  window.setTimeout(() => {
    const current = loadTransferOutNoticeById(noticeId);
    if (!current || current.status !== 'pushing') return;
    if (shouldFail) {
      persistTransferOutNotice({
        ...current,
        status: 'push_failed',
        pushFailReason: current.pushFailReason || '仓库接口超时，未确认接收',
      });
      return;
    }
    persistTransferOutNotice({
      ...current,
      status: 'pending_ship',
      pushTime: nowStamp(),
      pushFailReason: '',
    });
  }, 600);

  return pushing;
}

/** 人工重试推送：不重新审核、不重复预占；推送失败原因保留历史（F07）。 */
export function applyRetryPushOutNotice(row) {
  const next = persistTransferOutNotice({ ...row, status: 'pushing' });
  window.setTimeout(() => {
    const current = loadTransferOutNoticeById(row.id);
    if (!current || current.status !== 'pushing') return;
    persistTransferOutNotice({
      ...current,
      status: 'pending_ship',
      pushTime: nowStamp(),
      pushFailReason: current.pushFailReason,
    });
  }, 600);
  return next;
}

/**
 * 取消：待推送／推送失败直接取消并释放全部未执行预占；
 * 待发货进入取消中等待仓库回执，期间仍占用预占（R10、R11）。
 */
export function applyCancelOutNotice(row, cancelReason) {
  const notice = loadTransferOutNoticeById(row?.id) || row;
  // 只有待推送、推送失败、待发货可取消；已发货/已取消等终态不得被陈旧入口改成取消（§6.4）
  if (!canCancelNotice(notice)) throw new Error('当前单据状态不可取消，请刷新后重试');
  if (notice.status === 'pending_ship') {
    return persistTransferOutNotice({
      ...notice,
      status: 'cancelling',
      cancelReason,
      updater: '当前用户',
      updatedAt: nowStamp(),
    });
  }

  const order = loadTransferOrderById(notice.sourceOrderId);
  if (order) {
    const releaseLines = order.lines.filter((line) => (
      (notice.lines || []).some((noticeLine) => Number(noticeLine.sourceOrderLineNo || noticeLine.lineNo) === Number(line.lineNo))
    ));
    releaseTransferOrderReservations(order, { lines: releaseLines.length ? releaseLines : undefined });
  }

  return persistTransferOutNotice({
    ...notice,
    status: 'cancelled',
    cancelReason,
    cancelTime: nowStamp(),
    cancelOperator: '当前用户',
    updater: '当前用户',
    updatedAt: nowStamp(),
  });
}

// —— 人工确认（F09／R09；详情页入口，弹窗与Mock §4） ——

function buildManualConfirmLogEntry({ time, operator, remark }) {
  return { id: `manual-confirm-${time}`, time, operator, action: '人工确认', remark };
}

/** 录入数量按整数解析；空值按 0 处理，由调用方按 0～通知数量校验。 */
function parseConfirmActual(raw) {
  const text = String(raw ?? '').trim();
  if (text === '') return 0;
  const value = Number(text);
  return Number.isFinite(value) && Number.isInteger(value) ? value : NaN;
}

/**
 * 人工确认执行结束形成的调出端直接调拨单：按正式口径走草稿→待审核（R09、AC15）。
 * 原型按「待审核 + 演示数据」落库：不直接记账、不消耗或释放预占；
 * 审核通过后才调出仓减、在途加，消耗实出预占、释放未发预占，并按实际调出量生成调入通知单
 * （原型不提供该结果单的审核入口，故演示不直接生成调入通知单）。
 */
function createManualConfirmOutTransfer(notice, lines, actuals, { operator, time }) {
  const existing = loadDirectTransfersByNoticeId(notice.id, notice.noticeNo)
    .find((item) => item.sourceType === 'step_out');
  if (existing) return existing;

  const activeLines = lines
    .map((line, index) => ({ line, index, actualQty: actuals[index] }))
    .filter((item) => item.actualQty > 0);
  if (!activeLines.length) return null;

  const stamp = String(time);
  return persistDirectTransfer({
    id: `direct-transfer-out-${notice.id}`,
    transferNo: generateDirectTransferNo(stamp.slice(0, 10)),
    sourceType: 'step_out',
    sourceOrderId: notice.sourceOrderId,
    sourceOrderNo: notice.sourceOrderNo,
    sourceNoticeId: notice.id,
    sourceNoticeNo: notice.noticeNo,
    sourceSystem: '',
    sourceNo: '',
    fromWarehouse: notice.outWarehouse,
    toWarehouse: TRANSIT_WAREHOUSE_CODE,
    actualTransferTime: stamp,
    businessDate: stamp.slice(0, 10),
    remark: '人工确认执行结束形成（演示数据，待审核）',
    auditStatus: 'pending',
    financeErpPushStatus: 'un_pushed',
    pushTime: '',
    pushFailReason: '',
    auditor: '',
    auditTime: '',
    returnComment: '',
    returnedAt: '',
    returnOperator: '',
    creator: operator,
    createdAt: stamp,
    updater: operator,
    updatedAt: stamp,
    isMock: true,
    lines: activeLines.map((item, index) => ({
      id: `${notice.id}-out-line-${index + 1}`,
      lineNo: index + 1,
      sourceNoticeLineId: item.line.id,
      sourceNoticeLine: `${notice.noticeNo} 行${item.line.lineNo || item.index + 1}`,
      sourceOrderLineId: item.line.sourceOrderLineId,
      sourceOrderLineNo: item.line.sourceOrderLineNo,
      product: item.line.product,
      productCode: item.line.productCode,
      productName: item.line.productName,
      unit: item.line.unit,
      quantity: item.actualQty,
    })),
  });
}

/**
 * 人工确认（R09）：确认接单／确认执行结束（含零调出）／确认取消结果。
 * - 确认接单：推送中→待发货，不生成结果单；
 * - 确认执行结束：回写实际调出与未发，并形成调出端直接调拨单（草稿→待审核；原型按待审核落库并标注演示数据）；
 * - 零调出：来源主单按零出取消、本通知单已取消，不生成后续单据；
 * - 确认取消结果：仓库同意→已取消并释放未执行预占；拒绝→待发货。
 * 记录人工确认人／时间／内容；不能无来源建通知单，不能把零调出当成已发货。
 */
export function applyManualConfirmOutNotice(row, payload = {}) {
  const notice = loadTransferOutNoticeById(row?.id) || row;
  if (!notice || !canManualConfirm(notice)) {
    throw new Error(buildManualConfirmStatusMessage(notice || row));
  }

  const confirmType = payload.confirmType || resolveManualConfirmType(notice);
  const operator = payload.operator || '当前用户';
  const stamp = nowStamp();
  const appendLog = (remark) => [
    ...(notice.manualConfirmLogs || []),
    buildManualConfirmLogEntry({ time: stamp, operator, remark }),
  ];

  if (confirmType === 'accept') {
    const content = '确认接单：已核实仓库实际接收本通知';
    return persistTransferOutNotice({
      ...notice,
      status: 'pending_ship',
      confirmBy: operator,
      confirmAt: stamp,
      confirmContent: content,
      manualConfirmLogs: appendLog(content),
      updater: operator,
      updatedAt: stamp,
    });
  }

  if (confirmType === 'finish') {
    const lines = refreshTransferOutNoticeLines(notice.lines || []);
    const zeroOut = Boolean(payload.zeroOut);
    const actuals = lines.map((line, index) => {
      const quantity = Number(line.quantity || 0);
      const actualQty = zeroOut ? 0 : parseConfirmActual(payload.lineActuals?.[index]);
      if (!zeroOut) {
        if (!Number.isInteger(actualQty)) throw new Error(`第${index + 1}行实际调出数量须为整数`);
        if (actualQty < 0) throw new Error(`第${index + 1}行实际调出数量不能小于 0`);
        if (actualQty > quantity) {
          throw new Error(`第${index + 1}行实际调出数量超过通知调出数量（通知 ${quantity}），本次确认被拒绝`);
        }
      }
      return actualQty;
    });

    const totalQuantity = lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
    const totalActual = actuals.reduce((sum, value) => sum + value, 0);
    if (!zeroOut && totalActual <= 0) {
      throw new Error('执行结束实际调出合计为 0：请填写实际调出数量，或勾选零调出（来源主单按零出取消）');
    }

    if (zeroOut) {
      const content = `确认零调出：来源主单按零出取消（通知 ${totalQuantity}）`;
      const cancelledNotice = persistTransferOutNotice({
        ...notice,
        status: 'cancelled',
        cancelReason: '人工确认零调出：仓库确认整单未执行',
        cancelOperator: '',
        cancelTime: stamp,
        confirmBy: operator,
        confirmAt: stamp,
        confirmContent: content,
        manualConfirmLogs: appendLog(content),
        lines: lines.map((line) => ({ ...line, actualQty: 0 })),
        updater: operator,
        updatedAt: stamp,
      });
      const order = loadTransferOrderById(notice.sourceOrderId);
      if (order) applyTransferOrderZeroOutCancel(order, { reason: '仓库确认零调出', time: stamp });
      return cancelledNotice;
    }

    const outTransfer = createManualConfirmOutTransfer(notice, lines, actuals, { operator, time: stamp });
    const shippedLines = lines.map((line, index) => ({ ...line, actualQty: actuals[index] }));
    const content = `确认执行结束：实际调出 ${actuals.join('、')}（通知 ${lines.map((line) => Number(line.quantity || 0)).join('、')}）`;
    const shippedNotice = persistTransferOutNotice({
      ...notice,
      status: 'shipped',
      finalShipTime: stamp,
      lines: shippedLines,
      confirmBy: operator,
      confirmAt: stamp,
      confirmContent: content,
      manualConfirmLogs: appendLog(`${content}，已形成演示用调出端直接调拨单 ${outTransfer?.transferNo || ''}（待审核）`),
      updater: operator,
      updatedAt: stamp,
    });
    const order = loadTransferOrderById(notice.sourceOrderId);
    if (order) applyTransferOutWriteBack(order.id, shippedLines, { time: stamp });
    return loadTransferOutNoticeById(shippedNotice.id) || shippedNotice;
  }

  if (confirmType === 'cancel_result') {
    const agreed = payload.cancelResult !== 'reject';
    const content = agreed ? '确认取消结果：仓库同意取消' : '确认取消结果：仓库拒绝取消，恢复等待实际调出';
    if (!agreed) {
      return persistTransferOutNotice({
        ...notice,
        status: 'pending_ship',
        cancelReason: '',
        confirmBy: operator,
        confirmAt: stamp,
        confirmContent: content,
        manualConfirmLogs: appendLog(content),
        updater: operator,
        updatedAt: stamp,
      });
    }
    const order = loadTransferOrderById(notice.sourceOrderId);
    if (order) {
      const releaseLines = order.lines.filter((line) => (
        (notice.lines || []).some((noticeLine) => Number(noticeLine.sourceOrderLineNo || noticeLine.lineNo) === Number(line.lineNo))
      ));
      releaseTransferOrderReservations(order, { lines: releaseLines.length ? releaseLines : undefined });
    }
    return persistTransferOutNotice({
      ...notice,
      status: 'cancelled',
      cancelTime: stamp,
      cancelOperator: operator,
      confirmBy: operator,
      confirmAt: stamp,
      confirmContent: content,
      manualConfirmLogs: appendLog(content),
      updater: operator,
      updatedAt: stamp,
    });
  }

  throw new Error(buildManualConfirmStatusMessage(notice));
}

// —— Demo Mock：模拟调出仓回传（F08-A）——

/** 回传数量按明细行顺序在通知数量内分配（一期一张通知一次回传）。 */
export function distributeNoticeActualQty(lines = [], total = 0) {
  let remaining = Number(total || 0);
  return lines.map((line) => {
    const cap = Number(line.quantity || 0);
    const take = Math.min(Math.max(0, remaining), cap);
    remaining -= take;
    return take;
  });
}

/**
 * 模拟仓库回传实际调出（Demo）：
 * 实出>0 生成调出端直接调拨单与调入通知单并回写主单；实出=0 按零调出取消整张主单；
 * 超量整次拒绝；记账后不允许负库存（记账先行，失败不改状态）。
 */
export function applyMockShipOutNotice(row, actualTotal) {
  const notice = loadTransferOutNoticeById(row?.id) || row;
  if (!notice) throw new Error('调出通知单不存在或已被删除');
  if (notice.status !== 'pending_ship') throw new Error('操作失败，单据状态已变更，请刷新后重试');

  const total = Number(actualTotal);
  if (!Number.isInteger(total) || total < 0) throw new Error('实际调出数量须为大于0的整数');

  const plannedTotal = sumTransferOutNoticeQty(notice.lines);
  if (total > plannedTotal) throw new Error('回传数量超过通知数量，已整次拒绝');

  const order = loadTransferOrderById(notice.sourceOrderId);
  if (!order) throw new Error('来源分步式调拨单不存在');

  const stamp = nowStamp();

  if (total === 0) {
    const cancelledNotice = persistTransferOutNotice({
      ...notice,
      status: 'cancelled',
      cancelReason: '仓库确认零调出',
      cancelOperator: '',
      cancelTime: stamp,
      lines: refreshTransferOutNoticeLines((notice.lines || []).map((line) => ({ ...line, actualQty: 0 }))),
      updater: '系统',
      updatedAt: stamp,
    });
    const cancelledOrder = applyTransferOrderZeroOutCancel(order, { reason: '仓库确认零调出', time: stamp });
    return { status: 'zero_out', row: cancelledNotice, order: cancelledOrder };
  }

  const actuals = distributeNoticeActualQty(notice.lines, total);
  const shippedLines = refreshTransferOutNoticeLines(
    (notice.lines || []).map((line, index) => ({ ...line, actualQty: actuals[index] })),
  );

  // 记账先行：记账校验不通过时不落库通知单状态、不生成结果单
  const outTransfer = generateDirectTransferFromOutNotice({ ...notice, lines: shippedLines, finalShipTime: stamp });

  const shippedNotice = persistTransferOutNotice({
    ...notice,
    status: 'shipped',
    finalShipTime: stamp,
    pushFailReason: notice.pushFailReason,
    lines: shippedLines,
    updater: '系统',
    updatedAt: stamp,
  });
  const inNotice = generateTransferInNoticeFromDirectTransfer(outTransfer);
  applyTransferOutWriteBack(order.id, shippedLines, { time: stamp });

  return {
    status: 'shipped',
    row: loadTransferOutNoticeById(shippedNotice.id) || shippedNotice,
    directTransfer: outTransfer,
    inNotice,
    order: loadTransferOrderById(order.id),
  };
}

/**
 * 主单审核 + 生成调出通知单的串联动作：
 * 审核通过先按计划数量预占；通知单生成失败时整笔回滚（释放预占、回到待审核），
 * 不留下「主单已审核但没有通知单」的状态（《调出通知单主PRD》§6.5）。
 */
export function approveTransferOrderWithNotice(orderRow, { operator = '当前用户' } = {}) {
  const approved = applyApproveTransferOrder(orderRow, { operator });
  try {
    const notice = generateTransferOutNoticeFromOrder(approved);
    if (notice) simulateAutoPushOutNotice(notice.id);
    return {
      order: loadTransferOrderById(approved.id) || approved,
      notice: notice ? (loadTransferOutNoticeById(notice.id) || notice) : null,
    };
  } catch (error) {
    revertTransferOrderApproval(approved);
    throw error;
  }
}

// —— 种子构造（链路进度按主单组织，见 `data/transferOrderData.js`）——

export function buildTransferOutNoticeSeed(orderRow, plan = {}) {
  const lines = refreshTransferOrderLines(orderRow.lines || []).map((line, index) => enrichTransferOutNoticeLine({
    id: `${orderRow.orderNo}-out-notice-line-${line.lineNo}`,
    lineNo: line.lineNo,
    sourceOrderLineId: line.id,
    sourceOrderLineNo: line.lineNo,
    sourceTransferLine: `${orderRow.orderNo} 行${line.lineNo}`,
    product: line.product,
    productCode: line.productCode,
    productName: line.productName,
    unit: line.unit,
    quantity: line.quantity,
    // 已发货／已取消（零调出）的行按主单回写值展示；未回传行留空
    actualQty: line.actualOutQty,
  }, index));

  return normalizeTransferOutNoticeRow({
    id: plan.id || `transfer-out-notice-seed-${orderRow.orderNo}`,
    noticeNo: plan.noticeNo,
    sourceOrderId: orderRow.id,
    sourceOrderNo: orderRow.orderNo,
    outWarehouse: orderRow.outWarehouse,
    status: plan.status || 'pending_push',
    pushTime: plan.pushTime || '',
    finalShipTime: plan.finalShipTime || '',
    pushFailReason: plan.pushFailReason || '',
    cancelReason: plan.cancelReason || '',
    cancelOperator: plan.cancelOperator || '',
    cancelTime: plan.cancelTime || '',
    creator: '系统',
    createdAt: plan.createdAt || orderRow.auditTime || orderRow.createdAt,
    updater: '系统',
    updatedAt: plan.updatedAt || plan.createdAt || orderRow.auditTime || orderRow.createdAt,
    lines,
  });
}

// —— 操作日志 ——

export function buildTransferOutNoticeOperationLogs(row) {
  const entries = [];
  const manualConfirmLogs = Array.isArray(row.manualConfirmLogs) ? row.manualConfirmLogs : [];
  const confirmedFinish = manualConfirmLogs.some((log) => (
    String(log.remark || '').startsWith('确认执行结束') || String(log.remark || '').startsWith('确认零调出')
  ));
  pushTransferLogEntry(entries, {
    time: row.createdAt,
    operator: '系统',
    action: '生成',
    remark: '来源分步式调拨单审核通过，系统自动生成调出通知单',
  });
  if (row.pushTime) {
    pushTransferLogEntry(entries, {
      time: row.pushTime,
      operator: '系统',
      action: '推送仓库',
      remark: row.pushFailReason ? `推送失败：${row.pushFailReason}` : '推送调出仓成功',
    });
  }
  if (row.finalShipTime && !confirmedFinish) {
    pushTransferLogEntry(entries, {
      time: row.finalShipTime,
      operator: '系统',
      action: '发货完成',
      remark: '仓库回传实际调出结果',
    });
  }
  if (row.status === 'cancelled') {
    pushTransferLogEntry(entries, {
      time: row.cancelTime,
      operator: row.cancelOperator,
      action: '取消',
      remark: row.cancelReason,
    });
  }
  manualConfirmLogs.forEach((log) => pushTransferLogEntry(entries, {
    time: log.time,
    operator: log.operator,
    action: log.action || '人工确认',
    remark: log.remark,
  }));
  if (!manualConfirmLogs.length && row.confirmAt) {
    pushTransferLogEntry(entries, {
      time: row.confirmAt,
      operator: row.confirmBy,
      action: '人工确认',
      remark: row.confirmContent,
    });
  }
  return mergeTransferLogs(entries, row.operationLogs);
}
