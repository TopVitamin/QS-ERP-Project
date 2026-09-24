import { useEffect, useState } from 'react';
import { DocumentDetailPage } from '../components/erp/DocumentDetailPage.jsx';
import { buildCreateMetaFields } from '../components/erp/DocumentMetaTabsCard.jsx';
import { RelatedDocumentsCard } from '../components/erp/RelatedDocumentsCard.jsx';
import {
  PurchaseReturnActionDialogs,
  PurchaseReturnDetailHeaderActions,
} from '../components/erp/PurchaseReturnActionDialogs.jsx';
import { resolveOptionLabel } from '../lib/codeName.js';
import { EMPTY_PLACEHOLDER, formatAmount } from '../lib/format.js';
import { currencySymbol } from '../lib/money.js';
import { subscribeMockRows } from '../lib/mockStorage.js';
import { currencyOptions, logicalWarehouseOptions, supplierOptions } from '../data/masterData.js';
import { inboundOrders } from '../data/inboundData.js';
import { loadInboundById } from '../lib/inboundLogic.js';
import { buildReturnRelatedDocumentSections } from '../lib/purchaseReturnRelatedDocs.js';
import { getReturnStatusBadges, purchaseReturnLineEditorOptions } from '../data/purchaseReturnData.js';
import {
  buildPurchaseReturnOperationLogs,
  canEditReturn,
  formatDeadlineDate,
  loadReturnById,
  PURCHASE_RETURN_STORAGE_KEY,
  refreshReturnLines,
} from '../lib/purchaseReturnLogic.js';

/**
 * 采购退货单详情（F05、F06）。
 * 分区：单据信息 → 商品明细 → 关联单据（仅已审核）→ 终止信息（仅已关闭/已取消）→ 审核信息 → 操作信息。
 */

function useReturnRow(context) {
  const contextRow = context?.row;
  const [row, setRow] = useState(contextRow || null);

  useEffect(() => {
    if (!contextRow?.id) {
      setRow(contextRow || null);
      return undefined;
    }

    function syncRow() {
      setRow(loadReturnById(contextRow.id) || contextRow);
    }

    syncRow();
    return subscribeMockRows(PURCHASE_RETURN_STORAGE_KEY, syncRow);
  }, [contextRow]);

  return row;
}

