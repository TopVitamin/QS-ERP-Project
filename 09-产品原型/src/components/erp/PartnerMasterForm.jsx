import { useEffect, useState } from 'react';
import { DocumentEditorFrame, EditorCard } from './DocumentEditorFrame.jsx';
import { FormFields } from './FormControl.jsx';
import { PartnerActionDialogs } from './PartnerActionDialogs.jsx';
import {
  CityTableCell,
  CountryRegionTableCell,
  DetailAddressTableCell,
  DistrictTableCell,
  StateProvinceTableCell,
} from './InternationalAddressTableCells.jsx';
import { PartnerEditableTable } from './PartnerEditableTable.jsx';
import { erpFieldGridClassName } from '../../styles/typography.js';
import { upsertMockRow } from '../../lib/mockStorage.js';
import {
  buildPartnerStatusBadges,
  addressTypeOptions,
  contactTypeOptions,
  formatNow,
  toggleDefaultFlag,
} from '../../lib/partnerMasterLogic.js';
import { currencySelectOptions } from '../../data/partnerMasterOptions.js';

function focusFirstFieldError(fieldErrors) {
  if (typeof document === 'undefined') return;
  const firstKey = Object.keys(fieldErrors)[0];
  if (!firstKey) return;
  const target = document.querySelector(`[data-field-key="${firstKey}"] input, [data-field-key="${firstKey}"] button, [data-field-key="${firstKey}"] textarea`);
  target?.focus?.();
}

