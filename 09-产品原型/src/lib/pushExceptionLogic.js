/**
 * 推送异常逻辑：异常记录读取、处理记录排序、原单/商品跳转解析，以及业财重推后的记录同步。
 *
 * 口径依据：《推送异常主PRD》R04～R06、R09（处理状态自动变化、处理记录同源、原单跳转）
 * 与《推送异常前端Demo版PRD_弹窗与Mock》§3（跨页联动）。
 */
import {
  PUSH_EXCEPTION_STORAGE_KEY,
  pushExceptionSeeds,
} from '../data/pushExceptionData.js';
import { financeResultDocTypeLabels } from '../data/financeResultData.js';
import { products, PRODUCT_STORAGE_KEY } from '../data/productData.js';
import { receiptNotices } from '../data/receiptNoticeData.js';
import { purchaseReturnNotices } from '../data/purchaseReturnNoticeData.js';
import { salesDeliveryNotices } from '../data/salesDeliveryNoticeData.js';
import { salesReturnNotices } from '../data/salesReturnNoticeData.js';
import { readMockRows, writeMockRows } from './mockStorage.js';
import { loadOtherInboundRequestByNo } from './otherInboundRequestLogic.js';
import { loadOtherOutboundRequestByNo } from './otherOutboundRequestLogic.js';
import { NOTICE_STORAGE_KEY } from './purchaseOrderLogic.js';
import { RETURN_NOTICE_STORAGE_KEY as PURCHASE_RETURN_NOTICE_STORAGE_KEY } from './purchaseReturnLogic.js';
import { DELIVERY_NOTICE_STORAGE_KEY } from './salesOrderLogic.js';
import { RETURN_NOTICE_STORAGE_KEY as SALES_RETURN_NOTICE_STORAGE_KEY } from './salesReturnLogic.js';
import { loadTransferInNoticeByNo } from './transferInNoticeLogic.js';
import { loadTransferOutNoticeByNo } from './transferOutNoticeLogic.js';
import { loadShopifyOrderByNo } from './shopifyOrderLogic.js';
import { shopifyOrders } from '../data/shopifyOrderData.js';
import { skuOptions } from '../data/masterData.js';
import { resolveResultDocument } from './inventoryResultDocs.js';
import { nowStamp } from './format.js';
import { nextDocumentNo } from './documentNo.js';
import { postStockEntries } from './inventoryStockLogic.js';
import {
  enrichOutboundLine,
  loadAllOutbounds,
  persistOutbound,
  simulateFinanceErpPush,
} from './salesOutboundLogic.js';
import { salesOutbounds } from '../data/salesOutboundData.js';
import { loadDomesticOrderByNo, upsertDomesticOrder } from '../data/domesticOrderData.js';
import { loadCrossBorderOrderByNo, upsertCrossBorderOrder } from '../data/crossBorderOrderData.js';

export {
  PUSH_EXCEPTION_NOTE_MAX,
  PUSH_EXCEPTION_STORAGE_KEY,
  getPushExceptionColumns,
  getPushExceptionExportFields,
  getPushExceptionFilterFields,
  pushExceptionContentLabels,
  pushExceptionDocTypeLabels,
  pushExceptionInitialFilters,
  pushExceptionMethodLabels,
  pushExceptionResultLabels,
  pushExceptionResultTones,
  pushExceptionSeeds,
  pushExceptionSourceSystemLabels,
  pushExceptionStageLabels,
  pushExceptionStatusLabels,
  pushExceptionStatusTones,
  pushExceptionTabItems,
  pushExceptionTargetSystemLabels,
} from '../data/pushExceptionData.js';

export function loadPushExceptionRows() {
  return readMockRows(PUSH_EXCEPTION_STORAGE_KEY, pushExceptionSeeds);
}

/** 处理记录按处理时间倒序（同时间保持写入先后倒序），供处理记录弹窗展示。 */
export function listPushExceptionRecords(row) {
  return [...(row?.records || [])].sort((left, right) => String(right.time || '').localeCompare(String(left.time || '')));
}

