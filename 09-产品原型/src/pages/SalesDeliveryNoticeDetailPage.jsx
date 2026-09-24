import { useState } from 'react';
import { DocumentDetailPage } from '../components/erp/DocumentDetailPage.jsx';
import { buildCreateMetaFields } from '../components/erp/DocumentMetaTabsCard.jsx';
import { RelatedDocumentsCard } from '../components/erp/RelatedDocumentsCard.jsx';
import { buildDeliveryNoticeOperationLogs } from '../lib/operationLog.js';
import { buildDeliveryNoticeRelatedDocumentSections } from '../lib/salesDeliveryNoticeRelatedDocs.js';
import {
  SalesDeliveryNoticeActionDialogs,
  SalesDeliveryNoticeDetailHeaderActions,
} from '../components/erp/SalesDeliveryNoticeActionDialogs.jsx';
import { useSalesDeliveryNoticeRow } from '../hooks/useSalesDeliveryNoticeRow.js';
import { resolveAddressLabel } from '../lib/cnAddress.js';
import { resolveOptionLabel } from '../lib/codeName.js';
import { formatSnapshotCodeName } from '../lib/documentNameSnapshots.js';
import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import { customerOptions, logisticsProductOptions } from '../data/masterData.js';
import { getInventoryLogicalWarehouseOptions } from '../data/warehouseData.js';
import { getDeliveryNoticeStatusBadges } from '../data/salesDeliveryNoticeData.js';
import { formatDeliveryMode, formatShipMethod, loadNoticeById, refreshNoticeLines } from '../lib/salesDeliveryNoticeLogic.js';
import { salesOrders } from '../data/salesOrderData.js';
import { loadOrderById } from '../lib/salesOrderLogic.js';

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
    || salesOrders.find((order) => order.orderNo === detail.sourceOrderNo);
  return (
    <button
      type="button"
      className="truncate text-erp-primary hover:underline"
      onClick={() => onOpenPage?.('sales-order-detail', { row: relatedOrder || { orderNo: detail.sourceOrderNo, id: detail.sourceOrderId } })}
    >
      {detail.sourceOrderNo}
    </button>
  );
}

function resolveLogisticsLabel(value) {
  return logisticsProductOptions.find((item) => item.value === value)?.label || value || EMPTY_PLACEHOLDER;
}

function buildNoticeInfoFields({ detail, row, onOpenPage }) {
  const fields = [
    { key: 'noticeNo', label: '单号', value: detail.noticeNo },
    { key: 'sourceOrderNo', label: '来源销售订单', value: buildSourceOrderLink(detail, onOpenPage) },
    { key: 'customer', label: '客户', value: formatSnapshotCodeName(detail.customer, detail.customerNameSnapshot) },
    { key: 'warehouse', label: '发货仓库', value: formatSnapshotCodeName(detail.warehouse, detail.warehouseNameSnapshot) },
    { key: 'deliveryMode', label: '发货处理方式', value: formatDeliveryMode(detail) },
    { key: 'pushTime', label: '推送时间', value: row.pushTime || EMPTY_PLACEHOLDER },
    { key: 'finalShipTime', label: '最终发货确认时间', value: row.finalShipTime || EMPTY_PLACEHOLDER },
  ];
  if (row.trackingNo) {
    fields.push({ key: 'trackingNo', label: '运单号', value: row.trackingNo });
  }
  if (row.pushFailReason) {
    fields.push({ key: 'pushFailReason', label: '推送失败原因', value: row.pushFailReason, className: 'col-span-3' });
  }
  fields.push({ key: 'remark', label: '备注', value: detail.remark || EMPTY_PLACEHOLDER, className: 'col-span-3' });
  return fields;
}

const noticeDetailConfig = {
  listPageId: 'sales-delivery-notice',
  editPageId: 'sales-delivery-notice-edit',
  lineSectionTitle: '商品明细',
  lineVariant: 'delivery-notice',
  getDetail: getNoticeDetail,
  title: (detail) => `销售发货通知单详情${detail.noticeNo ? ` · ${detail.noticeNo}` : ''}`,
  getStatusBadges: (row) => getDeliveryNoticeStatusBadges(row),
  rowKey: (detail) => detail.noticeNo,
  sections: [
    {
      title: '单据信息',
      fields: ({ detail, row, onOpenPage }) => buildNoticeInfoFields({ detail, row, onOpenPage }),
    },
    {
      title: '发货与物流',
      fields: ({ detail }) => [
        { key: 'shipMethod', label: '发货方式', value: formatShipMethod(detail.shipMethod) },
        ...(detail.shipMethod !== 'pickup' ? [
          { key: 'logisticsProduct', label: '物流服务产品', value: resolveLogisticsLabel(detail.logisticsProduct) },
          { key: 'deliveryAddress', label: '发货地址', value: resolveAddressLabel(detail.deliveryAddress), className: 'col-span-2' },
        ] : []),
      ],
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
          logEntries: () => buildDeliveryNoticeOperationLogs(row),
        },
      ],
    },
  ],
  summary: { quantityLabel: '通知数量', amountLabel: '实出数量' },
  buildLineSummary: ({ detail }) => ({
    notifyQty: { label: '通知数量', value: detail.totalNotifyQty ?? 0 },
    shippedQty: { label: '实出数量', value: detail.totalShippedQty ?? 0 },
    shortQty: { label: '缺出数量', value: detail.totalShortQty ?? 0 },
  }),
};

export function SalesDeliveryNoticeDetailPage({ onFeedback, onOpenPage, context }) {
  const row = useSalesDeliveryNoticeRow(context);
  const [dialog, setDialog] = useState(null);

  function handleDialogComplete(result) {
    if (result?.message) onFeedback?.(result.message, result.type || 'success');
    if (result?.row) {
      onOpenPage?.('sales-delivery-notice-detail', { row: loadNoticeById(result.row.id) || result.row });
    }
    setDialog(null);
  }

  const config = {
    ...noticeDetailConfig,
    renderAfterLines: ({ row, onOpenPage }) => (
      row.status === 'shipped'
        ? (
          <RelatedDocumentsCard
            sections={buildDeliveryNoticeRelatedDocumentSections(row)}
            onOpenPage={onOpenPage}
          />
        )
        : null
    ),
    renderHeaderActions: () => (
      <SalesDeliveryNoticeDetailHeaderActions
        row={row}
        onAction={(id, currentRow) => {
          if (id === 'edit') {
            onOpenPage?.('sales-delivery-notice-edit', { row: currentRow });
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
      <SalesDeliveryNoticeActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={onFeedback}
      />
    </>
  );
}
