import { useState } from 'react';
import { DocumentDetailPage } from '../components/erp/DocumentDetailPage.jsx';
import {
  buildOperationInfoTabs,
} from '../components/erp/DocumentMetaTabsCard.jsx';
import { RelatedDocumentsCard } from '../components/erp/RelatedDocumentsCard.jsx';
import {
  PurchaseReturnNoticeActionDialogs,
  PurchaseReturnNoticeDetailHeaderActions,
} from '../components/erp/PurchaseReturnNoticeActionDialogs.jsx';
import { resolveOptionLabel } from '../lib/codeName.js';
import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import { useDocumentRow } from '../hooks/useDocumentRow.js';
import { logicalWarehouseOptions, supplierOptions } from '../data/masterData.js';
import { purchaseReturns } from '../data/purchaseReturnData.js';
import { getReturnNoticeStatusBadges } from '../data/purchaseReturnNoticeData.js';
import { buildReturnNoticeRelatedDocumentSections } from '../lib/purchaseReturnRelatedDocs.js';
import { loadReturnById } from '../lib/purchaseReturnLogic.js';
import {
  buildReturnNoticeOperationLogs,
  formatReturnShipMode,
  loadReturnNoticeById,
  manualConfirmTypesForStatus,
  refreshReturnNoticeLines,
  RETURN_NOTICE_STORAGE_KEY,
} from '../lib/purchaseReturnNoticeLogic.js';

/**
 * 采退发货通知单详情（F04、F05～F08）。
 * 分区：单据信息 → 商品明细 → 关联单据（仅已发货）→ 终止信息（仅已取消）→ 操作信息。
 */

function getNoticeDetail(row) {
  if (!row) return { lines: [] };
  return {
    ...row,
    lines: refreshReturnNoticeLines(row.lines || [], row.status),
  };
}

function buildSourceReturnLink(detail, onOpenPage) {
  if (!detail?.sourceReturnNo) return EMPTY_PLACEHOLDER;
  const relatedReturn = loadReturnById(detail.sourceReturnId)
    || purchaseReturns.find((item) => item.returnNo === detail.sourceReturnNo);
  return (
    <button
      type="button"
      className="truncate text-erp-primary hover:underline"
      onClick={() => onOpenPage?.('purchase-return-detail', {
        row: relatedReturn || { returnNo: detail.sourceReturnNo, id: detail.sourceReturnId },
      })}
    >
      {detail.sourceReturnNo}
    </button>
  );
}

function buildNoticeInfoFields({ detail, row, onOpenPage }) {
  const fields = [
    { key: 'noticeNo', label: '单号', value: detail.noticeNo },
    { key: 'sourceReturnNo', label: '来源采购退货单', value: buildSourceReturnLink(detail, onOpenPage) },
    { key: 'supplier', label: '供应商', value: resolveOptionLabel(detail.supplier, supplierOptions) },
    { key: 'warehouse', label: '出库仓库', value: resolveOptionLabel(detail.warehouse, logicalWarehouseOptions) },
    { key: 'shipMode', label: '发货处理方式', value: formatReturnShipMode(detail) },
    { key: 'pushTime', label: '推送时间', value: row.pushTime || EMPTY_PLACEHOLDER },
    { key: 'finalShipTime', label: '最终发货确认时间', value: row.finalShipTime || EMPTY_PLACEHOLDER },
    { key: 'lastProcessTime', label: '最近处理时间', value: row.lastProcessTime || EMPTY_PLACEHOLDER },
    { key: 'confirmBy', label: '人工确认人', value: row.confirmBy || EMPTY_PLACEHOLDER },
    { key: 'confirmAt', label: '人工确认时间', value: row.confirmAt || EMPTY_PLACEHOLDER },
  ];
  if (row.confirmContent) {
    fields.push({ key: 'confirmContent', label: '人工确认内容', value: row.confirmContent, className: 'col-span-3' });
  }
  if (row.pushFailReason) {
    fields.push({ key: 'pushFailReason', label: '推送失败原因', value: row.pushFailReason, className: 'col-span-3' });
  }
  fields.push({ key: 'remark', label: '备注', value: detail.remark || EMPTY_PLACEHOLDER, className: 'col-span-3' });
  return fields;
}

const noticeDetailConfig = {
  listPageId: 'purchase-return-notice',
  editPageId: 'purchase-return-notice-edit',
  lineSectionTitle: '商品明细',
  lineVariant: 'purchase-return-notice',
  getDetail: getNoticeDetail,
  title: (detail) => `采退发货通知单详情${detail.noticeNo ? ` · ${detail.noticeNo}` : ''}`,
  getStatusBadges: (row) => (
    row?.isMock
      ? [...getReturnNoticeStatusBadges(row), { label: '演示数据', tone: 'neutral' }]
      : getReturnNoticeStatusBadges(row)
  ),
  rowKey: (detail) => detail.noticeNo,
  sections: [
    {
      title: '单据信息',
      fields: ({ detail, row, onOpenPage }) => buildNoticeInfoFields({ detail, row, onOpenPage }),
    },
  ],
  extraSections: [
    {
      title: '终止信息',
      visibleWhen: ({ row }) => row.status === 'cancelled',
      fields: ({ row }) => [
        { key: 'cancelReason', label: '取消原因', value: row.cancelReason },
        { key: 'cancelTime', label: '取消时间', value: row.cancelTime },
        { key: 'cancelOperator', label: '取消操作人', value: row.cancelOperator },
      ],
    },
    {
      title: '操作信息',
      variant: 'meta-tabs',
      defaultTab: 'create',
      tabs: ({ row }) => buildOperationInfoTabs({ row, buildLogs: buildReturnNoticeOperationLogs }),
    },
  ],
  summary: { quantityLabel: '通知数量', amountLabel: '实出数量' },
  buildLineSummary: ({ detail }) => ({
    notifyQty: { label: '通知数量', value: detail.totalNotifyQty ?? 0 },
    shippedQty: { label: '实出数量', value: detail.totalShippedQty ?? 0 },
    shortQty: { label: '缺出数量', value: detail.totalShortQty ?? 0 },
  }),
};

export function PurchaseReturnNoticeDetailPage({ onFeedback, onOpenPage, context }) {
  const row = useDocumentRow(context, { storageKey: RETURN_NOTICE_STORAGE_KEY, loadById: loadReturnNoticeById });
  const [dialog, setDialog] = useState(null);

  function handleDialogComplete(result) {
    if (result?.message) onFeedback?.(result.message, result.type || 'success');
    if (result?.row) {
      onOpenPage?.('purchase-return-notice-detail', { row: loadReturnNoticeById(result.row.id) || result.row });
    }
    setDialog(null);
  }

  const config = {
    ...noticeDetailConfig,
    renderAfterLines: ({ row: currentRow, onOpenPage: openPage }) => (
      currentRow.status === 'shipped'
        ? (
          <RelatedDocumentsCard
            sections={buildReturnNoticeRelatedDocumentSections(currentRow)}
            onOpenPage={openPage}
          />
        )
        : null
    ),
    renderHeaderActions: ({ onOpenPage: openPage }) => (
      <PurchaseReturnNoticeDetailHeaderActions
        row={row}
        onAction={(id, currentRow) => {
          if (id === 'edit') {
            openPage?.('purchase-return-notice-edit', { row: currentRow });
            return;
          }
          if (id === 'manual-confirm') {
            const [confirmType] = manualConfirmTypesForStatus(currentRow.status);
            setDialog({ type: 'manual-confirm', confirmType, row: currentRow });
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
      <PurchaseReturnNoticeActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={onFeedback}
      />
    </>
  );
}
