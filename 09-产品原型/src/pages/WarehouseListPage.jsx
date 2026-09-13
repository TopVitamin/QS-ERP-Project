import { Plus } from 'lucide-react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { toSelectOptions } from '../lib/options.js';
import { getTransferTarget } from '../lib/transferTargets.js';
import { warehouseColumns, warehouseStatusLabels, warehouseUseStatusLabels, warehouses } from '../data/warehouseData.js';

const initialFilters = {
  keyword: '',
  operationType: '',
  dockingType: '',
  dockingSystem: '',
  useStatus: '',
  auditStatus: '',
};

const filterFields = [
  { key: 'keyword', label: '编码/名称/联系人', type: 'search', placeholder: '输入编码、名称或联系人' },
  { key: 'operationType', label: '运营类型', type: 'select', options: [{ value: '自营', label: '自营' }, { value: '第三方', label: '第三方' }] },
  { key: 'dockingType', label: '对接方式', type: 'select', options: [{ value: '直连', label: '直连' }, { value: 'SaaS中转', label: 'SaaS中转' }] },
  { key: 'dockingSystem', label: '对接系统', type: 'select', options: [{ value: '仓库作业系统', label: '仓库作业系统' }, { value: '聚水潭', label: '聚水潭' }, { value: '领星', label: '领星' }] },
  { key: 'useStatus', label: '使用状态', type: 'select', options: toSelectOptions(warehouseUseStatusLabels) },
];

const initialVisibility = Object.fromEntries(warehouseColumns.map((column) => [column.key, true]));
const columnOptions = warehouseColumns.map((column) => ({ key: column.key, label: column.label }));

const toolbarActions = [
  {
    id: 'submit',
    label: '提交审核',
    requiresSelection: true,
    confirm: {
      title: '确认提交选中的仓库档案？',
      description: '提交后进入待审核状态，由主数据管理员审核。',
      confirmLabel: '确认提交',
    },
  },
  {
    id: 'approve',
    label: '审核通过',
    requiresSelection: true,
    confirm: {
      title: '确认审核通过选中的仓库档案？',
      description: '审核通过后该仓库可被采购入库、销售出库等业务引用。',
      confirmLabel: '确认通过',
    },
  },
  {
    id: 'reject',
    label: '驳回',
    variant: 'danger',
    requiresSelection: true,
    confirm: {
      title: '确认驳回选中的仓库档案？',
      description: '驳回后档案回到已驳回状态，可修改后重新提交。',
      confirmLabel: '确认驳回',
      confirmVariant: 'danger',
    },
  },
  { id: 'delete', label: '删除', variant: 'danger', requiresSelection: true, confirm: { title: '确认删除选中的仓库档案？', description: '删除后不会再出现在当前列表中，演示数据可以通过刷新页面恢复。', confirmLabel: '确认删除', confirmVariant: 'danger' } },
  { id: 'refresh', label: '更新' },
];

function filterRows(row, filters) {
  const keyword = filters.keyword.trim().toLowerCase();
  const matchesKeyword = !keyword || [row.code, row.name, row.contact].some((value) => String(value || '').toLowerCase().includes(keyword));
  return (!filters.operationType || row.operationType === filters.operationType)
    && (!filters.dockingType || row.dockingType === filters.dockingType)
    && (!filters.dockingSystem || row.dockingSystem === filters.dockingSystem)
    && (!filters.useStatus || row.useStatus === filters.useStatus)
    && (!filters.auditStatus || row.auditStatus === filters.auditStatus)
    && matchesKeyword;
}

function handleHeaderAction(id, { notify }) {
  if (id === 'create') {
    notify('仓库新建页将在后续接入', 'info');
    return;
  }
  notify(id, 'info');
}

function handleToolbarAction(id, { state, notify, getSelectedRows }) {
  const selectedRows = getSelectedRows();

  if (id === 'submit') {
    const targetRows = selectedRows.filter((row) => row.auditStatus === 'draft' || row.auditStatus === 'rejected');
    if (!targetRows.length) {
      notify('所选档案均无需提交，仅草稿或已驳回状态可提交审核', 'warning');
      return;
    }
    state.updateRows(targetRows.map((row) => row.id), (row) => ({ ...row, auditStatus: 'pending' }));
    notify(`已提交 ${targetRows.length} 个仓库档案，等待审核`, 'success');
    return;
  }
  if (id === 'approve') {
    const targetRows = selectedRows.filter((row) => row.auditStatus === 'pending');
    if (!targetRows.length) {
      notify('所选档案中没有待审核数据', 'warning');
      return;
    }
    state.updateRows(targetRows.map((row) => row.id), (row) => ({ ...row, auditStatus: 'approved' }));
    notify(`已审核通过 ${targetRows.length} 个仓库档案`, 'success');
    return;
  }
  if (id === 'reject') {
    const targetRows = selectedRows.filter((row) => row.auditStatus === 'pending');
    if (!targetRows.length) {
      notify('所选档案中没有待审核数据', 'warning');
      return;
    }
    state.updateRows(targetRows.map((row) => row.id), (row) => ({ ...row, auditStatus: 'rejected' }));
    notify(`已驳回 ${targetRows.length} 个仓库档案`, 'success');
    return;
  }
  if (id === 'delete') {
    state.removeRows(getSelectedRows().map((row) => row.id));
    notify(`已删除 ${selectedRows.length} 个仓库档案`, 'success');
    return;
  }
  if (id === 'refresh') notify('仓库列表已更新', 'success');
}

