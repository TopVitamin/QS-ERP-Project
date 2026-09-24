import { resolveOptionLabel } from '../lib/codeName.js';
import { formatAmount } from '../lib/format.js';
import {
  auditStatusLabels,
  buildSeedOutboundFromNotice,
  financeErpPushStatusLabels,
  loadAllOutbounds,
  normalizeOutboundRow,
  SALES_OUTBOUND_STORAGE_KEY,
  sourceTypeLabels,
} from '../lib/salesOutboundLogic.js';
import { currencyOptions, customerOptions } from './masterData.js';
import { getInventoryLogicalWarehouseOptions } from './warehouseData.js';
import { formatSnapshotCodeName } from '../lib/documentNameSnapshots.js';
import { salesOrders } from './salesOrderData.js';
import { salesDeliveryNotices } from './salesDeliveryNoticeData.js';

const orderForOutboundDemo = salesOrders.find((order) => order.id === 'sales-order-2');
const noticePushSuccess = salesDeliveryNotices.find((notice) => notice.id === 'sales-notice-2');
const noticePushFailed = salesDeliveryNotices.find((notice) => notice.id === 'sales-notice-short');

const originalSeedOutbounds = [
  noticePushSuccess && orderForOutboundDemo
    ? buildSeedOutboundFromNotice(noticePushSuccess, orderForOutboundDemo, {
      id: 'sales-outbound-seed-1',
      outboundNo: 'XSCK-20260917-0001',
      financeErpPushStatus: 'push_success',
      pushTime: '2026-09-17 15:31:00',
      updatedAt: '2026-09-17 15:31:00',
    })
    : null,
  noticePushFailed && orderForOutboundDemo
    ? buildSeedOutboundFromNotice(noticePushFailed, orderForOutboundDemo, {
      id: 'sales-outbound-seed-2',
      outboundNo: 'XSCK-20260918-0001',
      financeErpPushStatus: 'push_failed',
      pushTime: '2026-09-18 11:22:00',
      pushFailReason: '接口超时，财务ERP未确认接收',
      updatedAt: '2026-09-18 11:22:00',
    })
    : null,
].filter(Boolean).map(normalizeOutboundRow);

const additionalB2BOutbounds = salesDeliveryNotices
  .filter((notice) => notice.id.startsWith('sales-notice-seed-shipped-'))
  .map((notice, index) => {
    const order = salesOrders.find((item) => item.id === notice.sourceOrderId);
    const pushFailed = index === 2;
    return buildSeedOutboundFromNotice(notice, order, {
      id: notice.outboundId,
      outboundNo: notice.outboundNo,
      financeErpPushStatus: pushFailed ? 'push_failed' : 'push_success',
      pushTime: notice.finalShipTime,
      pushFailReason: pushFailed ? '接口超时，财务ERP未确认接收' : '',
      updatedAt: notice.finalShipTime,
    });
  })
  .filter(Boolean);

const directSourceOutbounds = [
  {
    id: 'sales-outbound-shopify-seed', outboundNo: 'XSCK-20260922-0007', sourceType: 'shopify',
    sourceOrderNo: 'SHOP-20260922-0001', customer: 'CUS000001', warehouse: 'LWH000001', currency: '人民币',
    auditStatus: 'approved', financeErpPushStatus: 'push_success', businessDate: '2026-09-22',
    actualOutboundTime: '2026-09-22 14:20:00', pushTime: '2026-09-22 14:21:00', pushFailReason: '',
    creator: '系统', createdAt: '2026-09-22 14:20:00', updater: '系统', updatedAt: '2026-09-22 14:21:00',
    lines: [{ id: 'sales-outbound-shopify-line', product: 'SP0101010001', quantity: 1, price: 128, taxRate: '13' }],
  },
  {
    id: 'sales-outbound-toc-seed', outboundNo: 'XSCK-20260922-0008', sourceType: 'external_toc',
    sourceOrderNo: '', externalOrderNo: 'TOC-20260922-0001', customer: 'CUS000005', warehouse: 'LWH000001', currency: '人民币',
    auditStatus: 'approved', financeErpPushStatus: 'push_failed', businessDate: '2026-09-22',
    actualOutboundTime: '2026-09-22 15:10:00', pushTime: '2026-09-22 15:11:00', pushFailReason: '接口超时，财务ERP未确认接收',
    creator: '系统', createdAt: '2026-09-22 15:10:00', updater: '系统', updatedAt: '2026-09-22 15:11:00',
    lines: [{ id: 'sales-outbound-toc-line', product: 'SP0101010001', quantity: 1, price: 128, taxRate: '13' }],
  },
].map(normalizeOutboundRow);

