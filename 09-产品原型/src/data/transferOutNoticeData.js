/**
 * 调出通知单列表列与演示种子数据。
 *
 * 通知单由主单审核后系统自动生成，本模块无新增入口；种子按
 * `transferOrderData.js` 中各主单 `progress.notice` 的链路进度派生，保证与主单、结果单自洽。
 * 数量口径：通知调出数量、实际调出数量、未发数量（《调出通知单（详细稿）》）。
 */
import { resolveLogicalWarehouseLabel } from './warehouseData.js';
import { ensureSeedRows } from '../lib/mockStorage.js';
import { transferOrders } from './transferOrderData.js';
import {
  buildTransferOutNoticeSeed,
  registerTransferOutNoticeSeedRows,
  transferOutNoticeStatusLabels,
  transferOutNoticeStatusTones,
  TRANSFER_OUT_NOTICE_STORAGE_KEY,
} from '../lib/transferOutNoticeLogic.js';

export const transferOutNotices = transferOrders
  .filter((order) => order.progress?.notice)
  .map((order) => buildTransferOutNoticeSeed(order, order.progress.notice));

registerTransferOutNoticeSeedRows(transferOutNotices);

// 首次加载落库种子：避免第一次局部写入（如自动生成下游单据）把种子挤掉
ensureSeedRows(TRANSFER_OUT_NOTICE_STORAGE_KEY, transferOutNotices);

export const transferOutNoticeColumns = [
  { key: 'noticeNo', label: '单号', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: true },
  { key: 'sourceOrderNo', label: '来源分步式调拨单', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: true },
  {
    key: 'outWarehouse',
    label: '调出仓',
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
    render: (value) => transferOutNoticeStatusLabels[value] || value,
    tone: (value) => transferOutNoticeStatusTones[value] || '',
  },
  {
    key: 'totalQuantity',
    label: '通知调出数量',
    defaultWidth: 110,
    minWidth: 96,
    maxWidth: 150,
    align: 'right',
    sortable: true,
    sortValue: (row) => Number(row.totalQuantity || 0),
  },
  {
    key: 'totalActualQty',
    label: '实际调出数量',
    defaultWidth: 110,
    minWidth: 96,
    maxWidth: 150,
    align: 'right',
    sortable: true,
    sortValue: (row) => (row.totalActualQty === undefined ? -1 : Number(row.totalActualQty)),
  },
  {
    key: 'totalRemainingQty',
    label: '未发数量',
    defaultWidth: 100,
    minWidth: 88,
    maxWidth: 140,
    align: 'right',
    sortable: true,
    sortValue: (row) => Number(row.totalRemainingQty || 0),
  },
  { key: 'pushTime', label: '推送时间', defaultWidth: 170, minWidth: 150, maxWidth: 220, ellipsis: true, sortable: true },
  { key: 'pushFailReason', label: '推送失败原因', defaultWidth: 180, minWidth: 130, maxWidth: 260, ellipsis: true },
  { key: 'createdAt', label: '创建时间', defaultWidth: 170, minWidth: 150, maxWidth: 220, ellipsis: true, sortable: true },
  { key: 'updatedAt', label: '最后更新时间', defaultWidth: 170, minWidth: 150, maxWidth: 220, ellipsis: true, sortable: true },
];
