import { skuOptions } from '../data/masterData.js';
import { salesOutbounds } from '../data/salesOutboundData.js';
import { nextDocumentNo } from './documentNo.js';
import { computeLinesTotals, EMPTY_PLACEHOLDER } from './format.js';
import { emptyFieldMessage } from './formValidation.js';
import { readMockRows, upsertMockRow, writeMockRows } from './mockStorage.js';
import { loadAllOutbounds } from './salesOutboundLogic.js';
import { hasNegativePrice } from './validation.js';

export const SALES_RETURN_STORAGE_KEY = 'qs-erp:sales-returns:v1';
export const RETURN_NOTICE_STORAGE_KEY = 'qs-erp:sales-return-notices:v1';
export const RETURN_INBOUND_STORAGE_KEY = 'qs-erp:sales-return-inbounds:v1';

/** 未结束、仍占用退货单可下推量的通知状态（R10、R14、R17） */
const BLOCKING_NOTICE_STATUSES = new Set(['pushing', 'pending_receive', 'cancelling']);
/** 随退货单取消的通知状态（R17：待推送、推送失败随单取消） */
const CANCELLABLE_NOTICE_STATUSES = new Set(['pending_push', 'push_failed']);

export function nowStamp() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export function computePushableQty(line) {
  return Math.max(
    0,
    Number(line.quantity || 0) - Number(line.returnedQty || 0) - Number(line.inTransitQty || 0),
  );
}

export function enrichSalesReturnLine(line) {
  const sku = skuOptions.find((item) => item.value === line.product);
  const quantity = Number(line.quantity || 0);
  const returnedQty = Number(line.returnedQty || 0);
  const inTransitQty = Number(line.inTransitQty || 0);
  return {
    ...line,
    productCode: line.productCode || sku?.skuCode || '',
    barcode: line.barcode || sku?.barcode || '',
    productName: line.productName || sku?.productName || '',
    unit: line.unit || sku?.unit || '个',
    quantity,
    // 草稿允许单价留空：空值保持空字符串，不能折算成 0（0 属于零价，走零价确认）
    price: line.price === '' || line.price == null ? line.price : Number(line.price),
    taxRate: line.taxRate ?? '',
    returnedQty,
    inTransitQty,
    pushableQty: computePushableQty({ quantity, returnedQty, inTransitQty }),
  };
}

export function refreshSalesReturnLines(lines = []) {
  return lines.map(enrichSalesReturnLine);
}

export function sumSalesReturnLineQty(lines = [], field) {
  return (lines || []).reduce((sum, line) => sum + Number(line[field] || 0), 0);
}

export function normalizeSalesReturnRow(row) {
  const lines = refreshSalesReturnLines(row.lines || []);
  const totals = computeLinesTotals(lines);
  return {
    ...row,
    returnDeadline: String(row.returnDeadline || '').slice(0, 10),
    lines,
    amount: totals.grossAmount,
    taxAmount: totals.taxAmount,
    netAmount: totals.netAmount,
    totalReturnQty: totals.quantity,
    returnedQtyTotal: sumSalesReturnLineQty(lines, 'returnedQty'),
    inTransitQtyTotal: sumSalesReturnLineQty(lines, 'inTransitQty'),
    pushableQtyTotal: sumSalesReturnLineQty(lines, 'pushableQty'),
    createdAt: row.createdAt || nowStamp(),
    updatedAt: row.updatedAt || nowStamp(),
    updater: row.updater || '当前用户',
  };
}

export function persistSalesReturn(row) {
  const next = normalizeSalesReturnRow(row);
  upsertMockRow(SALES_RETURN_STORAGE_KEY, next);
  return next;
}

export function loadAllSalesReturns(seed = []) {
  return readMockRows(SALES_RETURN_STORAGE_KEY, seed);
}

export function loadSalesReturnById(id) {
  return loadAllSalesReturns([]).find((item) => item.id === id) || null;
}

export function deleteSalesReturnById(id) {
  const rows = loadAllSalesReturns([]).filter((item) => item.id !== id);
  writeMockRows(SALES_RETURN_STORAGE_KEY, rows);
  return rows;
}

function loadOutboundRows() {
  // 出库单种子在 salesOutboundData 内，作为 localStorage 未写入前的兜底
  return loadAllOutbounds(salesOutbounds);
}

/**
 * 溯源可退额度占用（R06、R09、R15、R17）：
 * 按「原出库单行」汇总其他已审核退货的「累计实退 + 在途通知」。
 * 草稿、待审核不占额度；已关闭/已取消释放的部分不再计入，因此不会重复占用。
 */
