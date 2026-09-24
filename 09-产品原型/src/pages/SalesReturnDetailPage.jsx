import { useEffect, useState } from 'react';
import { DocumentDetailPage } from '../components/erp/DocumentDetailPage.jsx';
import { buildCreateMetaFields } from '../components/erp/DocumentMetaTabsCard.jsx';
import { RelatedDocumentsCard } from '../components/erp/RelatedDocumentsCard.jsx';
import {
  SalesReturnActionDialogs,
  SalesReturnDetailHeaderActions,
} from '../components/erp/SalesReturnActionDialogs.jsx';
import { customerOptions, currencyOptions, logicalWarehouseOptions } from '../data/masterData.js';
import { salesReturnNotices } from '../data/salesReturnNoticeData.js';
import { getSalesReturnStatusBadges } from '../data/salesReturnData.js';
import { salesOutbounds } from '../data/salesOutboundData.js';
import { resolveOptionLabel } from '../lib/codeName.js';
import { EMPTY_PLACEHOLDER, formatAmount } from '../lib/format.js';
import { subscribeMockRows } from '../lib/mockStorage.js';
import { currencySymbol } from '../lib/money.js';
import {
  buildSalesReturnOperationLogs,
  canEditSalesReturn,
  formatDeadlineDate,
  getSalesReturnCancelBlockReason,
  loadSalesReturnById,
  refreshSalesReturnLines,
  SALES_RETURN_STORAGE_KEY,
} from '../lib/salesReturnLogic.js';
import { buildSalesReturnRelatedDocumentSections } from '../lib/salesReturnRelatedDocs.js';

function useSalesReturnRow(context) {
  const contextRow = context?.row;
  const [row, setRow] = useState(contextRow || null);

  useEffect(() => {
    if (!contextRow?.id) {
      setRow(contextRow || null);
      return undefined;
    }

    function syncRow() {
      setRow(loadSalesReturnById(contextRow.id) || contextRow);
    }

    syncRow();
    return subscribeMockRows(SALES_RETURN_STORAGE_KEY, syncRow);
  }, [contextRow]);

  return row;
}

function getReturnDetail(row) {
  if (!row) return { lines: [] };
  return {
    ...row,
    lines: refreshSalesReturnLines(row.lines || []),
  };
}

function buildDocumentLink(label, onClick) {
  if (!label) return EMPTY_PLACEHOLDER;
  return (
    <button type="button" className="truncate text-erp-primary hover:underline" onClick={onClick}>
      {label}
    </button>
  );
}

function formatCloseType(value) {
  if (value === 'manual') return '手动关闭';
  if (value === 'auto') return '到期自动关闭';
  return EMPTY_PLACEHOLDER;
}

function buildReturnInfoFields({ detail, row, onOpenPage }) {
  const relatedOutbound = salesOutbounds.find(
    (outbound) => outbound.id === row.sourceOutboundId || outbound.outboundNo === row.sourceOutboundNo,
  );

  return [
    { key: 'returnNo', label: '单号', value: detail.returnNo },
    { key: 'customer', label: '客户', value: resolveOptionLabel(detail.customer, customerOptions) },
    { key: 'currency', label: '币别', value: resolveOptionLabel(detail.currency, currencyOptions) },
    { key: 'amount', label: '价税合计', value: `${currencySymbol(detail.currency)} ${formatAmount(detail.amount ?? 0)}` },
    { key: 'taxAmount', label: '税额', value: `${currencySymbol(detail.currency)} ${formatAmount(detail.taxAmount ?? 0)}` },
    { key: 'netAmount', label: '金额', value: `${currencySymbol(detail.currency)} ${formatAmount(detail.netAmount ?? 0)}` },
    { key: 'warehouse', label: '收货仓库', value: resolveOptionLabel(detail.warehouse, logicalWarehouseOptions) },
    { key: 'returnDeadline', label: '退货截止日期', value: formatDeadlineDate(detail.returnDeadline) },
    {
      key: 'sourceOutboundNo',
      label: '来源销售出库单',
      value: buildDocumentLink(detail.sourceOutboundNo, () => onOpenPage?.('sales-outbound-detail', {
        row: relatedOutbound || { outboundNo: detail.sourceOutboundNo, id: detail.sourceOutboundId },
      })),
    },
    { key: 'remark', label: '备注', value: detail.remark || EMPTY_PLACEHOLDER, className: 'col-span-3' },
  ];
}

function buildCreateTabFields(row) {
  const [creator, createdAt, updater, updatedAt] = buildCreateMetaFields(row);
  const fields = [
    creator,
    createdAt,
    { key: 'auditor', label: '审核人', value: row.auditor },
    { key: 'auditTime', label: '审核时间', value: row.auditTime },
    updater,
    updatedAt,
  ];
  if (row.returnComment) {
    fields.push({ key: 'returnComment', label: '撤回意见', value: row.returnComment, className: 'col-span-3' });
  }
  return fields;
}

