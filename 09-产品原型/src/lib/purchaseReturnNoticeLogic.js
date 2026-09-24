import { skuOptions } from '../data/masterData.js';
import { nextDocumentNo } from './documentNo.js';
import { writeMockRows } from './mockStorage.js';
import { createReturnOutboundFromNotice } from './purchaseReturnOutboundLogic.js';
import {
  loadAllReturnNotices,
  loadReturnById,
  nowStamp,
  persistReturn,
  pushLogEntry,
  mergeLogEntries,
  refreshReturnLines,
  registerReturnNoticeSeedRows,
  RETURN_NOTICE_STORAGE_KEY,
  RETURN_OUTBOUND_STORAGE_KEY,
  upsertReturnNoticeRow,
} from './purchaseReturnLogic.js';

export { RETURN_NOTICE_STORAGE_KEY, RETURN_OUTBOUND_STORAGE_KEY, registerReturnNoticeSeedRows };

/**
 * 采退发货通知单模块逻辑。
 * 业务规则依据《采退发货通知单主PRD》§6.3 状态流转、§6.4 状态—功能矩阵、R01～R14。
 * 状态机：待推送 →（自动推送）推送中 → 待发货／推送失败；待发货 → 取消中 → 已取消／待发货；
 * 待发货 →（回传）已发货；虚拟出库创建即已发货。
 */

export const returnNoticeStatusLabels = {
  pending_push: '待推送',
  pushing: '推送中',
  push_failed: '推送失败',
  pending_ship: '待发货',
  cancelling: '取消中',
  shipped: '已发货',
  cancelled: '已取消',
};

export const returnShipModeLabels = {
  warehouse: '仓库发货',
  virtual: '虚拟出库',
};

export function resolveReturnShipMode(rowOrValue) {
  const value = typeof rowOrValue === 'string' ? rowOrValue : rowOrValue?.shipMode;
  return value === 'virtual' ? 'virtual' : 'warehouse';
}

export function formatReturnShipMode(rowOrValue) {
  return returnShipModeLabels[resolveReturnShipMode(rowOrValue)];
}

/* ------------------------------------------------------------------ *
 * 明细与行合计
 * ------------------------------------------------------------------ */

export function enrichReturnNoticeLine(line, status = 'shipped') {
  const sku = skuOptions.find((item) => item.value === line.product);
  const notifyQty = Number(line.notifyQty || 0);
  const shippedQty = Number(line.shippedQty || 0);
  return {
    ...line,
    productCode: line.productCode || sku?.skuCode || '',
    barcode: line.barcode || sku?.barcode || '',
    productName: line.productName || sku?.productName || '',
    unit: line.unit || sku?.unit || '个',
    notifyQty,
    shippedQty,
    // 缺出数量只在发货完成后计算展示，未结束（含取消中、已取消）为 0
    shortQty: status === 'shipped' ? Math.max(0, notifyQty - shippedQty) : 0,
  };
}

export function refreshReturnNoticeLines(lines = [], status = 'shipped') {
  return lines.map((line) => enrichReturnNoticeLine(line, status));
}

export function sumReturnNoticeLineQty(lines = [], field) {
  return (lines || []).reduce((sum, line) => sum + Number(line[field] || 0), 0);
}

export function normalizeReturnNoticeRow(row) {
  const lines = refreshReturnNoticeLines(row.lines || [], row.status);
  return {
    ...row,
    shipMode: resolveReturnShipMode(row),
    lines,
    totalNotifyQty: sumReturnNoticeLineQty(lines, 'notifyQty'),
    totalShippedQty: sumReturnNoticeLineQty(lines, 'shippedQty'),
    totalShortQty: sumReturnNoticeLineQty(lines, 'shortQty'),
    updatedAt: row.updatedAt || nowStamp(),
    updater: row.updater || '当前用户',
  };
}

export function persistReturnNotice(row) {
  return upsertReturnNoticeRow(normalizeReturnNoticeRow(row));
}

export function loadReturnNoticeById(id) {
  if (!id) return null;
  return loadAllReturnNotices().find((item) => item.id === id) || null;
}

export function loadReturnNoticesByReturnId(returnId, returnNo) {
  return loadAllReturnNotices()
    .filter((notice) => notice.sourceReturnId === returnId || (returnNo && notice.sourceReturnNo === returnNo))
    .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')));
}

/* ------------------------------------------------------------------ *
 * 状态—功能矩阵（主PRD §6.4、R12）
 * ------------------------------------------------------------------ */

export function canEditReturnNoticeRemark(row) {
  return row?.status === 'pending_push' || row?.status === 'push_failed';
}

export function canCancelReturnNotice(row) {
  return row?.status === 'pending_push' || row?.status === 'push_failed';
}