// —— 原单跳转 ——

const noticeSources = [
  { label: '采购收货通知单', pageId: 'purchase-receipt-notice-detail', storageKey: NOTICE_STORAGE_KEY, seedRows: receiptNotices },
  { label: '采退发货通知单', pageId: 'purchase-return-notice-detail', storageKey: PURCHASE_RETURN_NOTICE_STORAGE_KEY, seedRows: purchaseReturnNotices },
  { label: '销售发货通知单', pageId: 'sales-delivery-notice-detail', storageKey: DELIVERY_NOTICE_STORAGE_KEY, seedRows: salesDeliveryNotices },
  { label: '销退收货通知单', pageId: 'sales-return-notice-detail', storageKey: SALES_RETURN_NOTICE_STORAGE_KEY, seedRows: salesReturnNotices },
];

const noticeLoaders = [
  { label: '调出通知单', pageId: 'inventory-transfer-out-notice-detail', load: loadTransferOutNoticeByNo },
  { label: '调入通知单', pageId: 'inventory-transfer-in-notice-detail', load: loadTransferInNoticeByNo },
  { label: '其他入库申请单', pageId: 'inventory-other-inbound-request-detail', load: loadOtherInboundRequestByNo },
  { label: '其他出库申请单', pageId: 'inventory-other-outbound-request-detail', load: loadOtherOutboundRequestByNo },
];

/**
 * 七类已审核结果单（推送财务ERP页签「结果单号」）：与业财结果单据页同口径定位结果单详情。
 * 口径依据：《推送异常主PRD》§4.2、AC09；复用 `inventoryResultDocs.resolveResultDocument`。
 */
const resultDocTypeLabels = new Set(Object.values(financeResultDocTypeLabels));

/**
 * 按单据类型＋单据编号定位原单（推送外部仓库／推送电商平台页签的「单据编号」、
 * 推送财务ERP页签的「结果单号」）。
 * 找不到返回 null，由页面提示「单据不存在或不可访问」并停留列表（主PRD R09）。
 * 独立站订单页已接入原型（2026-10-15）：按单号定位后直达订单详情。
 */
export function resolveExceptionSourceDocument(docTypeLabel, docNo) {
  if (!docTypeLabel || !docNo) return null;
  if (docTypeLabel === '独立站订单') {
    const row = loadShopifyOrderByNo(docNo, shopifyOrders);
    return row ? { pageId: 'sales-shopify-order-detail', row } : null;
  }

  // 推送财务ERP页签：采购入库单、采退出库单、销售出库单、销退入库单、其他入库单、
  // 其他出库单、直接调拨单，按业财结果单据页同口径进入对应模块的结果单详情（主PRD §4.2、AC09）。
  if (resultDocTypeLabels.has(docTypeLabel)) {
    return resolveResultDocument(docTypeLabel, docNo);
  }

  const loader = noticeLoaders.find((item) => item.label === docTypeLabel);
  if (loader) {
    const row = loader.load(docNo);
    return row ? { pageId: loader.pageId, row } : null;
  }

  const source = noticeSources.find((item) => item.label === docTypeLabel);
  if (!source) return null;
  const row = readMockRows(source.storageKey, source.seedRows).find((item) => item.noticeNo === docNo);
  return row ? { pageId: source.pageId, row } : null;
}

/** 主数据分发页签的「商品编码」定位商品资料详情；找不到返回 null。 */
export function resolveExceptionProduct(productCode) {
  if (!productCode) return null;
  const row = readMockRows(PRODUCT_STORAGE_KEY, products).find((item) => item.code === productCode);
  return row ? { pageId: 'base-product-detail', row } : null;
}

// —— 业财重推后的同步（推送异常主PRD R04、R05；弹窗与Mock §3）——

/**
 * 业财结果单据重推／异常运维重推完成后同步「推送财务ERP」页签记录：
 * 重推成功置「已处理」；仍失败保持「待处理」并更新失败时间与原因；追加一条处理记录。
 * 处理方式按 R05 映射：自动重试记「系统自动重试」，人工重推与异常运维重推记「重推」。
 */
