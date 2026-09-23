import { useMemo } from 'react';
import { ListPageFrame } from '../components/erp/ListPageFrame.jsx';
import { useListPageActions } from '../hooks/useListPageActions.js';
import { useListPageState } from '../hooks/useListPageState.js';
import { matchesDateRange, hasActiveFilters } from '../lib/listFilters.js';
import { buildInitialVisibility } from '../data/logisticsData.js';

export const carrierInitialFilters = {
  keyword: '',
  useStatus: '',
  updatedAt: { from: '', to: '' },
};

export const productInitialFilters = {
  keyword: '',
  carrierId: '',
  transportType: '',
  useStatus: '',
  updatedAt: { from: '', to: '' },
};

export function filterCarrierRows(row, filters) {
  const keyword = filters.keyword.trim().toLowerCase();
  const matchesKeyword = !keyword || [row.code, row.name, row.contact, row.phone].some((value) => String(value || '').toLowerCase().includes(keyword));
  return matchesKeyword
    && (!filters.useStatus || row.useStatus === filters.useStatus)
    && matchesDateRange(row.updatedAt, filters.updatedAt);
}

export function filterProductRows(row, filters) {
  const keyword = filters.keyword.trim().toLowerCase();
  const matchesKeyword = !keyword || [row.code, row.name].some((value) => String(value || '').toLowerCase().includes(keyword));
  return matchesKeyword
    && (!filters.carrierId || row.carrierId === filters.carrierId)
    && (!filters.transportType || row.transportType === filters.transportType)
    && (!filters.useStatus || row.useStatus === filters.useStatus)
    && matchesDateRange(row.updatedAt, filters.updatedAt);
}

export function LogisticsObjectList({
  title,
  rows,
  storageKey,
  columns,
  initialFilters,
  filterFields,
  filterRows,
  headerActions,
  onCellClick,
  onRowAction,
  rowActions,
  rowActionContext,
  emptyText,
  emptyTextFiltered,
  onFeedback,
}) {
  const state = useListPageState({
    initialRows: rows,
    initialFilters,
    filterRows,
    initialVisibility: buildInitialVisibility(columns),
    storageKey,
    columns,
    initialSort: { key: 'updatedAt', direction: 'desc' },
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
  const actionContext = { state, notify, getSelectedRows, onFeedback };

  function handleHeaderAction(id) {
    const action = headerActions.find((item) => item.id === id);
    action?.onAction?.(actionContext);
  }

  const wrappedRowActions = useMemo(
    () => rowActions.map((action) => ({
      ...action,
      disabledWhen: action.disabledWhen
        ? (row) => action.disabledWhen(row, rowActionContext)
        : undefined,
    })),
    [rowActions, rowActionContext],
  );

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
          notify('已执行物流资料查询', 'success');
        },
        onAction: handleHeaderAction,
        actionContext,
      }}
      toolbar={{
        selectedCount: state.filteredSelectedIds.length,
        actions: [],
        onAction: () => {},
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
        onCellClick: (column, row) => onCellClick(column, row, actionContext),
        onRowAction: (id, row) => onRowAction(id, row, actionContext),
        rowActions: wrappedRowActions,
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