function getReturnDetail(row) {
  if (!row) return { lines: [] };
  return {
    ...row,
    lines: refreshReturnLines(row.lines || []),
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

function buildReturnInfoFields({ detail, row, onOpenPage }) {
  const relatedInbound = loadInboundById(row.sourceInboundId)
    || inboundOrders.find((inbound) => inbound.inboundNo === row.sourceInboundNo);

  return [
    { key: 'returnNo', label: '单号', value: detail.returnNo },
    { key: 'supplier', label: '供应商', value: resolveOptionLabel(detail.supplier, supplierOptions) },
    { key: 'currency', label: '币别', value: resolveOptionLabel(detail.currency, currencyOptions) },
    { key: 'amount', label: '价税合计', value: `${currencySymbol(row.currency)} ${formatAmount(row.amount ?? 0)}` },
    { key: 'taxAmount', label: '税额', value: `${currencySymbol(row.currency)} ${formatAmount(row.taxAmount ?? 0)}` },
    { key: 'netAmount', label: '金额', value: `${currencySymbol(row.currency)} ${formatAmount(row.netAmount ?? 0)}` },
    { key: 'warehouse', label: '出库仓库', value: resolveOptionLabel(detail.warehouse, logicalWarehouseOptions) },
    { key: 'returnDeadline', label: '退货截止日期', value: formatDeadlineDate(detail.returnDeadline) },
    {
      key: 'sourceInboundNo',
      label: '来源采购入库单',
      value: buildDocumentLink(detail.sourceInboundNo, () => onOpenPage?.('purchase-inbound-detail', {
        row: relatedInbound || { inboundNo: detail.sourceInboundNo, id: detail.sourceInboundId },
      })),
    },
    { key: 'spacer', label: ' ', value: ' ', className: 'col-span-3' },
    { key: 'remark', label: '备注', value: detail.remark || EMPTY_PLACEHOLDER, className: 'col-span-3' },
  ];
}

const returnDetailConfig = {
  listPageId: 'purchase-return',
  editPageId: 'purchase-return-edit',
  lineSectionTitle: '商品明细',
  lineVariant: 'purchase-return',
  lineEditorOptions: purchaseReturnLineEditorOptions,
  getDetail: getReturnDetail,
  title: (detail) => `采购退货单详情${detail.returnNo ? ` · ${detail.returnNo}` : ''}`,
  getStatusBadges: (row) => getReturnStatusBadges(row),
  canEdit: (row) => canEditReturn(row),
  editLabel: '编辑',
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
      fields: ({ row }) => {
        if (row.businessStatus === 'closed') {
          return [
            { key: 'closeType', label: '关闭方式', value: row.closeType === 'manual' ? '手动关闭' : '到期自动关闭' },
            { key: 'closeReason', label: '关闭原因', value: row.closeReason },
            { key: 'closeTime', label: '关闭时间', value: row.closeTime },
            { key: 'closeOperator', label: '关闭操作人', value: row.closeOperator },
          ];
        }
        return [
          { key: 'cancelReason', label: '取消原因', value: row.cancelReason },
          { key: 'cancelTime', label: '取消时间', value: row.cancelTime },
          { key: 'cancelOperator', label: '取消操作人', value: row.cancelOperator },
        ];
      },
    },
    {
      title: '审核信息',
      fields: ({ row }) => [
        { key: 'auditor', label: '审核人', value: row.auditor },
        { key: 'auditTime', label: '审核时间', value: row.auditTime },
        { key: 'returnComment', label: '撤回意见', value: row.returnComment, className: 'col-span-4' },
      ],
    },
    {
      title: '操作信息',
      variant: 'meta-tabs',
      defaultTab: 'create',
      tabs: ({ row }) => [
        {
          key: 'create',
          label: '制单信息',
          fields: buildCreateMetaFields(row),
        },
        {
          key: 'log',
          label: '操作日志',
          variant: 'log',
          logEntries: () => buildPurchaseReturnOperationLogs(row),
        },
      ],
    },
  ],
  summary: { quantityLabel: '退货数量', amountLabel: '价税合计' },
  buildLineSummary: ({ detail, lineTotals, currency }) => {
    const prefix = `${currencySymbol(currency)} `;
    return {
      quantity: { label: '退货数量', value: detail.totalReturnQty ?? lineTotals.quantity },
      grossAmount: { label: '价税合计', value: lineTotals.grossAmount, format: 'amount', prefix, emphasis: true },
      taxAmount: { label: '税额', value: lineTotals.taxAmount, format: 'amount', prefix },
      netAmount: { label: '金额', value: lineTotals.netAmount, format: 'amount', prefix },
    };
  },
};

export function PurchaseReturnDetailPage({ onFeedback, onOpenPage, context }) {
  const row = useReturnRow(context);
  const [dialog, setDialog] = useState(null);

  function handleDialogComplete(result) {
    if (result?.message) onFeedback?.(result.message, result.type || 'success');
    if (result?.followUp === 'mock-notice' && result?.row) {
      setDialog({ type: 'mock-notice', row: loadReturnById(result.row.id) || result.row });
      return;
    }
    if (result?.deleted) {
      onOpenPage?.('purchase-return');
      setDialog(null);
      return;
    }
    if (result?.row) {
      onOpenPage?.('purchase-return-detail', { row: loadReturnById(result.row.id) || result.row });
    }
    setDialog(null);
  }

  const config = {
    ...returnDetailConfig,
    renderAfterLines: ({ row: currentRow, onOpenPage: openPage }) => (
      currentRow.auditStatus === 'approved'
        ? (
          <RelatedDocumentsCard
            sections={buildReturnRelatedDocumentSections(currentRow)}
            onOpenPage={openPage}
          />
        )
        : null
    ),
    renderHeaderActions: () => (
      <PurchaseReturnDetailHeaderActions
        row={row}
        onAction={(id, currentRow) => {
          if (id === 'notice') {
            onOpenPage?.('purchase-return-notice-create', { sourceReturnId: currentRow.id, row: currentRow });
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
      <PurchaseReturnActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={onFeedback}
      />
    </>
  );
}
