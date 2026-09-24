import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import { resolveLogicalWarehouseLabel } from './warehouseData.js';
import { ensureSeedRows } from '../lib/mockStorage.js';
import {
  loadAllOtherInboundRequests,
  normalizeRequestRow,
  otherInboundRequestStatusLabels,
  otherInboundRequestStatusTextTones,
  otherInboundRequestStatusTones,
  OTHER_INBOUND_REQUEST_STORAGE_KEY,
} from '../lib/otherInboundRequestLogic.js';

/**
 * 其他入库申请单演示数据。
 *
 * 覆盖《其他入库申请单前端Demo版PRD_列表页》§9.1 与《详情页》§5.1 要求：
 * 草稿2（含1单撤回后草稿）、待审核1、已审核1、推送失败1（含失败原因）、待收货2（实收显示 `-`）、
 * 取消中1、已取消2（含1单零收取消）、已收货4（含1单缺量回传）。
 * 单号、数量与时间为虚构；枚举取值以《其他入库申请单（详细稿）》为准。
 */
const seedRequests = [
  {
    id: 'other-inbound-request-seed-1',
    requestNo: 'QTRKSQ-20260916-0001',
    warehouse: 'LWH000006',
    businessType: '赠品入库',
    status: 'cancelled',
    remark: '零收回传演示：仓库最终确认整单未执行',
    cancelReason: '仓库回传零收，整单按取消结束',
    cancelTime: '2026-09-16 15:20:00',
    cancelOperator: '系统',
    creator: '王芳',
    createdAt: '2026-09-16 09:40:00',
    updater: '系统',
    updatedAt: '2026-09-16 15:20:00',
    lines: [
      { id: 'request-line-1-1', product: 'SP0103010001', quantity: 10, actualQty: 0 },
    ],
  },
  {
    id: 'other-inbound-request-seed-2',
    requestNo: 'QTRKSQ-20260917-0002',
    warehouse: 'LWH000001',
    businessType: '样品回收',
    status: 'received',
    remark: '',
    lastPushTime: '2026-09-17 10:20:00',
    auditor: '李四',
    auditTime: '2026-09-17 10:15:00',
    inboundId: 'other-inbound-seed-1',
    inboundNo: 'QTRK-20260917-0001',
    lastReceiveTime: '2026-09-17 15:30:00',
    creator: '张三',
    createdAt: '2026-09-17 09:50:00',
    updater: '系统',
    updatedAt: '2026-09-17 15:30:00',
    lines: [
      { id: 'request-line-2-1', product: 'SP0101030001', quantity: 36, actualQty: 36 },
    ],
  },
  {
    id: 'other-inbound-request-seed-3',
    requestNo: 'QTRKSQ-20260918-0003',
    warehouse: 'LWH000005',
    businessType: '借出归还',
    status: 'received',
    remark: '缺量回传演示：申请40、实收25，未收15不回补',
    lastPushTime: '2026-09-18 09:30:00',
    auditor: '李四',
    auditTime: '2026-09-18 09:25:00',
    inboundId: 'other-inbound-seed-2',
    inboundNo: 'QTRK-20260918-0002',
    lastReceiveTime: '2026-09-18 11:20:00',
    creator: '张三',
    createdAt: '2026-09-18 09:00:00',
    updater: '系统',
    updatedAt: '2026-09-18 11:20:00',
    lines: [
      { id: 'request-line-3-1', product: 'SP0101010001', quantity: 40, actualQty: 25 },
    ],
  },
  {
    id: 'other-inbound-request-seed-4',
    requestNo: 'QTRKSQ-20260919-0004',
    warehouse: 'LWH000002',
    businessType: '退料',
    status: 'received',
    remark: '',
    lastPushTime: '2026-09-19 13:40:00',
    auditor: '李四',
    auditTime: '2026-09-19 13:35:00',
    inboundId: 'other-inbound-seed-3',
    inboundNo: 'QTRK-20260919-0003',
    lastReceiveTime: '2026-09-19 14:05:00',
    creator: '王芳',
    createdAt: '2026-09-19 11:20:00',
    updater: '系统',
    updatedAt: '2026-09-19 14:05:00',
    lines: [
      { id: 'request-line-4-1', product: 'SP0103020001', quantity: 18, actualQty: 18 },
    ],
  },
  {
    id: 'other-inbound-request-seed-5',
    requestNo: 'QTRKSQ-20260920-0005',
    warehouse: 'LWH000007',
    businessType: '赠品入库',
    status: 'received',
    remark: '',
    lastPushTime: '2026-09-20 09:50:00',
    auditor: '李四',
    auditTime: '2026-09-20 09:45:00',
    inboundId: 'other-inbound-seed-4',
    inboundNo: 'QTRK-20260920-0004',
    lastReceiveTime: '2026-09-20 10:10:00',
    creator: '陈仓管',
    createdAt: '2026-09-20 09:10:00',
    updater: '系统',
    updatedAt: '2026-09-20 10:10:00',
    lines: [
      { id: 'request-line-5-1', product: 'SP0102020001', quantity: 12, actualQty: 12 },
    ],
  },
  {
    id: 'other-inbound-request-seed-6',
    requestNo: 'QTRKSQ-20260921-0006',
    warehouse: 'LWH000002',
    businessType: '退料',
    status: 'cancelled',
    remark: '',
    lastPushTime: '2026-09-21 09:20:00',
    cancelReason: '客户撤回退料安排，不再执行',
    cancelTime: '2026-09-21 16:00:00',
    cancelOperator: '李四',
    creator: '张三',
    createdAt: '2026-09-21 09:00:00',
    updater: '李四',
    updatedAt: '2026-09-21 16:00:00',
    lines: [
      { id: 'request-line-6-1', product: 'SP0101020001', quantity: 10, actualQty: null },
    ],
  },
  {
    id: 'other-inbound-request-seed-7',
    requestNo: 'QTRKSQ-20260922-0007',
    warehouse: 'LWH000001',
    businessType: '盘盈',
    status: 'push_failed',
    remark: '推送失败演示：可人工重试推送或取消',
    pushFailReason: '仓库接口超时，未确认接收',
    auditor: '李四',
    auditTime: '2026-09-22 10:05:00',
    creator: '张三',
    createdAt: '2026-09-22 09:30:00',
    updater: '系统',
    updatedAt: '2026-09-22 10:06:00',
    lines: [
      { id: 'request-line-7-1', product: 'SP0101020001', quantity: 40, actualQty: null },
    ],
  },
  {
    id: 'other-inbound-request-seed-8',
    requestNo: 'QTRKSQ-20260922-0008',
    warehouse: 'LWH000006',
    businessType: '赠品入库',
    status: 'approved',
    remark: '已审核、尚未取得推送结果',
    auditor: '李四',
    auditTime: '2026-09-22 14:10:00',
    creator: '王芳',
    createdAt: '2026-09-22 13:40:00',
    updater: '系统',
    updatedAt: '2026-09-22 14:10:00',
    lines: [
      { id: 'request-line-8-1', product: 'SP0103010001', quantity: 15, actualQty: null },
    ],
  },
  {
    id: 'other-inbound-request-seed-9',
    requestNo: 'QTRKSQ-20260923-0009',
    warehouse: 'LWH000001',
    businessType: '样品回收',
    status: 'pending_receive',
    remark: '待收货演示：实收显示 `-`，可在详情模拟仓库回传',
    lastPushTime: '2026-09-23 09:20:00',
    auditor: '李四',
    auditTime: '2026-09-23 09:15:00',
    creator: '张三',
    createdAt: '2026-09-23 08:50:00',
    updater: '系统',
    updatedAt: '2026-09-23 09:20:00',
    lines: [
      { id: 'request-line-9-1', product: 'SP0101020001', quantity: 80, actualQty: null },
    ],
  },
  {
    id: 'other-inbound-request-seed-10',
    requestNo: 'QTRKSQ-20260923-0010',
    warehouse: 'LWH000005',
    businessType: '借出归还',
    status: 'pending_receive',
    remark: '多行待收货演示',
    lastPushTime: '2026-09-23 10:10:00',
    auditor: '李四',
    auditTime: '2026-09-23 10:05:00',
    creator: '王芳',
    createdAt: '2026-09-23 09:40:00',
    updater: '系统',
    updatedAt: '2026-09-23 10:10:00',
    lines: [
      { id: 'request-line-10-1', product: 'SP0101010001', quantity: 30, actualQty: null },
      { id: 'request-line-10-2', product: 'SP0102010001', quantity: 8, actualQty: null },
    ],
  },
  {
    id: 'other-inbound-request-seed-11',
    requestNo: 'QTRKSQ-20260923-0011',
    warehouse: 'LWH000007',
    businessType: '赠品入库',
    status: 'cancelling',
    remark: '',
    lastPushTime: '2026-09-23 11:30:00',
    cancelReason: '仓库备货时发现实物与申请不符，申请取消',
    auditor: '李四',
    auditTime: '2026-09-23 11:25:00',
    creator: '陈仓管',
    createdAt: '2026-09-23 10:50:00',
    updater: '陈仓管',
    updatedAt: '2026-09-23 13:40:00',
    lines: [
      { id: 'request-line-11-1', product: 'SP0102020001', quantity: 12, actualQty: null },
    ],
  },
  {
    id: 'other-inbound-request-seed-12',
    requestNo: 'QTRKSQ-20260923-0012',
    warehouse: 'LWH000002',
    businessType: '退料',
    status: 'pending',
    remark: '待审核演示：可审核、撤回或取消',
    submittedAt: '2026-09-23 14:20:00',
    submitter: '张三',
    creator: '张三',
    createdAt: '2026-09-23 14:00:00',
    updater: '张三',
    updatedAt: '2026-09-23 14:20:00',
    lines: [
      { id: 'request-line-12-1', product: 'SP0101020001', quantity: 10, actualQty: null },
    ],
  },
  {
    id: 'other-inbound-request-seed-13',
    requestNo: 'QTRKSQ-20260923-0013',
    warehouse: 'LWH000005',
    businessType: '借出归还',
    status: 'draft',
    remark: '撤回后草稿：保留撤回意见，可修改后重新提交',
    submittedAt: '2026-09-23 15:10:00',
    submitter: '张三',
    withdrawComment: '数量与借出登记不符，请核对后重新提交',
    withdrawTime: '2026-09-23 15:40:00',
    withdrawOperator: '李四',
    creator: '张三',
    createdAt: '2026-09-23 15:00:00',
    updater: '李四',
    updatedAt: '2026-09-23 15:40:00',
    lines: [
      { id: 'request-line-13-1', product: 'SP0101030001', quantity: 20, actualQty: null },
      { id: 'request-line-13-2', product: 'SP0101010001', quantity: 30, actualQty: null },
    ],
  },
  {
    id: 'other-inbound-request-seed-14',
    requestNo: 'QTRKSQ-20260923-0014',
    warehouse: 'LWH000001',
    businessType: '样品回收',
    status: 'draft',
    remark: '草稿演示：一行SKU、申请入库数量100',
    creator: '王芳',
    createdAt: '2026-09-23 16:10:00',
    updater: '王芳',
    updatedAt: '2026-09-23 16:10:00',
    lines: [
      { id: 'request-line-14-1', product: 'SP0101010001', quantity: 100, actualQty: null },
    ],
  },
];

