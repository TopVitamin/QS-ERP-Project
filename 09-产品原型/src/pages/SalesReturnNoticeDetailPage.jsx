import { useState } from 'react';
import { DocumentDetailPage } from '../components/erp/DocumentDetailPage.jsx';
import {
  buildOperationInfoTabs,
} from '../components/erp/DocumentMetaTabsCard.jsx';
import { RelatedDocumentsCard } from '../components/erp/RelatedDocumentsCard.jsx';
import {
  SalesReturnNoticeActionDialogs,
  SalesReturnNoticeDetailHeaderActions,
} from '../components/erp/SalesReturnNoticeActionDialogs.jsx';
import { customerOptions, logicalWarehouseOptions } from '../data/masterData.js';
import { getSalesReturnNoticeStatusBadges } from '../data/salesReturnNoticeData.js';
import { salesReturns } from '../data/salesReturnData.js';
import { resolveOptionLabel } from '../lib/codeName.js';
import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import { useDocumentRow } from '../hooks/useDocumentRow.js';
import {
  buildSalesReturnNoticeOperationLogs,
  formatReturnReceiveMode,
  loadSalesReturnNoticeById,
  manualConfirmTypesForStatus,
  refreshSalesReturnNoticeLines,
  RETURN_NOTICE_STORAGE_KEY,
} from '../lib/salesReturnNoticeLogic.js';
import { buildSalesReturnNoticeRelatedDocumentSections } from '../lib/salesReturnRelatedDocs.js';

function getNoticeDetail(row) {
  if (!row) return { lines: [] };
  return {
    ...row,
    lines: refreshSalesReturnNoticeLines(row.lines || [], row.status),
  };
}

function buildSourceReturnLink(detail, onOpenPage) {
  if (!detail?.sourceReturnNo) return EMPTY_PLACEHOLDER;
  const relatedReturn = salesReturns.find(
    (item) => item.returnNo === detail.sourceReturnNo || item.id === detail.sourceReturnId,
  );
  return (
    <button
      type="button"
      className="truncate text-erp-primary hover:underline"
      onClick={() => onOpenPage?.('sales-return-detail', { row: relatedReturn || { returnNo: detail.sourceReturnNo, id: detail.sourceReturnId } })}
    >
      {detail.sourceReturnNo}
    </button>
  );
}

function buildNoticeInfoFields({ detail, row, onOpenPage }) {
  const fields = [
    { key: 'noticeNo', label: '单号', value: detail.noticeNo },
    { key: 'sourceReturnNo', label: '来源销售退货单', value: buildSourceReturnLink(detail, onOpenPage) },
    { key: 'customer', label: '客户', value: resolveOptionLabel(detail.customer, customerOptions) },
    { key: 'warehouse', label: '收货仓库', value: resolveOptionLabel(detail.warehouse, logicalWarehouseOptions) },
    { key: 'receiveMode', label: '收货处理方式', value: formatReturnReceiveMode(detail) },
    { key: 'pushTime', label: '推送时间', value: row.pushTime || EMPTY_PLACEHOLDER },
    { key: 'finalReceiveTime', label: '最终收货确认时间', value: row.finalReceiveTime || EMPTY_PLACEHOLDER },
    { key: 'lastHandledTime', label: '最近处理时间', value: row.lastHandledTime || EMPTY_PLACEHOLDER },
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
  listPageId: 'sales-return-notice',
  editPageId: 'sales-return-notice-edit',
  lineSectionTitle: '商品明细',
  lineVariant: 'receipt-notice',
  getDetail: getNoticeDetail,
  title: (detail) => `销退收货通知单详情${detail.noticeNo ? ` · ${detail.noticeNo}` : ''}`,
  getStatusBadges: (row) => getSalesReturnNoticeStatusBadges(row),
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
        { key: 'cancelReason', label: '取消原因', value: row.cancelReason || EMPTY_PLACEHOLDER },
        { key: 'cancelTime', label: '取消时间', value: row.cancelTime || EMPTY_PLACEHOLDER },
        { key: 'cancelOperator', label: '取消操作人', value: row.cancelOperator || EMPTY_PLACEHOLDER },
      ],
    },
    {
      title: '操作信息',
      variant: 'meta-tabs',
      defaultTab: 'create',
      tabs: ({ row }) => buildOperationInfoTabs({ row, buildLogs: buildSalesReturnNoticeOperationLogs }),
    },
  ],
  summary: { quantityLabel: '通知数量', amountLabel: '实收数量' },
  buildLineSummary: ({ detail }) => ({
    notifyQty: { label: '通知数量', value: detail.totalNotifyQty ?? 0 },
    receivedQty: { label: '实收数量', value: detail.totalReceivedQty ?? 0 },
    shortQty: { label: '缺收数量', value: detail.totalShortQty ?? 0 },
  }),
};

export function SalesReturnNoticeDetailPage({ onFeedback, onOpenPage, context }) {
  const row = useDocumentRow(context, { storageKey: RETURN_NOTICE_STORAGE_KEY, loadById: loadSalesReturnNoticeById });
  const [dialog, setDialog] = useState(null);

  function handleDialogComplete(result) {
    if (result?.message) onFeedback?.(result.message, result.type || 'success');
    if (result?.row) {
      onOpenPage?.('sales-return-notice-detail', { row: loadSalesReturnNoticeById(result.row.id) || result.row });
    }
    setDialog(null);
  }

  const config = {
    ...noticeDetailConfig,
    renderAfterLines: ({ row: currentRow, onOpenPage: openPage }) => (
      currentRow.status === 'received'
        ? (
          <RelatedDocumentsCard
            sections={buildSalesReturnNoticeRelatedDocumentSections(currentRow)}
            onOpenPage={openPage}
          />
        )
        : null
    ),
    renderHeaderActions: () => (
      <SalesReturnNoticeDetailHeaderActions
        row={row}
        onAction={(id, currentRow) => {
          if (id === 'edit') {
            onOpenPage?.('sales-return-notice-edit', { row: currentRow });
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
      <SalesReturnNoticeActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={onFeedback}
      />
    </>
  );
}
