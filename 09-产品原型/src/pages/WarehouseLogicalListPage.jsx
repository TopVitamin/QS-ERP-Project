import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { WarehouseActionDialogs } from '../components/erp/WarehouseActionDialogs.jsx';
import { toSelectOptions } from '../lib/options.js';
import { getTransferTarget } from '../lib/transferTargets.js';
import { readMockRows, writeMockRows } from '../lib/mockStorage.js';
import {
  applyEnable,
  canAddLogicalWarehouse,
  canEditLogical,
  getBatchAuditBlockReason,
  LOGICAL_STORAGE_KEY,
  PHYSICAL_STORAGE_KEY,
  stockStatusOptions,
  useStatusLabels,
} from '../lib/warehouseLogic.js';
import {
  createLogicalWarehouseColumns,
  getPhysicalWarehouseOption,
  logicalWarehouses,
  physicalWarehouses,
} from '../data/warehouseData.js';
import {
  buildLogicalRowActions,
  filterLogicalRows,
  logicalInitialFilters,
  removeMockRowLocal,
  subscribeMockRowsLocal,
  upsertMockRowLocal,
  WarehouseObjectList,
} from './warehouseListShared.jsx';

const batchToolbarActions = [
  { id: 'batch-submit', label: '批量提交审核', requiresSelection: true },
  { id: 'batch-approve', label: '批量审核通过', requiresSelection: true },
  { id: 'batch-reject', label: '批量驳回', requiresSelection: true, variant: 'danger' },
  { id: 'batch-delete', label: '批量删除', requiresSelection: true, variant: 'danger' },
];

