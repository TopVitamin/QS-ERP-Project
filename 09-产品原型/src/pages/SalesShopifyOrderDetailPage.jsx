import { useState } from 'react';
import { DocumentDetailPage } from '../components/erp/DocumentDetailPage.jsx';
import {
  SalesShopifyOrderActionDialogs,
  SalesShopifyOrderDetailHeaderActions,
} from '../components/erp/SalesShopifyOrderActionDialogs.jsx';
import { buildOperationInfoTabs } from '../components/erp/DocumentMetaTabsCard.jsx';
import { RelatedDocumentsCard } from '../components/erp/RelatedDocumentsCard.jsx';
import { useDocumentRow } from '../hooks/useDocumentRow.js';
import { formatSnapshotCodeName } from '../lib/documentNameSnapshots.js';
import { formatAmount } from '../lib/format.js';
import { resolveOptionLabel } from '../lib/codeName.js';
import { currencyOptions } from '../data/masterData.js';
import { buildShopifyOrderRelatedDocumentSections } from '../lib/shopifyOrderRelatedDocs.js';
import {
  buildShopifyOrderOperationLogs,
  loadShopifyOrderById,
  manualConfirmTypesForOrder,
  refreshShopifyOrderLines,
  SHOPIFY_ORDER_STORAGE_KEY,
  shopifyCancelMethodLabels,
  shopifyDocumentStatusBadgeTones,
  shopifyDocumentStatusLabels,
  shopifySourceTypeLabels,
  shopifyWarehouseStatusBadgeTones,
  shopifyWarehouseStatusLabels,
  shopifyWriteBackContentLabels,
  shopifyWriteBackStatusLabels,
  validateShopifyOrderForSubmit,
} from '../lib/shopifyOrderLogic.js';
function getOrderDetail(row) {
  return { ...row, lines: refreshShopifyOrderLines(row?.lines || []) };
}

/** 「查看推送异常」文字入口：跳到系统集成中心-推送异常页（预置页签由该页设计决定）。 */
function PushExceptionLink({ content, onOpenPage }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="truncate">{content}</span>
      <button
        type="button"
        className="shrink-0 text-erp-primary hover:underline"
        onClick={() => onOpenPage?.('integration-push-exceptions', { presetFilters: { tab: 'platform' } })}
      >
        查看推送异常
      </button>
    </span>
  );
}

