import { Plus } from 'lucide-react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { getTransferTarget } from '../lib/transferTargets.js';
import { toSelectOptions } from '../lib/options.js';
import { employeeOptions, supplierOptions, warehouseOptions } from '../data/masterData.js';
import { inboundTypeOptions } from '../data/purchaseFormData.js';
import { inboundColumns, inboundOrders, inboundStatusLabels } from '../data/inboundData.js';
import { orders } from '../data/orderData.js';

const initialFilters = {
  date: '',
  warehouse: '',
  supplier: [],
  keyword: '',
  status: '',
  operator: '',
  inboundType: '',
};

const filterFields = [
  { key: 'date', label: '单据日期', type: 'date' },
  { key: 'warehouse', label: '入库仓库', type: 'select', options: warehouseOptions },
  { key: 'supplier', label: '供应商', type: 'multi-select', options: supplierOptions },
  { key: 'keyword', label: '入库单号/采购订单', type: 'search', placeholder: '输入单号或采购订单' },
  { key: 'status', label: '入库状态', type: 'select', options: toSelectOptions(inboundStatusLabels) },
  { key: 'operator', label: '经办人', type: 'select', options: employeeOptions },
  { key: 'inboundType', label: '入库类型', type: 'select', options: inboundTypeOptions },
];

const initialVisibility = Object.fromEntries(inboundColumns.map((column) => [column.key, true]));
const columnOptions = inboundColumns.map((column) => ({ key: column.key, label: column.label }));

const toolbarActions = [
  { id: 'confirm-inbound', label: '确认入库', requiresSelection: true, confirm: { title: '确认处理选中的入库单？', description: '确认后，选中的单据状态会变为已入库。', confirmLabel: '确认入库' } },
  { id: 'void', label: '作废', variant: 'danger', requiresSelection: true, confirm: { title: '确认作废选中的入库单？', description: '作废后单据会从当前列表移除，演示数据可以通过刷新页面恢复。', confirmLabel: '确认作废', confirmVariant: 'danger' } },
  { id: 'print', label: '打印', requiresSelection: true, menuItems: [{ id: 'print-inbound', label: '打印入库单' }, { id: 'print-detail', label: '打印入库明细' }] },
  { id: 'refresh', label: '更新' },
];

function filterRows(row, filters) {
  const keyword = filters.keyword.trim().toLowerCase();
  const matchesKeyword = !keyword || [row.inboundNo, row.relatedOrderNo, row.supplier].some((value) => String(value || '').toLowerCase().includes(keyword));
  const suppliers = Array.isArray(filters.supplier) ? filters.supplier : filters.supplier ? [filters.supplier] : [];
  return (!filters.date || row.date === filters.date)
    && (!filters.warehouse || row.warehouse === filters.warehouse)
    && (!suppliers.length || suppliers.includes(row.supplier))
    && (!filters.status || row.status === filters.status)
    && (!filters.operator || row.operator === filters.operator)
    && (!filters.inboundType || row.inboundType === filters.inboundType)
    && matchesKeyword;
}

function handleHeaderAction(id, { notify, onOpenPage }) {
  if (id === 'create') {
    onOpenPage?.('purchase-inbound-create');
    return;
  }
  notify(id, 'info');
}

function handleToolbarAction(id, { state, notify, getSelectedRows, getSelectedIds }) {
  const selectedRows = getSelectedRows();
  const selectedIds = getSelectedIds();

  if (id === 'confirm-inbound') {
    const pendingRows = selectedRows.filter((row) => row.status !== 'completed');
    if (!pendingRows.length) {
      notify('所选入库单均已完成，无需重复确认', 'warning');
      return;
    }
    state.updateRows(pendingRows.map((row) => row.id), (row) => ({ ...row, status: 'completed' }));
    notify(`已成功确认 ${pendingRows.length} 张采购入库单`, 'success');
    return;
  }
  if (id === 'void') {
    if (!selectedIds.length) {
      notify('请先选择要作废的入库单', 'warning');
      return;
    }
    state.removeRows(selectedIds);
    notify(`已成功作废 ${selectedIds.length} 张采购入库单`, 'success');
    return;
  }
  if (id === 'print-inbound' || id === 'print-detail') {
    notify('已生成采购入库单打印预览', 'info');
    return;
  }
  if (id === 'refresh') notify('采购入库单列表已更新', 'success');
}

function handleCellClick(column, row, { onOpenPage }) {
  if (column.key === 'inboundNo') {
    onOpenPage?.('purchase-inbound-detail', { row });
    return;
  }
  if (column.key === 'relatedOrderNo') {
    const relatedOrder = orders.find((order) => order.orderNo === row.relatedOrderNo);
    onOpenPage?.('purchase-order-detail', { row: relatedOrder || { orderNo: row.relatedOrderNo } });
  }
}

function handleRowAction(id, row, { state, notify, onOpenPage }) {
  if (id === 'edit') {
    onOpenPage?.('purchase-inbound-edit', { row });
    return;
  }
  if (id === 'view') {
    onOpenPage?.('purchase-inbound-detail', { row });
    return;
  }
  if (id === 'confirm') {
    if (row.status === 'completed') {
      notify(`${row.inboundNo} 已完成入库，无需重复确认`, 'warning');
      return;
    }
    state.updateRow(row.id, (current) => ({ ...current, status: 'completed' }));
    notify(`${row.inboundNo} 已成功确认入库`, 'success');
    return;
  }
  if (id === 'void') {
    if (row.status === 'completed') {
      notify(`${row.inboundNo} 已完成入库，无法作废`, 'error');
      return;
    }
    state.removeRows([row.id]);
    notify(`${row.inboundNo} 已成功作废`, 'success');
  }
}

const inboundListConfig = {
  title: '采购入库单列表',
  rows: inboundOrders,
  storageKey: 'qs-erp:purchase-inbounds:v1',
  initialFilters,
  filterRows,
  initialVisibility,
  columns: inboundColumns,
  columnOptions,
  filterFields,
  headerActions: [
    { id: 'create', label: '新增', icon: Plus, variant: 'primary' },
    {
      id: 'import-export',
      render: (ctx) => (
        <ImportExportActions
          target={getTransferTarget('purchase-inbound')}
          scopeSource={{ all: ctx.state.rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
          defaultColumnKeys={inboundColumns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
          notify={ctx.notify}
          onOpenPage={ctx.onOpenPage}
        />
      ),
    },
  ],
  toolbarActions,
  rowActions: [
    { id: 'view', label: '查看' },
    { id: 'edit', label: '修改', visibleWhen: (row) => row.status !== 'completed' },
    { id: 'confirm', label: '确认', visibleWhen: (row) => row.status !== 'completed', confirm: { title: '确认此采购入库单？', description: '确认后，入库单状态会更新为已入库。', confirmLabel: '确认入库' } },
    { id: 'void', label: '作废', variant: 'danger', visibleWhen: (row) => row.status !== 'completed', confirm: { title: '确认作废此采购入库单？', description: '作废后该入库单会从当前列表移除。', confirmLabel: '确认作废', confirmVariant: 'danger' } },
  ],
  resetMessage: '筛选条件已重置',
  queryMessage: '已执行采购入库单查询',
  onHeaderAction: handleHeaderAction,
  onToolbarAction: handleToolbarAction,
  onCellClick: handleCellClick,
  onRowAction: handleRowAction,
};

export function PurchaseInboundListPage(props) {
  return <DocumentListPage {...props} config={inboundListConfig} />;
}
