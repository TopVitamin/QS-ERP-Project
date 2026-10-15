/**
 * 调入通知单模块逻辑（第2层执行指令单·收货版）。
 *
 * 业务规则依据《调入通知单主PRD》§6.4 状态—功能矩阵、§6.5 状态流转表与 R01～R08；
 * 字段与枚举依据《调入通知单（详细稿）》。
 *
 * 关键口径：
 * - 调出端直接调拨单生成后按实际调出量自动生成并推送接收仓，不按原计划量提前下发；
 * - 只接受一次回传：实收必须大于0且不超过通知调入数量；超量整次拒绝；
 * - 实收=0 属异常：拒绝整次回传并报错，通知单保持待收货，不按零收取消；
 * - 实收>0：通知已收货，生成调入端直接调拨单（在途减、接收仓加），回写主单并触发主单自动完结；
 * - 少收差额留在途，不自动抹平；本期不提供取消入口。
 */
import { skuOptions } from '../data/masterData.js';
import { nextDocumentNo } from './documentNo.js';
import {
  generateDirectTransferFromInNotice,
  generateDirectTransferNo,
  loadDirectTransfersByNoticeId,
  persistDirectTransfer,
  TRANSIT_WAREHOUSE_CODE,
} from './directTransferLogic.js';
import { nowStamp } from './format.js';
import { readMockRows, upsertMockRow, writeMockRows } from './mockStorage.js';
import {
  applyTransferInWriteBack,
  loadTransferOrderById,
  mergeTransferLogs,
  pushTransferLogEntry,
} from './transferOrderLogic.js';

export const TRANSFER_IN_NOTICE_STORAGE_KEY = 'qs-erp:transfer-in-notices:v1';

export const transferInNoticeStatusLabels = {
  pending_push: '待推送',
  pushing: '推送中',
  push_failed: '推送失败',
  pending_receive: '待收货',
  cancelling: '取消中',
  received: '已收货',
  cancelled: '已取消',
};

/** 列表状态列语义色文字（《列表页 Demo PRD》§4.3）。 */
export const transferInNoticeStatusTones = {
  pending_push: 'text-erp-warning',
  pushing: 'text-erp-info',
  push_failed: 'text-erp-danger',
  pending_receive: 'text-erp-info',
  cancelling: 'text-erp-warning',
  received: 'text-erp-success',
  cancelled: 'text-erp-text-muted',
};

/** 详情页头 StatusBadge 语义键。 */
export const transferInNoticeBadgeTones = {
  pending_push: 'warning',
  pushing: 'info',
  push_failed: 'danger',
  pending_receive: 'info',
  cancelling: 'warning',
  received: 'success',
  cancelled: 'neutral',
};

let transferInNoticeSeedRows = [];

/** 种子数据注册：由 `data/transferInNoticeData.js` 调用。 */
export function registerTransferInNoticeSeedRows(rows = []) {
  transferInNoticeSeedRows = rows;
}

export function getTransferInNoticeSeedRows() {
  return transferInNoticeSeedRows;
}

// —— 明细与合计 ——

export function enrichTransferInNoticeLine(line, index = 0) {
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
    // 少收数量＝通知调入数量−实际调入数量；未回传时留空（页面显示 `-`）
    shortageQty: actualQty === undefined ? undefined : Math.max(0, quantity - actualQty),
  };
}

export function refreshTransferInNoticeLines(lines = []) {
  return lines.map(enrichTransferInNoticeLine);
}

export function sumTransferInNoticeQty(lines = []) {
  return lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
}

export function sumTransferInNoticeActualQty(lines = []) {
  if (!lines.length || lines.some((line) => line.actualQty === undefined)) return undefined;
  return lines.reduce((sum, line) => sum + Number(line.actualQty || 0), 0);
}

export function sumTransferInNoticeShortageQty(lines = []) {
  if (!lines.length || lines.some((line) => line.shortageQty === undefined)) return undefined;
  return lines.reduce((sum, line) => sum + Number(line.shortageQty || 0), 0);
}

export function normalizeTransferInNoticeRow(row) {
  const lines = refreshTransferInNoticeLines(row.lines || []);
  return {
    ...row,
    lines,
    totalQuantity: sumTransferInNoticeQty(lines),
    totalActualQty: sumTransferInNoticeActualQty(lines),
    totalShortageQty: sumTransferInNoticeShortageQty(lines),
    confirmBy: row.confirmBy || '',
    confirmAt: row.confirmAt || '',
    confirmContent: row.confirmContent || '',
    manualConfirmLogs: row.manualConfirmLogs || [],
    updatedAt: row.updatedAt || nowStamp(),
    updater: row.updater || '系统',
  };
}

