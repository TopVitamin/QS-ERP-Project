/**
 * 其他出库单（结果单）演示数据与列表列定义。
 *
 * 说明：本文件是演示用 Mock 数据，单号、时间与数量为虚构，口径见
 * 《其他出库单（详细稿）》《其他出库单前端Demo版PRD》；
 * 业务类型取值落在字段清单枚举内（盘亏、样品领用、赠送、报废、借出）。
 * 结果单由申请回传或仓库主动回传自动生成，创建即为已审核，创建人与最后更新人显示「系统」。
 */
import { createElement } from 'react';
import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import {
  ensureOtherOutboundSeeds,
  financeErpPushStatusLabels,
  financeErpPushStatusTones,
  normalizeOtherOutboundRow,
  otherOutboundAuditLabels,
  otherOutboundAuditTones,
  otherOutboundSourceTypeLabels,
  resolveFinanceErpPushStatusTone,
  resolveOtherOutboundAuditTone,
} from '../lib/otherOutboundLogic.js';
import { resolveLogicalWarehouseLabel } from './warehouseData.js';

const seedOutbounds = [
  {
    id: 'other-outbound-seed-1',
    outboundNo: 'QTCK-20260922-0001',
    sourceType: 'request',
    sourceRequestNo: 'QTCKSQ-20260922-0001',
    logicalWarehouse: 'LWH000001',
    businessType: '报废',
    actualOutboundTime: '2026-09-23 09:40:00',
    financeErpPushStatus: 'push_success',
    pushTime: '2026-09-23 09:41:00',
    createdAt: '2026-09-23 09:40:00',
    updatedAt: '2026-09-23 09:41:00',
    lines: [
      { product: 'SP0101030001', quantity: 12, sourceOutboundLine: 'QTCKSQ-20260922-0001 第1行' },
    ],
  },
  {
    id: 'other-outbound-seed-2',
    outboundNo: 'QTCK-20260922-0002',
    sourceType: 'request',
    sourceRequestNo: 'QTCKSQ-20260922-0004',
    logicalWarehouse: 'LWH000009',
    businessType: '盘亏',
    actualOutboundTime: '2026-09-22 15:10:00',
    financeErpPushStatus: 'push_success',
    pushTime: '2026-09-22 15:11:00',
    createdAt: '2026-09-22 15:10:00',
    updatedAt: '2026-09-22 15:11:00',
    remark: '在途仓盘亏直接记账生成',
    lines: [
      { product: 'SP0101010001', quantity: 2, sourceOutboundLine: 'QTCKSQ-20260922-0004 第1行' },
    ],
  },
  {
    id: 'other-outbound-seed-3',
    outboundNo: 'QTCK-20260923-0001',
    sourceType: 'request',
    sourceRequestNo: 'QTCKSQ-20260922-0002',
    logicalWarehouse: 'LWH000002',
    businessType: '报废',
    actualOutboundTime: '2026-09-23 08:30:00',
    financeErpPushStatus: 'push_failed',
    pushTime: '2026-09-23 08:31:00',
    pushFailReason: '财务ERP接口超时，未确认接收',
    createdAt: '2026-09-23 08:30:00',
    updatedAt: '2026-09-23 08:31:00',
    lines: [
      { product: 'SP0101020001', quantity: 70, sourceOutboundLine: 'QTCKSQ-20260922-0002 第1行' },
    ],
  },
  {
    id: 'other-outbound-seed-4',
    outboundNo: 'QTCK-20260923-0002',
    sourceType: 'warehouse',
    sourceRequestNo: '',
    sourceSystem: 'WMS',
    sourceNo: 'WMS-20260922-0008',
    logicalWarehouse: 'LWH000002',
    businessType: '盘亏',
    actualOutboundTime: '2026-09-23 09:20:00',
    financeErpPushStatus: 'push_success',
    pushTime: '2026-09-23 09:21:00',
    createdAt: '2026-09-23 09:20:00',
    updatedAt: '2026-09-23 09:21:00',
    remark: '',
    lines: [
      { product: 'SP0103020001', quantity: 2 },
    ],
  },
  {
    id: 'other-outbound-seed-5',
    outboundNo: 'QTCK-20260923-0003',
    sourceType: 'warehouse',
    sourceRequestNo: '',
    sourceSystem: 'WMS',
    sourceNo: 'WMS-20260923-0002',
    logicalWarehouse: 'LWH000006',
    businessType: '盘亏',
    actualOutboundTime: '2026-09-23 10:40:00',
    financeErpPushStatus: 'push_failed',
    pushTime: '2026-09-23 10:41:00',
    pushFailReason: '财务ERP接口超时，未确认接收',
    createdAt: '2026-09-23 10:40:00',
    updatedAt: '2026-09-23 10:41:00',
    lines: [
      { product: 'SP0103010001', quantity: 5 },
    ],
  },
  {
    id: 'other-outbound-seed-6',
    outboundNo: 'QTCK-20260923-0004',
    sourceType: 'request',
    sourceRequestNo: 'QTCKSQ-20260923-0005',
    logicalWarehouse: 'LWH000005',
    businessType: '赠送',
    actualOutboundTime: '2026-09-23 14:20:00',
    financeErpPushStatus: 'un_pushed',
    pushTime: '',
    createdAt: '2026-09-23 14:20:00',
    updatedAt: '2026-09-23 14:20:00',
    remark: '',
    lines: [
      { product: 'SP0101030001', quantity: 9, sourceOutboundLine: 'QTCKSQ-20260923-0005 第1行' },
    ],
  },
  {
    id: 'other-outbound-seed-7',
    outboundNo: 'QTCK-20260923-0005',
    sourceType: 'request',
    sourceRequestNo: 'QTCKSQ-20260923-0006',
    logicalWarehouse: 'LWH000007',
    businessType: '样品领用',
    actualOutboundTime: '2026-09-23 16:05:00',
    financeErpPushStatus: 'pushing',
    pushTime: '',
    createdAt: '2026-09-23 16:05:00',
    updatedAt: '2026-09-23 16:06:00',
    lines: [
      { product: 'SP0102020001', quantity: 3, sourceOutboundLine: 'QTCKSQ-20260923-0006 第1行' },
    ],
  },
  {
    id: 'other-outbound-seed-8',
    outboundNo: 'QTCK-20260923-0006',
    sourceType: 'warehouse',
    sourceRequestNo: '',
    sourceSystem: 'WMS',
    sourceNo: 'WMS-20260923-0003',
    logicalWarehouse: 'LWH000001',
    businessType: '盘亏',
    actualOutboundTime: '2026-09-23 11:30:00',
    financeErpPushStatus: 'push_success',
    pushTime: '2026-09-23 11:31:00',
    createdAt: '2026-09-23 11:30:00',
    updatedAt: '2026-09-23 11:31:00',
    lines: [
      { product: 'SP0101020001', quantity: 3 },
    ],
  },
];

