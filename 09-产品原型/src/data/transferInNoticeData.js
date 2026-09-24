/**
 * 调入通知单列表列与演示种子数据。
 *
 * 调入通知单由调出端直接调拨单生成后系统按实际调出量自动生成，本模块无新增入口；
 * 种子按 `transferOrderData.js` 中各主单 `progress.inNotice` 的链路进度派生，通知调入数量等于对应行实际调出量。
 * 数量口径：通知调入数量、实际调入数量、少收数量（《调入通知单（详细稿）》）。
 */
import { resolveLogicalWarehouseLabel } from './warehouseData.js';
import { ensureSeedRows } from '../lib/mockStorage.js';
import { transferOrders } from './transferOrderData.js';
import { transferOutNotices } from './transferOutNoticeData.js';
import {
  buildTransferInNoticeSeed,
  registerTransferInNoticeSeedRows,
  transferInNoticeStatusLabels,
  transferInNoticeStatusTones,
  TRANSFER_IN_NOTICE_STORAGE_KEY,
} from '../lib/transferInNoticeLogic.js';

export const transferInNotices = transferOrders
  .filter((order) => order.progress?.inNotice)
  .map((order) => buildTransferInNoticeSeed(
    order,
    transferOutNotices.find((notice) => notice.sourceOrderId === order.id) || null,
    order.progress.inNotice,
  ));

registerTransferInNoticeSeedRows(transferInNotices);

// 首次加载落库种子：避免第一次局部写入（如自动生成下游单据）把种子挤掉
ensureSeedRows(TRANSFER_IN_NOTICE_STORAGE_KEY, transferInNotices);

export const transferInNoticeColumns = [
  { key: 'noticeNo', label: '单号', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: true },
  { key: 'sourceOrderNo', label: '来源分步式调拨单', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: true },
  {
    key: 'inWarehouse',
    label: '接收仓',
    defaultWidth: 170,
    minWidth: 130,
    maxWidth: 240,
    ellipsis: true,
    render: (value) => resolveLogicalWarehouseLabel(value),
  },
  {
    key: 'status',
    label: '单据状态',
    defaultWidth: 96,
    minWidth: 88,
    maxWidth: 140,
    ellipsis: true,
    render: (value) => transferInNoticeStatusLabels[value] || value,
    tone: (value) => transferInNoticeStatusTones[value] || '',
  },
  {
    key: 'totalQuantity',
    label: '通知调入数量',
    defaultWidth: 110,
    minWidth: 96,
    maxWidth: 150,
    align: 'right',
    sortable: true,
    sortValue: (row) => Number(row.totalQuantity || 0),
  },
  {
    key: 'totalActualQty',
    label: '实际调入数量',
    defaultWidth: 110,
    minWidth: 96,
    maxWidth: 150,
    align: 'right',
    sortable: true,
    sortValue: (row) => (row.totalActualQty === undefined ? -1 : Number(row.totalActualQty)),
  },
  {
    key: 'totalShortageQty',
    label: '少收数量',
    defaultWidth: 100,
    minWidth: 88,
    maxWidth: 140,
    align: 'right',
    sortable: true,
    sortValue: (row) => (row.totalShortageQty === undefined ? -1 : Number(row.totalShortageQty)),
  },
  { key: 'pushTime', label: '推送时间', defaultWidth: 170, minWidth: 150, maxWidth: 220, ellipsis: true, sortable: true },
  { key: 'pushFailReason', label: '推送失败原因', defaultWidth: 180, minWidth: 130, maxWidth: 260, ellipsis: true },
  { key: 'createdAt', label: '创建时间', defaultWidth: 170, minWidth: 150, maxWidth: 220, ellipsis: true, sortable: true },
  { key: 'updatedAt', label: '最后更新时间', defaultWidth: 170, minWidth: 150, maxWidth: 220, ellipsis: true, sortable: true },
];