const orderDetailConfig = {
  listPageId: 'sales-shopify-order',
  lineSectionTitle: '商品明细',
  lineVariant: 'shopify-order',
  getDetail: getOrderDetail,
  title: (detail) => `独立站订单详情${detail.orderNo ? ` · ${detail.orderNo}` : ''}`,
  getStatusBadges: (row) => [
    { label: `单据：${shopifyDocumentStatusLabels[row.documentStatus] || row.documentStatus}`, tone: shopifyDocumentStatusBadgeTones[row.documentStatus] || 'neutral' },
    { label: `仓库：${shopifyWarehouseStatusLabels[row.warehouseStatus] || row.warehouseStatus}`, tone: shopifyWarehouseStatusBadgeTones[row.warehouseStatus] || 'neutral' },
    { label: `回写：${shopifyWriteBackStatusLabels[row.writeBackStatus] || row.writeBackStatus}`, tone: row.writeBackStatus === 'failed' ? 'danger' : row.writeBackStatus === 'written' ? 'success' : 'neutral' },
  ],
  rowKey: (detail) => detail.orderNo,
  sections: [
    {
      title: '单据信息',
      fields: ({ detail, row }) => [
        { key: 'orderNo', label: '单号', value: detail.orderNo },
        { key: 'customer', label: '客户', value: formatSnapshotCodeName(detail.customer, detail.customerNameSnapshot) },
        { key: 'currency', label: '币别', value: resolveOptionLabel(detail.currency, currencyOptions) },
        { key: 'amount', label: '价税合计', value: formatAmount(row.amount) },
        { key: 'taxAmount', label: '税额', value: formatAmount(row.taxAmount) },
        { key: 'netAmount', label: '金额', value: formatAmount(row.netAmount) },
        { key: 'totalOrderQty', label: '总订购数量', value: row.totalOrderQty ?? 0 },
        { key: 'totalShippedQty', label: '累计实际发货数量', value: row.totalShippedQty ?? 0 },
        { key: 'diffQty', label: '差额数量', value: row.diffQty ?? 0 },
        { key: 'remark', label: '备注', value: detail.remark, className: 'col-span-3' },
      ],
    },
    {
      title: '来源信息',
      fields: ({ detail }) => [
        { key: 'shopifyOrderNo', label: 'Shopify来源单号', value: detail.shopifyOrderNo },
        { key: 'sourceType', label: '获取方式', value: shopifySourceTypeLabels[detail.sourceType] || detail.sourceType },
      ],
    },
    {
      title: '收货信息',
      fields: ({ detail }) => [
        { key: 'receiverName', label: '收货人姓名', value: detail.receiverName },
        { key: 'receiverPhone', label: '收货人电话', value: detail.receiverPhone },
        { key: 'country', label: '国家／地区', value: detail.country },
        { key: 'postalCode', label: '邮政编码', value: detail.postalCode },
        { key: 'receiverAddress', label: '收货地址', value: detail.receiverAddress, className: 'col-span-3' },
      ],
    },
    {
      title: '发货与物流',
      fields: ({ detail }) => [
        { key: 'warehouse', label: '发货仓库', value: formatSnapshotCodeName(detail.warehouse, detail.warehouseNameSnapshot) },
        { key: 'logisticsProduct', label: '物流服务产品', value: formatSnapshotCodeName(detail.logisticsProduct, detail.logisticsProductNameSnapshot) },
        { key: 'waybillNo', label: '运单号', value: detail.waybillNo },
      ],
    },
  ],
  renderAfterLines: ({ row, onOpenPage }) => {
    const sections = buildShopifyOrderRelatedDocumentSections(row);
    const hasResultDocument = row.documentStatus === 'completed' || row.documentStatus === 'cancelled'
      || sections.some((section) => section.rows?.length);
    if (!hasResultDocument) return null;
    return <RelatedDocumentsCard sections={sections} onOpenPage={onOpenPage} />;
  },
  extraSections: [
    {
      title: '推送与回写',
      fields: ({ row, onOpenPage }) => {
        const fields = [
          { key: 'pushTime', label: '推送时间', value: row.pushTime },
          { key: 'finalShipConfirmTime', label: '最终发货确认时间', value: row.finalShipConfirmTime },
          { key: 'lastProcessTime', label: '最近处理时间', value: row.lastProcessTime },
          { key: 'writeBackStatus', label: '回写状态', value: shopifyWriteBackStatusLabels[row.writeBackStatus] || row.writeBackStatus },
          { key: 'writeBackContent', label: '回写内容', value: row.writeBackContent ? shopifyWriteBackContentLabels[row.writeBackContent] : '' },
          { key: 'writeBackTime', label: '回写时间', value: row.writeBackTime },
        ];
        if (row.pushFailReason) {
          fields.push({
            key: 'pushFailReason',
            label: '推送失败原因',
            className: 'col-span-3',
            value: <PushExceptionLink content={row.pushFailReason} onOpenPage={onOpenPage} />,
          });
        }
        if (row.writeBackFailReason) {
          fields.push({
            key: 'writeBackFailReason',
            label: '回写失败原因',
            className: 'col-span-3',
            value: <PushExceptionLink content={row.writeBackFailReason} onOpenPage={onOpenPage} />,
          });
        }
        return fields;
      },
    },
    {
      title: '终止信息',
      visibleWhen: ({ row }) => row.documentStatus === 'cancelled',
      fields: ({ row }) => [
        { key: 'cancelMethod', label: '取消方式', value: shopifyCancelMethodLabels[row.cancelMethod] || row.cancelMethod },
        { key: 'cancelReason', label: '取消原因', value: row.cancelReason },
        { key: 'cancelTime', label: '取消时间', value: row.cancelTime },
        { key: 'cancelOperator', label: '取消操作人', value: row.cancelOperator },
      ],
    },
    {
      title: '操作信息',
      variant: 'meta-tabs',
      defaultTab: 'create',
      tabs: ({ row }) => buildOperationInfoTabs({
        row,
        buildLogs: buildShopifyOrderOperationLogs,
        extraTabs: [
          {
            key: 'audit',
            label: '审核信息',
            fields: [
              { key: 'auditor', label: '审核人', value: row.auditor },
              { key: 'auditTime', label: '审核时间', value: row.auditTime },
              { key: 'returnComment', label: '撤回意见', value: row.returnComment, className: 'col-span-3' },
            ],
          },
          {
            key: 'confirm',
            label: '人工确认',
            fields: [
              { key: 'confirmBy', label: '人工确认人', value: row.confirmBy },
              { key: 'confirmAt', label: '人工确认时间', value: row.confirmAt },
              { key: 'confirmContent', label: '人工确认内容', value: row.confirmContent, className: 'col-span-3' },
            ],
          },
        ],
      }),
    },
  ],
  summary: { quantityLabel: '订购数量', amountLabel: '价税合计' },
  buildLineSummary: ({ lineTotals }) => ({
    quantity: { label: '订购数量', value: lineTotals.quantity },
    grossAmount: { label: '价税合计', value: lineTotals.grossAmount, format: 'amount', emphasis: true },
    taxAmount: { label: '税额', value: lineTotals.taxAmount, format: 'amount' },
    netAmount: { label: '金额', value: lineTotals.netAmount, format: 'amount' },
  }),
};

