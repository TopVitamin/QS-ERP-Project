/**
 * 独立站订单详情「关联单据」数据：销售出库单、销退入库单。
 *
 * 口径依据：《独立站订单主PRD》§3.3、R15、§8（出库单来源关联本单；退货经销售退货链路间接关联），
 * 《独立站订单前端Demo版PRD_详情页》§3.7。
 *
 * 出库单按「来源类型=独立站订单（shopify）＋来源单号」定位；
 * 销退入库单经「本单出库单 → 销售退货单 → 销退收货通知单 → 销退入库单」逐级定位（只读，不新增关联字段）。
 */
import { formatAmount } from './format.js';
import {
  auditStatusLabels as outboundAuditStatusLabels,
  financeErpPushStatusLabels as outboundPushStatusLabels,
  loadOutboundsByOrderId,
} from './salesOutboundLogic.js';
import { loadAllSalesReturns } from './salesReturnLogic.js';
import { loadAllSalesReturnNotices } from './salesReturnNoticeLogic.js';
import {
  auditStatusLabels as inboundAuditStatusLabels,
  financeErpPushStatusLabels as inboundPushStatusLabels,
  loadAllSalesReturnInbounds,
} from './salesReturnInboundLogic.js';
import { listShopifyOrderOutbounds } from './shopifyOrderLogic.js';

const pushStatusToneMap = {
  push_success: 'success',
  push_failed: 'danger',
  pushing: 'info',
  un_pushed: 'warning',
};

const auditStatusToneMap = {
  approved: 'success',
  pending: 'info',
  draft: 'warning',
};

/** 本单关联的销退入库单：经退货链路（出库单 → 销售退货单 → 收货通知 → 销退入库单）定位。 */
export function listShopifyOrderReturnInbounds(row) {
  const outbounds = listShopifyOrderOutbounds(row);
  if (!outbounds.length) return [];
  const outboundIds = new Set(outbounds.map((outbound) => outbound.id));
  const returns = loadAllSalesReturns([]).filter((item) => outboundIds.has(item.sourceOutboundId));
  if (!returns.length) return [];
  const returnIds = new Set(returns.map((item) => item.id));
  const notices = loadAllSalesReturnNotices([]).filter((item) => returnIds.has(item.sourceReturnId));
  const noticeIds = new Set(notices.map((item) => item.id));
  return loadAllSalesReturnInbounds([])
    .filter((item) => (item.sourceNoticeId && noticeIds.has(item.sourceNoticeId)) || (item.sourceReturnId && returnIds.has(item.sourceReturnId)))
    .sort((left, right) => String(right.actualReceiveTime || right.createdAt || '').localeCompare(String(left.actualReceiveTime || left.createdAt || '')));
}

export function buildShopifyOrderRelatedDocumentSections(row) {
  const outbounds = listShopifyOrderOutbounds(row).length
    ? listShopifyOrderOutbounds(row)
    : loadOutboundsByOrderId(row.id, row.orderNo);
  const inbounds = listShopifyOrderReturnInbounds(row);

  return [
    {
      key: 'outbounds',
      title: '销售出库单',
      emptyText: '暂无关联的销售出库单',
      columns: [
        { key: 'outboundNo', label: '单号', link: true, pageId: 'sales-outbound-detail', resolveRow: (outbound) => outbound },
        {
          key: 'auditStatus',
          label: '审核状态',
          badge: true,
          render: (outbound) => outboundAuditStatusLabels[outbound.auditStatus] || outbound.auditStatus,
          badgeTone: (outbound) => auditStatusToneMap[outbound.auditStatus] || 'default',
        },
        {
          key: 'financeErpPushStatus',
          label: '推送财务ERP状态',
          badge: true,
          render: (outbound) => outboundPushStatusLabels[outbound.financeErpPushStatus] || outbound.financeErpPushStatus,
          badgeTone: (outbound) => pushStatusToneMap[outbound.financeErpPushStatus] || 'default',
        },
        { key: 'totalOutboundQty', label: '实际出库数量', align: 'right', render: (outbound) => outbound.totalOutboundQty ?? 0 },
        { key: 'amount', label: '价税合计', align: 'right', render: (outbound) => formatAmount(outbound.amount ?? 0) },
        { key: 'createdAt', label: '创建时间', muted: true, render: (outbound) => outbound.createdAt },
      ],
      rows: outbounds,
    },
    {
      key: 'return-inbounds',
      title: '销退入库单',
      emptyText: '暂无关联的销退入库单',
      columns: [
        { key: 'inboundNo', label: '单号', link: true, pageId: 'sales-return-inbound-detail', resolveRow: (inbound) => inbound },
        {
          key: 'auditStatus',
          label: '审核状态',
          badge: true,
          render: (inbound) => inboundAuditStatusLabels[inbound.auditStatus] || inbound.auditStatus,
          badgeTone: (inbound) => auditStatusToneMap[inbound.auditStatus] || 'default',
        },
        {
          key: 'financeErpPushStatus',
          label: '推送财务ERP状态',
          badge: true,
          render: (inbound) => inboundPushStatusLabels[inbound.financeErpPushStatus] || inbound.financeErpPushStatus,
          badgeTone: (inbound) => pushStatusToneMap[inbound.financeErpPushStatus] || 'default',
        },
        { key: 'totalReceiveQty', label: '实际入库数量', align: 'right', render: (inbound) => inbound.totalReceiveQty ?? 0 },
        { key: 'amount', label: '价税合计', align: 'right', render: (inbound) => formatAmount(inbound.amount ?? 0) },
        { key: 'createdAt', label: '创建时间', muted: true, render: (inbound) => inbound.createdAt },
      ],
      rows: inbounds,
    },
  ];
}
