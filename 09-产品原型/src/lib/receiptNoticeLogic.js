import { skuOptions } from '../data/masterData.js';
import { PUSH_EXCEPTION_STORAGE_KEY, pushExceptionSeeds } from '../data/pushExceptionData.js';
import { resolveLogicalWarehouseDocking } from '../data/warehouseData.js';
import { nextDocumentNo } from './documentNo.js';
import { upsertMockRow, readMockRows, writeMockRows } from './mockStorage.js';
import { generateInboundFromNotice } from './inboundLogic.js';
import { nowDateStamp, nowStamp } from './format.js';
import { capturePurchaseDocumentNames, loadRowsWithNameSnapshots } from './documentNameSnapshots.js';
import {
  enrichOrderLine,
  loadOrderById,
  NOTICE_STORAGE_KEY,
  persistOrder,
  refreshOrderLines,
} from './purchaseOrderLogic.js';

export { NOTICE_STORAGE_KEY };

export const noticeStatusLabels = {
  pending_push: '待推送',
  pushing: '推送中',
  push_failed: '推送失败',
  pending_receive: '待收货',
  cancelling: '取消中',
  received: '已收货',
  cancelled: '已取消',
};

export const receiptModeLabels = {
  warehouse: '仓库收货',
  virtual: '虚拟入库',
};

export function resolveReceiptMode(rowOrValue) {
  const value = typeof rowOrValue === 'string' ? rowOrValue : rowOrValue?.receiptMode;
  return value === 'virtual' ? 'virtual' : 'warehouse';
}

export function formatReceiptMode(rowOrValue) {
  return receiptModeLabels[resolveReceiptMode(rowOrValue)];
}

export function enrichNoticeLine(line) {
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
    shortQty: Math.max(0, notifyQty - receivedQty),
  };
}

export function refreshNoticeLines(lines = []) {
  return lines.map(enrichNoticeLine);
}

export function sumNoticeQty(lines = []) {
  return lines.reduce((sum, line) => sum + Number(line.notifyQty || 0), 0);
}

export function sumNoticeReceivedQty(lines = []) {
  return lines.reduce((sum, line) => sum + Number(line.receivedQty || 0), 0);
}

export function sumNoticeShortQty(lines = []) {
  return lines.reduce((sum, line) => sum + Number(line.shortQty || 0), 0);
}

export function canEditRemark(row) {
  return row.status === 'pending_push' || row.status === 'push_failed';
}

export function canCancelNotice(row) {
  return row.status === 'pending_push' || row.status === 'push_failed';
}

export function canApplyCancelNotice(row) {
  return row.status === 'pending_receive';
}

export function canRetryPush(row) {
  return row.status === 'push_failed';
}

export function canMockReceipt(row) {
  return row.status === 'pending_receive';
}

// —— 人工确认（F10/R16；《采购收货通知单前端Demo版PRD_弹窗与Mock》§6）——

export const manualConfirmTypeLabels = {
  accept: '确认接单',
  finish: '确认执行结束',
  cancel_result: '确认取消结果',
};

/** 人工确认可选类型：按当前状态限定（推送中＝确认接单；待收货＝确认执行结束；取消中＝确认取消结果）。 */
export function manualConfirmTypesForStatus(status) {
  if (status === 'pushing') return ['accept'];
  if (status === 'pending_receive') return ['finish'];
  if (status === 'cancelling') return ['cancel_result'];
  return [];
}

export function canManualConfirm(row) {
  return manualConfirmTypesForStatus(row?.status).length > 0;
}

/** 人工确认留痕与操作日志：每次确认记录人工确认人／时间／内容，明细进操作日志（§6.1、§6.4）。 */
function appendManualConfirmTrace(row, { stamp, content, operator = '当前用户' }) {
  return {
    ...row,
    confirmBy: operator,
    confirmAt: stamp,
    confirmContent: content,
    operationLogs: [
      ...(row.operationLogs || []),
      {
        id: `人工确认-${stamp}`,
        time: stamp,
        operator,
        action: '人工确认',
        remark: `${content}（演示数据）`,
      },
    ],
  };
}

