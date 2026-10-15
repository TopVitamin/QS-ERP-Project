/**
 * 独立站订单逻辑：Mock 存储、状态与操作矩阵、审核占库与释放、自动推送/重试、
 * 仓库回传与人工确认、Shopify 回写与重新回写、复制新单与 Mock 拉取/导入。
 *
 * 口径依据：《独立站订单主PRD》§6.1～§6.5、R02～R23；《独立站订单前端Demo版PRD_弹窗与Mock》§2～§5。
 * 状态为三维：`documentStatus`（单据）、`warehouseStatus`（仓库执行）、`writeBackStatus`（Shopify 回写）。
 * 兼容旧版单一 `status` 字段（加载时迁移）。「草稿」在页面展示为「待提交」。
 */
import { skuOptions } from '../data/masterData.js';
import { computeLineTaxMetrics, computeLinesTotals, nowStamp } from './format.js';
import { nextDocumentNo } from './documentNo.js';
import { readMockRows, upsertMockRow, writeMockRows } from './mockStorage.js';
import {
  getAvailableStock,
  getReservationRemaining,
  postStockEntries,
  reserveStockEntries,
} from './inventoryStockLogic.js';
import { captureSalesDocumentNames, loadRowsWithNameSnapshots, normalizeRowsWithNameSnapshots } from './documentNameSnapshots.js';
import { loadAllOutbounds, persistOutbound, simulateFinanceErpPush } from './salesOutboundLogic.js';
import { PUSH_EXCEPTION_STORAGE_KEY, pushExceptionSeeds } from '../data/pushExceptionData.js';

export const SHOPIFY_ORDER_STORAGE_KEY = 'qs-erp:shopify-orders:v1';

/** 独立站统一使用跨境电商2C通用客户，不按消费者建档案（主 PRD R06）；单据按快照组合展示。 */
export const SHOPIFY_GENERIC_CUSTOMER = { code: 'CUS000030', name: '跨境电商2C通用客户' };

/** 单据状态（维度一）；「草稿」展示为「待提交」（SAL-FR08）。 */
export const shopifyDocumentStatusLabels = {
  draft: '待提交',
  pending: '待审核',
  approved: '已审核',
  completed: '已完结',
  cancelled: '已取消',
};

export const shopifyDocumentStatusTones = {
  draft: 'text-erp-warning',
  pending: 'text-erp-info',
  approved: 'text-erp-info',
  completed: 'text-erp-success',
  cancelled: 'text-erp-danger',
};

export const shopifyDocumentStatusBadgeTones = {
  draft: 'warning',
  pending: 'info',
  approved: 'info',
  completed: 'success',
  cancelled: 'danger',
};

/** 仓库执行状态（维度二）；与通知单推送/执行语义对齐。 */
export const shopifyWarehouseStatusLabels = {
  not_pushed: '未推送',
  pushing: '推送中',
  push_failed: '推送失败',
  pending_ship: '待发货',
  cancelling: '取消中',
  shipped: '已发货',
};

export const shopifyWarehouseStatusTones = {
  not_pushed: 'text-erp-muted',
  pushing: 'text-erp-info',
  push_failed: 'text-erp-danger',
  pending_ship: 'text-erp-info',
  cancelling: 'text-erp-warning',
  shipped: 'text-erp-success',
};

export const shopifyWarehouseStatusBadgeTones = {
  not_pushed: 'neutral',
  pushing: 'info',
  push_failed: 'danger',
  pending_ship: 'info',
  cancelling: 'warning',
  shipped: 'success',
};

/** @deprecated 使用 shopifyDocumentStatusLabels；保留列表筛选项兼容。 */
export const shopifyOrderStatusLabels = shopifyDocumentStatusLabels;
export const shopifyOrderStatusTones = shopifyDocumentStatusTones;
export const shopifyOrderStatusBadgeTones = shopifyDocumentStatusBadgeTones;

const LEGACY_COMPOSITE_STATUS_MAP = {
  draft: { documentStatus: 'draft', warehouseStatus: 'not_pushed' },
  pending: { documentStatus: 'pending', warehouseStatus: 'not_pushed' },
  approved: { documentStatus: 'approved', warehouseStatus: 'pushing' },
  push_failed: { documentStatus: 'approved', warehouseStatus: 'push_failed' },
  pending_ship: { documentStatus: 'approved', warehouseStatus: 'pending_ship' },
  cancelling: { documentStatus: 'approved', warehouseStatus: 'cancelling' },
  shipped: { documentStatus: 'completed', warehouseStatus: 'shipped' },
  cancelled: { documentStatus: 'cancelled', warehouseStatus: 'not_pushed' },
};

const RETIRED_WAREHOUSE_STATUSES = new Set(['zero_exec', 'na']);

export function resolveShopifyOrderStatuses(row = {}) {
  let documentStatus;
  let warehouseStatus;
  if (row.documentStatus && row.warehouseStatus) {
    documentStatus = row.documentStatus;
    warehouseStatus = row.warehouseStatus;
  } else {
    const legacy = row.status;
    const mapped = LEGACY_COMPOSITE_STATUS_MAP[legacy];
    if (!mapped) {
      documentStatus = legacy || 'draft';
      warehouseStatus = 'not_pushed';
    } else if (legacy === 'cancelled') {
      documentStatus = 'cancelled';
      warehouseStatus = 'not_pushed';
    } else {
      ({ documentStatus, warehouseStatus } = mapped);
    }
  }
  if (documentStatus === 'cancelled') {
    warehouseStatus = 'not_pushed';
  } else if (RETIRED_WAREHOUSE_STATUSES.has(warehouseStatus)) {
    warehouseStatus = 'not_pushed';
  }
  return { documentStatus, warehouseStatus };
}

function withShopifyStatuses(row, { documentStatus, warehouseStatus }) {
  return { ...row, documentStatus, warehouseStatus, status: documentStatus };
}

