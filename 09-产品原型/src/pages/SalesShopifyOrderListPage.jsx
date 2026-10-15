import { useState } from 'react';
import { Upload } from 'lucide-react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { SalesShopifyOrderActionDialogs } from '../components/erp/SalesShopifyOrderActionDialogs.jsx';
import { matchesDateRange, matchesMultiSelect, matchesTextContains } from '../lib/listFilters.js';
import {
  canApproveShopifyOrder,
  canApplyCancelShopifyOrder,
  canCancelAuditShopifyOrder,
  canCopyShopifyOrder,
  canDeleteShopifyOrder,
  canEditShopifyOrder,
  canManualConfirmShopifyOrder,
  canMockCallbackShopifyOrder,
  canMockPushShopifyOrder,
  canRetryPushShopifyOrder,
  canRewriteShopifyOrder,
  canSubmitShopifyOrder,
  canWithdrawShopifyOrder,
  loadAllShopifyOrders,
  manualConfirmTypesForOrder,
  normalizeShopifyRows,
  SHOPIFY_ORDER_STORAGE_KEY,
  validateShopifyOrderForSubmit,
} from '../lib/shopifyOrderLogic.js';
import {
  shopifyOrderColumns,
  shopifyOrderFilterFields,
  shopifyOrders,
  shopifyOrderTransferTarget,
} from '../data/shopifyOrderData.js';

const initialFilters = {
  orderNo: '',
  shopifyOrderNo: '',
  documentStatus: [],
  warehouseStatus: [],
  warehouse: '',
  sourceType: '',
  productCode: '',
  barcode: '',
  createdAtRange: { from: '', to: '' },
};

/** 查询：文本模糊、单据状态多选 OR、仓库/获取方式精确、创建时间按日期范围（列表 Demo PRD §2）。 */
function filterRows(row, filters) {
  if (!matchesTextContains(row.orderNo, filters.orderNo)) return false;
  if (!matchesTextContains(row.shopifyOrderNo, filters.shopifyOrderNo)) return false;
  if (!matchesMultiSelect(row.documentStatus, filters.documentStatus)) return false;
  if (!matchesMultiSelect(row.warehouseStatus, filters.warehouseStatus)) return false;
  if (filters.warehouse && row.warehouse !== filters.warehouse) return false;
  if (filters.sourceType && row.sourceType !== filters.sourceType) return false;
  if (filters.productCode && !(row.lines || []).some((line) => matchesTextContains(line.productCode, filters.productCode))) return false;
  if (filters.barcode && !(row.lines || []).some((line) => matchesTextContains(line.barcode, filters.barcode))) return false;
  if (!matchesDateRange(row.createdAt, filters.createdAtRange)) return false;
  return true;
}

const initialVisibility = Object.fromEntries(shopifyOrderColumns.map((column) => [column.key, true]));
const columnOptions = shopifyOrderColumns.map((column) => ({ key: column.key, label: column.label }));

/** 行内：状态特异或低频操作；待提交/待审核主流程走左上角批量区（列表 Demo PRD §3、§6）。 */
const rowActions = [
  { id: 'edit', label: '选仓选物流', visibleWhen: canEditShopifyOrder },
  { id: 'cancel-audit', label: '取消审核', visibleWhen: canCancelAuditShopifyOrder },
  { id: 'retry-push', label: '重试推仓', visibleWhen: canRetryPushShopifyOrder },
  { id: 'mock-push', label: '模拟推仓（Mock）', visibleWhen: canMockPushShopifyOrder },
  { id: 'apply-cancel', label: '申请取消', visibleWhen: canApplyCancelShopifyOrder },
  { id: 'manual-confirm', label: '人工确认', visibleWhen: canManualConfirmShopifyOrder },
  { id: 'mock-callback', label: '模拟仓回传（Mock）', visibleWhen: canMockCallbackShopifyOrder },
  { id: 'copy', label: '复制新单', visibleWhen: canCopyShopifyOrder },
  { id: 'rewrite', label: '重新回写', visibleWhen: canRewriteShopifyOrder },
];

const toolbarActions = [
  { id: 'batch-edit', label: '选仓选物流', requiresSelection: true },
  { id: 'batch-submit', label: '提交', requiresSelection: true },
  { id: 'batch-approve', label: '审核', requiresSelection: true },
  { id: 'batch-withdraw', label: '撤回', requiresSelection: true },
  { id: 'batch-delete', label: '删除', requiresSelection: true, variant: 'danger' },
];