export function computeSourceOutboundOccupancy(rows = []) {
  const map = new Map();
  rows.forEach((row) => {
    if (row.auditStatus !== 'approved') return;
    (row.lines || []).forEach((line) => {
      if (!row.sourceOutboundId || !line.sourceOutboundLineId) return;
      const key = `${row.sourceOutboundId}::${line.sourceOutboundLineId}`;
      const occupied = Number(line.returnedQty || 0) + Number(line.inTransitQty || 0);
      map.set(key, (map.get(key) || 0) + occupied);
    });
  });
  return map;
}

/** 溯源选单候选：已审核销售出库单 + 每行剩余可退额度（= 原实际出库数量 − 其他退货已占用） */
export function buildSourceOutboundCandidates(fallbackReturnRows = []) {
  const rows = loadAllSalesReturns(fallbackReturnRows);
  const occupancy = computeSourceOutboundOccupancy(rows);
  return loadOutboundRows()
    .filter((outbound) => outbound.auditStatus === 'approved')
    .map((outbound) => ({
      ...outbound,
      lines: (outbound.lines || []).map((line) => ({
        ...line,
        remainingQuota: Math.max(
          0,
          Number(line.quantity || 0) - (occupancy.get(`${outbound.id}::${line.id}`) || 0),
        ),
      })),
    }));
}

function findOutboundLine(sourceOutboundId, line) {
  const outbound = loadOutboundRows().find((item) => item.id === sourceOutboundId);
  if (!outbound) return null;
  return (outbound.lines || []).find((item) => item.id === line.sourceOutboundLineId || item.product === line.product) || null;
}

/** 溯源行剩余可退额度（复核用，扣除其他退货已占用） */
export function computeLineRemainingQuota(line, sourceOutboundId, excludeReturnId) {
  if (!sourceOutboundId || !line.sourceOutboundLineId) return null;
  const outboundLine = findOutboundLine(sourceOutboundId, line);
  if (!outboundLine) return null;
  const occupancy = computeSourceOutboundOccupancy(
    loadAllSalesReturns([]).filter((row) => row.id !== excludeReturnId),
  );
  const occupied = occupancy.get(`${sourceOutboundId}::${outboundLine.id}`) || 0;
  return Math.max(0, Number(outboundLine.quantity || 0) - occupied);
}

/** 退货截止日期按天粒度展示，兼容历史带时间的存量数据 */
export function formatDeadlineDate(value) {
  const text = String(value || '').slice(0, 10);
  return text || EMPTY_PLACEHOLDER;
}

export function canEditSalesReturn(row) {
  return row?.auditStatus === 'draft' && row?.businessStatus === 'normal';
}

export function canSubmitSalesReturn(row) {
  return canEditSalesReturn(row);
}

export function canApproveSalesReturn(row) {
  return row?.auditStatus === 'pending' && row?.businessStatus === 'normal';
}

export function canWithdrawSalesReturn(row) {
  return canApproveSalesReturn(row);
}

export function canCancelPendingSalesReturn(row) {
  return canApproveSalesReturn(row);
}

export function isSalesReturnFullyCompleted(row) {
  const lines = row?.lines || [];
  if (!lines.length) return false;
  return lines.every((line) => Number(line.returnedQty || 0) >= Number(line.quantity || 0));
}

export function canCancelApprovedSalesReturn(row, fallbackNotices = []) {
  if (row?.auditStatus !== 'approved' || row?.businessStatus !== 'normal') return false;
  if (isSalesReturnFullyCompleted(row)) return false;
  if (sumSalesReturnLineQty(row.lines, 'returnedQty') > 0) return false;
  if (hasBlockingSalesReturnNotices(row.id, fallbackNotices)) return false;
  return true;
}

export function canCloseSalesReturn(row) {
  return row?.auditStatus === 'approved'
    && row?.businessStatus === 'normal'
    && !isSalesReturnFullyCompleted(row);
}

export function canAdjustReturnDeadline(row) {
  return canCloseSalesReturn(row);
}

export function canDeleteDraftSalesReturn(row, fallbackNotices = []) {
  return canEditSalesReturn(row) && loadSalesReturnNotices(row.id, fallbackNotices).length === 0;
}

export function canPushReturnNotice(row) {
  return row?.auditStatus === 'approved'
    && row?.businessStatus === 'normal'
    && !isSalesReturnFullyCompleted(row)
    && sumSalesReturnLineQty(row.lines, 'pushableQty') > 0;
}

