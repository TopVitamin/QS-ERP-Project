import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../components/ui/button.jsx';
import { DataTable } from '../components/erp/DataTable.jsx';
import { DetailField, DocumentDetailFrame, EditorCard } from '../components/erp/DocumentDetailFrame.jsx';
import { LogisticsActionDialogs } from '../components/erp/LogisticsActionDialogs.jsx';
import { erpFieldGridClassName } from '../styles/typography.js';
import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import { readMockRows, subscribeMockRows, writeMockRows } from '../lib/mockStorage.js';
import { useStatusLabels } from '../lib/partnerMasterLogic.js';
import {
  applyEnable,
  canAddServiceProduct,
  canDisable,
  canEnable,
  CARRIER_STORAGE_KEY,
  getCarrierDeleteBlockReason,
  getProductDeleteBlockReason,
  PRODUCT_STORAGE_KEY,
} from '../lib/logisticsLogic.js';
import { carriers, createProductColumns, logisticsProducts } from '../data/logisticsData.js';

function buildDetailFields(row) {
  return [
    { key: 'code', label: '物流商编码', value: row.code },
    { key: 'name', label: '物流商名称', value: row.name },
    { key: 'contact', label: '联系人', value: row.contact || EMPTY_PLACEHOLDER },
    { key: 'phone', label: '联系电话', value: row.phone || EMPTY_PLACEHOLDER },
    { key: 'address', label: '联系地址', value: row.address || EMPTY_PLACEHOLDER, className: 'col-span-3' },
    { key: 'useStatus', label: '使用状态', value: useStatusLabels[row.useStatus] || EMPTY_PLACEHOLDER },
    { key: 'creator', label: '创建人', value: row.creator || EMPTY_PLACEHOLDER },
    { key: 'createdAt', label: '创建时间', value: row.createdAt || EMPTY_PLACEHOLDER },
    { key: 'updater', label: '最后更新人', value: row.updater || EMPTY_PLACEHOLDER },
    { key: 'updatedAt', label: '最后更新时间', value: row.updatedAt || EMPTY_PLACEHOLDER },
  ];
}

const productRowActions = [
  { id: 'view', label: '查看' },
  { id: 'edit', label: '编辑' },
  { id: 'disable', label: '禁用', variant: 'danger', visibleWhen: canDisable },
  { id: 'enable', label: '启用', visibleWhen: canEnable },
  { id: 'delete', label: '删除', variant: 'danger' },
];

