import { useEffect, useMemo, useRef } from 'react';
import { ListPageFrame } from './ListPageFrame.jsx';
import { useListPageActions } from '../../hooks/useListPageActions.js';
import { useListPageState } from '../../hooks/useListPageState.js';
import { hasActiveFilters } from '../../lib/listFilters.js';

/**
 * 配置驱动的单据列表页。
 * 列表状态、筛选、列显隐、表格和分页统一接线，业务页面只提供数据与操作规则。
 */
export function DocumentListPage({ onFeedback, onOpenPage, config }) {
  const state = useListPageState({
    initialRows: config.rows,
    initialFilters: config.initialFilters,
    filterRows: config.filterRows,
    initialVisibility: config.initialVisibility,
    storageKey: config.storageKey,
    columns: config.columns,
    initialSort: config.defaultSort,
    initialPinnedKeys: config.initialPinnedKeys,
    normalizeRows: config.normalizeRows,
    mergeSeedRows: config.mergeSeedRows,
  });
  // 跨页跳转预填：调用方把要预填的筛选项交给 presetFilters，本页收到后立即生效（如库存查询跳转库存流水）。
  const presetFiltersKey = config.presetFilters ? JSON.stringify(config.presetFilters) : '';
  const presetStateRef = useRef(state);
  presetStateRef.current = state;
  useEffect(() => {
    if (!presetFiltersKey) return;
    Object.entries(JSON.parse(presetFiltersKey)).forEach(([key, value]) => {
      presetStateRef.current.applyQuickFilter(key, value);
    });
  }, [presetFiltersKey]);
  const orderedColumns = useMemo(() => {
    const byKey = new Map(config.columns.map((column) => [column.key, column]));
    const order = [
      ...state.columnOrder.filter((key) => state.pinnedKeys.includes(key)),
      ...state.columnOrder.filter((key) => !state.pinnedKeys.includes(key)),
    ];
    const list = order.map((key) => byKey.get(key)).filter(Boolean);
    for (const column of config.columns) {
      if (!order.includes(column.key)) list.push(column);
    }
    return list;
  }, [config.columns, state.columnOrder, state.pinnedKeys]);
  const visibleColumns = useMemo(
    () => orderedColumns.filter((column) => state.visibility[column.key] !== false),
    [orderedColumns, state.visibility],
  );
  const { notify, getSelectedRows, getSelectedIds } = useListPageActions({ onFeedback, state });
  const actionContext = { state, notify, getSelectedRows, getSelectedIds, onFeedback, onOpenPage };
  const tabs = useMemo(() => {
    if (!config.tabs) return undefined;
    const { filterKey, items, showCounts = true, resetOnChange = false } = config.tabs;
    return {
      items: items.map((item) => ({
        ...item,
        ...(showCounts
          ? { count: state.rows.filter((row) => !item.value || row[filterKey] === item.value).length }
          : {}),
      })),
      value: state.appliedFilters[filterKey] ?? '',
      onChange: (value) => {
        // 页签切换：resetOnChange 先按初值重置查询（页签值随后覆盖），再应用页签值并通知模块。
        if (resetOnChange) state.resetFilters();
        state.applyQuickFilter(filterKey, value);
        config.tabs.onChange?.(value);
      },
    };
  }, [config.tabs, state.rows, state.appliedFilters, state.applyQuickFilter]);

  return (
    <ListPageFrame
      header={{
        title: config.title,
        actions: config.headerActions,
        filters: config.filterFields,
        filterValues: state.draftFilters,
        onFilterChange: state.setFilter,
        onReset: () => {
          state.resetFilters();
          notify(config.resetMessage || '筛选条件已重置', 'info');
        },
        onQuery: () => {
          state.applyFilters();
          if (config.queryMessage !== null) notify(config.queryMessage || '查询已完成', 'success');
        },
        onAction: (id) => config.onHeaderAction?.(id, actionContext),
        actionContext,
      }}
      tabs={tabs}
      toolbar={{
        selectedCount: state.filteredSelectedIds.length,
        actions: config.toolbarActions,
        onAction: (id) => config.onToolbarAction?.(id, actionContext),
        columnSettings: {
          options: config.columnOptions,
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
        emptyText: hasActiveFilters(state.appliedFilters)
          ? (config.emptyTextFiltered || config.emptyText || '暂无数据')
          : (config.emptyText || '暂无数据'),
        onCellClick: (column, row) => config.onCellClick?.(column, row, actionContext),
        onRowAction: (id, row) => config.onRowAction?.(id, row, actionContext),
        rowActions: config.rowActions,
        rowActionsMaxVisible: config.rowActionsMaxVisible,
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
