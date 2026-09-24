import { useEffect, useState } from 'react';
import { DocumentDetailPage } from '../components/erp/DocumentDetailPage.jsx';
import { customerOptions, currencyOptions, logicalWarehouseOptions } from '../data/masterData.js';
import { getSalesReturnInboundStatusBadges } from '../data/salesReturnInboundData.js';
import { salesReturnNotices } from '../data/salesReturnNoticeData.js';
import { salesReturns } from '../data/salesReturnData.js';
import { resolveOptionLabel } from '../lib/codeName.js';
import { EMPTY_PLACEHOLDER, formatAmount } from '../lib/format.js';
import { subscribeMockRows } from '../lib/mockStorage.js';
import { currencySymbol } from '../lib/money.js';
import {
  buildSalesReturnInboundOperationLogs,
  loadSalesReturnInboundById,
  normalizeSalesReturnInboundRow,
  RETURN_INBOUND_STORAGE_KEY,
  sourceTypeLabels,
} from '../lib/salesReturnInboundLogic.js';

/**
 * 销退入库单详情（F04）：整单只读，页头展示审核状态与推送财务ERP状态两枚标签；
 * 单据信息分区顺序见页面骨架；推送财务ERP失败原因展示，重推在系统集成中心。
 */

function useSalesReturnInboundRow(context) {
  const contextRow = context?.row;
  const [row, setRow] = useState(contextRow || null);

  useEffect(() => {
    if (!contextRow?.id) {
      setRow(contextRow || null);
      return undefined;
    }

    function syncRow() {
      setRow(loadSalesReturnInboundById(contextRow.id) || contextRow);
    }

    syncRow();
    return subscribeMockRows(RETURN_INBOUND_STORAGE_KEY, syncRow);
  }, [contextRow]);

  return row;
}

function getInboundDetail(row) {
  if (!row) return { lines: [] };
  return normalizeSalesReturnInboundRow(row);
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
  const relatedNotice = salesReturnNotices.find(
    (notice) => notice.id === row.sourceNoticeId || notice.noticeNo === row.sourceNoticeNo,
  );
  const relatedReturn = salesReturns.find(
    (item) => item.id === row.sourceReturnId || item.returnNo === row.sourceReturnNo,
  );

  const fields = [
    { key: 'inboundNo', label: '单号', value: detail.inboundNo },
    { key: 'sourceType', label: '来源类型', value: sourceTypeLabels[detail.sourceType] || detail.sourceType || EMPTY_PLACEHOLDER },
    {
      key: 'sourceNoticeNo',
      label: '来源销退收货通知单',
      value: buildDocumentLink(detail.sourceNoticeNo, () => onOpenPage?.('sales-return-notice-detail', {
        row: relatedNotice || { noticeNo: detail.sourceNoticeNo, id: detail.sourceNoticeId },
      })),
    },
    {
      key: 'sourceReturnNo',
      label: '来源销售退货单',
      value: buildDocumentLink(detail.sourceReturnNo, () => onOpenPage?.('sales-return-detail', {
        row: relatedReturn || { returnNo: detail.sourceReturnNo, id: detail.sourceReturnId },
      })),
    },
    { key: 'externalOrderNo', label: '外部原始订单', value: detail.externalOrderNo || EMPTY_PLACEHOLDER },
    { key: 'customer', label: '客户', value: resolveOptionLabel(detail.customer, customerOptions) },
    { key: 'currency', label: '币别', value: resolveOptionLabel(detail.currency, currencyOptions) },
    { key: 'warehouse', label: '收货仓库', value: resolveOptionLabel(detail.warehouse, logicalWarehouseOptions) },
    { key: 'businessDate', label: '业务日期', value: detail.businessDate || EMPTY_PLACEHOLDER },
    { key: 'actualReceiveTime', label: '实际收货时间', value: detail.actualReceiveTime || EMPTY_PLACEHOLDER },
    { key: 'amount', label: '价税合计', value: `${currencySymbol(detail.currency)} ${formatAmount(detail.amount ?? 0)}` },
    { key: 'taxAmount', label: '税额', value: `${currencySymbol(detail.currency)} ${formatAmount(detail.taxAmount ?? 0)}` },
    { key: 'netAmount', label: '金额', value: `${currencySymbol(detail.currency)} ${formatAmount(detail.netAmount ?? 0)}` },
    { key: 'pushTime', label: '推送财务ERP时间', value: detail.pushTime || EMPTY_PLACEHOLDER },
  ];

  if (row.pushFailReason) {
    fields.push({ key: 'pushFailReason', label: '推送失败原因', value: row.pushFailReason, className: 'col-span-3' });
  }

  fields.push({ key: 'remark', label: '备注', value: detail.remark || EMPTY_PLACEHOLDER, className: 'col-span-3' });
  return fields;
}

const inboundDetailConfig = {
  listPageId: 'sales-return-inbound',
  lineSectionTitle: '商品明细',
  lineVariant: 'sales-return-inbound',
  getDetail: getInboundDetail,
  title: (detail) => `销退入库单详情${detail.inboundNo ? ` · ${detail.inboundNo}` : ''}`,
  getStatusBadges: (row) => getSalesReturnInboundStatusBadges(row),
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
          fields: [
            { key: 'auditor', label: '审核人', value: row.auditor },
            { key: 'auditTime', label: '审核时间', value: row.auditTime },
            { key: 'creator', label: '创建人', value: row.creator || '系统' },
            { key: 'createdAt', label: '创建时间', value: row.createdAt },
            { key: 'updater', label: '最后更新人', value: row.updater || '系统' },
            { key: 'updatedAt', label: '最后更新时间', value: row.updatedAt },
          ],
        },
        {
          key: 'log',
          label: '操作日志',
          variant: 'log',
          logEntries: () => buildSalesReturnInboundOperationLogs(row),
        },
      ],
    },
  ],
  summary: { quantityLabel: '实际收货数量', amountLabel: '价税合计' },
  buildLineSummary: ({ detail, lineTotals, currency }) => {
    const prefix = `${currencySymbol(currency)} `;
    return {
      quantity: { label: '实际收货数量', value: detail.totalReceiveQty ?? lineTotals.quantity },
      grossAmount: { label: '价税合计', value: lineTotals.grossAmount, format: 'amount', prefix, emphasis: true },
      taxAmount: { label: '税额', value: lineTotals.taxAmount, format: 'amount', prefix },
      netAmount: { label: '金额', value: lineTotals.netAmount, format: 'amount', prefix },
    };
  },
};

export function SalesReturnInboundDetailPage({ onOpenPage, context }) {
  const row = useSalesReturnInboundRow(context);

  return <DocumentDetailPage context={{ row }} onOpenPage={onOpenPage} config={inboundDetailConfig} />;
}
