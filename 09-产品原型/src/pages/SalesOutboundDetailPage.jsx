import { DocumentDetailPage } from '../components/erp/DocumentDetailPage.jsx';
import { buildOperationInfoTabs } from '../components/erp/DocumentMetaTabsCard.jsx';
import { buildSalesOutboundOperationLogs } from '../lib/operationLog.js';
import { useDocumentRow } from '../hooks/useDocumentRow.js';
import { SALES_OUTBOUND_STORAGE_KEY, loadOutboundById } from '../lib/salesOutboundLogic.js';
import { resolveOptionLabel } from '../lib/codeName.js';
import { formatSnapshotCodeName } from '../lib/documentNameSnapshots.js';
import { EMPTY_PLACEHOLDER, formatAmount } from '../lib/format.js';
import { currencySymbol } from '../lib/money.js';
import { currencyOptions } from '../data/masterData.js';
import { getSalesOutboundStatusBadges } from '../data/salesOutboundData.js';
import { salesOrders } from '../data/salesOrderData.js';
import { salesDeliveryNotices } from '../data/salesDeliveryNoticeData.js';
import { loadDomesticOrderByNo } from '../data/domesticOrderData.js';
import { loadCrossBorderOrderByNo } from '../data/crossBorderOrderData.js';
import { shopifyOrders } from '../data/shopifyOrderData.js';
import { refreshOutboundLines, sourceTypeLabels } from '../lib/salesOutboundLogic.js';
import { loadOrderById } from '../lib/salesOrderLogic.js';
import { loadNoticeById } from '../lib/salesDeliveryNoticeLogic.js';
import { loadShopifyOrderByNo } from '../lib/shopifyOrderLogic.js';

