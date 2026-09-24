import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { ProductActionDialogs } from '../components/erp/ProductActionDialogs.jsx';
import { PRODUCT_STORAGE_KEY, productColumns, products } from '../data/productData.js';
import { flattenCategoryOptions } from '../data/productCategoryData.js';
import { getTransferTarget } from '../lib/transferTargets.js';
import { readMockRows, subscribeMockRows, writeMockRows } from '../lib/mockStorage.js';
import { matchesDateRange } from '../lib/listFilters.js';
import { toSelectOptions } from '../lib/options.js';
import { useStatusLabels } from '../lib/partnerMasterLogic.js';
import {
  applyDisable,
  applyEnable,
  canDisableProduct,
  canEnableProduct,
  getDeleteBlockReason,
  lifecycleStatusOptions,
  matchesCategoryFilter,
  salesLevelOptions,
} from '../lib/productLogic.js';
import { getSelectableAuxiliaryOptions } from '../data/auxiliaryData.js';

const brandOptions = getSelectableAuxiliaryOptions('brand');

const initialFilters = {
  keyword: '',
  category: '',
  brand: '',
  salesLevel: '',
  lifecycleStatus: '',
  useStatus: '',
  updatedAt: { from: '', to: '' },
};

const filterFields = [
  { key: 'keyword', label: '关键词', type: 'search', placeholder: '请输入编码、名称、简称、助记码、型号或条码' },
  { key: 'category', label: '商品分类', type: 'searchable-select', options: flattenCategoryOptions(), placeholder: '请选择商品分类' },
  { key: 'brand', label: '品牌', type: 'select', options: [{ value: '', label: '全部品牌' }, ...brandOptions] },
  { key: 'salesLevel', label: '商品销售等级', type: 'select', options: [{ value: '', label: '全部等级' }, ...salesLevelOptions] },
  { key: 'lifecycleStatus', label: '商品生命周期状态', type: 'select', options: [{ value: '', label: '全部生命周期状态' }, ...lifecycleStatusOptions] },
  { key: 'useStatus', label: '使用状态', type: 'select', options: [{ value: '', label: '全部使用状态' }, ...toSelectOptions(useStatusLabels)] },
  { key: 'updatedAt', label: '最后更新时间', type: 'date-range' },
];

function filterRows(row, filters) {
  const keyword = filters.keyword.trim().toLowerCase();
  const keywordFields = [row.code, row.name, row.shortName, row.mnemonic, row.model, ...(row.barcodes || [])];
  const matchesKeyword = !keyword || keywordFields.some((value) => String(value || '').toLowerCase().includes(keyword));
  return matchesKeyword
    && matchesCategoryFilter(row, filters.category)
    && (!filters.brand || row.brand === filters.brand)
    && (!filters.salesLevel || row.salesLevel === filters.salesLevel)
    && (!filters.lifecycleStatus || row.lifecycleStatus === filters.lifecycleStatus)
    && (!filters.useStatus || row.useStatus === filters.useStatus)
    && matchesDateRange(row.updatedAt, filters.updatedAt);
}

function renderThumbnail(_, row) {
  const src = row.images?.main;
  if (!src) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded border border-erp-border-table-column bg-erp-surface text-[10px] text-erp-text-muted">
        无图
      </div>
    );
  }
  return <img src={src} alt="" className="h-8 w-8 rounded border border-erp-border-table-column object-cover" />;
}

function buildRowActions() {
  return [
    { id: 'edit', label: '编辑' },
    { id: 'disable', label: '禁用', variant: 'danger', visibleWhen: canDisableProduct, confirm: { title: '确认禁用商品？', description: '禁用后新业务不能再选择该商品，已有单据和价目表不受影响', confirmLabel: '确认禁用', confirmVariant: 'danger' } },
    { id: 'enable', label: '启用', visibleWhen: canEnableProduct },
    { id: 'delete', label: '删除', variant: 'danger', disabledWhen: (row) => Boolean(getDeleteBlockReason(row)), disabledTitle: getDeleteBlockReason },
  ];
}

const batchToolbarActions = [
  { id: 'batch-enable', label: '批量启用', requiresSelection: true },
  { id: 'batch-disable', label: '批量禁用', requiresSelection: true, variant: 'danger' },
];