export function syncFinanceExceptionFromPush({ row, trigger, success, record }) {
  if (!row || !row.docNo) return;

  const rows = readMockRows(PUSH_EXCEPTION_STORAGE_KEY, pushExceptionSeeds);
  const index = rows.findIndex((item) => item.tab === 'finance' && item.docNo === row.docNo);
  const entry = {
    id: `${row.id || row.docNo}-handle-${Date.now()}`,
    time: record?.pushTime || row.lastPushTime || '',
    method: trigger === 'auto_retry' ? 'auto_retry' : 'retry',
    result: success ? 'success' : 'failed',
    operator: record?.operator || '系统',
    note: record?.note || '',
  };

  if (index < 0) {
    rows.unshift({
      id: `push-exception-finance-${row.id || row.docNo}`,
      tab: 'finance',
      docType: row.docType,
      docNo: row.docNo,
      failTime: entry.time,
      failReason: success ? '' : (row.failReason || ''),
      status: success ? 'handled' : 'pending',
      records: [entry],
    });
  } else {
    const current = rows[index];
    rows[index] = {
      ...current,
      status: success ? 'handled' : 'pending',
      failTime: entry.time || current.failTime,
      failReason: success ? current.failReason : (row.failReason || current.failReason),
      records: [...(current.records || []), entry],
    };
  }

  writeMockRows(PUSH_EXCEPTION_STORAGE_KEY, rows);
}

// —— 结果处理 Mock 演示链路（《结果处理规则（二版）》§二、§五、§八 M1/M2；SAL-FR12）——

/**
 * 可执行「修复后处理原记录」演示的记录：结果处理页签、待处理且带演示载荷（demoRecover）。
 * 正式系统由接口机制自动重试处理原记录，本页只读；演示载荷仅用于原型走查。
 */
export function canRecoverResultException(row) {
  return row?.tab === 'result' && row?.status === 'pending' && Boolean(row?.demoRecover);
}

/**
 * 结果处理 Mock：补齐映射／解决阻塞原因后处理原记录，成功即完结、不产生第二张结果单。
 * 处理链路按规则文档 §二：补映射（商品匹配失败时）→ 生成已审核销售出库单并关联来源订单
 * （分两张：来源国内电商订单／来源跨境电商订单）→ 逻辑仓扣减一次 → 异常记录自动置为已处理、
 * 追加「修复恢复·成功」处理记录；重复触发按「来源系统＋来源单号＋执行标识」去重，不重复记账。
 *
 * 返回 { ok, message, outboundNo?, orderNo?, duplicated? }。
 */
