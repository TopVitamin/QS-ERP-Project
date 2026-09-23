import { resolveOptionLabel } from '../lib/codeName.js';
import { formatAmount } from '../lib/format.js';
import {
  auditStatusLabels,
  buildSeedOutboundFromNotice,
  kingdeePushStatusLabels,
  loadAllOutbounds,
  normalizeOutboundRow,
  SALES_OUTBOUND_STORAGE_KEY,
  sourceTypeLabels,
} from '../lib/salesOutboundLogic.js';
import { currencyOptions, customerOptions, logicalWarehouseOptions } from './masterData.js';
import { salesOrders } from './salesOrderData.js';
import { salesDeliveryNotices } from './salesDeliveryNoticeData.js';

const orderForOutboundDemo = salesOrders.find((order) => order.id === 'sales-order-2');
const noticePushSuccess = salesDeliveryNotices.find((notice) => notice.id === 'sales-notice-2');
const noticePushFailed = salesDeliveryNotices.find((notice) => notice.id === 'sales-notice-short');

const seedOutbounds = [
  noticePushSuccess && orderForOutboundDemo
    ? buildSeedOutboundFromNotice(noticePushSuccess, orderForOutboundDemo, {
      id: 'sales-outbound-seed-1',
      outboundNo: 'XSCK-20260917-0001',
      kingdeePushStatus: 'push_success',
      pushTime: '2026-09-17 15:31:00',
      updatedAt: '2026-09-17 15:31:00',
    })
    : null,
  noticePushFailed && orderForOutboundDemo
    ? buildSeedOutboundFromNotice(noticePushFailed, orderForOutboundDemo, {
      id: 'sales-outbound-seed-2',
      outboundNo: 'XSCK-20260918-0001',
      kingdeePushStatus: 'push_failed',
      pushTime: '2026-09-18 11:22:00',
      pushFailReason: '接口超时，金蝶未确认接收',
      updatedAt: '2026-09-18 11:22:00',
    })
    : null,
].filter(Boolean).map(normalizeOutboundRow);

export { SALES_OUTBOUND_STORAGE_KEY };

export const salesOutbounds = loadAllOutbounds(seedOutbounds);

export function getSalesOutboundStatusBadges(row) {
  const badges = [
    {
      label: auditStatusLabels[row.auditStatus] || row.auditStatus,
      tone: 'success',
    },
  ];
  if (row.kingdeePushStatus) {
    const toneMap = {
      un_pushed: 'warning',
      pushing: 'info',
      push_success: 'success',
      push_failed: 'danger',
    };
    badges.push({
      label: kingdeePushStatusLabels[row.kingdeePushStatus] || row.kingdeePushStatus,
      tone: toneMap[row.kingdeePushStatus] || 'default',
    });
  }
  return badges;
}

const qtyCell = (value) => value ?? 0;

export const salesOutboundColumns = [
  { key: 'outboundNo', label: '单号', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: true },
  { key: 'businessDate', label: '业务日期', defaultWidth: 112, minWidth: 96, maxWidth: 160, ellipsis: true, sortable: true },
  { key: 'sourceType', label: '来源类型', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true, render: (value) => sourceTypeLabels[value] || value },
  { key: 'sourceNoticeNo', label: '来源销售发货通知单', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: true },
  { key: 'sourceOrderNo', label: '来源销售订单', defaultWidth: 180, minWidth: 160, maxWidth: 240, ellipsis: true, link: true },
  { key: 'customer', label: '客户', defaultWidth: 200, minWidth: 140, maxWidth: 280, ellipsis: true, render: (value) => resolveOptionLabel(value, customerOptions) },
  { key: 'currency', label: '币别', defaultWidth: 112, minWidth: 96, maxWidth: 140, ellipsis: true, render: (value) => resolveOptionLabel(value, currencyOptions) },
  { key: 'warehouse', label: '出库仓库', defaultWidth: 160, minWidth: 120, maxWidth: 220, ellipsis: true, render: (value) => resolveOptionLabel(value, logicalWarehouseOptions) },
  { key: 'auditStatus', label: '审核状态', defaultWidth: 96, minWidth: 88, maxWidth: 140, ellipsis: true, render: (value) => auditStatusLabels[value] || value, tone: () => 'text-erp-success' },
  { key: 'kingdeePushStatus', label: '金蝶推送状态', defaultWidth: 112, minWidth: 96, maxWidth: 160, ellipsis: true, render: (value) => kingdeePushStatusLabels[value] || value, tone: (value) => (value === 'push_success' ? 'text-erp-success' : value === 'push_failed' ? 'text-erp-danger' : value === 'pushing' ? 'text-erp-info' : 'text-erp-warning') },
  { key: 'totalOutboundQty', label: '实际出库数量', defaultWidth: 112, minWidth: 96, maxWidth: 140, ellipsis: true, align: 'right', sortable: true, render: qtyCell },
  { key: 'amount', label: '价税合计', defaultWidth: 132, minWidth: 112, maxWidth: 180, ellipsis: true, align: 'right', sortable: true, render: (value) => formatAmount(value) },
  { key: 'taxAmount', label: '税额', defaultWidth: 104, minWidth: 88, maxWidth: 140, ellipsis: true, align: 'right', render: (value) => formatAmount(value) },
  { key: 'createdAt', label: '创建时间', defaultWidth: 160, minWidth: 140, maxWidth: 200, ellipsis: true, sortable: true },
  { key: 'updatedAt', label: '最后更新时间', defaultWidth: 160, minWidth: 140, maxWidth: 200, ellipsis: true, sortable: true },
];

export function buildSourceNoticeFilterOptions(rows = []) {
  const map = new Map();
  rows.forEach((row) => {
    if (!row.sourceNoticeNo) return;
    map.set(row.sourceNoticeNo, { value: row.sourceNoticeNo, label: row.sourceNoticeNo });
  });
  return [{ value: '', label: '全部通知单' }, ...map.values()];
}

export function buildSourceSalesOrderFilterOptions(rows = []) {
  const map = new Map();
  rows.forEach((row) => {
    if (!row.sourceOrderNo) return;
    map.set(row.sourceOrderNo, { value: row.sourceOrderNo, label: row.sourceOrderNo });
  });
  return [{ value: '', label: '全部订单' }, ...map.values()];
}
