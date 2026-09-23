import { useMemo } from 'react';
import { ConfirmDialog } from '../ui/alert-dialog.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import { Button } from '../ui/button.jsx';
import { Switch } from '../ui/switch.jsx';
import { FormField } from '../ui/form-field.jsx';
import {
  buildMasterDataDialogTitle,
  buildMetaViewFields,
  DialogLeaveConfirm,
  masterDataDialogFullSpanClassName,
  MasterDataFormDialog,
  renderUseStatusTitleExtra,
  useDialogFormState,
} from './MasterDataFormDialog.jsx';
import { EMPTY_PLACEHOLDER } from '../../lib/format.js';
import {
  applyDisable,
  buildCarrierOptions,
  carrierToForm,
  createEmptyCarrierForm,
  createEmptyProductForm,
  formToCarrierRow,
  formToProductRow,
  getCarrierDeleteBlockReason,
  getProductDeleteBlockReason,
  productToForm,
  renderTransportType,
  resolveCarrierLabel,
  transportTypeOptions,
  validateCarrierForSave,
  validateProductForSave,
} from '../../lib/logisticsLogic.js';

function CarrierFormDialog({ dialog, onClose, onComplete }) {
  const { mode, row, existingRows } = dialog;
  const isEdit = mode === 'edit';
  const {
    form,
    fieldErrors,
    setFieldErrors,
    dirty,
    updateField,
  } = useDialogFormState({
    row,
    mode,
    toForm: carrierToForm,
    createEmpty: createEmptyCarrierForm,
  });

  function handleSave() {
    const result = validateCarrierForSave(form, existingRows, row?.id);
    if (result?.fieldErrors) {
      setFieldErrors(result.fieldErrors);
      return;
    }
    onComplete?.({
      message: '物流商已保存',
      type: 'success',
      action: 'save-carrier',
      payload: formToCarrierRow(form, row),
    });
    onClose?.();
  }

  const fields = [
    { key: 'code', label: '物流商编码 *', type: 'text', placeholder: '请输入物流商编码', disabled: isEdit },
    { key: 'name', label: '物流商名称 *', type: 'text', placeholder: '请输入承运企业名称' },
    { key: 'contact', label: '联系人', type: 'text', placeholder: '请输入联系人' },
    { key: 'phone', label: '联系电话', type: 'text', placeholder: '请输入联系电话' },
    { key: 'address', label: '联系地址', type: 'text', placeholder: '请输入联系地址', className: masterDataDialogFullSpanClassName },
  ];

  const viewSections = [
    {
      title: '基础信息',
      fields: [
        { label: '物流商编码', value: row.code },
        { label: '物流商名称', value: row.name },
        { label: '联系人', value: row.contact || EMPTY_PLACEHOLDER },
        { label: '联系电话', value: row.phone || EMPTY_PLACEHOLDER },
        { label: '联系地址', value: row.address || EMPTY_PLACEHOLDER, className: masterDataDialogFullSpanClassName },
      ],
    },
    {
      title: '维护信息',
      fields: buildMetaViewFields(row),
    },
  ];

  return (
    <MasterDataFormDialog
      mode={mode}
      title={buildMasterDataDialogTitle('物流商', mode)}
      titleExtra={renderUseStatusTitleExtra(row?.useStatus)}
      onClose={onClose}
      onSave={handleSave}
      dirty={dirty}
      form={form}
      fields={fields}
      fieldErrors={fieldErrors}
      onFieldChange={updateField}
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

function createProductFormState(row, defaultCarrierId) {
  if (row) return productToForm(row);
  const form = createEmptyProductForm();
  if (defaultCarrierId) form.carrierId = defaultCarrierId;
  return form;
}

function ProductFormDialog({ dialog, onClose, onComplete }) {
  const { mode, row, existingRows, carriers, defaultCarrierId } = dialog;
  const isEdit = mode === 'edit';
  const {
    form,
    fieldErrors,
    setFieldErrors,
    dirty,
    updateField,
  } = useDialogFormState({
    row,
    mode,
    toForm: productToForm,
    createEmpty: () => createProductFormState(null, defaultCarrierId),
    deps: [defaultCarrierId],
  });

  const carrierOptions = useMemo(
    () => buildCarrierOptions(carriers, form.carrierId),
    [carriers, form.carrierId],
  );

  function handleSave() {
    const result = validateProductForSave(form, existingRows, carriers, row?.id);
    if (result?.fieldErrors) {
      setFieldErrors(result.fieldErrors);
      return;
    }
    onComplete?.({
      message: '物流服务产品已保存',
      type: 'success',
      action: 'save-product',
      payload: formToProductRow(form, row),
    });
    onClose?.();
  }

  const fields = [
    { key: 'code', label: '物流服务产品编码 *', type: 'text', placeholder: '请输入产品编码', disabled: isEdit },
    { key: 'name', label: '物流服务产品名称 *', type: 'text', placeholder: '请输入物流服务名称' },
    { key: 'carrierId', label: '所属物流商 *', type: 'select', options: carrierOptions, placeholder: '请选择物流商' },
    { key: 'transportType', label: '运输类型', type: 'select', options: [{ value: '', label: '请选择运输类型' }, ...transportTypeOptions], placeholder: '请选择运输类型' },
  ];

  const viewSections = [
    {
      title: '基础信息',
      fields: [
        { label: '物流服务产品编码', value: row.code },
        { label: '物流服务产品名称', value: row.name },
        { label: '所属物流商', value: resolveCarrierLabel(row.carrierId, carriers) },
        { label: '运输类型', value: renderTransportType(row.transportType) },
      ],
    },
    {
      title: '维护信息',
      fields: buildMetaViewFields(row),
    },
  ];

  return (
    <MasterDataFormDialog
      mode={mode}
      title={buildMasterDataDialogTitle('物流服务产品', mode)}
      titleExtra={renderUseStatusTitleExtra(row?.useStatus)}
      onClose={onClose}
      onSave={handleSave}
      dirty={dirty}
      form={form}
      fields={fields}
      fieldErrors={fieldErrors}
      onFieldChange={updateField}
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

export function LogisticsActionDialogs({ dialog, onClose, onComplete, carriers = [], products = [] }) {
  if (!dialog) return null;

  const { type, row } = dialog;

  function finish(message, tone = 'success', payload) {
    onComplete?.({ message, type: tone, ...payload });
    onClose?.();
  }

  if (type === 'carrier-form') {
    return <CarrierFormDialog dialog={dialog} onClose={onClose} onComplete={onComplete} />;
  }

  if (type === 'product-form') {
    return <ProductFormDialog dialog={dialog} onClose={onClose} onComplete={onComplete} />;
  }

  if (type === 'confirm-leave') {
    return (
      <DialogLeaveConfirm
        onCancel={onClose}
        onConfirm={() => {
          dialog.onConfirmLeave?.();
          onClose?.();
        }}
      />
    );
  }

  if (type === 'blocked-add-product') {
    return (
      <SimpleDialog open onOpenChange={(open) => { if (!open) onClose?.(); }} title="无法新增物流服务产品">
        <p className="text-[12px] text-erp-text-muted">请先建立并启用物流商</p>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="compact" onClick={() => onClose?.()}>知道了</Button>
        </div>
      </SimpleDialog>
    );
  }

  if (type === 'disable-carrier') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="确认禁用当前物流商？"
        description="禁用后不能再新增服务产品关联，已有产品继续按自身状态发货"
        confirmLabel="确认禁用"
        confirmVariant="danger"
        onConfirm={() => finish('物流商已禁用，不能再新增服务产品', 'success', { action: 'update-carrier', row, nextRow: applyDisable(row) })}
      />
    );
  }

  if (type === 'disable-product') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="确认禁用当前产品？"
        description="禁用后新发货不能再选择该产品，已有单据不受影响"
        confirmLabel="确认禁用"
        confirmVariant="danger"
        onConfirm={() => finish('产品已禁用，新发货不能再选择', 'success', { action: 'update-product', row, nextRow: applyDisable(row) })}
      />
    );
  }

  if (type === 'delete-carrier') {
    const blockReason = getCarrierDeleteBlockReason(row, products);
    return blockReason ? (
      <SimpleDialog open onOpenChange={(open) => { if (!open) onClose?.(); }} title="无法删除物流商">
        <p className="text-[12px] text-erp-text-muted">{blockReason}</p>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="compact" onClick={() => onClose?.()}>知道了</Button>
        </div>
      </SimpleDialog>
    ) : (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="确认删除当前记录？"
        description="删除后不可恢复，只有未被任何业务对象引用的记录可以删除"
        confirmLabel="确认删除"
        confirmVariant="danger"
        onConfirm={() => finish('已删除', 'success', { action: 'delete-carrier', row })}
      />
    );
  }

  if (type === 'delete-product') {
    const blockReason = getProductDeleteBlockReason(row);
    return blockReason ? (
      <SimpleDialog open onOpenChange={(open) => { if (!open) onClose?.(); }} title="无法删除物流服务产品">
        <p className="text-[12px] text-erp-text-muted">{blockReason}</p>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="compact" onClick={() => onClose?.()}>知道了</Button>
        </div>
      </SimpleDialog>
    ) : (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="确认删除当前记录？"
        description="删除后不可恢复，只有未被任何业务对象引用的记录可以删除"
        confirmLabel="确认删除"
        confirmVariant="danger"
        onConfirm={() => finish('已删除', 'success', { action: 'delete-product', row })}
      />
    );
  }

  return null;
}