export const otherInboundRequests = loadAllOtherInboundRequests(seedRequests).map(normalizeRequestRow);

// 首次加载落库种子：避免第一次局部写入（如自动生成下游单据）把种子挤掉
ensureSeedRows(OTHER_INBOUND_REQUEST_STORAGE_KEY, otherInboundRequests);

export function getOtherInboundRequestStatusBadges(row) {
  return [{
    label: otherInboundRequestStatusLabels[row?.status] || row?.status || EMPTY_PLACEHOLDER,
    tone: otherInboundRequestStatusTones[row?.status] || 'warning',
  }];
}

const qtyCell = (value) => value ?? 0;

/** 列表列按《其他入库申请单前端Demo版PRD_列表页》§4.2；实收未确认时显示 `-`。 */
export const otherInboundRequestColumns = [
  { key: 'requestNo', label: '单号', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: true },
  { key: 'warehouse', label: '入库仓', defaultWidth: 190, minWidth: 150, maxWidth: 260, ellipsis: true, render: (value) => resolveLogicalWarehouseLabel(value) },
  { key: 'businessType', label: '业务类型', defaultWidth: 110, minWidth: 96, maxWidth: 160, ellipsis: true },
  {
    key: 'status',
    label: '单据状态',
    defaultWidth: 96,
    minWidth: 88,
    maxWidth: 140,
    ellipsis: true,
    render: (value) => otherInboundRequestStatusLabels[value] || value,
    tone: (value) => otherInboundRequestStatusTextTones[value] || '',
  },
  { key: 'totalRequestQty', label: '申请入库数量', defaultWidth: 120, minWidth: 104, maxWidth: 160, ellipsis: true, align: 'right', sortable: true, render: qtyCell },
  { key: 'totalActualQty', label: '实收数量', defaultWidth: 96, minWidth: 88, maxWidth: 140, ellipsis: true, align: 'right', sortable: true },
  { key: 'totalRemainingQty', label: '未收数量', defaultWidth: 96, minWidth: 88, maxWidth: 140, ellipsis: true, align: 'right', sortable: true, render: qtyCell },
  { key: 'createdAt', label: '创建时间', defaultWidth: 170, minWidth: 150, maxWidth: 220, ellipsis: true, sortable: true },
  { key: 'updatedAt', label: '最后更新时间', defaultWidth: 170, minWidth: 150, maxWidth: 220, ellipsis: true, sortable: true },
];

/** 结果单列表「来源其他入库申请单」筛选项：只列存在入库记录的申请单。 */
export function buildOtherInboundRequestSourceOptions(rows = otherInboundRequests) {
  const map = new Map();
  rows.forEach((row) => {
    if (!row.requestNo) return;
    map.set(row.requestNo, { value: row.requestNo, label: row.requestNo });
  });
  return [{ value: '', label: '全部申请单' }, ...map.values()];
}