export const shopifySourceTypeLabels = { api: '接口拉取', import: '人工导入', copy: '复制生成' };
export const shopifyWriteBackStatusLabels = { unwritten: '未回写', written: '已回写', failed: '回写失败' };
export const shopifyWriteBackContentLabels = { shipment: '发货结果与运单', cancel: '取消结果' };
export const shopifyCancelMethodLabels = {
  cancel_audit: '取消审核（终止）',
  apply_cancel: '申请取消（仓库确认）',
  zero_execution: '整单零执行取消',
};
export const shopifyCancelPurposeLabels = { terminate: '终止订单', re_execute: '调整后重新执行' };
export const shopifyPushFailReasonMock = '仓库接口超时（演示数据）';
export const shopifyWriteBackFailReasonMock = 'Shopify接口超时（演示数据）';
export const SHOPIFY_MOCK_WAYBILL_NO = 'SF1234567890';

// —— 行与单头 ——

export function enrichShopifyOrderLine(line = {}) {
  const sku = skuOptions.find((item) => item.value === line.product) || {};
  const quantity = Number(line.quantity || 0);
  const shippedQty = Number(line.shippedQty || 0);
  const metrics = computeLineTaxMetrics({ ...line, quantity });
  return {
    ...line,
    productCode: line.productCode || sku.skuCode || line.product || '',
    barcode: line.barcode || sku.barcode || '',
    productName: line.productName || sku.productName || '',
    unit: line.unit || sku.unit || '',
    quantity,
    shippedQty,
    diffQty: Math.max(0, quantity - shippedQty),
    price: line.price === '' || line.price == null ? '' : Number(line.price),
    taxRate: line.taxRate ?? '',
    netPrice: metrics.netUnit,
    grossAmount: metrics.grossAmount,
    netAmount: metrics.netAmount,
    taxAmount: metrics.taxAmount,
  };
}

export function refreshShopifyOrderLines(lines = []) {
  return lines.map(enrichShopifyOrderLine);
}

export function normalizeShopifyOrderRow(row) {
  const lines = refreshShopifyOrderLines(row.lines || []);
  const totals = computeLinesTotals(lines);
  const totalShippedQty = lines.reduce((sum, line) => sum + Number(line.shippedQty || 0), 0);
  const { documentStatus, warehouseStatus } = resolveShopifyOrderStatuses(row);
  return {
    ...row,
    lines,
    documentStatus,
    warehouseStatus,
    status: documentStatus,
    amount: totals.grossAmount,
    taxAmount: totals.taxAmount,
    netAmount: totals.netAmount,
    totalOrderQty: totals.quantity,
    totalShippedQty,
    diffQty: Math.max(0, totals.quantity - totalShippedQty),
    currency: row.currency || '人民币',
    customerNameSnapshot: row.customerNameSnapshot || SHOPIFY_GENERIC_CUSTOMER.name,
    writeBackStatus: row.writeBackStatus || 'unwritten',
    updatedAt: row.updatedAt || row.createdAt || nowStamp(),
  };
}

export function persistShopifyOrder(row) {
  const previous = readMockRows(SHOPIFY_ORDER_STORAGE_KEY, []).find((item) => item.id === row.id) || null;
  const next = normalizeShopifyOrderRow(captureSalesDocumentNames(row, { previous }));
  upsertMockRow(SHOPIFY_ORDER_STORAGE_KEY, next);
  return next;
}

/** 单据集合读取：按主数据补齐客户/仓库/物流名称快照（历史快照保留，不随主数据实时变化）。 */
export function loadAllShopifyOrders(seed = []) {
  return loadRowsWithNameSnapshots(SHOPIFY_ORDER_STORAGE_KEY, seed, captureSalesDocumentNames).map(normalizeShopifyOrderRow);
}

/** 列表页 normalizeRows：补齐名称快照与金额、数量等展示字段（稳定引用，供订阅 effect 使用）。 */
export function normalizeShopifyRows(rows = []) {
  return normalizeRowsWithNameSnapshots(rows, captureSalesDocumentNames).map(normalizeShopifyOrderRow);
}

export function loadShopifyOrderById(id, seed = []) {
  if (!id) return null;
  return loadAllShopifyOrders(seed).find((item) => item.id === id) || null;
}

/** 推送异常「推送电商平台」按单据编号定位本单（供跳转与同步处理状态）。 */
export function loadShopifyOrderByNo(orderNo, seed = []) {
  if (!orderNo) return null;
  return loadAllShopifyOrders(seed).find((item) => item.orderNo === orderNo) || null;
}

export function deleteShopifyOrderById(id) {
  const rows = readMockRows(SHOPIFY_ORDER_STORAGE_KEY, []).filter((item) => item.id !== id);
  writeMockRows(SHOPIFY_ORDER_STORAGE_KEY, rows);
  return rows;
}

function appendLogs(row, entries) {
  return { ...row, operationLogs: [...(row.operationLogs || []), ...entries] };
}

function buildLogEntry({ action, remark, time = nowStamp(), operator = '当前用户' }) {
  return { id: `${action}-${time}-${Math.random().toString(16).slice(2, 6)}`, time, operator, action, remark };
}

// —— 状态—功能矩阵（主 PRD §6.4；页面按钮按此渲染，不满足直接不展示）——

export function canEditShopifyOrder(row) {
  return row.documentStatus === 'draft';
}

export const canSubmitShopifyOrder = canEditShopifyOrder;
export const canDeleteShopifyOrder = canEditShopifyOrder;

export function canApproveShopifyOrder(row) {
  return row.documentStatus === 'pending';
}

export const canWithdrawShopifyOrder = canApproveShopifyOrder;

export function canRetryPushShopifyOrder(row) {
  return row.documentStatus === 'approved' && row.warehouseStatus === 'push_failed';
}

export function canCancelAuditShopifyOrder(row) {
  if (row.documentStatus !== 'approved') return false;
  return ['not_pushed', 'pushing', 'push_failed'].includes(row.warehouseStatus);
}

export function canApplyCancelShopifyOrder(row) {
  return row.documentStatus === 'approved' && row.warehouseStatus === 'pending_ship';
}

export function canManualConfirmShopifyOrder(row) {
  return manualConfirmTypesForOrder(row).length > 0;
}

export function canCopyShopifyOrder(row) {
  return row.documentStatus === 'cancelled';
}

export function canRewriteShopifyOrder(row) {
  return (row.documentStatus === 'completed' || row.documentStatus === 'cancelled') && row.writeBackStatus === 'failed';
}

