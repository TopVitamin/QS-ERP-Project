import { resolveLogicalWarehouseLabel } from '../data/warehouseData.js';
import { directTransfers } from '../data/directTransferData.js';
import { transferInNotices } from '../data/transferInNoticeData.js';
import { transferOutNotices } from '../data/transferOutNoticeData.js';
import {
  directTransferAuditLabels,
  directTransferBadgeTones,
  directTransferSourceTypeLabels,
  kingdeePushStatusLabels,
  loadDirectTransfersByOrderId,
  registerDirectTransferSeedRows,
} from './directTransferLogic.js';
import {
  loadTransferInNoticesByOrderId,
  registerTransferInNoticeSeedRows,
  transferInNoticeBadgeTones,
  transferInNoticeStatusLabels,
} from './transferInNoticeLogic.js';
import {
  loadTransferOutNoticesByOrderId,
  registerTransferOutNoticeSeedRows,
  transferOutNoticeBadgeTones,
  transferOutNoticeStatusLabels,
} from './transferOutNoticeLogic.js';

// 关联单据读取各对象 Mock 集合：登记种子，保证未访问对应列表页时主单详情也能展示关联记录。
registerTransferOutNoticeSeedRows(transferOutNotices);
registerTransferInNoticeSeedRows(transferInNotices);
registerDirectTransferSeedRows(directTransfers);

/**
 * 分步式调拨单详情「关联单据」：调出通知单／调入通知单／直接调拨单。
 * 列与排序见《分步式调拨单前端Demo版PRD_详情页》§3.4。
 */
export function buildTransferOrderRelatedDocumentSections(row) {
  if (!row) return [];

  const outNotices = loadTransferOutNoticesByOrderId(row.id, row.orderNo);
  const inNotices = loadTransferInNoticesByOrderId(row.id, row.orderNo);
  const transfers = loadDirectTransfersByOrderId(row.id, row.orderNo);

  return [
    {
      key: 'outNotices',
      title: '调出通知单',
      emptyText: '暂无关联的调出通知单',
      columns: [
        { key: 'noticeNo', label: '单号', link: true, pageId: 'inventory-transfer-out-notice-detail', resolveRow: (item) => item },
        {
          key: 'status',
          label: '单据状态',
          badge: true,
          render: (item) => transferOutNoticeStatusLabels[item.status] || item.status,
          badgeTone: (item) => transferOutNoticeBadgeTones[item.status] || 'default',
        },
        { key: 'totalQuantity', label: '通知调出数量', align: 'right', render: (item) => item.totalQuantity ?? 0 },
        { key: 'totalActualQty', label: '实际调出数量', align: 'right', render: (item) => item.totalActualQty },
        { key: 'totalRemainingQty', label: '未发数量', align: 'right', render: (item) => item.totalRemainingQty ?? 0 },
        { key: 'createdAt', label: '创建时间', muted: true, render: (item) => item.createdAt },
      ],
      rows: outNotices,
    },
    {
      key: 'inNotices',
      title: '调入通知单',
      emptyText: '暂无关联的调入通知单',
      columns: [
        { key: 'noticeNo', label: '单号', link: true, pageId: 'inventory-transfer-in-notice-detail', resolveRow: (item) => item },
        {
          key: 'status',
          label: '单据状态',
          badge: true,
          render: (item) => transferInNoticeStatusLabels[item.status] || item.status,
          badgeTone: (item) => transferInNoticeBadgeTones[item.status] || 'default',
        },
        { key: 'totalQuantity', label: '通知调入数量', align: 'right', render: (item) => item.totalQuantity ?? 0 },
        { key: 'totalActualQty', label: '实际调入数量', align: 'right', render: (item) => item.totalActualQty },
        { key: 'totalShortageQty', label: '少收数量', align: 'right', render: (item) => item.totalShortageQty },
        { key: 'createdAt', label: '创建时间', muted: true, render: (item) => item.createdAt },
      ],
      rows: inNotices,
    },
    {
      key: 'directTransfers',
      title: '直接调拨单',
      emptyText: '暂无关联的直接调拨单',
      columns: [
        { key: 'transferNo', label: '单号', link: true, pageId: 'inventory-direct-transfer-detail', resolveRow: (item) => item },
        { key: 'sourceType', label: '来源类型', render: (item) => directTransferSourceTypeLabels[item.sourceType] || item.sourceType },
        { key: 'fromWarehouse', label: '来源逻辑仓', render: (item) => resolveLogicalWarehouseLabel(item.fromWarehouse) },
        { key: 'toWarehouse', label: '目标逻辑仓', render: (item) => resolveLogicalWarehouseLabel(item.toWarehouse) },
        {
          key: 'auditStatus',
          label: '审核状态',
          badge: true,
          render: (item) => directTransferAuditLabels[item.auditStatus] || item.auditStatus,
          badgeTone: (item) => directTransferBadgeTones.auditStatus[item.auditStatus] || 'default',
        },
        {
          key: 'kingdeePushStatus',
          label: '金蝶推送状态',
          badge: true,
          render: (item) => kingdeePushStatusLabels[item.kingdeePushStatus] || item.kingdeePushStatus,
          badgeTone: (item) => directTransferBadgeTones.kingdeePushStatus[item.kingdeePushStatus] || 'default',
        },
        { key: 'totalQuantity', label: '实际调拨数量', align: 'right', render: (item) => item.totalQuantity ?? 0 },
        { key: 'createdAt', label: '创建时间', muted: true, render: (item) => item.createdAt },
      ],
      rows: transfers,
    },
  ];
}