/**
 * 人工确认提交（R16、§6.3）：
 * 确认接单 推送中→待收货；确认执行结束 待收货→已收货并生成采购入库单；零收 待收货→已取消；确认取消结果 取消中→已取消／待收货。
 * 边界：仅用于已交给仓库、接口拿不到结果的通知；不替代事先选择的虚拟入库，不能无来源新建采购入库单（INT-FR06）。
 */
export function applyManualConfirm(row, payload = {}) {
  const type = payload.confirmType;
  if (!manualConfirmTypesForStatus(row?.status).includes(type)) {
    throw new Error('当前状态不可人工确认');
  }
  if (type === 'accept') return applyManualConfirmAccept(row);
  if (type === 'cancel_result') return applyManualConfirmCancelResult(row, payload);
  return applyManualConfirmFinish(row, payload);
}

/** 确认接单：视同仓库已接收，转待收货，不生成结果单。 */
function applyManualConfirmAccept(row) {
  const stamp = nowStamp();
  const content = `${manualConfirmTypeLabels.accept}（视同仓库已接收）`;
  return persistNotice(appendManualConfirmTrace({ ...row, status: 'pending_receive' }, { stamp, content }));
}

/** 确认执行结束：回写实收／缺收并生成采购入库单；零收按取消结束、不生成入库单（§6.3）。 */
function applyManualConfirmFinish(row, { lineReceipts = [], zeroReceive = false }) {
  const stamp = nowStamp();

  if (zeroReceive) {
    const content = `${manualConfirmTypeLabels.finish}（整单零收，按取消结束）`;
    const cancelled = applyCancelNotice({ ...row, cancelReason: '仓库零收' }, '仓库零收');
    return persistNotice(appendManualConfirmTrace(cancelled, { stamp, content }));
  }

  const nextLines = row.lines.map((line, index) => enrichNoticeLine({
    ...line,
    receivedQty: clampMockLineReceipt(lineReceipts[index] ?? line.receivedQty ?? 0, line.notifyQty),
  }));
  const receivedTotal = sumNoticeReceivedQty(nextLines);
  if (receivedTotal <= 0) throw new Error('请填写至少一行实收数量');
  const shortTotal = sumNoticeShortQty(nextLines);

  const orderRow = loadOrderById(row.sourceOrderId);
  if (!orderRow) throw new Error('来源采购订单不存在，不能人工确认');

  const content = `${manualConfirmTypeLabels.finish}：实收 ${receivedTotal}，缺收 ${shortTotal}`;
  const notice = persistNotice(appendManualConfirmTrace({
    ...row,
    status: 'received',
    lines: nextLines,
    finalReceiveTime: stamp,
  }, { stamp, content }));

  // 结果单沿本通知与来源订单行形成（演示口径：原型结果单为只读已审核态，直接生成已审核入库单）
  const inbound = generateInboundFromNotice(notice);
  if (!inbound) throw new Error('入库结果未生成，采购收货未完成');
  substituteOrderOccupancy(orderRow, nextLines);
  return loadNoticeById(row.id) || notice;
}

/** 确认取消结果：仓库同意→已取消并释放占用；仓库拒绝→回到待收货（不生成结果单）。 */
function applyManualConfirmCancelResult(row, { cancelAgreed = false }) {
  const stamp = nowStamp();
  const content = `${manualConfirmTypeLabels.cancel_result}：${cancelAgreed ? '仓库同意取消' : '仓库拒绝取消'}`;
  const next = applyWarehouseCancelResult(row, cancelAgreed);
  return persistNotice(appendManualConfirmTrace(next, { stamp, content }));
}

export function normalizeNoticeRow(row) {
  const lines = refreshNoticeLines(row.lines || []);
  return {
    ...row,
    receiptMode: resolveReceiptMode(row),
    lines,
    totalNotifyQty: sumNoticeQty(lines),
    totalReceivedQty: sumNoticeReceivedQty(lines),
    totalShortQty: sumNoticeShortQty(lines),
    updatedAt: nowStamp(),
    updater: row.updater || '当前用户',
  };
}