/** Demo 入口：审核后未自动推进（演示开关关闭）时的「模拟推送成功（Mock）」。 */
export function canMockPushShopifyOrder(row) {
  return row.documentStatus === 'approved' && ['not_pushed', 'pushing'].includes(row.warehouseStatus);
}

/** Demo 入口：待发货/取消中的「模拟仓库回传（Mock）」「模拟仓库回执（Mock）」。 */
export function canMockCallbackShopifyOrder(row) {
  return row.documentStatus === 'approved' && ['pending_ship', 'cancelling'].includes(row.warehouseStatus);
}

/** 人工确认弹窗可选类型（主 PRD §6.4；按单据+仓库执行维度）。 */
export function manualConfirmTypesForOrder(row) {
  if (row.documentStatus !== 'approved') return [];
  if (['not_pushed', 'pushing', 'push_failed'].includes(row.warehouseStatus)) return ['accept'];
  if (row.warehouseStatus === 'pending_ship') return ['finish'];
  if (row.warehouseStatus === 'cancelling') return ['cancel_result'];
  return [];
}

/** @deprecated 使用 manualConfirmTypesForOrder */
export function manualConfirmTypesForStatus(status) {
  if (status === 'approved') return ['accept'];
  if (status === 'pending_ship') return ['finish'];
  if (status === 'cancelling') return ['cancel_result'];
  return [];
}

export const manualConfirmTypeLabels = {
  accept: '确认接单',
  finish: '执行结束',
  cancel_result: '取消结果',
};

// —— 提交、审核占库与释放（R10～R12、R19）——

/** 审核前按「发货逻辑仓＋商品」汇总校验可用库存（R12：同商品多行按汇总）。 */
export function findShopifyOrderShortages(row) {
  if (!row.warehouse) return [];
  const requested = new Map();
  const lineMeta = new Map();
  for (const line of row.lines || []) {
    const product = line.product;
    if (!product) continue;
    requested.set(product, (requested.get(product) || 0) + Number(line.quantity || 0));
    if (!lineMeta.has(product)) lineMeta.set(product, line);
  }

  const shortages = [];
  for (const [product, quantity] of requested) {
    const available = getAvailableStock(row.warehouse, product);
    if (quantity > available) {
      const meta = lineMeta.get(product) || {};
      shortages.push({
        product,
        productCode: meta.productCode || product,
        productName: meta.productName || '',
        required: quantity,
        available,
        shortage: quantity - available,
      });
    }
  }
  return shortages;
}

/** 审核失败文案：列出数量不足的发货逻辑仓与各 SKU 的需要/可用/缺（列表 Demo PRD §8）。 */
export function formatShopifyOrderShortageError(row, shortages = []) {
  if (!shortages.length) return '发货逻辑仓可用库存不足，审核失败';
  const warehouseLabel = row.warehouse
    ? `${row.warehouse}${row.warehouseNameSnapshot ? ` ${row.warehouseNameSnapshot}` : ''}`
    : '发货仓库';
  const details = shortages.map((item) => `${item.productCode}${item.productName ? ` ${item.productName}` : ''}：需要 ${item.required}，可用 ${item.available}，缺 ${item.shortage}`);
  const maxItems = 3;
  const shown = details.slice(0, maxItems).join('；');
  const more = details.length > maxItems ? `；另有 ${details.length - maxItems} 个商品库存不足` : '';
  return `${warehouseLabel}可用库存不足，审核失败：${shown}${more}`;
}

export function validateShopifyOrderForSubmit(row) {
  if (row.documentStatus !== 'draft') return `当前单据状态为${shopifyDocumentStatusLabels[row.documentStatus] || row.documentStatus}，不可提交`;
  if (!row.warehouse) return '请先选定发货仓库';
  if (!row.logisticsProduct) return '请先选定物流服务产品';
  if (!row.shopifyOrderNo || !row.lines?.length || !row.receiverName) return '单据来源内容不完整，请处理后重试';
  return null;
}

function releaseShopifyOrderReservations(row) {
  const entries = (row.lines || []).map((line) => ({
    logicalWarehouse: row.warehouse,
    product: line.product,
    releaseReserved: Math.min(
      Number(line.quantity || 0),
      getReservationRemaining({
        logicalWarehouse: row.warehouse,
        product: line.product,
        sourceNo: row.orderNo,
        sourceLineNo: line.id,
      }),
    ),
    reservationSourceNo: row.orderNo,
    reservationSourceLineNo: line.id,
  })).filter((entry) => entry.releaseReserved > 0);
  if (!entries.length) return { released: 0 };
  try {
    postStockEntries(entries, {
      eventType: 'release',
      sourceType: '独立站订单',
      sourceNo: row.orderNo,
      businessType: '独立站订单取消释放',
      reservationSourceNo: row.orderNo,
      operator: '当前用户',
    });
    return { released: entries.length };
  } catch (error) {
    return { error: error.message || '释放占库失败，操作未完成' };
  }
}

/** 保存选仓选物流（弹窗含备注；批量只含仓库与物流）。 */
export function applyShopifyOrderWarehouseAndLogistics(row, { warehouse, logisticsProduct, remark }) {
  const stamp = nowStamp();
  const next = appendLogs({
    ...row,
    warehouse,
    logisticsProduct,
    remark: remark === undefined ? row.remark : remark,
    updatedAt: stamp,
    updater: '当前用户',
  }, [buildLogEntry({
    action: '选仓选物流',
    remark: `发货仓库 ${warehouse}${row.warehouseNameSnapshot ? ` ${row.warehouseNameSnapshot}` : ''}；物流服务产品 ${logisticsProduct}`,
    time: stamp,
  })]);
  return persistShopifyOrder(next);
}

export function applyBatchShopifyOrderWarehouseAndLogistics(rows = [], { warehouse, logisticsProduct }) {
  return rows.map((row) => applyShopifyOrderWarehouseAndLogistics(row, { warehouse, logisticsProduct, remark: row.remark }));
}

