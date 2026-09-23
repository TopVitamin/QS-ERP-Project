import { formatAmount } from './format.js';
import { auditStatusLabels, kingdeePushStatusLabels, loadOutboundsByOrderId } from './salesOutboundLogic.js';
import { loadNoticesByOrderId, noticeStatusLabels, sumNoticeLineQty } from './salesDeliveryNoticeLogic.js';
import { currencySymbol } from './money.js';

const noticeStatusToneMap = {
  shipped: 'success',
  pending_ship: 'info',
  push_failed: 'danger',
  cancelled: 'danger',
  pending_push: 'warning',
  pushing: 'warning',
  cancelling: 'warning',
};

const kingdeeStatusToneMap = {
  push_success: 'success',
  push_failed: 'danger',
  pushing: 'info',
  un_pushed: 'warning',
};

function formatCurrency(value, currency) {
  return `${currencySymbol(currency)} ${formatAmount(value)}`;
}

export function buildSalesOrderRelatedDocumentSections(row) {
  const notices = loadNoticesByOrderId(row.id, row.orderNo);
  const outbounds = loadOutboundsByOrderId(row.id, row.orderNo);

  return [
    {
      key: 'delivery-notices',
      title: '销售发货通知单',
      emptyText: '暂无关联的销售发货通知单',
      columns: [
        {
          key: 'noticeNo',
          label: '单号',
          link: true,
          pageId: 'sales-delivery-notice-detail',
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
          key: 'shippedQty',
          label: '实出数量',
          align: 'right',
          render: (notice) => sumNoticeLineQty(notice.lines, 'shippedQty'),
        },
        {
          key: 'shortQty',
          label: '缺出数量',
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
      key: 'outbounds',
      title: '销售出库单',
      emptyText: '暂无关联的销售出库单',
      columns: [
        {
          key: 'outboundNo',
          label: '单号',
          link: true,
          pageId: 'sales-outbound-detail',
          resolveRow: (outbound) => outbound,
        },
        {
          key: 'sourceNoticeNo',
          label: '来源销售发货通知单',
          link: true,
          pageId: 'sales-delivery-notice-detail',
          resolveRow: (outbound) => ({ noticeNo: outbound.sourceNoticeNo, id: outbound.sourceNoticeId }),
        },
        {
          key: 'auditStatus',
          label: '审核状态',
          badge: true,
          render: (outbound) => auditStatusLabels[outbound.auditStatus] || outbound.auditStatus,
          badgeTone: () => 'success',
        },
        {
          key: 'kingdeePushStatus',
          label: '金蝶推送状态',
          badge: true,
          render: (outbound) => kingdeePushStatusLabels[outbound.kingdeePushStatus] || outbound.kingdeePushStatus,
          badgeTone: (outbound) => kingdeeStatusToneMap[outbound.kingdeePushStatus] || 'default',
        },
        {
          key: 'totalOutboundQty',
          label: '实际出库数量',
          align: 'right',
          render: (outbound) => outbound.totalOutboundQty ?? 0,
        },
        {
          key: 'amount',
          label: '价税合计',
          align: 'right',
          render: (outbound) => formatCurrency(outbound.amount ?? 0, outbound.currency),
        },
        {
          key: 'createdAt',
          label: '创建时间',
          muted: true,
          render: (outbound) => outbound.createdAt,
        },
      ],
      rows: outbounds,
    },
  ];
}
