/**
 * 其他出库申请单演示数据与列表列定义。
 *
 * 说明：本文件是演示用 Mock 数据，单号、时间与数量为虚构，口径见
 * 《其他出库申请单（详细稿）》《其他出库申请单前端Demo版PRD》；
 * 业务类型取值落在字段清单枚举内（盘亏、样品领用、赠送、报废、借出）。
 * 种子预占与库存余额对齐 `inventoryStockData.js`：已审核、推送失败、待发货、取消中的种子单
 * 在首次运行时由 `ensureOtherOutboundRequestSeeds` 补齐预占记录，保证取消释放与回传消耗可演示。
 */
import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import {
  ensureOtherOutboundRequestSeeds,
  normalizeOtherOutboundRequestRow,
  otherOutboundRequestStatusLabels,
  otherOutboundRequestStatusTones,
  resolveOtherOutboundRequestStatusTone,
} from '../lib/otherOutboundRequestLogic.js';
import { resolveLogicalWarehouseLabel } from './warehouseData.js';

const seedRequests = [
  {
    id: 'other-outbound-request-seed-1',
    requestNo: 'QTCKSQ-20260923-0001',
    logicalWarehouse: 'LWH000001',
    businessType: '报废',
    status: 'pending_delivery',
    remark: '报废出库，仓库待执行',
    pushTime: '2026-09-23 09:11:00',
    auditor: '李四',
    auditTime: '2026-09-23 09:10:00',
    submittedAt: '2026-09-23 09:05:00',
    creator: '张三',
    createdAt: '2026-09-23 09:00:00',
    updater: '李四',
    updatedAt: '2026-09-23 09:11:00',
    lines: [
      { product: 'SP0101010001', quantity: 20 },
    ],
  },
  {
    id: 'other-outbound-request-seed-2',
    requestNo: 'QTCKSQ-20260923-0002',
    logicalWarehouse: 'LWH000007',
    businessType: '借出',
    status: 'pending_delivery',
    remark: '',
    pushTime: '2026-09-23 10:31:00',
    auditor: '李四',
    auditTime: '2026-09-23 10:30:00',
    submittedAt: '2026-09-23 10:25:00',
    creator: '王芳',
    createdAt: '2026-09-23 10:20:00',
    updater: '李四',
    updatedAt: '2026-09-23 10:31:00',
    lines: [
      { product: 'SP0102020001', quantity: 4 },
    ],
  },
  {
    id: 'other-outbound-request-seed-3',
    requestNo: 'QTCKSQ-20260922-0001',
    logicalWarehouse: 'LWH000001',
    businessType: '报废',
    status: 'delivered',
    remark: '残次品报废',
    pushTime: '2026-09-22 09:21:00',
    auditor: '李四',
    auditTime: '2026-09-22 09:20:00',
    submittedAt: '2026-09-22 09:10:00',
    deliverTime: '2026-09-23 09:40:00',
    creator: '张三',
    createdAt: '2026-09-22 09:00:00',
    updater: '系统',
    updatedAt: '2026-09-23 09:40:00',
    lines: [
      { product: 'SP0101030001', quantity: 20, actualQty: 12 },
    ],
  },
  {
    id: 'other-outbound-request-seed-4',
    requestNo: 'QTCKSQ-20260922-0004',
    logicalWarehouse: 'LWH000009',
    businessType: '盘亏',
    status: 'delivered',
    remark: '在途仓库存盘亏，按申请数量直接记账',
    pushTime: '',
    auditor: '李四',
    auditTime: '2026-09-22 15:10:00',
    submittedAt: '2026-09-22 15:08:00',
    deliverTime: '2026-09-22 15:10:00',
    creator: '陈小梦',
    createdAt: '2026-09-22 15:05:00',
    updater: '系统',
    updatedAt: '2026-09-22 15:10:00',
    lines: [
      { product: 'SP0101010001', quantity: 2, actualQty: 2 },
    ],
  },
  {
    id: 'other-outbound-request-seed-17',
    requestNo: 'QTCKSQ-20260924-0001',
    logicalWarehouse: 'LWH000009',
    businessType: '报废',
    status: 'pending_delivery',
    remark: '在途仓普通报废出库，仓库待执行',
    pushTime: '2026-09-24 10:31:00',
    auditor: '李四',
    auditTime: '2026-09-24 10:30:00',
    submittedAt: '2026-09-24 10:25:00',
    creator: '王芳',
    createdAt: '2026-09-24 10:20:00',
    updater: '李四',
    updatedAt: '2026-09-24 10:31:00',
    lines: [
      { product: 'SP0101010001', quantity: 1 },
    ],
  },
  {
    id: 'other-outbound-request-seed-5',
    requestNo: 'QTCKSQ-20260922-0002',
    logicalWarehouse: 'LWH000002',
    businessType: '报废',
    status: 'delivered',
    remark: '残次品报废',
    pushTime: '2026-09-22 14:01:00',
    auditor: '张三',
    auditTime: '2026-09-22 14:00:00',
    submittedAt: '2026-09-22 13:55:00',
    deliverTime: '2026-09-23 08:30:00',
    creator: '王芳',
    createdAt: '2026-09-22 13:50:00',
    updater: '系统',
    updatedAt: '2026-09-23 08:30:00',
    lines: [
      { product: 'SP0101020001', quantity: 70, actualQty: 70 },
    ],
  },
  {
    id: 'other-outbound-request-seed-6',
    requestNo: 'QTCKSQ-20260923-0005',
    logicalWarehouse: 'LWH000005',
    businessType: '赠送',
    status: 'delivered',
    remark: '客户活动赠品',
    pushTime: '2026-09-23 13:11:00',
    auditor: '李四',
    auditTime: '2026-09-23 13:10:00',
    submittedAt: '2026-09-23 13:05:00',
    deliverTime: '2026-09-23 14:20:00',
    creator: '张三',
    createdAt: '2026-09-23 13:00:00',
    updater: '系统',
    updatedAt: '2026-09-23 14:20:00',
    lines: [
      { product: 'SP0101030001', quantity: 9, actualQty: 9 },
    ],
  },
  {
    id: 'other-outbound-request-seed-7',
    requestNo: 'QTCKSQ-20260923-0006',
    logicalWarehouse: 'LWH000007',
    businessType: '样品领用',
    status: 'delivered',
    remark: '',
    pushTime: '2026-09-23 15:11:00',
    auditor: '李四',
    auditTime: '2026-09-23 15:10:00',
    submittedAt: '2026-09-23 15:05:00',
    deliverTime: '2026-09-23 16:05:00',
    creator: '王芳',
    createdAt: '2026-09-23 15:00:00',
    updater: '系统',
    updatedAt: '2026-09-23 16:05:00',
    lines: [
      { product: 'SP0102020001', quantity: 3, actualQty: 3 },
    ],
  },
  {
    id: 'other-outbound-request-seed-8',
    requestNo: 'QTCKSQ-20260923-0003',
    logicalWarehouse: 'LWH000005',
    businessType: '借出',
    status: 'pending',
    remark: '可用量不足演示单',
    submittedAt: '2026-09-23 11:05:00',
    creator: '王芳',
    createdAt: '2026-09-23 11:00:00',
    updater: '王芳',
    updatedAt: '2026-09-23 11:05:00',
    lines: [
      { product: 'SP0102010001', quantity: 1 },
    ],
  },
  {
    id: 'other-outbound-request-seed-9',
    requestNo: 'QTCKSQ-20260923-0004',
    logicalWarehouse: 'LWH000005',
    businessType: '样品领用',
    status: 'pending',
    remark: '',
    submittedAt: '2026-09-23 12:05:00',
    creator: '张三',
    createdAt: '2026-09-23 12:00:00',
    updater: '张三',
    updatedAt: '2026-09-23 12:05:00',
    lines: [
      { product: 'SP0101030001', quantity: 8 },
    ],
  },
  {
    id: 'other-outbound-request-seed-10',
    requestNo: 'QTCKSQ-20260921-0003',
    logicalWarehouse: 'LWH000005',
    businessType: '样品领用',
    status: 'draft',
    remark: '展会样品待确认',
    creator: '张三',
    createdAt: '2026-09-21 14:00:00',
    updater: '张三',
    updatedAt: '2026-09-21 14:10:00',
    lines: [
      { product: 'SP0101030001', quantity: 10 },
      { product: 'SP0101010001', quantity: 2 },
    ],
  },
  {
    id: 'other-outbound-request-seed-11',
    requestNo: 'QTCKSQ-20260921-0002',
    logicalWarehouse: 'LWH000001',
    businessType: '赠送',
    status: 'draft',
    remark: '撤回后待修改',
    submittedAt: '2026-09-21 10:00:00',
    withdrawComment: '数量与赠送申请不一致，请核对后重新提交',
    withdrawTime: '2026-09-21 10:20:00',
    creator: '王芳',
    createdAt: '2026-09-21 09:30:00',
    updater: '李四',
    updatedAt: '2026-09-21 10:20:00',
    lines: [
      { product: 'SP0101020001', quantity: 6 },
      { product: 'SP0101030001', quantity: 3 },
    ],
  },
  {
    id: 'other-outbound-request-seed-12',
    requestNo: 'QTCKSQ-20260922-0006',
    logicalWarehouse: 'LWH000006',
    businessType: '赠送',
    status: 'approved',
    remark: '等待发送结果',
    auditor: '李四',
    auditTime: '2026-09-22 17:30:00',
    submittedAt: '2026-09-22 17:25:00',
    creator: '王芳',
    createdAt: '2026-09-22 17:20:00',
    updater: '李四',
    updatedAt: '2026-09-22 17:30:00',
    lines: [
      { product: 'SP0103010001', quantity: 6 },
    ],
  },
  {
    id: 'other-outbound-request-seed-13',
    requestNo: 'QTCKSQ-20260922-0005',
    logicalWarehouse: 'LWH000002',
    businessType: '报废',
    status: 'push_failed',
    remark: '',
    pushFailReason: '仓库接口超时，未确认接收',
    auditor: '张三',
    auditTime: '2026-09-22 16:30:00',
    submittedAt: '2026-09-22 16:25:00',
    creator: '张三',
    createdAt: '2026-09-22 16:20:00',
    updater: '张三',
    updatedAt: '2026-09-22 16:31:00',
    lines: [
      { product: 'SP0101020001', quantity: 5 },
    ],
  },
  {
    id: 'other-outbound-request-seed-14',
    requestNo: 'QTCKSQ-20260922-0007',
    logicalWarehouse: 'LWH000005',
    businessType: '借出',
    status: 'cancelling',
    remark: '',
    pushTime: '2026-09-22 18:01:00',
    auditor: '李四',
    auditTime: '2026-09-22 18:00:00',
    submittedAt: '2026-09-22 17:55:00',
    cancelReason: '业务调整，不再借出',
    cancelOperator: '张三',
    creator: '王芳',
    createdAt: '2026-09-22 17:50:00',
    updater: '张三',
    updatedAt: '2026-09-22 18:10:00',
    lines: [
      { product: 'SP0101010001', quantity: 10 },
    ],
  },
  {
    id: 'other-outbound-request-seed-15',
    requestNo: 'QTCKSQ-20260923-0007',
    logicalWarehouse: 'LWH000001',
    businessType: '样品领用',
    status: 'cancelled',
    remark: '零出演示单',
    pushTime: '2026-09-23 16:21:00',
    auditor: '李四',
    auditTime: '2026-09-23 16:20:00',
    submittedAt: '2026-09-23 16:15:00',
    cancelReason: '仓库确认零出，按取消处理',
    cancelOperator: '系统',
    cancelTime: '2026-09-23 17:00:00',
    creator: '王芳',
    createdAt: '2026-09-23 16:10:00',
    updater: '系统',
    updatedAt: '2026-09-23 17:00:00',
    lines: [
      { product: 'SP0101020001', quantity: 15, actualQty: 0 },
    ],
  },
  {
    id: 'other-outbound-request-seed-16',
    requestNo: 'QTCKSQ-20260920-0002',
    logicalWarehouse: 'LWH000006',
    businessType: '报废',
    status: 'cancelled',
    remark: '',
    submittedAt: '2026-09-20 10:45:00',
    cancelReason: '业务调整，不再出库',
    cancelOperator: '张三',
    cancelTime: '2026-09-20 11:00:00',
    creator: '李四',
    createdAt: '2026-09-20 10:40:00',
    updater: '张三',
    updatedAt: '2026-09-20 11:00:00',
    lines: [
      { product: 'SP0101010001', quantity: 3 },
    ],
  },
];