export function ProductListPage({ onFeedback, onOpenPage }) {
  const [rows, setRows] = useState(() => readMockRows(PRODUCT_STORAGE_KEY, products));
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    setRows(readMockRows(PRODUCT_STORAGE_KEY, products));
    return subscribeMockRows(PRODUCT_STORAGE_KEY, setRows);
  }, []);

  const columns = useMemo(
    () => productColumns.map((column) => (column.key === 'thumbnail' ? { ...column, render: renderThumbnail } : column)),
    [],
  );
  const initialVisibility = useMemo(() => Object.fromEntries(columns.map((column) => [column.key, column.defaultVisible !== false])), [columns]);
  const columnOptions = useMemo(() => columns.map((column) => ({ key: column.key, label: column.label })), [columns]);

  function upsertRow(nextRow) {
    const current = readMockRows(PRODUCT_STORAGE_KEY, products);
    const index = current.findIndex((item) => item.id === nextRow.id);
    const nextRows = index < 0 ? [nextRow, ...current] : current.map((item, itemIndex) => (itemIndex === index ? nextRow : item));
    writeMockRows(PRODUCT_STORAGE_KEY, nextRows);
    setRows(nextRows);
  }

  function removeRow(rowId) {
    const nextRows = readMockRows(PRODUCT_STORAGE_KEY, products).filter((item) => item.id !== rowId);
    writeMockRows(PRODUCT_STORAGE_KEY, nextRows);
    setRows(nextRows);
  }

  function handleDialogComplete(result) {
    if (!result) return;
    if (result.action === 'batch-enable' || result.action === 'batch-disable') {
      const nextById = new Map((result.nextRows || []).map((item) => [item.id, item]));
      const nextRows = readMockRows(PRODUCT_STORAGE_KEY, products).map((item) => nextById.get(item.id) || item);
      writeMockRows(PRODUCT_STORAGE_KEY, nextRows);
      setRows(nextRows);
      onFeedback?.(result.message, result.type || 'success');
      return;
    }
    if (result.action === 'delete' && result.row) {
      removeRow(result.row.id);
      onFeedback?.(result.message, result.type || 'success');
      return;
    }
    if (result.nextRow) upsertRow(result.nextRow);
    if (result.message) onFeedback?.(result.message, result.type || 'success');
  }

  const listConfig = {
    title: '商品资料',
    rows,
    storageKey: PRODUCT_STORAGE_KEY,
    initialFilters,
    filterRows,
    initialVisibility,
    columns,
    columnOptions,
    filterFields,
    defaultSort: { key: 'updatedAt', direction: 'desc' },
    headerActions: [
      { id: 'create', label: '新增', icon: Plus, variant: 'primary' },
      {
        id: 'import-export',
        render: (ctx) => (
          <ImportExportActions
            target={getTransferTarget('product')}
            scopeSource={{ all: rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
            defaultColumnKeys={columns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
            notify={onFeedback}
            onOpenPage={onOpenPage}
          />
        ),
      },
    ],
    toolbarActions: batchToolbarActions,
    rowActions: buildRowActions(),
    rowActionsMaxVisible: 3,
    resetMessage: '筛选条件已重置',
    queryMessage: null,
    emptyText: '暂无商品资料，点击「新增」开始建档',
    emptyTextFiltered: '没有符合条件的商品，请调整筛选条件',
    onHeaderAction: (id) => {
      if (id === 'create') onOpenPage?.('base-product-create');
    },
    onToolbarAction: (id, context) => {
      const selectedRows = context.getSelectedRows();
      if (!selectedRows.length) {
        onFeedback?.('请先选择商品', 'warning');
        return;
      }
      const canApply = id === 'batch-enable' ? canEnableProduct : canDisableProduct;
      if (!selectedRows.every(canApply)) {
        const expectedStatus = id === 'batch-enable' ? '全部为禁用状态' : '全部为启用状态';
        onFeedback?.(`批量操作未执行：所选商品须${expectedStatus}`, 'warning');
        return;
      }
      setDialog({ type: id, rows: selectedRows });
    },
    onCellClick: (column, row) => {
      if (column.key === 'code') onOpenPage?.('base-product-detail', { row });
    },
    onRowAction: (id, row) => {
      if (id === 'edit') {
        onOpenPage?.('base-product-edit', { row });
        return;
      }
      if (id === 'enable') {
        upsertRow(applyEnable(row));
        onFeedback?.('商品已启用', 'success');
        return;
      }
      if (id === 'disable') {
        upsertRow(applyDisable(row));
        onFeedback?.('商品已禁用，新业务不能再选择', 'success');
        return;
      }
      if (id === 'delete') {
        const blockReason = getDeleteBlockReason(row);
        if (blockReason) {
          onFeedback?.(blockReason, 'warning');
          return;
        }
      }
      setDialog({ type: id, row });
    },
  };

  return (
    <>
      <DocumentListPage onFeedback={onFeedback} onOpenPage={onOpenPage} config={listConfig} />
      <ProductActionDialogs dialog={dialog} onClose={() => setDialog(null)} onComplete={handleDialogComplete} />
    </>
  );
}
