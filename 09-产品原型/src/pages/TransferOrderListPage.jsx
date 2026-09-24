import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { TransferOrderActionDialogs } from '../components/erp/TransferOrderActionDialogs.jsx';
import { matchesDateRange, matchesMultiSelect, statusMultiSelectField } from '../lib/listFilters.js';
import { getTransferTarget } from '../lib/transferTargets.js';
import { getInventoryLogicalWarehouseOptions } from '../data/warehouseData.js';
import { transferOrderColumns, transferOrders } from '../data/transferOrderData.js';
import {
  canApproveTransferOrder,
  canCancelTransferOrder,
  canDeleteTransferOrder,
  canEditTransferOrder,
  canSubmitTransferOrder,
  canWithdrawTransferOrder,
  loadTransferOrderById,
  TRANSFER_ORDER_STORAGE_KEY,
  transferAuditLabels,
  transferBusinessDisplayLabels,
} from '../lib/transferOrderLogic.js';

/**
 * 分步式调拨单列表（F01）：查询、数量进度列、状态驱动行内操作。
 * 查询区与列见《列表页 Demo PRD》§2、§4；默认按创建时间倒序；已审核+正常不提供主单取消。
 */

const initialFilters = {
  orderNo: '',
  outWarehouse: '',
  inWarehouse: '',
  auditStatus: [],
  businessStatus: [],
  product: '',
  createdAtRange: { from: '', to: '' },
};

const warehouseOptions = getInventoryLogicalWarehouseOptions({ includeDisabled: false, includeTransit: false });

const filterFields = [
  { key: 'orderNo', label: '单号', type: 'search', placeholder: '请输入单号' },
  { key: 'outWarehouse', label: '调出仓', type: 'searchable-select', placeholder: '全部', options: warehouseOptions },
  { key: 'inWarehouse', label: '接收仓', type: 'searchable-select', placeholder: '全部', options: warehouseOptions },
  statusMultiSelectField('auditStatus', '审核状态', transferAuditLabels),
  statusMultiSelectField('businessStatus', '业务状态', transferBusinessDisplayLabels),
  { key: 'product', label: '商品', type: 'search', placeholder: '请输入商品编码' },
  { key: 'createdAtRange', label: '创建时间', type: 'date-range', placeholder: '不限' },
];

const initialVisibility = Object.fromEntries(transferOrderColumns.map((column) => [column.key, true]));
const columnOptions = transferOrderColumns.map((column) => ({ key: column.key, label: column.label }));

function filterRows(row, filters) {
  const orderNo = filters.orderNo.trim().toLowerCase();
  const product = filters.product.trim().toLowerCase();

  return (!orderNo || String(row.orderNo || '').toLowerCase().includes(orderNo))
    && (!filters.outWarehouse || row.outWarehouse === filters.outWarehouse)
    && (!filters.inWarehouse || row.inWarehouse === filters.inWarehouse)
    && matchesMultiSelect(row.auditStatus, filters.auditStatus)
    && matchesMultiSelect(row.businessStatus, filters.businessStatus)
    && matchesDateRange(row.createdAt, filters.createdAtRange)
    && (!product || row.lines?.some((line) => String(line.productCode || '').toLowerCase().includes(product)));
}

function handleCellClick(column, row, { onOpenPage }) {
  if (column.key === 'orderNo') {
    onOpenPage?.('inventory-transfer-order-detail', { row });
  }
}

function createRowActionHandler(openDialog) {
  return function handleRowAction(id, row, { notify, onOpenPage }) {
    const latest = loadTransferOrderById(row.id) || row;

    if (id === 'edit') {
      if (!canEditTransferOrder(latest)) {
        notify('操作失败，单据状态已变更，请刷新后重试', 'warning');
        return;
      }
      onOpenPage?.('inventory-transfer-order-edit', { row: latest });
      return;
    }
    if (id === 'submit' || id === 'withdraw' || id === 'cancel' || id === 'delete' || id === 'approve') {
      openDialog({ type: id, row: latest });
    }
  };
}

export function TransferOrderListPage(props) {
  const [dialog, setDialog] = useState(null);

  const listConfig = useMemo(() => ({
    title: '分步式调拨单',
    rows: transferOrders,
    storageKey: TRANSFER_ORDER_STORAGE_KEY,
    initialFilters,
    initialPinnedKeys: ['orderNo'],
    filterRows,
    initialVisibility,
    columns: transferOrderColumns,
    columnOptions,
    filterFields,
    defaultSort: { key: 'createdAt', direction: 'desc' },
    headerActions: [
      { id: 'create', label: '新增', variant: 'primary', icon: Plus },
      {
        id: 'import-export',
        render: (ctx) => (
          <ImportExportActions
            target={getTransferTarget('transfer-order')}
            scopeSource={{ all: ctx.state.rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
            defaultColumnKeys={transferOrderColumns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
            notify={ctx.notify}
            onOpenPage={ctx.onOpenPage}
          />
        ),
      },
    ],
    onHeaderAction: (id, ctx) => {
      if (id === 'create') ctx.onOpenPage?.('inventory-transfer-order-create');
    },
    toolbarActions: [],
    rowActionsMaxVisible: 3,
    rowActions: [
      { id: 'edit', label: '编辑', visibleWhen: (row) => canEditTransferOrder(row) },
      { id: 'submit', label: '提交', visibleWhen: (row) => canSubmitTransferOrder(row) },
      { id: 'delete', label: '删除', visibleWhen: (row) => canDeleteTransferOrder(row), variant: 'danger' },
      { id: 'approve', label: '审核', visibleWhen: (row) => canApproveTransferOrder(row) },
      { id: 'withdraw', label: '撤回', visibleWhen: (row) => canWithdrawTransferOrder(row) },
      { id: 'cancel', label: '取消', visibleWhen: (row) => canCancelTransferOrder(row), variant: 'danger' },
    ],
    resetMessage: '筛选条件已重置',
    queryMessage: '已执行分步式调拨单查询',
    emptyText: '暂无分步式调拨单',
    emptyTextFiltered: '该条件下暂无分步式调拨单，可调整查询条件后重试',
    onCellClick: handleCellClick,
    onRowAction: createRowActionHandler(setDialog),
  }), []);

  function handleDialogComplete(result) {
    if (result?.message) props.onFeedback?.(result.message, result.type || 'success');
    setDialog(null);
  }

  return (
    <>
      <DocumentListPage {...props} config={listConfig} />
      <TransferOrderActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={props.onFeedback}
      />
    </>
  );
}