export const otherOutboundRequests = seedRequests.map(normalizeOtherOutboundRequestRow);

// Demo 引导：首次运行时落库种子并补齐种子单的预占记录（正式环境由审核动作占用预占）。
ensureOtherOutboundRequestSeeds(otherOutboundRequests);

export function getOtherOutboundRequestStatusBadges(row) {
  if (!row) return [];
  return [{
    label: otherOutboundRequestStatusLabels[row.status] || row.status,
    tone: otherOutboundRequestStatusTones[row.status] || 'neutral',
  }];
}

/** 详情「操作日志」：提交、审核（含预占）、撤回、推送、回传（含预占消耗与释放）、取消等记录，按时间倒序。 */
export function buildOtherOutboundRequestOperationLogs(row) {
  const entries = [];
  const push = ({ time, operator, action, remark }) => {
    if (!time && !operator && !action) return;
    entries.push({
      id: `${action}-${time || entries.length}`,
      time: time || EMPTY_PLACEHOLDER,
      operator: operator || EMPTY_PLACEHOLDER,
      action,
      remark: remark || EMPTY_PLACEHOLDER,
    });
  };

  push({ time: row.createdAt, operator: row.creator, action: '创建', remark: '创建其他出库申请单' });
  push({ time: row.submittedAt, operator: row.updater || row.creator, action: '提交', remark: '提交后进入待审核' });
  push({
    time: row.auditTime,
    operator: row.auditor || '系统',
    action: '审核',
    remark: `审核通过，按可用量预占 ${row.totalQuantity ?? 0}`,
  });
  if (row.pushTime) {
    push({
      time: row.pushTime,
      operator: '系统',
      action: '推送仓库',
      remark: row.pushFailReason ? `推送失败：${row.pushFailReason}` : '推送仓库成功',
    });
  }
  if (row.withdrawTime) {
    push({
      time: row.withdrawTime,
      operator: row.updater,
      action: '撤回',
      remark: row.withdrawComment ? `撤回意见：${row.withdrawComment}` : '撤回回到草稿',
    });
  }
  if (row.deliverTime) {
    push({
      time: row.deliverTime,
      operator: '系统',
      action: '回传完成',
      remark: `实出 ${row.totalActualQty ?? 0}，未出 ${row.totalRemainingQty ?? 0} 已释放预占`,
    });
  }
  if (row.status === 'cancelling') {
    push({
      time: row.updatedAt,
      operator: row.cancelOperator,
      action: '申请取消',
      remark: `${row.cancelReason || '申请取消'}；等待仓库确认，预占继续占用`,
    });
  }
  if (row.cancelTime) {
    const isZeroOut = row.status === 'cancelled' && row.totalActualQty === 0;
    push({
      time: row.cancelTime,
      operator: row.cancelOperator,
      action: isZeroOut ? '零出取消' : '取消',
      remark: isZeroOut
        ? `仓库零出，实出 0、未出 ${row.totalQuantity ?? 0}，已释放全部预占`
        : `${row.cancelReason || '取消'}；已释放未执行预占`,
    });
  }

  return entries.sort((left, right) => String(right.time).localeCompare(String(left.time)));
}

