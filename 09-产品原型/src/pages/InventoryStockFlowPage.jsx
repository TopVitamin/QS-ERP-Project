import { useMemo } from 'react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import {
  getInventoryLogicalWarehouseOptions,
  getInventoryPhysicalWarehouseOptions,
} from '../data/warehouseData.js';
import {
  otherInboundBusinessTypeLabels,
  otherOutboundBusinessTypeLabels,
  stockDirectionLabels,
  stockSourceTypeLabels,
} from '../data/inventoryStockData.js';
import { stockStatusOptions } from '../lib/warehouseLogic.js';
import {
  matchesBatchSearch,
  matchesBatchSearchIn,
  matchesDateTimeRange,
  matchesMultiSelect,
} from '../lib/listFilters.js';
import { toSelectOptions } from '../lib/options.js';
import { getTransferTarget } from '../lib/transferTargets.js';
import { formatQtyChange, loadStockFlows } from '../lib/inventoryStockLogic.js';
import { resolveResultDocument } from '../lib/inventoryResultDocs.js';

const businessTypeOptions = [
  { value: '', label: '全部' },
  ...Object.values(otherInboundBusinessTypeLabels).map((label) => ({ value: label, label: `其他入库：${label}` })),
  ...Object.values(otherOutboundBusinessTypeLabels).map((label) => ({ value: label, label: `其他出库：${label}` })),
];

const initialFilters = {
  logicalWarehouses: [],
  physicalWarehouse: '',
  productCode: '',
  barcode: '',
  productName: '',
  stockStatus: [],
  direction: '',
  timeRange: { from: '', to: '' },
  sourceType: '',
  sourceNo: '',
  businessType: '',
};

const filterFields = [
  { key: 'logicalWarehouses', label: '逻辑仓', type: 'multi-select', placeholder: '全部逻辑仓', options: getInventoryLogicalWarehouseOptions() },
  { key: 'physicalWarehouse', label: '所属实体仓', type: 'select', placeholder: '全部实体仓', options: [{ value: '', label: '全部实体仓' }, ...getInventoryPhysicalWarehouseOptions()] },
  { key: 'productCode', label: '商品编码', type: 'search', placeholder: '支持批量输入，多个编码用换行或逗号分隔' },
  { key: 'barcode', label: '商品条码', type: 'search', placeholder: '请输入商品条码，多个值用换行或逗号分隔' },
  { key: 'productName', label: '商品名称', type: 'search', placeholder: '请输入商品名称' },
  { key: 'stockStatus', label: '库存状态', type: 'multi-select', placeholder: '全部', options: stockStatusOptions },
  { key: 'direction', label: '变动方向', type: 'select', placeholder: '全部', options: [{ value: '', label: '全部' }, ...toSelectOptions(stockDirectionLabels)] },
  { key: 'timeRange', label: '变动时间', type: 'datetime-range', placeholder: '不限' },
  { key: 'sourceType', label: '来源单据类型', type: 'select', placeholder: '全部', options: [{ value: '', label: '全部' }, ...toSelectOptions(stockSourceTypeLabels)] },
  { key: 'sourceNo', label: '来源单号', type: 'search', placeholder: '请输入来源单号' },
  { key: 'businessType', label: '业务类型', type: 'select', placeholder: '全部', options: businessTypeOptions },
];

function filterRows(row, filters) {
  if (!matchesMultiSelect(row.logicalWarehouse, filters.logicalWarehouses)) return false;
  if (filters.physicalWarehouse && row.physicalWarehouse !== filters.physicalWarehouse) return false;
  if (!matchesBatchSearch(row.productCode, filters.productCode)) return false;
  if (!matchesBatchSearchIn(row.barcodes, filters.barcode)) return false;
  if (!matchesBatchSearch(row.productName, filters.productName)) return false;
  if (!matchesMultiSelect(row.stockStatus, filters.stockStatus)) return false;
  if (filters.direction && row.direction !== filters.direction) return false;
  if (!matchesDateTimeRange(row.time, filters.timeRange)) return false;
  if (filters.sourceType && row.sourceType !== stockSourceTypeLabels[filters.sourceType]) return false;
  if (!matchesBatchSearch(row.sourceNo, filters.sourceNo)) return false;
  if (filters.businessType && row.businessType !== filters.businessType) return false;
  return true;
}

