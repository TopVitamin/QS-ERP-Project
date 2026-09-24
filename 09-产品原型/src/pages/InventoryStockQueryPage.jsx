import { useMemo, useState } from 'react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { InventoryStockActionDialogs } from '../components/erp/InventoryStockActionDialogs.jsx';
import {
  getInventoryLogicalWarehouseOptions,
  getInventoryPhysicalWarehouseOptions,
} from '../data/warehouseData.js';
import { stockStatusOptions } from '../lib/warehouseLogic.js';
import { matchesBatchSearch, matchesBatchSearchIn, matchesMultiSelect } from '../lib/listFilters.js';
import { getTransferTarget } from '../lib/transferTargets.js';
import { listStockRows } from '../lib/inventoryStockLogic.js';

const initialFilters = {
  logicalWarehouses: [],
  physicalWarehouse: '',
  productCode: '',
  barcode: '',
  productName: '',
  stockStatus: [],
  showZero: false,
};

const filterFields = [
  { key: 'logicalWarehouses', label: '逻辑仓', type: 'multi-select', placeholder: '全部逻辑仓', options: getInventoryLogicalWarehouseOptions() },
  { key: 'physicalWarehouse', label: '所属实体仓', type: 'select', placeholder: '全部实体仓', options: [{ value: '', label: '全部实体仓' }, ...getInventoryPhysicalWarehouseOptions()] },
  { key: 'productCode', label: '商品编码', type: 'search', placeholder: '支持批量输入，多个编码用换行或逗号分隔' },
  { key: 'barcode', label: '商品条码', type: 'search', placeholder: '请输入商品条码，多个值用换行或逗号分隔' },
  { key: 'productName', label: '商品名称', type: 'search', placeholder: '请输入商品名称' },
  { key: 'stockStatus', label: '库存状态', type: 'multi-select', placeholder: '全部', options: stockStatusOptions },
  { key: 'showZero', label: '展示为0的库存数据', type: 'checkbox' },
];

function compareStockRows(left, right) {
  const byWarehouse = String(left.logicalWarehouse).localeCompare(String(right.logicalWarehouse), 'zh-CN', { numeric: true });
  if (byWarehouse !== 0) return byWarehouse;
  return String(left.productCode).localeCompare(String(right.productCode), 'zh-CN', { numeric: true });
}

/** 0 库存行默认不展示；勾选「展示为0的库存数据」后展示（库存查询主PRD Q05、R04）。 */
function isZeroStockRow(row) {
  return !row.instantQty && !row.reservedQty && !row.frozenQty && !row.availableQty;
}

function filterRows(row, filters) {
  if (!filters.showZero && isZeroStockRow(row)) return false;
  if (!matchesMultiSelect(row.logicalWarehouse, filters.logicalWarehouses)) return false;
  if (filters.physicalWarehouse && row.physicalWarehouse !== filters.physicalWarehouse) return false;
  if (!matchesBatchSearch(row.productCode, filters.productCode)) return false;
  if (!matchesBatchSearchIn(row.barcodes, filters.barcode)) return false;
  if (!matchesBatchSearch(row.productName, filters.productName)) return false;
  if (!matchesMultiSelect(row.stockStatus, filters.stockStatus)) return false;
  return true;
}

