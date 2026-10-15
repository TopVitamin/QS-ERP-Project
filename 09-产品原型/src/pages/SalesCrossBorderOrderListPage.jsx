import { useMemo } from 'react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { getTransferTarget } from '../lib/transferTargets.js';
import {
  CROSSBORDER_ORDER_STORAGE_KEY,
  crossBorderOrderColumns,
  crossBorderOrderFilterFields,
  crossBorderOrderInitialFilters,
  crossBorderOrderSeeds,
  filterCrossBorderOrderRows,
  normalizeCrossBorderOrderRows,
} from '../data/crossBorderOrderData.js';

/**
 * 跨境电商订单列表（F01，二版 B3）：只读列表，页头仅导出；无新增、导入、编辑、删除入口。
 * 仅跨境自发货，不提供FBA入口；订单编号为链接列进入详情（主PRD R02、R12、§6.4）。
 */
const initialVisibility = Object.fromEntries(crossBorderOrderColumns.map((column) => [column.key, true]));
const columnOptions = crossBorderOrderColumns.map((column) => ({ key: column.key, label: column.label }));

function handleCellClick(column, row, { onOpenPage }) {
  if (column.key === 'orderNo') onOpenPage?.('sales-crossborder-order-detail', { row });
}

export function SalesCrossBorderOrderListPage(props) {
  const listConfig = useMemo(() => ({
    title: '跨境电商订单',
    rows: crossBorderOrderSeeds,
    storageKey: CROSSBORDER_ORDER_STORAGE_KEY,
    normalizeRows: normalizeCrossBorderOrderRows,
    mergeSeedRows: true,
    initialFilters: crossBorderOrderInitialFilters,
    filterRows: filterCrossBorderOrderRows,
    initialVisibility,
    columns: crossBorderOrderColumns,
    columnOptions,
    filterFields: crossBorderOrderFilterFields,
    defaultSort: { key: 'orderedAt', direction: 'desc' },
    initialPinnedKeys: ['orderNo'],
    headerActions: [
      {
        id: 'import-export',
        render: (ctx) => (
          <ImportExportActions
            target={getTransferTarget('sales-crossborder-order')}
            scopeSource={{ all: ctx.state.rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
            defaultColumnKeys={crossBorderOrderColumns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
            notify={ctx.notify}
            onOpenPage={ctx.onOpenPage}
          />
        ),
      },
    ],
    toolbarActions: [],
    rowActions: [],
    onCellClick: handleCellClick,
    resetMessage: '筛选条件已重置',
    queryMessage: '已执行跨境电商订单查询',
    emptyText: '暂无跨境电商订单',
    emptyTextFiltered: '暂无符合条件的跨境电商订单，可调整查询条件后重试',
  }), []);

  return <DocumentListPage {...props} config={listConfig} />;
}
