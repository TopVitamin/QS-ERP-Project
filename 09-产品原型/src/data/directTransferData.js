/**
 * 直接调拨单列表列与演示种子数据。
 *
 * 四类来源：分步式调出端／分步式调入端（由通知单回传自动生成，创建即已审核）、
 * 人工一步式（草稿→待审核→已审核）、仓库主动回传（已审核）。
 * 分步式两端结果按主单 `progress.outTransfer／inTransfer` 派生，人工与主动回传为独立演示种子。
 *
 * 列表默认按业务日期倒序；业务日期不单列为列（《直接调拨单（详细稿）》《列表页 Demo PRD》§4.2）。
 */
import { productOptions, skuOptions, unitOptions } from './masterData.js';
import { resolveLogicalWarehouseLabel } from './warehouseData.js';
import { ensureSeedRows } from '../lib/mockStorage.js';
import { transferOrders } from './transferOrderData.js';
import { transferOutNotices } from './transferOutNoticeData.js';
import { transferInNotices } from './transferInNoticeData.js';
import {
  buildDirectTransferSeedCallback,
  buildDirectTransferSeedFromInNotice,
  buildDirectTransferSeedFromOutNotice,
  buildDirectTransferSeedManual,
  directTransferAuditLabels,
  directTransferSourceTypeLabels,
  directTransferStatusTones,
  financeErpPushStatusLabels,
  registerDirectTransferSeedRows,
  DIRECT_TRANSFER_STORAGE_KEY,
} from '../lib/directTransferLogic.js';

const seedManualTransfers = [
  {
    transferNo: 'ZJDB-20260922-0002',
    fromWarehouse: 'LWH000001',
    toWarehouse: 'LWH000002',
    remark: '正常品转残次品，草稿待提交',
    auditStatus: 'draft',
    financeErpPushStatus: 'un_pushed',
    businessDate: '2026-09-22',
    actualTransferTime: '',
    pushTime: '',
    pushFailReason: '',
    auditor: '',
    auditTime: '',
    creator: '陈小梦CXM',
    createdAt: '2026-09-22 11:40:00',
    updater: '陈小梦CXM',
    updatedAt: '2026-09-22 11:40:00',
    lines: [{ product: 'SP0101020001', quantity: 20 }],
  },
  {
    transferNo: 'ZJDB-20260922-0004',
    fromWarehouse: 'LWH000001',
    toWarehouse: 'LWH000006',
    remark: '正常品转待检品，已审核',
    auditStatus: 'approved',
    financeErpPushStatus: 'push_success',
    businessDate: '2026-09-22',
    actualTransferTime: '2026-09-22 16:20:00',
    pushTime: '2026-09-22 16:20:30',
    pushFailReason: '',
    auditor: '张三',
    auditTime: '2026-09-22 16:20:00',
    creator: '张三',
    createdAt: '2026-09-22 16:15:00',
    updater: '张三',
    updatedAt: '2026-09-22 16:20:30',
    lines: [{ product: 'SP0101020001', quantity: 5 }],
  },
  {
    transferNo: 'ZJDB-20260922-0007',
    fromWarehouse: 'LWH000001',
    toWarehouse: 'LWH000006',
    remark: '正常品转待检品，待审核',
    auditStatus: 'pending',
    financeErpPushStatus: 'un_pushed',
    businessDate: '2026-09-22',
    actualTransferTime: '',
    pushTime: '',
    pushFailReason: '',
    auditor: '',
    auditTime: '',
    creator: '陈小梦CXM',
    createdAt: '2026-09-22 17:00:00',
    updater: '陈小梦CXM',
    updatedAt: '2026-09-22 17:05:00',
    lines: [{ product: 'SP0101020001', quantity: 10 }],
  },
];

const seedCallbackTransfers = [
  {
    transferNo: 'ZJDB-20260922-0001',
    fromWarehouse: 'LWH000001',
    toWarehouse: 'LWH000002',
    sourceSystem: '领星',
    sourceNo: 'LX-20260922-0031',
    remark: '仓库已完成的品质调整回传',
    auditStatus: 'approved',
    financeErpPushStatus: 'push_failed',
    businessDate: '2026-09-22',
    actualTransferTime: '2026-09-22 10:15:00',
    pushTime: '2026-09-22 10:15:20',
    pushFailReason: '接口超时，财务ERP未确认接收',
    auditor: '',
    auditTime: '2026-09-22 10:15:00',
    creator: '系统',
    createdAt: '2026-09-22 10:15:00',
    updater: '系统',
    updatedAt: '2026-09-22 10:15:20',
    lines: [{ product: 'SP0101020001', quantity: 5 }],
  },
];