const columns = [
  { key: 'time', label: '变动时间', defaultWidth: 170, minWidth: 150, maxWidth: 210, ellipsis: true, sortable: true },
  { key: 'eventTypeLabel', label: '事件类型', defaultWidth: 110, minWidth: 96, maxWidth: 150, ellipsis: true },
  { key: 'logicalWarehouseLabel', label: '逻辑仓', defaultWidth: 200, minWidth: 150, maxWidth: 300, ellipsis: true },
  { key: 'physicalWarehouseLabel', label: '所属实体仓', defaultWidth: 170, minWidth: 130, maxWidth: 260, ellipsis: true },
  { key: 'productCode', label: '商品编码', defaultWidth: 130, minWidth: 110, maxWidth: 180, ellipsis: true },
  { key: 'barcode', label: '商品条码', defaultWidth: 160, minWidth: 120, maxWidth: 220, ellipsis: true },
  { key: 'productName', label: '商品名称', defaultWidth: 170, minWidth: 130, maxWidth: 260, ellipsis: true },
  { key: 'unit', label: '基本单位', defaultWidth: 90, minWidth: 76, maxWidth: 120, ellipsis: true },
  { key: 'stockStatus', label: '库存状态', defaultWidth: 100, minWidth: 88, maxWidth: 140, ellipsis: true, render: (value) => stockStatusOptions.find((option) => option.value === value)?.label || value },
  { key: 'instant', label: '即时库存', defaultWidth: 150, minWidth: 130, maxWidth: 200, align: 'right', render: (_, row) => formatQtyChange(row.instantBefore, row.instantChange) },
  { key: 'available', label: '可用库存', defaultWidth: 150, minWidth: 130, maxWidth: 200, align: 'right', render: (_, row) => formatQtyChange(row.availableBefore, row.availableChange) },
  { key: 'reserved', label: '预占库存', defaultWidth: 150, minWidth: 130, maxWidth: 200, align: 'right', render: (_, row) => formatQtyChange(row.reservedBefore, row.reservedChange) },
  { key: 'frozen', label: '冻结库存', defaultWidth: 150, minWidth: 130, maxWidth: 200, align: 'right', render: (_, row) => formatQtyChange(row.frozenBefore, row.frozenChange) },
  { key: 'sourceType', label: '来源单据类型', defaultWidth: 130, minWidth: 110, maxWidth: 180, ellipsis: true },
  { key: 'sourceNo', label: '来源单号', defaultWidth: 190, minWidth: 160, maxWidth: 240, ellipsis: true, link: (row) => Boolean(row.sourceNo) },
  { key: 'businessType', label: '业务类型', defaultWidth: 110, minWidth: 96, maxWidth: 150, ellipsis: true },
];

/** 列表列 key → 导出字段 key：四组变动明细在列表用 render 展示，导出字段是同值的文本列。 */
const exportKeyByColumnKey = {
  instant: 'instantChangeText',
  available: 'availableChangeText',
  reserved: 'reservedChangeText',
  frozen: 'frozenChangeText',
};

const initialVisibility = Object.fromEntries(columns.map((column) => [column.key, true]));
const columnOptions = columns.map((column) => ({ key: column.key, label: column.label }));

function handleCellClick(column, row, { onFeedback, onOpenPage }) {
  if (column.key !== 'sourceNo' || !row.sourceNo) return;
  const target = resolveResultDocument(row.sourceType, row.sourceNo);
  if (!target) {
    onFeedback?.('来源单据不存在或不可访问', 'warning');
    return;
  }
  onOpenPage?.(target.pageId, { row: target.row, docNo: row.sourceNo });
}

export function InventoryStockFlowPage(props) {
  const rows = useMemo(() => loadStockFlows(), []);

  const config = {
    title: '库存流水',
    rows,
    storageKey: 'qs-erp:inventory-flows:v1',
    initialFilters,
    filterRows,
    initialVisibility,
    columns,
    columnOptions,
    filterFields,
    defaultSort: { key: 'time', direction: 'desc' },
    presetFilters: props.context?.presetFilters,
    headerActions: [
      {
        id: 'import-export',
        render: (ctx) => (
          <ImportExportActions
            target={getTransferTarget('inventory-stock-flow')}
            scopeSource={{ all: ctx.state.rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
            defaultColumnKeys={columns
              .filter((column) => ctx.state.visibility[column.key] !== false)
              .map((column) => exportKeyByColumnKey[column.key] || column.key)
              .filter((key) => key)}
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
    queryMessage: '已执行库存流水查询',
    emptyText: '暂无库存变动记录',
    emptyTextFiltered: '该条件下暂无库存变动记录，可调整查询条件后重试',
  };

  return <DocumentListPage {...props} config={config} />;
}
