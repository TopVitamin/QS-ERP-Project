import { useState } from 'react';
import { DocumentDetailPage } from '../components/erp/DocumentDetailPage.jsx';
import { productOptions, skuOptions } from '../data/masterData.js';
import { buildCreateMetaFields } from '../components/erp/DocumentMetaTabsCard.jsx';
import { RelatedDocumentsCard } from '../components/erp/RelatedDocumentsCard.jsx';
import {
  DirectTransferActionDialogs,
  DirectTransferDetailHeaderActions,
} from '../components/erp/DirectTransferActionDialogs.jsx';
import { useTransferDocRow } from '../hooks/useTransferDocRow.js';
import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import { resolveLogicalWarehouseLabel } from '../data/warehouseData.js';
import { directTransfers } from '../data/directTransferData.js';
import { transferInNotices } from '../data/transferInNoticeData.js';
import { transferOrders } from '../data/transferOrderData.js';
import { transferOutNotices } from '../data/transferOutNoticeData.js';
import {
  buildDirectTransferOperationLogs,
  canEditDirectTransfer,
  directTransferAuditLabels,
  directTransferBadgeTones,
  directTransferSourceTypeLabels,
  kingdeePushStatusLabels,
  loadDirectTransferById,
  refreshDirectTransferLines,
  registerDirectTransferSeedRows,
  DIRECT_TRANSFER_STORAGE_KEY,
} from '../lib/directTransferLogic.js';
import {
  loadTransferInNoticeById,
  registerTransferInNoticeSeedRows,
  transferInNoticeBadgeTones,
  transferInNoticeStatusLabels,
} from '../lib/transferInNoticeLogic.js';
import {
  loadTransferOutNoticeById,
  registerTransferOutNoticeSeedRows,
  transferOutNoticeBadgeTones,
  transferOutNoticeStatusLabels,
} from '../lib/transferOutNoticeLogic.js';
import { loadTransferOrderById, registerTransferOrderSeedRows } from '../lib/transferOrderLogic.js';

// 关联单据读取各对象 Mock 集合：登记种子，保证未访问列表页时详情也能展示关联记录。
registerDirectTransferSeedRows(directTransfers);
registerTransferOrderSeedRows(transferOrders);
registerTransferOutNoticeSeedRows(transferOutNotices);
registerTransferInNoticeSeedRows(transferInNotices);

/**
 * 直接调拨单详情（F05）：单据信息（含来源与推送信息）、商品明细、关联单据（分步式来源）、
 * 审核信息与制单信息。分区顺序见《详情页 Demo PRD》§3；页头按钮按主PRD §6.4 互斥展示。
 */