export function canApplyCancelReturnNotice(row) {
  return row?.status === 'pending_ship';
}

export function canRetryReturnPush(row) {
  return row?.status === 'push_failed';
}

export function canMockReturnShipment(row) {
  return row?.status === 'pending_ship';
}

export function updateReturnNoticeRemark(row, remark) {
  return persistReturnNotice({ ...row, remark });
}

/* ------------------------------------------------------------------ *
 * 退货单占用：创建占用、取消释放、发货以实出替代占用
 * ------------------------------------------------------------------ */

function occupyReturnLines(returnRow, noticeLines) {
  const occupyMap = new Map(
    noticeLines
      .filter((line) => Number(line.notifyQty) > 0)
      .map((line) => [line.sourceReturnLineId || line.id, Number(line.notifyQty)]),
  );

  const nextLines = returnRow.lines.map((line) => {
    const occupy = occupyMap.get(line.id);
    if (!occupy) return line;
    return { ...line, inTransitQty: Number(line.inTransitQty || 0) + occupy };
  });

  return persistReturn({ ...returnRow, lines: nextLines });
}

function releaseReturnOccupancy(returnRow, noticeLines) {
  const releaseMap = new Map(
    noticeLines.map((line) => [line.sourceReturnLineId || line.id, Number(line.notifyQty || 0)]),
  );

  const nextLines = returnRow.lines.map((line) => {
    const release = releaseMap.get(line.id);
    if (!release) return line;
    return { ...line, inTransitQty: Math.max(0, Number(line.inTransitQty || 0) - release) };
  });

  return persistReturn({ ...returnRow, lines: nextLines });
}

/** 通知结束：在途通知减通知量，累计实出加实出，缺量回补可下推量 */
function substituteReturnOccupancy(returnRow, noticeLines) {
  const notifyMap = new Map(
    noticeLines.map((line) => [line.sourceReturnLineId || line.id, Number(line.notifyQty || 0)]),
  );
  const shippedMap = new Map(
    noticeLines.map((line) => [line.sourceReturnLineId || line.id, Number(line.shippedQty || 0)]),
  );

  const nextLines = returnRow.lines.map((line) => {
    if (!notifyMap.has(line.id)) return line;
    return {
      ...line,
      inTransitQty: Math.max(0, Number(line.inTransitQty || 0) - notifyMap.get(line.id)),
      receivedQty: Number(line.receivedQty || 0) + (shippedMap.get(line.id) || 0),
    };
  });

  return persistReturn({ ...returnRow, lines: nextLines });
}

/* ------------------------------------------------------------------ *
 * 下推创建（F02、R01～R05）
 * ------------------------------------------------------------------ */

/** 下推创建页：带入来源退货单单头与可下推行，通知数量默认等于可下推数量（Q02） */
export function buildReturnNoticeFormFromReturn(returnRow) {
  const lines = refreshReturnLines(returnRow.lines || [])
    .map((line, index) => ({ line, lineNo: index + 1 }))
    .filter(({ line }) => Number(line.pushableQty || 0) > 0)
    .map(({ line, lineNo }) => enrichReturnNoticeLine({
      id: line.id,
      sourceReturnLineId: line.id,
      sourceReturnLine: `${returnRow.returnNo} 行${lineNo}`,
      product: line.product,
      productCode: line.productCode,
      barcode: line.barcode,
      productName: line.productName,
      unit: line.unit,
      pushableQty: line.pushableQty,
      notifyQty: line.pushableQty,
      shippedQty: 0,
      shortQty: 0,
    }));

  return {
    noticeNo: '保存后自动生成',
    sourceReturnId: returnRow.id,
    sourceReturnNo: returnRow.returnNo,
    supplier: returnRow.supplier,
    warehouse: returnRow.warehouse,
    shipMode: 'warehouse',
    status: 'pending_push',
    remark: '',
    lines,
  };
}

export function validateReturnNoticeForCreate(form) {
  if (form.shipMode !== 'warehouse' && form.shipMode !== 'virtual') {
    return '请选择发货处理方式';
  }
  if (!form.lines?.length) {
    return '当前采购退货单没有可下推数量';
  }
  if (!form.lines.some((line) => Number(line.notifyQty) > 0)) {
    return '请至少填写一行通知数量';
  }
  for (let index = 0; index < form.lines.length; index += 1) {
    const line = form.lines[index];
    const notifyQty = Number(line.notifyQty || 0);
    if (notifyQty <= 0) continue;
    if (notifyQty > Number(line.pushableQty || 0)) {
      return `第${index + 1}行通知数量不能超过可下推数量${line.pushableQty}`;
    }
  }
  return null;
}