// —— 读写 ——

export function loadAllTransferInNotices() {
  return readMockRows(TRANSFER_IN_NOTICE_STORAGE_KEY, transferInNoticeSeedRows);
}

export function loadTransferInNoticeById(id) {
  if (!id) return null;
  return loadAllTransferInNotices().find((row) => row.id === id) || null;
}

export function loadTransferInNoticeByNo(noticeNo) {
  if (!noticeNo) return null;
  return loadAllTransferInNotices().find((row) => row.noticeNo === noticeNo) || null;
}

export function loadTransferInNoticesByOrderId(orderId, orderNo) {
  return loadAllTransferInNotices()
    .filter((row) => row.sourceOrderId === orderId || (orderNo && row.sourceOrderNo === orderNo))
    .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
}

export function persistTransferInNotice(row) {
  const next = normalizeTransferInNoticeRow(row);
  upsertMockRow(TRANSFER_IN_NOTICE_STORAGE_KEY, next);
  return next;
}

export function removeTransferInNotice(id) {
  writeMockRows(
    TRANSFER_IN_NOTICE_STORAGE_KEY,
    loadAllTransferInNotices().filter((row) => row.id !== id),
  );
}

// —— 状态判定（主PRD §6.4；不满足条件的按钮直接隐藏）——

export function canRetryPush(row) {
  return row?.status === 'push_failed';
}

/** 本期不提供「申请取消」入口：货已实际发出，取消会让在途失去归属（§6.4 说明、Q02）。 */
export function canCancelNotice() {
  return false;
}

export function canMockReceive(row) {
  return row?.status === 'pending_receive';
}

/**
 * 人工确认（F08／R08）：只适用于已交给仓库的通知——推送中（发送结果不确定）、待收货；
 * 待推送先推送、推送失败先重试，不能用人工确认代替（主PRD §6.4）。
 * 本期无取消入口，不涉及取消结果确认；详情页入口，列表行不提供。
 */
export function canManualConfirm(row) {
  return row?.status === 'pushing' || row?.status === 'pending_receive';
}

/** 人工确认类型文案（弹窗与Mock §5；类型与填写内容随操作日志保留）。 */
export const manualConfirmTypeLabels = {
  accept: '确认接单',
  finish: '确认执行结束',
};

/** 确认类型按当前状态给出可选项：推送中—确认接单；待收货—确认执行结束。 */
export function resolveManualConfirmType(row) {
  if (row?.status === 'pushing') return 'accept';
  if (row?.status === 'pending_receive') return 'finish';
  return '';
}

export function buildManualConfirmStatusMessage(row) {
  const label = transferInNoticeStatusLabels[row?.status] || row?.status || '-';
  return `当前单据状态为${label}，不可执行人工确认`;
}

// —— 生成与自动推送 ——

/**
 * 调出端直接调拨单生成后，按实际调出量自动生成调入通知单并推送接收仓（R01、R02）。
 * 一张主单最多一张调入通知单；零调出不生成。
 */
export function generateTransferInNoticeFromDirectTransfer(outTransfer) {
  if (!outTransfer || outTransfer.sourceType !== 'step_out' || outTransfer.auditStatus !== 'approved') return null;
  const order = loadTransferOrderById(outTransfer.sourceOrderId);
  if (!order) return null;
  const existing = loadTransferInNoticesByOrderId(order.id, order.orderNo)[0];
  if (existing) return existing;

  const stamp = nowStamp();
  const lines = (outTransfer.lines || [])
    .filter((line) => Number(line.quantity || 0) > 0)
    .map((line, index) => enrichTransferInNoticeLine({
      id: `${outTransfer.transferNo}-in-notice-line-${index + 1}`,
      lineNo: index + 1,
      sourceOrderLineId: line.sourceOrderLineId,
      sourceOrderLineNo: line.sourceOrderLineNo || index + 1,
      sourceTransferLine: `${order.orderNo} 行${line.sourceOrderLineNo || index + 1}`,
      product: line.product,
      productCode: line.productCode,
      productName: line.productName,
      unit: line.unit,
      quantity: Number(line.quantity || 0),
      actualQty: null,
    }, index));

  const notice = persistTransferInNotice({
    id: `transfer-in-notice-${Date.now()}`,
    noticeNo: nextDocumentNo('DRTZ', stamp.slice(0, 10), loadAllTransferInNotices().map((row) => row.noticeNo)),
    sourceOrderId: order.id,
    sourceOrderNo: order.orderNo,
    sourceOutDirectTransferId: outTransfer.id,
    sourceOutDirectTransferNo: outTransfer.transferNo,
    inWarehouse: order.inWarehouse,
    status: 'pending_push',
    pushTime: '',
    finalReceiveTime: '',
    pushFailReason: '',
    zeroReceiveRejectedAt: '',
    creator: '系统',
    createdAt: stamp,
    updater: '系统',
    updatedAt: stamp,
    lines,
  });

  simulateAutoPushInNotice(notice.id);
  return notice;
}