export const directTransfers = [
  ...transferOrders
    .filter((order) => order.progress?.outTransfer)
    .map((order) => buildDirectTransferSeedFromOutNotice(
      transferOutNotices.find((notice) => notice.sourceOrderId === order.id) || null,
      order.progress.outTransfer,
    )),
  ...transferOrders
    .filter((order) => order.progress?.inTransfer)
    .map((order) => buildDirectTransferSeedFromInNotice(
      transferInNotices.find((notice) => notice.sourceOrderId === order.id) || null,
      order.progress.inTransfer,
    )),
  ...seedManualTransfers.map(buildDirectTransferSeedManual),
  ...seedCallbackTransfers.map(buildDirectTransferSeedCallback),
].filter(Boolean);

registerDirectTransferSeedRows(directTransfers);

// 首次加载落库种子：避免第一次局部写入（如自动生成下游单据）把种子挤掉
ensureSeedRows(DIRECT_TRANSFER_STORAGE_KEY, directTransfers);

/** 明细编辑器选项：人工一步式表单使用商品与基本单位。 */
export const directTransferLineEditorOptions = {
  productOptions,
  skuOptions,
  unitOptions,
};

export const directTransferColumns = [
  { key: 'transferNo', label: '单号', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: true },
  {
    key: 'sourceType',
    label: '来源类型',
    defaultWidth: 110,
    minWidth: 96,
    maxWidth: 150,
    ellipsis: true,
    render: (value) => directTransferSourceTypeLabels[value] || value,
  },
  { key: 'sourceOrderNo', label: '来源分步式调拨单', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: true },
  { key: 'sourceNoticeNo', label: '来源通知单', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: true },
  {
    key: 'fromWarehouse',
    label: '来源逻辑仓',
    defaultWidth: 180,
    minWidth: 130,
    maxWidth: 260,
    ellipsis: true,
    render: (value) => resolveLogicalWarehouseLabel(value),
  },
  {
    key: 'toWarehouse',
    label: '目标逻辑仓',
    defaultWidth: 180,
    minWidth: 130,
    maxWidth: 260,
    ellipsis: true,
    render: (value) => resolveLogicalWarehouseLabel(value),
  },
  {
    key: 'auditStatus',
    label: '审核状态',
    defaultWidth: 96,
    minWidth: 88,
    maxWidth: 140,
    ellipsis: true,
    render: (value) => directTransferAuditLabels[value] || value,
    tone: (value) => directTransferStatusTones.auditStatus[value] || '',
  },
  {
    key: 'financeErpPushStatus',
    label: '推送财务ERP状态',
    defaultWidth: 110,
    minWidth: 96,
    maxWidth: 150,
    ellipsis: true,
    render: (value) => financeErpPushStatusLabels[value] || value,
    tone: (value) => directTransferStatusTones.financeErpPushStatus[value] || '',
  },
  {
    key: 'totalQuantity',
    label: '实际调拨数量',
    defaultWidth: 110,
    minWidth: 96,
    maxWidth: 150,
    align: 'right',
    sortable: true,
    sortValue: (row) => Number(row.totalQuantity || 0),
  },
  { key: 'createdAt', label: '创建时间', defaultWidth: 170, minWidth: 150, maxWidth: 220, ellipsis: true, sortable: true },
  { key: 'updatedAt', label: '最后更新时间', defaultWidth: 170, minWidth: 150, maxWidth: 220, ellipsis: true, sortable: true },
];

export const defaultDirectTransferForm = {
  transferNo: '保存后自动生成',
  fromWarehouse: '',
  toWarehouse: '',
  remark: '',
  lines: [
    {
      id: 'direct-transfer-line-default',
      lineNo: 1,
      product: '',
      productCode: '',
      productName: '',
      unit: '',
      quantity: 1,
    },
  ],
};

export function getEditableDirectTransfer(row) {
  if (!row) {
    return { ...defaultDirectTransferForm, lines: defaultDirectTransferForm.lines.map((line) => ({ ...line })) };
  }
  return {
    ...defaultDirectTransferForm,
    id: row.id || '',
    transferNo: row.transferNo || defaultDirectTransferForm.transferNo,
    fromWarehouse: row.fromWarehouse || '',
    toWarehouse: row.toWarehouse || '',
    remark: row.remark ?? '',
    lines: (row.lines || []).map((line) => ({ ...line })),
  };
}