export function createReturnNoticeFromReturn(returnRow, form) {
  const error = validateReturnNoticeForCreate(form);
  if (error) throw new Error(error);

  const activeLines = form.lines
    .filter((line) => Number(line.notifyQty) > 0)
    .map((line) => enrichReturnNoticeLine({ ...line, shippedQty: 0, shortQty: 0 }));

  const stamp = nowStamp();
  const noticeNo = nextDocumentNo(
    'CTFHTZ',
    stamp.slice(0, 10),
    loadAllReturnNotices().map((row) => row.noticeNo),
  );

  if (resolveReturnShipMode(form) === 'virtual') {
    return createVirtualReturnNotice(returnRow, form, activeLines, noticeNo, stamp);
  }

  const notice = persistReturnNotice({
    id: `return-notice-${Date.now()}`,
    noticeNo,
    sourceReturnId: returnRow.id,
    sourceReturnNo: returnRow.returnNo,
    supplier: returnRow.supplier,
    warehouse: returnRow.warehouse,
    shipMode: 'warehouse',
    status: 'pending_push',
    remark: form.remark || '',
    pushTime: '',
    finalShipTime: '',
    pushFailReason: '',
    lastProcessTime: '',
    creator: '当前用户',
    createdAt: stamp,
    lines: activeLines,
  });

  const nextReturn = occupyReturnLines(returnRow, activeLines);
  simulateReturnAutoPush(notice.id);
  return { notice, returnRow: nextReturn };
}

function removeReturnNoticeById(noticeId) {
  writeMockRows(
    RETURN_NOTICE_STORAGE_KEY,
    loadAllReturnNotices().filter((item) => item.id !== noticeId),
  );
}

/** 虚拟出库：创建即已发货、实出=通知量，并生成已审核采退出库单（R13） */
function createVirtualReturnNotice(returnRow, form, activeLines, noticeNo, stamp) {
  const shippedLines = activeLines.map((line) => enrichReturnNoticeLine({
    ...line,
    shippedQty: Number(line.notifyQty || 0),
  }));

  const notice = persistReturnNotice({
    id: `return-notice-${Date.now()}`,
    noticeNo,
    sourceReturnId: returnRow.id,
    sourceReturnNo: returnRow.returnNo,
    supplier: returnRow.supplier,
    warehouse: returnRow.warehouse,
    shipMode: 'virtual',
    status: 'shipped',
    remark: form.remark || '',
    pushTime: '',
    finalShipTime: stamp,
    pushFailReason: '',
    lastProcessTime: stamp,
    creator: '当前用户',
    createdAt: stamp,
    lines: shippedLines,
  });

  occupyReturnLines(returnRow, shippedLines);
  substituteReturnOccupancy(loadReturnById(returnRow.id) || returnRow, shippedLines);

  const outbound = createReturnOutboundFromNotice(loadReturnNoticeById(notice.id) || notice);
  if (!outbound) {
    removeReturnNoticeById(notice.id);
    persistReturn(returnRow);
    throw new Error('虚拟出库生成采退出库单失败，未创建通知单');
  }

  return {
    notice: loadReturnNoticeById(notice.id) || notice,
    returnRow: loadReturnById(returnRow.id) || returnRow,
  };
}

/* ------------------------------------------------------------------ *
 * 推送（R05、R14）
 * ------------------------------------------------------------------ */

export function simulateReturnAutoPush(noticeId, { forceFail = false } = {}) {
  const notice = loadReturnNoticeById(noticeId);
  if (!notice || notice.status !== 'pending_push') return notice;

  const shouldFail = forceFail || notice.demoPushFail;
  const pushing = persistReturnNotice({ ...notice, status: 'pushing', lastProcessTime: nowStamp() });

  window.setTimeout(() => {
    const current = loadReturnNoticeById(noticeId);
    if (!current || current.status !== 'pushing') return;
    if (shouldFail) {
      persistReturnNotice({
        ...current,
        status: 'push_failed',
        pushFailReason: current.pushFailReason || '仓库接口超时，未确认接收',
        lastProcessTime: nowStamp(),
      });
      return;
    }
    const stamp = nowStamp();
    persistReturnNotice({
      ...current,
      status: 'pending_ship',
      pushTime: stamp,
      lastProcessTime: stamp,
      pushFailReason: '',
    });
  }, 600);

  return pushing;
}

export function applyRetryReturnPush(row) {
  const next = persistReturnNotice({ ...row, status: 'pushing', lastProcessTime: nowStamp() });
  window.setTimeout(() => {
    const current = loadReturnNoticeById(row.id);
    if (!current || current.status !== 'pushing') return;
    const stamp = nowStamp();
    persistReturnNotice({
      ...current,
      status: 'pending_ship',
      pushTime: stamp,
      lastProcessTime: stamp,
      pushFailReason: current.pushFailReason,
    });
  }, 600);
  return next;
}

