import { useState } from 'react';
import { DocumentDetailPage } from '../components/erp/DocumentDetailPage.jsx';
import {
  SalesOrderActionDialogs,
  SalesOrderDetailHeaderActions,
} from '../components/erp/SalesOrderActionDialogs.jsx';
import { buildCreateMetaFields } from '../components/erp/DocumentMetaTabsCard.jsx';
import { buildSalesOrderOperationLogs } from '../lib/operationLog.js';
import { RelatedDocumentsCard } from '../components/erp/RelatedDocumentsCard.jsx';
import { useSalesOrderRow } from '../hooks/useSalesOrderRow.js';
import { resolveAddressLabel } from '../lib/cnAddress.js';
import { resolveOptionLabel } from '../lib/codeName.js';
import { formatAmount } from '../lib/format.js';
import { currencySymbol } from '../lib/money.js';
import { formatShipMethod } from '../lib/salesDeliveryNoticeLogic.js';
import { buildSalesOrderRelatedDocumentSections } from '../lib/salesOrderRelatedDocs.js';
import { customerOptions, logicalWarehouseOptions, logisticsProductOptions } from '../data/masterData.js';
import { loadOrderById, refreshOrderLines } from '../lib/salesOrderLogic.js';
import { defaultSalesOrderForm, getEditableSalesOrder, getSalesOrderStatusBadges, salesLineEditorOptions } from '../data/salesFormData.js';

function getOrderDetail(row) {
  const source = getEditableSalesOrder(row);
  return {
    ...source,
    lines: refreshOrderLines(row?.lines?.length ? row.lines : defaultSalesOrderForm.lines),
  };
}

const orderDetailConfig = {
  listPageId: 'sales-order',
  editPageId: 'sales-order-edit',
  lineSectionTitle: '商品明细',
  lineVariant: 'sales-order',
  lineEditorOptions: salesLineEditorOptions,
  getDetail: getOrderDetail,
  title: (detail) => `销售订单详情${detail.orderNo && detail.orderNo !== '保存后自动生成' ? ` · ${detail.orderNo}` : ''}`,
  getStatusBadges: (row) => getSalesOrderStatusBadges(row),
  canEdit: (row) => row.auditStatus === 'draft' && row.businessStatus === 'normal',
  editLabel: '编辑',
  rowKey: (detail) => detail.orderNo,
  sections: [
    {
      title: '单据信息',
      fields: ({ detail, row }) => [
        { key: 'orderNo', label: '单号', value: detail.orderNo },
        { key: 'date', label: '单据日期', value: detail.date },
        { key: 'customer', label: '客户', value: resolveOptionLabel(detail.customer, customerOptions) },
        { key: 'currency', label: '币别', value: detail.currency || '人民币' },
        { key: 'amount', label: '价税合计', value: `${currencySymbol(row.currency)} ${formatAmount(row.amount)}` },
        { key: 'taxAmount', label: '税额', value: `${currencySymbol(row.currency)} ${formatAmount(row.taxAmount)}` },
        { key: 'netAmount', label: '金额', value: `${currencySymbol(row.currency)} ${formatAmount(row.netAmount)}` },
        { key: 'spacer', label: ' ', value: ' ' },
        { key: 'remark', label: '备注', value: detail.remark, className: 'col-span-3' },
      ],
    },
    {
      title: '发货与交期',
      fields: ({ detail }) => {
        const fields = [
          { key: 'warehouse', label: '发货仓库', value: resolveOptionLabel(detail.warehouse, logicalWarehouseOptions) },
          { key: 'deliveryDate', label: '交期', value: detail.deliveryDate },
          { key: 'shipMethod', label: '发货方式', value: formatShipMethod(detail.shipMethod || 'logistics') },
        ];
        if ((detail.shipMethod || 'logistics') === 'logistics') {
          fields.push(
            { key: 'logisticsProduct', label: '物流服务产品', value: resolveOptionLabel(detail.logisticsProduct, logisticsProductOptions) },
            { key: 'deliveryAddress', label: '发货地址', value: resolveAddressLabel(detail.deliveryAddress), className: 'col-span-2' },
          );
        }
        return fields;
      },
    },
  ],
  extraSections: [
    {
      title: '终止信息',
      visibleWhen: ({ row }) => row.businessStatus === 'closed' || row.businessStatus === 'cancelled',
      fields: ({ row }) => {
        if (row.businessStatus === 'closed') {
          return [
            { key: 'closeType', label: '关闭方式', value: row.closeType === 'manual' ? '手动关闭' : '自动关单' },
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
          logEntries: () => buildSalesOrderOperationLogs(row),
        },
      ],
    },
  ],
  summary: { quantityLabel: '销售数量', amountLabel: '价税合计' },
  buildLineSummary: ({ lineTotals, currency }) => {
    const prefix = `${currencySymbol(currency)} `;
    return {
      quantity: { label: '销售数量', value: lineTotals.quantity },
      grossAmount: { label: '价税合计', value: lineTotals.grossAmount, format: 'amount', prefix, emphasis: true },
      taxAmount: { label: '税额', value: lineTotals.taxAmount, format: 'amount', prefix },
      netAmount: { label: '金额', value: lineTotals.netAmount, format: 'amount', prefix },
    };
  },
};

export function SalesOrderDetailPage({ onFeedback, onOpenPage, context }) {
  const row = useSalesOrderRow(context);
  const [dialog, setDialog] = useState(null);

  function handleDialogComplete(result) {
    if (result?.message) onFeedback?.(result.message, result.type || 'success');
    if (result?.followUp === 'mock-notice' && result?.row) {
      setDialog({ type: 'mock-notice', row: result.row });
      onOpenPage?.('sales-order-detail', { row: loadOrderById(result.row.id) || result.row });
      return;
    }
    if (result?.deleted) {
      onOpenPage?.('sales-order');
      setDialog(null);
      return;
    }
    if (result?.row) {
      onOpenPage?.('sales-order-detail', { row: loadOrderById(result.row.id) || result.row });
    }
    setDialog(null);
  }

  const config = {
    ...orderDetailConfig,
    renderAfterLines: ({ row, onOpenPage }) => (
      row.auditStatus === 'approved'
        ? (
          <RelatedDocumentsCard
            sections={buildSalesOrderRelatedDocumentSections(row)}
            onOpenPage={onOpenPage}
          />
        )
        : null
    ),
    renderHeaderActions: () => (
      <SalesOrderDetailHeaderActions
        row={row}
        onAction={(id, currentRow) => {
          if (id === 'notice') {
            onOpenPage?.('sales-delivery-notice-create', { sourceOrderId: currentRow.id, row: currentRow });
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
      <SalesOrderActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
      />
    </>
  );
}
