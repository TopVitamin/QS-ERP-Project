import { resolveOptionLabel } from '../lib/codeName.js';
import { formatAmount } from '../lib/format.js';
import {
  auditStatusLabels,
  buildSeedReturnOutboundFromNotice,
  kingdeePushStatusLabels,
  registerReturnOutboundSeedRows,
} from '../lib/purchaseReturnOutboundLogic.js';
import { currencyOptions, logicalWarehouseOptions, supplierOptions } from './masterData.js';
import { purchaseReturns } from './purchaseReturnData.js';
import { purchaseReturnNotices } from './purchaseReturnNoticeData.js';
import { loadAllReturnOutbounds } from '../lib/purchaseReturnLogic.js';

/**
 * 采退出库单列表列、状态字典与演示种子数据（只读结果单，无新增入口）。
 * 列顺序按《采退出库单（详细稿）》「列表展示=是」；业务日期不列表展示，仅作默认排序。
 * 演示种子 8 张（列表页 Demo PRD §9.1）：推送成功 4、推送失败 2、未推送 1、推送中 1。
 */

const returnByNo = new Map(purchaseReturns.map((row) => [row.returnNo, row]));
const noticeById = new Map(purchaseReturnNotices.map((row) => [row.id, row]));

function buildSeed(noticeId, overrides) {
  const notice = noticeById.get(noticeId);
  const returnRow = returnByNo.get(notice?.sourceReturnNo);
  return notice ? buildSeedReturnOutboundFromNotice(notice, returnRow, overrides) : null;
}

const seedOutbounds = [
  buildSeed('return-notice-2', {
    id: 'return-outbound-1',
    outboundNo: 'CTCK-20260919-0001',
    kingdeePushStatus: 'push_success',
    pushTime: '2026-09-19 10:21:00',
    updatedAt: '2026-09-19 10:21:00',
  }),
  buildSeed('return-notice-3', {
    id: 'return-outbound-2',
    outboundNo: 'CTCK-20260919-0002',
    kingdeePushStatus: 'push_failed',
    pushTime: '2026-09-19 16:41:00',
    pushFailReason: '接口超时，金蝶未确认接收',
    updatedAt: '2026-09-19 16:41:00',
  }),
  buildSeed('return-notice-4', {
    id: 'return-outbound-3',
    outboundNo: 'CTCK-20260918-0003',
    kingdeePushStatus: 'push_success',
    pushTime: '2026-09-18 10:16:00',
    updatedAt: '2026-09-18 10:16:00',
  }),
  buildSeed('return-notice-11', {
    id: 'return-outbound-4',
    outboundNo: 'CTCK-20260921-0001',
    kingdeePushStatus: 'push_success',
    pushTime: '2026-09-21 14:31:00',
    updatedAt: '2026-09-21 14:31:00',
  }),
  buildSeed('return-notice-12', {
    id: 'return-outbound-5',
    outboundNo: 'CTCK-20260922-0001',
    kingdeePushStatus: 'push_failed',
    pushTime: '2026-09-22 09:51:00',
    pushFailReason: '接口超时，金蝶未确认接收',
    updatedAt: '2026-09-22 09:51:00',
  }),
  buildSeed('return-notice-13', {
    id: 'return-outbound-6',
    outboundNo: 'CTCK-20260922-0002',
    kingdeePushStatus: 'un_pushed',
    pushTime: '',
    updatedAt: '2026-09-22 11:05:00',
  }),
  buildSeed('return-notice-14', {
    id: 'return-outbound-7',
    outboundNo: 'CTCK-20260922-0003',
    kingdeePushStatus: 'pushing',
    pushTime: '2026-09-22 15:31:00',
    updatedAt: '2026-09-22 15:31:00',
  }),
  buildSeed('return-notice-15', {
    id: 'return-outbound-8',
    outboundNo: 'CTCK-20260923-0001',
    kingdeePushStatus: 'push_success',
    pushTime: '2026-09-23 09:16:00',
    updatedAt: '2026-09-23 09:16:00',
  }),
].filter(Boolean);