/* ------------------------------------------------------------------ *
 * 取消（F05、F06、R09、R10）
 * ------------------------------------------------------------------ */

export function applyCancelReturnNotice(row, cancelReason) {
  const returnRow = loadReturnById(row.sourceReturnId);
  if (returnRow) releaseReturnOccupancy(returnRow, row.lines);

  const stamp = nowStamp();
  return persistReturnNotice({
    ...row,
    status: 'cancelled',
    cancelReason,
    cancelTime: stamp,
    cancelOperator: '当前用户',
    lastProcessTime: stamp,
  });
}

export function applyApplyCancelReturnNotice(row, cancelReason) {
  return persistReturnNotice({
    ...row,
    status: 'cancelling',
    cancelReason,
    lastProcessTime: nowStamp(),
  });
}

export function applyWarehouseCancelResult(row, agreed) {
  if (!agreed) {
    return persistReturnNotice({ ...row, status: 'pending_ship', lastProcessTime: nowStamp() });
  }
  const returnRow = loadReturnById(row.sourceReturnId);
  if (returnRow) releaseReturnOccupancy(returnRow, row.lines);
  const stamp = nowStamp();
  return persistReturnNotice({
    ...row,
    status: 'cancelled',
    cancelTime: stamp,
    cancelOperator: '当前用户',
    lastProcessTime: stamp,
  });
}

/* ------------------------------------------------------------------ *
 * Demo Mock：模拟仓库出库回传（弹窗PRD §5，非正式验收）
 * ------------------------------------------------------------------ */

export function clampMockReturnLineShipment(value, notifyQty) {
  const max = Number(notifyQty || 0);
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.min(num, max);
}

export function applyMockReturnShipment(row, payload) {
  const returnRow = loadReturnById(row.sourceReturnId);
  if (!returnRow) throw new Error('来源采购退货单不存在');

  if (payload.zeroShip) {
    return applyCancelReturnNotice(
      { ...row, cancelReason: row.cancelReason || '仓库零出，通知取消' },
      row.cancelReason || '仓库零出，通知取消',
    );
  }

  const nextLines = row.lines.map((line, index) => {
    const notifyQty = Number(line.notifyQty || 0);
    const shippedQty = clampMockReturnLineShipment(payload.lineShipments?.[index] ?? line.shippedQty ?? 0, notifyQty);
    return enrichReturnNoticeLine({ ...line, shippedQty });
  });

  const shippedTotal = nextLines.reduce((sum, line) => sum + Number(line.shippedQty || 0), 0);
  if (shippedTotal <= 0) throw new Error('请填写实出数量，或勾选零出');

  const stamp = nowStamp();
  const notice = persistReturnNotice({
    ...row,
    status: 'shipped',
    lines: nextLines,
    finalShipTime: stamp,
    lastProcessTime: stamp,
  });

  substituteReturnOccupancy(returnRow, nextLines);
  generateReturnOutboundFromNotice(notice);
  return loadReturnNoticeById(row.id);
}

/* ------------------------------------------------------------------ *
 * 出库结果单生成（有实出且结束时；零出不生成）
 * ------------------------------------------------------------------ */

export function generateReturnOutboundFromNotice(noticeRow) {
  if (!noticeRow || noticeRow.status !== 'shipped') return null;
  return createReturnOutboundFromNotice(noticeRow);
}

/* ------------------------------------------------------------------ *
 * 随退货单取消（R11）
 * ------------------------------------------------------------------ */

export { cancelReturnNoticesWithReturn, createMockReturnNotice } from './purchaseReturnLogic.js';

/* ------------------------------------------------------------------ *
 * 操作日志
 * ------------------------------------------------------------------ */

export function buildReturnNoticeOperationLogs(row) {
  const entries = [];

  pushLogEntry(entries, {
    time: row.createdAt,
    operator: row.creator,
    action: '创建',
    remark: resolveReturnShipMode(row) === 'virtual'
      ? '下推创建采退发货通知单（虚拟出库）'
      : '下推创建采退发货通知单',
  });

  if (row.pushTime) {
    pushLogEntry(entries, {
      time: row.pushTime,
      operator: '系统',
      action: '推送仓库',
      remark: row.pushFailReason ? `推送失败：${row.pushFailReason}` : '推送仓库成功',
    });
  }

  if (row.finalShipTime) {
    pushLogEntry(entries, {
      time: row.finalShipTime,
      operator: '系统',
      action: '发货完成',
      remark: resolveReturnShipMode(row) === 'virtual' ? '按通知数量确认发货' : '仓库回传发货结果',
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
