import { skuOptions } from '../data/masterData.js';
import { nextDocumentNo } from './documentNo.js';
import { EMPTY_PLACEHOLDER } from './format.js';
import { readMockRows, upsertMockRow, writeMockRows } from './mockStorage.js';
import { createSalesReturnInboundFromNotice } from './salesReturnInboundLogic.js';
import {
  loadSalesReturnById,
  nowStamp,
  occupyReturnLines,
  persistSalesReturn,
  refreshSalesReturnLines,
  releaseReturnOccupancy,
  RETURN_INBOUND_STORAGE_KEY,
  RETURN_NOTICE_STORAGE_KEY,
  substituteReturnOccupancy,
} from './salesReturnLogic.js';

export { RETURN_NOTICE_STORAGE_KEY, RETURN_INBOUND_STORAGE_KEY };
export { createSalesReturnInboundFromNotice };
export {
  cancelSalesReturnNoticesWithReturn,
  createMockSalesReturnNotice,
} from './salesReturnLogic.js';

export const returnNoticeStatusLabels = {
  pending_push: '待推送',
  pushing: '推送中',
  push_failed: '推送失败',
  pending_receive: '待收货',
  cancelling: '取消中',
  received: '已收货',
  cancelled: '已取消',
};

export const returnReceiveModeLabels = {
  warehouse: '仓库收货',
  virtual: '虚拟入库',
};

export function resolveReturnReceiveMode(rowOrValue) {
  const value = typeof rowOrValue === 'string' ? rowOrValue : rowOrValue?.receiveMode;
  return value === 'virtual' ? 'virtual' : 'warehouse';
}

export function formatReturnReceiveMode(rowOrValue) {
  return returnReceiveModeLabels[resolveReturnReceiveMode(rowOrValue)];
}

export function enrichSalesReturnNoticeLine(line, status = 'received') {
  const sku = skuOptions.find((item) => item.value === line.product);
  const notifyQty = Number(line.notifyQty || 0);
  const receivedQty = Number(line.receivedQty || 0);
  return {
    ...line,
    productCode: line.productCode || sku?.skuCode || '',
    barcode: line.barcode || sku?.barcode || '',
    productName: line.productName || sku?.productName || '',
    unit: line.unit || sku?.unit || '个',
    notifyQty,
    receivedQty,
    // 缺收数量只在收货完成后计算展示，未结束（含取消中、已取消）为 0
    shortQty: status === 'received' ? Math.max(0, notifyQty - receivedQty) : 0,
  };
}

export function refreshSalesReturnNoticeLines(lines = [], status = 'received') {
  return lines.map((line) => enrichSalesReturnNoticeLine(line, status));
}

export function sumSalesReturnNoticeLineQty(lines = [], field) {
  return (lines || []).reduce((sum, line) => sum + Number(line[field] || 0), 0);
}

export function normalizeSalesReturnNoticeRow(row) {
  const lines = refreshSalesReturnNoticeLines(row.lines || [], row.status);
  return {
    ...row,
    receiveMode: resolveReturnReceiveMode(row),
    lines,
    totalNotifyQty: sumSalesReturnNoticeLineQty(lines, 'notifyQty'),
    totalReceivedQty: sumSalesReturnNoticeLineQty(lines, 'receivedQty'),
    totalShortQty: sumSalesReturnNoticeLineQty(lines, 'shortQty'),
    updatedAt: row.updatedAt || nowStamp(),
    updater: row.updater || '当前用户',
  };
}

export function persistSalesReturnNotice(row) {
  const next = normalizeSalesReturnNoticeRow(row);
  upsertMockRow(RETURN_NOTICE_STORAGE_KEY, next);
  return next;
}

export function loadAllSalesReturnNotices(seed = []) {
  return readMockRows(RETURN_NOTICE_STORAGE_KEY, seed).map(normalizeSalesReturnNoticeRow);
}

export function loadSalesReturnNoticeById(id) {
  return loadAllSalesReturnNotices([]).find((item) => item.id === id) || null;
}

export function loadSalesReturnNoticesByReturnId(returnId, returnNo) {
  return loadAllSalesReturnNotices([])
    .filter((notice) => notice.sourceReturnId === returnId || (returnNo && notice.sourceReturnNo === returnNo))
    .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')));
}