export function recoverResultExceptionMock(rowId) {
  const rows = readMockRows(PUSH_EXCEPTION_STORAGE_KEY, pushExceptionSeeds);
  const index = rows.findIndex((item) => item.id === rowId);
  if (index < 0) return { ok: false, message: '异常记录不存在或已不可访问' };

  const row = rows[index];
  if (!row.demoRecover) {
    return { ok: false, message: '该记录为只读演示数据，请查看处理记录' };
  }
  if (row.status !== 'pending') {
    // 已处理：重复回传／重复触发不重复记账、不重复生成结果单（SAL-AC21、INT-FR02）
    return { ok: false, duplicated: true, message: '该结果此前已处理成功，按去重规则不重复记账（来源系统＋来源单号＋执行标识）' };
  }

  const demo = row.demoRecover;
  const isCrossborder = demo.kind === 'crossborder';
  const order = isCrossborder ? loadCrossBorderOrderByNo(demo.orderNo) : loadDomesticOrderByNo(demo.orderNo);
  if (!order) return { ok: false, message: '来源订单不存在或不可访问' };

  const outboundId = `sales-outbound-recovered-${row.id}`;
  if (loadAllOutbounds(salesOutbounds).some((item) => item.id === outboundId)) {
    return { ok: false, duplicated: true, message: '该结果此前已处理成功，按去重规则不重复记账' };
  }

  const quantity = Number(demo.quantity || 0);
  const sku = demo.product ? skuOptions.find((item) => item.value === demo.product) : null;
  if (!demo.product || quantity <= 0) return { ok: false, message: '演示数据缺少可处理的商品或数量' };

  // 1）补映射：商品匹配失败的行按外部编码补齐ERP商品（R09：匹配可在异常恢复后补齐）
  const lines = (order.lines || []).map((line) => {
    const isTargetLine = demo.platformSku ? line.platformSku === demo.platformSku : !line.product;
    if (!isTargetLine) return line;
    return {
      ...line,
      product: demo.product,
      productCode: sku?.skuCode || demo.product,
      productName: sku?.productName || '',
      unit: sku?.unit || line.unit || '',
    };
  });

  const time = nowStamp();
  const businessDate = demo.businessDate || time.slice(0, 10);
  const existingNos = loadAllOutbounds(salesOutbounds).map((item) => item.outboundNo);
  const outboundNo = nextDocumentNo('XSCK', businessDate, existingNos);

  // 2）处理原记录：逻辑仓扣减一次；校验不通过整批不生效，不出现负库存（§5.3 防错清单）
  try {
    postStockEntries([{ logicalWarehouse: demo.warehouse, product: demo.product, instantDelta: -quantity }], {
      eventType: 'result_out',
      sourceType: '销售出库单',
      sourceNo: outboundNo,
      businessType: '销售出库',
      operator: '系统',
      time,
    });
  } catch (error) {
    return { ok: false, message: error?.message || '库存校验未通过，未记账' };
  }

  const outbound = persistOutbound({
    id: outboundId,
    outboundNo,
    sourceType: isCrossborder ? 'crossborder_order' : 'domestic_order',
    sourceDomesticOrderNo: isCrossborder ? '' : order.orderNo,
    sourceCrossborderOrderNo: isCrossborder ? order.orderNo : '',
    sourceNoticeId: '',
    sourceNoticeNo: '',
    sourceOrderId: '',
    sourceOrderNo: '',
    customer: order.customer,
    warehouse: demo.warehouse,
    currency: order.currency,
    auditStatus: 'approved',
    financeErpPushStatus: 'un_pushed',
    businessDate,
    actualOutboundTime: time,
    pushTime: '',
    pushFailReason: '',
    remark: '',
    auditor: '',
    auditTime: time,
    creator: '系统',
    createdAt: time,
    updater: '系统',
    updatedAt: time,
    lines: [enrichOutboundLine({ id: `${outboundId}-line-1`, product: demo.product, quantity, price: demo.price, taxRate: demo.taxRate })],
  });

  // 3）订单行落库（补映射结果），最后更新时间按「关联结果单变化」刷新
  const nextOrder = { ...order, lines, updater: '系统', updatedAt: time };
  if (isCrossborder) upsertCrossBorderOrder(nextOrder);
  else upsertDomesticOrder(nextOrder);

  // 4）异常记录自动置为已处理，处理记录追加「修复恢复·成功」（R04、R05；记录全部保留）
  const entry = {
    id: `${row.id}-recover-${Date.now()}`,
    time,
    method: 'recover',
    result: 'success',
    operator: '系统',
    note: demo.note || '修复后处理原记录',
  };
  rows[index] = {
    ...row,
    status: 'handled',
    handledAt: time,
    resultDocNo: outboundNo,
    resultDocType: 'sales_outbound',
    records: [...(row.records || []), entry],
  };
  writeMockRows(PUSH_EXCEPTION_STORAGE_KEY, rows);

  // 5）已审核结果单进入推送财务ERP队列（Mock：短延时后回写推送成功）
  simulateFinanceErpPush(outbound.id);

  return {
    ok: true,
    outboundNo,
    orderNo: order.orderNo,
    orderLabel: isCrossborder ? '跨境电商订单' : '国内电商订单',
    note: entry.note,
  };
}
