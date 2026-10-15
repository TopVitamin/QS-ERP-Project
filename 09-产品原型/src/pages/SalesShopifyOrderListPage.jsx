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
  manualConfirmTypesForStatus,
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
  status: [],
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
  if (!matchesMultiSelect(row.status, filters.status)) return false;
  if (filters.warehouse && row.warehouse !== filters.warehouse) return false;
  if (filters.sourceType && row.sourceType !== filters.sourceType) return false;
  if (filters.productCode && !(row.lines || []).some((line) => matchesTextContains(line.productCode, filters.productCode))) return false;
  if (filters.barcode && !(row.lines || []).some((line) => matchesTextContains(line.barcode, filters.barcode))) return false;
  if (!matchesDateRange(row.createdAt, filters.createdAtRange)) return false;
  return true;
}

const initialVisibility = Object.fromEntries(shopifyOrderColumns.map((column) => [column.key, true]));
const columnOptions = shopifyOrderColumns.map((column) => ({ key: column.key, label: column.label }));

/** 行内操作按状态互斥展示（列表 Demo PRD §6.1；「编辑/提交/删除」等风险动作走模块弹窗二次确认）。 */
const rowActions = [
  { id: 'edit', label: '编辑', visibleWhen: canEditShopifyOrder },
  { id: 'submit', label: '提交', visibleWhen: canSubmitShopifyOrder },
  { id: 'delete', label: '删除', visibleWhen: canDeleteShopifyOrder, variant: 'danger' },
  { id: 'approve', label: '审核', visibleWhen: canApproveShopifyOrder },
  { id: 'withdraw', label: '撤回', visibleWhen: canWithdrawShopifyOrder },
  { id: 'cancel-audit', label: '取消审核', visibleWhen: canCancelAuditShopifyOrder },
  { id: 'retry-push', label: '重试推送', visibleWhen: canRetryPushShopifyOrder },
  { id: 'mock-push', label: '模拟推送成功（Mock）', visibleWhen: canMockPushShopifyOrder },
  { id: 'apply-cancel', label: '申请取消', visibleWhen: canApplyCancelShopifyOrder },
  { id: 'manual-confirm', label: '人工确认', visibleWhen: canManualConfirmShopifyOrder },
  { id: 'mock-callback', label: '模拟回传（Mock）', visibleWhen: canMockCallbackShopifyOrder },
  { id: 'copy', label: '复制新单', visibleWhen: canCopyShopifyOrder },
  { id: 'rewrite', label: '重新回写', visibleWhen: canRewriteShopifyOrder },
];

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
      const [confirmType] = manualConfirmTypesForStatus(row.status);
      setDialog({ type: 'manual-confirm', confirmType, row });
      return;
    }
    if (id === 'mock-callback') {
      setDialog(row.status === 'cancelling' ? { type: 'mock-cancel-result', row } : { type: 'mock-callback', row });
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
      { id: 'pull-orders', label: '拉取已付款订单（Mock）', variant: 'primary' },
      { id: 'import-orders', label: '导入（Mock）', icon: Upload },
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
    toolbarActions: [{ id: 'batch-edit', label: '批量选仓选物流' }],
    rowActionsMaxVisible: 3,
    rowActions,
    onRowAction: openRowDialog,
    onToolbarAction: (id, context) => {
      if (id !== 'batch-edit') return;
      const selected = context.getSelectedRows();
      if (!selected.length) {
        context.notify('请先勾选待提交订单', 'warning');
        return;
      }
      if (selected.some((row) => row.status !== 'draft')) {
        context.notify('批量选仓选物流仅支持待提交状态的订单，请调整勾选', 'warning');
        return;
      }
      setDialog({ type: 'batch-edit', rows: selected });
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
