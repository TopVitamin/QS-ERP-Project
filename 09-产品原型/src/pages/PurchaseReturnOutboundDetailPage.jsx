import { useEffect, useState } from 'react';
import { DocumentDetailPage } from '../components/erp/DocumentDetailPage.jsx';
import { buildCreateMetaFields } from '../components/erp/DocumentMetaTabsCard.jsx';
import { resolveOptionLabel } from '../lib/codeName.js';
import { EMPTY_PLACEHOLDER, formatAmount } from '../lib/format.js';
import { currencySymbol } from '../lib/money.js';
import { subscribeMockRows } from '../lib/mockStorage.js';
import { currencyOptions, logicalWarehouseOptions, supplierOptions } from '../data/masterData.js';
import { getReturnOutboundStatusBadges } from '../data/purchaseReturnOutboundData.js';
import { purchaseReturnNotices } from '../data/purchaseReturnNoticeData.js';
import { purchaseReturns } from '../data/purchaseReturnData.js';
import { loadReturnNoticeById } from '../lib/purchaseReturnNoticeLogic.js';
import { loadReturnById } from '../lib/purchaseReturnLogic.js';
import {
  buildReturnOutboundOperationLogs,
  loadReturnOutboundById,
  refreshReturnOutboundLines,
  RETURN_OUTBOUND_STORAGE_KEY,
} from '../lib/purchaseReturnOutboundLogic.js';

/**
 * 采退出库单详情（F04）：整单只读，页头仅返回列表；金蝶推送失败原因展示，重推在系统集成中心。
 */

function useReturnOutboundRow(context) {
  const contextRow = context?.row;
  const [row, setRow] = useState(contextRow || null);

  useEffect(() => {
    if (!contextRow?.id) {
      setRow(contextRow || null);
      return undefined;
    }

    function syncRow() {
      setRow(loadReturnOutboundById(contextRow.id) || contextRow);
    }

    syncRow();
    return subscribeMockRows(RETURN_OUTBOUND_STORAGE_KEY, syncRow);
  }, [contextRow]);

  return row;
}

function getOutboundDetail(row) {
  if (!row) return { lines: [] };
  return {
    ...row,
    lines: refreshReturnOutboundLines(row.lines || []),
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
  const relatedNotice = loadReturnNoticeById(row.sourceNoticeId)
    || purchaseReturnNotices.find((notice) => notice.noticeNo === row.sourceNoticeNo);
  const relatedReturn = loadReturnById(row.sourceReturnId)
    || purchaseReturns.find((item) => item.returnNo === row.sourceReturnNo);

  const fields = [
    { key: 'outboundNo', label: '单号', value: detail.outboundNo },
    {
      key: 'sourceNoticeNo',
      label: '来源采退发货通知单',
      value: buildDocumentLink(detail.sourceNoticeNo, () => onOpenPage?.('purchase-return-notice-detail', {
        row: relatedNotice || { noticeNo: detail.sourceNoticeNo, id: detail.sourceNoticeId },
      })),
    },
    {
      key: 'sourceReturnNo',
      label: '来源采购退货单',
      value: buildDocumentLink(detail.sourceReturnNo, () => onOpenPage?.('purchase-return-detail', {
        row: relatedReturn || { returnNo: detail.sourceReturnNo, id: detail.sourceReturnId },
      })),
    },
    { key: 'supplier', label: '供应商', value: resolveOptionLabel(detail.supplier, supplierOptions) },
    { key: 'warehouse', label: '出库仓库', value: resolveOptionLabel(detail.warehouse, logicalWarehouseOptions) },
    { key: 'currency', label: '币别', value: resolveOptionLabel(detail.currency, currencyOptions) },
    { key: 'amount', label: '价税合计', value: `${currencySymbol(row.currency)} ${formatAmount(row.amount ?? 0)}` },
    { key: 'taxAmount', label: '税额', value: `${currencySymbol(row.currency)} ${formatAmount(row.taxAmount ?? 0)}` },
    { key: 'netAmount', label: '金额', value: `${currencySymbol(row.currency)} ${formatAmount(row.netAmount ?? 0)}` },
    { key: 'businessDate', label: '业务日期', value: detail.businessDate || EMPTY_PLACEHOLDER },
    { key: 'actualOutboundTime', label: '实际出库时间', value: detail.actualOutboundTime || EMPTY_PLACEHOLDER },
    { key: 'pushTime', label: '推送金蝶时间', value: detail.pushTime || EMPTY_PLACEHOLDER },
  ];

  if (row.pushFailReason) {
    fields.push({ key: 'pushFailReason', label: '推送失败原因', value: row.pushFailReason, className: 'col-span-3' });
  }
  fields.push({ key: 'remark', label: '备注', value: detail.remark || EMPTY_PLACEHOLDER, className: 'col-span-3' });
  return fields;
}

const outboundDetailConfig = {
  listPageId: 'purchase-return-outbound',
  lineSectionTitle: '商品明细',
  lineVariant: 'purchase-return-outbound',
  getDetail: getOutboundDetail,
  title: (detail) => `采退出库单详情${detail.outboundNo ? ` · ${detail.outboundNo}` : ''}`,
  getStatusBadges: (row) => getReturnOutboundStatusBadges(row),
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
          fields: [
            { key: 'auditor', label: '审核人', value: row.auditor },
            { key: 'auditTime', label: '审核时间', value: row.auditTime },
            ...buildCreateMetaFields(row),
          ],
        },
        {
          key: 'log',
          label: '操作日志',
          variant: 'log',
          logEntries: () => buildReturnOutboundOperationLogs(row),
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

export function PurchaseReturnOutboundDetailPage({ onOpenPage, context }) {
  const row = useReturnOutboundRow(context);
  return <DocumentDetailPage context={{ row }} onOpenPage={onOpenPage} config={outboundDetailConfig} />;
}
