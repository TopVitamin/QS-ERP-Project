import { skuOptions } from '../data/masterData.js';
import {
  addressRecordToCnAddress,
  createEmptyCnAddress,
  getDefaultCustomerAddress,
  isCnAddressComplete,
  matchCustomerAddressId,
  normalizeAddressValue,
} from './cnAddress.js';
import { nextDocumentNo } from './documentNo.js';
import { upsertMockRow, readMockRows, writeMockRows } from './mockStorage.js';
import { generateOutboundFromNotice } from './salesOutboundLogic.js';
import { getReservationRemaining, postStockEntries } from './inventoryStockLogic.js';
import { captureSalesDocumentNames, loadRowsWithNameSnapshots } from './documentNameSnapshots.js';
import {
  enrichOrderLine,
  loadOrderById,
  DELIVERY_NOTICE_STORAGE_KEY,
  maybeAutoCloseOrder,
  nowStamp,
  persistOrder,
  refreshOrderLines,
} from './salesOrderLogic.js';

export { DELIVERY_NOTICE_STORAGE_KEY };

export const noticeStatusLabels = {
  pending_push: '待推送',
  pushing: '推送中',
  push_failed: '推送失败',
  pending_ship: '待发货',
  cancelling: '取消中',
  shipped: '已发货',
  cancelled: '已取消',
};

export const deliveryModeLabels = {
  warehouse: '仓库发货',
  virtual: '虚拟出库',
};

export const shipMethodLabels = {
  logistics: '物流配送',
  pickup: '自提',
};

export function resolveDeliveryMode(rowOrValue) {
  const value = typeof rowOrValue === 'string' ? rowOrValue : rowOrValue?.deliveryMode;
  return value === 'virtual' ? 'virtual' : 'warehouse';
}

export function formatDeliveryMode(rowOrValue) {
  return deliveryModeLabels[resolveDeliveryMode(rowOrValue)];
}

export function formatShipMethod(value) {
  return shipMethodLabels[value] || value || '';
}

export function enrichNoticeLine(line) {
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
    shortQty: Math.max(0, notifyQty - shippedQty),
  };
}

export function refreshNoticeLines(lines = []) {
  return lines.map(enrichNoticeLine);
}

export function sumNoticeQty(lines = []) {
  return lines.reduce((sum, line) => sum + Number(line.notifyQty || 0), 0);
}

export function sumNoticeShippedQty(lines = []) {
  return lines.reduce((sum, line) => sum + Number(line.shippedQty || 0), 0);
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
  return row.status === 'pending_ship';
}

export function canRetryPush(row) {
  return row.status === 'push_failed';
}

export function canMockShip(row) {
  return row.status === 'pending_ship';
}

export function normalizeNoticeRow(row) {
  const lines = refreshNoticeLines(row.lines || []);
  return {
    ...row,
    deliveryMode: resolveDeliveryMode(row),
    lines,
    totalNotifyQty: sumNoticeQty(lines),
    totalShippedQty: sumNoticeShippedQty(lines),
    totalShortQty: sumNoticeShortQty(lines),
    updatedAt: nowStamp(),
    updater: row.updater || '当前用户',
  };
}

export function persistNotice(row) {
  const previous = readMockRows(DELIVERY_NOTICE_STORAGE_KEY, []).find((item) => item.id === row.id) || null;
  const next = normalizeNoticeRow(captureSalesDocumentNames(row, { previous }));
  upsertMockRow(DELIVERY_NOTICE_STORAGE_KEY, next);
  return next;
}

export function loadNoticeById(id) {
  return loadAllNotices([]).find((item) => item.id === id) || null;
}

export function loadAllNotices(seed = []) {
  return loadRowsWithNameSnapshots(DELIVERY_NOTICE_STORAGE_KEY, seed, captureSalesDocumentNames);
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
  const defaultAddress = getDefaultCustomerAddress(orderRow.customer);
  const shipMethod = orderRow.shipMethod || 'logistics';
  const inheritedAddress = shipMethod === 'pickup'
    ? createEmptyCnAddress()
    : (() => {
      const base = orderRow.deliveryAddress
        ? normalizeAddressValue(orderRow.deliveryAddress)
        : addressRecordToCnAddress(defaultAddress);
      const savedAddressId = matchCustomerAddressId(base, orderRow.customer);
      return savedAddressId ? { ...base, savedAddressId } : base;
    })();
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
      shippedQty: 0,
      shortQty: 0,
    }));

  return {
    noticeNo: '保存后自动生成',
    sourceOrderId: orderRow.id,
    sourceOrderNo: orderRow.orderNo,
    customer: orderRow.customer,
    customerNameSnapshot: orderRow.customerNameSnapshot,
    customerSnapshotCode: orderRow.customerSnapshotCode,
    warehouse: orderRow.warehouse,
    warehouseNameSnapshot: orderRow.warehouseNameSnapshot,
    warehouseSnapshotCode: orderRow.warehouseSnapshotCode,
    deliveryMode: 'warehouse',
    shipMethod,
    deliveryAddress: inheritedAddress,
    logisticsProduct: shipMethod === 'pickup' ? '' : (orderRow.logisticsProduct || 'LSP000001'),
    logisticsProductNameSnapshot: shipMethod === 'pickup' ? '' : orderRow.logisticsProductNameSnapshot,
    logisticsProductSnapshotCode: shipMethod === 'pickup' ? '' : orderRow.logisticsProductSnapshotCode,
    status: 'pending_push',
    remark: '',
    lines,
  };
}