export function SalesShopifyOrderDetailPage({ onFeedback, onOpenPage, context }) {
  const row = useDocumentRow(context, { storageKey: SHOPIFY_ORDER_STORAGE_KEY, loadById: loadShopifyOrderById });
  const [dialog, setDialog] = useState(null);

  function handleDialogComplete(result) {
    if (result?.message) onFeedback?.(result.message, result.type || 'success');
    if (result?.followUp === 'open-copy' && result?.newOrderId) {
      onOpenPage?.('sales-shopify-order-detail', { row: loadShopifyOrderById(result.newOrderId) });
      setDialog(null);
      return;
    }
    if (result?.deleted) {
      onOpenPage?.('sales-shopify-order');
      setDialog(null);
      return;
    }
    if (result?.row?.id) {
      onOpenPage?.('sales-shopify-order-detail', { row: loadShopifyOrderById(result.row.id) || result.row });
    }
    setDialog(null);
  }

  const config = {
    ...orderDetailConfig,
    // 本模块不提供独立编辑页；「编辑」为页头按钮打开选仓选物流弹窗（见 renderHeaderActions）
    canEdit: () => false,
    renderHeaderActions: ({ row: currentRow }) => (
      <SalesShopifyOrderDetailHeaderActions
        row={currentRow}
        onAction={(id, actionRow) => {
          if (id === 'submit') {
            // 提交按 R10 前置校验：未通过时 Toast 阻断，不进入确认弹窗（弹窗与Mock §2.2）
            const block = validateShopifyOrderForSubmit(actionRow);
            if (block) {
              onFeedback?.(block, 'warning');
              return;
            }
            setDialog({ type: 'submit', row: actionRow });
            return;
          }
          if (id === 'manual-confirm') {
            const [confirmType] = manualConfirmTypesForOrder(actionRow);
            setDialog({ type: 'manual-confirm', confirmType, row: actionRow });
            return;
          }
          if (id === 'mock-callback') {
            setDialog(actionRow.warehouseStatus === 'cancelling' ? { type: 'mock-cancel-result', row: actionRow } : { type: 'mock-callback', row: actionRow });
            return;
          }
          setDialog({ type: id, row: actionRow });
        }}
      />
    ),
  };

  return (
    <>
      <DocumentDetailPage context={{ row }} onOpenPage={onOpenPage} config={config} />
      <SalesShopifyOrderActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={(message, type) => onFeedback?.(message, type)}
      />
    </>
  );
}
