import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import { resolveLogicalWarehouseLabel } from './warehouseData.js';
import { ensureSeedRows } from '../lib/mockStorage.js';
import {
  kingdeePushStatusLabels,
  kingdeePushStatusTones,
  loadAllOtherInbounds,
  normalizeOtherInboundRow,
  otherInboundAuditLabels,
  otherInboundAuditTones,
  otherInboundSourceTypeLabels,
  OTHER_INBOUND_STORAGE_KEY,
} from '../lib/otherInboundLogic.js';

/**
 * 其他入库单演示数据。
 *
 * 覆盖《其他入库单前端Demo版PRD_列表页》§9.1 与《详情页》§5.1 要求：
 * 来源类型 申请执行4单、仓库主动回传2单；金蝶推送 推送成功2、推送失败2、未推送1、推送中1；
 * 审核状态正常数据均为已审核；至少1单可跳转来源申请单、1单带来源系统与来源单号。
 * 单号、数量与时间为虚构；枚举取值以《其他入库单（详细稿）》为准。
 */
const seedInbounds = [
  {
    id: 'other-inbound-seed-1',
    inboundNo: 'QTRK-20260917-0001',
    sourceType: 'request',
    sourceRequestId: 'other-inbound-request-seed-2',
    sourceRequestNo: 'QTRKSQ-20260917-0002',
    sourceSystem: '',
    sourceNo: '',
    warehouse: 'LWH000001',
    businessType: '样品回收',
    auditStatus: 'approved',
    kingdeePushStatus: 'push_success',
    actualInboundTime: '2026-09-17 15:30:00',
    pushTime: '2026-09-17 15:31:00',
    pushFailReason: '',
    remark: '',
    auditor: '',
    auditTime: '2026-09-17 15:30:00',
    creator: '系统',
    createdAt: '2026-09-17 15:30:00',
    updater: '系统',
    updatedAt: '2026-09-17 15:31:00',
    lines: [
      { id: 'other-inbound-line-1-1', sourceRequestLineId: 'request-line-2-1', sourceInboundLine: 'QTRKSQ-20260917-0002 第1行', product: 'SP0101030001', quantity: 36 },
    ],
  },
  {
    id: 'other-inbound-seed-2',
    inboundNo: 'QTRK-20260918-0002',
    sourceType: 'request',
    sourceRequestId: 'other-inbound-request-seed-3',
    sourceRequestNo: 'QTRKSQ-20260918-0003',
    sourceSystem: '',
    sourceNo: '',
    warehouse: 'LWH000005',
    businessType: '借出归还',
    auditStatus: 'approved',
    kingdeePushStatus: 'push_failed',
    actualInboundTime: '2026-09-18 11:20:00',
    pushTime: '2026-09-18 11:22:00',
    pushFailReason: '接口超时，金蝶未确认接收',
    remark: '',
    auditor: '',
    auditTime: '2026-09-18 11:20:00',
    creator: '系统',
    createdAt: '2026-09-18 11:20:00',
    updater: '系统',
    updatedAt: '2026-09-18 11:22:00',
    lines: [
      { id: 'other-inbound-line-2-1', sourceRequestLineId: 'request-line-3-1', sourceInboundLine: 'QTRKSQ-20260918-0003 第1行', product: 'SP0101010001', quantity: 25 },
    ],
  },
  {
    id: 'other-inbound-seed-3',
    inboundNo: 'QTRK-20260919-0003',
    sourceType: 'request',
    sourceRequestId: 'other-inbound-request-seed-4',
    sourceRequestNo: 'QTRKSQ-20260919-0004',
    sourceSystem: '',
    sourceNo: '',
    warehouse: 'LWH000002',
    businessType: '退料',
    auditStatus: 'approved',
    kingdeePushStatus: 'push_success',
    actualInboundTime: '2026-09-19 14:05:00',
    pushTime: '2026-09-19 14:06:00',
    pushFailReason: '',
    remark: '',
    auditor: '',
    auditTime: '2026-09-19 14:05:00',
    creator: '系统',
    createdAt: '2026-09-19 14:05:00',
    updater: '系统',
    updatedAt: '2026-09-19 14:06:00',
    lines: [
      { id: 'other-inbound-line-3-1', sourceRequestLineId: 'request-line-4-1', sourceInboundLine: 'QTRKSQ-20260919-0004 第1行', product: 'SP0103020001', quantity: 18 },
    ],
  },
  {
    id: 'other-inbound-seed-4',
    inboundNo: 'QTRK-20260920-0004',
    sourceType: 'request',
    sourceRequestId: 'other-inbound-request-seed-5',
    sourceRequestNo: 'QTRKSQ-20260920-0005',
    sourceSystem: '',
    sourceNo: '',
    warehouse: 'LWH000007',
    businessType: '赠品入库',
    auditStatus: 'approved',
    kingdeePushStatus: 'un_pushed',
    actualInboundTime: '2026-09-20 10:10:00',
    pushTime: '',
    pushFailReason: '',
    remark: '',
    auditor: '',
    auditTime: '2026-09-20 10:10:00',
    creator: '系统',
    createdAt: '2026-09-20 10:10:00',
    updater: '系统',
    updatedAt: '2026-09-20 10:10:00',
    lines: [
      { id: 'other-inbound-line-4-1', sourceRequestLineId: 'request-line-5-1', sourceInboundLine: 'QTRKSQ-20260920-0005 第1行', product: 'SP0102020001', quantity: 12 },
    ],
  },
  {
    id: 'other-inbound-seed-5',
    inboundNo: 'QTRK-20260921-0005',
    sourceType: 'warehouse_push',
    sourceRequestId: '',
    sourceRequestNo: '',
    sourceSystem: 'WMS',
    sourceNo: 'WMS-20260921-0007',
    warehouse: 'LWH000001',
    businessType: '盘盈',
    auditStatus: 'approved',
    kingdeePushStatus: 'push_failed',
    actualInboundTime: '2026-09-21 09:40:00',
    pushTime: '2026-09-21 09:42:00',
    pushFailReason: '接口超时，金蝶未确认接收',
    remark: '',
    auditor: '',
    auditTime: '2026-09-21 09:40:00',
    creator: '系统',
    createdAt: '2026-09-21 09:40:00',
    updater: '系统',
    updatedAt: '2026-09-21 09:42:00',
    lines: [
      { id: 'other-inbound-line-5-1', sourceRequestLineId: '', sourceInboundLine: '', product: 'SP0101010001', quantity: 5 },
    ],
  },
  {
    id: 'other-inbound-seed-6',
    inboundNo: 'QTRK-20260922-0006',
    sourceType: 'warehouse_push',
    sourceRequestId: '',
    sourceRequestNo: '',
    sourceSystem: 'WMS',
    sourceNo: 'WMS-20260922-0011',
    warehouse: 'LWH000006',
    businessType: '盘盈',
    auditStatus: 'approved',
    kingdeePushStatus: 'pushing',
    actualInboundTime: '2026-09-22 17:20:00',
    pushTime: '',
    pushFailReason: '',
    remark: '',
    auditor: '',
    auditTime: '2026-09-22 17:20:00',
    creator: '系统',
    createdAt: '2026-09-22 17:20:00',
    updater: '系统',
    updatedAt: '2026-09-22 17:20:00',
    lines: [
      { id: 'other-inbound-line-6-1', sourceRequestLineId: '', sourceInboundLine: '', product: 'SP0103010001', quantity: 8 },
    ],
  },
];

