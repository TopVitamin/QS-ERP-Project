import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { LogisticsActionDialogs } from '../components/erp/LogisticsActionDialogs.jsx';
import { toSelectOptions } from '../lib/options.js';
import { getTransferTarget } from '../lib/transferTargets.js';
import { readMockRows, subscribeMockRows, writeMockRows } from '../lib/mockStorage.js';
import { useStatusLabels } from '../lib/partnerMasterLogic.js';
import {
  applyEnable,
  canAddServiceProduct,
  canDisable,
  canEnable,
  CARRIER_STORAGE_KEY,
  getProductDeleteBlockReason,
  PRODUCT_STORAGE_KEY,
  transportTypeOptions,
} from '../lib/logisticsLogic.js';
import {
  buildCarrierFilterOptions,
  carriers,
  createProductColumns,
  logisticsProducts,
} from '../data/logisticsData.js';
import {
  filterProductRows,
  LogisticsObjectList,
  productInitialFilters,
} from './logisticsListShared.jsx';

function buildProductRowActions() {
  return [
    { id: 'edit', label: '编辑' },
    { id: 'disable', label: '禁用', variant: 'danger', visibleWhen: canDisable },
    { id: 'enable', label: '启用', visibleWhen: canEnable },
    { id: 'delete', label: '删除', variant: 'danger' },
  ];
}

export function LogisticsProductListPage({ onFeedback, onOpenPage }) {
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

  const productColumns = useMemo(() => createProductColumns(carrierRows), [carrierRows]);

  const filterFields = [
    { key: 'keyword', label: '关键词', type: 'search', placeholder: '请输入产品编码或名称' },
    { key: 'carrierId', label: '所属物流商', type: 'select', options: buildCarrierFilterOptions(carrierRows) },
    { key: 'transportType', label: '运输类型', type: 'select', options: [{ value: '', label: '全部类型' }, ...transportTypeOptions] },
    { key: 'useStatus', label: '使用状态', type: 'select', options: [{ value: '', label: '全部状态' }, ...toSelectOptions(useStatusLabels)] },
    { key: 'updatedAt', label: '最后更新时间', type: 'date-range' },
  ];

  function openDialog(payload) {
    setDialog({ ...payload, carriers: carrierRows, products: productRows });
  }

  function upsertProduct(row) {
    const current = readMockRows(PRODUCT_STORAGE_KEY, logisticsProducts);
    const index = current.findIndex((item) => item.id === row.id);
    const nextRows = index < 0 ? [row, ...current] : current.map((item, itemIndex) => (itemIndex === index ? row : item));
    writeMockRows(PRODUCT_STORAGE_KEY, nextRows);
    setProductRows(nextRows);
  }

  function removeProduct(rowId) {
    const nextRows = readMockRows(PRODUCT_STORAGE_KEY, logisticsProducts).filter((item) => item.id !== rowId);
    writeMockRows(PRODUCT_STORAGE_KEY, nextRows);
    setProductRows(nextRows);
  }

  function handleDialogComplete(result) {
    if (!result) return;

    if (result.action === 'save-product' && result.payload) {
      upsertProduct(result.payload);
      onFeedback?.(result.message, result.type || 'success');
      return;
    }

    if (result.action === 'delete-product' && result.row) {
      removeProduct(result.row.id);
      onFeedback?.(result.message, result.type || 'success');
      return;
    }

    if (result.action === 'update-product' && result.nextRow) {
      upsertProduct(result.nextRow);
      onFeedback?.(result.message, result.type || 'success');
    }
  }

  function handleCellClick(column, row) {
    if (column.key === 'code') {
      openDialog({ type: 'product-form', mode: 'view', row });
      return;
    }
    if (column.key === 'carrierId') {
      const carrier = carrierRows.find((item) => item.id === row.carrierId);
      if (carrier) {
        onOpenPage?.('base-logistics-carrier-detail', { row: carrier, returnPageId: 'base-logistics-product' });
      }
    }
  }

  function handleRowAction(id, row) {
    if (id === 'edit') {
      openDialog({ type: 'product-form', mode: 'edit', row, existingRows: productRows });
      return;
    }
    if (id === 'enable') {
      upsertProduct(applyEnable(row));
      onFeedback?.('产品已启用', 'success');
      return;
    }
    if (id === 'disable') {
      openDialog({ type: 'disable-product', row });
      return;
    }
    if (id === 'delete') {
      const blockReason = getProductDeleteBlockReason(row);
      if (blockReason) {
        onFeedback?.(blockReason, 'warning');
        return;
      }
      openDialog({ type: 'delete-product', row });
    }
  }

  const headerActions = [
    {
      id: 'create-product',
      label: '新增',
      icon: Plus,
      variant: 'primary',
      disabled: !canAddServiceProduct(carrierRows),
      onAction: () => {
        if (!canAddServiceProduct(carrierRows)) {
          openDialog({ type: 'blocked-add-product' });
          return;
        }
        openDialog({ type: 'product-form', mode: 'create', existingRows: productRows });
      },
    },
    {
      id: 'import-export-product',
      render: (ctx) => (
        <ImportExportActions
          target={getTransferTarget('logistics-product')}
          scopeSource={{ all: productRows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
          defaultColumnKeys={productColumns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
          notify={onFeedback}
          onOpenPage={onOpenPage}
        />
      ),
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-erp-surface">
      <LogisticsObjectList
        title="物流服务产品"
        rows={productRows}
        storageKey={PRODUCT_STORAGE_KEY}
        columns={productColumns}
        initialFilters={productInitialFilters}
        filterFields={filterFields}
        filterRows={filterProductRows}
        headerActions={headerActions}
        onCellClick={handleCellClick}
        onRowAction={handleRowAction}
        rowActions={buildProductRowActions()}
        rowActionContext={{}}
        emptyText="暂无物流服务产品，请先建立物流商后新增"
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
