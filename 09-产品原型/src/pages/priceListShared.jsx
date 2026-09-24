import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { getSelectableCustomerOptions } from '../data/customerData.js';
import {
  buildInitialVisibility,
  purchasePriceColumns,
  purchasePrices,
  salesPriceColumns,
  salesPrices,
} from '../data/priceData.js';
import { getSelectableSupplierOptions } from '../data/supplierData.js';
import { getTransferTarget } from '../lib/transferTargets.js';
import { findPriceAdjustByNo } from '../lib/priceAdjustLogic.js';
import {
  filterPurchasePriceRows,
  filterSalesPriceRows,
  getEnabledCurrencyOptions,
  priceCustomerLevelOptions,
  priceRangeOptions,
  PURCHASE_PRICE_STORAGE_KEY,
  SALES_PRICE_STORAGE_KEY,
} from '../lib/priceLogic.js';

/**
 * 价目表列表页（采购／销售共用）：只查看和查询，不提供新增、编辑、删除、禁用和导入。
 * 查询区顺序、列表列、默认排序见各自前端 Demo PRD §2、§4；追溯跳转见 §6。
 */

const purchaseInitialFilters = {
  supplier: '',
  productCode: '',
  barcode: '',
  productName: '',
  currency: '',
  lastAdjustNo: '',
  updatedAtRange: { from: '', to: '' },
};

const salesInitialFilters = {
  range: [],
  level: [],
  customer: '',
  productCode: '',
  barcode: '',
  productName: '',
  currency: '',
  lastAdjustNo: '',
  updatedAtRange: { from: '', to: '' },
};

function buildPurchaseFilterFields() {
  return [
    { key: 'supplier', label: '供应商', type: 'select', options: [{ value: '', label: '全部供应商' }, ...getSelectableSupplierOptions()] },
    { key: 'productCode', label: '商品编码', type: 'search', placeholder: '请输入商品编码' },
    { key: 'barcode', label: '商品条码', type: 'search', placeholder: '请输入商品条码' },
    { key: 'productName', label: '商品名称', type: 'search', placeholder: '请输入商品名称' },
    { key: 'currency', label: '币别', type: 'select', options: [{ value: '', label: '全部' }, ...getEnabledCurrencyOptions()] },
    { key: 'lastAdjustNo', label: '最近调整单号', type: 'search', placeholder: '请输入调整单号' },
    { key: 'updatedAtRange', label: '最后更新时间', type: 'date-range', placeholder: '不限' },
  ];
}

function buildSalesFilterFields() {
  return [
    { key: 'range', label: '面向范围', type: 'multi-select', placeholder: '全部', options: priceRangeOptions },
    { key: 'level', label: '客户等级', type: 'multi-select', placeholder: '全部', options: priceCustomerLevelOptions },
    { key: 'customer', label: '客户', type: 'select', options: [{ value: '', label: '全部客户' }, ...getSelectableCustomerOptions()] },
    { key: 'productCode', label: '商品编码', type: 'search', placeholder: '请输入商品编码' },
    { key: 'barcode', label: '商品条码', type: 'search', placeholder: '请输入商品条码' },
    { key: 'productName', label: '商品名称', type: 'search', placeholder: '请输入商品名称' },
    { key: 'currency', label: '币别', type: 'select', options: [{ value: '', label: '全部' }, ...getEnabledCurrencyOptions()] },
    { key: 'lastAdjustNo', label: '最近调整单号', type: 'search', placeholder: '请输入调整单号' },
    { key: 'updatedAtRange', label: '最后更新时间', type: 'date-range', placeholder: '不限' },
  ];
}

const priceListConfigs = {
  purchase: {
    title: '采购价目表',
    rows: purchasePrices,
    storageKey: PURCHASE_PRICE_STORAGE_KEY,
    columns: purchasePriceColumns,
    targetId: 'purchase-price',
    adjustDetailPageId: 'price-purchase-adjust-detail',
    initialFilters: purchaseInitialFilters,
    filterRows: filterPurchasePriceRows,
    defaultSort: { key: 'updatedAt', direction: 'desc' },
    initialPinnedKeys: ['supplier'],
    emptyText: '暂无采购价，可在商品建档或采购价格调整单中维护',
    emptyTextFiltered: '暂无符合条件的采购价，可在商品建档或采购价格调整单中维护',
    buildFilterFields: buildPurchaseFilterFields,
  },
  sales: {
    title: '销售价目表',
    rows: salesPrices,
    storageKey: SALES_PRICE_STORAGE_KEY,
    columns: salesPriceColumns,
    targetId: 'sales-price',
    adjustDetailPageId: 'price-sales-adjust-detail',
    initialFilters: salesInitialFilters,
    filterRows: filterSalesPriceRows,
    defaultSort: { key: 'updatedAt', direction: 'desc' },
    initialPinnedKeys: ['range'],
    emptyText: '暂无销售价，可在商品建档或销售价格调整单中维护',
    emptyTextFiltered: '暂无符合条件的销售价，可在商品建档或销售价格调整单中维护',
    buildFilterFields: buildSalesFilterFields,
  },
};

export function PriceListPage({ side = 'purchase', ...props }) {
  const base = priceListConfigs[side] || priceListConfigs.purchase;

  function handleCellClick(column, row, { notify, onOpenPage }) {
    if (column.key !== 'lastAdjustNo') return;
    const adjust = findPriceAdjustByNo(side, row.lastAdjustNo);
    if (!adjust) {
      notify('调整单不存在或已删除', 'warning');
      return;
    }
    onOpenPage?.(base.adjustDetailPageId, { row: adjust });
  }

  const config = {
    title: base.title,
    rows: base.rows,
    storageKey: base.storageKey,
    columns: base.columns,
    initialFilters: base.initialFilters,
    filterRows: base.filterRows,
    initialVisibility: buildInitialVisibility(base.columns),
    columnOptions: base.columns.map((column) => ({ key: column.key, label: column.label })),
    filterFields: base.buildFilterFields(),
    defaultSort: base.defaultSort,
    initialPinnedKeys: base.initialPinnedKeys,
    emptyText: base.emptyText,
    emptyTextFiltered: base.emptyTextFiltered,
    queryMessage: null,
    headerActions: [
      {
        id: 'import-export',
        render: (ctx) => (
          <ImportExportActions
            target={getTransferTarget(base.targetId)}
            scopeSource={{ all: ctx.state.rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
            defaultColumnKeys={base.columns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
            notify={ctx.notify}
            onOpenPage={ctx.onOpenPage}
          />
        ),
      },
    ],
    toolbarActions: [],
    rowActions: [],
    presetFilters: props.context?.presetFilters,
    onCellClick: handleCellClick,
  };

  return <DocumentListPage {...props} config={config} />;
}
