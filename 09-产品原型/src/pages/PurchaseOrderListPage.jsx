import { Plus } from 'lucide-react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { getTransferTarget } from '../lib/transferTargets.js';
import { toSelectOptions } from '../lib/options.js';
import { departmentOptions, employeeOptions, supplierOptions } from '../data/masterData.js';
import { purchaseModeOptions } from '../data/purchaseFormData.js';
import { orders, orderStatusLabels, tableColumns } from '../data/orderData.js';

const initialFilters = {
  date: '',
  mode: '普通采购',
  supplier: [],
  settleSupplier: '',
  keyword: '',
  auditStatus: '',
  salesman: '',
  department: '',
  executionStatus: '',
  inboundStatus: '',
  closeStatus: '',
  paymentStatus: '',
};

const filterFields = [
  { key: 'date', label: '单据日期', type: 'date' },
  { key: 'mode', label: '采购模式', type: 'select', options: purchaseModeOptions },
  { key: 'supplier', label: '供应商', type: 'multi-select', options: supplierOptions },
  { key: 'settleSupplier', label: '结算供应商', type: 'select', options: supplierOptions },
  { key: 'keyword', label: '单据编号/供应商', type: 'search', placeholder: '输入单据编号或供应商' },
  { key: 'auditStatus', label: '审核状态', type: 'select', options: toSelectOptions(orderStatusLabels.auditStatus) },
  { key: 'salesman', label: '业务员', type: 'select', options: employeeOptions },
  { key: 'department', label: '部门', type: 'select', options: departmentOptions },
  { key: 'executionStatus', label: '执行状态', type: 'select', options: toSelectOptions(orderStatusLabels.executionStatus) },
  { key: 'inboundStatus', label: '入库状态', type: 'select', options: toSelectOptions(orderStatusLabels.inboundStatus) },
  { key: 'closeStatus', label: '关闭状态', type: 'select', options: toSelectOptions(orderStatusLabels.closeStatus) },
  { key: 'paymentStatus', label: '付款状态', type: 'select', options: toSelectOptions(orderStatusLabels.paymentStatus) },
];

const initialVisibility = Object.fromEntries(tableColumns.map((column) => [column.key, true]));
const columnOptions = tableColumns.map((column) => ({ key: column.key, label: column.label }));

const toolbarActions = [
  {
    id: 'approve',
    label: '审核',
    requiresSelection: true,
    menuItems: [
      {
        id: 'approve',
        label: '审核选中单据',
        confirm: {
          title: '确认审核选中的采购订单？',
          description: '审核后单据将进入可执行状态，请确认所选数据无误。',
          confirmLabel: '确认审核',
        },
      },
      {
        id: 'unapprove',
        label: '反审核选中单据',
        confirm: {
          title: '确认反审核选中的采购订单？',
          description: '反审核后单据将恢复为未审核状态。',
          confirmLabel: '确认反审核',
        },
      },
    ],
  },
  { id: 'delete', label: '删除', variant: 'danger', requiresSelection: true, confirm: { title: '确认删除选中的采购订单？', description: '删除后不会再出现在当前列表中，演示数据可以通过刷新页面恢复。', confirmLabel: '确认删除', confirmVariant: 'danger' } },
  { id: 'print', label: '打印', requiresSelection: true, menuItems: [{ id: 'print-list', label: '打印采购订单' }, { id: 'print-detail', label: '打印订单明细' }] },
  { id: 'refresh', label: '更新' },
];

function filterRows(row, filters) {
  const keyword = filters.keyword.trim().toLowerCase();
  const matchesKeyword = !keyword || [row.orderNo, row.supplier, row.settleSupplier].some((value) => String(value || '').toLowerCase().includes(keyword));
  const suppliers = Array.isArray(filters.supplier) ? filters.supplier : filters.supplier ? [filters.supplier] : [];
  return (!filters.date || row.date === filters.date)
    && (!filters.mode || row.mode === filters.mode)
    && (!suppliers.length || suppliers.includes(row.supplier))
    && (!filters.settleSupplier || row.settleSupplier === filters.settleSupplier)
    && (!filters.auditStatus || row.auditStatus === filters.auditStatus)
    && (!filters.salesman || row.salesman === filters.salesman)
    && (!filters.department || row.department === filters.department)
    && (!filters.executionStatus || row.executionStatus === filters.executionStatus)
    && (!filters.inboundStatus || row.inboundStatus === filters.inboundStatus)
    && (!filters.closeStatus || row.closeStatus === filters.closeStatus)
    && (!filters.paymentStatus || row.paymentStatus === filters.paymentStatus)
    && matchesKeyword;
}

function handleHeaderAction(id, { notify, onOpenPage }) {
  if (id === 'create') {
    onOpenPage?.('purchase-order-create');
    return;
  }
  notify(id, 'info');
}