/** 列表列按《库存查询前端Demo版PRD》§4.2；「预占库存」列在预占大于0时展示「查看来源」。 */
function createColumns(openReservations) {
  return [
    { key: 'logicalWarehouseLabel', label: '逻辑仓', defaultWidth: 200, minWidth: 150, maxWidth: 300, ellipsis: true },
    { key: 'physicalWarehouseLabel', label: '所属实体仓', defaultWidth: 170, minWidth: 130, maxWidth: 260, ellipsis: true },
    { key: 'productCode', label: '商品编码', defaultWidth: 130, minWidth: 110, maxWidth: 180, ellipsis: true },
    { key: 'barcode', label: '商品条码', defaultWidth: 160, minWidth: 120, maxWidth: 220, ellipsis: true },
    { key: 'productName', label: '商品名称', defaultWidth: 170, minWidth: 130, maxWidth: 260, ellipsis: true },
    { key: 'unit', label: '基本单位', defaultWidth: 90, minWidth: 76, maxWidth: 120, ellipsis: true },
    { key: 'stockStatus', label: '库存状态', defaultWidth: 100, minWidth: 88, maxWidth: 140, ellipsis: true, render: (value) => stockStatusOptions.find((option) => option.value === value)?.label || value },
    { key: 'instantQty', label: '即时库存', defaultWidth: 96, minWidth: 88, maxWidth: 140, align: 'right', sortable: true },
    {
      key: 'reservedQty',
      label: '预占库存',
      defaultWidth: 158,
      minWidth: 120,
      maxWidth: 220,
      align: 'right',
      sortable: true,
      render: (value, row) => (row.reservedQty > 0 ? (
        <span className="inline-flex items-center gap-1.5">
          <span>{value}</span>
          <button
            type="button"
            className="px-1 text-erp-primary hover:underline"
            onClick={() => openReservations(row)}
          >
            查看来源
          </button>
        </span>
      ) : value),
    },
    { key: 'frozenQty', label: '冻结库存', defaultWidth: 96, minWidth: 88, maxWidth: 140, align: 'right', sortable: true },
    { key: 'availableQty', label: '可用库存', defaultWidth: 96, minWidth: 88, maxWidth: 140, align: 'right', sortable: true },
    { key: 'updatedAt', label: '最后更新时间', defaultWidth: 170, minWidth: 150, maxWidth: 220, ellipsis: true, sortable: true },
  ];
}

const rowActions = [
  { id: 'freeze', label: '冻结', visibleWhen: (row) => row.availableQty > 0 },
  { id: 'unfreeze', label: '解冻', visibleWhen: (row) => row.frozenQty > 0 },
  { id: 'flow', label: '查看流水' },
];

export function InventoryStockQueryPage(props) {
  const [dialog, setDialog] = useState(null);

  const columns = useMemo(() => createColumns((row) => setDialog({ type: 'reservations', row })), []);
  const initialVisibility = useMemo(() => Object.fromEntries(columns.map((column) => [column.key, true])), [columns]);
  const columnOptions = useMemo(() => columns.map((column) => ({ key: column.key, label: column.label })), [columns]);
  const rows = useMemo(() => listStockRows().sort(compareStockRows), []);

  function handleDialogComplete(result) {
    if (result?.message) props.onFeedback?.(result.message, result.type || 'success');
    if (result?.keepOpen) return;
    setDialog(null);
  }

  function handleRowAction(id, row, { state, onOpenPage }) {
    if (id === 'freeze' || id === 'unfreeze') {
      setDialog({ type: id, row });
      return;
    }
    if (id === 'flow') {
      // 行内「查看流水」按当前行逻辑仓、商品，连同查询区已选条件预填（库存查询主PRD R12）。
      const filters = state.appliedFilters;
      onOpenPage?.('inventory-stock-flow', {
        presetFilters: {
          logicalWarehouses: [row.logicalWarehouse],
          physicalWarehouse: filters.physicalWarehouse,
          productCode: row.productCode,
          barcode: '',
          productName: '',
          stockStatus: filters.stockStatus?.length ? filters.stockStatus : (row.stockStatus ? [row.stockStatus] : []),
        },
      });
    }
  }

  const config = {
    title: '库存查询',
    rows,
    storageKey: 'qs-erp:inventory-stock:v1',
    initialFilters,
    filterRows,
    initialVisibility,
    initialPinnedKeys: ['logicalWarehouseLabel'],
    columns,
    columnOptions,
    filterFields,
    defaultSort: null,
    headerActions: [
      {
        id: 'import-export',
        render: (ctx) => (
          <ImportExportActions
            target={getTransferTarget('inventory-stock-query')}
            scopeSource={{ all: ctx.state.rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
            defaultColumnKeys={columns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
            notify={ctx.notify}
            onOpenPage={ctx.onOpenPage}
          />
        ),
      },
    ],
    toolbarActions: [],
    rowActionsMaxVisible: 3,
    rowActions,
    onRowAction: handleRowAction,
    resetMessage: '筛选条件已重置',
    queryMessage: '已执行库存查询',
    emptyText: '暂无库存记录',
    emptyTextFiltered: '暂无符合条件的库存记录，可调整查询条件后重试',
  };

  return (
    <>
      <DocumentListPage {...props} config={config} />
      <InventoryStockActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onOpenPage={props.onOpenPage}
      />
    </>
  );
}