export function applySubmitShopifyOrder(row) {
  const stamp = nowStamp();
  return persistShopifyOrder(withShopifyStatuses({
    ...row,
    submittedAt: stamp,
    submitter: '当前用户',
    updatedAt: stamp,
    updater: '当前用户',
  }, { documentStatus: 'pending', warehouseStatus: 'not_pushed' }));
}

export function applyWithdrawShopifyOrder(row, returnComment) {
  const stamp = nowStamp();
  return persistShopifyOrder(withShopifyStatuses({
    ...row,
    returnComment,
    returnedAt: stamp,
    returnOperator: '当前用户',
    updatedAt: stamp,
    updater: '当前用户',
  }, { documentStatus: 'draft', warehouseStatus: 'not_pushed' }));
}

export function applyApproveShopifyOrder(row) {
  const shortages = findShopifyOrderShortages(row);
  if (shortages.length) return { error: formatShopifyOrderShortageError(row, shortages) };
  try {
    reserveStockEntries(
      (row.lines || []).map((line) => ({
        logicalWarehouse: row.warehouse,
        product: line.product,
        quantity: Number(line.quantity || 0),
        sourceLineNo: line.id,
      })),
      { sourceType: '独立站订单', sourceNo: row.orderNo, operator: '当前用户' },
    );
  } catch (error) {
    return { error: error.message || '预占发货仓库库存失败，审核未完成' };
  }
  const stamp = nowStamp();
  return {
    row: persistShopifyOrder(withShopifyStatuses({
      ...row,
      auditor: '当前用户',
      auditTime: stamp,
      pushTime: stamp,
      lastProcessTime: stamp,
      updatedAt: stamp,
      updater: '当前用户',
    }, { documentStatus: 'approved', warehouseStatus: 'pushing' })),
  };
}

// —— 推送仓库（R13；Demo 以 Mock 演示成功/失败）——

export function applyPushSuccessShopifyOrder(row, { operator = '系统' } = {}) {
  const stamp = nowStamp();
  return persistShopifyOrder(appendLogs(withShopifyStatuses({
    ...row,
    lastProcessTime: stamp,
    updatedAt: stamp,
    updater: operator,
  }, { documentStatus: 'approved', warehouseStatus: 'pending_ship' }), [buildLogEntry({ action: '推送仓库', remark: '推送成功，等待仓库发货结果', time: stamp, operator })]));
}

export function applyPushFailShopifyOrder(row) {
  const stamp = nowStamp();
  return persistShopifyOrder(appendLogs(withShopifyStatuses({
    ...row,
    pushTime: stamp,
    pushFailReason: shopifyPushFailReasonMock,
    lastProcessTime: stamp,
    updatedAt: stamp,
    updater: '系统',
  }, { documentStatus: 'approved', warehouseStatus: 'push_failed' }), [buildLogEntry({ action: '推送失败', remark: shopifyPushFailReasonMock, time: stamp, operator: '系统' })]));
}

export function applyRetryPushShopifyOrder(row, { shouldFail = false } = {}) {
  if (shouldFail) return applyPushFailShopifyOrder(row);
  const stamp = nowStamp();
  return persistShopifyOrder(appendLogs(withShopifyStatuses({
    ...row,
    pushFailReason: row.pushFailReason || '',
    lastProcessTime: stamp,
    updatedAt: stamp,
    updater: '当前用户',
  }, { documentStatus: 'approved', warehouseStatus: 'pending_ship' }), [buildLogEntry({ action: '重试推送', remark: '人工重试推送成功', time: stamp })]));
}

/** 审核通过后约 1 秒自动模拟推送成功（弹窗与Mock §5.2；演示开关关闭时不调用）。 */
export function scheduleShopifyOrderMockPush(orderId, { delay = 1000, loadSeed = [] } = {}) {
  if (typeof window === 'undefined') return;
  window.setTimeout(() => {
    const latest = loadShopifyOrderById(orderId, loadSeed);
    if (!latest || latest.documentStatus !== 'approved' || latest.warehouseStatus !== 'pushing') return;
    applyPushSuccessShopifyOrder(latest);
  }, delay);
}

// —— 取消审核、申请取消与仓库回执（R19～R21）——

export function applyCancelAuditShopifyOrder(row, { purpose, reason }) {
  const release = releaseShopifyOrderReservations(row);
  if (release.error) return { error: release.error };
  const stamp = nowStamp();
  const base = appendLogs({
    ...row,
    cancelPurpose: purpose,
    cancelReason: reason,
    cancelTime: stamp,
    cancelOperator: '当前用户',
    lastProcessTime: stamp,
    updatedAt: stamp,
    updater: '当前用户',
  }, [buildLogEntry({
    action: '取消审核',
    remark: `${shopifyCancelPurposeLabels[purpose] || purpose}：${reason}`,
    time: stamp,
  })]);

  if (purpose === 'terminate') {
    return {
      row: persistShopifyOrder(withShopifyStatuses({
        ...base,
        cancelMethod: 'cancel_audit',
        cancelPurpose: '',
      }, { documentStatus: 'cancelled', warehouseStatus: 'not_pushed' })),
      released: release.released,
    };
  }
  return { row: persistShopifyOrder(withShopifyStatuses({ ...base }, { documentStatus: 'draft', warehouseStatus: 'not_pushed' })), released: release.released };
}

export function applyApplyCancelShopifyOrder(row, { purpose, reason }) {
  const stamp = nowStamp();
  return persistShopifyOrder(appendLogs(withShopifyStatuses({
    ...row,
    cancelPurpose: purpose,
    cancelReason: reason,
    lastProcessTime: stamp,
    updatedAt: stamp,
    updater: '当前用户',
  }, { documentStatus: 'approved', warehouseStatus: 'cancelling' }), [buildLogEntry({
    action: '申请取消',
    remark: `已向仓库申请取消（${shopifyCancelPurposeLabels[purpose] || purpose}）：${reason}`,
    time: stamp,
  })]));
}

