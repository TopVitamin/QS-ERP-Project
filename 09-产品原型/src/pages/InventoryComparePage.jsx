import { useMemo } from 'react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { compareDirectionLabels } from '../data/inventoryStockData.js';
import { getInventoryPhysicalWarehouseOptions } from '../data/warehouseData.js';
import { stockStatusOptions } from '../lib/warehouseLogic.js';
import {
  matchesBatchSearch,
  matchesBatchSearchIn,
  matchesDateRange,
  matchesMultiSelect,
} from '../lib/listFilters.js';
import { toSelectOptions } from '../lib/options.js';
import { getTransferTarget } from '../lib/transferTargets.js';
import { formatSignedQty, latestCompareTime, loadCompareRows } from '../lib/inventoryStockLogic.js';

const initialFilters = {
  physicalWarehouse: '',
  productCode: '',
  barcode: '',
  productName: '',
  stockStatus: [],
  direction: [],
  compareDate: { from: '', to: '' },
};

const filterFields = [
  { key: 'physicalWarehouse', label: '实体仓', type: 'select', placeholder: '全部实体仓', options: [{ value: '', label: '全部实体仓' }, ...getInventoryPhysicalWarehouseOptions()] },
  { key: 'productCode', label: '商品编码', type: 'search', placeholder: '支持批量输入，多个编码用换行或逗号分隔' },
  { key: 'barcode', label: '商品条码', type: 'search', placeholder: '请输入商品条码，多个值用换行或逗号分隔' },
  { key: 'productName', label: '商品名称', type: 'search', placeholder: '请输入商品名称' },
  { key: 'stockStatus', label: '库存状态', type: 'multi-select', placeholder: '全部', options: stockStatusOptions },
  { key: 'direction', label: '差异方向', type: 'multi-select', placeholder: '全部', options: toSelectOptions(compareDirectionLabels) },
  { key: 'compareDate', label: '比对日期', type: 'date-range', placeholder: '不限' },
];

const columns = [
  { key: 'compareTime', label: '比对时间', defaultWidth: 170, minWidth: 150, maxWidth: 210, ellipsis: true, sortable: true },
  { key: 'physicalWarehouseLabel', label: '实体仓', defaultWidth: 180, minWidth: 140, maxWidth: 280, ellipsis: true },
  { key: 'productCode', label: '商品编码', defaultWidth: 130, minWidth: 110, maxWidth: 180, ellipsis: true },
  { key: 'barcode', label: '商品条码', defaultWidth: 160, minWidth: 120, maxWidth: 220, ellipsis: true },
  { key: 'productName', label: '商品名称', defaultWidth: 170, minWidth: 130, maxWidth: 260, ellipsis: true },
  { key: 'unit', label: '基本单位', defaultWidth: 90, minWidth: 76, maxWidth: 120, ellipsis: true },
  { key: 'stockStatus', label: '库存状态', defaultWidth: 100, minWidth: 88, maxWidth: 140, ellipsis: true, render: (value) => stockStatusOptions.find((option) => option.value === value)?.label || value },
  { key: 'erpQty', label: 'ERP即时库存汇总数量', defaultWidth: 170, minWidth: 140, maxWidth: 220, align: 'right', sortable: true },
  { key: 'warehouseQty', label: '仓库数量', defaultWidth: 110, minWidth: 96, maxWidth: 150, align: 'right', sortable: true },
  { key: 'snapshotTime', label: '快照时间', defaultWidth: 170, minWidth: 150, maxWidth: 210, ellipsis: true },
  { key: 'difference', label: '差异数量', defaultWidth: 110, minWidth: 96, maxWidth: 150, align: 'right', sortable: true, render: (value) => formatSignedQty(value) },
  {
    key: 'direction',
    label: '差异方向',
    defaultWidth: 110,
    minWidth: 96,
    maxWidth: 150,
    ellipsis: true,
    render: (value) => compareDirectionLabels[value] || value,
    tone: (value) => (value === 'none' ? '' : 'text-erp-warning'),
  },
];

const initialVisibility = Object.fromEntries(columns.map((column) => [column.key, true]));
const columnOptions = columns.map((column) => ({ key: column.key, label: column.label }));

/** 查询条件全空时返回最近一次比对结果（库存比对主PRD R07）。 */
function createFilterRows(latestTime) {
  return function filterRows(row, filters) {
    const hasDateFilter = Boolean(filters.compareDate?.from || filters.compareDate?.to);
    if (!hasDateFilter && latestTime && row.compareTime !== latestTime) return false;
    if (filters.physicalWarehouse && row.physicalWarehouse !== filters.physicalWarehouse) return false;
    if (!matchesBatchSearch(row.productCode, filters.productCode)) return false;
    if (!matchesBatchSearchIn(row.barcodes, filters.barcode)) return false;
    if (!matchesBatchSearch(row.productName, filters.productName)) return false;
    if (!matchesMultiSelect(row.stockStatus, filters.stockStatus)) return false;
    if (!matchesMultiSelect(row.direction, filters.direction)) return false;
    if (!matchesDateRange(row.compareTime, filters.compareDate)) return false;
    return true;
  };
}

export function InventoryComparePage(props) {
  const rows = useMemo(() => loadCompareRows(), []);
  const filterRows = useMemo(() => createFilterRows(latestCompareTime()), []);

  const config = {
    title: '库存比对',
    rows,
    storageKey: 'qs-erp:inventory-compare:v1',
    initialFilters,
    filterRows,
    initialVisibility,
    columns,
    columnOptions,
    filterFields,
    defaultSort: { key: 'compareTime', direction: 'desc' },
    headerActions: [
      {
        id: 'import-export',
        render: (ctx) => (
          <ImportExportActions
            target={getTransferTarget('inventory-compare')}
            scopeSource={{ all: ctx.state.rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
            defaultColumnKeys={columns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
            notify={ctx.notify}
            onOpenPage={ctx.onOpenPage}
          />
        ),
      },
    ],
    toolbarActions: [],
    rowActions: [],
    resetMessage: '筛选条件已重置',
    queryMessage: '已执行库存比对查询',
    emptyText: '暂无库存比对结果',
    emptyTextFiltered: '该条件下暂无库存比对结果，可调整查询条件后重试',
  };

  return <DocumentListPage {...props} config={config} />;
}