export const otherOutbounds = seedOutbounds.map(normalizeOtherOutboundRow);

// Demo 引导：首次运行时把种子结果单写入本地 Mock。
ensureOtherOutboundSeeds(otherOutbounds);

/** 页头两枚状态标签：审核状态、推送财务ERP状态（其他出库单主PRD §6.1）。 */
export function getOtherOutboundStatusBadges(row) {
  if (!row) return [];
  return [
    {
      label: otherOutboundAuditLabels[row.auditStatus] || row.auditStatus,
      tone: otherOutboundAuditTones[row.auditStatus] || 'success',
    },
    {
      label: financeErpPushStatusLabels[row.financeErpPushStatus] || row.financeErpPushStatus,
      tone: financeErpPushStatusTones[row.financeErpPushStatus] || 'warning',
    },
  ];
}

const qtyCell = (value) => (value == null ? EMPTY_PLACEHOLDER : value);

/** 来源其他出库申请单筛选项：存在出库记录的申请单（其他出库单前端Demo版PRD_列表页 §2）。 */
export function buildSourceRequestFilterOptions(rows = []) {
  const map = new Map();
  rows.forEach((row) => {
    if (!row.sourceRequestNo) return;
    map.set(row.sourceRequestNo, { value: row.sourceRequestNo, label: row.sourceRequestNo });
  });
  return [{ value: '', label: '全部申请单' }, ...map.values()];
}

export const otherOutboundColumns = [
  {
    key: 'outboundNo',
    label: '单号',
    defaultWidth: 190,
    minWidth: 170,
    maxWidth: 240,
    ellipsis: true,
    link: true,
    // Demo Mock 生成的出库单带「Mock」角标，与正式回传生成的出库单区分（弹窗与Mock §3.4）
    render: (value, row) => (row.isMock
      ? createElement(
        'span',
        { className: 'inline-flex items-center gap-1.5' },
        value,
        createElement('span', { className: 'rounded-erp-status bg-erp-surface-muted px-1 text-[11px] text-erp-text-muted' }, 'Mock'),
      )
      : value),
  },
  {
    key: 'sourceType',
    label: '来源类型',
    defaultWidth: 120,
    minWidth: 104,
    maxWidth: 160,
    ellipsis: true,
    render: (value) => otherOutboundSourceTypeLabels[value] || value,
  },
  {
    key: 'sourceRequestNo',
    label: '来源其他出库申请单',
    defaultWidth: 200,
    minWidth: 170,
    maxWidth: 260,
    ellipsis: true,
    link: true,
    render: (value) => value || EMPTY_PLACEHOLDER,
  },
  { key: 'sourceSystem', label: '来源系统', defaultWidth: 108, minWidth: 92, maxWidth: 150, ellipsis: true },
  { key: 'sourceNo', label: '来源单号', defaultWidth: 170, minWidth: 140, maxWidth: 220, ellipsis: true },
  {
    key: 'logicalWarehouse',
    label: '出库仓库',
    defaultWidth: 190,
    minWidth: 150,
    maxWidth: 260,
    ellipsis: true,
    render: (value) => resolveLogicalWarehouseLabel(value),
  },
  { key: 'businessType', label: '业务类型', defaultWidth: 108, minWidth: 92, maxWidth: 150, ellipsis: true },
  {
    key: 'auditStatus',
    label: '审核状态',
    defaultWidth: 104,
    minWidth: 92,
    maxWidth: 140,
    ellipsis: true,
    render: (value) => otherOutboundAuditLabels[value] || value,
    tone: (value) => resolveOtherOutboundAuditTone(value),
  },
  {
    key: 'financeErpPushStatus',
    label: '推送财务ERP状态',
    defaultWidth: 120,
    minWidth: 104,
    maxWidth: 160,
    ellipsis: true,
    render: (value) => financeErpPushStatusLabels[value] || value,
    tone: (value) => resolveFinanceErpPushStatusTone(value),
  },
  { key: 'totalOutboundQty', label: '实际出库数量', defaultWidth: 120, minWidth: 104, maxWidth: 150, ellipsis: true, align: 'right', sortable: true, render: qtyCell },
  { key: 'createdAt', label: '创建时间', defaultWidth: 170, minWidth: 150, maxWidth: 220, ellipsis: true, sortable: true },
  { key: 'updatedAt', label: '最后更新时间', defaultWidth: 170, minWidth: 150, maxWidth: 220, ellipsis: true, sortable: true },
];
