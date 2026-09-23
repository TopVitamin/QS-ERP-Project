import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { AuxiliaryTypeTree } from '../components/erp/AuxiliaryTypeTree.jsx';
import { AuxiliaryActionDialogs } from '../components/erp/AuxiliaryActionDialogs.jsx';
import { CategoryTreeTable, useCategoryExpandedState } from '../components/erp/CategoryTreeTable.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { ListPageFrame } from '../components/erp/ListPageFrame.jsx';
import { useListPageActions } from '../hooks/useListPageActions.js';
import { useListPageState } from '../hooks/useListPageState.js';
import { matchesDateRange } from '../lib/listFilters.js';
import { toSelectOptions } from '../lib/options.js';
import { getTransferTarget } from '../lib/transferTargets.js';
import { readMockRows, subscribeMockRows, writeMockRows } from '../lib/mockStorage.js';
import { useStatusLabels } from '../lib/partnerMasterLogic.js';
import {
  applyDisable,
  applyEnable,
  AUXILIARY_STORAGE_KEY,
  canAddChildCategory,
  canDisable,
  canEnable,
  CATEGORY_STORAGE_KEY,
  filterCategoryTreeRows,
  getAuxiliaryDeleteBlockReason,
  getCategoryDeleteBlockReason,
  levelLabels,
} from '../lib/auxiliaryLogic.js';
import {
  auxiliaryColumns,
  auxiliaryItems,
  auxiliaryTypeTree,
  buildInitialVisibility,
  categoryColumns,
  getAuxiliaryTypeConfig,
  getTypeLabel,
  seedCategories,
} from '../data/auxiliaryData.js';

const auxiliaryInitialFilters = {
  code: '',
  name: '',
  useStatus: '',
  updatedAt: { from: '', to: '' },
};

const categoryInitialFilters = {
  keyword: '',
  level: '',
  useStatus: '',
  updatedAt: { from: '', to: '' },
};

function filterAuxiliaryRows(row, filters, typeId) {
  const code = filters.code.trim().toLowerCase();
  const name = filters.name.trim().toLowerCase();
  return row.type === typeId
    && (!code || String(row.code || '').toLowerCase().includes(code))
    && (!name || String(row.name || '').toLowerCase().includes(name))
    && (!filters.useStatus || row.useStatus === filters.useStatus)
    && matchesDateRange(row.updatedAt, filters.updatedAt);
}

function buildAuxiliaryRowActions() {
  return [
    { id: 'view', label: '查看' },
    { id: 'edit', label: '编辑' },
    { id: 'disable', label: '禁用', variant: 'danger', visibleWhen: canDisable },
    { id: 'enable', label: '启用', visibleWhen: canEnable },
    { id: 'delete', label: '删除', variant: 'danger' },
  ];
}

function buildCategoryRowActions() {
  return [
    { id: 'add-child', label: '新增下级', visibleWhen: canAddChildCategory },
    { id: 'edit', label: '编辑' },
    { id: 'disable', label: '禁用', variant: 'danger', visibleWhen: canDisable },
    { id: 'enable', label: '启用', visibleWhen: canEnable },
    { id: 'delete', label: '删除', variant: 'danger' },
  ];
}