export function validateNoticeForCreate(form) {
  if (form.deliveryMode !== 'warehouse' && form.deliveryMode !== 'virtual') {
    return '请选择发货处理方式';
  }
  if (form.shipMethod === 'logistics') {
    if (!isCnAddressComplete(form.deliveryAddress)) return '物流配送时请选择完整的省市区和详细地址';
    if (!form.logisticsProduct) return '物流配送时物流服务产品不能为空';
  }
  if (!form.lines?.length) {
    return '当前销售订单没有可下推数量';
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
      pushableQty: Math.max(0, Number(enriched.quantity || 0) - Number(enriched.shipped || 0) - nextNotifyQty),
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
      pushableQty: Math.max(0, Number(enriched.quantity || 0) - Number(enriched.shipped || 0) - nextNotifyQty),
    };
  });

  if (orderRow.businessStatus === 'closed' || orderRow.businessStatus === 'cancelled') {
    const releaseEntries = noticeLines.map((line) => {
      const sourceOrderLineId = line.sourceOrderLineId || line.id;
      const releaseQty = Math.min(
        Number(line.notifyQty || 0),
        getReservationRemaining({
          logicalWarehouse: orderRow.warehouse,
          product: line.product,
          sourceNo: orderRow.orderNo,
          sourceLineNo: sourceOrderLineId,
        }),
      );
      return {
        logicalWarehouse: orderRow.warehouse,
        product: line.product,
        releaseReserved: releaseQty,
        reservationSourceNo: orderRow.orderNo,
        reservationSourceLineNo: sourceOrderLineId,
      };
    }).filter((entry) => entry.releaseReserved > 0);
    if (releaseEntries.length) {
      postStockEntries(releaseEntries, {
        eventType: 'release',
        sourceType: '销售订单',
        sourceNo: orderRow.orderNo,
        businessType: '关闭订单取消发货通知释放',
        reservationSourceNo: orderRow.orderNo,
        operator: '当前用户',
      });
    }
  }

  return persistOrder({ ...orderRow, lines: nextLines });
}

function substituteOrderOccupancy(orderRow, noticeLines) {
  const actualMap = new Map(
    noticeLines.map((line) => [line.sourceOrderLineId || line.id, Number(line.shippedQty || 0)]),
  );
  const notifyMap = new Map(
    noticeLines.map((line) => [line.sourceOrderLineId || line.id, Number(line.notifyQty || 0)]),
  );

  const nextLines = orderRow.lines.map((line) => {
    const notifyQty = notifyMap.get(line.id);
    if (notifyQty == null) return line;
    const enriched = enrichOrderLine(line);
    const actualQty = actualMap.get(line.id) || 0;
    const nextNotifyQty = Math.max(0, Number(enriched.notifyQty || 0) - notifyQty);
    const nextShipped = Number(enriched.shipped || 0) + actualQty;
    return {
      ...enriched,
      shipped: nextShipped,
      notifyQty: nextNotifyQty,
      pushableQty: Math.max(0, Number(enriched.quantity || 0) - nextShipped - nextNotifyQty),
    };
  });

  const nextOrder = persistOrder({ ...orderRow, lines: nextLines });
  return maybeAutoCloseOrder(nextOrder);
}