export function canEditSalesReturnNoticeRemark(row) {
  return row?.status === 'pending_push' || row?.status === 'push_failed';
}

export function canCancelSalesReturnNotice(row) {
  return row?.status === 'pending_push' || row?.status === 'push_failed';
}

export function canApplyCancelSalesReturnNotice(row) {
  return row?.status === 'pending_receive';
}

export function canRetrySalesReturnPush(row) {
  return row?.status === 'push_failed';
}

export function canMockSalesReturnReceipt(row) {
  return row?.status === 'pending_receive';
}

/** 下推创建页表单：带入来源退货单单头与明细，通知数量默认=各行可下推数量（R03、Q02） */
export function buildSalesReturnNoticeFormFromReturn(returnRow) {
  const lines = refreshSalesReturnLines(returnRow.lines || [])
    .filter((line) => Number(line.pushableQty || 0) > 0)
    .map((line) => enrichSalesReturnNoticeLine({
      id: `${line.id}-notice`,
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

  return {
    noticeNo: '保存后自动生成',
    sourceReturnId: returnRow.id,
    sourceReturnNo: returnRow.returnNo,
    customer: returnRow.customer,
    warehouse: returnRow.warehouse,
    receiveMode: 'warehouse',
    status: 'pending_push',
    remark: '',
    lines,
  };
}

export function validateSalesReturnNoticeForCreate(form) {
  if (form.receiveMode !== 'warehouse' && form.receiveMode !== 'virtual') {
    return '收货处理方式不能为空';
  }
  if (!form.lines?.length) {
    return '当前销售退货单没有可下推数量';
  }
  const filled = form.lines.filter((line) => Number(line.notifyQty) > 0);
  if (!filled.length) {
    return '请至少填写一行通知数量';
  }
  for (let index = 0; index < form.lines.length; index += 1) {
    const line = form.lines[index];
    const notifyQty = Number(line.notifyQty || 0);
    if (notifyQty <= 0) continue;
    if (!Number.isInteger(notifyQty)) {
      return `第${index + 1}行通知数量须为正整数`;
    }
    if (notifyQty > Number(line.pushableQty || 0)) {
      return `第${index + 1}行通知数量不能超过可下推数量${line.pushableQty}`;
    }
  }
  return null;
}

function removeSalesReturnNoticeById(noticeId) {
  writeMockRows(
    RETURN_NOTICE_STORAGE_KEY,
    readMockRows(RETURN_NOTICE_STORAGE_KEY, []).filter((item) => item.id !== noticeId),
  );
}

/** 下推创建：仓库收货→待推送并触发自动推送；虚拟入库→创建即已收货并生成已审核销退入库单（R05、R13） */
export function createSalesReturnNoticeFromReturn(returnRow, form) {
  const error = validateSalesReturnNoticeForCreate(form);
  if (error) throw new Error(error);

  const activeLines = form.lines
    .filter((line) => Number(line.notifyQty) > 0)
    .map((line) => enrichSalesReturnNoticeLine({ ...line, receivedQty: 0, shortQty: 0 }));

  const existingNos = readMockRows(RETURN_NOTICE_STORAGE_KEY, []).map((row) => row.noticeNo);
  const noticeNo = nextDocumentNo('XTSHTZ', new Date().toISOString().slice(0, 10), existingNos);
  const receiveMode = resolveReturnReceiveMode(form);
  const stamp = nowStamp();

  if (receiveMode === 'virtual') {
    const receivedLines = activeLines.map((line) => enrichSalesReturnNoticeLine({
      ...line,
      receivedQty: Number(line.notifyQty || 0),
    }));
    const notice = persistSalesReturnNotice({
      id: `sales-return-notice-${Date.now()}`,
      noticeNo,
      sourceReturnId: returnRow.id,
      sourceReturnNo: returnRow.returnNo,
      customer: returnRow.customer,
      warehouse: returnRow.warehouse,
      receiveMode: 'virtual',
      status: 'received',
      remark: form.remark || '',
      pushTime: '',
      finalReceiveTime: stamp,
      pushFailReason: '',
      lastHandledTime: stamp,
      creator: '当前用户',
      createdAt: stamp,
      updater: '当前用户',
      updatedAt: stamp,
      lines: receivedLines,
    });

    occupyReturnLines(returnRow, receivedLines);
    substituteReturnOccupancy(loadSalesReturnById(returnRow.id) || returnRow, receivedLines);
    const inbound = createSalesReturnInboundFromNotice(loadSalesReturnNoticeById(notice.id) || notice);

    if (!inbound) {
      removeSalesReturnNoticeById(notice.id);
      persistSalesReturn(returnRow);
      throw new Error('虚拟入库生成入库单失败，未创建通知单');
    }

    return {
      notice: loadSalesReturnNoticeById(notice.id) || notice,
      returnRow: loadSalesReturnById(returnRow.id) || returnRow,
    };
  }

  const notice = persistSalesReturnNotice({
    id: `sales-return-notice-${Date.now()}`,
    noticeNo,
    sourceReturnId: returnRow.id,
    sourceReturnNo: returnRow.returnNo,
    customer: returnRow.customer,
    warehouse: returnRow.warehouse,
    receiveMode,
    status: 'pending_push',
    remark: form.remark || '',
    pushTime: '',
    finalReceiveTime: '',
    pushFailReason: '',
    lastHandledTime: stamp,
    creator: '当前用户',
    createdAt: stamp,
    updater: '当前用户',
    updatedAt: stamp,
    lines: activeLines,
  });

  occupyReturnLines(returnRow, activeLines);
  simulateSalesReturnAutoPush(notice.id);
  return {
    notice,
    returnRow: loadSalesReturnById(returnRow.id) || returnRow,
  };
}

export function updateSalesReturnNoticeRemark(row, remark) {
  return persistSalesReturnNotice({ ...row, remark, lastHandledTime: nowStamp() });
}

/** Demo Mock：创建后模拟自动推送「待推送→推送中→待收货/推送失败」 */
export function simulateSalesReturnAutoPush(noticeId, { forceFail = false } = {}) {
  const notice = loadSalesReturnNoticeById(noticeId);
  if (!notice || notice.status !== 'pending_push') return notice;

  const shouldFail = forceFail || notice.demoPushFail;
  const pushing = persistSalesReturnNotice({ ...notice, status: 'pushing', lastHandledTime: nowStamp() });

  window.setTimeout(() => {
    const current = loadSalesReturnNoticeById(noticeId);
    if (!current || current.status !== 'pushing') return;
    if (shouldFail) {
      persistSalesReturnNotice({
        ...current,
        status: 'push_failed',
        pushFailReason: current.pushFailReason || '仓库接口超时，未确认接收',
        lastHandledTime: nowStamp(),
      });
      return;
    }
    persistSalesReturnNotice({
      ...current,
      status: 'pending_receive',
      pushTime: nowStamp(),
      pushFailReason: '',
      lastHandledTime: nowStamp(),
    });
  }, 600);

  return pushing;
}

export function applyRetrySalesReturnPush(row) {
  const next = persistSalesReturnNotice({
    ...row,
    status: 'pushing',
    lastHandledTime: nowStamp(),
  });
  window.setTimeout(() => {
    const current = loadSalesReturnNoticeById(row.id);
    if (!current || current.status !== 'pushing') return;
    persistSalesReturnNotice({
      ...current,
      status: 'pending_receive',
      pushTime: nowStamp(),
      pushFailReason: current.pushFailReason,
      lastHandledTime: nowStamp(),
    });
  }, 600);
  return next;
}

/** 待推送、推送失败取消：通知作废，按退货单开放与否回补可下推量或释放可退额度（R09） */
export function applyCancelSalesReturnNotice(row, cancelReason) {
  const returnRow = loadSalesReturnById(row.sourceReturnId);
  if (returnRow) releaseReturnOccupancy(returnRow, row.lines || []);

  const stamp = nowStamp();
  return persistSalesReturnNotice({
    ...row,
    status: 'cancelled',
    cancelReason,
    cancelTime: stamp,
    cancelOperator: '当前用户',
    lastHandledTime: stamp,
  });
}

/** 待收货取消：进入取消中，等待仓库回执；期间仍占用可下推量（R10） */
export function applyApplyCancelSalesReturnNotice(row, cancelReason) {
  const stamp = nowStamp();
  return persistSalesReturnNotice({
    ...row,
    status: 'cancelling',
    cancelReason,
    lastHandledTime: stamp,
  });
}

export function applyWarehouseCancelResult(row, agreed) {
  const stamp = nowStamp();
  if (agreed) {
    const returnRow = loadSalesReturnById(row.sourceReturnId);
    if (returnRow) releaseReturnOccupancy(returnRow, row.lines || []);
    return persistSalesReturnNotice({
      ...row,
      status: 'cancelled',
      cancelTime: stamp,
      cancelOperator: '当前用户',
      lastHandledTime: stamp,
    });
  }
  return persistSalesReturnNotice({ ...row, status: 'pending_receive', lastHandledTime: stamp });
}

export function clampMockLineReceipt(value, notifyQty) {
  const max = Number(notifyQty || 0);
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.min(num, max);
}

/**
 * Demo Mock 回传（F08）：允许少收、不允许超通知量；
 * 有实收→已收货并生成销退入库单；零收→已取消且不生成入库单（R06、R07、R11）
 */
export function applyMockSalesReturnReceipt(row, payload) {
  const returnRow = loadSalesReturnById(row.sourceReturnId);
  if (!returnRow) throw new Error('来源销售退货单不存在');

  if (payload.zeroReceive) {
    const reason = row.cancelReason || '仓库零收';
    applyCancelSalesReturnNotice({ ...row, cancelReason: reason }, reason);
    return loadSalesReturnNoticeById(row.id);
  }

  const nextLines = row.lines.map((line, index) => {
    const notifyQty = Number(line.notifyQty || 0);
    const receivedQty = clampMockLineReceipt(payload.lineReceipts?.[index] ?? line.receivedQty ?? 0, notifyQty);
    return enrichSalesReturnNoticeLine({ ...line, receivedQty });
  });

  const receivedTotal = nextLines.reduce((sum, line) => sum + Number(line.receivedQty || 0), 0);
  if (receivedTotal <= 0) {
    throw new Error('请填写实收数量，或勾选零收');
  }

  const stamp = nowStamp();
  const notice = persistSalesReturnNotice({
    ...row,
    status: 'received',
    lines: nextLines,
    finalReceiveTime: stamp,
    lastHandledTime: stamp,
  });

  substituteReturnOccupancy(returnRow, nextLines);
  createSalesReturnInboundFromNotice(notice);
  return loadSalesReturnNoticeById(row.id);
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

export function buildSalesReturnNoticeOperationLogs(row) {
  const entries = [];

  pushLogEntry(entries, {
    time: row.createdAt,
    operator: row.creator,
    action: '创建',
    remark: resolveReturnReceiveMode(row) === 'virtual'
      ? '下推创建销退收货通知单（虚拟入库）'
      : '下推创建销退收货通知单',
  });

  if (row.pushTime) {
    pushLogEntry(entries, {
      time: row.pushTime,
      operator: '系统',
      action: '推送仓库',
      remark: row.pushFailReason ? `推送失败：${row.pushFailReason}` : '推送仓库成功',
    });
  }

  if (row.finalReceiveTime) {
    pushLogEntry(entries, {
      time: row.finalReceiveTime,
      operator: '系统',
      action: '收货完成',
      remark: resolveReturnReceiveMode(row) === 'virtual' ? '按通知数量确认收货' : '仓库回传收货结果',
    });
  }

  if (row.status === 'cancelling') {
    pushLogEntry(entries, {
      time: row.lastHandledTime || row.updatedAt,
      operator: row.updater,
      action: '发起取消',
      remark: row.cancelReason,
    });
  }

  if (row.status === 'cancelled') {
    pushLogEntry(entries, {
      time: row.cancelTime,
      operator: row.cancelOperator,
      action: '取消',
      remark: row.cancelReason,
    });
  }

  return mergeLogEntries(entries, row.operationLogs || []);
}
