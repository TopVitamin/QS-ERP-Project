import { DocumentDetailPage } from '../components/erp/DocumentDetailPage.jsx';
import {
  buildOperationInfoTabs,
} from '../components/erp/DocumentMetaTabsCard.jsx';
import { buildInboundOperationLogs } from '../lib/operationLog.js';
import { useDocumentRow } from '../hooks/useDocumentRow.js';
import { INBOUND_STORAGE_KEY, loadInboundById } from '../lib/inboundLogic.js';
import { resolveOptionLabel } from '../lib/codeName.js';
import { formatSnapshotCodeName } from '../lib/documentNameSnapshots.js';
import { EMPTY_PLACEHOLDER, formatAmount } from '../lib/format.js';
import { currencySymbol } from '../lib/money.js';
import { currencyOptions, supplierOptions } from '../data/masterData.js';
import { getInventoryLogicalWarehouseOptions } from '../data/warehouseData.js';
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
    { key: 'supplier', label: '供应商', value: formatSnapshotCodeName(detail.supplier, detail.supplierNameSnapshot) },
    { key: 'warehouse', label: '入库仓库', value: formatSnapshotCodeName(detail.warehouse, detail.warehouseNameSnapshot) },
    { key: 'currency', label: '币别', value: resolveOptionLabel(detail.currency, currencyOptions) },
    // 渠道回传来源标识：电商仓经聚水潭／领星回传、自营仓直连回传时按回传写入；虚拟入库等不适用，展示 `-`
    // （《采购入库单前端Demo版PRD_详情页》§3.1、§4「来源标识」）。
    { key: 'sourceSystem', label: '来源系统', value: detail.sourceSystem || EMPTY_PLACEHOLDER },
    { key: 'sourceNo', label: '来源单号', value: detail.sourceNo || EMPTY_PLACEHOLDER },
    { key: 'executionId', label: '执行标识', value: detail.executionId || EMPTY_PLACEHOLDER },
    { key: 'amount', label: '价税合计', value: `${currencySymbol(row.currency)} ${formatAmount(row.amount ?? 0)}` },
    { key: 'taxAmount', label: '税额', value: `${currencySymbol(row.currency)} ${formatAmount(row.taxAmount ?? 0)}` },
    { key: 'netAmount', label: '金额', value: `${currencySymbol(row.currency)} ${formatAmount(row.netAmount ?? 0)}` },
    { key: 'businessDate', label: '业务日期', value: detail.businessDate || EMPTY_PLACEHOLDER },
    { key: 'actualInboundTime', label: '实际入库时间', value: detail.actualInboundTime || EMPTY_PLACEHOLDER },
    { key: 'pushTime', label: '推送财务ERP时间', value: detail.pushTime || EMPTY_PLACEHOLDER },
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
      tabs: ({ row }) => buildOperationInfoTabs({ row, buildLogs: buildInboundOperationLogs }),
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
  const row = useDocumentRow(context, { storageKey: INBOUND_STORAGE_KEY, loadById: loadInboundById });
  return <DocumentDetailPage context={{ row }} onOpenPage={onOpenPage} config={inboundDetailConfig} />;
}
