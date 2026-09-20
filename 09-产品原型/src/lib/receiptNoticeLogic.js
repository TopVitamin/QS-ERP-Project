import { skuOptions } from '../data/masterData.js';
import { nextDocumentNo } from './documentNo.js';
import { upsertMockRow, readMockRows, writeMockRows } from './mockStorage.js';
import { generateInboundFromNotice } from './inboundLogic.js';
import {
  enrichOrderLine,
  loadOrderById,
  NOTICE_STORAGE_KEY,
  nowStamp,
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
  const next = normalizeNoticeRow(row);
  upsertMockRow(NOTICE_STORAGE_KEY, next);
  return next;
}

export function loadNoticeById(id) {
  return readMockRows(NOTICE_STORAGE_KEY, []).find((item) => item.id === id) || null;
}

export function loadAllNotices(seed = []) {
  return readMockRows(NOTICE_STORAGE_KEY, seed);
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
    warehouse: orderRow.warehouse,
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
  const noticeNo = nextDocumentNo('CGSHTZ', new Date().toISOString().slice(0, 10), existingNos);
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
    warehouse: orderRow.warehouse,
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
    warehouse: orderRow.warehouse,
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

  occupyOrderLines(orderRow, receivedLines);
  substituteOrderOccupancy(loadOrderById(orderRow.id) || orderRow, receivedLines);
  const inbound = generateInboundFromNotice(loadNoticeById(notice.id) || notice);

  if (!inbound) {
    removeNoticeById(notice.id);
    persistOrder(orderRow);
    throw new Error('虚拟入库生成入库单失败，未创建通知单');
  }

  return {
    notice: loadNoticeById(notice.id) || notice,
    order: loadOrderById(orderRow.id) || orderRow,
  };
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
      persistNotice({
        ...current,
        status: 'push_failed',
        pushFailReason: current.pushFailReason || '仓库接口超时，未确认接收',
      });
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
    persistNotice({
      ...current,
      status: 'pending_receive',
      pushTime: nowStamp(),
      pushFailReason: current.pushFailReason,
    });
  }, 600);
  return next;
}

export function applyCancelNotice(row, cancelReason) {
  const orderRow = loadOrderById(row.sourceOrderId);
  if (orderRow) releaseOrderOccupancy(orderRow, row.lines);

  return persistNotice({
    ...row,
    status: 'cancelled',
    cancelReason,
    cancelTime: nowStamp(),
    cancelOperator: '当前用户',
  });
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

  substituteOrderOccupancy(orderRow, nextLines);
  generateInboundFromNotice(notice);
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