/** 仓库回执（模拟回传或人工确认取消结果）：同意按取消用途落已取消/待提交；拒绝恢复待发货。 */
export function applyWarehouseCancelResultShopifyOrder(row, { agree, writeBackFailed = false, operator = '当前用户' }) {
  const stamp = nowStamp();
  if (!agree) {
    return {
      row: persistShopifyOrder(appendLogs(withShopifyStatuses({
        ...row,
        cancelPurpose: '',
        cancelReason: '',
        lastProcessTime: stamp,
        updatedAt: stamp,
        updater: operator,
      }, { documentStatus: 'approved', warehouseStatus: 'pending_ship' }), [buildLogEntry({ action: '仓库拒绝取消', remark: '仓库拒绝取消，恢复待发货继续执行', time: stamp, operator })])),
    };
  }

  const release = releaseShopifyOrderReservations(row);
  if (release.error) return { error: release.error };
  const purpose = row.cancelPurpose || 'terminate';

  if (purpose === 're_execute') {
    return {
      row: persistShopifyOrder(appendLogs(withShopifyStatuses({
        ...row,
        cancelPurpose: '',
        lastProcessTime: stamp,
        updatedAt: stamp,
        updater: operator,
      }, { documentStatus: 'draft', warehouseStatus: 'not_pushed' }), [buildLogEntry({ action: '仓库同意取消', remark: '仓库同意取消，按调整后重新执行回到待提交', time: stamp, operator })])),
      released: release.released,
    };
  }

  const cancelled = applyWriteBackToShopify(withShopifyStatuses({
    ...row,
    cancelMethod: 'apply_cancel',
    cancelPurpose: '',
    cancelTime: stamp,
    cancelOperator: operator,
    lastProcessTime: stamp,
    updatedAt: stamp,
    updater: operator,
  }, { documentStatus: 'cancelled', warehouseStatus: 'not_pushed' }), { content: 'cancel', shouldFail: writeBackFailed, operator });

  return {
    row: persistShopifyOrder(appendLogs(cancelled, [
      buildLogEntry({ action: '仓库同意取消', remark: '仓库同意取消，订单终止并释放占库', time: stamp, operator }),
    ])),
    released: release.released,
  };
}

// —— 整单发货、整单零执行与回写（R15、R16、R18）——

/** 回写状态与时间写入单头；失败时同步推送异常「推送电商平台」记录（弹窗与Mock §5.3）。 */
export function applyWriteBackToShopify(row, { content, shouldFail = false, operator = '系统' }) {
  const stamp = nowStamp();
  const failed = Boolean(shouldFail);
  const next = {
    ...row,
    writeBackStatus: failed ? 'failed' : 'written',
    writeBackContent: content,
    writeBackTime: stamp,
    writeBackFailReason: failed ? shopifyWriteBackFailReasonMock : (row.writeBackFailReason || ''),
    lastProcessTime: stamp,
    updatedAt: stamp,
    updater: operator,
  };
  syncPlatformExceptionFromWriteBack(next, { failed, stamp, content });
  return appendLogs(next, [buildLogEntry({
    action: content === 'shipment' ? '回写Shopify' : '回写取消结果',
    remark: failed ? `回写失败：${shopifyWriteBackFailReasonMock}` : `已回写${shopifyWriteBackContentLabels[content]}`,
    time: stamp,
    operator,
  })]);
}

/** 重新回写（R18）：回写状态=回写失败时可用；成功同步推送异常记录置「已处理」。 */
export function applyRewriteShopifyOrder(row, { shouldFail = false } = {}) {
  if (row.writeBackStatus !== 'failed') return { error: '仅回写失败的订单可重新回写' };
  const next = applyWriteBackToShopify(row, {
    content: row.writeBackContent || (row.documentStatus === 'cancelled' ? 'cancel' : 'shipment'),
    shouldFail,
    operator: '当前用户',
  });
  return { row: persistShopifyOrder(next) };
}

/**
 * 推送异常「推送电商平台」记录同步：回写失败派生/更新为待处理，重新回写成功置已处理。
 * Demo 只同步本单号对应记录（推送异常页只读，主 PRD R18）。
 */
function syncPlatformExceptionFromWriteBack(row, { failed, stamp, content }) {
  const rows = readMockRows(PUSH_EXCEPTION_STORAGE_KEY, pushExceptionSeeds);
  const index = rows.findIndex((item) => item.tab === 'platform' && item.docNo === row.orderNo);
  if (!failed && index < 0) return;
  const entry = {
    id: `${row.id || row.orderNo}-writeback-${Date.now()}`,
    time: stamp,
    method: 'retry',
    result: failed ? 'failed' : 'success',
    operator: '当前用户',
    note: failed ? shopifyWriteBackFailReasonMock : '重新回写成功',
  };
  if (index < 0) {
    rows.unshift({
      id: `push-exception-platform-${row.id || row.orderNo}`,
      tab: 'platform',
      docType: 'shopify_order',
      docNo: row.orderNo,
      pushContent: content,
      failTime: stamp,
      failReason: shopifyWriteBackFailReasonMock,
      status: 'pending',
      records: [entry],
    });
  } else {
    const current = rows[index];
    rows[index] = {
      ...current,
      status: failed ? 'pending' : 'handled',
      failTime: stamp,
      failReason: failed ? shopifyWriteBackFailReasonMock : current.failReason,
      records: [...(current.records || []), entry],
    };
  }
  writeMockRows(PUSH_EXCEPTION_STORAGE_KEY, rows);
}

/** 本单关联的销售出库单（来源类型=独立站订单；生成或种子落库）。 */
export function listShopifyOrderOutbounds(row) {
  return loadAllOutbounds([]).filter((outbound) => (
    outbound.sourceType === 'shopify'
    && (outbound.sourceOrderId === row.id || outbound.sourceOrderNo === row.orderNo)
  ));
}

