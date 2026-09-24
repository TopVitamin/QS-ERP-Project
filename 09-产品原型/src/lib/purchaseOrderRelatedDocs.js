import { formatAmount } from './format.js';
import { auditStatusLabels, financeErpPushStatusLabels, loadInboundsByOrderId } from './inboundLogic.js';
import { loadNoticesByOrderId, noticeStatusLabels, sumNoticeLineQty } from './receiptNoticeLogic.js';
import { currencySymbol } from './money.js';

const noticeStatusToneMap = {
  received: 'success',
  pending_receive: 'info',
  push_failed: 'danger',
  cancelled: 'danger',
  pending_push: 'warning',
  pushing: 'warning',
  cancelling: 'warning',
};

const financeErpStatusToneMap = {
  push_success: 'success',
  push_failed: 'danger',
  pushing: 'info',
  un_pushed: 'warning',
};

function formatCurrency(value, currency) {
  return `${currencySymbol(currency)} ${formatAmount(value)}`;
}

export function buildOrderRelatedDocumentSections(row) {
  const notices = loadNoticesByOrderId(row.id, row.orderNo);
  const inbounds = loadInboundsByOrderId(row.id, row.orderNo);

  return [
    {
      key: 'receipt-notices',
      title: '采购收货通知单',
      emptyText: '暂无关联的采购收货通知单',
      columns: [
        {
          key: 'noticeNo',
          label: '单号',
          link: true,
          pageId: 'purchase-receipt-notice-detail',
          resolveRow: (notice) => notice,
        },
        {
          key: 'status',
          label: '单据状态',
          badge: true,
          render: (notice) => noticeStatusLabels[notice.status] || notice.status,
          badgeTone: (notice) => noticeStatusToneMap[notice.status] || 'default',
        },
        {
          key: 'notifyQty',
          label: '通知数量',
          align: 'right',
          render: (notice) => sumNoticeLineQty(notice.lines, 'notifyQty'),
        },
        {
          key: 'receivedQty',
          label: '实收数量',
          align: 'right',
          render: (notice) => sumNoticeLineQty(notice.lines, 'receivedQty'),
        },
        {
          key: 'shortQty',
          label: '缺收数量',
          align: 'right',
          render: (notice) => sumNoticeLineQty(notice.lines, 'shortQty'),
        },
        {
          key: 'createdAt',
          label: '创建时间',
          muted: true,
          render: (notice) => notice.createdAt,
        },
      ],
      rows: notices,
    },
    {
      key: 'inbounds',
      title: '采购入库单',
      emptyText: '暂无关联的采购入库单',
      columns: [
        {
          key: 'inboundNo',
          label: '单号',
          link: true,
          pageId: 'purchase-inbound-detail',
          resolveRow: (inbound) => inbound,
        },
        {
          key: 'sourceNoticeNo',
          label: '来源采购收货通知单',
          link: true,
          pageId: 'purchase-receipt-notice-detail',
          resolveRow: (inbound) => ({ noticeNo: inbound.sourceNoticeNo, id: inbound.sourceNoticeId }),
        },
        {
          key: 'auditStatus',
          label: '审核状态',
          badge: true,
          render: (inbound) => auditStatusLabels[inbound.auditStatus] || inbound.auditStatus,
          badgeTone: () => 'success',
        },
        {
          key: 'financeErpPushStatus',
          label: '推送财务ERP状态',
          badge: true,
          render: (inbound) => financeErpPushStatusLabels[inbound.financeErpPushStatus] || inbound.financeErpPushStatus,
          badgeTone: (inbound) => financeErpStatusToneMap[inbound.financeErpPushStatus] || 'default',
        },
        {
          key: 'totalInboundQty',
          label: '实际入库数量',
          align: 'right',
          render: (inbound) => inbound.totalInboundQty ?? 0,
        },
        {
          key: 'amount',
          label: '价税合计',
          align: 'right',
          render: (inbound) => formatCurrency(inbound.amount ?? 0, inbound.currency),
        },
        {
          key: 'createdAt',
          label: '创建时间',
          muted: true,
          render: (inbound) => inbound.createdAt,
        },
      ],
      rows: inbounds,
    },
  ];
}