const returnDetailConfig = {
  listPageId: 'sales-return',
  editPageId: 'sales-return-edit',
  lineSectionTitle: '商品明细',
  lineVariant: 'sales-return',
  getDetail: getReturnDetail,
  title: (detail) => `销售退货单详情${detail.returnNo ? ` · ${detail.returnNo}` : ''}`,
  getStatusBadges: (row) => getSalesReturnStatusBadges(row),
  canEdit: (row) => canEditSalesReturn(row),
  rowKey: (detail) => detail.returnNo,
  sections: [
    {
      title: '单据信息',
      fields: ({ detail, row, onOpenPage }) => buildReturnInfoFields({ detail, row, onOpenPage }),
    },
  ],
  extraSections: [
    {
      title: '终止信息',
      visibleWhen: ({ row }) => row.businessStatus === 'closed' || row.businessStatus === 'cancelled',
      fields: ({ row }) => (
        row.businessStatus === 'closed'
          ? [
            { key: 'closeType', label: '关闭方式', value: formatCloseType(row.closeType) },
            { key: 'closeReason', label: '关闭原因', value: row.closeReason || EMPTY_PLACEHOLDER },
            { key: 'closeTime', label: '关闭时间', value: row.closeTime || EMPTY_PLACEHOLDER },
            { key: 'closeOperator', label: '关闭操作人', value: row.closeOperator || EMPTY_PLACEHOLDER },
          ]
          : [
            { key: 'cancelReason', label: '取消原因', value: row.cancelReason || EMPTY_PLACEHOLDER },
            { key: 'cancelTime', label: '取消时间', value: row.cancelTime || EMPTY_PLACEHOLDER },
            { key: 'cancelOperator', label: '取消操作人', value: row.cancelOperator || EMPTY_PLACEHOLDER },
          ]
      ),
    },
    {
      title: '操作信息',
      variant: 'meta-tabs',
      defaultTab: 'create',
      tabs: ({ row }) => [
        {
          key: 'create',
          label: '制单信息',
          fields: buildCreateTabFields(row),
        },
        {
          key: 'log',
          label: '操作日志',
          variant: 'log',
          logEntries: () => buildSalesReturnOperationLogs(row),
        },
      ],
    },
  ],
  summary: { quantityLabel: '退货数量', amountLabel: '价税合计' },
  buildLineSummary: ({ detail, lineTotals, currency }) => {
    const prefix = `${currencySymbol(currency)} `;
    return {
      quantity: { label: '退货数量', value: lineTotals.quantity },
      grossAmount: { label: '价税合计', value: lineTotals.grossAmount, format: 'amount', prefix, emphasis: true },
      taxAmount: { label: '税额', value: lineTotals.taxAmount, format: 'amount', prefix },
      netAmount: { label: '金额', value: lineTotals.netAmount, format: 'amount', prefix },
    };
  },
};

export function SalesReturnDetailPage({ onFeedback, onOpenPage, context }) {
  const row = useSalesReturnRow(context);
  const [dialog, setDialog] = useState(null);

  function handleDialogComplete(result) {
    if (result?.message) onFeedback?.(result.message, result.type || 'success');
    if (result?.deleted) {
      onOpenPage?.('sales-return');
      setDialog(null);
      return;
    }
    if (result?.followUp === 'mock-notice' && result?.row) {
      setDialog({ type: 'mock-notice', row: result.row });
      return;
    }
    if (result?.row) {
      onOpenPage?.('sales-return-detail', { row: loadSalesReturnById(result.row.id) || result.row });
    }
    setDialog(null);
  }

  const config = {
    ...returnDetailConfig,
    renderAfterLines: ({ row: currentRow, onOpenPage: openPage }) => (
      currentRow.auditStatus === 'approved'
        ? (
          <RelatedDocumentsCard
            sections={buildSalesReturnRelatedDocumentSections(currentRow)}
            onOpenPage={openPage}
          />
        )
        : null
    ),
    renderHeaderActions: () => (
      <SalesReturnDetailHeaderActions
        row={row}
        onAction={(id, currentRow) => {
          if (id === 'notice') {
            onOpenPage?.('sales-return-notice-create', { sourceReturnId: currentRow.id, row: currentRow });
            return;
          }
          if (id === 'cancel') {
            const blockReason = getSalesReturnCancelBlockReason(currentRow, salesReturnNotices);
            if (blockReason) {
              onFeedback?.(blockReason, 'warning');
              return;
            }
          }
          setDialog({ type: id, row: currentRow });
        }}
      />
    ),
  };

  return (
    <>
      <DocumentDetailPage context={{ row }} onOpenPage={onOpenPage} config={config} />
      <SalesReturnActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={onFeedback}
      />
    </>
  );
}
