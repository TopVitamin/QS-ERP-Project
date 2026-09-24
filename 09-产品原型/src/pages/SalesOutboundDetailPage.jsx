import { DocumentDetailPage } from '../components/erp/DocumentDetailPage.jsx';
import { buildCreateMetaFields } from '../components/erp/DocumentMetaTabsCard.jsx';
import { buildSalesOutboundOperationLogs } from '../lib/operationLog.js';
import { useSalesOutboundRow } from '../hooks/useSalesOutboundRow.js';
import { resolveOptionLabel } from '../lib/codeName.js';
import { formatSnapshotCodeName } from '../lib/documentNameSnapshots.js';
import { EMPTY_PLACEHOLDER, formatAmount } from '../lib/format.js';
import { currencySymbol } from '../lib/money.js';
import { customerOptions } from '../data/masterData.js';
import { getInventoryLogicalWarehouseOptions } from '../data/warehouseData.js';
import { getSalesOutboundStatusBadges } from '../data/salesOutboundData.js';
import { salesOrders } from '../data/salesOrderData.js';
import { salesDeliveryNotices } from '../data/salesDeliveryNoticeData.js';
import { refreshOutboundLines, sourceTypeLabels } from '../lib/salesOutboundLogic.js';
import { loadOrderById } from '../lib/salesOrderLogic.js';
import { loadNoticeById } from '../lib/salesDeliveryNoticeLogic.js';

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
      value: detail.sourceType === 'b2b_notice' ? buildDocumentLink(detail.sourceOrderNo, () => onOpenPage?.('sales-order-detail', {
        row: relatedOrder || { orderNo: detail.sourceOrderNo, id: detail.sourceOrderId },
      })) : detail.sourceOrderNo || EMPTY_PLACEHOLDER,
    },
    { key: 'customer', label: '客户', value: formatSnapshotCodeName(detail.customer, detail.customerNameSnapshot) },
    { key: 'warehouse', label: '出库仓库', value: formatSnapshotCodeName(detail.warehouse, detail.warehouseNameSnapshot) },
    { key: 'amount', label: '价税合计', value: `${currencySymbol(row.currency)} ${formatAmount(row.amount ?? 0)}` },
    { key: 'taxAmount', label: '税额', value: `${currencySymbol(row.currency)} ${formatAmount(row.taxAmount ?? 0)}` },
    { key: 'netAmount', label: '金额', value: `${currencySymbol(row.currency)} ${formatAmount(row.netAmount ?? 0)}` },
    { key: 'businessDate', label: '业务日期', value: detail.businessDate || EMPTY_PLACEHOLDER },
    { key: 'actualOutboundTime', label: '实际出库时间', value: detail.actualOutboundTime || EMPTY_PLACEHOLDER },
    { key: 'pushTime', label: '推送财务ERP时间', value: detail.pushTime || EMPTY_PLACEHOLDER },
  ];

  if (detail.sourceType === 'external_toc') {
    fields.splice(4, 0, {
      key: 'externalOrderNo',
      label: '外部原始订单',
      value: detail.externalOrderNo || EMPTY_PLACEHOLDER,
    });
  }

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
      tabs: ({ row }) => [
        {
          key: 'create',
          label: '制单信息',
          fields: buildCreateMetaFields({ ...row, creator: row.creator || '系统', updater: row.updater || '系统' }),
        },
        {
          key: 'log',
          label: '操作日志',
          variant: 'log',
          logEntries: () => buildSalesOutboundOperationLogs(row),
        },
      ],
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
  const row = useSalesOutboundRow(context);
  const config = outboundDetailConfig;

  return <DocumentDetailPage context={{ row }} onOpenPage={onOpenPage} config={config} />;
}
