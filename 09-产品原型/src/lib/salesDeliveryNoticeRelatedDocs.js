import { formatAmount } from './format.js';
import { auditStatusLabels, kingdeePushStatusLabels, loadOutboundById, loadOutboundByNoticeId } from './salesOutboundLogic.js';
import { currencySymbol } from './money.js';

const kingdeeStatusToneMap = {
  push_success: 'success',
  push_failed: 'danger',
  pushing: 'info',
  un_pushed: 'warning',
};

function formatCurrency(value, currency) {
  return `${currencySymbol(currency)} ${formatAmount(value)}`;
}

function resolveOutboundForNotice(row) {
  return loadOutboundByNoticeId(row.id)
    || (row.outboundId ? loadOutboundById(row.outboundId) : null);
}

export function buildDeliveryNoticeRelatedDocumentSections(row) {
  const outbound = resolveOutboundForNotice(row);
  const outbounds = outbound ? [outbound] : [];

  return [
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
          key: 'kingdeePushStatus',
          label: '金蝶推送状态',
          badge: true,
          render: (item) => kingdeePushStatusLabels[item.kingdeePushStatus] || item.kingdeePushStatus,
          badgeTone: (item) => kingdeeStatusToneMap[item.kingdeePushStatus] || 'default',
        },
        {
          key: 'totalOutboundQty',
          label: '实际出库数量',
          align: 'right',
          render: (item) => item.totalOutboundQty ?? 0,
        },
        {
          key: 'amount',
          label: '价税合计',
          align: 'right',
          render: (item) => formatCurrency(item.amount ?? 0, item.currency),
        },
        {
          key: 'actualOutboundTime',
          label: '实际出库时间',
          muted: true,
          render: (item) => item.actualOutboundTime || item.createdAt,
        },
      ],
      rows: outbounds,
    },
  ];
}