const seedOutbounds = [...originalSeedOutbounds, ...additionalB2BOutbounds, ...directSourceOutbounds];

export { SALES_OUTBOUND_STORAGE_KEY };

export const salesOutbounds = loadAllOutbounds(seedOutbounds);

export function getSalesOutboundStatusBadges(row) {
  const badges = [
    {
      label: auditStatusLabels[row.auditStatus] || row.auditStatus,
      tone: 'success',
    },
  ];
  if (row.financeErpPushStatus) {
    const toneMap = {
      un_pushed: 'warning',
      pushing: 'info',
      push_success: 'success',
      push_failed: 'danger',
    };
    badges.push({
      label: financeErpPushStatusLabels[row.financeErpPushStatus] || row.financeErpPushStatus,
      tone: toneMap[row.financeErpPushStatus] || 'default',
    });
  }
  return badges;
}

const qtyCell = (value) => value ?? 0;

export const salesOutboundColumns = [
  { key: 'outboundNo', label: '单号', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: true },
  { key: 'businessDate', label: '业务日期', defaultWidth: 112, minWidth: 96, maxWidth: 160, ellipsis: true, sortable: true },
  { key: 'sourceType', label: '来源类型', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true, render: (value) => sourceTypeLabels[value] || value },
  { key: 'sourceNoticeNo', label: '来源销售发货通知单', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: (row) => row?.sourceType === 'b2b_notice' },
  { key: 'sourceOrderNo', label: '来源销售订单', defaultWidth: 180, minWidth: 160, maxWidth: 240, ellipsis: true, link: (row) => row?.sourceType === 'b2b_notice' },
  { key: 'customer', label: '客户', defaultWidth: 200, minWidth: 140, maxWidth: 280, ellipsis: true, render: (value, row) => formatSnapshotCodeName(value, row?.customerNameSnapshot) },
  { key: 'currency', label: '币别', defaultWidth: 112, minWidth: 96, maxWidth: 140, ellipsis: true, render: (value) => resolveOptionLabel(value, currencyOptions) },
  { key: 'warehouse', label: '出库仓库', defaultWidth: 160, minWidth: 120, maxWidth: 220, ellipsis: true, render: (value, row) => formatSnapshotCodeName(value, row?.warehouseNameSnapshot) },
  { key: 'auditStatus', label: '审核状态', defaultWidth: 96, minWidth: 88, maxWidth: 140, ellipsis: true, render: (value) => auditStatusLabels[value] || value, tone: () => 'text-erp-success' },
  { key: 'financeErpPushStatus', label: '推送财务ERP状态', defaultWidth: 112, minWidth: 96, maxWidth: 160, ellipsis: true, render: (value) => financeErpPushStatusLabels[value] || value, tone: (value) => (value === 'push_success' ? 'text-erp-success' : value === 'push_failed' ? 'text-erp-danger' : value === 'pushing' ? 'text-erp-info' : 'text-erp-warning') },
  { key: 'totalOutboundQty', label: '实际出库数量', defaultWidth: 112, minWidth: 96, maxWidth: 140, ellipsis: true, align: 'right', sortable: true, render: qtyCell },
  { key: 'amount', label: '价税合计', defaultWidth: 132, minWidth: 112, maxWidth: 180, ellipsis: true, align: 'right', sortable: true, render: (value) => formatAmount(value) },
  { key: 'taxAmount', label: '税额', defaultWidth: 104, minWidth: 88, maxWidth: 140, ellipsis: true, align: 'right', render: (value) => formatAmount(value) },
  { key: 'netAmount', label: '金额', defaultWidth: 132, minWidth: 112, maxWidth: 180, ellipsis: true, align: 'right', sortable: true, render: (value) => formatAmount(value) },
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
