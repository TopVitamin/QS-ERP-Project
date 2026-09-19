import { useState } from 'react';
import { DocumentDetailPage } from '../components/erp/DocumentDetailPage.jsx';
import { buildCreateMetaFields } from '../components/erp/DocumentMetaTabsCard.jsx';
import { RelatedDocumentsCard } from '../components/erp/RelatedDocumentsCard.jsx';
import { buildReceiptNoticeOperationLogs } from '../lib/operationLog.js';
import { buildNoticeRelatedDocumentSections } from '../lib/receiptNoticeRelatedDocs.js';
import {
  PurchaseReceiptNoticeActionDialogs,
  PurchaseReceiptNoticeDetailHeaderActions,
} from '../components/erp/PurchaseReceiptNoticeActionDialogs.jsx';
import { usePurchaseReceiptNoticeRow } from '../hooks/usePurchaseReceiptNoticeRow.js';
import { resolveOptionLabel } from '../lib/codeName.js';
import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import { supplierOptions, warehouseOptions } from '../data/masterData.js';
import { getNoticeStatusBadges } from '../data/receiptNoticeData.js';
import { loadNoticeById, refreshNoticeLines } from '../lib/receiptNoticeLogic.js';
import { orders } from '../data/orderData.js';
import { loadOrderById } from '../lib/purchaseOrderLogic.js';

function getNoticeDetail(row) {
  if (!row) return { lines: [] };
  return {
    ...row,
    lines: refreshNoticeLines(row.lines || []),
  };
}

function buildSourceOrderLink(detail, onOpenPage) {
  if (!detail?.sourceOrderNo) return EMPTY_PLACEHOLDER;
  const relatedOrder = loadOrderById(detail.sourceOrderId)
    || orders.find((order) => order.orderNo === detail.sourceOrderNo);
  return (
    <button
      type="button"
      className="truncate text-erp-primary hover:underline"
      onClick={() => onOpenPage?.('purchase-order-detail', { row: relatedOrder || { orderNo: detail.sourceOrderNo, id: detail.sourceOrderId } })}
    >
      {detail.sourceOrderNo}
    </button>
  );
}

function buildNoticeInfoFields({ detail, row, onOpenPage }) {
  const fields = [
    { key: 'noticeNo', label: '单号', value: detail.noticeNo },
    { key: 'sourceOrderNo', label: '来源采购订单', value: buildSourceOrderLink(detail, onOpenPage) },
    { key: 'supplier', label: '供应商', value: resolveOptionLabel(detail.supplier, supplierOptions) },
    { key: 'warehouse', label: '收货仓库', value: resolveOptionLabel(detail.warehouse, warehouseOptions) },
    { key: 'pushTime', label: '推送时间', value: row.pushTime || EMPTY_PLACEHOLDER },
    { key: 'finalReceiveTime', label: '最终收货确认时间', value: row.finalReceiveTime || EMPTY_PLACEHOLDER },
  ];
  if (row.pushFailReason) {
    fields.push({ key: 'pushFailReason', label: '推送失败原因', value: row.pushFailReason, className: 'col-span-3' });
  }
  fields.push({ key: 'remark', label: '备注', value: detail.remark || EMPTY_PLACEHOLDER, className: 'col-span-3' });
  return fields;
}

const noticeDetailConfig = {
  listPageId: 'purchase-receipt-notice',
  editPageId: 'purchase-receipt-notice-edit',
  lineSectionTitle: '商品明细',
  lineVariant: 'receipt-notice',
  getDetail: getNoticeDetail,
  title: (detail) => `采购收货通知单详情${detail.noticeNo ? ` · ${detail.noticeNo}` : ''}`,
  getStatusBadges: (row) => getNoticeStatusBadges(row),
  canEdit: (row) => row.status === 'pending_push' || row.status === 'push_failed',
  editLabel: '编辑',
  rowKey: (detail) => detail.noticeNo,
  sections: [
    {
      title: '单据信息',
      fields: ({ detail, row, onOpenPage }) => buildNoticeInfoFields({ detail, row, onOpenPage }),
    },
  ],
  extraSections: [
    {
      title: '终止信息',
      visibleWhen: ({ row }) => row.status === 'cancelled',
      fields: ({ row }) => [
        { key: 'cancelReason', label: '取消原因', value: row.cancelReason },
        { key: 'cancelTime', label: '取消时间', value: row.cancelTime },
        { key: 'cancelOperator', label: '取消操作人', value: row.cancelOperator },
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
          logEntries: () => buildReceiptNoticeOperationLogs(row),
        },
      ],
    },
  ],
  summary: { quantityLabel: '通知数量', amountLabel: '实收数量' },
  buildLineSummary: ({ detail }) => ({
    notifyQty: { label: '通知数量', value: detail.totalNotifyQty ?? 0 },
    receivedQty: { label: '实收数量', value: detail.totalReceivedQty ?? 0 },
    shortQty: { label: '缺收数量', value: detail.totalShortQty ?? 0 },
  }),
};

export function PurchaseReceiptNoticeDetailPage({ onFeedback, onOpenPage, context }) {
  const row = usePurchaseReceiptNoticeRow(context);
  const [dialog, setDialog] = useState(null);

  function handleDialogComplete(result) {
    if (result?.message) onFeedback?.(result.message, result.type || 'success');
    if (result?.row) {
      onOpenPage?.('purchase-receipt-notice-detail', { row: loadNoticeById(result.row.id) || result.row });
    }
    setDialog(null);
  }

  const config = {
    ...noticeDetailConfig,
    renderAfterLines: ({ row: currentRow, onOpenPage: openPage }) => (
      currentRow.status === 'received'
        ? (
          <RelatedDocumentsCard
            sections={buildNoticeRelatedDocumentSections(currentRow)}
            onOpenPage={openPage}
          />
        )
        : null
    ),
    renderHeaderActions: () => (
      <PurchaseReceiptNoticeDetailHeaderActions
        row={row}
        onAction={(id, currentRow) => setDialog({ type: id, row: currentRow })}
      />
    ),
  };

  return (
    <>
      <DocumentDetailPage context={{ row }} onOpenPage={onOpenPage} config={config} />
      <PurchaseReceiptNoticeActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={onFeedback}
      />
    </>
  );
}
