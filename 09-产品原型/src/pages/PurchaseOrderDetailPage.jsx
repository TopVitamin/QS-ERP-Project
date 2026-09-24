import { useState } from 'react';
import { DocumentDetailPage } from '../components/erp/DocumentDetailPage.jsx';
import {
  PurchaseOrderActionDialogs,
  PurchaseOrderDetailHeaderActions,
} from '../components/erp/PurchaseOrderActionDialogs.jsx';
import { buildCreateMetaFields } from '../components/erp/DocumentMetaTabsCard.jsx';
import { buildPurchaseOrderOperationLogs } from '../lib/operationLog.js';
import { RelatedDocumentsCard } from '../components/erp/RelatedDocumentsCard.jsx';
import { usePurchaseOrderRow } from '../hooks/usePurchaseOrderRow.js';
import { resolveOptionLabel } from '../lib/codeName.js';
import { formatSnapshotCodeName } from '../lib/documentNameSnapshots.js';
import { formatAmount } from '../lib/format.js';
import { currencySymbol } from '../lib/money.js';
import { buildOrderRelatedDocumentSections } from '../lib/purchaseOrderRelatedDocs.js';
import { supplierOptions } from '../data/masterData.js';
import { getInventoryLogicalWarehouseOptions } from '../data/warehouseData.js';
import { loadOrderById, refreshOrderLines } from '../lib/purchaseOrderLogic.js';
import { defaultOrderForm, getEditableOrder, getOrderStatusBadges, purchaseLineEditorOptions } from '../data/purchaseFormData.js';

function getOrderDetail(row) {
  const source = getEditableOrder(row);
  return {
    ...source,
    lines: refreshOrderLines(row?.lines?.length ? row.lines : defaultOrderForm.lines),
  };
}

const orderDetailConfig = {
  listPageId: 'purchase-order',
  editPageId: 'purchase-order-edit',
  lineSectionTitle: '商品明细',
  lineVariant: 'order',
  lineEditorOptions: purchaseLineEditorOptions,
  getDetail: getOrderDetail,
  title: (detail) => `采购订单详情${detail.orderNo && detail.orderNo !== '保存后自动生成' ? ` · ${detail.orderNo}` : ''}`,
  getStatusBadges: (row) => getOrderStatusBadges(row),
  canEdit: (row) => row.auditStatus === 'draft' && row.businessStatus === 'normal',
  editLabel: '编辑',
  rowKey: (detail) => detail.orderNo,
  sections: [
    {
      title: '单据信息',
      fields: ({ detail, row }) => [
        { key: 'orderNo', label: '单号', value: detail.orderNo },
        { key: 'supplier', label: '供应商', value: formatSnapshotCodeName(detail.supplier, detail.supplierNameSnapshot) },
        { key: 'currency', label: '币别', value: detail.currency || '人民币' },
        { key: 'amount', label: '价税合计', value: `${currencySymbol(row.currency)} ${formatAmount(row.amount)}` },
        { key: 'taxAmount', label: '税额', value: `${currencySymbol(row.currency)} ${formatAmount(row.taxAmount)}` },
        { key: 'netAmount', label: '金额', value: `${currencySymbol(row.currency)} ${formatAmount(row.netAmount)}` },
        { key: 'spacer', label: ' ', value: ' ' },
        { key: 'remark', label: '备注', value: detail.remark, className: 'col-span-3' },
      ],
    },
    {
      title: '收货与交期',
      fields: ({ detail }) => [
        { key: 'warehouse', label: '收货仓库', value: formatSnapshotCodeName(detail.warehouse, detail.warehouseNameSnapshot) },
        { key: 'deliveryDate', label: '承诺交期', value: detail.deliveryDate },
      ],
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
          logEntries: () => buildPurchaseOrderOperationLogs(row),
        },
      ],
    },
  ],
  summary: { quantityLabel: '采购数量', amountLabel: '价税合计' },
  buildLineSummary: ({ lineTotals, currency }) => {
    const prefix = `${currencySymbol(currency)} `;
    return {
      quantity: { label: '采购数量', value: lineTotals.quantity },
      grossAmount: { label: '价税合计', value: lineTotals.grossAmount, format: 'amount', prefix, emphasis: true },
      taxAmount: { label: '税额', value: lineTotals.taxAmount, format: 'amount', prefix },
      netAmount: { label: '金额', value: lineTotals.netAmount, format: 'amount', prefix },
    };
  },
};

export function PurchaseOrderDetailPage({ onFeedback, onOpenPage, context }) {
  const row = usePurchaseOrderRow(context);
  const [dialog, setDialog] = useState(null);

  function handleDialogComplete(result) {
    if (result?.message) onFeedback?.(result.message, result.type || 'success');
    if (result?.followUp === 'mock-notice' && result?.row) {
      setDialog({ type: 'mock-notice', row: result.row });
      onOpenPage?.('purchase-order-detail', { row: loadOrderById(result.row.id) || result.row });
      return;
    }
    if (result?.deleted) {
      onOpenPage?.('purchase-order');
      setDialog(null);
      return;
    }
    if (result?.row) {
      onOpenPage?.('purchase-order-detail', { row: loadOrderById(result.row.id) || result.row });
    }
    setDialog(null);
  }

  const config = {
    ...orderDetailConfig,
    renderAfterLines: ({ row, onOpenPage }) => (
      row.auditStatus === 'approved'
        ? (
          <RelatedDocumentsCard
            sections={buildOrderRelatedDocumentSections(row)}
            onOpenPage={onOpenPage}
          />
        )
        : null
    ),
    renderHeaderActions: () => (
      <PurchaseOrderDetailHeaderActions
        row={row}
        onAction={(id, currentRow) => {
          if (id === 'notice') {
            onOpenPage?.('purchase-receipt-notice-create', { sourceOrderId: currentRow.id, row: currentRow });
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
      <PurchaseOrderActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
      />
    </>
  );
}
