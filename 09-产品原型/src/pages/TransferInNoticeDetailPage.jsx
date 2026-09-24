import { useState } from 'react';
import { DocumentDetailPage } from '../components/erp/DocumentDetailPage.jsx';
import { productOptions, skuOptions } from '../data/masterData.js';
import { buildCreateMetaFields } from '../components/erp/DocumentMetaTabsCard.jsx';
import { RelatedDocumentsCard } from '../components/erp/RelatedDocumentsCard.jsx';
import {
  TransferInNoticeActionDialogs,
  TransferInNoticeDetailHeaderActions,
} from '../components/erp/TransferInNoticeActionDialogs.jsx';
import { useTransferDocRow } from '../hooks/useTransferDocRow.js';
import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import { cn } from '../lib/utils.js';
import { resolveLogicalWarehouseLabel } from '../data/warehouseData.js';
import { directTransfers } from '../data/directTransferData.js';
import { transferOutNotices } from '../data/transferOutNoticeData.js';
import { transferOrders } from '../data/transferOrderData.js';
import {
  directTransferAuditLabels,
  directTransferBadgeTones,
  kingdeePushStatusLabels,
  loadDirectTransferByNo,
  loadDirectTransfersByNoticeId,
  registerDirectTransferSeedRows,
} from '../lib/directTransferLogic.js';
import {
  buildTransferInNoticeOperationLogs,
  loadTransferInNoticeById,
  refreshTransferInNoticeLines,
  TRANSFER_IN_NOTICE_STORAGE_KEY,
  transferInNoticeBadgeTones,
  transferInNoticeStatusLabels,
} from '../lib/transferInNoticeLogic.js';
import { loadTransferOrderById } from '../lib/transferOrderLogic.js';
import { registerTransferOutNoticeSeedRows } from '../lib/transferOutNoticeLogic.js';

// 关联单据读取各对象 Mock 集合：登记种子，保证未访问列表页时详情也能展示关联记录。
registerDirectTransferSeedRows(directTransfers);
registerTransferOutNoticeSeedRows(transferOutNotices);

/**
 * 调入通知单详情（F04）：单据信息（含推送信息）、商品明细（含少收与零调入提示）、
 * 关联单据、操作信息。分区顺序见《详情页 Demo PRD》§3；本期无终止信息区（不提供取消）。
 */

function getDetail(row) {
  if (!row) return { lines: [] };
  return { ...row, lines: refreshTransferInNoticeLines(row.lines || []) };
}