/** 已审核取消前的阻断原因（R17）：先看已有实收，再看执行中通知 */
export function getSalesReturnCancelBlockReason(row, fallbackNotices = []) {
  if (row?.businessStatus !== 'normal') return '当前单据状态不可取消';
  if (row?.auditStatus === 'approved') {
    if (isSalesReturnFullyCompleted(row)) return '本单已全部退足，不能取消';
    if (sumSalesReturnLineQty(row.lines, 'returnedQty') > 0) {
      return '退货单已有实际收货记录，无法取消整单，请使用关闭余量';
    }
    if (hasBlockingSalesReturnNotices(row.id, fallbackNotices)) return '存在执行中的收货通知，请先处理后再取消';
  }
  return null;
}

export function findZeroPriceLines(form) {
  return (form.lines || [])
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => Number(line.price) === 0);
}

export function validateSalesReturnForSave(form) {
  const fieldErrors = {};
  if (!form.customer) fieldErrors.customer = emptyFieldMessage('客户');
  if (!form.currency) fieldErrors.currency = emptyFieldMessage('币别');
  if (!form.warehouse) fieldErrors.warehouse = emptyFieldMessage('收货仓库');
  if (!form.returnDeadline) fieldErrors.returnDeadline = emptyFieldMessage('退货截止日期');
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  if (!form.lines?.length) return { message: '请至少添加一行有效商品明细' };
  for (let index = 0; index < form.lines.length; index += 1) {
    const line = form.lines[index];
    if (!line.product) return { message: `第${index + 1}行请选择商品` };
    if (!Number.isInteger(Number(line.quantity)) || Number(line.quantity) <= 0) {
      return { message: `第${index + 1}行退货数量必须大于 0` };
    }
  }
  if (hasNegativePrice(form.lines)) return { message: '含税单价不能为负数' };
  return null;
}

export function validateSalesReturnForSubmit(form, { excludeReturnId } = {}) {
  const saveResult = validateSalesReturnForSave(form);
  if (saveResult) return saveResult;

  for (let index = 0; index < form.lines.length; index += 1) {
    const line = form.lines[index];
    if (line.price === '' || line.price == null) return { message: `第${index + 1}行含税单价不能为空` };
    if (line.taxRate === '' || line.taxRate == null) return { message: `第${index + 1}行税率不能为空` };
  }

  if (form.sourceOutboundId) {
    for (let index = 0; index < form.lines.length; index += 1) {
      const line = form.lines[index];
      const remaining = computeLineRemainingQuota(line, form.sourceOutboundId, excludeReturnId);
      if (remaining != null && Number(line.quantity) > remaining) {
        return { message: `第${index + 1}行退货数量不能超过该行剩余可退额度` };
      }
    }
  }
  return null;
}

export function applySubmitSalesReturn(row) {
  const stamp = nowStamp();
  return persistSalesReturn({
    ...row,
    auditStatus: 'pending',
    submittedAt: stamp,
    submitter: '当前用户',
    updatedAt: stamp,
    updater: '当前用户',
  });
}

export function applyApproveSalesReturn(row) {
  if (row.sourceOutboundId) {
    for (const line of row.lines || []) {
      const remaining = computeLineRemainingQuota(line, row.sourceOutboundId, row.id);
      if (remaining != null && Number(line.quantity || 0) > remaining) {
        return { error: '溯源退货超出原出库单可退额度，审核失败' };
      }
    }
  }
  return {
    row: persistSalesReturn({
      ...row,
      auditStatus: 'approved',
      auditor: '当前用户',
      auditTime: nowStamp(),
      updatedAt: nowStamp(),
      updater: '当前用户',
    }),
  };
}

export function applyWithdrawSalesReturn(row, returnComment) {
  const stamp = nowStamp();
  return persistSalesReturn({
    ...row,
    auditStatus: 'draft',
    returnComment,
    returnedAt: stamp,
    returnOperator: '当前用户',
    updatedAt: stamp,
    updater: '当前用户',
  });
}