function AuxiliaryNormalList({ typeId, rows, onFeedback, onOpenPage, onOpenDialog }) {
  const typeConfig = getAuxiliaryTypeConfig(typeId);
  const typeRows = useMemo(() => rows.filter((row) => row.type === typeId), [rows, typeId]);
  const state = useListPageState({
    initialRows: typeRows,
    initialFilters: auxiliaryInitialFilters,
    filterRows: (row, filters) => filterAuxiliaryRows(row, filters, typeId),
    initialVisibility: buildInitialVisibility(auxiliaryColumns),
    storageKey: `${AUXILIARY_STORAGE_KEY}:${typeId}`,
    columns: auxiliaryColumns,
    initialSort: { key: 'updatedAt', direction: 'desc' },
  });
  const orderedColumns = useMemo(() => {
    const byKey = new Map(auxiliaryColumns.map((column) => [column.key, column]));
    const order = [
      ...state.columnOrder.filter((key) => state.pinnedKeys.includes(key)),
      ...state.columnOrder.filter((key) => !state.pinnedKeys.includes(key)),
    ];
    const list = order.map((key) => byKey.get(key)).filter(Boolean);
    for (const column of auxiliaryColumns) {
      if (!order.includes(column.key)) list.push(column);
    }
    return list;
  }, [state.columnOrder, state.pinnedKeys]);
  const visibleColumns = useMemo(
    () => orderedColumns.filter((column) => state.visibility[column.key] !== false),
    [orderedColumns, state.visibility],
  );
  const { notify, getSelectedRows } = useListPageActions({ onFeedback, state });
  const actionContext = { state, notify, getSelectedRows, onFeedback, onOpenPage };

  const filterFields = [
    { key: 'code', label: '资料编码', type: 'search', placeholder: '请输入资料编码' },
    { key: 'name', label: '资料名称', type: 'search', placeholder: '请输入资料名称' },
    { key: 'useStatus', label: '使用状态', type: 'select', options: [{ value: '', label: '全部状态' }, ...toSelectOptions(useStatusLabels)] },
    { key: 'updatedAt', label: '最后更新时间', type: 'date-range' },
  ];

  function handleBulkAction(id) {
    const selected = getSelectedRows();
    if (!selected.length) return;
    if (id === 'bulk-enable') {
      onOpenDialog?.({ type: 'bulk-update-auxiliary', action: 'enable', rows: selected });
      return;
    }
    if (id === 'bulk-disable') {
      onOpenDialog?.({ type: 'bulk-disable-auxiliary', rows: selected });
    }
  }

  return (
    <ListPageFrame
      header={{
        title: getTypeLabel(typeId),
        actions: [
          { id: 'create', label: '新增', icon: Plus, variant: 'primary' },
          {
            id: 'import-export',
            render: () => (
              <ImportExportActions
                target={getTransferTarget(`auxiliary-${typeId}`)}
                scopeSource={{ all: typeRows, filtered: state.filteredRows, selected: getSelectedRows() }}
                defaultColumnKeys={visibleColumns.map((column) => column.key)}
                notify={onFeedback}
                onOpenPage={onOpenPage}
              />
            ),
          },
        ],
        filters: filterFields,
        filterValues: state.draftFilters,
        onFilterChange: state.setFilter,
        onReset: () => { state.resetFilters(); notify('筛选条件已重置', 'info'); },
        onQuery: () => { state.applyFilters(); notify('已执行辅助资料查询', 'success'); },
        onAction: (id) => {
          if (id === 'create') onOpenDialog?.({ type: 'auxiliary-form', mode: 'create', typeConfig, existingRows: typeRows });
        },
        actionContext,
      }}
      toolbar={{
        selectedCount: state.filteredSelectedIds.length,
        actions: [
          { id: 'bulk-enable', label: '批量启用', requiresSelection: true },
          { id: 'bulk-disable', label: '批量禁用', requiresSelection: true, confirm: { title: '确认禁用所选记录？', description: '禁用后新增引用不能再选择，已有业务不受影响', confirmLabel: '确认禁用', confirmVariant: 'danger' } },
        ],
        onAction: handleBulkAction,
        columnSettings: {
          options: auxiliaryColumns.map((column) => ({ key: column.key, label: column.label })),
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
        onRowAction: (id, row) => onOpenDialog?.({ typeId, row, action: id, listMode: 'auxiliary', typeConfig, existingRows: typeRows }),
        rowActions: buildAuxiliaryRowActions(),
        rowActionsMaxVisible: 3,
        sort: state.sort,
        onSort: state.toggleSort,
        pinnedKeys: state.pinnedKeys,
        emptyText: typeRows.length ? '没有符合条件的记录，请调整筛选条件' : `暂无${getTypeLabel(typeId)}，点击「新增」开始维护`,
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

function AuxiliaryCategoryPanel({ categories, onFeedback, onOpenPage, onOpenDialog }) {
  const [draftFilters, setDraftFilters] = useState(categoryInitialFilters);
  const [appliedFilters, setAppliedFilters] = useState(categoryInitialFilters);
  const [visibility, setVisibility] = useState(() => buildInitialVisibility(categoryColumns));
  const [columnOrder, setColumnOrder] = useState(() => categoryColumns.map((column) => column.key));
  const [pinnedKeys, setPinnedKeys] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const { expandedIds, toggleExpand, ensureAncestorsExpanded } = useCategoryExpandedState(categories);

  const filteredRows = useMemo(
    () => filterCategoryTreeRows(categories, appliedFilters),
    [categories, appliedFilters],
  );

  useEffect(() => {
    ensureAncestorsExpanded(filteredRows);
  }, [filteredRows, ensureAncestorsExpanded]);

  const filterFields = [
    { key: 'keyword', label: '关键词', type: 'search', placeholder: '请输入分类编码或名称' },
    { key: 'level', label: '分类级别', type: 'select', options: [{ value: '', label: '全部级别' }, ...Object.entries(levelLabels).map(([value, label]) => ({ value, label }))] },
    { key: 'useStatus', label: '使用状态', type: 'select', options: [{ value: '', label: '全部状态' }, ...toSelectOptions(useStatusLabels)] },
    { key: 'updatedAt', label: '最后更新时间', type: 'date-range' },
  ];

  const wrappedRowActions = useMemo(
    () => buildCategoryRowActions().map((action) => ({
      ...action,
      disabledWhen: action.disabledWhen
        ? (row) => action.disabledWhen(row, { categories })
        : undefined,
    })),
    [categories],
  );

  function handleRowAction(id, row) {
    if (id === 'add-child') {
      if (!canAddChildCategory(row)) {
        onOpenDialog?.({ type: 'blocked-add-child' });
        return;
      }
      onOpenDialog?.({ type: 'category-form', mode: 'create-child', parent: row, categories });
      return;
    }
    if (id === 'view' || (id === 'cell' && row)) {
      onOpenDialog?.({ type: 'category-form', mode: 'view', row, categories });
      return;
    }
    if (id === 'edit') {
      onOpenDialog?.({ type: 'category-form', mode: 'edit', row, categories });
      return;
    }
    if (id === 'enable') {
      onOpenDialog?.({ type: 'direct-enable-category', row });
      return;
    }
    if (id === 'disable') {
      onOpenDialog?.({ type: 'disable-category', row });
      return;
    }
    if (id === 'delete') {
      const blockReason = getCategoryDeleteBlockReason(row, categories);
      if (blockReason) {
        onFeedback?.(blockReason, 'warning');
        return;
      }
      onOpenDialog?.({ type: 'delete-category', row });
    }
  }

  return (
    <ListPageFrame
      header={{
        title: '商品分类',
        actions: [
          { id: 'create-root', label: '新增一级分类', icon: Plus, variant: 'primary' },
        ],
        filters: filterFields,
        filterValues: draftFilters,
        onFilterChange: (key, value) => setDraftFilters((current) => ({ ...current, [key]: value })),
        onReset: () => {
          setDraftFilters(categoryInitialFilters);
          setAppliedFilters(categoryInitialFilters);
          onFeedback?.('筛选条件已重置', 'info');
        },
        onQuery: () => {
          setAppliedFilters(draftFilters);
          onFeedback?.('已执行辅助资料查询', 'success');
        },
        onAction: (id) => {
          if (id === 'create-root') onOpenDialog?.({ type: 'category-form', mode: 'create-root', categories });
        },
      }}
      toolbar={{
        selectedCount: 0,
        actions: [],
        onAction: () => {},
        columnSettings: {
          options: categoryColumns.map((column) => ({ key: column.key, label: column.label })),
          visibility,
          order: columnOrder,
          pinnedKeys,
          onToggle: (key, value) => setVisibility((current) => ({ ...current, [key]: value })),
          onPin: (key) => setPinnedKeys((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key])),
          onReorder: setColumnOrder,
          onReset: () => {
            setVisibility(buildInitialVisibility(categoryColumns));
            setColumnOrder(categoryColumns.map((column) => column.key));
            setPinnedKeys([]);
          },
        },
      }}
      table={{
        component: CategoryTreeTable,
        rows: filteredRows,
        columns: categoryColumns,
        expandedIds,
        onToggleExpand: toggleExpand,
        selectedIds,
        onToggleRow: (id) => setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id])),
        onToggleAll: () => {},
        rowActions: wrappedRowActions,
        onRowAction: handleRowAction,
        onCellClick: (column, row) => {
          if (column.key === 'name') handleRowAction('view', row);
        },
        onFeedback,
        visibility,
        columnOrder,
        pinnedKeys,
        emptyText: categories.length ? '没有符合条件的记录，请调整筛选条件' : '暂无商品分类，点击「新增一级分类」开始维护',
      }}
      pagination={null}
    />
  );
}

export function AuxiliaryListPage({ onFeedback, onOpenPage }) {
  const [selectedType, setSelectedType] = useState('unit');
  const [auxiliaryRows, setAuxiliaryRows] = useState(() => readMockRows(AUXILIARY_STORAGE_KEY, auxiliaryItems));
  const [categoryRows, setCategoryRows] = useState(() => readMockRows(CATEGORY_STORAGE_KEY, seedCategories));
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    setAuxiliaryRows(readMockRows(AUXILIARY_STORAGE_KEY, auxiliaryItems));
    setCategoryRows(readMockRows(CATEGORY_STORAGE_KEY, seedCategories));
    const unsubscribeAux = subscribeMockRows(AUXILIARY_STORAGE_KEY, setAuxiliaryRows);
    const unsubscribeCat = subscribeMockRows(CATEGORY_STORAGE_KEY, setCategoryRows);
    return () => {
      unsubscribeAux();
      unsubscribeCat();
    };
  }, []);

  const typeConfig = getAuxiliaryTypeConfig(selectedType);
  const isCategory = typeConfig?.mode === 'category';

  function upsertAuxiliary(row) {
    const current = readMockRows(AUXILIARY_STORAGE_KEY, auxiliaryItems);
    const index = current.findIndex((item) => item.id === row.id);
    const nextRows = index < 0 ? [row, ...current] : current.map((item, itemIndex) => (itemIndex === index ? row : item));
    writeMockRows(AUXILIARY_STORAGE_KEY, nextRows);
    setAuxiliaryRows(nextRows);
  }

  function removeAuxiliary(rowId) {
    const nextRows = readMockRows(AUXILIARY_STORAGE_KEY, auxiliaryItems).filter((item) => item.id !== rowId);
    writeMockRows(AUXILIARY_STORAGE_KEY, nextRows);
    setAuxiliaryRows(nextRows);
  }

  function upsertCategory(row) {
    const current = readMockRows(CATEGORY_STORAGE_KEY, seedCategories);
    const index = current.findIndex((item) => item.id === row.id);
    const nextRows = index < 0 ? [...current, row] : current.map((item, itemIndex) => (itemIndex === index ? row : item));
    writeMockRows(CATEGORY_STORAGE_KEY, nextRows);
    setCategoryRows(nextRows);
  }

  function removeCategory(rowId) {
    const nextRows = readMockRows(CATEGORY_STORAGE_KEY, seedCategories).filter((item) => item.id !== rowId);
    writeMockRows(CATEGORY_STORAGE_KEY, nextRows);
    setCategoryRows(nextRows);
  }

  function handleOpenDialog(payload) {
    if (payload.listMode === 'auxiliary') {
      const { action, row, typeConfig: config, existingRows } = payload;
      if (action === 'view') {
        setDialog({ type: 'auxiliary-form', mode: 'view', row, typeConfig: config, existingRows });
        return;
      }
      if (action === 'edit') {
        setDialog({ type: 'auxiliary-form', mode: 'edit', row, typeConfig: config, existingRows });
        return;
      }
      if (action === 'enable') {
        upsertAuxiliary(applyEnable(row));
        onFeedback?.('已启用', 'success');
        return;
      }
      if (action === 'disable') {
        setDialog({ type: 'disable-auxiliary', row });
        return;
      }
      if (action === 'delete') {
        const blockReason = getAuxiliaryDeleteBlockReason(row);
        if (blockReason) {
          onFeedback?.(blockReason, 'warning');
          return;
        }
        setDialog({ type: 'delete-auxiliary', row });
      }
      return;
    }

    if (payload.type === 'bulk-disable-auxiliary') {
      payload.rows.forEach((row) => upsertAuxiliary(applyDisable(row)));
      onFeedback?.(`已禁用 ${payload.rows.length} 条记录`, 'success');
      return;
    }

    if (payload.type === 'bulk-update-auxiliary' && payload.action === 'enable') {
      payload.rows.forEach((row) => upsertAuxiliary(applyEnable(row)));
      onFeedback?.(`已启用 ${payload.rows.length} 条记录`, 'success');
      return;
    }

    if (payload.type === 'direct-enable-category') {
      upsertCategory(applyEnable(payload.row));
      onFeedback?.('已启用', 'success');
      return;
    }

    setDialog(payload);
  }

  function handleDialogComplete(result) {
    if (!result) return;
    if (result.action === 'save-auxiliary' && result.payload) {
      upsertAuxiliary(result.payload);
      onFeedback?.(result.message, result.type || 'success');
      return;
    }
    if (result.action === 'save-category' && result.payload) {
      upsertCategory(result.payload);
      onFeedback?.(result.message, result.type || 'success');
      return;
    }
    if (result.action === 'delete-auxiliary' && result.row) {
      removeAuxiliary(result.row.id);
      onFeedback?.(result.message, result.type || 'success');
      return;
    }
    if (result.action === 'delete-category' && result.row) {
      removeCategory(result.row.id);
      onFeedback?.(result.message, result.type || 'success');
      return;
    }
    if (result.action === 'update-auxiliary' && result.nextRow) {
      upsertAuxiliary(result.nextRow);
      onFeedback?.(result.message, result.type || 'success');
      return;
    }
    if (result.action === 'update-category' && result.nextRow) {
      upsertCategory(result.nextRow);
      onFeedback?.(result.message, result.type || 'success');
    }
  }

  return (
    <div className="flex min-h-0 flex-1 bg-erp-surface">
      <AuxiliaryTypeTree
        groups={auxiliaryTypeTree}
        selectedType={selectedType}
        onSelect={setSelectedType}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {isCategory ? (
          <AuxiliaryCategoryPanel
            categories={categoryRows}
            onFeedback={onFeedback}
            onOpenPage={onOpenPage}
            onOpenDialog={handleOpenDialog}
          />
        ) : (
          <AuxiliaryNormalList
            key={selectedType}
            typeId={selectedType}
            rows={auxiliaryRows}
            onFeedback={onFeedback}
            onOpenPage={onOpenPage}
            onOpenDialog={handleOpenDialog}
          />
        )}
      </div>
      <AuxiliaryActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        categories={categoryRows}
      />
    </div>
  );
}
