import { useState } from 'react';
import { DocumentDetailPage } from '../components/erp/DocumentDetailPage.jsx';
import { productOptions, skuOptions } from '../data/masterData.js';
import {
  buildOperationInfoTabs,
} from '../components/erp/DocumentMetaTabsCard.jsx';
import { RelatedDocumentsCard } from '../components/erp/RelatedDocumentsCard.jsx';
import {
  OtherOutboundRequestActionDialogs,
  OtherOutboundRequestDetailHeaderActions,
} from '../components/erp/OtherOutboundRequestActionDialogs.jsx';
import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import { useDocumentRow } from '../hooks/useDocumentRow.js';
import { buildOtherOutboundRequestRelatedDocumentSections } from '../lib/otherOutboundRelatedDocs.js';
import {
  canEditRequest,
  loadOtherOutboundRequestById,
  OTHER_OUTBOUND_REQUEST_STORAGE_KEY,
  refreshOutboundRequestLines,
  sumOutboundRequestActualQty,
} from '../lib/otherOutboundRequestLogic.js';
import {
  buildOtherOutboundRequestOperationLogs,
  getOtherOutboundRequestStatusBadges,
} from '../data/otherOutboundRequestData.js';
import { resolveLogicalWarehouseLabel } from '../data/warehouseData.js';

function getRequestDetail(row) {
  if (!row) return { lines: [] };
  return {
    ...row,
    lines: refreshOutboundRequestLines(row.lines || []),
  };
}

function buildRequestInfoFields({ detail, row }) {
  return [
    { key: 'requestNo', label: '单号', value: detail.requestNo },
    { key: 'logicalWarehouse', label: '出库仓', value: resolveLogicalWarehouseLabel(detail.logicalWarehouse) },
    { key: 'businessType', label: '业务类型', value: detail.businessType || EMPTY_PLACEHOLDER },
    { key: 'pushTime', label: '最近推送时间', value: row.pushTime || EMPTY_PLACEHOLDER },
    { key: 'pushFailReason', label: '推送失败原因', value: row.pushFailReason || EMPTY_PLACEHOLDER, className: 'col-span-3' },
    { key: 'remark', label: '备注', value: detail.remark || EMPTY_PLACEHOLDER, className: 'col-span-3' },
    { key: 'confirmBy', label: '人工确认人', value: row.confirmBy || EMPTY_PLACEHOLDER },
    { key: 'confirmAt', label: '人工确认时间', value: row.confirmAt || EMPTY_PLACEHOLDER },
    { key: 'confirmContent', label: '人工确认内容', value: row.confirmContent || EMPTY_PLACEHOLDER, className: 'col-span-3' },
  ];
}

const requestDetailConfig = {
  listPageId: 'inventory-other-outbound-request',
  editPageId: 'inventory-other-outbound-request-edit',
  lineSectionTitle: '商品明细',
  lineVariant: 'other-outbound-request',
  lineEditorOptions: { productOptions, skuOptions },
  getDetail: getRequestDetail,
  title: (detail) => `其他出库申请单详情${detail.requestNo ? ` · ${detail.requestNo}` : ''}`,
  getStatusBadges: (row) => getOtherOutboundRequestStatusBadges(row),
  rowKey: (detail) => detail.requestNo,
  canEdit: (row) => canEditRequest(row),
  editLabel: '编辑',
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
        { key: 'cancelReason', label: '取消原因', value: row.cancelReason || EMPTY_PLACEHOLDER },
        { key: 'cancelTime', label: '取消时间', value: row.cancelTime || EMPTY_PLACEHOLDER },
        { key: 'cancelOperator', label: '取消操作人', value: row.cancelOperator || EMPTY_PLACEHOLDER },
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
      tabs: ({ row }) => buildOperationInfoTabs({ row, buildLogs: buildOtherOutboundRequestOperationLogs }),
    },
  ],
  buildLineSummary: ({ detail }) => ({
    quantity: { label: '申请出库数量', value: detail.totalQuantity ?? 0 },
    actualQty: {
      label: '实出数量',
      value: sumOutboundRequestActualQty(detail.lines) ?? EMPTY_PLACEHOLDER,
    },
    remainingQty: { label: '未出数量', value: detail.totalRemainingQty ?? 0 },
  }),
};

export function OtherOutboundRequestDetailPage({ onFeedback, onOpenPage, context }) {
  const [dialog, setDialog] = useState(null);
  const row = useDocumentRow(context, { storageKey: OTHER_OUTBOUND_REQUEST_STORAGE_KEY, loadById: loadOtherOutboundRequestById });

  function handleDialogComplete(result) {
    if (result?.message) onFeedback?.(result.message, result.type || 'success');
    if (result?.deleted) {
      setDialog(null);
      onOpenPage?.('inventory-other-outbound-request');
      return;
    }
    setDialog(null);
  }

  const config = {
    ...requestDetailConfig,
    renderAfterLines: ({ row: currentRow, onOpenPage: openPage }) => (
      currentRow.status === 'delivered'
        ? (
          <RelatedDocumentsCard
            sections={buildOtherOutboundRequestRelatedDocumentSections(currentRow)}
            onOpenPage={openPage}
          />
        )
        : null
    ),
    renderHeaderActions: ({ row: currentRow, onOpenPage: openPage }) => (
      <OtherOutboundRequestDetailHeaderActions
        row={currentRow}
        onAction={(id, actionRow) => {
          if (id === 'edit') {
            openPage?.('inventory-other-outbound-request-edit', { row: actionRow });
            return;
          }
          setDialog({ type: id, row: actionRow });
        }}
      />
    ),
  };

  return (
    <>
      <DocumentDetailPage context={{ row }} onOpenPage={onOpenPage} config={config} />
      <OtherOutboundRequestActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={onFeedback}
      />
    </>
  );
}
