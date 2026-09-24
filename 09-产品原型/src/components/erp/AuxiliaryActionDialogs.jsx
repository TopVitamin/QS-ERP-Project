import { useMemo } from 'react';
import { ConfirmDialog } from '../ui/alert-dialog.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import { Button } from '../ui/button.jsx';
import { FormFields } from './FormControl.jsx';
import { DetailField } from './DocumentDetailFrame.jsx';
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
  auxiliaryToForm,
  buildParentOptions,
  categoryToForm,
  createEmptyAuxiliaryForm,
  createEmptyCategoryForm,
  formToAuxiliaryRow,
  formToCategoryRow,
  generateAuxiliaryCode,
  getAuxiliaryDeleteBlockReason,
  getCategoryDeleteBlockReason,
  levelLabels,
  validateAuxiliaryForSave,
  validateCategoryForSave,
} from '../../lib/auxiliaryLogic.js';
import { getTypeLabel } from '../../data/auxiliaryData.js';

function AuxiliaryFormDialog({ dialog, onClose, onComplete }) {
  const { mode, row, typeConfig, existingRows } = dialog;
  const isEdit = mode === 'edit';
  const isCurrency = typeConfig?.isCurrency;
  const typeLabel = getTypeLabel(typeConfig.id);
  const {
    form,
    fieldErrors,
    setFieldErrors,
    dirty,
    updateField,
  } = useDialogFormState({
    row,
    mode,
    toForm: auxiliaryToForm,
    createEmpty: () => {
      const nextForm = createEmptyAuxiliaryForm(typeConfig.id);
      if (!isCurrency) nextForm.code = generateAuxiliaryCode(typeConfig.id, existingRows);
      return nextForm;
    },
    deps: [typeConfig.id, isCurrency, existingRows],
  });

  function handleSave() {
    const result = validateAuxiliaryForSave(form, existingRows, row?.id);
    if (result?.fieldErrors) {
      setFieldErrors(result.fieldErrors);
      return;
    }
    onComplete?.({
      message: '已保存',
      type: 'success',
      action: 'save-auxiliary',
      payload: formToAuxiliaryRow(form, row),
    });
    onClose?.();
  }

  const fields = [
    { key: 'code', label: '资料编码', type: 'text', placeholder: isCurrency ? '请输入币别代码' : '系统自动生成', disabled: isEdit || !isCurrency },
    { key: 'name', label: '资料名称 *', type: 'text', placeholder: isCurrency ? '请输入币别名称' : '请输入资料名称' },
    { key: 'remark', label: '备注', type: 'textarea', placeholder: '请输入补充说明', className: masterDataDialogFullSpanClassName },
  ];

  const viewSections = row ? [
    {
      title: '基础信息',
      fields: [
        { label: '所属资料类型', value: getTypeLabel(row.type), className: masterDataDialogFullSpanClassName },
        { label: '资料编码', value: row.code },
        { label: '资料名称', value: row.name },
        { label: '备注', value: row.remark || EMPTY_PLACEHOLDER, className: masterDataDialogFullSpanClassName },
      ],
    },
    {
      title: '维护信息',
      fields: buildMetaViewFields(row),
    },
  ] : [];

  return (
    <MasterDataFormDialog
      mode={mode}
      title={buildMasterDataDialogTitle(typeLabel, mode)}
      titleExtra={renderUseStatusTitleExtra(row?.useStatus)}
      onClose={onClose}
      onSave={handleSave}
      dirty={dirty}
      form={form}
      fieldErrors={fieldErrors}
      onFieldChange={updateField}
      viewSections={viewSections}
      formChildren={(
        <>
          <DetailField label="所属资料类型" value={getTypeLabel(typeConfig.id)} className={masterDataDialogFullSpanClassName} />
          <FormFields fields={fields} form={form} onFieldChange={updateField} fieldErrors={fieldErrors} />
          <FormField label="使用状态" fieldKey="useStatus" className={masterDataDialogFullSpanClassName}>
            <Switch checked={form.useStatus === 'enabled'} onCheckedChange={(checked) => updateField('useStatus', checked ? 'enabled' : 'disabled')} aria-label="使用状态" />
          </FormField>
        </>
      )}
    />
  );
}

