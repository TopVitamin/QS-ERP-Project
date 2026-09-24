import { formatAmount } from './format.js';
import { currencySymbol } from './money.js';
import {
  auditStatusLabels,
  kingdeePushStatusLabels,
  loadSalesReturnInboundsByNoticeId,
  loadSalesReturnInboundsByReturnId,
} from './salesReturnInboundLogic.js';
import {
  loadSalesReturnNoticesByReturnId,
  returnNoticeStatusLabels,
  sumSalesReturnNoticeLineQty,
} from './salesReturnNoticeLogic.js';

const noticeStatusToneMap = {
  received: 'success',
  pending_receive: 'info',
  pushing: 'info',
  pending_push: 'warning',
  cancelling: 'warning',
  push_failed: 'danger',
  cancelled: 'danger',
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

/** 销售退货单详情「关联单据」：销退收货通知单、销退入库单（仅已审核展示） */
export function buildSalesReturnRelatedDocumentSections(row) {
  const notices = loadSalesReturnNoticesByReturnId(row.id, row.returnNo);
  const inbounds = loadSalesReturnInboundsByReturnId(row.id, row.returnNo);

  return [
    {
      key: 'return-notices',
      title: '销退收货通知单',
      emptyText: '暂无关联的销退收货通知单',
      columns: [
        {
          key: 'noticeNo',
          label: '单号',
          link: true,
          pageId: 'sales-return-notice-detail',
          resolveRow: (notice) => notice,
        },
        {
          key: 'status',
          label: '单据状态',
          badge: true,
          render: (notice) => returnNoticeStatusLabels[notice.status] || notice.status,
          badgeTone: (notice) => noticeStatusToneMap[notice.status] || 'default',
        },
        {
          key: 'notifyQty',
          label: '通知数量',
          align: 'right',
          render: (notice) => sumSalesReturnNoticeLineQty(notice.lines, 'notifyQty'),
        },
        {
          key: 'receivedQty',
          label: '实收数量',
          align: 'right',
          render: (notice) => sumSalesReturnNoticeLineQty(notice.lines, 'receivedQty'),
        },
        {
          key: 'shortQty',
          label: '缺收数量',
          align: 'right',
          render: (notice) => sumSalesReturnNoticeLineQty(notice.lines, 'shortQty'),
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
      key: 'return-inbounds',
      title: '销退入库单',
      emptyText: '暂无关联的销退入库单',
      columns: [
        {
          key: 'inboundNo',
          label: '单号',
          link: true,
          pageId: 'sales-return-inbound-detail',
          resolveRow: (inbound) => inbound,
        },
        {
          key: 'sourceNoticeNo',
          label: '来源销退收货通知单',
          link: true,
          pageId: 'sales-return-notice-detail',
          resolveRow: (inbound) => ({ id: inbound.sourceNoticeId, noticeNo: inbound.sourceNoticeNo }),
        },
        {
          key: 'auditStatus',
          label: '审核状态',
          badge: true,
          render: (inbound) => auditStatusLabels[inbound.auditStatus] || inbound.auditStatus,
          badgeTone: () => 'success',
        },
        {
          key: 'kingdeePushStatus',
          label: '金蝶推送状态',
          badge: true,
          render: (inbound) => kingdeePushStatusLabels[inbound.kingdeePushStatus] || inbound.kingdeePushStatus,
          badgeTone: (inbound) => kingdeeStatusToneMap[inbound.kingdeePushStatus] || 'default',
        },
        {
          key: 'totalReceiveQty',
          label: '实际收货数量',
          align: 'right',
          render: (inbound) => inbound.totalReceiveQty ?? 0,
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

/** 销退收货通知单详情「关联单据」：下游销退入库单（1:0..1，仅已收货展示） */
export function buildSalesReturnNoticeRelatedDocumentSections(notice) {
  const inbounds = loadSalesReturnInboundsByNoticeId(notice.id, notice.noticeNo);

  return [
    {
      key: 'return-inbounds',
      title: '销退入库单',
      emptyText: '暂无关联的销退入库单',
      columns: [
        {
          key: 'inboundNo',
          label: '单号',
          link: true,
          pageId: 'sales-return-inbound-detail',
          resolveRow: (inbound) => inbound,
        },
        {
          key: 'auditStatus',
          label: '审核状态',
          badge: true,
          render: (inbound) => auditStatusLabels[inbound.auditStatus] || inbound.auditStatus,
          badgeTone: () => 'success',
        },
        {
          key: 'kingdeePushStatus',
          label: '金蝶推送状态',
          badge: true,
          render: (inbound) => kingdeePushStatusLabels[inbound.kingdeePushStatus] || inbound.kingdeePushStatus,
          badgeTone: (inbound) => kingdeeStatusToneMap[inbound.kingdeePushStatus] || 'default',
        },
        {
          key: 'totalReceiveQty',
          label: '实际收货数量',
          align: 'right',
          render: (inbound) => inbound.totalReceiveQty ?? 0,
        },
        {
          key: 'amount',
          label: '价税合计',
          align: 'right',
          render: (inbound) => formatCurrency(inbound.amount ?? 0, inbound.currency),
        },
        {
          key: 'businessDate',
          label: '业务日期',
          muted: true,
          render: (inbound) => inbound.businessDate,
        },
      ],
      rows: inbounds,
    },
  ];
}