function getOutboundDetail(row) {
  if (!row) return { lines: [] };
  return {
    ...row,
    lines: refreshOutboundLines(row.lines || []),
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

function buildOutboundInfoFields({ detail, row, onOpenPage }) {
  const relatedNotice = loadNoticeById(row.sourceNoticeId)
    || salesDeliveryNotices.find((notice) => notice.noticeNo === row.sourceNoticeNo);
  const relatedOrder = loadOrderById(row.sourceOrderId)
    || salesOrders.find((order) => order.orderNo === row.sourceOrderNo);

  // 二版「分两张」：国内电商、跨境电商来源分别关联对应订单对象，可跳转订单详情（B5）
  const relatedDomesticOrder = detail.sourceDomesticOrderNo ? loadDomesticOrderByNo(detail.sourceDomesticOrderNo) : null;
  const relatedCrossBorderOrder = detail.sourceCrossborderOrderNo ? loadCrossBorderOrderByNo(detail.sourceCrossborderOrderNo) : null;
  // 独立站来源：按来源销售订单号（XSDD）定位独立站订单，可跳转订单详情（B5）
  const relatedShopifyOrder = detail.sourceType === 'shopify' && detail.sourceOrderNo
    ? loadShopifyOrderByNo(detail.sourceOrderNo, shopifyOrders)
    : null;

  const fields = [
    { key: 'outboundNo', label: '单号', value: detail.outboundNo },
    { key: 'sourceType', label: '来源类型', value: sourceTypeLabels[detail.sourceType] || detail.sourceType },
    {
      key: 'sourceNoticeNo',
      label: '来源销售发货通知单',
      value: detail.sourceType === 'b2b_notice' ? buildDocumentLink(detail.sourceNoticeNo, () => onOpenPage?.('sales-delivery-notice-detail', {
        row: relatedNotice || { noticeNo: detail.sourceNoticeNo, id: detail.sourceNoticeId },
      })) : EMPTY_PLACEHOLDER,
    },
    {
      key: 'sourceOrderNo',
      label: '来源销售订单',
      value: detail.sourceType === 'b2b_notice'
        ? buildDocumentLink(detail.sourceOrderNo, () => onOpenPage?.('sales-order-detail', {
          row: relatedOrder || { orderNo: detail.sourceOrderNo, id: detail.sourceOrderId },
        }))
        : detail.sourceType === 'shopify'
          ? (relatedShopifyOrder
            ? buildDocumentLink(detail.sourceOrderNo, () => onOpenPage?.('sales-shopify-order-detail', { row: relatedShopifyOrder }))
            : (detail.sourceOrderNo || EMPTY_PLACEHOLDER))
          : (detail.sourceOrderNo || EMPTY_PLACEHOLDER),
    },
    { key: 'customer', label: '客户', value: formatSnapshotCodeName(detail.customer, detail.customerNameSnapshot) },
    { key: 'warehouse', label: '出库仓库', value: formatSnapshotCodeName(detail.warehouse, detail.warehouseNameSnapshot) },
    {
      key: 'sourceDomesticOrderNo',
      label: '来源国内电商订单',
      value: detail.sourceDomesticOrderNo
        ? (relatedDomesticOrder
          ? buildDocumentLink(detail.sourceDomesticOrderNo, () => onOpenPage?.('sales-domestic-order-detail', { row: relatedDomesticOrder }))
          : detail.sourceDomesticOrderNo)
        : EMPTY_PLACEHOLDER,
    },
    {
      key: 'sourceCrossborderOrderNo',
      label: '来源跨境电商订单',
      value: detail.sourceCrossborderOrderNo
        ? (relatedCrossBorderOrder
          ? buildDocumentLink(detail.sourceCrossborderOrderNo, () => onOpenPage?.('sales-crossborder-order-detail', { row: relatedCrossBorderOrder }))
          : detail.sourceCrossborderOrderNo)
        : EMPTY_PLACEHOLDER,
    },
    { key: 'currency', label: '币别', value: resolveOptionLabel(detail.currency, currencyOptions) },
    { key: 'amount', label: '价税合计', value: `${currencySymbol(row.currency)} ${formatAmount(row.amount ?? 0)}` },
    { key: 'taxAmount', label: '税额', value: `${currencySymbol(row.currency)} ${formatAmount(row.taxAmount ?? 0)}` },
    { key: 'netAmount', label: '金额', value: `${currencySymbol(row.currency)} ${formatAmount(row.netAmount ?? 0)}` },
    { key: 'businessDate', label: '业务日期', value: detail.businessDate || EMPTY_PLACEHOLDER },
    { key: 'actualOutboundTime', label: '实际出库时间', value: detail.actualOutboundTime || EMPTY_PLACEHOLDER },
    { key: 'pushTime', label: '推送财务ERP时间', value: detail.pushTime || EMPTY_PLACEHOLDER },
  ];

  if (row.pushFailReason) {
    fields.push({ key: 'pushFailReason', label: '推送失败原因', value: row.pushFailReason, className: 'col-span-3' });
  }

  fields.push({ key: 'remark', label: '备注', value: detail.remark || EMPTY_PLACEHOLDER, className: 'col-span-3' });
  return fields;
}

const outboundDetailConfig = {
  listPageId: 'sales-outbound',
  lineSectionTitle: '商品明细',
  lineVariant: 'sales-outbound',
  getDetail: getOutboundDetail,
  title: (detail) => `销售出库单详情${detail.outboundNo ? ` · ${detail.outboundNo}` : ''}`,
  getStatusBadges: (row) => getSalesOutboundStatusBadges(row),
  rowKey: (detail) => detail.outboundNo,
  sections: [
    {
      title: '单据信息',
      fields: ({ detail, row, onOpenPage }) => buildOutboundInfoFields({ detail, row, onOpenPage }),
    },
  ],
  extraSections: [
    {
      title: '操作信息',
      variant: 'meta-tabs',
      defaultTab: 'create',
      tabs: ({ row }) => buildOperationInfoTabs({
        row,
        buildLogs: buildSalesOutboundOperationLogs,
        toMetaRow: (metaRow) => ({ ...metaRow, creator: metaRow.creator || '系统', updater: metaRow.updater || '系统' }),
      }),
    },
  ],
  summary: { quantityLabel: '实际出库数量', amountLabel: '价税合计' },
  buildLineSummary: ({ detail, lineTotals, currency }) => {
    const prefix = `${currencySymbol(currency)} `;
    return {
      quantity: { label: '实际出库数量', value: detail.totalOutboundQty ?? lineTotals.quantity },
      grossAmount: { label: '价税合计', value: lineTotals.grossAmount, format: 'amount', prefix, emphasis: true },
      taxAmount: { label: '税额', value: lineTotals.taxAmount, format: 'amount', prefix },
      netAmount: { label: '金额', value: lineTotals.netAmount, format: 'amount', prefix },
    };
  },
};

export function SalesOutboundDetailPage({ onOpenPage, context }) {
  const row = useDocumentRow(context, { storageKey: SALES_OUTBOUND_STORAGE_KEY, loadById: loadOutboundById });
  const config = outboundDetailConfig;

  return <DocumentDetailPage context={{ row }} onOpenPage={onOpenPage} config={config} />;
}