export function PartnerMasterForm({
  mode,
  context,
  config,
  onFeedback,
  onOpenPage,
}) {
  const isCreate = mode === 'create';
  const [form, setForm] = useState(() => config.getInitialForm(mode, context));
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(config.getInitialForm(mode, context)));
  const [fieldErrors, setFieldErrors] = useState({});
  const [dialog, setDialog] = useState(null);
  const dirty = JSON.stringify(form) !== savedSnapshot;

  useEffect(() => {
    const nextForm = config.getInitialForm(mode, context);
    setForm(nextForm);
    setSavedSnapshot(JSON.stringify(nextForm));
    setFieldErrors({});
  }, [mode, context?.row?.id, config]);

  function updateField(key, value) {
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    setForm((current) => {
      const next = { ...current, [key]: value };
      return config.onFieldChange ? config.onFieldChange(key, value, next) : next;
    });
  }

  function updateLines(key, lineId, lineKey, value) {
    setForm((current) => ({
      ...current,
      [key]: current[key].map((line) => (line.id === lineId ? { ...line, [lineKey]: value } : line)),
    }));
  }

  function updateAddressLine(lineId, patch) {
    setForm((current) => ({
      ...current,
      addresses: current.addresses.map((line) => (line.id === lineId ? { ...line, ...patch } : line)),
    }));
  }

  function addLine(key, createLine) {
    setForm((current) => ({ ...current, [key]: [...current[key], createLine()] }));
  }

  function removeLine(key, lineId) {
    setForm((current) => ({ ...current, [key]: current[key].filter((line) => line.id !== lineId) }));
  }

  function toggleDefault(key, lineId, checked) {
    if (!checked) {
      updateLines(key, lineId, 'isDefault', false);
      return;
    }
    setForm((current) => ({ ...current, [key]: toggleDefaultFlag(current[key], lineId) }));
  }

  function handleCancel() {
    // 离开确认由 DocumentEditorFrame 统一承担，避免连续两次确认。
    onOpenPage?.(config.listPageId);
  }

  function handleSave() {
    const prepared = config.prepareForm ? config.prepareForm(form) : form;
    const result = config.validate(prepared, context?.row?.id);
    if (result?.fieldErrors) {
      setFieldErrors(result.fieldErrors);
      focusFirstFieldError(result.fieldErrors);
      return;
    }
    if (result?.message) {
      onFeedback?.(result.message, 'warning');
      return;
    }

    const now = formatNow();
    const nextRow = {
      ...context?.row,
      ...prepared,
      id: context?.row?.id || `${config.idPrefix}-${Date.now()}`,
      useStatus: context?.row?.useStatus || 'enabled',
      auditStatus: context?.row?.auditStatus || 'draft',
      creator: context?.row?.creator || '当前用户',
      createdAt: context?.row?.createdAt || now,
      updater: '当前用户',
      updatedAt: now,
      referenced: context?.row?.referenced || false,
    };
    upsertMockRow(config.storageKey, nextRow);
    setSavedSnapshot(JSON.stringify(form));
    onFeedback?.(config.saveSuccessMessage, 'success');
    onOpenPage?.(config.listPageId);
  }

  const contactColumns = [
    { key: 'name', label: '联系人姓名 *', type: 'text', placeholder: '请输入姓名', width: 120 },
    { key: 'type', label: '联系人类型', type: 'select', options: contactTypeOptions, width: 100 },
    { key: 'mobile', label: '手机号码', type: 'text', placeholder: '请输入手机号码', width: 120 },
    { key: 'phone', label: '固定电话', type: 'text', placeholder: '请输入固定电话', width: 120 },
    { key: 'email', label: '电子邮箱', type: 'text', placeholder: '请输入电子邮箱', width: 140 },
    { key: 'isDefault', label: '默认联系人', type: 'switch', width: 90 },
    { key: 'remark', label: '备注', type: 'text', placeholder: '备注', width: 120 },
  ];

  const addressColumns = [
    { key: 'addressType', label: '地址类型', type: 'select', options: addressTypeOptions, width: 100 },
    {
      key: 'countryRegion',
      label: '国家/地区',
      width: 130,
      renderCell: ({ row, onPatch }) => <CountryRegionTableCell row={row} onPatch={onPatch} />,
    },
    {
      key: 'stateOrProvince',
      label: '省/州',
      width: 110,
      renderCell: ({ row, onPatch }) => <StateProvinceTableCell row={row} onPatch={onPatch} />,
    },
    {
      key: 'city',
      label: '市',
      width: 110,
      renderCell: ({ row, onPatch }) => <CityTableCell row={row} onPatch={onPatch} />,
    },
    {
      key: 'district',
      label: '区',
      width: 100,
      renderCell: ({ row, onPatch }) => <DistrictTableCell row={row} onPatch={onPatch} />,
    },
    {
      key: 'detailAddress',
      label: '详细地址 *',
      width: 160,
      renderCell: ({ row, onPatch }) => <DetailAddressTableCell row={row} onPatch={onPatch} />,
    },
    { key: 'contactName', label: '地址联系人', type: 'text', placeholder: '联系人', width: 100 },
    { key: 'contactPhone', label: '联系电话', type: 'text', placeholder: '联系电话', width: 110 },
    { key: 'postalCode', label: '邮政编码', type: 'text', placeholder: '邮政编码', width: 100 },
    { key: 'isDefault', label: '默认地址', type: 'switch', width: 90 },
    { key: 'remark', label: '地址备注', type: 'text', placeholder: '备注', width: 100 },
  ];

  const bankColumns = config.bankColumns || [
    { key: 'accountName', label: '收款户名 *', type: 'text', placeholder: '请输入开户名称', width: 120 },
    { key: 'accountNo', label: '收款账号 *', type: 'text', placeholder: '请输入银行账号', width: 140 },
    { key: 'bankName', label: '开户银行 *', type: 'text', placeholder: '请输入开户银行', width: 120 },
    { key: 'branchName', label: '开户支行', type: 'text', placeholder: '开户支行', width: 120 },
    { key: 'bankCode', label: '银行联行号', type: 'text', placeholder: '银行联行号', width: 110 },
    { key: 'currency', label: '账户币别', type: 'select', options: currencySelectOptions, width: 120 },
    { key: 'isDefault', label: '默认账户', type: 'switch', width: 90 },
    { key: 'remark', label: '备注', type: 'text', placeholder: '备注', width: 100 },
  ];

  const statusBadges = !isCreate && context?.row ? buildPartnerStatusBadges(context.row) : [];

  return (
    <>
      <DocumentEditorFrame
        title={isCreate ? config.createTitle : config.editTitle}
        statuses={statusBadges}
        dirty={dirty}
        onCancel={handleCancel}
        onSave={handleSave}
        showSubmit={false}
        saveLabel="保存"
      >
        {config.sections.map((section) => {
          if (section.type === 'fields') {
            return (
              <EditorCard key={section.title} title={section.title}>
                <div className={erpFieldGridClassName}>
                  <FormFields
                    fields={section.fields.map((field) => ({
                      ...field,
                      disabled: field.disabled || (!isCreate && field.readOnlyOnEdit),
                    }))}
                    form={form}
                    onFieldChange={updateField}
                    fieldErrors={fieldErrors}
                  />
                </div>
              </EditorCard>
            );
          }
          if (section.type === 'contacts') {
            return (
              <EditorCard key={section.title} title={section.title}>
                <PartnerEditableTable
                  title="联系人明细"
                  rows={form.contacts}
                  columns={contactColumns}
                  onAdd={() => addLine('contacts', config.createContact)}
                  onRemove={(lineId) => removeLine('contacts', lineId)}
                  onChange={(lineId, key, value) => updateLines('contacts', lineId, key, value)}
                  onToggleDefault={(lineId, checked) => toggleDefault('contacts', lineId, checked)}
                  emptyLabel="暂无联系人，可点击添加"
                />
              </EditorCard>
            );
          }
          if (section.type === 'addresses') {
            return (
              <EditorCard key={section.title} title={section.title}>
                <PartnerEditableTable
                  title="地址明细"
                  rows={form.addresses}
                  columns={addressColumns}
                  minTableWidth={1480}
                  onAdd={() => addLine('addresses', config.createAddress)}
                  onRemove={(lineId) => removeLine('addresses', lineId)}
                  onChange={(lineId, key, value) => updateLines('addresses', lineId, key, value)}
                  onPatch={updateAddressLine}
                  onToggleDefault={(lineId, checked) => toggleDefault('addresses', lineId, checked)}
                  emptyLabel="暂无地址，可点击添加"
                />
              </EditorCard>
            );
          }
          if (section.type === 'banks') {
            return (
              <EditorCard key={section.title} title={section.title}>
                <PartnerEditableTable
                  title="银行信息"
                  rows={form.banks}
                  columns={bankColumns}
                  onAdd={() => addLine('banks', config.createBank)}
                  onRemove={(lineId) => removeLine('banks', lineId)}
                  onChange={(lineId, key, value) => updateLines('banks', lineId, key, value)}
                  onToggleDefault={(lineId, checked) => toggleDefault('banks', lineId, checked)}
                  emptyLabel="暂无银行信息，可点击添加"
                />
              </EditorCard>
            );
          }
          if (section.type === 'businessInfo') {
            const businessFields = section.fields;
            return (
              <EditorCard key={section.title} title={section.title}>
                <div className={erpFieldGridClassName}>
                  <FormFields
                    fields={businessFields}
                    form={form.businessInfo}
                    onFieldChange={(key, value) => updateField('businessInfo', { ...form.businessInfo, [key]: value })}
                    fieldErrors={fieldErrors}
                  />
                </div>
              </EditorCard>
            );
          }
          return null;
        })}
      </DocumentEditorFrame>
      <PartnerActionDialogs dialog={dialog} onClose={() => setDialog(null)} entityName={config.entityName} />
    </>
  );
}
