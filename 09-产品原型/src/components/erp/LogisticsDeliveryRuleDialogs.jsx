import { useMemo } from 'react';
import { ConfirmDialog } from '../ui/alert-dialog.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import { Switch } from '../ui/switch.jsx';
import { FormField } from '../ui/form-field.jsx';
import { getCities, getProvinces } from '../../lib/cnAddress.js';
import { EMPTY_PLACEHOLDER } from '../../lib/format.js';
import {
  applyDisable,
  buildLogisticsProductOptions,
  CITY_ALL_VALUE,
  createEmptyDeliveryRuleForm,
  deliveryRuleToForm,
  formToDeliveryRuleRow,
  renderReceiverRoute,
  renderSenderRoute,
  resolveLogisticsProductLabel,
  validateDeliveryRuleForSave,
} from '../../lib/logisticsDeliveryRuleLogic.js';
import {
  buildMasterDataDialogTitle,
  buildMetaViewFields,
  masterDataDialogFullSpanClassName,
  MasterDataFormDialog,
  renderUseStatusTitleExtra,
  useDialogFormState,
} from './MasterDataFormDialog.jsx';

const provinceOptions = getProvinces();
const provinceWithEmpty = [{ value: '', label: '请选择省份' }];

function buildCityOptions(provinceCode) {
  if (!provinceCode) return [];
  return [
    { value: CITY_ALL_VALUE, label: '全省（不选具体城市）' },
    ...getCities(provinceCode),
  ];
}

function RuleFormDialog({ dialog, onClose, onComplete }) {
  const { mode, row, existingRows, products } = dialog;
  const {
    form,
    fieldErrors,
    setFieldErrors,
    dirty,
    updateField,
  } = useDialogFormState({
    row,
    mode,
    toForm: deliveryRuleToForm,
    createEmpty: createEmptyDeliveryRuleForm,
  });

  const productOptions = useMemo(
    () => buildLogisticsProductOptions(products, form.logisticsProductId),
    [products, form.logisticsProductId],
  );

  function handleFieldChange(key, value) {
    if (key === 'senderProvinceCode') {
      updateField('senderProvinceCode', value);
      updateField('senderCityCode', CITY_ALL_VALUE);
      return;
    }
    if (key === 'receiverProvinceCode') {
      updateField('receiverProvinceCode', value);
      updateField('receiverCityCode', CITY_ALL_VALUE);
      return;
    }
    updateField(key, value);
  }

  function handleSave() {
    const result = validateDeliveryRuleForSave(form, existingRows, products, row?.id);
    if (result?.fieldErrors) {
      setFieldErrors(result.fieldErrors);
      return;
    }
    onComplete?.({
      message: '物流配送规则已保存',
      type: 'success',
      action: 'save-rule',
      payload: formToDeliveryRuleRow(form, row),
    });
    onClose?.();
  }

  const fields = useMemo(() => {
    const senderCityField = form.senderProvinceCode
      ? {
        key: 'senderCityCode',
        label: '发件城市',
        type: 'select',
        options: buildCityOptions(form.senderProvinceCode),
        placeholder: '全省或选择城市',
      }
      : {
        key: 'senderCityCode',
        label: '发件城市',
        type: 'disabled',
        getValue: () => '',
        fallbackValue: '请先选择发件省份',
      };

    const receiverCityField = form.receiverProvinceCode
      ? {
        key: 'receiverCityCode',
        label: '收件城市',
        type: 'select',
        options: buildCityOptions(form.receiverProvinceCode),
        placeholder: '全省或选择城市',
      }
      : {
        key: 'receiverCityCode',
        label: '收件城市',
        type: 'disabled',
        getValue: () => '',
        fallbackValue: '请先选择收件省份',
      };

    return [
      { key: 'name', label: '规则名称 *', type: 'text', placeholder: '如：龙华仓发北京-顺丰标快', className: masterDataDialogFullSpanClassName },
      { key: 'senderProvinceCode', label: '发件省份 *', type: 'select', options: [...provinceWithEmpty, ...provinceOptions] },
      senderCityField,
      { key: 'receiverProvinceCode', label: '收件省份 *', type: 'select', options: [...provinceWithEmpty, ...provinceOptions] },
      receiverCityField,
      { key: 'logisticsProductId', label: '物流服务产品 *', type: 'select', options: [{ value: '', label: '请选择物流服务产品' }, ...productOptions], className: masterDataDialogFullSpanClassName },
      { key: 'remark', label: '备注', type: 'textarea', placeholder: '选填；城市选「全省」表示该省下全部城市', className: masterDataDialogFullSpanClassName },
    ];
  }, [form.senderProvinceCode, form.receiverProvinceCode, productOptions]);

  const viewSections = row
    ? [
      {
        title: '路由与匹配',
        fields: [
          { label: '规则名称', value: row.name },
          { label: '发件省/市', value: renderSenderRoute(row) },
          { label: '收件省/市', value: renderReceiverRoute(row) },
          { label: '物流服务产品', value: resolveLogisticsProductLabel(row.logisticsProductId, products), className: masterDataDialogFullSpanClassName },
          { label: '备注', value: row.remark || EMPTY_PLACEHOLDER, className: masterDataDialogFullSpanClassName },
        ],
      },
      {
        title: '维护信息',
        fields: buildMetaViewFields(row),
      },
    ]
    : [];

  return (
    <MasterDataFormDialog
      mode={mode}
      title={buildMasterDataDialogTitle('物流配送规则', mode)}
      titleExtra={renderUseStatusTitleExtra(row?.useStatus)}
      onClose={onClose}
      onSave={handleSave}
      dirty={dirty}
      form={form}
      fields={fields}
      fieldErrors={fieldErrors}
      onFieldChange={handleFieldChange}
      viewSections={viewSections}
      formExtras={(
        <FormField label="使用状态" fieldKey="useStatus" className={masterDataDialogFullSpanClassName}>
          <Switch
            checked={form.useStatus === 'enabled'}
            onCheckedChange={(checked) => updateField('useStatus', checked ? 'enabled' : 'disabled')}
            aria-label="使用状态"
          />
        </FormField>
      )}
    />
  );
}

export function LogisticsDeliveryRuleDialogs({ dialog, onClose, onComplete, products }) {
  if (!dialog) return null;

  if (dialog.type === 'rule-form') {
    return (
      <RuleFormDialog
        dialog={{ ...dialog, products: products || dialog.products || [] }}
        onClose={onClose}
        onComplete={onComplete}
      />
    );
  }

  if (dialog.type === 'disable-rule') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="禁用物流配送规则"
        description={`确定禁用「${dialog.row?.name}」？禁用后不再参与自动匹配。`}
        confirmLabel="禁用"
        confirmVariant="danger"
        onConfirm={() => {
          onComplete?.({
            action: 'update-rule',
            nextRow: applyDisable(dialog.row),
            message: '规则已禁用',
            type: 'success',
          });
          onClose?.();
        }}
      />
    );
  }

  return (
    <SimpleDialog open onOpenChange={(open) => { if (!open) onClose?.(); }} title="提示">
      <p className="text-sm text-erp-text-secondary">未知对话框类型</p>
    </SimpleDialog>
  );
}
