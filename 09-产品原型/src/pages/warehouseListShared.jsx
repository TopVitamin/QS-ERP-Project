import { useMemo } from 'react';
import { ListPageFrame } from '../components/erp/ListPageFrame.jsx';
import { useListPageActions } from '../hooks/useListPageActions.js';
import { useListPageState } from '../hooks/useListPageState.js';
import { matchesDateRange, hasActiveFilters } from '../lib/listFilters.js';
import {
  canApprove,
  canDisable,
  canEditLogical,
  canEditPhysical,
  canEnable,
  canReject,
  canSubmitAudit,
  canUnapprove,
} from '../lib/warehouseLogic.js';
import { buildInitialVisibility } from '../data/warehouseData.js';
import { readMockRows, subscribeMockRows, writeMockRows } from '../lib/mockStorage.js';

export const physicalInitialFilters = {
  keyword: '',
  contact: '',
  operationType: '',
  dockingType: '',
  dockingSystem: '',
  useStatus: '',
  auditStatus: '',
  updatedAt: { from: '', to: '' },
};

export const logicalInitialFilters = {
  keyword: '',
  physicalWarehouseId: '',
  stockStatus: '',
  useStatus: '',
  auditStatus: '',
  updatedAt: { from: '', to: '' },
};

export const auditTabItems = [
  { value: '', label: '全部' },
  { value: 'draft', label: '草稿' },
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '审核通过' },
  { value: 'rejected', label: '已驳回' },
];

export function filterPhysicalRows(row, filters) {
  const keyword = filters.keyword.trim().toLowerCase();
  const contact = filters.contact.trim().toLowerCase();
  const matchesKeyword = !keyword || [row.code, row.name, row.thirdPartyCode].some((value) => String(value || '').toLowerCase().includes(keyword));
  const matchesContact = !contact || String(row.contact || '').toLowerCase().includes(contact);
  return matchesKeyword
    && matchesContact
    && (!filters.operationType || row.operationType === filters.operationType)
    && (!filters.dockingType || row.dockingType === filters.dockingType)
    && (!filters.dockingSystem || row.dockingSystem === filters.dockingSystem)
    && (!filters.useStatus || row.useStatus === filters.useStatus)
    && (!filters.auditStatus || row.auditStatus === filters.auditStatus)
    && matchesDateRange(row.updatedAt, filters.updatedAt);
}

export function filterLogicalRows(row, filters) {
  const keyword = filters.keyword.trim().toLowerCase();
  const matchesKeyword = !keyword || [row.code, row.name].some((value) => String(value || '').toLowerCase().includes(keyword));
  return matchesKeyword
    && (!filters.physicalWarehouseId || row.physicalWarehouseId === filters.physicalWarehouseId)
    && (!filters.stockStatus || row.stockStatus === filters.stockStatus)
    && (!filters.useStatus || row.useStatus === filters.useStatus)
    && (!filters.auditStatus || row.auditStatus === filters.auditStatus)
    && matchesDateRange(row.updatedAt, filters.updatedAt);
}

export function buildPhysicalRowActions() {
  return [
    { id: 'edit', label: '编辑', visibleWhen: (row) => canEditPhysical(row) },
    { id: 'submit', label: '提交审核', visibleWhen: (row) => canSubmitAudit(row) },
    { id: 'approve', label: '审核通过', visibleWhen: (row) => canApprove(row) },
    { id: 'reject', label: '驳回', variant: 'danger', visibleWhen: (row) => canReject(row) },
    { id: 'unapprove', label: '反审核', visibleWhen: (row) => canUnapprove(row) },
    { id: 'enable', label: '启用', visibleWhen: (row) => canEnable(row) },
    { id: 'disable', label: '禁用', variant: 'danger', visibleWhen: (row) => canDisable(row) },
    { id: 'delete', label: '删除', variant: 'danger' },
  ];
}

export function buildLogicalRowActions() {
  return [
    { id: 'edit', label: '编辑', visibleWhen: (row) => canEditLogical(row) },
    { id: 'submit', label: '提交审核', visibleWhen: (row) => canSubmitAudit(row) },
    { id: 'approve', label: '审核通过', visibleWhen: (row) => canApprove(row) },
    { id: 'reject', label: '驳回', variant: 'danger', visibleWhen: (row) => canReject(row) },
    { id: 'unapprove', label: '反审核', visibleWhen: (row) => canUnapprove(row) },
    { id: 'enable', label: '启用', visibleWhen: (row) => canEnable(row) },
    { id: 'disable', label: '禁用', variant: 'danger', visibleWhen: (row) => canDisable(row) },
    { id: 'delete', label: '删除', variant: 'danger' },
  ];
}