/** 生成后系统自动推送接收仓；明确失败后自动重试最多3次（Demo 只演示一次结果）。 */
export function simulateAutoPushInNotice(noticeId, { forceFail = false } = {}) {
  const notice = loadTransferInNoticeById(noticeId);
  if (!notice || notice.status !== 'pending_push') return notice;

  const shouldFail = forceFail || notice.demoPushFail;
  const pushing = persistTransferInNotice({ ...notice, status: 'pushing' });

  window.setTimeout(() => {
    const current = loadTransferInNoticeById(noticeId);
    if (!current || current.status !== 'pushing') return;
    if (shouldFail) {
      persistTransferInNotice({
        ...current,
        status: 'push_failed',
        pushFailReason: current.pushFailReason || '仓库接口超时，未确认接收',
      });
      return;
    }
    persistTransferInNotice({
      ...current,
      status: 'pending_receive',
      pushTime: nowStamp(),
      pushFailReason: '',
    });
  }, 600);

  return pushing;
}

/** 人工重试推送：不重新生成、不重复回写；推送失败原因保留历史（F05）。 */
export function applyRetryPushInNotice(row) {
  const next = persistTransferInNotice({ ...row, status: 'pushing' });
  window.setTimeout(() => {
    const current = loadTransferInNoticeById(row.id);
    if (!current || current.status !== 'pushing') return;
    persistTransferInNotice({
      ...current,
      status: 'pending_receive',
      pushTime: nowStamp(),
      pushFailReason: current.pushFailReason,
    });
  }, 600);
  return next;
}

// —— 人工确认（F08／R08；详情页入口，弹窗与Mock §5） ——

function buildManualConfirmLogEntry({ time, operator, remark }) {
  return { id: `manual-confirm-${time}`, time, operator, action: '人工确认', remark };
}

/** 录入数量按整数解析；空值按 0 处理，由调用方按 1～通知数量校验。 */
function parseConfirmActual(raw) {
  const text = String(raw ?? '').trim();
  if (text === '') return 0;
  const value = Number(text);
  return Number.isFinite(value) && Number.isInteger(value) ? value : NaN;
}

/**
 * 人工确认执行结束形成的调入端直接调拨单：按正式口径走草稿→待审核（R08、AC15）。
 * 原型按「待审核 + 演示数据」落库：不直接记账；审核通过后才在途减、接收仓加，
 * 回写主单并自动完结（原型不提供该结果单的审核入口，故演示不触发主单完结）。
 */
