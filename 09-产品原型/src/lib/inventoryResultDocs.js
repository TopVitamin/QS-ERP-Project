/**
 * 库存流水的「来源单号」追溯：按来源单据类型＋来源单号定位结果单详情页（库存流水主PRD F02、R08）。
 * 结果单不存在或不可访问时返回 null，由页面按「结果单不存在或不可访问」提示并停留列表页。
 *
 * 说明：采购、销售、采退、销退的结果单由各自模块维护，这里按单号读取它们的 Mock 集合；
 * 库存模块自己的结果单（其他入库单、其他出库单、直接调拨单）直接调用对应 logic 的按单号加载函数。
 */
import { inboundOrders } from '../data/inboundData.js';
import { purchaseReturnOutbounds } from '../data/purchaseReturnOutboundData.js';
import { salesOutbounds } from '../data/salesOutboundData.js';
import { salesReturnInbounds } from '../data/salesReturnInboundData.js';
import { loadDirectTransferByNo } from './directTransferLogic.js';
import { INBOUND_STORAGE_KEY } from './inboundLogic.js';
import { readMockRows } from './mockStorage.js';
import { loadOtherInboundByNo } from './otherInboundLogic.js';
import { loadOtherOutboundByNo } from './otherOutboundLogic.js';
import { RETURN_OUTBOUND_STORAGE_KEY } from './purchaseReturnOutboundLogic.js';
import { RETURN_INBOUND_STORAGE_KEY } from './salesReturnInboundLogic.js';
import { SALES_OUTBOUND_STORAGE_KEY } from './salesOutboundLogic.js';

const externalResultDocSources = [
  { label: '采购入库单', storageKey: INBOUND_STORAGE_KEY, seedRows: inboundOrders, noField: 'inboundNo', pageId: 'purchase-inbound-detail' },
  { label: '采退出库单', storageKey: RETURN_OUTBOUND_STORAGE_KEY, seedRows: purchaseReturnOutbounds, noField: 'outboundNo', pageId: 'purchase-return-outbound-detail' },
  { label: '销售出库单', storageKey: SALES_OUTBOUND_STORAGE_KEY, seedRows: salesOutbounds, noField: 'outboundNo', pageId: 'sales-outbound-detail' },
  { label: '销退入库单', storageKey: RETURN_INBOUND_STORAGE_KEY, seedRows: salesReturnInbounds, noField: 'inboundNo', pageId: 'sales-return-inbound-detail' },
];

const inventoryResultDocLoaders = [
  { label: '其他入库单', pageId: 'inventory-other-inbound-detail', load: loadOtherInboundByNo },
  { label: '其他出库单', pageId: 'inventory-other-outbound-detail', load: loadOtherOutboundByNo },
  { label: '直接调拨单', pageId: 'inventory-direct-transfer-detail', load: loadDirectTransferByNo },
];

export function resolveResultDocument(sourceTypeLabel, docNo) {
  if (!sourceTypeLabel || !docNo) return null;

  const inventorySource = inventoryResultDocLoaders.find((item) => item.label === sourceTypeLabel);
  if (inventorySource) {
    const row = inventorySource.load(docNo);
    return row ? { pageId: inventorySource.pageId, row } : null;
  }

  const source = externalResultDocSources.find((item) => item.label === sourceTypeLabel);
  if (!source) return null;
  const row = readMockRows(source.storageKey, source.seedRows).find((item) => item[source.noField] === docNo);
  return row ? { pageId: source.pageId, row } : null;
}