const qtyCell = (value) => (value == null ? EMPTY_PLACEHOLDER : value);

export const otherOutboundRequestColumns = [
  { key: 'requestNo', label: '单号', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: true },
  {
    key: 'logicalWarehouse',
    label: '出库仓',
    defaultWidth: 190,
    minWidth: 150,
    maxWidth: 260,
    ellipsis: true,
    render: (value) => resolveLogicalWarehouseLabel(value),
  },
  { key: 'businessType', label: '业务类型', defaultWidth: 108, minWidth: 92, maxWidth: 150, ellipsis: true },
  {
    key: 'status',
    label: '单据状态',
    defaultWidth: 108,
    minWidth: 92,
    maxWidth: 150,
    ellipsis: true,
    render: (value) => otherOutboundRequestStatusLabels[value] || value,
    tone: (value) => resolveOtherOutboundRequestStatusTone(value),
  },
  { key: 'totalQuantity', label: '申请出库数量', defaultWidth: 120, minWidth: 100, maxWidth: 150, ellipsis: true, align: 'right', sortable: true },
  {
    key: 'totalActualQty',
    label: '实出数量',
    defaultWidth: 104,
    minWidth: 92,
    maxWidth: 140,
    ellipsis: true,
    align: 'right',
    sortable: true,
    render: qtyCell,
  },
  { key: 'totalRemainingQty', label: '未出数量', defaultWidth: 104, minWidth: 92, maxWidth: 140, ellipsis: true, align: 'right', sortable: true },
  { key: 'createdAt', label: '创建时间', defaultWidth: 170, minWidth: 150, maxWidth: 220, ellipsis: true, sortable: true },
  { key: 'updatedAt', label: '最后更新时间', defaultWidth: 170, minWidth: 150, maxWidth: 220, ellipsis: true, sortable: true },
];