function getDetail(row) {
  if (!row) return { lines: [] };
  return { ...row, lines: refreshDirectTransferLines(row.lines || []) };
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

function buildNoticeLink(detail, onOpenPage) {
  if (!detail?.sourceNoticeNo) return EMPTY_PLACEHOLDER;
  if (detail.sourceType === 'step_in') {
    const notice = loadTransferInNoticeById(detail.sourceNoticeId);
    return (
      <button
        type="button"
        className="truncate text-erp-primary hover:underline"
        onClick={() => onOpenPage?.('inventory-transfer-in-notice-detail', {
          row: notice || { noticeNo: detail.sourceNoticeNo, id: detail.sourceNoticeId },
        })}
      >
        {detail.sourceNoticeNo}
      </button>
    );
  }
  const notice = loadTransferOutNoticeById(detail.sourceNoticeId);
  return (
    <button
      type="button"
      className="truncate text-erp-primary hover:underline"
      onClick={() => onOpenPage?.('inventory-transfer-out-notice-detail', {
        row: notice || { noticeNo: detail.sourceNoticeNo, id: detail.sourceNoticeId },
      })}
    >
      {detail.sourceNoticeNo}
    </button>
  );
}

function buildRelatedSections(row) {
  if (row.sourceType !== 'step_out' && row.sourceType !== 'step_in') return [];

  const order = loadTransferOrderById(row.sourceOrderId)
    || transferOrders.find((item) => item.orderNo === row.sourceOrderNo) || null;
  const notice = row.sourceType === 'step_in'
    ? (loadTransferInNoticeById(row.sourceNoticeId)
      || transferInNotices.find((item) => item.noticeNo === row.sourceNoticeNo) || null)
    : (loadTransferOutNoticeById(row.sourceNoticeId)
      || transferOutNotices.find((item) => item.noticeNo === row.sourceNoticeNo) || null);

  return [
    {
      key: 'sourceOrder',
      title: '来源分步式调拨单',
      emptyText: '暂无来源分步式调拨单',
      columns: [
        { key: 'orderNo', label: '单号', link: true, pageId: 'inventory-transfer-order-detail', resolveRow: (item) => item },
        { key: 'auditStatus', label: '审核状态', render: (item) => ({ draft: '草稿', pending: '待审核', approved: '已审核' }[item.auditStatus] || item.auditStatus) },
        { key: 'businessStatus', label: '业务状态', render: (item) => ({ normal: '正常', closed: '已完结', cancelled: '已取消' }[item.businessStatus] || item.businessStatus) },
        { key: 'totalQuantity', label: '计划调拨数量', align: 'right', render: (item) => item.totalQuantity ?? 0 },
        { key: 'createdAt', label: '创建时间', muted: true, render: (item) => item.createdAt },
      ],
      rows: order ? [order] : [],
    },
    {
      key: 'sourceNotice',
      title: row.sourceType === 'step_in' ? '来源调入通知单' : '来源调出通知单',
      emptyText: '暂无来源通知单',
      columns: [
        {
          key: 'noticeNo',
          label: '单号',
          link: true,
          pageId: row.sourceType === 'step_in' ? 'inventory-transfer-in-notice-detail' : 'inventory-transfer-out-notice-detail',
          resolveRow: (item) => item,
        },
        {
          key: 'status',
          label: '单据状态',
          badge: true,
          render: (item) => (row.sourceType === 'step_in'
            ? transferInNoticeStatusLabels[item.status]
            : transferOutNoticeStatusLabels[item.status]) || item.status,
          badgeTone: (item) => (row.sourceType === 'step_in'
            ? transferInNoticeBadgeTones[item.status]
            : transferOutNoticeBadgeTones[item.status]) || 'default',
        },
        { key: 'totalQuantity', label: '通知数量', align: 'right', render: (item) => item.totalQuantity ?? 0 },
        {
          key: 'totalActualQty',
          label: row.sourceType === 'step_in' ? '实际调入数量' : '实际调出数量',
          align: 'right',
          render: (item) => item.totalActualQty,
        },
        {
          key: 'totalDiffQty',
          label: row.sourceType === 'step_in' ? '少收数量' : '未发数量',
          align: 'right',
          render: (item) => (row.sourceType === 'step_in' ? item.totalShortageQty : item.totalRemainingQty),
        },
        { key: 'createdAt', label: '创建时间', muted: true, render: (item) => item.createdAt },
      ],
      rows: notice ? [notice] : [],
    },
  ];
}

const detailConfig = {
  listPageId: 'inventory-direct-transfer',
  editPageId: 'inventory-direct-transfer-edit',
  lineSectionTitle: '商品明细',
  lineVariant: 'direct-transfer',
  lineEditorOptions: { productOptions, skuOptions },
  getDetail,
  title: (detail) => `直接调拨单详情${detail.transferNo ? ` · ${detail.transferNo}` : ''}`,
  getStatusBadges: (row) => [
    {
      label: directTransferAuditLabels[row.auditStatus] || row.auditStatus,
      tone: directTransferBadgeTones.auditStatus[row.auditStatus] || 'neutral',
    },
    {
      label: kingdeePushStatusLabels[row.kingdeePushStatus] || row.kingdeePushStatus,
      tone: directTransferBadgeTones.kingdeePushStatus[row.kingdeePushStatus] || 'neutral',
    },
  ],
  rowKey: (detail) => detail.transferNo || detail.id,
  canEdit: canEditDirectTransfer,
  editLabel: '编辑',
  sections: [
    {
      title: '单据信息',
      fields: ({ detail, row, onOpenPage }) => [
        { key: 'transferNo', label: '单号', value: detail.transferNo },
        { key: 'sourceType', label: '来源类型', value: directTransferSourceTypeLabels[detail.sourceType] || detail.sourceType },
        { key: 'sourceOrderNo', label: '来源分步式调拨单', value: buildOrderLink(detail, onOpenPage) },
        { key: 'sourceNoticeNo', label: '来源通知单', value: buildNoticeLink(detail, onOpenPage) },
        { key: 'sourceSystem', label: '来源系统', value: detail.sourceSystem || EMPTY_PLACEHOLDER },
        { key: 'sourceNo', label: '来源单号', value: detail.sourceNo || EMPTY_PLACEHOLDER },
        { key: 'fromWarehouse', label: '来源逻辑仓', value: resolveLogicalWarehouseLabel(detail.fromWarehouse) },
        { key: 'toWarehouse', label: '目标逻辑仓', value: resolveLogicalWarehouseLabel(detail.toWarehouse) },
        { key: 'actualTransferTime', label: '实际调拨时间', value: row.actualTransferTime || EMPTY_PLACEHOLDER },
        { key: 'businessDate', label: '业务日期', value: row.businessDate || EMPTY_PLACEHOLDER },
        { key: 'remark', label: '备注', value: detail.remark || EMPTY_PLACEHOLDER, className: 'col-span-3' },
        { key: 'pushTime', label: '推送金蝶时间', value: row.pushTime || EMPTY_PLACEHOLDER },
        { key: 'pushFailReason', label: '推送失败原因', value: row.pushFailReason || EMPTY_PLACEHOLDER, className: 'col-span-2' },
      ],
    },
  ],
  buildLineSummary: ({ detail }) => ({
    quantity: { label: '实际调拨数量', value: detail.totalQuantity ?? 0 },
  }),
  extraSections: [
    {
      title: '审核信息',
      fields: ({ row }) => [
        { key: 'auditor', label: '审核人', value: row.auditor || EMPTY_PLACEHOLDER },
        { key: 'auditTime', label: '审核时间', value: row.auditTime || EMPTY_PLACEHOLDER },
        { key: 'returnComment', label: '撤回意见', value: row.returnComment || EMPTY_PLACEHOLDER, className: 'col-span-4' },
      ],
    },
    {
      title: '操作信息',
      variant: 'meta-tabs',
      defaultTab: 'create',
      tabs: ({ row }) => [
        { key: 'create', label: '制单信息', fields: buildCreateMetaFields(row) },
        { key: 'log', label: '操作日志', variant: 'log', logEntries: () => buildDirectTransferOperationLogs(row) },
      ],
    },
  ],
};

export function DirectTransferDetailPage({ onFeedback, onOpenPage, context }) {
  const row = useTransferDocRow(context, {
    storageKey: DIRECT_TRANSFER_STORAGE_KEY,
    loadById: loadDirectTransferById,
  });
  const [dialog, setDialog] = useState(null);

  function handleDialogComplete(result) {
    if (result?.message) onFeedback?.(result.message, result.type || 'success');
    if (result?.row) {
      onOpenPage?.('inventory-direct-transfer-detail', { row: loadDirectTransferById(result.row.id) || result.row });
    }
    setDialog(null);
  }

  const config = {
    ...detailConfig,
    renderAfterLines: ({ row: currentRow, onOpenPage: openPage }) => {
      const sections = buildRelatedSections(currentRow);
      if (!sections.length) return null;
      return <RelatedDocumentsCard sections={sections} onOpenPage={openPage} />;
    },
    renderHeaderActions: ({ onOpenPage: openPage }) => (
      <DirectTransferDetailHeaderActions
        row={row}
        onAction={(id, currentRow) => {
          if (id === 'edit') {
            openPage?.('inventory-direct-transfer-edit', { row: currentRow });
            return;
          }
          setDialog({ type: id, row: currentRow });
        }}
      />
    ),
  };

  return (
    <>
      <DocumentDetailPage context={{ row }} onOpenPage={onOpenPage} config={config} />
      <DirectTransferActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={onFeedback}
      />
    </>
  );
}
