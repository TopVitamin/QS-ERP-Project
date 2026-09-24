import { useState } from 'react';
import { DocumentDetailPage } from '../components/erp/DocumentDetailPage.jsx';
import { productOptions, skuOptions } from '../data/masterData.js';
import { buildCreateMetaFields } from '../components/erp/DocumentMetaTabsCard.jsx';
import { RelatedDocumentsCard } from '../components/erp/RelatedDocumentsCard.jsx';
import {
  TransferOrderActionDialogs,
  TransferOrderDetailHeaderActions,
} from '../components/erp/TransferOrderActionDialogs.jsx';
import { useTransferDocRow } from '../hooks/useTransferDocRow.js';
import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import { resolveLogicalWarehouseLabel } from '../data/warehouseData.js';
import { getTransferOrderStatusBadges } from '../data/transferOrderData.js';
import {
  buildTransferOrderOperationLogs,
  canEditTransferOrder,
  loadTransferOrderById,
  refreshTransferOrderLines,
  TRANSFER_ORDER_STORAGE_KEY,
} from '../lib/transferOrderLogic.js';
import { buildTransferOrderRelatedDocumentSections } from '../lib/transferOrderRelatedDocs.js';

/**
 * 分步式调拨单详情（F05）：单据信息、数量进度、商品明细、关联单据（已审核）、
 * 状态信息（仅已完结）、终止信息（仅已取消）、审核信息与操作信息。
 * 分区顺序见《详情页 Demo PRD》§3；页头按钮按主PRD §6.4 互斥展示。
 */

function getDetail(row) {
  if (!row) return { lines: [] };
  return { ...row, lines: refreshTransferOrderLines(row.lines || []) };
}

const detailConfig = {
  listPageId: 'inventory-transfer-order',
  editPageId: 'inventory-transfer-order-edit',
  lineSectionTitle: '商品明细',
  lineVariant: 'transfer-order',
  lineEditorOptions: { productOptions, skuOptions },
  getDetail,
  title: (detail) => `分步式调拨单详情${detail.orderNo ? ` · ${detail.orderNo}` : ''}`,
  getStatusBadges: (row) => getTransferOrderStatusBadges(row),
  rowKey: (detail) => detail.orderNo || detail.id,
  canEdit: canEditTransferOrder,
  editLabel: '编辑',
  sections: [
    {
      title: '单据信息',
      fields: ({ detail }) => [
        { key: 'orderNo', label: '单号', value: detail.orderNo },
        { key: 'outWarehouse', label: '调出仓', value: resolveLogicalWarehouseLabel(detail.outWarehouse) },
        { key: 'inWarehouse', label: '接收仓', value: resolveLogicalWarehouseLabel(detail.inWarehouse) },
        { key: 'remark', label: '备注', value: detail.remark || EMPTY_PLACEHOLDER, className: 'col-span-3' },
      ],
    },
    {
      title: '数量进度',
      fields: ({ detail }) => [
        { key: 'totalQuantity', label: '计划调拨数量合计', value: detail.totalQuantity ?? 0 },
        { key: 'totalActualOutQty', label: '累计实际调出合计', value: detail.totalActualOutQty ?? EMPTY_PLACEHOLDER },
        { key: 'totalActualInQty', label: '累计实际调入合计', value: detail.totalActualInQty ?? EMPTY_PLACEHOLDER },
        { key: 'totalInTransitQty', label: '在途数量合计', value: detail.totalInTransitQty ?? EMPTY_PLACEHOLDER },
      ],
    },
  ],
  buildLineSummary: ({ detail }) => ({
    quantity: { label: '计划调拨数量', value: detail.totalQuantity ?? 0 },
    actualOutQty: { label: '累计实际调出', value: detail.totalActualOutQty ?? EMPTY_PLACEHOLDER },
    actualInQty: { label: '累计实际调入', value: detail.totalActualInQty ?? EMPTY_PLACEHOLDER },
    remainingQty: { label: '未调出数量', value: detail.totalRemainingQty ?? 0 },
    inTransitQty: { label: '在途数量', value: detail.totalInTransitQty ?? EMPTY_PLACEHOLDER },
  }),
  extraSections: [
    {
      title: '状态信息',
      visibleWhen: ({ row }) => row.businessStatus === 'closed',
      fields: ({ row }) => [
        { key: 'closeType', label: '关闭方式', value: row.closeType === 'auto' ? '两端执行完成自动完结' : EMPTY_PLACEHOLDER },
        { key: 'closeTime', label: '关闭时间', value: row.closeTime || EMPTY_PLACEHOLDER },
      ],
    },
    {
      title: '终止信息',
      visibleWhen: ({ row }) => row.businessStatus === 'cancelled',
      fields: ({ row }) => [
        { key: 'cancelReason', label: '取消原因', value: row.cancelReason || EMPTY_PLACEHOLDER },
        { key: 'cancelOperator', label: '取消操作人', value: row.cancelOperator || EMPTY_PLACEHOLDER },
        { key: 'cancelTime', label: '取消时间', value: row.cancelTime || EMPTY_PLACEHOLDER },
      ],
    },
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
        { key: 'log', label: '操作日志', variant: 'log', logEntries: () => buildTransferOrderOperationLogs(row) },
      ],
    },
  ],
};

export function TransferOrderDetailPage({ onFeedback, onOpenPage, context }) {
  const row = useTransferDocRow(context, { storageKey: TRANSFER_ORDER_STORAGE_KEY, loadById: loadTransferOrderById });
  const [dialog, setDialog] = useState(null);

  function handleDialogComplete(result) {
    if (result?.message) onFeedback?.(result.message, result.type || 'success');
    if (result?.row && !result.keepOpen) {
      onOpenPage?.('inventory-transfer-order-detail', { row: loadTransferOrderById(result.row.id) || result.row });
    }
    if (!result?.keepOpen) setDialog(null);
  }

  const config = {
    ...detailConfig,
    renderAfterLines: ({ row: currentRow, onOpenPage: openPage }) => (
      currentRow.auditStatus === 'approved'
        ? (
          <RelatedDocumentsCard
            sections={buildTransferOrderRelatedDocumentSections(currentRow)}
            onOpenPage={openPage}
          />
        )
        : null
    ),
    renderHeaderActions: ({ onOpenPage: openPage }) => (
      <TransferOrderDetailHeaderActions
        row={row}
        onAction={(id, currentRow) => {
          if (id === 'edit') {
            openPage?.('inventory-transfer-order-edit', { row: currentRow });
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
      <TransferOrderActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={onFeedback}
      />
    </>
  );
}