/** 整单发出回传（Mock）或人工确认执行结束：生成销售出库单并回写发货结果。 */
export function applyWholeOrderShippedShopifyOrder(row, { waybillNo, writeBackFailed = false, operator = '系统' } = {}) {
  const stamp = nowStamp();
  const lines = refreshShopifyOrderLines(row.lines || []).map((line) => ({
    ...line,
    shippedQty: Number(line.quantity || 0),
    diffQty: 0,
  }));

  let outbound = null;
  try {
    outbound = createShopifyOrderOutbound({ ...row, lines }, { actualOutboundTime: stamp, operator });
  } catch (error) {
    return { error: error.message || '生成销售出库单失败，回传未完成' };
  }
  if (outbound?.error) return outbound;

  const next = applyWriteBackToShopify(withShopifyStatuses({
    ...row,
    lines,
    waybillNo: waybillNo || row.waybillNo || SHOPIFY_MOCK_WAYBILL_NO,
    finalShipConfirmTime: stamp,
    lastProcessTime: stamp,
    updatedAt: stamp,
    updater: operator,
  }, { documentStatus: 'completed', warehouseStatus: 'shipped' }), { content: 'shipment', shouldFail: writeBackFailed, operator });

  return { row: persistShopifyOrder(appendLogs(next, [buildLogEntry({
    action: '执行确认',
    remark: `${operator === '系统' ? '仓库回传整单发出' : '人工确认执行结束'}，运单号 ${waybillNo || SHOPIFY_MOCK_WAYBILL_NO}；生成销售出库单 ${outbound?.outboundNo || ''}`,
    time: stamp,
    operator,
  })])), outbound };
}

function buildShopifyOutboundLines(row) {
  return (row.lines || []).map((line, index) => ({
    id: `shopify-outbound-${row.id}-line-${index + 1}`,
    sourceOrderLineId: line.id,
    product: line.product,
    productCode: line.productCode,
    barcode: line.barcode,
    productName: line.productName,
    unit: line.unit,
    quantity: Number(line.quantity || 0),
    price: line.price,
    taxRate: line.taxRate,
  }));
}

/**
 * 生成销售出库单（来源=本单、金额沿用；主 PRD R15）。
 * Demo 说明：原型销售出库单当前为只读结果单（仅已审核），故此处直接生成已审核出库单并
 * 按销售出库单模块的记账入口扣减即时库存与对应预占；正式流程中人工确认执行结束先生成草稿，
 * 走 B5 销售出库单的提交审核链（R23）。
 */
export function createShopifyOrderOutbound(row, { actualOutboundTime = nowStamp(), operator = '系统' } = {}) {
  const existing = listShopifyOrderOutbounds(row);
  if (existing.length) return existing[0];

  const posted = (row.lines || []).map((line) => {
    const quantity = Number(line.quantity || 0);
    const reservationRemaining = getReservationRemaining({
      logicalWarehouse: row.warehouse,
      product: line.product,
      sourceNo: row.orderNo,
      sourceLineNo: line.id,
    });
    if (reservationRemaining === 0) {
      if (getAvailableStock(row.warehouse, line.product) < quantity) {
        throw new Error(`逻辑仓${row.warehouse}商品${line.product}可用库存不足，不能生成出库结果`);
      }
      return { logicalWarehouse: row.warehouse, product: line.product, instantDelta: -quantity };
    }
    if (reservationRemaining < quantity) throw new Error(`来源订单商品${line.product}预占数量不足，不能生成出库结果`);
    return {
      logicalWarehouse: row.warehouse,
      product: line.product,
      instantDelta: -quantity,
      consumeReserved: quantity,
      reservationSourceNo: row.orderNo,
      reservationSourceLineNo: line.id,
    };
  });

  const existingNos = loadAllOutbounds([]).map((item) => item.outboundNo);
  const outboundNo = nextDocumentNo('XSCK', actualOutboundTime.slice(0, 10), existingNos);
  try {
    postStockEntries(posted, {
      eventType: 'result_out',
      sourceType: '销售出库单',
      sourceNo: outboundNo,
      businessType: '销售出库',
      reservationSourceNo: row.orderNo,
      operator,
      time: actualOutboundTime,
    });
  } catch (error) {
    return { error: error.message || '出库记账失败，回传未完成' };
  }

  const outbound = persistOutbound({
    id: `sales-outbound-shopify-${row.id}`,
    outboundNo,
    sourceType: 'shopify',
    sourceOrderId: row.id,
    sourceOrderNo: row.orderNo,
    customer: row.customer,
    customerNameSnapshot: row.customerNameSnapshot,
    customerSnapshotCode: row.customerSnapshot,
    warehouse: row.warehouse,
    warehouseNameSnapshot: row.warehouseNameSnapshot,
    warehouseSnapshotCode: row.warehouseSnapshotCode,
    currency: row.currency,
    auditStatus: 'approved',
    financeErpPushStatus: 'un_pushed',
    businessDate: actualOutboundTime.slice(0, 10),
    actualOutboundTime,
    pushTime: '',
    pushFailReason: '',
    remark: row.remark,
    auditor: '',
    auditTime: actualOutboundTime,
    creator: operator,
    createdAt: actualOutboundTime,
    updater: operator,
    lines: buildShopifyOutboundLines(row),
  });

  simulateFinanceErpPush(outbound.id);
  return outbound;
}

/** 整单零执行（回传或人工确认执行结束且实发为0）：按零出取消并回写取消结果。 */
export function applyZeroExecutionShopifyOrder(row, { writeBackFailed = false, operator = '系统' } = {}) {
  const release = releaseShopifyOrderReservations(row);
  if (release.error) return { error: release.error };
  const stamp = nowStamp();
  const lines = refreshShopifyOrderLines(row.lines || []).map((line) => ({
    ...line,
    shippedQty: 0,
    diffQty: Number(line.quantity || 0),
  }));

  const next = applyWriteBackToShopify(withShopifyStatuses({
    ...row,
    lines,
    cancelMethod: 'zero_execution',
    cancelReason: '',
    cancelTime: stamp,
    cancelOperator: '',
    finalShipConfirmTime: stamp,
    lastProcessTime: stamp,
    updatedAt: stamp,
    updater: operator,
  }, { documentStatus: 'cancelled', warehouseStatus: 'not_pushed' }), { content: 'cancel', shouldFail: writeBackFailed, operator });

  return {
    row: persistShopifyOrder(appendLogs(next, [buildLogEntry({
      action: '执行确认',
      remark: `${operator === '系统' ? '仓库回传整单零执行' : '人工确认执行结束（整单为0）'}，按零出取消订单并释放占库；不生成零数量出库单`,
      time: stamp,
      operator,
    })])),
    released: release.released,
  };
}