function createManualConfirmInTransfer(notice, lines, actuals, { operator, time }) {
  const existing = loadDirectTransfersByNoticeId(notice.id, notice.noticeNo)
    .find((item) => item.sourceType === 'step_in');
  if (existing) return existing;

  const activeLines = lines
    .map((line, index) => ({ line, index, actualQty: actuals[index] }))
    .filter((item) => item.actualQty > 0);
  if (!activeLines.length) return null;

  const stamp = String(time);
  return persistDirectTransfer({
    id: `direct-transfer-in-${notice.id}`,
    transferNo: generateDirectTransferNo(stamp.slice(0, 10)),
    sourceType: 'step_in',
    sourceOrderId: notice.sourceOrderId,
    sourceOrderNo: notice.sourceOrderNo,
    sourceNoticeId: notice.id,
    sourceNoticeNo: notice.noticeNo,
    sourceSystem: '',
    sourceNo: '',
    fromWarehouse: TRANSIT_WAREHOUSE_CODE,
    toWarehouse: notice.inWarehouse,
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
      id: `${notice.id}-in-line-${index + 1}`,
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
 * 人工确认（R08）：确认接单／确认执行结束。
 * - 确认接单：推送中→待收货，不生成结果单；
 * - 确认执行结束：回写实际调入与少收，并形成调入端直接调拨单（草稿→待审核；原型按待审核落库并标注演示数据）；
 * - 实际调入必须大于0，零调入属异常、不通过人工确认收口。
 * 记录人工确认人／时间／内容；不能无来源建通知单。
 */
export function applyManualConfirmInNotice(row, payload = {}) {
  const notice = loadTransferInNoticeById(row?.id) || row;
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
    return persistTransferInNotice({
      ...notice,
      status: 'pending_receive',
      confirmBy: operator,
      confirmAt: stamp,
      confirmContent: content,
      manualConfirmLogs: appendLog(content),
      updater: operator,
      updatedAt: stamp,
    });
  }

  if (confirmType === 'finish') {
    const lines = refreshTransferInNoticeLines(notice.lines || []);
    const actuals = lines.map((line, index) => {
      const quantity = Number(line.quantity || 0);
      const actualQty = parseConfirmActual(payload.lineActuals?.[index]);
      if (!Number.isInteger(actualQty)) throw new Error(`第${index + 1}行实际调入数量须为整数`);
      if (actualQty <= 0) {
        throw new Error('实际调入必须大于0，零调入异常不通过人工确认收口；请改为大于0后重新确认');
      }
      if (actualQty > quantity) {
        throw new Error(`第${index + 1}行实际调入数量超过通知调入数量（通知 ${quantity}），本次确认被拒绝`);
      }
      return actualQty;
    });

    const inTransfer = createManualConfirmInTransfer(notice, lines, actuals, { operator, time: stamp });
    const receivedLines = lines.map((line, index) => ({ ...line, actualQty: actuals[index] }));
    const content = `确认执行结束：实际调入 ${actuals.join('、')}（通知 ${lines.map((line) => Number(line.quantity || 0)).join('、')}）`;
    const receivedNotice = persistTransferInNotice({
      ...notice,
      status: 'received',
      finalReceiveTime: stamp,
      zeroReceiveRejectedAt: '',
      lines: receivedLines,
      confirmBy: operator,
      confirmAt: stamp,
      confirmContent: content,
      manualConfirmLogs: appendLog(`${content}，已形成演示用调入端直接调拨单 ${inTransfer?.transferNo || ''}（待审核）`),
      updater: operator,
      updatedAt: stamp,
    });
    return loadTransferInNoticeById(receivedNotice.id) || receivedNotice;
  }

  throw new Error(buildManualConfirmStatusMessage(notice));
}

// —— Demo Mock：模拟接收仓回传（F07）——

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
 * 模拟接收仓回传实际调入（Demo）：
 * 实收>0 生成调入端直接调拨单并回写主单（含自动完结）；少收差额留在途；
 * 实收=0 拒绝整次回传、通知单保持待收货；超量整次拒绝；
 * 记账校验不通过时保持待收货、本次回传不成立（记账先行）。
 */
export function applyMockReceiveInNotice(row, actualTotal) {
  const notice = loadTransferInNoticeById(row?.id) || row;
  if (!notice) throw new Error('调入通知单不存在或已被删除');
  if (notice.status !== 'pending_receive') throw new Error('操作失败，单据状态已变更，请刷新后重试');

  const total = Number(actualTotal);
  if (!Number.isInteger(total) || total < 0) throw new Error('实际调入必须大于0，回传已被拒绝，请改为大于0后重新回传');

  if (total === 0) {
    const rejected = persistTransferInNotice({
      ...notice,
      zeroReceiveRejectedAt: nowStamp(),
      updater: '系统',
      updatedAt: nowStamp(),
    });
    return { status: 'zero_rejected', row: rejected };
  }

  const plannedTotal = sumTransferInNoticeQty(notice.lines);
  if (total > plannedTotal) throw new Error('回传数量超过通知数量，已整次拒绝');

  const actuals = distributeNoticeActualQty(notice.lines, total);
  const receivedLines = refreshTransferInNoticeLines(
    (notice.lines || []).map((line, index) => ({ ...line, actualQty: actuals[index] })),
  );

  // 记账先行：调入端记账校验不通过时通知单保持待收货，本次回传不成立、不消耗唯一一次回传
  const stamp = nowStamp();
  const inTransfer = generateDirectTransferFromInNotice({
    ...notice,
    lines: receivedLines,
    finalReceiveTime: stamp,
  });

  const receivedNotice = persistTransferInNotice({
    ...notice,
    status: 'received',
    finalReceiveTime: stamp,
    zeroReceiveRejectedAt: '',
    lines: receivedLines,
    updater: '系统',
    updatedAt: stamp,
  });
  applyTransferInWriteBack(notice.sourceOrderId, receivedLines, { time: stamp });

  return {
    status: 'received',
    row: loadTransferInNoticeById(receivedNotice.id) || receivedNotice,
    directTransfer: inTransfer,
    order: loadTransferOrderById(notice.sourceOrderId),
  };
}

// —— 种子构造（链路进度按主单组织，见 `data/transferOrderData.js`）——

export function buildTransferInNoticeSeed(orderRow, outNoticeRow, plan = {}) {
  const lines = (outNoticeRow?.lines || [])
    .filter((line) => Number(line.actualQty || 0) > 0)
    .map((line, index) => enrichTransferInNoticeLine({
      id: `${outNoticeRow.noticeNo}-in-notice-line-${index + 1}`,
      lineNo: index + 1,
      sourceOrderLineId: line.sourceOrderLineId,
      sourceOrderLineNo: line.sourceOrderLineNo || line.lineNo,
      sourceTransferLine: `${orderRow.orderNo} 行${line.sourceOrderLineNo || line.lineNo}`,
      product: line.product,
      productCode: line.productCode,
      productName: line.productName,
      unit: line.unit,
      quantity: Number(line.actualQty || 0),
      actualQty: line.sourceOrderLineNo
        ? (orderRow.lines.find((item) => Number(item.lineNo) === Number(line.sourceOrderLineNo))?.actualInQty)
        : undefined,
    }, index));

  return normalizeTransferInNoticeRow({
    id: plan.id || `transfer-in-notice-seed-${orderRow.orderNo}`,
    noticeNo: plan.noticeNo,
    sourceOrderId: orderRow.id,
    sourceOrderNo: orderRow.orderNo,
    sourceOutDirectTransferId: plan.sourceOutDirectTransferId || '',
    // 来源调出端直接调拨单在生成时写入；种子按主单链路进度取同一编号
    sourceOutDirectTransferNo: plan.sourceOutDirectTransferNo || orderRow.progress?.outTransfer?.transferNo || '',
    inWarehouse: orderRow.inWarehouse,
    status: plan.status || 'pending_push',
    pushTime: plan.pushTime || '',
    finalReceiveTime: plan.finalReceiveTime || '',
    pushFailReason: plan.pushFailReason || '',
    zeroReceiveRejectedAt: plan.zeroReceiveRejectedAt || '',
    creator: '系统',
    createdAt: plan.createdAt || outNoticeRow?.finalShipTime || outNoticeRow?.createdAt || orderRow.createdAt,
    updater: '系统',
    updatedAt: plan.updatedAt || plan.createdAt || outNoticeRow?.finalShipTime || orderRow.createdAt,
    lines,
  });
}

// —— 操作日志 ——

export function buildTransferInNoticeOperationLogs(row) {
  const entries = [];
  const manualConfirmLogs = Array.isArray(row.manualConfirmLogs) ? row.manualConfirmLogs : [];
  const confirmedFinish = manualConfirmLogs.some((log) => String(log.remark || '').startsWith('确认执行结束'));
  pushTransferLogEntry(entries, {
    time: row.createdAt,
    operator: '系统',
    action: '生成',
    remark: '调出端直接调拨单生成后，按实际调出量自动生成调入通知单',
  });
  if (row.pushTime) {
    pushTransferLogEntry(entries, {
      time: row.pushTime,
      operator: '系统',
      action: '推送仓库',
      remark: row.pushFailReason ? `推送失败：${row.pushFailReason}` : '推送接收仓成功',
    });
  }
  if (row.zeroReceiveRejectedAt) {
    pushTransferLogEntry(entries, {
      time: row.zeroReceiveRejectedAt,
      operator: '系统',
      action: '零调入拒绝',
      remark: '实际调入为0，整次回传被拒绝，通知单保持待收货',
    });
  }
  if (row.finalReceiveTime && !confirmedFinish) {
    pushTransferLogEntry(entries, {
      time: row.finalReceiveTime,
      operator: '系统',
      action: '收货完成',
      remark: '仓库回传实际接收结果',
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