// 浏览器已有旧 Mock 时补齐缺失的演示种子，保证列表覆盖各推送状态；本地已有记录原样保留。
const storedOutbounds = loadAllReturnOutbounds();
const storedOutboundIds = new Set(storedOutbounds.map((row) => row.id));

export const purchaseReturnOutbounds = [
  ...storedOutbounds,
  ...seedOutbounds.filter((row) => !storedOutboundIds.has(row.id)),
];

registerReturnOutboundSeedRows(purchaseReturnOutbounds);

export function getReturnOutboundStatusBadges(row) {
  const toneMap = {
    un_pushed: 'warning',
    pushing: 'info',
    push_success: 'success',
    push_failed: 'danger',
  };
  return [
    { label: auditStatusLabels[row.auditStatus] || row.auditStatus, tone: 'success' },
    { label: kingdeePushStatusLabels[row.kingdeePushStatus] || row.kingdeePushStatus, tone: toneMap[row.kingdeePushStatus] || 'default' },
  ];
}

const qtyCell = (value) => value ?? 0;

export const purchaseReturnOutboundColumns = [
  { key: 'outboundNo', label: '单号', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: true },
  { key: 'sourceNoticeNo', label: '来源采退发货通知单', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: true },
  { key: 'sourceReturnNo', label: '来源采购退货单', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: true },
  { key: 'supplier', label: '供应商', defaultWidth: 200, minWidth: 140, maxWidth: 280, ellipsis: true, render: (value) => resolveOptionLabel(value, supplierOptions) },
  { key: 'warehouse', label: '出库仓库', defaultWidth: 180, minWidth: 140, maxWidth: 240, ellipsis: true, render: (value) => resolveOptionLabel(value, logicalWarehouseOptions) },
  { key: 'auditStatus', label: '审核状态', defaultWidth: 96, minWidth: 88, maxWidth: 140, ellipsis: true, render: (value) => auditStatusLabels[value] || value, tone: () => 'text-erp-success' },
  { key: 'kingdeePushStatus', label: '金蝶推送状态', defaultWidth: 112, minWidth: 96, maxWidth: 160, ellipsis: true, render: (value) => kingdeePushStatusLabels[value] || value, tone: (value) => (value === 'push_success' ? 'text-erp-success' : value === 'push_failed' ? 'text-erp-danger' : value === 'pushing' ? 'text-erp-info' : 'text-erp-warning') },
  { key: 'totalOutboundQty', label: '实际出库数量', defaultWidth: 120, minWidth: 100, maxWidth: 150, ellipsis: true, align: 'right', sortable: true, render: qtyCell },
  { key: 'currency', label: '币别', defaultWidth: 112, minWidth: 96, maxWidth: 140, ellipsis: true, render: (value) => resolveOptionLabel(value, currencyOptions) },
  { key: 'amount', label: '价税合计', defaultWidth: 132, minWidth: 112, maxWidth: 180, ellipsis: true, align: 'right', sortable: true, render: (value) => formatAmount(value) },
  { key: 'taxAmount', label: '税额', defaultWidth: 112, minWidth: 96, maxWidth: 160, ellipsis: true, align: 'right', render: (value) => formatAmount(value) },
  { key: 'netAmount', label: '金额', defaultWidth: 132, minWidth: 112, maxWidth: 180, ellipsis: true, align: 'right', sortable: true, render: (value) => formatAmount(value) },
  { key: 'createdAt', label: '创建时间', defaultWidth: 160, minWidth: 140, maxWidth: 200, ellipsis: true, sortable: true },
  { key: 'updatedAt', label: '最后更新时间', defaultWidth: 160, minWidth: 140, maxWidth: 200, ellipsis: true, sortable: true },
];
