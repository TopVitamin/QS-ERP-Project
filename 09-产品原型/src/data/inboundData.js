import { resolveOptionLabel } from '../lib/codeName.js';
import { formatAmount } from '../lib/format.js';
import {
  auditStatusLabels,
  buildSeedInboundFromNotice,
  cleanLegacyInboundWarehouseRows,
  INBOUND_STORAGE_KEY,
  financeErpPushStatusLabels,
  loadAllInbounds,
  normalizeInboundRow,
} from '../lib/inboundLogic.js';
import { currencyOptions, supplierOptions } from './masterData.js';
import { getInventoryLogicalWarehouseOptions } from './warehouseData.js';
import { formatSnapshotCodeName } from '../lib/documentNameSnapshots.js';
import { orders } from './orderData.js';
import { receiptNotices } from './receiptNoticeData.js';

/** 演示种子与来源收货通知、采购订单对齐，覆盖四种推送财务ERP状态。 */
const orderForInboundDemo = orders.find((order) => order.id === 'order-2');
const noticePushSuccess = receiptNotices.find((notice) => notice.id === 'notice-seed-2');
const noticePushFailed = receiptNotices.find((notice) => notice.id === 'notice-seed-failed');
const additionalInboundScenarios = [
  ['notice-seed-inbound-3', 'inbound-seed-3', 'push_success', '2026-09-21 12:01:00', ''],
  ['notice-seed-inbound-4', 'inbound-seed-4', 'push_failed', '2026-09-21 12:31:00', '接口超时，财务ERP未确认接收'],
  ['notice-seed-inbound-5', 'inbound-seed-5', 'un_pushed', '', ''],
  ['notice-seed-inbound-6', 'inbound-seed-6', 'pushing', '', ''],
  ['notice-seed-inbound-7', 'inbound-seed-7', 'push_success', '2026-09-21 14:01:00', ''],
  ['notice-seed-inbound-8', 'inbound-seed-8', 'push_failed', '2026-09-21 14:31:00', '接口超时，财务ERP未确认接收'],
].map(([noticeId, inboundId, status, pushTime, pushFailReason]) => {
  const notice = receiptNotices.find((item) => item.id === noticeId);
  const order = orders.find((item) => item.id === notice?.sourceOrderId);
  if (!notice || !order) return null;
  return buildSeedInboundFromNotice(notice, order, {
    id: inboundId,
    inboundNo: notice.inboundNo,
    financeErpPushStatus: status,
    pushTime,
    pushFailReason,
    updatedAt: notice.finalReceiveTime,
  });
});

const seedInbounds = [
  noticePushSuccess && orderForInboundDemo
    ? buildSeedInboundFromNotice(noticePushSuccess, orderForInboundDemo, {
      id: 'inbound-seed-1',
      inboundNo: 'CGRK-20260917-0001',
      financeErpPushStatus: 'push_success',
      pushTime: '2026-09-17 15:31:00',
      updatedAt: '2026-09-17 15:31:00',
    })
    : null,
  noticePushFailed && orderForInboundDemo
    ? buildSeedInboundFromNotice(noticePushFailed, orderForInboundDemo, {
      id: 'inbound-seed-2',
      inboundNo: 'CGRK-20260918-0001',
      financeErpPushStatus: 'push_failed',
      pushTime: '2026-09-18 11:22:00',
      pushFailReason: '接口超时，财务ERP未确认接收',
      updatedAt: '2026-09-18 11:22:00',
    })
    : null,
  ...additionalInboundScenarios,
].filter(Boolean).map(normalizeInboundRow);

export { INBOUND_STORAGE_KEY };

cleanLegacyInboundWarehouseRows(seedInbounds, receiptNotices, orders);

export const inboundOrders = loadAllInbounds(seedInbounds);

export function getInboundStatusBadges(row) {
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

export const inboundColumns = [
  { key: 'inboundNo', label: '单号', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: true },
  { key: 'businessDate', label: '业务日期', defaultWidth: 112, minWidth: 96, maxWidth: 160, ellipsis: true, sortable: true },
  { key: 'sourceNoticeNo', label: '来源采购收货通知单', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: true },
  { key: 'sourceOrderNo', label: '来源采购订单', defaultWidth: 180, minWidth: 160, maxWidth: 240, ellipsis: true, link: true },
  { key: 'supplier', label: '供应商', defaultWidth: 200, minWidth: 140, maxWidth: 280, ellipsis: true, render: (value, row) => formatSnapshotCodeName(value, row?.supplierNameSnapshot) },
  { key: 'currency', label: '币别', defaultWidth: 112, minWidth: 96, maxWidth: 140, ellipsis: true, render: (value) => resolveOptionLabel(value, currencyOptions) },
  { key: 'warehouse', label: '入库仓库', defaultWidth: 160, minWidth: 120, maxWidth: 220, ellipsis: true, render: (value, row) => formatSnapshotCodeName(value, row?.warehouseNameSnapshot) },
  { key: 'auditStatus', label: '审核状态', defaultWidth: 96, minWidth: 88, maxWidth: 140, ellipsis: true, render: (value) => auditStatusLabels[value] || value, tone: () => 'text-erp-success' },
  { key: 'financeErpPushStatus', label: '推送财务ERP状态', defaultWidth: 112, minWidth: 96, maxWidth: 160, ellipsis: true, render: (value) => financeErpPushStatusLabels[value] || value, tone: (value) => (value === 'push_success' ? 'text-erp-success' : value === 'push_failed' ? 'text-erp-danger' : value === 'pushing' ? 'text-erp-info' : 'text-erp-warning') },
  { key: 'totalInboundQty', label: '实际入库数量', defaultWidth: 112, minWidth: 96, maxWidth: 140, ellipsis: true, align: 'right', sortable: true, render: qtyCell },
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

export function buildSourceOrderFilterOptions(rows = []) {
  const map = new Map();
  rows.forEach((row) => {
    if (!row.sourceOrderNo) return;
    map.set(row.sourceOrderNo, { value: row.sourceOrderNo, label: row.sourceOrderNo });
  });
  return [{ value: '', label: '全部订单' }, ...map.values()];
}