function buildOrderLink(detail, onOpenPage) {
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

function buildSourceTransferLink(detail, onOpenPage) {
  if (!detail?.sourceOutDirectTransferNo) return EMPTY_PLACEHOLDER;
  const transfer = loadDirectTransferByNo(detail.sourceOutDirectTransferNo);
  return (
    <button
      type="button"
      className="truncate text-erp-primary hover:underline"
      onClick={() => onOpenPage?.('inventory-direct-transfer-detail', {
        row: transfer || { transferNo: detail.sourceOutDirectTransferNo, id: detail.sourceOutDirectTransferId },
      })}
    >
      {detail.sourceOutDirectTransferNo}
    </button>
  );
}

/** 明细区提示条：口径说明常驻，零调入被拒绝与少收按条件追加（《详情页 Demo PRD》§3.2）。 */
function TransferInNoticeHints({ row }) {
  const hints = [
    { key: 'rule', tone: 'info', text: '通知调入数量按实际调出量生成；实际调入必须大于0，回传0将被拒绝并保持等待。' },
  ];
  if (row.zeroReceiveRejectedAt) {
    hints.push({
      key: 'zero',
      tone: 'warning',
      text: '回传实际调入为0已被拒绝，请仓库改为大于0后重新回传；本单不按零收取消。如长期无法回传，请联系管理员人工处理。',
    });
  }
  if (row.status === 'received' && Number(row.totalShortageQty || 0) > 0) {
    hints.push({
      key: 'shortage',
      tone: 'warning',
      text: '少收差额留在途，不自动抹平；后续用其他出库从在途逻辑仓扣减（业务类型盘亏）。',
    });
  }

  return (
    <div className="space-y-2">
      {hints.map((hint) => (
        <p
          key={hint.key}
          className={cn(
            'rounded-erp-section border px-4 py-2 text-[12px]',
            hint.tone === 'warning'
              ? 'border-erp-warning/40 bg-erp-warning-bg text-erp-warning'
              : 'border-erp-border-card bg-erp-surface-panel text-erp-text-muted',
          )}
        >
          {hint.text}
        </p>
      ))}
    </div>
  );
}

function buildNoticeRelatedSections(row) {
  const sourceTransfers = loadDirectTransfersByNoticeId(row.id, row.noticeNo)
    .filter((item) => item.sourceType === 'step_out');
  const inTransfers = loadDirectTransfersByNoticeId(row.id, row.noticeNo)
    .filter((item) => item.sourceType === 'step_in');

  const transferColumns = (emptyTitle) => [
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
  ];

  return [
    {
      key: 'sourceTransfers',
      title: '来源调出端直接调拨单',
      emptyText: '暂无来源调出端直接调拨单',
      columns: transferColumns(),
      rows: sourceTransfers,
    },
    {
      key: 'inTransfers',
      title: '调入端直接调拨单',
      emptyText: '暂无关联的调入端直接调拨单',
      columns: transferColumns(),
      rows: inTransfers,
    },
  ];
}

const detailConfig = {
  listPageId: 'inventory-transfer-in-notice',
  lineSectionTitle: '商品明细',
  lineVariant: 'transfer-in-notice',
  lineEditorOptions: { productOptions, skuOptions },
  getDetail,
  title: (detail) => `调入通知单详情${detail.noticeNo ? ` · ${detail.noticeNo}` : ''}`,
  getStatusBadges: (row) => [
    {
      label: transferInNoticeStatusLabels[row.status] || row.status,
      tone: transferInNoticeBadgeTones[row.status] || 'neutral',
    },
  ],
  rowKey: (detail) => detail.noticeNo || detail.id,
  sections: [
    {
      title: '单据信息',
      fields: ({ detail, row, onOpenPage }) => [
        { key: 'noticeNo', label: '单号', value: detail.noticeNo },
        { key: 'sourceOrderNo', label: '来源分步式调拨单', value: buildOrderLink(detail, onOpenPage) },
        { key: 'sourceOutDirectTransferNo', label: '来源调出端直接调拨单', value: buildSourceTransferLink(detail, onOpenPage) },
        { key: 'inWarehouse', label: '接收仓', value: resolveLogicalWarehouseLabel(detail.inWarehouse) },
        { key: 'pushTime', label: '推送时间', value: row.pushTime || EMPTY_PLACEHOLDER },
        { key: 'pushFailReason', label: '推送失败原因', value: row.pushFailReason || EMPTY_PLACEHOLDER, className: 'col-span-2' },
        { key: 'finalReceiveTime', label: '最终收货确认时间', value: row.finalReceiveTime || EMPTY_PLACEHOLDER },
      ],
    },
  ],
  buildLineSummary: ({ detail }) => ({
    quantity: { label: '通知调入数量', value: detail.totalQuantity ?? 0 },
    actualQty: { label: '实际调入数量', value: detail.totalActualQty ?? EMPTY_PLACEHOLDER },
    shortageQty: { label: '少收数量', value: detail.totalShortageQty ?? EMPTY_PLACEHOLDER },
  }),
  extraSections: [
    {
      title: '操作信息',
      variant: 'meta-tabs',
      defaultTab: 'create',
      tabs: ({ row }) => [
        { key: 'create', label: '制单信息', fields: buildCreateMetaFields(row) },
        { key: 'log', label: '操作日志', variant: 'log', logEntries: () => buildTransferInNoticeOperationLogs(row) },
      ],
    },
  ],
};

export function TransferInNoticeDetailPage({ onFeedback, onOpenPage, context }) {
  const row = useTransferDocRow(context, {
    storageKey: TRANSFER_IN_NOTICE_STORAGE_KEY,
    loadById: loadTransferInNoticeById,
  });
  const [dialog, setDialog] = useState(null);

  function handleDialogComplete(result) {
    if (result?.message) onFeedback?.(result.message, result.type || 'success');
    if (result?.row) {
      onOpenPage?.('inventory-transfer-in-notice-detail', {
        row: loadTransferInNoticeById(result.row.id) || result.row,
      });
    }
    if (!result?.keepOpen) setDialog(null);
  }

  const config = {
    ...detailConfig,
    renderAfterLines: ({ row: currentRow, onOpenPage: openPage }) => {
      const sections = buildNoticeRelatedSections(currentRow);
      const hasRelated = sections.some((section) => section.rows.length);
      return (
        <div className="space-y-3">
          <TransferInNoticeHints row={currentRow} />
          {hasRelated ? <RelatedDocumentsCard sections={sections} onOpenPage={openPage} /> : null}
        </div>
      );
    },
    renderHeaderActions: () => (
      <TransferInNoticeDetailHeaderActions
        row={row}
        onAction={(id, currentRow) => setDialog({ type: id, row: currentRow })}
      />
    ),
  };

  return (
    <>
      <DocumentDetailPage context={{ row }} onOpenPage={onOpenPage} config={config} />
      <TransferInNoticeActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={onFeedback}
      />
    </>
  );
}
