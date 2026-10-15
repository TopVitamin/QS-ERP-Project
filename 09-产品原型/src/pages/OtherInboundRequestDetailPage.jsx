import { useState } from 'react';
import { DocumentDetailPage } from '../components/erp/DocumentDetailPage.jsx';
import {
  buildOperationInfoTabs,
} from '../components/erp/DocumentMetaTabsCard.jsx';
import { RelatedDocumentsCard } from '../components/erp/RelatedDocumentsCard.jsx';
import {
  OtherInboundRequestActionDialogs,
  OtherInboundRequestDetailHeaderActions,
} from '../components/erp/OtherInboundRequestActionDialogs.jsx';
import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import { useDocumentRow } from '../hooks/useDocumentRow.js';
import { productOptions, skuOptions } from '../data/masterData.js';
import { resolveLogicalWarehouseLabel } from '../data/warehouseData.js';
import { getOtherInboundRequestStatusBadges } from '../data/otherInboundRequestData.js';
import { buildOtherInboundRequestRelatedDocumentSections } from '../lib/otherInboundRelatedDocs.js';
import {
  buildOtherInboundRequestOperationLogs,
  loadOtherInboundRequestById,
  OTHER_INBOUND_REQUEST_STORAGE_KEY,
  refreshRequestLines,
  sumRequestActualQty,
  sumRequestQty,
  sumRequestRemainingQty,
} from '../lib/otherInboundRequestLogic.js';

function getRequestDetail(row) {
  if (!row) return { lines: [] };
  return {
    ...row,
    lines: refreshRequestLines(row.lines || []),
  };
}

/** 单据信息：按 TSV 行序；推送失败原因与备注各占 3 列（详情页 PRD §3.1）。 */
function buildRequestInfoFields({ detail, row }) {
  return [
    { key: 'requestNo', label: '单号', value: detail.requestNo },
    { key: 'warehouse', label: '入库仓', value: resolveLogicalWarehouseLabel(detail.warehouse) },
    { key: 'businessType', label: '业务类型', value: detail.businessType || EMPTY_PLACEHOLDER },
    { key: 'lastPushTime', label: '最近推送时间', value: row.lastPushTime || EMPTY_PLACEHOLDER },
    { key: 'pushFailReason', label: '推送失败原因', value: row.pushFailReason || EMPTY_PLACEHOLDER, className: 'col-span-3' },
    { key: 'remark', label: '备注', value: detail.remark || EMPTY_PLACEHOLDER, className: 'col-span-3' },
    { key: 'confirmBy', label: '人工确认人', value: row.confirmBy || EMPTY_PLACEHOLDER },
    { key: 'confirmAt', label: '人工确认时间', value: row.confirmAt || EMPTY_PLACEHOLDER },
    { key: 'confirmContent', label: '人工确认内容', value: row.confirmContent || EMPTY_PLACEHOLDER, className: 'col-span-3' },
  ];
}

const requestDetailConfig = {
  listPageId: 'inventory-other-inbound-request',
  lineSectionTitle: '商品明细',
  lineVariant: 'other-inbound-request',
  lineEditorOptions: { productOptions, skuOptions },
  getDetail: getRequestDetail,
  title: (detail) => `其他入库申请单详情${detail.requestNo ? ` · ${detail.requestNo}` : ''}`,
  getStatusBadges: (row) => getOtherInboundRequestStatusBadges(row),
  rowKey: (detail) => detail.requestNo,
  sections: [
    {
      title: '单据信息',
      fields: ({ detail, row }) => buildRequestInfoFields({ detail, row }),
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
      title: '审核信息',
      fields: ({ row }) => [
        { key: 'auditor', label: '审核人', value: row.auditor || EMPTY_PLACEHOLDER },
        { key: 'auditTime', label: '审核时间', value: row.auditTime || EMPTY_PLACEHOLDER },
        { key: 'withdrawComment', label: '撤回意见', value: row.withdrawComment || EMPTY_PLACEHOLDER, className: 'col-span-4' },
      ],
    },
    {
      title: '操作信息',
      variant: 'meta-tabs',
      defaultTab: 'create',
      tabs: ({ row }) => buildOperationInfoTabs({ row, buildLogs: buildOtherInboundRequestOperationLogs }),
    },
  ],
  buildLineSummary: ({ detail }) => ({
    quantity: { label: '申请入库数量', value: detail.totalRequestQty ?? sumRequestQty(detail.lines) },
    actualQty: { label: '实收数量', value: sumRequestActualQty(detail.lines) ?? '-' },
    remainingQty: { label: '未收数量', value: detail.totalRemainingQty ?? sumRequestRemainingQty(detail.lines) },
  }),
};

export function OtherInboundRequestDetailPage({ onFeedback, onOpenPage, context }) {
  const row = useDocumentRow(context, { storageKey: OTHER_INBOUND_REQUEST_STORAGE_KEY, loadById: loadOtherInboundRequestById });
  const [dialog, setDialog] = useState(null);

  function handleDialogComplete(result) {
    if (result?.message) onFeedback?.(result.message, result.type || 'success');
    if (result?.deleted) {
      onOpenPage?.('inventory-other-inbound-request');
      setDialog(null);
      return;
    }
    if (result?.row) {
      onOpenPage?.('inventory-other-inbound-request-detail', { row: loadOtherInboundRequestById(result.row.id) || result.row });
    }
    setDialog(null);
  }

  const config = {
    ...requestDetailConfig,
    renderAfterLines: ({ row: currentRow, onOpenPage: openPage }) => (
      currentRow.status === 'received'
        ? (
          <RelatedDocumentsCard
            sections={buildOtherInboundRequestRelatedDocumentSections(currentRow)}
            onOpenPage={openPage}
          />
        )
        : null
    ),
    renderHeaderActions: ({ onOpenPage: openPage }) => (
      <OtherInboundRequestDetailHeaderActions
        row={row}
        onAction={(id, currentRow) => {
          if (id === 'edit') {
            openPage?.('inventory-other-inbound-request-edit', { row: currentRow });
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
      <OtherInboundRequestActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={onFeedback}
      />
    </>
  );
}
