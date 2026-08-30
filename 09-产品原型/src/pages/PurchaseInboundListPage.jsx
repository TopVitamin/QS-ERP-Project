import { CircleCheck, Download, PackageCheck, Plus, Printer, RefreshCw, Trash2, Upload, XCircle } from 'lucide-react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { toSelectOptions } from '../lib/options.js';
import { inboundColumns, inboundOrders, inboundStatusLabels } from '../data/inboundData.js';
import { orders } from '../data/orderData.js';

const initialFilters = {
  date: '2026-08-18',
  warehouse: '',
  supplier: [],
  keyword: '',
  status: '',
  operator: '',
  inboundType: '',
};

const filterFields = [
  { key: 'date', label: '单据日期', type: 'date' },
  { key: 'warehouse', label: '入库仓库', type: 'select', options: [{ value: '一号仓', label: '一号仓' }, { value: '二号仓', label: '二号仓' }, { value: '三号仓', label: '三号仓' }] },
  { key: 'supplier', label: '供应商', type: 'multi-select', options: [{ value: '测试', label: '测试' }, { value: '土豆供应商', label: '土豆供应商' }, { value: '中南批发商行', label: '中南批发商行' }, { value: '订货散客', label: '订货散客' }, { value: '我是赠品2', label: '我是赠品2' }, { value: '供应商10086', label: '供应商10086' }, { value: '甲', label: '甲' }] },
  { key: 'keyword', label: '入库单号/采购订单', type: 'search', placeholder: '输入单号或采购订单' },
  { key: 'status', label: '入库状态', type: 'select', options: toSelectOptions(inboundStatusLabels) },
  { key: 'operator', label: '经办人', type: 'select', options: [{ value: '陈小梦CXM', label: '陈小梦CXM' }, { value: '李明', label: '李明' }, { value: '王芳', label: '王芳' }, { value: '张廷ZT', label: '张廷ZT' }] },
  { key: 'inboundType', label: '入库类型', type: 'select', options: [{ value: '采购入库', label: '采购入库' }, { value: '退货入库', label: '退货入库' }, { value: '其他入库', label: '其他入库' }] },
];

const initialVisibility = Object.fromEntries(inboundColumns.map((column) => [column.key, true]));
const columnOptions = inboundColumns.map((column) => ({ key: column.key, label: column.label }));

const toolbarActions = [
  { id: 'confirm-inbound', label: '确认入库', icon: PackageCheck, requiresSelection: true, confirm: { title: '确认处理选中的入库单？', description: '确认后，选中的单据状态会变为已入库。', confirmLabel: '确认入库' } },
  { id: 'void', label: '作废', icon: XCircle, variant: 'danger', requiresSelection: true, confirm: { title: '确认作废选中的入库单？', description: '作废后单据会从当前列表移除，演示数据可以通过刷新页面恢复。', confirmLabel: '确认作废', confirmVariant: 'danger' } },
  { id: 'print', label: '打印', icon: Printer, requiresSelection: true, menuItems: [{ id: 'print-inbound', label: '打印入库单' }, { id: 'print-detail', label: '打印入库明细' }] },
  { id: 'refresh', label: '更新', icon: RefreshCw },
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
  const messages = { create: '已打开新增采购入库单', import: '已打开采购入库单导入', export: '已导出当前采购入库单' };
  notify(messages[id] || id, 'info');
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
  headerActions: [{ id: 'create', label: '新增', icon: Plus, variant: 'primary' }, { id: 'import', label: '导入', icon: Upload }, { id: 'export', label: '导出', icon: Download }],
  toolbarActions,
  rowActions: [
    { id: 'view', label: '查看' },
    { id: 'edit', label: '修改', visibleWhen: (row) => row.status !== 'completed' },
    { id: 'confirm', label: '确认', icon: CircleCheck, visibleWhen: (row) => row.status !== 'completed', confirm: { title: '确认此采购入库单？', description: '确认后，入库单状态会更新为已入库。', confirmLabel: '确认入库' } },
    { id: 'void', label: '作废', icon: Trash2, variant: 'danger', visibleWhen: (row) => row.status !== 'completed', confirm: { title: '确认作废此采购入库单？', description: '作废后该入库单会从当前列表移除。', confirmLabel: '确认作废', confirmVariant: 'danger' } },
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