export function LogisticsCarrierDetailPage({ context, onFeedback, onOpenPage }) {
  const returnPageId = context?.returnPageId || 'base-logistics-carrier';
  const [carrierRows, setCarrierRows] = useState(() => readMockRows(CARRIER_STORAGE_KEY, carriers));
  const [productRows, setProductRows] = useState(() => readMockRows(PRODUCT_STORAGE_KEY, logisticsProducts));
  const [dialog, setDialog] = useState(null);

  const row = useMemo(() => {
    const source = context?.row;
    if (!source) return null;
    return carrierRows.find((item) => item.id === source.id) || source;
  }, [context?.row, carrierRows]);

  useEffect(() => subscribeMockRows(CARRIER_STORAGE_KEY, setCarrierRows), []);
  useEffect(() => subscribeMockRows(PRODUCT_STORAGE_KEY, setProductRows), []);

  const childProductRows = useMemo(
    () => productRows.filter((item) => item.carrierId === row?.id).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))),
    [productRows, row?.id],
  );

  const productColumns = useMemo(
    () => createProductColumns(carrierRows).filter((column) => column.key !== 'carrierId'),
    [carrierRows],
  );

  if (!row) {
    return (
      <main className="flex min-h-0 flex-1 items-center justify-center bg-erp-surface text-erp-text-muted">
        未找到物流商记录
      </main>
    );
  }

  const canCreateProduct = row.useStatus === 'enabled';

  function openDialog(payload) {
    setDialog({ ...payload, carriers: carrierRows, products: productRows });
  }

  function upsertCarrier(nextRow) {
    const current = readMockRows(CARRIER_STORAGE_KEY, carriers);
    const index = current.findIndex((item) => item.id === nextRow.id);
    const nextRows = index < 0 ? [nextRow, ...current] : current.map((item, itemIndex) => (itemIndex === index ? nextRow : item));
    writeMockRows(CARRIER_STORAGE_KEY, nextRows);
    setCarrierRows(nextRows);
  }

  function upsertProduct(nextRow) {
    const current = readMockRows(PRODUCT_STORAGE_KEY, logisticsProducts);
    const index = current.findIndex((item) => item.id === nextRow.id);
    const nextRows = index < 0 ? [nextRow, ...current] : current.map((item, itemIndex) => (itemIndex === index ? nextRow : item));
    writeMockRows(PRODUCT_STORAGE_KEY, nextRows);
    setProductRows(nextRows);
  }

  function removeProduct(productId) {
    const nextRows = readMockRows(PRODUCT_STORAGE_KEY, logisticsProducts).filter((item) => item.id !== productId);
    writeMockRows(PRODUCT_STORAGE_KEY, nextRows);
    setProductRows(nextRows);
  }

  function handleHeaderAction(id) {
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
      return;
    }
    if (id === 'add-product') {
      if (!canAddServiceProduct(carrierRows) || !canCreateProduct) {
        openDialog({ type: 'blocked-add-product' });
        return;
      }
      openDialog({
        type: 'product-form',
        mode: 'create',
        existingRows: productRows,
        defaultCarrierId: row.id,
      });
    }
  }

  function handleProductRowAction(id, productRow) {
    if (id === 'view') {
      openDialog({ type: 'product-form', mode: 'view', row: productRow });
      return;
    }
    if (id === 'edit') {
      openDialog({ type: 'product-form', mode: 'edit', row: productRow, existingRows: productRows });
      return;
    }
    if (id === 'enable') {
      upsertProduct(applyEnable(productRow));
      onFeedback?.('产品已启用', 'success');
      return;
    }
    if (id === 'disable') {
      openDialog({ type: 'disable-product', row: productRow });
      return;
    }
    if (id === 'delete') {
      const blockReason = getProductDeleteBlockReason(productRow);
      if (blockReason) {
        onFeedback?.(blockReason, 'warning');
        return;
      }
      openDialog({ type: 'delete-product', row: productRow });
    }
  }

  function handleDialogComplete(result) {
    if (!result) return;

    if (result.action === 'save-carrier' && result.payload) {
      upsertCarrier(result.payload);
      onFeedback?.(result.message, result.type || 'success');
      return;
    }

    if (result.action === 'save-product' && result.payload) {
      upsertProduct(result.payload);
      onFeedback?.(result.message, result.type || 'success');
      return;
    }

    if (result.action === 'delete-carrier' && result.row) {
      writeMockRows(CARRIER_STORAGE_KEY, carrierRows.filter((item) => item.id !== result.row.id));
      onOpenPage?.(returnPageId);
      onFeedback?.(result.message, result.type || 'success');
      return;
    }

    if (result.action === 'delete-product' && result.row) {
      removeProduct(result.row.id);
      onFeedback?.(result.message, result.type || 'success');
      return;
    }

    if (result.action === 'update-carrier' && result.nextRow) {
      upsertCarrier(result.nextRow);
      onFeedback?.(result.message, result.type || 'success');
      return;
    }

    if (result.action === 'update-product' && result.nextRow) {
      upsertProduct(result.nextRow);
      onFeedback?.(result.message, result.type || 'success');
    }
  }

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="compact" onClick={() => handleHeaderAction('edit')}>编辑</Button>
      {canEnable(row) && <Button variant="outline" size="compact" onClick={() => handleHeaderAction('enable')}>启用</Button>}
      {canDisable(row) && <Button variant="outline" size="compact" onClick={() => handleHeaderAction('disable')}>禁用</Button>}
      <Button variant="outline" size="compact" onClick={() => handleHeaderAction('delete')}>删除</Button>
      <Button
        variant="outline"
        size="compact"
        disabled={!canCreateProduct}
        title={!canCreateProduct ? '物流商启用后才能新增服务产品' : undefined}
        onClick={() => handleHeaderAction('add-product')}
      >
        新增服务产品
      </Button>
    </div>
  );

  const fields = buildDetailFields(row);
  const baseFields = fields.slice(0, 5);
  const metaFields = fields.slice(5);

  const statusBadges = [{
    label: useStatusLabels[row.useStatus] || row.useStatus,
    tone: row.useStatus === 'disabled' ? 'neutral' : 'success',
  }];

  return (
    <>
      <DocumentDetailFrame
        title={row.code}
        statuses={statusBadges}
        headerActions={headerActions}
        onBack={() => onOpenPage?.(returnPageId)}
      >
        <EditorCard title="基础信息">
          <div className={erpFieldGridClassName}>
            {baseFields.map((field) => <DetailField key={field.key} {...field} />)}
          </div>
        </EditorCard>
        <EditorCard
          title="物流服务产品"
          actions={(
            <Button variant="outline" size="compact" disabled={!canCreateProduct} onClick={() => handleHeaderAction('add-product')}>
              <Plus className="h-3.5 w-3.5" strokeWidth={1.9} />
              新增服务产品
            </Button>
          )}
        >
          {childProductRows.length ? (
            <DataTable
              rows={childProductRows}
              columns={productColumns}
              rowActions={productRowActions}
              rowActionsMaxVisible={3}
              onRowAction={handleProductRowAction}
              onCellClick={(column, productRow) => {
                if (column.key === 'code') handleProductRowAction('view', productRow);
              }}
            />
          ) : (
            <div className="px-4 py-8 text-center text-[12px] text-erp-text-muted">
              暂无物流服务产品，物流商启用后可以新增
            </div>
          )}
        </EditorCard>
        <EditorCard title="维护信息">
          <div className={erpFieldGridClassName}>
            {metaFields.map((field) => <DetailField key={field.key} {...field} />)}
          </div>
        </EditorCard>
      </DocumentDetailFrame>
      <LogisticsActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        carriers={carrierRows}
        products={productRows}
      />
    </>
  );
}