function handleCellClick(column, row, { notify }) {
  if (column.key === 'code') notify(`仓库详情页将在后续接入：${row.code}`, 'info');
}

function handleRowAction(id, row, { state, notify }) {
  if (id === 'view') {
    notify(`仓库详情页将在后续接入：${row.code}`, 'info');
    return;
  }
  if (id === 'edit') {
    notify(`仓库编辑页将在后续接入：${row.code}`, 'info');
    return;
  }
  if (id === 'submit') {
    state.updateRow(row.id, (current) => ({ ...current, auditStatus: 'pending' }));
    notify(`${row.code} 已提交审核`, 'success');
    return;
  }
  if (id === 'approve') {
    state.updateRow(row.id, (current) => ({ ...current, auditStatus: 'approved' }));
    notify(`${row.code} 已审核通过`, 'success');
    return;
  }
  if (id === 'reject') {
    state.updateRow(row.id, (current) => ({ ...current, auditStatus: 'rejected' }));
    notify(`${row.code} 已驳回`, 'success');
    return;
  }
  if (id === 'enable') {
    state.updateRow(row.id, (current) => ({ ...current, useStatus: 'enabled' }));
    notify(`${row.code} 已启用`, 'success');
    return;
  }
  if (id === 'disable') {
    state.updateRow(row.id, (current) => ({ ...current, useStatus: 'disabled' }));
    notify(`${row.code} 已禁用`, 'success');
  }
}

const warehouseListConfig = {
  title: '仓库列表',
  rows: warehouses,
  storageKey: 'qs-erp:warehouses:v1',
  initialFilters,
  filterRows,
  initialVisibility,
  columns: warehouseColumns,
  columnOptions,
  filterFields,
  headerActions: [
    { id: 'create', label: '新增', icon: Plus, variant: 'primary' },
    {
      id: 'import-export',
      render: (ctx) => (
        <ImportExportActions
          target={getTransferTarget('warehouse')}
          scopeSource={{ all: ctx.state.rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
          defaultColumnKeys={warehouseColumns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
          notify={ctx.notify}
          onOpenPage={ctx.onOpenPage}
        />
      ),
    },
  ],
  tabs: {
    filterKey: 'auditStatus',
    items: [
      { value: '', label: '全部' },
      { value: 'draft', label: '草稿' },
      { value: 'pending', label: '待审核' },
      { value: 'approved', label: '已审核' },
      { value: 'rejected', label: '已驳回' },
    ],
  },
  toolbarActions,
  rowActions: [
    { id: 'view', label: '查看' },
    { id: 'edit', label: '编辑', visibleWhen: (row) => row.auditStatus === 'draft' || row.auditStatus === 'rejected' },
    { id: 'submit', label: '提交', visibleWhen: (row) => row.auditStatus === 'draft' || row.auditStatus === 'rejected', confirm: { title: '确认提交此仓库档案？', description: '提交后进入待审核状态。', confirmLabel: '确认提交' } },
    { id: 'approve', label: '审核', visibleWhen: (row) => row.auditStatus === 'pending', confirm: { title: '确认审核通过此仓库档案？', description: '通过后该仓库可被业务单据引用。', confirmLabel: '确认通过' } },
    { id: 'reject', label: '驳回', variant: 'danger', visibleWhen: (row) => row.auditStatus === 'pending', confirm: { title: '确认驳回此仓库档案？', description: '驳回后可修改并重新提交。', confirmLabel: '确认驳回', confirmVariant: 'danger' } },
    { id: 'disable', label: '禁用', variant: 'danger', visibleWhen: (row) => row.useStatus === 'enabled', confirm: { title: '确认禁用此仓库？', description: '禁用仅阻止新增业务引用，已有数据不受影响。', confirmLabel: '确认禁用', confirmVariant: 'danger' } },
    { id: 'enable', label: '启用', visibleWhen: (row) => row.useStatus !== 'enabled' },
  ],
  resetMessage: '筛选条件已重置',
  queryMessage: '已执行仓库查询',
  onHeaderAction: handleHeaderAction,
  onToolbarAction: handleToolbarAction,
  onCellClick: handleCellClick,
  onRowAction: handleRowAction,
};

export function WarehouseListPage(props) {
  return <DocumentListPage {...props} config={warehouseListConfig} />;
}