export function applyCloseSalesReturn(row, closeReason) {
  const stamp = nowStamp();
  return persistSalesReturn({
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

export function applyCancelSalesReturn(row, cancelReason, fallbackNotices = []) {
  cancelSalesReturnNoticesWithReturn(row.id, cancelReason, fallbackNotices);
  // 随单取消已释放占用，取回最新行再落业务状态，避免用旧占用覆盖
  const latest = loadSalesReturnById(row.id) || row;
  const stamp = nowStamp();
  return persistSalesReturn({
    ...latest,
    businessStatus: 'cancelled',
    cancelReason,
    cancelTime: stamp,
    cancelOperator: '当前用户',
    updatedAt: stamp,
    updater: '当前用户',
  });
}

export function applyAdjustReturnDeadline(row, returnDeadline) {
  const stamp = nowStamp();
  return persistSalesReturn({
    ...row,
    returnDeadline,
    returnDeadlineAdjustedAt: stamp,
    returnDeadlineAdjustedBy: '当前用户',
    updatedAt: stamp,
    updater: '当前用户',
  });
}

export function loadSalesReturnNotices(returnId, fallbackNotices = []) {
  if (!returnId) return [];
  return readMockRows(RETURN_NOTICE_STORAGE_KEY, fallbackNotices)
    .filter((notice) => notice.sourceReturnId === returnId)
    .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')));
}

export function hasBlockingSalesReturnNotices(returnId, fallbackNotices = []) {
  return loadSalesReturnNotices(returnId, fallbackNotices)
    .some((notice) => BLOCKING_NOTICE_STATUSES.has(notice.status));
}

/** 同一退货单行可能被多张通知占用：按来源行累加通知量 */
function sumNoticeQtyByReturnLine(noticeLines = []) {
  const map = new Map();
  noticeLines.forEach((line) => {
    const key = line.sourceReturnLineId || line.id;
    map.set(key, (map.get(key) || 0) + Number(line.notifyQty || 0));
  });
  return map;
}

/** 通知创建即占用退货单可下推量（R04、R14） */
export function occupyReturnLines(returnRow, noticeLines) {
  const occupancyMap = sumNoticeQtyByReturnLine(noticeLines);
  const nextLines = (returnRow.lines || []).map((line) => {
    const occupy = occupancyMap.get(line.id);
    if (!occupy) return line;
    const enriched = enrichSalesReturnLine(line);
    return { ...enriched, inTransitQty: Number(enriched.inTransitQty || 0) + occupy };
  });
  return persistSalesReturn({ ...returnRow, lines: nextLines });
}

/** 通知取消成功后释放对应在途占用（R09、R10） */
export function releaseReturnOccupancy(returnRow, noticeLines) {
  const releaseMap = sumNoticeQtyByReturnLine(noticeLines);
  const nextLines = (returnRow.lines || []).map((line) => {
    const release = releaseMap.get(line.id);
    if (!release) return line;
    const enriched = enrichSalesReturnLine(line);
    return { ...enriched, inTransitQty: Math.max(0, Number(enriched.inTransitQty || 0) - release) };
  });
  return persistSalesReturn({ ...returnRow, lines: nextLines });
}

/** 收货完成回写：实收计入累计实退、通知占用释放、缺量回补可下推量（R10、R11） */
export function substituteReturnOccupancy(returnRow, noticeLines) {
  const notifyMap = sumNoticeQtyByReturnLine(noticeLines);
  const receivedMap = new Map();
  (noticeLines || []).forEach((line) => {
    const key = line.sourceReturnLineId || line.id;
    receivedMap.set(key, (receivedMap.get(key) || 0) + Number(line.receivedQty || 0));
  });
  const nextLines = (returnRow.lines || []).map((line) => {
    const notifyQty = notifyMap.get(line.id);
    if (notifyQty == null) return line;
    const enriched = enrichSalesReturnLine(line);
    return {
      ...enriched,
      returnedQty: Number(enriched.returnedQty || 0) + (receivedMap.get(line.id) || 0),
      inTransitQty: Math.max(0, Number(enriched.inTransitQty || 0) - notifyQty),
    };
  });
  return persistSalesReturn({ ...returnRow, lines: nextLines });
}

/** 通知单汇总口径（与 salesReturnNoticeLogic 保持一致，避免模块循环依赖） */
function withNoticeTotals(notice) {
  const lines = (notice.lines || []).map((line) => ({
    ...line,
    shortQty: Math.max(0, Number(line.notifyQty || 0) - Number(line.receivedQty || 0)),
  }));
  return {
    ...notice,
    lines,
    totalNotifyQty: lines.reduce((sum, line) => sum + Number(line.notifyQty || 0), 0),
    totalReceivedQty: lines.reduce((sum, line) => sum + Number(line.receivedQty || 0), 0),
    totalShortQty: lines.reduce((sum, line) => sum + Number(line.shortQty || 0), 0),
  };
}

/** Demo Mock（F07）：按当前可下推量生成一条销退收货通知单，并占用退货单在途数量 */
export function createMockSalesReturnNotice(returnRow) {
  const lines = refreshSalesReturnLines(returnRow.lines || [])
    .filter((line) => Number(line.pushableQty || 0) > 0)
    .map((line) => ({
      id: `${line.id}-notice-${Date.now()}`,
      sourceReturnLineId: line.id,
      product: line.product,
      productCode: line.productCode,
      barcode: line.barcode,
      productName: line.productName,
      unit: line.unit,
      pushableQty: line.pushableQty,
      notifyQty: line.pushableQty,
      receivedQty: 0,
      shortQty: 0,
    }));
  if (!lines.length) return returnRow;

  const existingNos = readMockRows(RETURN_NOTICE_STORAGE_KEY, []).map((row) => row.noticeNo);
  const stamp = nowStamp();
  const noticeNo = nextDocumentNo('XTSHTZ', stamp.slice(0, 10), existingNos);
  const notice = {
    id: `sales-return-notice-${Date.now()}`,
    noticeNo,
    sourceReturnId: returnRow.id,
    sourceReturnNo: returnRow.returnNo,
    customer: returnRow.customer,
    warehouse: returnRow.warehouse,
    receiveMode: 'warehouse',
    status: 'pending_push',
    remark: '',
    pushTime: '',
    finalReceiveTime: '',
    pushFailReason: '',
    lastHandledTime: stamp,
    creator: '当前用户',
    createdAt: stamp,
    updater: '当前用户',
    updatedAt: stamp,
    lines,
  };
  upsertMockRow(RETURN_NOTICE_STORAGE_KEY, withNoticeTotals(notice));
  occupyReturnLines(loadSalesReturnById(returnRow.id) || returnRow, lines);
  return loadSalesReturnById(returnRow.id) || returnRow;
}

/** 退货单取消时，待推送、推送失败的通知随单取消并释放占用（R17） */
export function cancelSalesReturnNoticesWithReturn(returnId, reason, fallbackNotices = []) {
  const notices = loadSalesReturnNotices(returnId, fallbackNotices)
    .filter((notice) => CANCELLABLE_NOTICE_STATUSES.has(notice.status));
  if (!notices.length) return [];
  const stamp = nowStamp();
  notices.forEach((notice) => {
    upsertMockRow(RETURN_NOTICE_STORAGE_KEY, {
      ...notice,
      status: 'cancelled',
      cancelReason: reason,
      cancelTime: stamp,
      cancelOperator: '当前用户',
      lastHandledTime: stamp,
      updatedAt: stamp,
      updater: '当前用户',
    });
  });
  const returnRow = loadSalesReturnById(returnId);
  if (returnRow) {
    releaseReturnOccupancy(returnRow, notices.flatMap((notice) => notice.lines || []));
  }
  return notices;
}

function hasValue(value) {
  return value != null && value !== '' && value !== EMPTY_PLACEHOLDER;
}

function pushLogEntry(entries, { time, operator, action, remark }) {
  if (!hasValue(time) && !hasValue(operator) && !hasValue(action)) return;
  entries.push({
    id: `${action}-${time || entries.length}`,
    time: time || EMPTY_PLACEHOLDER,
    operator: operator || EMPTY_PLACEHOLDER,
    action,
    remark: remark || EMPTY_PLACEHOLDER,
  });
}

function mergeLogEntries(...sources) {
  const map = new Map();
  sources.flat().forEach((entry) => {
    if (!entry) return;
    map.set(entry.id, entry);
  });
  return [...map.values()].sort((left, right) => String(right.time).localeCompare(String(left.time)));
}

export function buildSalesReturnOperationLogs(row) {
  const entries = [];

  pushLogEntry(entries, {
    time: row.createdAt,
    operator: row.creator,
    action: '创建',
    remark: row.sourceOutboundNo ? `关联来源销售出库单 ${row.sourceOutboundNo}` : '创建销售退货单',
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
      remark: '审核通过并占用可退额度',
    });
  }

  if (row.returnDeadlineAdjustedAt) {
    pushLogEntry(entries, {
      time: row.returnDeadlineAdjustedAt,
      operator: row.returnDeadlineAdjustedBy || row.updater,
      action: '调整退货截止日期',
      remark: row.returnDeadline ? `退货截止日期调整为 ${row.returnDeadline}` : '调整退货截止日期',
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

  return mergeLogEntries(entries, row.operationLogs || []);
}
