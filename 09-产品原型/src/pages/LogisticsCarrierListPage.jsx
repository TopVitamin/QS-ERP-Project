import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { LogisticsActionDialogs } from '../components/erp/LogisticsActionDialogs.jsx';
import { toSelectOptions } from '../lib/options.js';
import { getTransferTarget } from '../lib/transferTargets.js';
import { readMockRows, subscribeMockRows, writeMockRows } from '../lib/mockStorage.js';
import { useStatusLabels } from '../lib/partnerMasterLogic.js';
import {
  applyEnable,
  canDisable,
  canEnable,
  CARRIER_STORAGE_KEY,
  getCarrierDeleteBlockReason,
  PRODUCT_STORAGE_KEY,
} from '../lib/logisticsLogic.js';
import { carrierColumns, carriers, logisticsProducts } from '../data/logisticsData.js';
import {
  carrierInitialFilters,
  filterCarrierRows,
  LogisticsObjectList,
} from './logisticsListShared.jsx';

function buildCarrierRowActions() {
  return [
    { id: 'edit', label: '编辑' },
    { id: 'disable', label: '禁用', variant: 'danger', visibleWhen: canDisable },
    { id: 'enable', label: '启用', visibleWhen: canEnable },
    { id: 'delete', label: '删除', variant: 'danger' },
  ];
}

export function LogisticsCarrierListPage({ onFeedback, onOpenPage }) {
  const [carrierRows, setCarrierRows] = useState(() => readMockRows(CARRIER_STORAGE_KEY, carriers));
  const [productRows, setProductRows] = useState(() => readMockRows(PRODUCT_STORAGE_KEY, logisticsProducts));
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    setCarrierRows(readMockRows(CARRIER_STORAGE_KEY, carriers));
    setProductRows(readMockRows(PRODUCT_STORAGE_KEY, logisticsProducts));
    const unsubscribeCarriers = subscribeMockRows(CARRIER_STORAGE_KEY, setCarrierRows);
    const unsubscribeProducts = subscribeMockRows(PRODUCT_STORAGE_KEY, setProductRows);
    return () => {
      unsubscribeCarriers();
      unsubscribeProducts();
    };
  }, []);

  const filterFields = [
    { key: 'keyword', label: '关键词', type: 'search', placeholder: '请输入编码、名称、联系人或电话' },
    { key: 'useStatus', label: '使用状态', type: 'select', options: [{ value: '', label: '全部状态' }, ...toSelectOptions(useStatusLabels)] },
    { key: 'updatedAt', label: '最后更新时间', type: 'date-range' },
  ];

  function openDialog(payload) {
    setDialog({ ...payload, carriers: carrierRows, products: productRows });
  }

  function upsertCarrier(row) {
    const current = readMockRows(CARRIER_STORAGE_KEY, carriers);
    const index = current.findIndex((item) => item.id === row.id);
    const nextRows = index < 0 ? [row, ...current] : current.map((item, itemIndex) => (itemIndex === index ? row : item));
    writeMockRows(CARRIER_STORAGE_KEY, nextRows);
    setCarrierRows(nextRows);
  }

  function removeCarrier(rowId) {
    const nextRows = readMockRows(CARRIER_STORAGE_KEY, carriers).filter((item) => item.id !== rowId);
    writeMockRows(CARRIER_STORAGE_KEY, nextRows);
    setCarrierRows(nextRows);
  }

  function handleDialogComplete(result) {
    if (!result) return;

    if (result.action === 'save-carrier' && result.payload) {
      upsertCarrier(result.payload);
      onFeedback?.(result.message, result.type || 'success');
      return;
    }

    if (result.action === 'delete-carrier' && result.row) {
      removeCarrier(result.row.id);
      onFeedback?.(result.message, result.type || 'success');
      return;
    }

    if (result.action === 'update-carrier' && result.nextRow) {
      upsertCarrier(result.nextRow);
      onFeedback?.(result.message, result.type || 'success');
    }
  }

  function handleCellClick(column, row) {
    if (column.key === 'code') {
      onOpenPage?.('base-logistics-carrier-detail', { row, returnPageId: 'base-logistics-carrier' });
    }
  }

  function handleRowAction(id, row) {
    if (id === 'edit') {
      openDialog({ type: 'carrier-form', mode: 'edit', row, existingRows: carrierRows });
      return;
    }
    if (id === 'enable') {
      upsertCarrier(applyEnable(row));
      onFeedback?.('物流商已启用', 'success');
      return;
    }
    if (id === 'disable') {
      openDialog({ type: 'disable-carrier', row });
      return;
    }
    if (id === 'delete') {
      const blockReason = getCarrierDeleteBlockReason(row, productRows);
      if (blockReason) {
        onFeedback?.(blockReason, 'warning');
        return;
      }
      openDialog({ type: 'delete-carrier', row });
    }
  }

  const headerActions = [
    {
      id: 'create-carrier',
      label: '新增物流商',
      icon: Plus,
      variant: 'primary',
      onAction: () => openDialog({ type: 'carrier-form', mode: 'create', existingRows: carrierRows }),
    },
    {
      id: 'import-export-carrier',
      render: (ctx) => (
        <ImportExportActions
          target={getTransferTarget('logistics-carrier')}
          scopeSource={{ all: carrierRows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
          defaultColumnKeys={carrierColumns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
          notify={onFeedback}
          onOpenPage={onOpenPage}
        />
      ),
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-erp-surface">
      <LogisticsObjectList
        title="物流商"
        rows={carrierRows}
        storageKey={CARRIER_STORAGE_KEY}
        columns={carrierColumns}
        initialFilters={carrierInitialFilters}
        filterFields={filterFields}
        filterRows={filterCarrierRows}
        headerActions={headerActions}
        onCellClick={handleCellClick}
        onRowAction={handleRowAction}
        rowActions={buildCarrierRowActions()}
        rowActionContext={{ products: productRows }}
        emptyText="暂无物流商，点击「新增物流商」开始建档"
        emptyTextFiltered="没有符合条件的记录，请调整筛选条件"
        onFeedback={onFeedback}
      />
      <LogisticsActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        carriers={carrierRows}
        products={productRows}
      />
    </div>
  );
}