export const otherInbounds = loadAllOtherInbounds(seedInbounds).map(normalizeOtherInboundRow);

// 首次加载落库种子：避免第一次局部写入（如自动生成下游单据）把种子挤掉
ensureSeedRows(OTHER_INBOUND_STORAGE_KEY, otherInbounds);

export function getOtherInboundStatusBadges(row) {
  if (!row) return [];
  return [
    {
      label: otherInboundAuditLabels[row.auditStatus] || row.auditStatus || EMPTY_PLACEHOLDER,
      tone: otherInboundAuditTones[row.auditStatus] || 'success',
    },
    {
      label: kingdeePushStatusLabels[row.kingdeePushStatus] || row.kingdeePushStatus || EMPTY_PLACEHOLDER,
      tone: kingdeePushStatusTones[row.kingdeePushStatus] || 'warning',
    },
  ];
}

const qtyCell = (value) => value ?? 0;

/** 列表列按《其他入库单前端Demo版PRD_列表页》§4.2；业务日期不作为列表列，仅作默认排序。 */
export const otherInboundColumns = [
  { key: 'inboundNo', label: '单号', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: true },
  { key: 'sourceType', label: '来源类型', defaultWidth: 120, minWidth: 104, maxWidth: 160, ellipsis: true, render: (value) => otherInboundSourceTypeLabels[value] || value },
  { key: 'sourceRequestNo', label: '来源其他入库申请单', defaultWidth: 200, minWidth: 170, maxWidth: 260, ellipsis: true, link: true },
  { key: 'sourceSystem', label: '来源系统', defaultWidth: 110, minWidth: 96, maxWidth: 160, ellipsis: true },
  { key: 'sourceNo', label: '来源单号', defaultWidth: 170, minWidth: 150, maxWidth: 220, ellipsis: true },
  { key: 'warehouse', label: '入库仓库', defaultWidth: 190, minWidth: 150, maxWidth: 260, ellipsis: true, render: (value) => resolveLogicalWarehouseLabel(value) },
  { key: 'businessType', label: '业务类型', defaultWidth: 110, minWidth: 96, maxWidth: 160, ellipsis: true },
  {
    key: 'auditStatus',
    label: '审核状态',
    defaultWidth: 96,
    minWidth: 88,
    maxWidth: 140,
    ellipsis: true,
    render: (value) => otherInboundAuditLabels[value] || value,
    tone: (value) => (value === 'approved' ? 'text-erp-success' : value === 'pending' ? 'text-erp-info' : 'text-erp-warning'),
  },
  {
    key: 'kingdeePushStatus',
    label: '金蝶推送状态',
    defaultWidth: 112,
    minWidth: 96,
    maxWidth: 160,
    ellipsis: true,
    render: (value) => kingdeePushStatusLabels[value] || value,
    tone: (value) => (value === 'push_success' ? 'text-erp-success' : value === 'push_failed' ? 'text-erp-danger' : value === 'pushing' ? 'text-erp-info' : 'text-erp-warning'),
  },
  { key: 'totalInboundQty', label: '实际入库数量', defaultWidth: 120, minWidth: 104, maxWidth: 160, ellipsis: true, align: 'right', sortable: true, render: qtyCell },
  { key: 'createdAt', label: '创建时间', defaultWidth: 170, minWidth: 150, maxWidth: 220, ellipsis: true, sortable: true },
  { key: 'updatedAt', label: '最后更新时间', defaultWidth: 170, minWidth: 150, maxWidth: 220, ellipsis: true, sortable: true },
];

/** 结果单列表「来源其他入库申请单」筛选项：选项为存在入库记录的申请单。 */
export function buildSourceRequestFilterOptions(rows = otherInbounds) {
  const map = new Map();
  rows.forEach((row) => {
    if (!row.sourceRequestNo) return;
    map.set(row.sourceRequestNo, { value: row.sourceRequestNo, label: row.sourceRequestNo });
  });
  return [{ value: '', label: '全部申请单' }, ...map.values()];
}