export function createDeliveryNotice(orderRow, form) {
  const error = validateNoticeForCreate(form);
  if (error) throw new Error(error);

  const activeLines = form.lines
    .filter((line) => Number(line.notifyQty) > 0)
    .map((line) => enrichNoticeLine({ ...line, shippedQty: 0, shortQty: 0 }));

  const existingNos = readMockRows(DELIVERY_NOTICE_STORAGE_KEY, []).map((row) => row.noticeNo);
  const noticeNo = nextDocumentNo('XSFHTZ', new Date().toISOString().slice(0, 10), existingNos);
  const deliveryMode = resolveDeliveryMode(form);

  if (deliveryMode === 'virtual') {
    return createVirtualDeliveryNotice(orderRow, form, activeLines, noticeNo);
  }

  const notice = persistNotice({
    id: `notice-${Date.now()}`,
    noticeNo,
    sourceOrderId: orderRow.id,
    sourceOrderNo: orderRow.orderNo,
    customer: orderRow.customer,
    customerNameSnapshot: orderRow.customerNameSnapshot,
    customerSnapshotCode: orderRow.customerSnapshotCode,
    warehouse: orderRow.warehouse,
    warehouseNameSnapshot: orderRow.warehouseNameSnapshot,
    warehouseSnapshotCode: orderRow.warehouseSnapshotCode,
    deliveryMode,
    shipMethod: form.shipMethod || 'logistics',
    deliveryAddress: normalizeAddressValue(form.deliveryAddress),
    logisticsProduct: form.logisticsProduct || '',
    logisticsProductNameSnapshot: form.logisticsProductNameSnapshot || orderRow.logisticsProductNameSnapshot || '',
    logisticsProductSnapshotCode: form.logisticsProduct ? (form.logisticsProductSnapshotCode || orderRow.logisticsProductSnapshotCode || '') : '',
    status: 'pending_push',
    remark: form.remark || '',
    pushTime: '',
    finalShipTime: '',
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
    DELIVERY_NOTICE_STORAGE_KEY,
    readMockRows(DELIVERY_NOTICE_STORAGE_KEY, []).filter((item) => item.id !== noticeId),
  );
}

function createVirtualDeliveryNotice(orderRow, form, activeLines, noticeNo) {
  const stamp = nowStamp();
  const shippedLines = activeLines.map((line) => enrichNoticeLine({
    ...line,
    shippedQty: Number(line.notifyQty || 0),
  }));

  const notice = persistNotice({
    id: `notice-${Date.now()}`,
    noticeNo,
    sourceOrderId: orderRow.id,
    sourceOrderNo: orderRow.orderNo,
    customer: orderRow.customer,
    customerNameSnapshot: orderRow.customerNameSnapshot,
    customerSnapshotCode: orderRow.customerSnapshotCode,
    warehouse: orderRow.warehouse,
    warehouseNameSnapshot: orderRow.warehouseNameSnapshot,
    warehouseSnapshotCode: orderRow.warehouseSnapshotCode,
    deliveryMode: 'virtual',
    shipMethod: form.shipMethod || 'logistics',
    deliveryAddress: normalizeAddressValue(form.deliveryAddress),
    logisticsProduct: form.logisticsProduct || '',
    logisticsProductNameSnapshot: form.logisticsProductNameSnapshot || orderRow.logisticsProductNameSnapshot || '',
    logisticsProductSnapshotCode: form.logisticsProduct ? (form.logisticsProductSnapshotCode || orderRow.logisticsProductSnapshotCode || '') : '',
    status: 'shipped',
    remark: form.remark || '',
    pushTime: '',
    finalShipTime: stamp,
    pushFailReason: '',
    creator: '当前用户',
    createdAt: stamp,
    lines: shippedLines,
  });

  const outbound = generateOutboundFromNotice(loadNoticeById(notice.id) || notice);

  if (!outbound) {
    removeNoticeById(notice.id);
    throw new Error('虚拟出库生成出库单失败，未创建通知单');
  }

  occupyOrderLines(orderRow, shippedLines);
  substituteOrderOccupancy(loadOrderById(orderRow.id) || orderRow, shippedLines);

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
      status: 'pending_ship',
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
      status: 'pending_ship',
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
  return persistNotice({ ...row, status: 'pending_ship' });
}

export function clampMockLineShip(value, notifyQty) {
  const max = Number(notifyQty || 0);
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.min(num, max);
}

export function applyMockShip(row, payload) {
  const orderRow = loadOrderById(row.sourceOrderId);
  if (!orderRow) throw new Error('来源销售订单不存在');

  if (payload.zeroShip) {
    applyCancelNotice({ ...row, cancelReason: row.cancelReason || '仓库零出' }, row.cancelReason || '仓库零出');
    return loadNoticeById(row.id);
  }

  const nextLines = row.lines.map((line, index) => {
    const notifyQty = Number(line.notifyQty || 0);
    const shippedQty = clampMockLineShip(payload.lineShipments?.[index] ?? line.shippedQty ?? 0, notifyQty);
    return enrichNoticeLine({
      ...line,
      shippedQty,
    });
  });

  const shippedTotal = nextLines.reduce((sum, line) => sum + Number(line.shippedQty || 0), 0);
  if (shippedTotal <= 0) {
    throw new Error('请填写实出数量，或勾选零出');
  }

  const trackingNo = `MOCK${Date.now().toString().slice(-8)}`;
  const notice = {
    ...row,
    status: 'shipped',
    lines: nextLines,
    finalShipTime: nowStamp(),
    trackingNo,
  };

  generateOutboundFromNotice(notice);
  substituteOrderOccupancy(orderRow, nextLines);
  return loadNoticeById(row.id);
}

export function createMockDeliveryNotice(orderRow) {
  const form = buildNoticeFormFromOrder(orderRow);
  const { order } = createDeliveryNotice(orderRow, form);
  return order;
}

export function updateNoticeRemark(row, remark) {
  return persistNotice({ ...row, remark });
}
