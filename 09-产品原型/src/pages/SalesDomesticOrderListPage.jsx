import { useMemo } from 'react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { getTransferTarget } from '../lib/transferTargets.js';
import {
  DOMESTIC_ORDER_STORAGE_KEY,
  domesticOrderColumns,
  domesticOrderFilterFields,
  domesticOrderInitialFilters,
  domesticOrderSeeds,
  filterDomesticOrderRows,
  normalizeDomesticOrderRows,
} from '../data/domesticOrderData.js';

/**
 * 国内电商订单列表（F01，二版 B3）：只读列表，页头仅导出；无新增、导入、编辑、删除入口。
 * 订单编号为链接列进入详情；行内无业务按钮，不出现占库、下推仓、发货指令类动作（主PRD R02、§6.4）。
 */
const initialVisibility = Object.fromEntries(domesticOrderColumns.map((column) => [column.key, true]));
const columnOptions = domesticOrderColumns.map((column) => ({ key: column.key, label: column.label }));

function handleCellClick(column, row, { onOpenPage }) {
  if (column.key === 'orderNo') onOpenPage?.('sales-domestic-order-detail', { row });
}

export function SalesDomesticOrderListPage(props) {
  const listConfig = useMemo(() => ({
    title: '国内电商订单',
    rows: domesticOrderSeeds,
    storageKey: DOMESTIC_ORDER_STORAGE_KEY,
    normalizeRows: normalizeDomesticOrderRows,
    mergeSeedRows: true,
    initialFilters: domesticOrderInitialFilters,
    filterRows: filterDomesticOrderRows,
    initialVisibility,
    columns: domesticOrderColumns,
    columnOptions,
    filterFields: domesticOrderFilterFields,
    defaultSort: { key: 'orderedAt', direction: 'desc' },
    initialPinnedKeys: ['orderNo'],
    headerActions: [
      {
        id: 'import-export',
        render: (ctx) => (
          <ImportExportActions
            target={getTransferTarget('sales-domestic-order')}
            scopeSource={{ all: ctx.state.rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
            defaultColumnKeys={domesticOrderColumns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
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
    queryMessage: '已执行国内电商订单查询',
    emptyText: '暂无国内电商订单',
    emptyTextFiltered: '暂无符合条件的国内电商订单，可调整查询条件后重试',
  }), []);

  return <DocumentListPage {...props} config={listConfig} />;
}