function getBatchBlockReason(selected, actionId) {
  if (!selected.length) return '请先勾选订单';
  const allDraft = selected.every((row) => row.documentStatus === 'draft');
  const allPending = selected.every((row) => row.documentStatus === 'pending');
  switch (actionId) {
    case 'batch-edit':
      if (!allDraft || selected.some((row) => !canEditShopifyOrder(row))) {
        return '选仓选物流仅支持待提交订单，请调整勾选';
      }
      return null;
    case 'batch-submit':
      if (!allDraft || selected.some((row) => !canSubmitShopifyOrder(row))) {
        return '批量提交仅支持待提交订单，请调整勾选';
      }
      for (const row of selected) {
        const block = validateShopifyOrderForSubmit(row);
        if (block) return `${row.orderNo}：${block}`;
      }
      return null;
    case 'batch-delete':
      if (!allDraft || selected.some((row) => !canDeleteShopifyOrder(row))) {
        return '批量删除仅支持待提交订单，请调整勾选';
      }
      return null;
    case 'batch-approve':
      if (!allPending || selected.some((row) => !canApproveShopifyOrder(row))) {
        return '批量审核仅支持待审核订单，请调整勾选';
      }
      return null;
    case 'batch-withdraw':
      if (!allPending || selected.some((row) => !canWithdrawShopifyOrder(row))) {
        return '批量撤回仅支持待审核订单，请调整勾选';
      }
      return null;
    default:
      return null;
  }
}

export function SalesShopifyOrderListPage(props) {
  const [dialog, setDialog] = useState(null);

  function openRowDialog(id, row) {
    // 提交按 R10 前置校验：未通过时 Toast 阻断，不进入确认弹窗（弹窗与Mock §2.2）
    if (id === 'submit') {
      const block = validateShopifyOrderForSubmit(row);
      if (block) {
        props.onFeedback?.(block, 'warning');
        return;
      }
      setDialog({ type: 'submit', row });
      return;
    }
    if (id === 'manual-confirm') {
      const [confirmType] = manualConfirmTypesForOrder(row);
      setDialog({ type: 'manual-confirm', confirmType, row });
      return;
    }
    if (id === 'mock-callback') {
      setDialog(row.warehouseStatus === 'cancelling' ? { type: 'mock-cancel-result', row } : { type: 'mock-callback', row });
      return;
    }
    setDialog({ type: id, row });
  }

  function handleDialogComplete(result) {
    if (result?.message) props.onFeedback?.(result.message, result.type || 'success');
    if (result?.followUp === 'open-copy' && result?.newOrderId) {
      const newRow = loadAllShopifyOrders(shopifyOrders).find((item) => item.id === result.newOrderId);
      props.onOpenPage?.('sales-shopify-order-detail', { row: newRow });
    }
    setDialog(null);
  }

  const config = {
    title: '独立站订单',
    rows: shopifyOrders,
    storageKey: SHOPIFY_ORDER_STORAGE_KEY,
    normalizeRows: normalizeShopifyRows,
    initialFilters,
    filterRows,
    initialVisibility,
    columns: shopifyOrderColumns,
    columnOptions,
    filterFields: shopifyOrderFilterFields,
    // 推送异常「推送电商平台」等跨页跳转按单号预置筛选（列表 Demo PRD §2）
    presetFilters: props.context?.presetFilters,
    defaultSort: { key: 'createdAt', direction: 'desc' },
    initialPinnedKeys: ['orderNo'],
    headerActions: [
      { id: 'pull-orders', label: '拉取已付款单（Mock）', variant: 'primary' },
      { id: 'import-orders', label: '导入订单（Mock）', icon: Upload },
      {
        id: 'import-export',
        render: (ctx) => (
          <ImportExportActions
            target={shopifyOrderTransferTarget}
            scopeSource={{ all: ctx.state.rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
            defaultColumnKeys={shopifyOrderColumns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
            notify={ctx.notify}
            onOpenPage={ctx.onOpenPage}
          />
        ),
      },
    ],
    toolbarActions,
    rowActionsMaxVisible: 3,
    rowActions,
    onRowAction: openRowDialog,
    onToolbarAction: (id, context) => {
      const selected = context.getSelectedRows();
      const block = getBatchBlockReason(selected, id);
      if (block) {
        context.notify(block, 'warning');
        return;
      }
      if (id === 'batch-edit') {
        setDialog({ type: 'batch-edit', rows: selected });
        return;
      }
      if (id === 'batch-submit' || id === 'batch-delete' || id === 'batch-approve' || id === 'batch-withdraw') {
        setDialog({ type: id, rows: selected });
      }
    },
    onHeaderAction: (id, context) => {
      if (id === 'pull-orders') setDialog({ type: 'pull-orders', loadSeed: context.state.rows });
      if (id === 'import-orders') setDialog({ type: 'import-orders', loadSeed: context.state.rows });
    },
    onCellClick: (column, row, { onOpenPage }) => {
      if (column.key === 'orderNo') onOpenPage?.('sales-shopify-order-detail', { row });
    },
    resetMessage: '筛选条件已重置',
    queryMessage: '已执行独立站订单查询',
    emptyText: '暂无独立站订单',
    emptyTextFiltered: '该条件下暂无独立站订单，可调整查询条件后重试',
  };

  return (
    <>
      <DocumentListPage {...props} config={config} />
      <SalesShopifyOrderActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={(message, type) => props.onFeedback?.(message, type)}
      />
    </>
  );
}
