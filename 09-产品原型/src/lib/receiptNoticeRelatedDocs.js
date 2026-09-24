import { formatAmount } from './format.js';
import { auditStatusLabels, financeErpPushStatusLabels, loadInboundById, loadInboundByNoticeId } from './inboundLogic.js';
import { currencySymbol } from './money.js';

const financeErpStatusToneMap = {
  push_success: 'success',
  push_failed: 'danger',
  pushing: 'info',
  un_pushed: 'warning',
};

function formatCurrency(value, currency) {
  return `${currencySymbol(currency)} ${formatAmount(value)}`;
}

function resolveInboundForNotice(row) {
  return loadInboundByNoticeId(row.id)
    || (row.inboundId ? loadInboundById(row.inboundId) : null);
}

/** 采购收货通知单详情「关联单据」：下游采购入库单（1:0..1）。 */
export function buildNoticeRelatedDocumentSections(row) {
  const inbound = resolveInboundForNotice(row);
  const inbounds = inbound ? [inbound] : [];

  return [
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
          resolveRow: (item) => item,
        },
        {
          key: 'auditStatus',
          label: '审核状态',
          badge: true,
          render: (item) => auditStatusLabels[item.auditStatus] || item.auditStatus,
          badgeTone: () => 'success',
        },
        {
          key: 'financeErpPushStatus',
          label: '推送财务ERP状态',
          badge: true,
          render: (item) => financeErpPushStatusLabels[item.financeErpPushStatus] || item.financeErpPushStatus,
          badgeTone: (item) => financeErpStatusToneMap[item.financeErpPushStatus] || 'default',
        },
        {
          key: 'totalInboundQty',
          label: '实际入库数量',
          align: 'right',
          render: (item) => item.totalInboundQty ?? 0,
        },
        {
          key: 'amount',
          label: '价税合计',
          align: 'right',
          render: (item) => formatCurrency(item.amount ?? 0, item.currency),
        },
        {
          key: 'actualInboundTime',
          label: '实际入库时间',
          muted: true,
          render: (item) => item.actualInboundTime || item.createdAt,
        },
      ],
      rows: inbounds,
    },
  ];
}
