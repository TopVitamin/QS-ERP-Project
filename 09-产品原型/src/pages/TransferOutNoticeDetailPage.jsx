import { useState } from 'react';
import { DocumentDetailPage } from '../components/erp/DocumentDetailPage.jsx';
import { productOptions, skuOptions } from '../data/masterData.js';
import { buildCreateMetaFields } from '../components/erp/DocumentMetaTabsCard.jsx';
import { RelatedDocumentsCard } from '../components/erp/RelatedDocumentsCard.jsx';
import {
  TransferOutNoticeActionDialogs,
  TransferOutNoticeDetailHeaderActions,
} from '../components/erp/TransferOutNoticeActionDialogs.jsx';
import { useTransferDocRow } from '../hooks/useTransferDocRow.js';
import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import { resolveLogicalWarehouseLabel } from '../data/warehouseData.js';
import { directTransfers } from '../data/directTransferData.js';
import { transferInNotices } from '../data/transferInNoticeData.js';
import { transferOrders } from '../data/transferOrderData.js';
import {
  directTransferAuditLabels,
  directTransferBadgeTones,
  kingdeePushStatusLabels,
  loadDirectTransfersByNoticeId,
  registerDirectTransferSeedRows,
} from '../lib/directTransferLogic.js';
import {
  loadTransferInNoticesByOrderId,
  registerTransferInNoticeSeedRows,
  transferInNoticeBadgeTones,
  transferInNoticeStatusLabels,
} from '../lib/transferInNoticeLogic.js';
import {
  buildTransferOutNoticeOperationLogs,
  loadTransferOutNoticeById,
  refreshTransferOutNoticeLines,
  TRANSFER_OUT_NOTICE_STORAGE_KEY,
  transferOutNoticeBadgeTones,
  transferOutNoticeStatusLabels,
} from '../lib/transferOutNoticeLogic.js';
import { loadTransferOrderById } from '../lib/transferOrderLogic.js';

// 关联单据读取各对象 Mock 集合：登记种子，保证未访问列表页时详情也能展示关联记录。
registerDirectTransferSeedRows(directTransfers);
registerTransferInNoticeSeedRows(transferInNotices);

/**
 * 调出通知单详情（F04）：单据信息（含推送信息）、商品明细、关联单据、终止信息、操作信息。
 * 分区顺序见《详情页 Demo PRD》§3；页头按钮按主PRD §6.4 互斥展示。
 */

function getDetail(row) {
  if (!row) return { lines: [] };
  return { ...row, lines: refreshTransferOutNoticeLines(row.lines || []) };
}

function buildSourceOrderLink(detail, onOpenPage) {
  if (!detail?.sourceOrderNo) return EMPTY_PLACEHOLDER;
  const order = loadTransferOrderById(detail.sourceOrderId)
    || transferOrders.find((item) => item.orderNo === detail.sourceOrderNo);
  return (
    <button
      type="button"
      className="truncate text-erp-primary hover:underline"
      onClick={() => onOpenPage?.('inventory-transfer-order-detail', {
        row: order || { orderNo: detail.sourceOrderNo, id: detail.sourceOrderId },
      })}
    >
      {detail.sourceOrderNo}
    </button>
  );
}