/** 人工确认·确认接单（R23）：视同仓库已接收，转待发货，不生成结果单。 */
export function applyManualConfirmAccept(row, { note = '' } = {}) {
  const stamp = nowStamp();
  return persistShopifyOrder(appendLogs(withShopifyStatuses({
    ...row,
    confirmBy: '当前用户',
    confirmAt: stamp,
    confirmContent: `${manualConfirmTypeLabels.accept}${note ? `：${note}` : ''}`,
    lastProcessTime: stamp,
    updatedAt: stamp,
    updater: '当前用户',
  }, { documentStatus: 'approved', warehouseStatus: 'pending_ship' }), [buildLogEntry({ action: '人工确认', remark: `${manualConfirmTypeLabels.accept}（演示数据）${note ? `：${note}` : ''}`, time: stamp })]));
}

// —— 复制新单、拉取与人工导入（R02～R05、R17）——

export function copyShopifyOrder(row, { creator = '当前用户' } = {}) {
  const stamp = nowStamp();
  const existingNos = loadAllShopifyOrders([]).map((item) => item.orderNo);
  const orderNo = nextDocumentNo('XSDD', stamp.slice(0, 10), existingNos);
  return persistShopifyOrder(withShopifyStatuses({
    ...row,
    id: `shopify-order-copy-${row.id}-${Date.now()}`,
    orderNo,
    sourceType: 'copy',
    warehouse: '',
    warehouseNameSnapshot: '',
    warehouseSnapshotCode: '',
    logisticsProduct: '',
    logisticsProductNameSnapshot: '',
    logisticsProductSnapshotCode: '',
    waybillNo: '',
    pushTime: '',
    pushFailReason: '',
    finalShipConfirmTime: '',
    lastProcessTime: '',
    writeBackStatus: 'unwritten',
    writeBackContent: '',
    writeBackTime: '',
    writeBackFailReason: '',
    cancelMethod: '',
    cancelReason: '',
    cancelTime: '',
    cancelOperator: '',
    cancelPurpose: '',
    auditor: '',
    auditTime: '',
    returnComment: '',
    returnedAt: '',
    returnOperator: '',
    confirmBy: '',
    confirmAt: '',
    confirmContent: '',
    submittedAt: '',
    submitter: '',
    creator,
    createdAt: stamp,
    updater: creator,
    updatedAt: stamp,
    operationLogs: [buildLogEntry({ action: '复制新单', remark: `由已取消订单 ${row.orderNo} 复制生成，仍挂同一Shopify来源单号`, time: stamp, operator: creator })],
    lines: refreshShopifyOrderLines(row.lines || []).map((line, index) => ({
      ...line,
      id: `${row.id}-copy-line-${index + 1}`,
      shippedQty: 0,
      diffQty: Number(line.quantity || 0),
    })),
  }, { documentStatus: 'draft', warehouseStatus: 'not_pushed' }));
}

function buildPulledOrder({ id, shopifyOrderNo, lines, receiver, createdAt, creator = '系统' }) {
  return normalizeShopifyOrderRow({
    id,
    orderNo: '',
    documentStatus: 'draft',
    warehouseStatus: 'not_pushed',
    customer: SHOPIFY_GENERIC_CUSTOMER.code,
    customerNameSnapshot: SHOPIFY_GENERIC_CUSTOMER.name,
    currency: '人民币',
    shopifyOrderNo,
    sourceType: 'api',
    receiverName: receiver.name,
    receiverPhone: receiver.phone,
    country: receiver.country,
    postalCode: receiver.postalCode,
    receiverAddress: receiver.address,
    warehouse: '',
    logisticsProduct: '',
    remark: '',
    creator,
    createdAt,
    updater: creator,
    updatedAt: createdAt,
    writeBackStatus: 'unwritten',
    lines,
  });
}

/**
 * Mock 拉取已付款订单（R02、R03）：仅已付款订单进入；按「来源系统＋来源单号」去重，
 * 重复拉取不重复建单。返回本次新增与被跳过的重复单号。
 */
export function pullPaidShopifyOrders({ loadSeed = [] } = {}) {
  const stamp = nowStamp();
  const existing = loadAllShopifyOrders(loadSeed);
  const existingNos = new Set(existing.map((item) => item.shopifyOrderNo));
  const usedOrderNos = existing.map((item) => item.orderNo);

  const incoming = [
    {
      shopifyOrderNo: '#1001',
      lines: [enrichShopifyOrderLine({ id: 'pulled-1001-line-1', product: 'SP0101030001', quantity: 1, price: 339, taxRate: '13' })],
      receiver: { name: '林示例', phone: '13900000001', country: '中国', postalCode: '200120', address: '上海市浦东新区示例路 18 号 2 单元 501' },
    },
    {
      shopifyOrderNo: '#1015',
      lines: [enrichShopifyOrderLine({ id: 'pulled-1015-line-1', product: 'SP0103030001', quantity: 2, price: 99, taxRate: '13' })],
      receiver: { name: '赵示例', phone: '13900000002', country: '中国', postalCode: '518000', address: '广东省深圳市南山区示例大道 6 号 3 栋 802' },
    },
    {
      shopifyOrderNo: '#1016',
      lines: [enrichShopifyOrderLine({ id: 'pulled-1016-line-1', product: 'SP0103020003', quantity: 3, price: 35, taxRate: '13' })],
      receiver: { name: '周示例', phone: '13900000003', country: '中国', postalCode: '100102', address: '北京市朝阳区示例街 12 号 5 层' },
    },
  ];

  const created = [];
  const skipped = [];
  const nextOrderNos = [...usedOrderNos];

  incoming.forEach((item, index) => {
    if (existingNos.has(item.shopifyOrderNo)) {
      skipped.push(item.shopifyOrderNo);
      return;
    }
    const orderNo = nextDocumentNo('XSDD', stamp.slice(0, 10), nextOrderNos);
    nextOrderNos.push(orderNo);
    const row = persistShopifyOrder({
      ...buildPulledOrder({
        id: `shopify-order-pulled-${Date.now()}-${index + 1}`,
        shopifyOrderNo: item.shopifyOrderNo,
        lines: item.lines,
        receiver: item.receiver,
        createdAt: stamp,
      }),
      orderNo,
      operationLogs: [buildLogEntry({ action: '拉取', remark: '自研接口拉取已付款订单（演示数据）', time: stamp, operator: '系统' })],
    });
    created.push(row);
  });

  return { created, skipped };
}

