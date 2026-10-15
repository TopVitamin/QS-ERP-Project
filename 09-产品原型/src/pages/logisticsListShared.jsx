import { useMemo } from 'react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { matchesDateRange, matchesTextContains } from '../lib/listFilters.js';
import { buildInitialVisibility } from '../data/logisticsData.js';

export const carrierInitialFilters = {
  code: '',
  name: '',
  useStatus: '',
};

export const productInitialFilters = {
  code: '',
  name: '',
  carrierId: '',
  transportType: '',
  useStatus: '',
};

export function filterCarrierRows(row, filters) {
  return matchesTextContains(row.code, filters.code)
    && matchesTextContains(row.name, filters.name)
    && (!filters.useStatus || row.useStatus === filters.useStatus);
}

export function filterProductRows(row, filters) {
  return matchesTextContains(row.code, filters.code)
    && matchesTextContains(row.name, filters.name)
    && (!filters.carrierId || row.carrierId === filters.carrierId)
    && (!filters.transportType || row.transportType === filters.transportType)
    && (!filters.useStatus || row.useStatus === filters.useStatus);
}

/**
 * 物流资料列表：接线统一走 DocumentListPage，这里只做页面 props → config 的适配
 * （查询提示、disabledWhen 的模块上下文包装）。
 */
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
    <DocumentListPage
      onFeedback={onFeedback}
      config={{
        title,
        rows,
        storageKey,
        columns,
        initialFilters,
        filterFields,
        filterRows,
        initialVisibility: buildInitialVisibility(columns),
        defaultSort: { key: 'updatedAt', direction: 'desc' },
        headerActions,
        onHeaderAction: (id, actionContext) => {
          const action = headerActions.find((item) => item.id === id);
          action?.onAction?.(actionContext);
        },
        queryMessage: '已执行物流资料查询',
        toolbarActions: [],
        columnOptions: columns.map((column) => ({ key: column.key, label: column.label })),
        emptyText: emptyText || '暂无数据',
        emptyTextFiltered: emptyTextFiltered || '没有符合条件的记录，请调整筛选条件',
        onCellClick,
        onRowAction,
        rowActions: wrappedRowActions,
        rowActionsMaxVisible: 3,
      }}
    />
  );
}