function buildNoticeRelatedSections(row) {
  const outTransfers = loadDirectTransfersByNoticeId(row.id, row.noticeNo)
    .filter((item) => item.sourceType === 'step_out');
  const inNotices = loadTransferInNoticesByOrderId(row.sourceOrderId, row.sourceOrderNo);

  return [
    {
      key: 'outTransfers',
      title: '调出端直接调拨单',
      emptyText: '暂无关联的调出端直接调拨单',
      columns: [
        { key: 'transferNo', label: '单号', link: true, pageId: 'inventory-direct-transfer-detail', resolveRow: (item) => item },
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
      rows: outTransfers,
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
  ];
}

const detailConfig = {
  listPageId: 'inventory-transfer-out-notice',
  lineSectionTitle: '商品明细',
  lineVariant: 'transfer-out-notice',
  lineEditorOptions: { productOptions, skuOptions },
  getDetail,
  title: (detail) => `调出通知单详情${detail.noticeNo ? ` · ${detail.noticeNo}` : ''}`,
  getStatusBadges: (row) => [
    {
      label: transferOutNoticeStatusLabels[row.status] || row.status,
      tone: transferOutNoticeBadgeTones[row.status] || 'neutral',
    },
  ],
  rowKey: (detail) => detail.noticeNo || detail.id,
  sections: [
    {
      title: '单据信息',
      fields: ({ detail, row, onOpenPage }) => [
        { key: 'noticeNo', label: '单号', value: detail.noticeNo },
        { key: 'sourceOrderNo', label: '来源分步式调拨单', value: buildSourceOrderLink(detail, onOpenPage) },
        { key: 'outWarehouse', label: '调出仓', value: resolveLogicalWarehouseLabel(detail.outWarehouse) },
        { key: 'pushTime', label: '推送时间', value: row.pushTime || EMPTY_PLACEHOLDER },
        { key: 'pushFailReason', label: '推送失败原因', value: row.pushFailReason || EMPTY_PLACEHOLDER, className: 'col-span-2' },
        { key: 'finalShipTime', label: '最终发货确认时间', value: row.finalShipTime || EMPTY_PLACEHOLDER },
      ],
    },
  ],
  buildLineSummary: ({ detail }) => ({
    quantity: { label: '通知调出数量', value: detail.totalQuantity ?? 0 },
    actualQty: { label: '实际调出数量', value: detail.totalActualQty ?? EMPTY_PLACEHOLDER },
    remainingQty: { label: '未发数量', value: detail.totalRemainingQty ?? 0 },
  }),
  extraSections: [
    {
      title: '终止信息',
      visibleWhen: ({ row }) => row.status === 'cancelled',
      fields: ({ row }) => [
        { key: 'cancelReason', label: '取消原因', value: row.cancelReason || EMPTY_PLACEHOLDER },
        { key: 'cancelOperator', label: '取消操作人', value: row.cancelOperator || EMPTY_PLACEHOLDER },
        { key: 'cancelTime', label: '取消时间', value: row.cancelTime || EMPTY_PLACEHOLDER },
      ],
    },
    {
      title: '操作信息',
      variant: 'meta-tabs',
      defaultTab: 'create',
      tabs: ({ row }) => [
        { key: 'create', label: '制单信息', fields: buildCreateMetaFields(row) },
        { key: 'log', label: '操作日志', variant: 'log', logEntries: () => buildTransferOutNoticeOperationLogs(row) },
      ],
    },
  ],
};

export function TransferOutNoticeDetailPage({ onFeedback, onOpenPage, context }) {
  const row = useTransferDocRow(context, {
    storageKey: TRANSFER_OUT_NOTICE_STORAGE_KEY,
    loadById: loadTransferOutNoticeById,
  });
  const [dialog, setDialog] = useState(null);

  function handleDialogComplete(result) {
    if (result?.message) onFeedback?.(result.message, result.type || 'success');
    if (result?.row) {
      onOpenPage?.('inventory-transfer-out-notice-detail', {
        row: loadTransferOutNoticeById(result.row.id) || result.row,
      });
    }
    setDialog(null);
  }

  const config = {
    ...detailConfig,
    renderAfterLines: ({ row: currentRow, onOpenPage: openPage }) => {
      const sections = buildNoticeRelatedSections(currentRow);
      if (!sections.some((section) => section.rows.length)) return null;
      return <RelatedDocumentsCard sections={sections} onOpenPage={openPage} />;
    },
    renderHeaderActions: () => (
      <TransferOutNoticeDetailHeaderActions
        row={row}
        onAction={(id, currentRow) => setDialog({ type: id, row: currentRow })}
      />
    ),
  };

  return (
    <>
      <DocumentDetailPage context={{ row }} onOpenPage={onOpenPage} config={config} />
      <TransferOutNoticeActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={onFeedback}
      />
    </>
  );
}
