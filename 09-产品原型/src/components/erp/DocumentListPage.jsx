import { useMemo } from 'react';
import { ListPageFrame } from './ListPageFrame.jsx';
import { useListPageActions } from '../../hooks/useListPageActions.js';
import { useListPageState } from '../../hooks/useListPageState.js';

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
  });
  const visibleColumns = useMemo(
    () => config.columns.filter((column) => state.visibility[column.key] !== false),
    [config.columns, state.visibility],
  );
  const { notify, getSelectedRows, getSelectedIds } = useListPageActions({ onFeedback, state });
  const actionContext = { state, notify, getSelectedRows, getSelectedIds, onFeedback, onOpenPage };

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
          notify(config.queryMessage || '查询已完成', 'success');
        },
        onAction: (id) => config.onHeaderAction?.(id, actionContext),
      }}
      toolbar={{
        selectedCount: state.filteredSelectedIds.length,
        actions: config.toolbarActions,
        onAction: (id) => config.onToolbarAction?.(id, actionContext),
        columnOptions: config.columnOptions,
        columnVisibility: state.visibility,
        onColumnVisibilityChange: state.setVisibility,
      }}
      table={{
        rows: state.pageRows,
        autoFitRows: state.filteredRows,
        columns: visibleColumns,
        selectedIds: state.selectedIds,
        onToggleRow: state.toggleRow,
        onToggleAll: state.togglePage,
        onFeedback,
        onCellClick: (column, row) => config.onCellClick?.(column, row, actionContext),
        onRowAction: (id, row) => config.onRowAction?.(id, row, actionContext),
        rowActions: config.rowActions,
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
