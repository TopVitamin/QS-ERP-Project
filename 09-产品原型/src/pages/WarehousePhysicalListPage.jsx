import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { WarehouseActionDialogs } from '../components/erp/WarehouseActionDialogs.jsx';
import { toSelectOptions } from '../lib/options.js';
import { getTransferTarget } from '../lib/transferTargets.js';
import { readMockRows, writeMockRows } from '../lib/mockStorage.js';
import {
  applyEnable,
  canEditPhysical,
  getBatchAuditBlockReason,
  LOGICAL_STORAGE_KEY,
  PHYSICAL_STORAGE_KEY,
  useStatusLabels,
} from '../lib/warehouseLogic.js';
import {
  getPhysicalWarehouseOption,
  logicalWarehouses,
  physicalWarehouseColumns,
  physicalWarehouses,
} from '../data/warehouseData.js';
import {
  buildPhysicalRowActions,
  filterPhysicalRows,
  physicalInitialFilters,
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

export function WarehousePhysicalListPage({ onFeedback, onOpenPage }) {
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

  const filterFields = [
    { key: 'keyword', label: '关键词', type: 'search', placeholder: '请输入编码、名称或第三方仓库编码' },
    { key: 'operationType', label: '运营类型', type: 'select', options: [{ value: '', label: '全部类型' }, { value: '自营', label: '自营' }, { value: '第三方', label: '第三方' }] },
    { key: 'contact', label: '联系人', type: 'search', placeholder: '请输入联系人' },
    { key: 'dockingType', label: '对接方式', type: 'select', options: [{ value: '', label: '全部方式' }, { value: '直连', label: '直连' }, { value: 'SaaS中转', label: 'SaaS中转' }] },
    { key: 'dockingSystem', label: '对接系统', type: 'select', options: [{ value: '', label: '全部系统' }, { value: '仓库作业系统', label: '仓库作业系统' }, { value: '聚水潭', label: '聚水潭' }, { value: '领星', label: '领星' }] },
    { key: 'useStatus', label: '使用状态', type: 'select', options: [{ value: '', label: '全部状态' }, ...toSelectOptions(useStatusLabels)] },
    { key: 'updatedAt', label: '最后更新时间', type: 'date-range' },
  ];

  function openDialog(payload) {
    setDialog({ ...payload, physicalRows, logicalRows, objectType: 'physical' });
  }

  function handleDialogComplete(result) {
    if (!result) return;

    if (result.action === 'batch-delete' && result.rows) {
      const ids = new Set(result.rows.map((item) => item.id));
      const nextRows = readMockRows(PHYSICAL_STORAGE_KEY, physicalWarehouses).filter((item) => !ids.has(item.id));
      writeMockRows(PHYSICAL_STORAGE_KEY, nextRows);
      setPhysicalRows(nextRows);
      onFeedback?.(result.message, result.type || 'success');
      return;
    }

    if (result.action?.startsWith('batch-') && result.nextRows) {
      const byId = new Map(result.nextRows.map((item) => [item.id, item]));
      const nextRows = readMockRows(PHYSICAL_STORAGE_KEY, physicalWarehouses).map((item) => byId.get(item.id) || item);
      writeMockRows(PHYSICAL_STORAGE_KEY, nextRows);
      setPhysicalRows(nextRows);
      onFeedback?.(result.message, result.type || 'success');
      return;
    }

    if (result.action === 'delete' && result.row) {
      removeMockRowLocal(PHYSICAL_STORAGE_KEY, result.row.id, setPhysicalRows, physicalWarehouses);
      onFeedback?.(result.message, result.type || 'success');
      return;
    }

    if (result.nextRow) {
      upsertMockRowLocal(PHYSICAL_STORAGE_KEY, result.nextRow, setPhysicalRows, physicalWarehouses);
    }

    if (result.message) onFeedback?.(result.message, result.type || 'success');
  }

  function handleCellClick(column, row) {
    if (column.key === 'code') onOpenPage?.('warehouse-detail', { row, returnPageId: 'warehouse-physical' });
  }

  function handleRowAction(id, row) {
    if (id === 'edit') {
      if (!canEditPhysical(row)) {
        openDialog({ type: 'blocked-edit', row });
        return;
      }
      onOpenPage?.('warehouse-edit', { row });
      return;
    }
    if (id === 'enable') {
      upsertMockRowLocal(PHYSICAL_STORAGE_KEY, applyEnable(row), setPhysicalRows, physicalWarehouses);
      onFeedback?.('实体仓已启用；仅审核通过时可供新增逻辑仓引用', 'success');
      return;
    }
    openDialog({ type: id, row });
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
    { id: 'create', label: '新增', icon: Plus, variant: 'primary', onAction: () => onOpenPage?.('warehouse-create') },
    {
      id: 'import-export',
      render: (ctx) => (
        <ImportExportActions
          target={getTransferTarget('warehouse')}
          scopeSource={{ all: physicalRows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
          defaultColumnKeys={physicalWarehouseColumns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
          notify={onFeedback}
          onOpenPage={onOpenPage}
        />
      ),
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-erp-surface">
      <WarehouseObjectList
        title="实体仓"
        rows={physicalRows}
        storageKey={PHYSICAL_STORAGE_KEY}
        columns={physicalWarehouseColumns}
        initialFilters={physicalInitialFilters}
        filterFields={filterFields}
        filterRows={filterPhysicalRows}
        headerActions={headerActions}
        toolbarActions={batchToolbarActions}
        onToolbarAction={handleBatchAction}
        emptyText="暂无实体仓"
        emptyTextFiltered="没有符合条件的仓库，请调整筛选条件"
        onCellClick={handleCellClick}
        onRowAction={handleRowAction}
        rowActions={buildPhysicalRowActions()}
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
