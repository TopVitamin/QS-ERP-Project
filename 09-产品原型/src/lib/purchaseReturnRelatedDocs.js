import { formatAmount } from './format.js';
import { currencySymbol } from './money.js';
import { purchaseReturnOutbounds } from '../data/purchaseReturnOutboundData.js';
import { registerReturnOutboundSeedRows } from './purchaseReturnLogic.js';
import { loadReturnNoticesByReturnId, returnNoticeStatusLabels } from './purchaseReturnNoticeLogic.js';
import {
  auditStatusLabels,
  kingdeePushStatusLabels,
  loadReturnOutboundsByNoticeId,
  loadReturnOutboundsByReturnId,
} from './purchaseReturnOutboundLogic.js';

// 关联单据读取出库单：登记出库单种子，保证未访问采退出库单列表时详情也能展示关联记录。
registerReturnOutboundSeedRows(purchaseReturnOutbounds);

/**
 * 采购退货单、采退发货通知单详情的「关联单据」简表。
 * 列与排序见采购退货单详情页 Demo PRD §3.3、采退发货通知单详情页 Demo PRD §3.4。
 */

const noticeStatusToneMap = {
  pending_push: 'warning',
  pushing: 'info',
  push_failed: 'danger',
  pending_ship: 'info',
  cancelling: 'warning',
  shipped: 'success',
  cancelled: 'danger',
};

const kingdeeStatusToneMap = {
  un_pushed: 'warning',
  pushing: 'info',
  push_success: 'success',
  push_failed: 'danger',
};

function formatCurrency(value, currency) {
  return `${currencySymbol(currency)} ${formatAmount(value ?? 0)}`;
}

function buildNoticeColumns() {
  return [
    {
      key: 'noticeNo',
      label: '单号',
      link: true,
      pageId: 'purchase-return-notice-detail',
      resolveRow: (notice) => notice,
    },
    {
      key: 'status',
      label: '单据状态',
      badge: true,
      render: (notice) => returnNoticeStatusLabels[notice.status] || notice.status,
      badgeTone: (notice) => noticeStatusToneMap[notice.status] || 'default',
    },
    { key: 'notifyQty', label: '通知数量', align: 'right', render: (notice) => notice.totalNotifyQty ?? 0 },
    { key: 'shippedQty', label: '实出数量', align: 'right', render: (notice) => notice.totalShippedQty ?? 0 },
    { key: 'shortQty', label: '缺出数量', align: 'right', render: (notice) => notice.totalShortQty ?? 0 },
    { key: 'createdAt', label: '创建时间', muted: true, render: (notice) => notice.createdAt },
  ];
}

function buildOutboundColumns({ withSourceNotice, withCreatedAt }) {
  const columns = [
    {
      key: 'outboundNo',
      label: '单号',
      link: true,
      pageId: 'purchase-return-outbound-detail',
      resolveRow: (outbound) => outbound,
    },
  ];

  if (withSourceNotice) {
    columns.push({
      key: 'sourceNoticeNo',
      label: '来源采退发货通知单',
      link: true,
      pageId: 'purchase-return-notice-detail',
      resolveRow: (outbound) => ({ id: outbound.sourceNoticeId, noticeNo: outbound.sourceNoticeNo }),
    });
  }

  columns.push(
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
    { key: 'totalOutboundQty', label: '实际出库数量', align: 'right', render: (outbound) => outbound.totalOutboundQty ?? 0 },
    { key: 'amount', label: '价税合计', align: 'right', render: (outbound) => formatCurrency(outbound.amount, outbound.currency) },
  );

  if (withCreatedAt) {
    columns.push({ key: 'createdAt', label: '创建时间', muted: true, render: (outbound) => outbound.createdAt });
  } else {
    columns.push({ key: 'actualOutboundTime', label: '实际出库时间', muted: true, render: (outbound) => outbound.actualOutboundTime });
  }

  return columns;
}

/** 采购退货单详情：下游采退发货通知单与采退出库单（仅已审核展示） */
export function buildReturnRelatedDocumentSections(row) {
  const notices = loadReturnNoticesByReturnId(row.id, row.returnNo);
  const outbounds = loadReturnOutboundsByReturnId(row.id, row.returnNo);

  return [
    {
      key: 'return-notices',
      title: '采退发货通知单',
      emptyText: '暂无关联的采退发货通知单',
      columns: buildNoticeColumns(),
      rows: notices,
    },
    {
      key: 'return-outbounds',
      title: '采退出库单',
      emptyText: '暂无关联的采退出库单',
      columns: buildOutboundColumns({ withSourceNotice: true, withCreatedAt: true }),
      rows: outbounds,
    },
  ];
}

/** 采退发货通知单详情：下游采退出库单（仅已发货展示） */
export function buildReturnNoticeRelatedDocumentSections(notice) {
  return [
    {
      key: 'return-outbounds',
      title: '采退出库单',
      emptyText: '暂无关联的采退出库单',
      columns: buildOutboundColumns({ withSourceNotice: false, withCreatedAt: false }),
      rows: loadReturnOutboundsByNoticeId(notice.id, notice.noticeNo),
    },
  ];
}