export function WarehouseObjectList({
  title,
  rows,
  storageKey,
  columns,
  initialFilters,
  filterFields,
  filterRows,
  headerActions,
  toolbarActions,
  onToolbarAction,
  onCellClick,
  onRowAction,
  rowActions,
  defaultSort,
  emptyText,
  emptyTextFiltered,
  onFeedback,
  onOpenPage,
}) {
  const state = useListPageState({
    initialRows: rows,
    initialFilters,
    filterRows,
    initialVisibility: buildInitialVisibility(columns),
    storageKey,
    columns,
    initialSort: defaultSort || { key: 'updatedAt', direction: 'desc' },
  });
  const orderedColumns = useMemo(() => {
    const byKey = new Map(columns.map((column) => [column.key, column]));
    const order = [
      ...state.columnOrder.filter((key) => state.pinnedKeys.includes(key)),
      ...state.columnOrder.filter((key) => !state.pinnedKeys.includes(key)),
    ];
    const list = order.map((key) => byKey.get(key)).filter(Boolean);
    for (const column of columns) {
      if (!order.includes(column.key)) list.push(column);
    }
    return list;
  }, [columns, state.columnOrder, state.pinnedKeys]);
  const visibleColumns = useMemo(
    () => orderedColumns.filter((column) => state.visibility[column.key] !== false),
    [orderedColumns, state.visibility],
  );
  const { notify, getSelectedRows } = useListPageActions({ onFeedback, state });
  const actionContext = { state, notify, getSelectedRows, onFeedback, onOpenPage };

  function handleHeaderAction(id) {
    const action = headerActions.find((item) => item.id === id);
    action?.onAction?.(actionContext);
  }

  const tabs = useMemo(() => ({
    items: auditTabItems.map((item) => ({
      ...item,
      count: state.rows.filter((row) => !item.value || row.auditStatus === item.value).length,
    })),
    value: state.appliedFilters.auditStatus ?? '',
    onChange: (value) => state.applyQuickFilter('auditStatus', value),
  }), [state.rows, state.appliedFilters.auditStatus, state.applyQuickFilter]);

  return (
    <ListPageFrame
      header={{
        title,
        actions: headerActions,
        filters: filterFields,
        filterValues: state.draftFilters,
        onFilterChange: state.setFilter,
        onReset: () => {
          state.resetFilters();
          notify('筛选条件已重置', 'info');
        },
        onQuery: () => {
          state.applyFilters();
          notify('已执行仓库查询', 'success');
        },
        onAction: handleHeaderAction,
        actionContext,
      }}
      tabs={tabs}
      toolbar={{
        selectedCount: state.filteredSelectedIds.length,
        actions: toolbarActions || [],
        onAction: (id) => onToolbarAction?.(id, getSelectedRows(), actionContext),
        columnSettings: {
          options: columns.map((column) => ({ key: column.key, label: column.label })),
          visibility: state.visibility,
          order: state.columnOrder,
          pinnedKeys: state.pinnedKeys,
          onToggle: state.setVisibility,
          onPin: state.togglePin,
          onReorder: state.setColumnOrder,
          onReset: state.resetColumns,
        },
      }}
      table={{
        rows: state.pageRows,
        autoFitRows: state.filteredRows,
        columns: visibleColumns,
        selectedIds: state.selectedIds,
        onToggleRow: state.toggleRow,
        onToggleAll: state.togglePage,
        onFeedback,
        emptyText: hasActiveFilters(state.appliedFilters) ? (emptyTextFiltered || '没有符合条件的记录，请调整筛选条件') : (emptyText || '暂无数据'),
        onCellClick: (column, row) => onCellClick(column, row, { ...actionContext, state }),
        onRowAction: (id, row) => onRowAction(id, row, { ...actionContext, state }),
        rowActions,
        rowActionsMaxVisible: 3,
        sort: state.sort,
        onSort: state.toggleSort,
        pinnedKeys: state.pinnedKeys,
      }}
      pagination={{
        total: state.filteredRows.length,
        selectedCount: state.filteredSelectedIds.length,
        currentPage: state.currentPage,
        pageCount: state.pageCount,
        pageSize: state.pageSize,
        onPageChange: state.setPage,
        onPageSizeChange: state.setPageSize,
      }}
    />
  );
}

export function subscribeMockRowsLocal(storageKey, setter, fallback) {
  setter(readMockRows(storageKey, fallback));
  return subscribeMockRows(storageKey, setter);
}

export function upsertMockRowLocal(storageKey, row, setter, fallback) {
  const rows = readMockRows(storageKey, fallback);
  const index = rows.findIndex((item) => item.id === row.id);
  const nextRows = index < 0 ? [row, ...rows] : rows.map((item, itemIndex) => (itemIndex === index ? row : item));
  writeMockRows(storageKey, nextRows);
  setter(nextRows);
}

export function removeMockRowLocal(storageKey, rowId, setter, fallback) {
  const nextRows = readMockRows(storageKey, fallback).filter((item) => item.id !== rowId);
  writeMockRows(storageKey, nextRows);
  setter(nextRows);
}