export function persistNotice(row) {
  const previous = readMockRows(NOTICE_STORAGE_KEY, []).find((item) => item.id === row.id) || null;
  const next = normalizeNoticeRow(capturePurchaseDocumentNames(row, { previous }));
  upsertMockRow(NOTICE_STORAGE_KEY, next);
  return next;
}

export function loadNoticeById(id) {
  return loadAllNotices([]).find((item) => item.id === id) || null;
}

export function loadAllNotices(seed = []) {
  return loadRowsWithNameSnapshots(NOTICE_STORAGE_KEY, seed, capturePurchaseDocumentNames);
}

export function loadNoticesByOrderId(orderId, orderNo) {
  return loadAllNotices([])
    .filter((notice) => notice.sourceOrderId === orderId || (orderNo && notice.sourceOrderNo === orderNo))
    .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')));
}

export function sumNoticeLineQty(lines = [], field) {
  return (lines || []).reduce((sum, line) => sum + Number(line[field] || 0), 0);
}

const CANCELLABLE_WITH_ORDER_STATUSES = new Set(['pending_push', 'push_failed']);

export function cancelNoticesWithOrder(orderId, cancelReason) {
  loadAllNotices([])
    .filter((notice) => notice.sourceOrderId === orderId && CANCELLABLE_WITH_ORDER_STATUSES.has(notice.status))
    .forEach((notice) => applyCancelNotice(notice, cancelReason));
}

