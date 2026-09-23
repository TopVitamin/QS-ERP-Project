import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { DocumentEditorFrame, EditorCard } from './DocumentEditorFrame.jsx';
import { FormFields } from './FormControl.jsx';
import { ProductActionDialogs } from './ProductActionDialogs.jsx';
import { ProductCategorySelect } from './ProductCategorySelect.jsx';
import { Button } from '../ui/button.jsx';
import { FormField } from '../ui/form-field.jsx';
import { Input } from '../ui/input.jsx';
import { Switch } from '../ui/switch.jsx';
import { SelectField } from '../ui/select-field.jsx';
import { Combobox } from '../ui/combobox.jsx';
import { erpFieldGridClassName } from '../../styles/typography.js';
import { upsertMockRow, readMockRows } from '../../lib/mockStorage.js';
import { suppliers, SUPPLIER_STORAGE_KEY } from '../../data/supplierData.js';
import { currencyOptions } from '../../data/masterData.js';
import { getSelectableAuxiliaryOptions } from '../../data/auxiliaryData.js';
import {
  createEmptyProductForm,
  formToProductRow,
  lifecycleStatusOptions,
  originOptions,
  productToForm,
  salesLevelOptions,
  validateProductForSave,
} from '../../lib/productLogic.js';
import { useStatusLabels } from '../../lib/partnerMasterLogic.js';
import { cn } from '../../lib/utils.js';

function focusFirstFieldError(fieldErrors) {
  if (typeof document === 'undefined') return;
  const firstKey = Object.keys(fieldErrors)[0];
  if (!firstKey) return;
  const target = document.querySelector(`[data-field-key="${firstKey}"] input, [data-field-key="${firstKey}"] button, [data-field-key="${firstKey}"] textarea`);
  target?.focus?.();
}

