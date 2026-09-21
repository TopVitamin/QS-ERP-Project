import { DocumentDetailPage } from '../components/erp/DocumentDetailPage.jsx';
import { buildCreateMetaFields } from '../components/erp/DocumentMetaTabsCard.jsx';
import { buildInboundOperationLogs } from '../lib/operationLog.js';
import { usePurchaseInboundRow } from '../hooks/usePurchaseInboundRow.js';
import { resolveOptionLabel } from '../lib/codeName.js';
import { EMPTY_PLACEHOLDER, formatAmount } from '../lib/format.js';
import { currencySymbol } from '../lib/money.js';
import { currencyOptions, supplierOptions, warehouseOptions } from '../data/masterData.js';
import { getInboundStatusBadges } from '../data/inboundData.js';
import { orders } from '../data/orderData.js';
import { receiptNotices } from '../data/receiptNoticeData.js';
import { refreshInboundLines } from '../lib/inboundLogic.js';
import { loadOrderById } from '../lib/purchaseOrderLogic.js';
import { loadNoticeById } from '../lib/receiptNoticeLogic.js';

function getInboundDetail(row) {
  if (!row) return { lines: [] };
  return {
    ...row,
    lines: refreshInboundLines(row.lines || []),
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

function buildInboundInfoFields({ detail, row, onOpenPage }) {
  const relatedNotice = loadNoticeById(row.sourceNoticeId)
    || receiptNotices.find((notice) => notice.noticeNo === row.sourceNoticeNo);
  const relatedOrder = loadOrderById(row.sourceOrderId)
    || orders.find((order) => order.orderNo === row.sourceOrderNo);

  const fields = [
    { key: 'inboundNo', label: '单号', value: detail.inboundNo },
    {
      key: 'sourceNoticeNo',
      label: '来源采购收货通知单',
      value: buildDocumentLink(detail.sourceNoticeNo, () => onOpenPage?.('purchase-receipt-notice-detail', {
        row: relatedNotice || { noticeNo: detail.sourceNoticeNo, id: detail.sourceNoticeId },
      })),
    },
    {
      key: 'sourceOrderNo',
      label: '来源采购订单',
      value: buildDocumentLink(detail.sourceOrderNo, () => onOpenPage?.('purchase-order-detail', {
        row: relatedOrder || { orderNo: detail.sourceOrderNo, id: detail.sourceOrderId },
      })),
    },
    { key: 'supplier', label: '供应商', value: resolveOptionLabel(detail.supplier, supplierOptions) },
    { key: 'warehouse', label: '入库仓库', value: resolveOptionLabel(detail.warehouse, warehouseOptions) },
    { key: 'currency', label: '币别', value: resolveOptionLabel(detail.currency, currencyOptions) },
    { key: 'amount', label: '价税合计', value: `${currencySymbol(row.currency)} ${formatAmount(row.amount ?? 0)}` },
    { key: 'taxAmount', label: '税额', value: `${currencySymbol(row.currency)} ${formatAmount(row.taxAmount ?? 0)}` },
    { key: 'netAmount', label: '金额', value: `${currencySymbol(row.currency)} ${formatAmount(row.netAmount ?? 0)}` },
    { key: 'businessDate', label: '业务日期', value: detail.businessDate || EMPTY_PLACEHOLDER },
    { key: 'actualInboundTime', label: '实际入库时间', value: detail.actualInboundTime || EMPTY_PLACEHOLDER },
    { key: 'pushTime', label: '推送时间', value: detail.pushTime || EMPTY_PLACEHOLDER },
  ];

  if (row.pushFailReason) {
    fields.push({ key: 'pushFailReason', label: '推送失败原因', value: row.pushFailReason, className: 'col-span-3' });
  }

  fields.push({ key: 'remark', label: '备注', value: detail.remark || EMPTY_PLACEHOLDER, className: 'col-span-3' });
  return fields;
}

const inboundDetailConfig = {
  listPageId: 'purchase-inbound',
  lineSectionTitle: '商品明细',
  lineVariant: 'purchase-inbound',
  getDetail: getInboundDetail,
  title: (detail) => `采购入库单详情${detail.inboundNo ? ` · ${detail.inboundNo}` : ''}`,
  getStatusBadges: (row) => getInboundStatusBadges(row),
  rowKey: (detail) => detail.inboundNo,
  sections: [
    {
      title: '单据信息',
      fields: ({ detail, row, onOpenPage }) => buildInboundInfoFields({ detail, row, onOpenPage }),
    },
  ],
  extraSections: [
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
          logEntries: () => buildInboundOperationLogs(row),
        },
      ],
    },
  ],
  summary: { quantityLabel: '实际入库数量', amountLabel: '价税合计' },
  buildLineSummary: ({ detail, lineTotals, currency }) => {
    const prefix = `${currencySymbol(currency)} `;
    return {
      quantity: { label: '实际入库数量', value: detail.totalInboundQty ?? lineTotals.quantity },
      grossAmount: { label: '价税合计', value: lineTotals.grossAmount, format: 'amount', prefix, emphasis: true },
      taxAmount: { label: '税额', value: lineTotals.taxAmount, format: 'amount', prefix },
      netAmount: { label: '金额', value: lineTotals.netAmount, format: 'amount', prefix },
    };
  },
};

export function PurchaseInboundDetailPage({ onOpenPage, context }) {
  const row = usePurchaseInboundRow(context);
  return <DocumentDetailPage context={{ row }} onOpenPage={onOpenPage} config={inboundDetailConfig} />;
}
