import { resolveOptionLabel } from '../lib/codeName.js';
import { EMPTY_PLACEHOLDER, formatAmount } from '../lib/format.js';
import {
  auditStatusLabels,
  buildSeedInboundFromNotice,
  INBOUND_STORAGE_KEY,
  kingdeePushStatusLabels,
  loadAllInbounds,
  normalizeInboundRow,
} from '../lib/inboundLogic.js';
import { supplierOptions, warehouseOptions } from './masterData.js';
import { orders } from './orderData.js';
import { receiptNotices } from './receiptNoticeData.js';

/**
 * 演示种子只保留 2 条，与采购收货通知单、采购订单链路对齐：
 * 1. 推送成功：notice-seed-2 → order-2
 * 2. 推送失败：notice-seed-failed → order-2（失败后到系统集成中心重推，本列表无重推按钮）
 *
 * storageKey 升级后会丢弃浏览器里旧的测试入库单。
 */
const orderForInboundDemo = orders.find((order) => order.id === 'order-2');
const noticePushSuccess = receiptNotices.find((notice) => notice.id === 'notice-seed-2');
const noticePushFailed = receiptNotices.find((notice) => notice.id === 'notice-seed-failed');

const seedInbounds = [
  noticePushSuccess && orderForInboundDemo
    ? buildSeedInboundFromNotice(noticePushSuccess, orderForInboundDemo, {
      id: 'inbound-seed-1',
      inboundNo: 'CGRK-20260917-0001',
      kingdeePushStatus: 'push_success',
      pushTime: '2026-09-17 15:31:00',
      updatedAt: '2026-09-17 15:31:00',
    })
    : null,
  noticePushFailed && orderForInboundDemo
    ? buildSeedInboundFromNotice(noticePushFailed, orderForInboundDemo, {
      id: 'inbound-seed-2',
      inboundNo: 'CGRK-20260918-0001',
      kingdeePushStatus: 'push_failed',
      pushTime: '2026-09-18 11:22:00',
      pushFailReason: '接口超时，金蝶未确认接收',
      updatedAt: '2026-09-18 11:22:00',
    })
    : null,
].filter(Boolean).map(normalizeInboundRow);

export { INBOUND_STORAGE_KEY };

export const inboundOrders = loadAllInbounds(seedInbounds);

export function getInboundStatusBadges(row) {
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

function formatCurrencyAmount(value, row) {
  const symbol = row.currency === '人民币' ? '¥' : `${row.currency || 'CNY'} `;
  return `${symbol}${formatAmount(value)}`;
}

const qtyCell = (value) => value ?? 0;

export const inboundColumns = [
  { key: 'inboundNo', label: '单号', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: true },
  { key: 'businessDate', label: '业务日期', defaultWidth: 112, minWidth: 96, maxWidth: 160, ellipsis: true, sortable: true },
  { key: 'sourceNoticeNo', label: '来源采购收货通知单', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: true },
  { key: 'sourceOrderNo', label: '来源采购订单', defaultWidth: 180, minWidth: 160, maxWidth: 240, ellipsis: true, link: true },
  { key: 'supplier', label: '供应商', defaultWidth: 200, minWidth: 140, maxWidth: 280, ellipsis: true, render: (value) => resolveOptionLabel(value, supplierOptions) },
  { key: 'currency', label: '币别', defaultWidth: 88, minWidth: 72, maxWidth: 120, ellipsis: true, render: (value) => value || EMPTY_PLACEHOLDER },
  { key: 'warehouse', label: '入库仓库', defaultWidth: 160, minWidth: 120, maxWidth: 220, ellipsis: true, render: (value) => resolveOptionLabel(value, warehouseOptions) },
  { key: 'auditStatus', label: '审核状态', defaultWidth: 96, minWidth: 88, maxWidth: 140, ellipsis: true, render: (value) => auditStatusLabels[value] || value, tone: () => 'text-erp-success' },
  { key: 'kingdeePushStatus', label: '金蝶推送状态', defaultWidth: 112, minWidth: 96, maxWidth: 160, ellipsis: true, render: (value) => kingdeePushStatusLabels[value] || value, tone: (value) => (value === 'push_success' ? 'text-erp-success' : value === 'push_failed' ? 'text-erp-danger' : value === 'pushing' ? 'text-erp-info' : 'text-erp-warning') },
  { key: 'totalInboundQty', label: '实际入库数量', defaultWidth: 112, minWidth: 96, maxWidth: 140, ellipsis: true, align: 'right', sortable: true, render: qtyCell },
  { key: 'totalAmount', label: '金额', defaultWidth: 132, minWidth: 112, maxWidth: 180, ellipsis: true, align: 'right', sortable: true, render: (value, row) => formatCurrencyAmount(value, row) },
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
