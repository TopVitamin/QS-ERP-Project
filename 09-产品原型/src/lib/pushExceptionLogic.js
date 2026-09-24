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
 * 按单据类型＋单据编号定位原单（推送外部仓库、推送电商平台页签的「单据编号」）。
 * 找不到返回 null，由页面提示「单据不存在或不可访问」并停留列表（主PRD R09）。
 * 独立站订单页尚未接入原型：返回其 pageId，由 App 提示「该功能尚未完成」（见09《待改项》）。
 */
export function resolveExceptionSourceDocument(docTypeLabel, docNo) {
  if (!docTypeLabel || !docNo) return null;
  if (docTypeLabel === '独立站订单') return { pageId: 'sales-shopify-order', row: null };

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
