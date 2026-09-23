import { useEffect, useState } from 'react';
import { DocumentEditorFrame, EditorCard } from '../components/erp/DocumentEditorFrame.jsx';
import { FormFields } from '../components/erp/FormControl.jsx';
import { WarehouseActionDialogs } from '../components/erp/WarehouseActionDialogs.jsx';
import { erpFieldGridClassName } from '../styles/typography.js';
import { readMockRows, upsertMockRow } from '../lib/mockStorage.js';
import {
  buildPhysicalStatusBadges,
  createEmptyPhysicalForm,
  dockingSystemOptions,
  dockingTypeOptions,
  operationTypeOptions,
  PHYSICAL_STORAGE_KEY,
  validatePhysicalForSave,
} from '../lib/warehouseLogic.js';
import { physicalWarehouses } from '../data/warehouseData.js';

function getInitialForm(mode, context) {
  if (mode === 'edit' && context?.row) {
    return {
      code: context.row.code,
      name: context.row.name,
      operationType: context.row.operationType,
      remark: context.row.remark || '',
      address: context.row.address || '',
      contact: context.row.contact || '',
      phone: context.row.phone || '',
      dockingType: context.row.dockingType || '',
      dockingSystem: context.row.dockingSystem || '',
      thirdPartyCode: context.row.thirdPartyCode || '',
      thirdPartyOwner: context.row.thirdPartyOwner || '',
      authConfig: context.row.authConfig || '',
    };
  }
  return createEmptyPhysicalForm();
}

function focusFirstFieldError(fieldErrors) {
  if (typeof document === 'undefined') return;
  const firstKey = Object.keys(fieldErrors)[0];
  if (!firstKey) return;
  const target = document.querySelector(`[data-field-key="${firstKey}"] input, [data-field-key="${firstKey}"] button, [data-field-key="${firstKey}"] textarea`);
  target?.focus?.();
  target?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
}

function WarehouseForm({ mode, context, onFeedback, onOpenPage }) {
  const returnPageId = context?.returnPageId || 'warehouse-physical';
  const isCreate = mode === 'create';
  const [form, setForm] = useState(() => getInitialForm(mode, context));
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(getInitialForm(mode, context)));
  const [fieldErrors, setFieldErrors] = useState({});
  const [dialog, setDialog] = useState(null);
  const dirty = JSON.stringify(form) !== savedSnapshot;

  useEffect(() => {
    const nextForm = getInitialForm(mode, context);
    setForm(nextForm);
    setSavedSnapshot(JSON.stringify(nextForm));
    setFieldErrors({});
  }, [mode, context?.row?.id]);

  function updateField(key, value) {
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleCancel() {
    if (dirty) {
      setDialog({ type: 'confirm-leave', onConfirmLeave: () => onOpenPage?.(returnPageId) });
      return;
    }
    onOpenPage?.(returnPageId);
  }

  function handleSave() {
    const existingRows = readMockRows(PHYSICAL_STORAGE_KEY, physicalWarehouses);
    const result = validatePhysicalForSave(form, existingRows, context?.row?.id);
    if (result?.fieldErrors) {
      setFieldErrors(result.fieldErrors);
      focusFirstFieldError(result.fieldErrors);
      return;
    }

    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const nextRow = {
      ...context?.row,
      ...form,
      id: context?.row?.id || `physical-warehouse-${Date.now()}`,
      useStatus: context?.row?.useStatus || 'enabled',
      auditStatus: context?.row?.auditStatus || 'draft',
      creator: context?.row?.creator || '当前用户',
      createdAt: context?.row?.createdAt || now,
      updater: '当前用户',
      updatedAt: now,
      referenced: context?.row?.referenced || false,
    };
    upsertMockRow(PHYSICAL_STORAGE_KEY, nextRow);
    setSavedSnapshot(JSON.stringify(form));
    onFeedback?.('实体仓已保存', 'success');
    onOpenPage?.(returnPageId);
  }

  const formFields = [
    { key: 'code', label: '实体仓编码', type: 'text', placeholder: '请输入实体仓编码', disabled: !isCreate },
    { key: 'name', label: '实体仓名称 *', type: 'text', placeholder: '请输入实体仓名称' },
    { key: 'operationType', label: '运营类型 *', type: 'select', options: operationTypeOptions, placeholder: '请选择运营类型' },
    { key: 'remark', label: '备注', type: 'textarea', placeholder: '请输入仓库说明', className: 'col-span-3' },
    { key: 'address', label: '仓库地址', type: 'text', placeholder: '请输入实体仓实际地址' },
    { key: 'contact', label: '联系人', type: 'text', placeholder: '请输入联系人' },
    { key: 'phone', label: '联系电话', type: 'text', placeholder: '请输入联系电话' },
    { key: 'dockingType', label: '对接方式', type: 'select', options: dockingTypeOptions, placeholder: '请选择对接方式' },
    { key: 'dockingSystem', label: '对接系统', type: 'select', options: dockingSystemOptions, placeholder: '请选择对接系统' },
    { key: 'thirdPartyCode', label: '第三方仓库编码', type: 'text', placeholder: '请输入外部系统提供的仓库编码' },
    { key: 'thirdPartyOwner', label: '第三方仓库货主', type: 'text', placeholder: '请输入货主标识' },
    { key: 'authConfig', label: '对接授权配置', type: 'text', placeholder: '请选择授权配置' },
  ];

  const sections = [
    { title: '基础信息', keys: ['code', 'name', 'operationType', 'remark'] },
    { title: '地址与联系', keys: ['address', 'contact', 'phone'] },
    { title: '对接信息', keys: ['dockingType', 'dockingSystem', 'thirdPartyCode', 'thirdPartyOwner', 'authConfig'] },
  ];

  const statusBadges = !isCreate && context?.row ? buildPhysicalStatusBadges(context.row) : [];

  return (
    <>
      <DocumentEditorFrame
        title={isCreate ? '新增实体仓' : '编辑实体仓'}
        statuses={statusBadges}
        dirty={dirty}
        onCancel={handleCancel}
        onSave={handleSave}
        showSubmit={false}
        saveLabel="保存"
      >
        {sections.map((section) => (
          <EditorCard key={section.title} title={section.title}>
            <div className={erpFieldGridClassName}>
              <FormFields
                fields={formFields.filter((field) => section.keys.includes(field.key))}
                form={form}
                onFieldChange={updateField}
                fieldErrors={fieldErrors}
              />
            </div>
          </EditorCard>
        ))}
      </DocumentEditorFrame>
      <WarehouseActionDialogs dialog={dialog} onClose={() => setDialog(null)} />
    </>
  );
}

export function WarehouseCreatePage(props) {
  return <WarehouseForm mode="create" {...props} />;
}

export function WarehouseEditPage(props) {
  return <WarehouseForm mode="edit" {...props} />;
}
