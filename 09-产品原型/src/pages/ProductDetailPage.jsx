import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/button.jsx';
import { DetailField, DocumentDetailFrame, EditorCard } from '../components/erp/DocumentDetailFrame.jsx';
import { ProductActionDialogs } from '../components/erp/ProductActionDialogs.jsx';
import { PRODUCT_STORAGE_KEY, products } from '../data/productData.js';
import { erpFieldGridClassName } from '../styles/typography.js';
import { EMPTY_PLACEHOLDER, formatAmount } from '../lib/format.js';
import { readMockRows, subscribeMockRows, upsertMockRow, writeMockRows } from '../lib/mockStorage.js';
import { useStatusLabels } from '../lib/partnerMasterLogic.js';
import {
  applyEnable,
  canDisableProduct,
  canEnableProduct,
  getDeleteBlockReason,
  renderBoolean,
  renderLifecycle,
  renderSalesLevel,
} from '../lib/productLogic.js';
import { suppliers, SUPPLIER_STORAGE_KEY } from '../data/supplierData.js';
import { resolveCurrencyCode, resolveCurrencyLabel } from '../data/partnerMasterOptions.js';
import { cn } from '../lib/utils.js';

const imageSlots = [
  { key: 'main', label: '主视图' },
  { key: 'left', label: '左视图' },
  { key: 'right', label: '右视图' },
  { key: 'top', label: '顶视图' },
  { key: 'bottom', label: '底视图' },
  { key: 'back', label: '背视图' },
  { key: 'panorama', label: '全景图' },
];

function resolveSupplierLabel(code) {
  if (!code) return EMPTY_PLACEHOLDER;
  const row = readMockRows(SUPPLIER_STORAGE_KEY, suppliers).find((item) => item.code === code);
  return row ? `${row.code} ${row.name}` : code;
}

function formatPrice(value, currency) {
  if (value === '' || value == null) return EMPTY_PLACEHOLDER;
  const amount = formatAmount(value);
  return currency ? `${currency} ${amount}` : amount;
}

function DetailSection({ title, fields }) {
  return (
    <EditorCard title={title}>
      <div className={cn('grid gap-x-5 gap-y-3 p-4', erpFieldGridClassName)}>
        {fields.map((field) => (
          <DetailField key={field.key} label={field.label} value={field.value} className={field.className} />
        ))}
      </div>
    </EditorCard>
  );
}