function handleToolbarAction(id, { state, notify, getSelectedRows, getSelectedIds }) {
  const selectedRows = getSelectedRows();
  const selectedIds = getSelectedIds();

  if (id === 'approve') {
    const pendingRows = selectedRows.filter((row) => row.auditStatus === 'pending');
    if (!pendingRows.length) {
      notify('所选单据均已审核，无需重复操作', 'warning');
      return;
    }
    state.updateRows(pendingRows.map((row) => row.id), (row) => ({ ...row, auditStatus: 'approved' }));
    notify(`已成功审核 ${pendingRows.length} 条采购订单`, 'success');
    return;
  }
  if (id === 'unapprove') {
    const approvedRows = selectedRows.filter((row) => row.auditStatus === 'approved');
    if (!approvedRows.length) {
      notify('所选单据均未审核，无法反审核', 'warning');
      return;
    }
    state.updateRows(approvedRows.map((row) => row.id), (row) => ({ ...row, auditStatus: 'pending' }));
    notify(`已成功反审核 ${approvedRows.length} 条采购订单`, 'success');
    return;
  }
  if (id === 'delete') {
    if (!selectedIds.length) {
      notify('请先选择要删除的采购订单', 'warning');
      return;
    }
    state.removeRows(selectedIds);
    notify(`已成功删除 ${selectedIds.length} 条采购订单`, 'success');
    return;
  }
  if (id === 'print-list' || id === 'print-detail') {
    notify('已生成采购订单打印预览', 'info');
    return;
  }
  if (id === 'refresh') notify('采购订单列表已更新', 'success');
}

function handleCellClick(column, row, { onOpenPage }) {
  if (column.key === 'orderNo') onOpenPage?.('purchase-order-detail', { row });
}

function handleRowAction(id, row, { state, notify, onOpenPage }) {
  if (id === 'view') {
    onOpenPage?.('purchase-order-detail', { row });
    return;
  }
  if (id === 'edit') {
    onOpenPage?.('purchase-order-edit', { row });
    return;
  }
  if (id === 'enable') {
    if (row.closeStatus !== 'closed') {
      notify(`${row.orderNo} 当前未关闭，无需启用`, 'warning');
      return;
    }
    state.updateRow(row.id, (current) => ({ ...current, closeStatus: 'open' }));
    notify(`${row.orderNo} 已成功启用`, 'success');
    return;
  }
  if (id === 'close') {
    if (row.closeStatus === 'closed') {
      notify(`${row.orderNo} 已关闭，无需重复操作`, 'warning');
      return;
    }
    state.updateRow(row.id, (current) => ({ ...current, closeStatus: 'closed' }));
    notify(`${row.orderNo} 已成功关闭`, 'success');
    return;
  }
  if (id === 'inbound') {
    if (row.inboundStatus === 'completed') {
      notify(`${row.orderNo} 已完成入库，无需重复操作`, 'warning');
      return;
    }
    state.updateRow(row.id, (current) => ({ ...current, executionStatus: 'completed', inboundStatus: 'completed' }));
    notify(`${row.orderNo} 已成功入库`, 'success');
  }
}

const orderListConfig = {
  title: '采购订单列表',
  rows: orders,
  storageKey: 'qs-erp:purchase-orders:v1',
  initialFilters,
  filterRows,
  initialVisibility,
  columns: tableColumns,
  columnOptions,
  filterFields,
  headerActions: [
    { id: 'create', label: '新增', icon: Plus, variant: 'primary' },
    {
      id: 'import-export',
      render: (ctx) => (
        <ImportExportActions
          target={getTransferTarget('purchase-order')}
          scopeSource={{ all: ctx.state.rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
          defaultColumnKeys={tableColumns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
          notify={ctx.notify}
          onOpenPage={ctx.onOpenPage}
        />
      ),
    },
  ],
  toolbarActions,
  rowActions: [
    { id: 'view', label: '查看' },
    { id: 'edit', label: '修改', visibleWhen: (row) => row.closeStatus !== 'closed' },
    { id: 'close', label: '关闭', visibleWhen: (row) => row.closeStatus !== 'closed', confirm: { title: '确认关闭此采购订单？', description: '关闭后将不能继续执行采购订单，后续可以通过启用恢复。', confirmLabel: '确认关闭' } },
    { id: 'enable', label: '启用', visibleWhen: (row) => row.closeStatus === 'closed', confirm: { title: '确认启用此采购订单？', description: '启用后单据可继续执行采购流程。', confirmLabel: '确认启用' } },
    { id: 'inbound', label: '入库', visibleWhen: (row) => row.inboundStatus !== 'completed' },
  ],
  resetMessage: '筛选条件已重置',
  queryMessage: '已执行采购订单查询',
  onHeaderAction: handleHeaderAction,
  onToolbarAction: handleToolbarAction,
  onCellClick: handleCellClick,
  onRowAction: handleRowAction,
};

export function PurchaseOrderListPage(props) {
  return <DocumentListPage {...props} config={orderListConfig} />;
}