export function WarehouseLogicalListPage({ onFeedback, onOpenPage }) {
  const [physicalRows, setPhysicalRows] = useState(() => physicalWarehouses);
  const [logicalRows, setLogicalRows] = useState(() => logicalWarehouses);
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    const unsubscribePhysical = subscribeMockRowsLocal(PHYSICAL_STORAGE_KEY, setPhysicalRows, physicalWarehouses);
    const unsubscribeLogical = subscribeMockRowsLocal(LOGICAL_STORAGE_KEY, setLogicalRows, logicalWarehouses);
    return () => {
      unsubscribePhysical();
      unsubscribeLogical();
    };
  }, []);

  const columns = createLogicalWarehouseColumns(physicalRows);

  const filterFields = [
    { key: 'keyword', label: '关键词', type: 'search', placeholder: '请输入逻辑仓编码或名称' },
    { key: 'physicalWarehouseId', label: '所属实体仓', type: 'select', options: [{ value: '', label: '全部实体仓' }, ...physicalRows.map(getPhysicalWarehouseOption)] },
    { key: 'stockStatus', label: '库存状态', type: 'select', options: [{ value: '', label: '全部库存状态' }, ...stockStatusOptions] },
    { key: 'useStatus', label: '使用状态', type: 'select', options: [{ value: '', label: '全部使用状态' }, ...toSelectOptions(useStatusLabels)] },
    { key: 'updatedAt', label: '最后更新时间', type: 'date-range' },
  ];

  function openDialog(payload) {
    setDialog({ ...payload, physicalRows, logicalRows, objectType: 'logical' });
  }

  function handleDialogComplete(result) {
    if (!result) return;

    if (result.action === 'batch-delete' && result.rows) {
      const ids = new Set(result.rows.map((item) => item.id));
      const nextRows = readMockRows(LOGICAL_STORAGE_KEY, logicalWarehouses).filter((item) => !ids.has(item.id));
      writeMockRows(LOGICAL_STORAGE_KEY, nextRows);
      setLogicalRows(nextRows);
      onFeedback?.(result.message, result.type || 'success');
      return;
    }

    if (result.action?.startsWith('batch-') && result.nextRows) {
      const byId = new Map(result.nextRows.map((item) => [item.id, item]));
      const nextRows = readMockRows(LOGICAL_STORAGE_KEY, logicalWarehouses).map((item) => byId.get(item.id) || item);
      writeMockRows(LOGICAL_STORAGE_KEY, nextRows);
      setLogicalRows(nextRows);
      onFeedback?.(result.message, result.type || 'success');
      return;
    }

    if (result.action === 'save-logical' && result.payload) {
      upsertMockRowLocal(LOGICAL_STORAGE_KEY, result.payload, setLogicalRows, logicalWarehouses);
      onFeedback?.(result.message, result.type || 'success');
      return;
    }

    if (result.action === 'delete' && result.row) {
      removeMockRowLocal(LOGICAL_STORAGE_KEY, result.row.id, setLogicalRows, logicalWarehouses);
      onFeedback?.(result.message, result.type || 'success');
      return;
    }

    if (result.nextRow) {
      upsertMockRowLocal(LOGICAL_STORAGE_KEY, result.nextRow, setLogicalRows, logicalWarehouses);
    }

    if (result.message) onFeedback?.(result.message, result.type || 'success');
  }

  function handleCellClick(column, row) {
    if (column.key === 'code') {
      openDialog({ type: 'logical-form', mode: 'view', row });
      return;
    }
    if (column.key === 'physicalWarehouseId') {
      const physical = physicalRows.find((item) => item.id === row.physicalWarehouseId);
      if (physical) onOpenPage?.('warehouse-detail', { row: physical, returnPageId: 'warehouse-logical' });
    }
  }

  function handleRowAction(id, row) {
    if (id === 'edit') {
      if (!canEditLogical(row)) {
        openDialog({ type: 'blocked-edit-logical', logicalRow: row });
        return;
      }
      openDialog({ type: 'logical-form', mode: 'edit', row, existingRows: logicalRows });
      return;
    }
    if (id === 'enable') {
      upsertMockRowLocal(LOGICAL_STORAGE_KEY, applyEnable(row), setLogicalRows, logicalWarehouses);
      onFeedback?.('逻辑仓已启用；仅审核通过时可供业务单据引用', 'success');
      return;
    }
    openDialog({ type: id, logicalRow: row, row });
  }

  function handleBatchAction(id, rows) {
    if (!rows.length) {
      onFeedback?.('请先选择记录', 'warning');
      return;
    }
    if (id !== 'batch-delete') {
      const blockReason = getBatchAuditBlockReason(rows, id);
      if (blockReason) {
        onFeedback?.(blockReason, 'warning');
        return;
      }
    }
    openDialog({ type: id, rows });
  }

  const headerActions = [
    {
      id: 'create-logical',
      label: '新增逻辑仓',
      icon: Plus,
      variant: 'primary',
      disabled: !canAddLogicalWarehouse(physicalRows),
      onAction: () => {
        if (!canAddLogicalWarehouse(physicalRows)) {
          openDialog({ type: 'blocked-add-logical' });
          return;
        }
        openDialog({ type: 'logical-form', mode: 'create', existingRows: logicalRows });
      },
    },
    {
      id: 'import-export',
      render: (ctx) => (
        <ImportExportActions
          target={getTransferTarget('warehouse-logical')}
          scopeSource={{ all: logicalRows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
          defaultColumnKeys={columns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
          notify={onFeedback}
          onOpenPage={onOpenPage}
        />
      ),
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-erp-surface">
      <WarehouseObjectList
        title="逻辑仓"
        rows={logicalRows}
        storageKey={LOGICAL_STORAGE_KEY}
        columns={columns}
        initialFilters={logicalInitialFilters}
        filterFields={filterFields}
        filterRows={filterLogicalRows}
        headerActions={headerActions}
        toolbarActions={batchToolbarActions}
        onToolbarAction={handleBatchAction}
        emptyText="暂无逻辑仓"
        emptyTextFiltered="没有符合条件的仓库，请调整筛选条件"
        onCellClick={handleCellClick}
        onRowAction={handleRowAction}
        rowActions={buildLogicalRowActions()}
        onFeedback={onFeedback}
        onOpenPage={onOpenPage}
      />
      <WarehouseActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        physicalRows={physicalRows}
        logicalRows={logicalRows}
      />
    </div>
  );
}