export function ProductDetailPage({ context, onFeedback, onOpenPage }) {
  const [rows, setRows] = useState(() => readMockRows(PRODUCT_STORAGE_KEY, products));
  const [dialog, setDialog] = useState(null);

  useEffect(() => subscribeMockRows(PRODUCT_STORAGE_KEY, setRows), []);

  const row = useMemo(() => {
    const source = context?.row;
    if (!source) return null;
    return rows.find((item) => item.id === source.id || item.code === source.code) || source;
  }, [context?.row, rows]);

  if (!row) {
    return (
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 bg-erp-surface text-erp-text-muted">
        <p>商品不存在或已删除</p>
        <Button variant="outline" size="compact" onClick={() => onOpenPage?.('base-product')}>返回列表</Button>
      </main>
    );
  }

  function handleDialogComplete(result) {
    if (!result) return;
    if (result.action === 'delete' && result.row) {
      writeMockRows(PRODUCT_STORAGE_KEY, rows.filter((item) => item.id !== result.row.id));
      onOpenPage?.('base-product');
      onFeedback?.(result.message, result.type || 'success');
      return;
    }
    if (result.nextRow) upsertMockRow(PRODUCT_STORAGE_KEY, { ...result.row, ...result.nextRow, id: result.row.id });
    if (result.message) onFeedback?.(result.message, result.type || 'success');
  }

  function handleAction(id) {
    if (id === 'edit') {
      onOpenPage?.('base-product-edit', { row, returnPageId: 'base-product-detail' });
      return;
    }
    if (id === 'enable') {
      upsertMockRow(PRODUCT_STORAGE_KEY, applyEnable(row));
      onFeedback?.('商品已启用', 'success');
      return;
    }
    if (id === 'delete' && getDeleteBlockReason(row)) {
      onFeedback?.(getDeleteBlockReason(row), 'warning');
      return;
    }
    setDialog({ type: id, row });
  }

  const deleteBlocked = Boolean(getDeleteBlockReason(row));

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="compact" onClick={() => handleAction('edit')}>编辑</Button>
      {canDisableProduct(row) && <Button variant="outline" size="compact" onClick={() => handleAction('disable')}>禁用</Button>}
      {canEnableProduct(row) && <Button variant="outline" size="compact" onClick={() => handleAction('enable')}>启用</Button>}
      <Button variant="outline" size="compact" disabled={deleteBlocked} onClick={() => handleAction('delete')}>删除</Button>
    </div>
  );

  const barcodes = (row.barcodes || []).length ? (row.barcodes || []).join('、') : EMPTY_PLACEHOLDER;

  return (
    <>
      <DocumentDetailFrame
        title={`商品详情 · ${row.code}`}
        headerActions={headerActions}
        onBack={() => onOpenPage?.('base-product')}
        statuses={[{ label: useStatusLabels[row.useStatus] || row.useStatus, tone: row.useStatus === 'disabled' ? 'neutral' : 'success' }]}
      >
        <div className="space-y-3 p-4">
          <DetailSection
            title="基础信息"
            fields={[
              { key: 'code', label: '商品编码', value: row.code },
              { key: 'name', label: '商品名称', value: row.name },
              { key: 'shortName', label: '商品简称', value: row.shortName || EMPTY_PLACEHOLDER },
              { key: 'mnemonic', label: '助记码', value: row.mnemonic || EMPTY_PLACEHOLDER },
              { key: 'categoryPath', label: '商品分类', value: row.categoryPath || EMPTY_PLACEHOLDER },
              { key: 'brand', label: '品牌', value: row.brand || EMPTY_PLACEHOLDER },
              { key: 'model', label: '产品型号', value: row.model || EMPTY_PLACEHOLDER },
              { key: 'unit', label: '基本单位', value: row.unit || EMPTY_PLACEHOLDER },
              { key: 'barcodes', label: '商品条码', value: barcodes, className: 'col-span-3' },
              { key: 'origin', label: '产地', value: row.origin || EMPTY_PLACEHOLDER },
              { key: 'spec', label: '规格描述', value: row.spec || EMPTY_PLACEHOLDER, className: 'col-span-3' },
              { key: 'remark', label: '商品备注', value: row.remark || EMPTY_PLACEHOLDER, className: 'col-span-3' },
            ]}
          />
          <DetailSection
            title="经营与状态"
            fields={[
              { key: 'salesLevel', label: '商品销售等级', value: renderSalesLevel(row.salesLevel) },
              { key: 'lifecycleStatus', label: '商品生命周期状态', value: renderLifecycle(row.lifecycleStatus) },
              { key: 'useStatus', label: '使用状态', value: useStatusLabels[row.useStatus] || EMPTY_PLACEHOLDER },
              { key: 'firstSaleDate', label: '首次上市日期', value: row.firstSaleDate || EMPTY_PLACEHOLDER },
              { key: 'stopSaleDate', label: '停售日期', value: row.stopSaleDate || EMPTY_PLACEHOLDER },
            ]}
          />
          <DetailSection
            title="价格信息"
            fields={[
              { key: 'initialSupplier', label: '初始供应商', value: resolveSupplierLabel(row.initialSupplier) },
              { key: 'initialPurchasePrice', label: '初始含税采购价', value: formatPrice(row.initialPurchasePrice, resolveCurrencyCode(row.currency)) },
              { key: 'initialSalePrice', label: '初始含税销售价', value: formatPrice(row.initialSalePrice, resolveCurrencyCode(row.currency)) },
              { key: 'currency', label: '币别', value: row.currency ? resolveCurrencyLabel(row.currency) : EMPTY_PLACEHOLDER },
            ]}
          />
          <DetailSection
            title="开票信息"
            fields={[
              { key: 'invoiceName', label: '商品开票名称', value: row.invoiceName || EMPTY_PLACEHOLDER },
              { key: 'invoiceSpec', label: '商品开票规格型号', value: row.invoiceSpec || EMPTY_PLACEHOLDER },
              { key: 'taxCode', label: '商品税收分类编码', value: row.taxCode || EMPTY_PLACEHOLDER },
              { key: 'defaultTaxRate', label: '默认销售税率', value: row.defaultTaxRate ? `${row.defaultTaxRate}%` : EMPTY_PLACEHOLDER },
            ]}
          />
          <DetailSection
            title="重量与尺寸"
            fields={[
              { key: 'netWeight', label: '商品净重(kg)', value: row.netWeight || EMPTY_PLACEHOLDER },
              { key: 'length', label: '商品长度(cm)', value: row.length || EMPTY_PLACEHOLDER },
              { key: 'width', label: '商品宽度(cm)', value: row.width || EMPTY_PLACEHOLDER },
              { key: 'height', label: '商品高度(cm)', value: row.height || EMPTY_PLACEHOLDER },
              { key: 'cartonWeight', label: '外箱毛重(kg)', value: row.cartonWeight || EMPTY_PLACEHOLDER },
              { key: 'cartonLength', label: '外箱长度(cm)', value: row.cartonLength || EMPTY_PLACEHOLDER },
              { key: 'cartonWidth', label: '外箱宽度(cm)', value: row.cartonWidth || EMPTY_PLACEHOLDER },
              { key: 'cartonHeight', label: '外箱高度(cm)', value: row.cartonHeight || EMPTY_PLACEHOLDER },
            ]}
          />
          <DetailSection
            title="包装与单位"
            fields={[
              { key: 'cartonQty', label: '外箱装箱数量', value: row.cartonQty || EMPTY_PLACEHOLDER },
              { key: 'auxUnit', label: '辅助计量单位', value: row.auxUnit || EMPTY_PLACEHOLDER },
              { key: 'unitConversion', label: '单位换算数量', value: row.unitConversion || EMPTY_PLACEHOLDER },
            ]}
          />
          <DetailSection
            title="库存预警"
            fields={[
              { key: 'stockAlertEnabled', label: '是否启用库存预警', value: renderBoolean(row.stockAlertEnabled) },
              { key: 'minStock', label: '最低库存数量', value: row.minStock || EMPTY_PLACEHOLDER },
              { key: 'maxStock', label: '最高库存数量', value: row.maxStock || EMPTY_PLACEHOLDER },
              { key: 'safetyStock', label: '安全库存数量', value: row.safetyStock || EMPTY_PLACEHOLDER },
            ]}
          />
          <DetailSection
            title="管理属性"
            fields={[
              { key: 'hasBattery', label: '是否含电池', value: renderBoolean(row.hasBattery) },
              { key: 'batchManaged', label: '是否批次管理', value: renderBoolean(row.batchManaged) },
              { key: 'serialManaged', label: '是否序列号管理', value: renderBoolean(row.serialManaged) },
              { key: 'shelfLifeManaged', label: '是否保质期管理', value: renderBoolean(row.shelfLifeManaged) },
              { key: 'shelfLifeDays', label: '保质期天数', value: row.shelfLifeDays ? `${row.shelfLifeDays}天` : EMPTY_PLACEHOLDER },
              { key: 'nearExpiryDays', label: '临期预警天数', value: row.nearExpiryDays ? `${row.nearExpiryDays}天` : EMPTY_PLACEHOLDER },
            ]}
          />
          <EditorCard title="商品图片">
            <div className="grid grid-cols-7 gap-3 p-4">
              {imageSlots.map((slot) => {
                const src = row.images?.[slot.key];
                return (
                  <div key={slot.key} className="space-y-1.5">
                    <div className="text-[12px] text-erp-text-muted">{slot.label}</div>
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded border border-erp-border-card bg-erp-surface">
                      {src ? <img src={src} alt={slot.label} className="h-full w-full object-cover" /> : <span className="text-[10px] text-erp-text-muted">无图</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </EditorCard>
          <DetailSection
            title="维护信息"
            fields={[
              { key: 'creator', label: '创建人', value: row.creator || EMPTY_PLACEHOLDER },
              { key: 'createdAt', label: '创建时间', value: row.createdAt || EMPTY_PLACEHOLDER },
              { key: 'updater', label: '最后更新人', value: row.updater || EMPTY_PLACEHOLDER },
              { key: 'updatedAt', label: '最后更新时间', value: row.updatedAt || EMPTY_PLACEHOLDER },
            ]}
          />
        </div>
      </DocumentDetailFrame>
      <ProductActionDialogs dialog={dialog} onClose={() => setDialog(null)} onComplete={handleDialogComplete} />
    </>
  );
}