function CategoryFormDialog({ dialog, onClose, onComplete }) {
  const { mode, row, parent, categories } = dialog;
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
    toForm: categoryToForm,
    createEmpty: () => createEmptyCategoryForm(parent),
    deps: [parent],
  });

  const parentOptions = useMemo(
    () => buildParentOptions(categories, row || { id: '', level: form.level }),
    [categories, row, form.level],
  );
  const parentLabel = parent
    ? `${parent.code} ${parent.name}`
    : row?.parentId
      ? categories.find((item) => item.id === row.parentId)?.name
      : '无';

  const title = mode === 'create-root'
    ? '新增一级分类'
    : mode === 'create-child'
      ? '新增下级分类'
      : mode === 'edit'
        ? '编辑分类'
        : '分类详情';

  function handleSave() {
    const result = validateCategoryForSave(form, categories, row?.id);
    if (result?.fieldErrors) {
      setFieldErrors(result.fieldErrors);
      return;
    }
    onComplete?.({
      message: '已保存',
      type: 'success',
      action: 'save-category',
      payload: formToCategoryRow(form, row, categories),
    });
    onClose?.();
  }

  const fields = [
    { key: 'name', label: '分类名称 *', type: 'text', placeholder: '请输入分类名称' },
    ...(isEdit && form.level > 1
      ? [{ key: 'parentId', label: '上级分类 *', type: 'select', options: parentOptions, placeholder: '请选择上级分类' }]
      : []),
    { key: 'remark', label: '备注', type: 'textarea', placeholder: '请输入分类说明', className: masterDataDialogFullSpanClassName },
  ];

  const viewSections = row ? [
    {
      title: '分类信息',
      fields: [
        { label: '分类编码', value: row.code },
        { label: '分类名称', value: row.name },
        { label: '上级分类', value: row.level === 1 ? '无' : parentLabel },
        { label: '分类级别', value: levelLabels[row.level] },
        { label: '备注', value: row.remark || EMPTY_PLACEHOLDER, className: masterDataDialogFullSpanClassName },
      ],
    },
    {
      title: '维护信息',
      fields: buildMetaViewFields(row),
    },
  ] : [];

  return (
    <MasterDataFormDialog
      mode={mode}
      title={title}
      titleExtra={renderUseStatusTitleExtra(row?.useStatus)}
      onClose={onClose}
      onSave={handleSave}
      dirty={dirty}
      form={form}
      fieldErrors={fieldErrors}
      onFieldChange={updateField}
      viewSections={viewSections}
      formChildren={(
        <>
          <DetailField label="分类编码" value={row?.code || '保存后生成'} />
          {(!isEdit || form.level === 1) && <DetailField label="上级分类" value={parentLabel || '无'} />}
          <DetailField label="分类级别" value={levelLabels[form.level]} />
          <FormFields fields={fields} form={form} onFieldChange={updateField} fieldErrors={fieldErrors} />
          <FormField label="使用状态" fieldKey="useStatus" className={masterDataDialogFullSpanClassName}>
            <Switch checked={form.useStatus === 'enabled'} onCheckedChange={(checked) => updateField('useStatus', checked ? 'enabled' : 'disabled')} aria-label="使用状态" />
          </FormField>
        </>
      )}
    />
  );
}

export function AuxiliaryActionDialogs({ dialog, onClose, onComplete, categories = [] }) {
  if (!dialog) return null;
  const { type, row } = dialog;

  function finish(message, tone = 'success', payload) {
    onComplete?.({ message, type: tone, ...payload });
    onClose?.();
  }

  if (type === 'auxiliary-form') {
    return <AuxiliaryFormDialog dialog={dialog} onClose={onClose} onComplete={onComplete} />;
  }

  if (type === 'category-form') {
    return <CategoryFormDialog dialog={dialog} onClose={onClose} onComplete={onComplete} />;
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

  if (type === 'disable-auxiliary' || type === 'disable-category') {
    const isCategory = type === 'disable-category';
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title={isCategory ? '确认禁用所选分类？' : '确认禁用所选记录？'}
        description={isCategory ? '禁用后不能再在其下新增分类，既有下级分类按自身状态继续使用' : '禁用后新增引用不能再选择，已有业务不受影响'}
        confirmLabel="确认禁用"
        confirmVariant="danger"
        onConfirm={() => finish(isCategory ? '已禁用，不能再在其下新增分类' : '已禁用，新增引用将不能再选择', 'success', { action: isCategory ? 'update-category' : 'update-auxiliary', row, nextRow: applyDisable(row) })}
      />
    );
  }

  if (type === 'delete-auxiliary') {
    const blockReason = getAuxiliaryDeleteBlockReason(row);
    return blockReason ? (
      <SimpleDialog open onOpenChange={(open) => { if (!open) onClose?.(); }} title="无法删除">
        <p className="text-[12px] text-erp-text-muted">{blockReason}</p>
        <div className="mt-4 flex justify-end"><Button variant="outline" size="compact" onClick={() => onClose?.()}>知道了</Button></div>
      </SimpleDialog>
    ) : (
      <ConfirmDialog open onOpenChange={(open) => { if (!open) onClose?.(); }} title="确认删除当前记录？" description="删除后不可恢复；只有未被任何业务对象引用的记录可删，商品分类还须没有下级" confirmLabel="确认删除" confirmVariant="danger" onConfirm={() => finish('已删除', 'success', { action: 'delete-auxiliary', row })} />
    );
  }

  if (type === 'delete-category') {
    const blockReason = getCategoryDeleteBlockReason(row, categories);
    return blockReason ? (
      <SimpleDialog open onOpenChange={(open) => { if (!open) onClose?.(); }} title="无法删除">
        <p className="text-[12px] text-erp-text-muted">{blockReason}</p>
        <div className="mt-4 flex justify-end"><Button variant="outline" size="compact" onClick={() => onClose?.()}>知道了</Button></div>
      </SimpleDialog>
    ) : (
      <ConfirmDialog open onOpenChange={(open) => { if (!open) onClose?.(); }} title="确认删除当前记录？" description="删除后不可恢复；只有未被任何业务对象引用的记录可删，商品分类还须没有下级" confirmLabel="确认删除" confirmVariant="danger" onConfirm={() => finish('已删除', 'success', { action: 'delete-category', row })} />
    );
  }

  if (type === 'blocked-add-child') {
    return (
      <SimpleDialog open onOpenChange={(open) => { if (!open) onClose?.(); }} title="无法新增下级">
        <p className="text-[12px] text-erp-text-muted">禁用分类不能再新增下级</p>
        <div className="mt-4 flex justify-end"><Button variant="outline" size="compact" onClick={() => onClose?.()}>知道了</Button></div>
      </SimpleDialog>
    );
  }

  return null;
}