/** Mock 人工导入（R05、Demo 弹窗 §5.4）：生成 2 张待提交草稿，获取方式=人工导入。 */
export function importShopifyOrdersMock({ operator = '当前用户', loadSeed = [] } = {}) {
  const stamp = nowStamp();
  const existing = loadAllShopifyOrders(loadSeed);
  const usedOrderNos = existing.map((item) => item.orderNo);
  const importedSeeds = [
    {
      shopifyOrderNo: '#2001',
      lines: [enrichShopifyOrderLine({ id: 'import-2001-line-1', product: 'SP0103010001', quantity: 1, price: 189, taxRate: '13' })],
      receiver: { name: '吴示例', phone: '13900000004', country: '中国', postalCode: '518000', address: '广东省深圳市福田区示例路 99 号 A 座 1502' },
    },
    {
      shopifyOrderNo: '#2002',
      lines: [enrichShopifyOrderLine({ id: 'import-2002-line-1', product: 'SP0101010004', quantity: 2, price: 199, taxRate: '13' })],
      receiver: { name: '郑示例', phone: '13900000005', country: '中国', postalCode: '310000', address: '浙江省杭州市西湖区示例街 5 号 1 单元 601' },
    },
    {
      shopifyOrderNo: '#2003',
      lines: [enrichShopifyOrderLine({ id: 'import-2003-line-1', product: 'SP0101020004', quantity: 5, price: 39, taxRate: '13' })],
      receiver: { name: '孙示例', phone: '13900000006', country: '中国', postalCode: '510000', address: '广东省广州市天河区示例路 3 号 8 楼' },
    },
  ];

  const created = [];
  const nextOrderNos = [...usedOrderNos];
  importedSeeds.forEach((item, index) => {
    const orderNo = nextDocumentNo('XSDD', stamp.slice(0, 10), nextOrderNos);
    nextOrderNos.push(orderNo);
    created.push(persistShopifyOrder({
      ...buildPulledOrder({
        id: `shopify-order-import-${Date.now()}-${index + 1}`,
        shopifyOrderNo: item.shopifyOrderNo,
        lines: item.lines,
        receiver: item.receiver,
        createdAt: stamp,
        creator: operator,
      }),
      orderNo,
      sourceType: 'import',
      operationLogs: [buildLogEntry({ action: '人工导入', remark: '接口未覆盖订单人工导入（演示数据）', time: stamp, operator })],
    }));
  });

  return { created };
}

// —— 操作日志（推导 + 逐条留痕，倒序展示）——

function pushEntry(entries, { time, operator, action, remark }) {
  if (!time && !operator && !action) return;
  entries.push({ id: `${action}-${time || entries.length}`, time: time || '-', operator: operator || '-', action, remark: remark || '-' });
}

export function buildShopifyOrderOperationLogs(row) {
  const entries = [];
  const explicitLogs = row.operationLogs || [];
  // 显式留痕优先：运行时动作已写日志时，不再重复推导同一步骤（如推送、回写、人工确认）
  const hasExplicit = (actions) => explicitLogs.some((entry) => actions.includes(entry.action));
  pushEntry(entries, { time: row.createdAt, operator: row.creator, action: '创建', remark: row.sourceType === 'copy' ? '由已取消订单复制生成' : row.sourceType === 'import' ? '人工导入生成草稿' : '接口拉取生成草稿' });

  if (row.submittedAt && !hasExplicit(['提交'])) {
    pushEntry(entries, { time: row.submittedAt, operator: row.submitter || row.creator, action: '提交', remark: '提交审核' });
  }
  if (row.returnComment && !hasExplicit(['撤回'])) {
    pushEntry(entries, { time: row.returnedAt || row.updatedAt, operator: row.returnOperator || row.updater, action: '撤回', remark: row.returnComment });
  }
  if (row.auditTime && !hasExplicit(['审核'])) {
    pushEntry(entries, { time: row.auditTime, operator: row.auditor, action: '审核', remark: '审核通过并占库' });
  }
  if (row.pushTime && !hasExplicit(['推送仓库', '推送失败', '重试推送'])) {
    pushEntry(entries, { time: row.pushTime, operator: '系统', action: '推送仓库', remark: row.pushFailReason ? `推送失败：${row.pushFailReason}` : '推送仓库成功' });
  }
  if (row.finalShipConfirmTime && !hasExplicit(['执行确认'])) {
    pushEntry(entries, { time: row.finalShipConfirmTime, operator: row.updater, action: '执行确认', remark: row.cancelMethod === 'zero_execution' ? '仓库最终回传整单零执行' : '整单发出结果确认' });
  }
  if (row.cancelTime && !hasExplicit(['取消审核', '申请取消', '仓库同意取消', '仓库拒绝取消'])) {
    pushEntry(entries, { time: row.cancelTime, operator: row.cancelOperator || row.updater, action: row.documentStatus === 'cancelled' ? '取消' : '取消用途', remark: `${shopifyCancelMethodLabels[row.cancelMethod] || shopifyCancelPurposeLabels[row.cancelPurpose] || '取消'}${row.cancelReason ? `：${row.cancelReason}` : ''}` });
  }
  if (row.writeBackTime && !hasExplicit(['回写Shopify'])) {
    pushEntry(entries, {
      time: row.writeBackTime,
      operator: '系统',
      action: '回写Shopify',
      remark: row.writeBackStatus === 'failed'
        ? `回写失败：${row.writeBackFailReason || ''}`
        : `已回写${shopifyWriteBackContentLabels[row.writeBackContent] || ''}`,
    });
  }
  if (row.confirmAt && !hasExplicit(['人工确认'])) {
    pushEntry(entries, { time: row.confirmAt, operator: row.confirmBy, action: '人工确认', remark: row.confirmContent });
  }

  const merged = new Map();
  [...entries, ...explicitLogs].forEach((entry) => merged.set(entry.id, entry));
  return [...merged.values()].sort((left, right) => String(right.time).localeCompare(String(left.time)));
}