function BarcodeInput({ value, onChange, onValidate }) {
  const [draft, setDraft] = useState('');

  function addBarcode() {
    const next = draft.trim();
    if (!next) return;
    if ((value || []).includes(next)) {
      setDraft('');
      return;
    }
    const duplicateError = onValidate?.(next);
    if (duplicateError) return;
    onChange([...(value || []), next]);
    setDraft('');
  }

  return (
    <div className="col-span-3 space-y-2" data-field-key="barcodes">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addBarcode();
            }
          }}
          placeholder="输入条码后回车添加"
          aria-label="商品条码"
        />
        <Button type="button" variant="outline" size="compact" onClick={addBarcode}>添加</Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(value || []).map((barcode) => (
          <span key={barcode} className="inline-flex items-center gap-1 rounded border border-erp-border-card bg-erp-surface px-2 py-0.5 text-[12px]">
            {barcode}
            <button type="button" className="text-erp-text-muted hover:text-erp-danger" onClick={() => onChange(value.filter((item) => item !== barcode))} aria-label={`删除条码${barcode}`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

function ImageSlot({ label, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[12px] text-erp-text-muted">{label}</div>
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded border border-erp-border-card bg-erp-surface">
        {value ? <img src={value} alt={label} className="h-full w-full object-cover" /> : <span className="text-[10px] text-erp-text-muted">无图</span>}
      </div>
      <input
        type="file"
        accept="image/*"
        className="block w-full text-[11px] text-erp-text-muted"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => onChange(String(reader.result || ''));
          reader.readAsDataURL(file);
        }}
      />
      {value && (
        <Button type="button" variant="text" size="compact" className="h-6 px-0 text-[11px]" onClick={() => onChange('')}>删除</Button>
      )}
    </div>
  );
}

const imageSlots = [
  { key: 'main', label: '主视图' },
  { key: 'left', label: '左视图' },
  { key: 'right', label: '右视图' },
  { key: 'top', label: '顶视图' },
  { key: 'bottom', label: '底视图' },
  { key: 'back', label: '背视图' },
  { key: 'panorama', label: '全景图' },
];

const batteryOptions = [
  { value: '', label: '未填写' },
  { value: 'yes', label: '是' },
  { value: 'no', label: '否' },
];

export function ProductForm({ mode, context, config, onFeedback, onOpenPage }) {
  const isCreate = mode === 'create';
  const isEdit = mode === 'edit';
  const [form, setForm] = useState(() => (isEdit && context?.row ? productToForm(context.row) : createEmptyProductForm()));
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(form));
  const [fieldErrors, setFieldErrors] = useState({});
  const [dialog, setDialog] = useState(null);
  const [barcodeError, setBarcodeError] = useState('');
  const dirty = JSON.stringify(form) !== savedSnapshot;

  const existingRows = useMemo(() => readMockRows(config.storageKey, config.seedRows), [config.storageKey, config.seedRows]);

  const supplierOptions = useMemo(() => {
    const rows = readMockRows(SUPPLIER_STORAGE_KEY, suppliers);
    return rows
      .filter((item) => item.auditStatus === 'approved' && item.useStatus === 'enabled')
      .map((item) => ({ value: item.code, label: `${item.code} ${item.name}` }));
  }, []);

  const currencySelectOptions = currencyOptions.map((item) => ({ value: item.value, label: item.label }));
  // 品牌与基本单位取自辅助资料启用项（商品新增编辑页 Demo PRD：仅可选启用的基本单位/品牌）。
  const brandOptions = useMemo(() => getSelectableAuxiliaryOptions('brand'), []);
  const unitOptions = useMemo(() => getSelectableAuxiliaryOptions('unit'), []);

  useEffect(() => {
    const nextForm = isEdit && context?.row ? productToForm(context.row) : createEmptyProductForm();
    setForm(nextForm);
    setSavedSnapshot(JSON.stringify(nextForm));
    setFieldErrors({});
    setBarcodeError('');
  }, [mode, context?.row?.id, isEdit]);

  function updateField(key, value) {
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateCategory(selection) {
    setFieldErrors((current) => {
      if (!current.categoryLevel3) return current;
      const next = { ...current };
      delete next.categoryLevel3;
      return next;
    });
    setForm((current) => ({
      ...current,
      categoryLevel1: selection.level1,
      categoryLevel2: selection.level2,
      categoryLevel3: selection.level3,
    }));
  }

  function updateImage(key, value) {
    setForm((current) => ({ ...current, images: { ...current.images, [key]: value } }));
  }

  function validateBarcode(barcode) {
    const duplicate = existingRows.find((row) => row.id !== context?.row?.id && (row.barcodes || []).includes(barcode));
    if (duplicate) {
      setBarcodeError('该条码已被使用');
      return '该条码已被使用';
    }
    setBarcodeError('');
    return null;
  }

  function getReturnPageId() {
    return context?.returnPageId || config.listPageId;
  }

  function handleCancel() {
    // 离开确认由 DocumentEditorFrame 统一承担，避免连续两次确认。
    onOpenPage?.(getReturnPageId(), context?.returnPageId ? { row: context.row } : undefined);
  }

  function handleSave() {
    const result = validateProductForSave(form, existingRows, context?.row?.id);
    if (result?.fieldErrors) {
      setFieldErrors(result.fieldErrors);
      focusFirstFieldError(result.fieldErrors);
      return;
    }
    if (result?.message) {
      onFeedback?.(result.message, 'warning');
      return;
    }

    const nextRow = formToProductRow(form, context?.row);
    upsertMockRow(config.storageKey, nextRow);
    setSavedSnapshot(JSON.stringify(form));
    onFeedback?.(config.saveSuccessMessage, 'success');
    if (context?.returnPageId) {
      onOpenPage?.(context.returnPageId, { row: nextRow });
      return;
    }
    onOpenPage?.(config.listPageId);
  }

  const statuses = isEdit && context?.row
    ? [{ label: useStatusLabels[context.row.useStatus] || context.row.useStatus }]
    : [];

  const readOnlyPrice = isEdit;

  return (
    <>
      <DocumentEditorFrame
        title={isCreate ? config.createTitle : config.editTitle}
        statuses={statuses}
        onCancel={handleCancel}
        onSave={handleSave}
      >
        <div className="space-y-3 p-4">
          <EditorCard title="基础信息">
            <div className={cn('grid gap-x-5 gap-y-3 p-4', erpFieldGridClassName)}>
              <FormFields
                fields={[
                  { key: 'code', label: '商品编码 *', type: 'text', placeholder: '请输入商品编码', disabled: isEdit },
                  { key: 'name', label: '商品名称 *', type: 'text', placeholder: '请输入商品名称' },
                  { key: 'shortName', label: '商品简称', type: 'text', placeholder: '请输入商品简称' },
                  { key: 'mnemonic', label: '助记码', type: 'text', placeholder: '请输入助记码' },
                ]}
                form={form}
                onFieldChange={updateField}
                fieldErrors={fieldErrors}
              />
              <ProductCategorySelect
                value={{ level1: form.categoryLevel1, level2: form.categoryLevel2, level3: form.categoryLevel3 }}
                onChange={updateCategory}
                error={fieldErrors.categoryLevel3}
              />
              <FormFields
                fields={[
                  { key: 'brand', label: '品牌', type: 'select', options: brandOptions, placeholder: '请选择品牌' },
                  { key: 'model', label: '产品型号', type: 'text', placeholder: '请输入产品型号' },
                  { key: 'unit', label: '基本单位 *', type: 'select', options: unitOptions, placeholder: '请选择基本单位' },
                  { key: 'origin', label: '产地', type: 'select', options: originOptions, placeholder: '请选择产地' },
                  { key: 'spec', label: '规格描述', type: 'textarea', placeholder: '颜色、功率、容量、线长等', className: 'col-span-3' },
                  { key: 'remark', label: '商品备注', type: 'textarea', placeholder: '请输入备注', className: 'col-span-3' },
                ]}
                form={form}
                onFieldChange={updateField}
                fieldErrors={fieldErrors}
              />
              <BarcodeInput value={form.barcodes} onChange={(value) => updateField('barcodes', value)} onValidate={validateBarcode} />
              {barcodeError && <div className="col-span-3 text-[12px] text-erp-danger">{barcodeError}</div>}
            </div>
          </EditorCard>

          <EditorCard title="经营与状态">
            <div className={cn('grid gap-x-5 gap-y-3 p-4', erpFieldGridClassName)}>
              <FormFields
                fields={[
                  { key: 'salesLevel', label: '商品销售等级', type: 'select', options: salesLevelOptions },
                  { key: 'lifecycleStatus', label: '商品生命周期状态', type: 'select', options: lifecycleStatusOptions },
                  { key: 'firstSaleDate', label: '首次上市日期', type: 'date' },
                  { key: 'stopSaleDate', label: '停售日期', type: 'date' },
                  ...(isEdit ? [{ key: 'useStatus', label: '使用状态', type: 'disabled', getValue: () => useStatusLabels[context.row.useStatus] || '-' }] : []),
                ]}
                form={form}
                onFieldChange={updateField}
                fieldErrors={fieldErrors}
              />
            </div>
          </EditorCard>

          <EditorCard title="价格信息">
            <div className={cn('grid gap-x-5 gap-y-3 p-4', erpFieldGridClassName)}>
              <FormField label="初始供应商" fieldKey="initialSupplier" error={fieldErrors.initialSupplier}>
                <Combobox
                  value={form.initialSupplier || ''}
                  onValueChange={(value) => updateField('initialSupplier', value)}
                  options={supplierOptions}
                  placeholder="请选择初始供应商"
                  ariaLabel="初始供应商"
                  disabled={readOnlyPrice}
                />
              </FormField>
              <FormFields
                fields={[
                  { key: 'initialPurchasePrice', label: '初始含税采购价', type: 'text', placeholder: '请输入采购价', disabled: readOnlyPrice },
                  { key: 'initialSalePrice', label: '初始含税销售价', type: 'text', placeholder: '请输入销售价', disabled: readOnlyPrice },
                  { key: 'currency', label: '币别', type: 'select', options: currencySelectOptions, placeholder: '请选择币别', disabled: readOnlyPrice },
                ]}
                form={form}
                onFieldChange={updateField}
                fieldErrors={fieldErrors}
              />
            </div>
          </EditorCard>

          <EditorCard title="开票信息">
            <div className={cn('grid gap-x-5 gap-y-3 p-4', erpFieldGridClassName)}>
              <FormFields
                fields={[
                  { key: 'invoiceName', label: '商品开票名称', type: 'text', placeholder: '请输入开票名称' },
                  { key: 'invoiceSpec', label: '商品开票规格型号', type: 'text', placeholder: '请输入开票规格型号' },
                  { key: 'taxCode', label: '商品税收分类编码', type: 'text', placeholder: '请输入税收分类编码' },
                  { key: 'defaultTaxRate', label: '默认销售税率(%)', type: 'text', placeholder: '可为空' },
                ]}
                form={form}
                onFieldChange={updateField}
                fieldErrors={fieldErrors}
              />
            </div>
          </EditorCard>

          <EditorCard title="重量与尺寸">
            <div className={cn('grid gap-x-5 gap-y-3 p-4', erpFieldGridClassName)}>
              <FormFields
                fields={[
                  { key: 'netWeight', label: '商品净重(kg)', type: 'text', placeholder: 'kg' },
                  { key: 'length', label: '商品长度(cm)', type: 'text', placeholder: 'cm' },
                  { key: 'width', label: '商品宽度(cm)', type: 'text', placeholder: 'cm' },
                  { key: 'height', label: '商品高度(cm)', type: 'text', placeholder: 'cm' },
                  { key: 'cartonWeight', label: '外箱毛重(kg)', type: 'text', placeholder: 'kg' },
                  { key: 'cartonLength', label: '外箱长度(cm)', type: 'text', placeholder: 'cm' },
                  { key: 'cartonWidth', label: '外箱宽度(cm)', type: 'text', placeholder: 'cm' },
                  { key: 'cartonHeight', label: '外箱高度(cm)', type: 'text', placeholder: 'cm' },
                ]}
                form={form}
                onFieldChange={updateField}
                fieldErrors={fieldErrors}
              />
            </div>
          </EditorCard>

          <EditorCard title="包装与单位">
            <div className={cn('grid gap-x-5 gap-y-3 p-4', erpFieldGridClassName)}>
              <FormFields
                fields={[
                  { key: 'cartonQty', label: '外箱装箱数量', type: 'text', placeholder: '请输入数量' },
                  { key: 'auxUnit', label: '辅助计量单位', type: 'select', options: unitOptions, placeholder: '请选择单位' },
                  { key: 'unitConversion', label: '单位换算数量', type: 'text', placeholder: '一期不执行换算' },
                ]}
                form={form}
                onFieldChange={updateField}
                fieldErrors={fieldErrors}
              />
            </div>
          </EditorCard>

          <EditorCard title="库存预警">
            <div className={cn('grid gap-x-5 gap-y-3 p-4', erpFieldGridClassName)}>
              <FormField label="是否启用库存预警" fieldKey="stockAlertEnabled">
                <Switch checked={form.stockAlertEnabled} onCheckedChange={(value) => updateField('stockAlertEnabled', value)} aria-label="是否启用库存预警" />
              </FormField>
              <FormFields
                fields={[
                  { key: 'minStock', label: '最低库存数量', type: 'text', placeholder: '基本单位', disabled: !form.stockAlertEnabled },
                  { key: 'maxStock', label: '最高库存数量', type: 'text', placeholder: '基本单位' },
                  { key: 'safetyStock', label: '安全库存数量', type: 'text', placeholder: '基本单位' },
                ]}
                form={form}
                onFieldChange={updateField}
                fieldErrors={fieldErrors}
              />
            </div>
          </EditorCard>

          <EditorCard title="管理属性">
            <div className={cn('grid gap-x-5 gap-y-3 p-4', erpFieldGridClassName)}>
              <FormField label="是否含电池" fieldKey="hasBattery">
                <SelectField
                  value={form.hasBattery === true ? 'yes' : form.hasBattery === false ? 'no' : ''}
                  onValueChange={(value) => updateField('hasBattery', value === 'yes' ? true : value === 'no' ? false : null)}
                  options={batteryOptions}
                  placeholder="未填写"
                  ariaLabel="是否含电池"
                />
              </FormField>
              <FormField label="是否批次管理" fieldKey="batchManaged">
                <Switch checked={form.batchManaged} onCheckedChange={(value) => updateField('batchManaged', value)} aria-label="是否批次管理" />
              </FormField>
              <FormField label="是否序列号管理" fieldKey="serialManaged">
                <Switch checked={form.serialManaged} onCheckedChange={(value) => updateField('serialManaged', value)} aria-label="是否序列号管理" />
              </FormField>
              <FormField label="是否保质期管理" fieldKey="shelfLifeManaged">
                <Switch checked={form.shelfLifeManaged} onCheckedChange={(value) => updateField('shelfLifeManaged', value)} aria-label="是否保质期管理" />
              </FormField>
              <FormFields
                fields={[
                  { key: 'shelfLifeDays', label: '保质期天数', type: 'text', placeholder: '天', disabled: !form.shelfLifeManaged },
                  { key: 'nearExpiryDays', label: '临期预警天数', type: 'text', placeholder: '天' },
                ]}
                form={form}
                onFieldChange={updateField}
                fieldErrors={fieldErrors}
              />
            </div>
          </EditorCard>

          <EditorCard title="商品图片">
            <div className="grid grid-cols-7 gap-3 p-4">
              {imageSlots.map((slot) => (
                <ImageSlot
                  key={slot.key}
                  label={slot.label}
                  value={form.images?.[slot.key] || ''}
                  onChange={(value) => updateImage(slot.key, value)}
                />
              ))}
            </div>
          </EditorCard>
        </div>
      </DocumentEditorFrame>
      <ProductActionDialogs dialog={dialog} onClose={() => setDialog(null)} />
    </>
  );
}