export function buildNoticeFormFromOrder(orderRow) {
  const lines = refreshOrderLines(orderRow.lines || [])
    .filter((line) => Number(line.pushableQty || 0) > 0)
    .map((line) => enrichNoticeLine({
      id: line.id,
      sourceOrderLineId: line.id,
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
    sourceOrderId: orderRow.id,
    sourceOrderNo: orderRow.orderNo,
    supplier: orderRow.supplier,
    supplierNameSnapshot: orderRow.supplierNameSnapshot,
    supplierSnapshotCode: orderRow.supplierSnapshotCode,
    warehouse: orderRow.warehouse,
    warehouseNameSnapshot: orderRow.warehouseNameSnapshot,
    warehouseSnapshotCode: orderRow.warehouseSnapshotCode,
    receiptMode: 'warehouse',
    status: 'pending_push',
    remark: '',
    lines,
  };
}

export function validateNoticeForCreate(form) {
  if (form.receiptMode !== 'warehouse' && form.receiptMode !== 'virtual') {
    return '请选择收货处理方式';
  }
  if (!form.lines?.length) {
    return '当前采购订单没有可下推数量';
  }
  const filled = form.lines.filter((line) => Number(line.notifyQty) > 0);
  if (!filled.length) {
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

function occupyOrderLines(orderRow, noticeLines) {
  const occupancyMap = new Map(
    noticeLines
      .filter((line) => Number(line.notifyQty) > 0)
      .map((line) => [line.sourceOrderLineId || line.id, Number(line.notifyQty)]),
  );

  const nextLines = orderRow.lines.map((line) => {
    const occupy = occupancyMap.get(line.id);
    if (!occupy) return line;
    const enriched = enrichOrderLine(line);
    const nextNotifyQty = Number(enriched.notifyQty || 0) + occupy;
    return {
      ...enriched,
      notifyQty: nextNotifyQty,
      pushableQty: Math.max(0, Number(enriched.quantity || 0) - Number(enriched.received || 0) - nextNotifyQty),
    };
  });

  return persistOrder({ ...orderRow, lines: nextLines });
}

function releaseOrderOccupancy(orderRow, noticeLines) {
  const releaseMap = new Map(
    noticeLines.map((line) => [line.sourceOrderLineId || line.id, Number(line.notifyQty || 0)]),
  );

  const nextLines = orderRow.lines.map((line) => {
    const release = releaseMap.get(line.id);
    if (!release) return line;
    const enriched = enrichOrderLine(line);
    const nextNotifyQty = Math.max(0, Number(enriched.notifyQty || 0) - release);
    return {
      ...enriched,
      notifyQty: nextNotifyQty,
      pushableQty: Math.max(0, Number(enriched.quantity || 0) - Number(enriched.received || 0) - nextNotifyQty),
    };
  });

  return persistOrder({ ...orderRow, lines: nextLines });
}

function substituteOrderOccupancy(orderRow, noticeLines) {
  const actualMap = new Map(
    noticeLines.map((line) => [line.sourceOrderLineId || line.id, Number(line.receivedQty || 0)]),
  );
  const notifyMap = new Map(
    noticeLines.map((line) => [line.sourceOrderLineId || line.id, Number(line.notifyQty || 0)]),
  );

  const nextLines = orderRow.lines.map((line) => {
    const notifyQty = notifyMap.get(line.id);
    if (notifyQty == null) return line;
    const enriched = enrichOrderLine(line);
    const actualQty = actualMap.get(line.id) || 0;
    // 通知完结后释放全部在途占用；实收计入累计入库，缺量通过 pushableQty 回补
    const nextNotifyQty = Math.max(0, Number(enriched.notifyQty || 0) - notifyQty);
    const nextReceived = Number(enriched.received || 0) + actualQty;
    return {
      ...enriched,
      received: nextReceived,
      notifyQty: nextNotifyQty,
      pushableQty: Math.max(0, Number(enriched.quantity || 0) - nextReceived - nextNotifyQty),
    };
  });

  return persistOrder({ ...orderRow, lines: nextLines });
}

export function createReceiptNotice(orderRow, form) {
  const error = validateNoticeForCreate(form);
  if (error) throw new Error(error);

  const activeLines = form.lines
    .filter((line) => Number(line.notifyQty) > 0)
    .map((line) => enrichNoticeLine({ ...line, receivedQty: 0, shortQty: 0 }));

  const existingNos = readMockRows(NOTICE_STORAGE_KEY, []).map((row) => row.noticeNo);
  const noticeNo = nextDocumentNo('CGSHTZ', nowDateStamp(), existingNos);
  const receiptMode = resolveReceiptMode(form);

  if (receiptMode === 'virtual') {
    return createVirtualReceiptNotice(orderRow, form, activeLines, noticeNo);
  }

  const notice = persistNotice({
    id: `notice-${Date.now()}`,
    noticeNo,
    sourceOrderId: orderRow.id,
    sourceOrderNo: orderRow.orderNo,
    supplier: orderRow.supplier,
    supplierNameSnapshot: orderRow.supplierNameSnapshot,
    supplierSnapshotCode: orderRow.supplierSnapshotCode,
    warehouse: orderRow.warehouse,
    warehouseNameSnapshot: orderRow.warehouseNameSnapshot,
    warehouseSnapshotCode: orderRow.warehouseSnapshotCode,
    receiptMode,
    status: 'pending_push',
    remark: form.remark || '',
    pushTime: '',
    finalReceiveTime: '',
    pushFailReason: '',
    creator: '当前用户',
    createdAt: nowStamp(),
    lines: activeLines,
  });

  const nextOrder = occupyOrderLines(orderRow, activeLines);
  simulateAutoPush(notice.id);
  return { notice, order: nextOrder };
}

function removeNoticeById(noticeId) {
  writeMockRows(
    NOTICE_STORAGE_KEY,
    readMockRows(NOTICE_STORAGE_KEY, []).filter((item) => item.id !== noticeId),
  );
}

function createVirtualReceiptNotice(orderRow, form, activeLines, noticeNo) {
  const stamp = nowStamp();
  const receivedLines = activeLines.map((line) => enrichNoticeLine({
    ...line,
    receivedQty: Number(line.notifyQty || 0),
  }));

  const notice = persistNotice({
    id: `notice-${Date.now()}`,
    noticeNo,
    sourceOrderId: orderRow.id,
    sourceOrderNo: orderRow.orderNo,
    supplier: orderRow.supplier,
    supplierNameSnapshot: orderRow.supplierNameSnapshot,
    supplierSnapshotCode: orderRow.supplierSnapshotCode,
    warehouse: orderRow.warehouse,
    warehouseNameSnapshot: orderRow.warehouseNameSnapshot,
    warehouseSnapshotCode: orderRow.warehouseSnapshotCode,
    receiptMode: 'virtual',
    status: 'received',
    remark: form.remark || '',
    pushTime: '',
    finalReceiveTime: stamp,
    pushFailReason: '',
    creator: '当前用户',
    createdAt: stamp,
    lines: receivedLines,
  });

  const inbound = generateInboundFromNotice(loadNoticeById(notice.id) || notice);

  if (!inbound) {
    removeNoticeById(notice.id);
    throw new Error('虚拟入库生成入库单失败，未创建通知单');
  }

  occupyOrderLines(orderRow, receivedLines);
  substituteOrderOccupancy(loadOrderById(orderRow.id) || orderRow, receivedLines);

  return {
    notice: loadNoticeById(notice.id) || notice,
    order: loadOrderById(orderRow.id) || orderRow,
  };
}

// —— 推送外部仓库异常记录同步（本地 Mock；推送异常主PRD R04、R05）——

const PUSH_TARGET_SYSTEM_BY_DOCKING_SYSTEM = { 聚水潭: 'jushuitan', 领星: 'lingxing' };

/** 演示用：按收货仓库所属实体仓的对接系统解析「推送外部仓库」的目标系统键值。 */
function resolvePushExceptionTargetSystem(noticeRow) {
  const { isSaaSTransit, dockingSystem } = resolveLogicalWarehouseDocking(noticeRow.warehouse);
  if (isSaaSTransit && PUSH_TARGET_SYSTEM_BY_DOCKING_SYSTEM[dockingSystem]) {
    return PUSH_TARGET_SYSTEM_BY_DOCKING_SYSTEM[dockingSystem];
  }
  return 'self_wms';
}

/**
 * 同步系统集成中心「推送异常－推送外部仓库」记录：
 * 推送失败→生成或刷新「待处理」记录；重试成功→置「已处理」并追加人工重试记录；原单取消→置「已处理」。
 * 口径见《推送异常主PRD》R04、R05。说明：仓库链路的同步暂由本模块承接（Demo Mock），
 * 正式实现应并入集成侧统一同步（与财务ERP重推的 `pushExceptionLogic` 同一职责）。
 */
export function syncWarehousePushExceptionFromNotice(noticeRow, event) {
  if (!noticeRow?.noticeNo) return;

  const rows = readMockRows(PUSH_EXCEPTION_STORAGE_KEY, pushExceptionSeeds);
  const index = rows.findIndex((row) => row.tab === 'warehouse' && row.docNo === noticeRow.noticeNo);

  if (event === 'push_failed') {
    const failTime = noticeRow.updatedAt || nowStamp();
    const failReason = noticeRow.pushFailReason || '仓库接口超时，未确认接收';
    if (index >= 0) {
      rows[index] = { ...rows[index], status: 'pending', failTime, failReason };
    } else {
      rows.unshift({
        id: `push-exception-warehouse-${noticeRow.id || noticeRow.noticeNo}`,
        tab: 'warehouse',
        docType: 'purchase_receipt_notice',
        docNo: noticeRow.noticeNo,
        targetSystem: resolvePushExceptionTargetSystem(noticeRow),
        failTime,
        failReason,
        status: 'pending',
        records: [],
      });
    }
  } else if (index >= 0) {
    const current = rows[index];
    const records = event === 'retry_success'
      ? [...(current.records || []), {
        id: `${current.id}-handle-${Date.now()}`,
        time: nowStamp(),
        method: 'manual_retry',
        result: 'success',
        operator: '当前用户',
        note: '',
      }]
      : current.records || [];
    rows[index] = { ...current, status: 'handled', records };
  }

  writeMockRows(PUSH_EXCEPTION_STORAGE_KEY, rows);
}

export function simulateAutoPush(noticeId, { forceFail = false } = {}) {
  const notice = loadNoticeById(noticeId);
  if (!notice || notice.status !== 'pending_push') return notice;

  const shouldFail = forceFail || notice.demoPushFail;
  const pushing = persistNotice({ ...notice, status: 'pushing' });

  window.setTimeout(() => {
    const current = loadNoticeById(noticeId);
    if (!current || current.status !== 'pushing') return;
    if (shouldFail) {
      const failed = persistNotice({
        ...current,
        status: 'push_failed',
        pushFailReason: current.pushFailReason || '仓库接口超时，未确认接收',
      });
      syncWarehousePushExceptionFromNotice(failed, 'push_failed');
      return;
    }
    persistNotice({
      ...current,
      status: 'pending_receive',
      pushTime: nowStamp(),
      pushFailReason: '',
    });
  }, 600);

  return pushing;
}

export function applyRetryPush(row) {
  const next = persistNotice({
    ...row,
    status: 'pushing',
  });
  window.setTimeout(() => {
    const current = loadNoticeById(row.id);
    if (!current || current.status !== 'pushing') return;
    const pushed = persistNotice({
      ...current,
      status: 'pending_receive',
      pushTime: nowStamp(),
      pushFailReason: current.pushFailReason,
    });
    syncWarehousePushExceptionFromNotice(pushed, 'retry_success');
  }, 600);
  return next;
}

export function applyCancelNotice(row, cancelReason) {
  const orderRow = loadOrderById(row.sourceOrderId);
  if (orderRow) releaseOrderOccupancy(orderRow, row.lines);

  const cancelled = persistNotice({
    ...row,
    status: 'cancelled',
    cancelReason,
    cancelTime: nowStamp(),
    cancelOperator: '当前用户',
  });
  syncWarehousePushExceptionFromNotice(cancelled, 'cancelled');
  return cancelled;
}

export function applyApplyCancelNotice(row, cancelReason) {
  return persistNotice({
    ...row,
    status: 'cancelling',
    cancelReason,
  });
}

export function applyWarehouseCancelResult(row, agreed) {
  if (agreed) {
    const orderRow = loadOrderById(row.sourceOrderId);
    if (orderRow) releaseOrderOccupancy(orderRow, row.lines);
    return persistNotice({
      ...row,
      status: 'cancelled',
      cancelTime: nowStamp(),
      cancelOperator: '当前用户',
    });
  }
  return persistNotice({ ...row, status: 'pending_receive' });
}

export function clampMockLineReceipt(value, notifyQty) {
  const max = Number(notifyQty || 0);
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.min(num, max);
}

export function applyMockReceipt(row, payload) {
  const orderRow = loadOrderById(row.sourceOrderId);
  if (!orderRow) throw new Error('来源采购订单不存在');

  if (payload.zeroReceive) {
    applyCancelNotice({ ...row, cancelReason: row.cancelReason || '仓库零收' }, row.cancelReason || '仓库零收');
    return loadNoticeById(row.id);
  }

  const nextLines = row.lines.map((line, index) => {
    const notifyQty = Number(line.notifyQty || 0);
    const receivedQty = clampMockLineReceipt(payload.lineReceipts?.[index] ?? line.receivedQty ?? 0, notifyQty);
    return enrichNoticeLine({
      ...line,
      receivedQty,
    });
  });

  const receivedTotal = nextLines.reduce((sum, line) => sum + Number(line.receivedQty || 0), 0);
  if (receivedTotal <= 0) {
    throw new Error('请填写实收数量，或勾选零收');
  }

  const notice = persistNotice({
    ...row,
    status: 'received',
    lines: nextLines,
    finalReceiveTime: nowStamp(),
  });

  const inbound = generateInboundFromNotice(notice);
  if (!inbound) throw new Error('入库结果未生成，采购收货未完成');
  substituteOrderOccupancy(orderRow, nextLines);
  return loadNoticeById(row.id);
}

export function createMockReceiptNotice(orderRow) {
  const form = buildNoticeFormFromOrder(orderRow);
  const { notice, order } = createReceiptNotice(orderRow, form);
  return order;
}

export function updateNoticeRemark(row, remark) {
  return persistNotice({ ...row, remark });
}
