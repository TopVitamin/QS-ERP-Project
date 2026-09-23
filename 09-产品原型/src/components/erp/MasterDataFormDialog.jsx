import { Fragment, useEffect, useState } from 'react';
import { ConfirmDialog } from '../ui/alert-dialog.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import { Button } from '../ui/button.jsx';
import { FormFields } from './FormControl.jsx';
import { DetailField, DialogViewSection } from './DocumentDetailFrame.jsx';
import { StatusBadge } from './StatusBadge.jsx';
import {
  dialogFieldFullSpanClassName,
  dialogFormColumns,
  getDialogFieldGridClassName,
} from '../../styles/typography.js';
import { EMPTY_PLACEHOLDER, formatEmpty } from '../../lib/format.js';
import { useStatusLabels } from '../../lib/partnerMasterLogic.js';

/** 主数据表单弹窗默认 2 列（640px 宽）。 */
export const MASTER_DATA_DIALOG_COLUMNS = dialogFormColumns;

export const masterDataDialogGridClassName = getDialogFieldGridClassName(MASTER_DATA_DIALOG_COLUMNS);

export const masterDataDialogFullSpanClassName = dialogFieldFullSpanClassName[MASTER_DATA_DIALOG_COLUMNS];

/** @param {string} entityName 对象名称，如「物流商」「物流服务产品」 */
export function buildMasterDataDialogTitle(entityName, mode) {
  if (mode === 'create') return `新增${entityName}`;
  if (mode === 'edit') return `编辑${entityName}`;
  return `${entityName}详情`;
}

/** 查看弹窗标题右侧的「使用状态」标签。 */
export function renderUseStatusTitleExtra(useStatus) {
  if (!useStatus) return null;
  return (
    <StatusBadge tone={useStatus === 'disabled' ? 'neutral' : 'success'}>
      {useStatusLabels[useStatus]}
    </StatusBadge>
  );
}

/** 查看弹窗「维护信息」分区常用字段。 */
export function buildMetaViewFields(row, extras = []) {
  const fields = [
    { label: '创建人', value: row?.creator },
    { label: '创建时间', value: row?.createdAt },
    { label: '最后更新人', value: row?.updater },
    { label: '最后更新时间', value: row?.updatedAt },
  ];
  return [...fields, ...extras].map((field) => ({
    ...field,
    value: formatEmpty(field.value),
  }));
}

export function DialogLeaveConfirm({
  onCancel,
  onConfirm,
  description = '离开后未保存的内容将丢失',
  cancelLabel = '继续编辑',
}) {
  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => { if (!open) onCancel?.(); }}
      title="离开当前弹窗？"
      description={description}
      confirmLabel="确认离开"
      cancelLabel={cancelLabel}
      confirmVariant="danger"
      onConfirm={onConfirm}
    />
  );
}

/**
 * 表单弹窗脏数据离开确认。用于 *ActionDialogs 父层统一承接 confirm-leave。
 * 若子表单已用 MasterDataFormDialog 内置离开确认，可不接入此 hook。
 */
export function useDialogLeaveConfirm({ dialog, onClose, onComplete }) {
  const [leaveConfirm, setLeaveConfirm] = useState(null);

  useEffect(() => {
    if (!dialog) setLeaveConfirm(null);
  }, [dialog]);

  function handleFormComplete(result) {
    if (result?.action === 'confirm-leave' || result?.action === 'confirm-leave-logical') {
      setLeaveConfirm(() => result.onConfirmLeave ?? onClose);
      return;
    }
    onComplete?.(result);
  }

  function confirmLeave() {
    const leave = leaveConfirm;
    setLeaveConfirm(null);
    leave?.();
    onClose?.();
  }

  const leaveConfirmDialog = leaveConfirm ? (
    <DialogLeaveConfirm
      onCancel={() => setLeaveConfirm(null)}
      onConfirm={confirmLeave}
    />
  ) : null;

  return { handleFormComplete, leaveConfirmDialog };
}

/**
 * 主数据弹窗表单状态：随 row / mode 重置，提供 updateField 与脏标记。
 */
export function useDialogFormState({
  row,
  mode,
  toForm,
  createEmpty,
  deps = [],
}) {
  const [form, setForm] = useState(() => (row ? toForm(row) : createEmpty()));
  const [fieldErrors, setFieldErrors] = useState({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setForm(row ? toForm(row) : createEmpty());
    setFieldErrors({});
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps 由调用方显式传入
  }, [row, mode, ...deps]);

  function updateField(key, value) {
    setDirty(true);
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    setForm((current) => ({ ...current, [key]: value }));
  }

  return {
    form,
    setForm,
    fieldErrors,
    setFieldErrors,
    dirty,
    setDirty,
    updateField,
  };
}

/** 查看弹窗分区渲染。sections: [{ title, fields: [{ label, value, className? }] }] */
export function MasterDataViewSections({
  sections = [],
  columns = MASTER_DATA_DIALOG_COLUMNS,
  className = 'space-y-5',
}) {
  const gridClassName = getDialogFieldGridClassName(columns);

  return (
    <div className={className}>
      {sections.map((section) => (
        <DialogViewSection key={section.title || 'section'} title={section.title}>
          <div className={gridClassName}>
            {section.fields.map((field) => (
              <DetailField
                key={field.label}
                label={field.label}
                value={field.value ?? EMPTY_PLACEHOLDER}
                className={field.className}
              />
            ))}
          </div>
        </DialogViewSection>
      ))}
    </div>
  );
}

/**
 * 主数据新增 / 编辑 / 查看弹窗壳。
 * - 默认 2 列、640px、头尾分割线（SimpleDialog columns）
 * - 查看：titleExtra 放状态标签；内容用 viewSections 或 viewChildren
 * - 表单：fields + formExtras；内置脏数据离开确认
 */
export function MasterDataFormDialog({
  mode,
  title,
  titleExtra,
  columns = MASTER_DATA_DIALOG_COLUMNS,
  onClose,
  onSave,
  saveLabel = '保存',
  dirty = false,
  form,
  fields,
  fieldErrors,
  onFieldChange,
  formExtras,
  formChildren,
  viewSections,
  viewChildren,
  footer,
}) {
  const isView = mode === 'view';
  const gridClassName = getDialogFieldGridClassName(columns);
  const [leaveConfirm, setLeaveConfirm] = useState(false);

  function handleCloseRequest() {
    if (isView || !dirty) {
      onClose?.();
      return;
    }
    setLeaveConfirm(true);
  }

  function confirmLeave() {
    setLeaveConfirm(false);
    onClose?.();
  }

  const resolvedTitleExtra = isView ? titleExtra : null;

  const resolvedFooter = footer ?? (isView
    ? <Button variant="outline" size="compact" onClick={() => onClose?.()}>关闭</Button>
    : (
      <>
        <Button variant="outline" size="compact" onClick={handleCloseRequest}>取消</Button>
        <Button variant="primary" size="compact" onClick={onSave}>{saveLabel}</Button>
      </>
    ));

  return (
    <Fragment>
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) handleCloseRequest(); }}
        title={title}
        titleExtra={resolvedTitleExtra}
        columns={columns}
        footer={resolvedFooter}
      >
        {isView ? (
          viewChildren ?? <MasterDataViewSections sections={viewSections} columns={columns} />
        ) : (
          <div className={gridClassName}>
            {formChildren ?? (
              <>
                <FormFields
                  fields={fields}
                  form={form}
                  onFieldChange={onFieldChange}
                  fieldErrors={fieldErrors}
                />
                {formExtras}
              </>
            )}
          </div>
        )}
      </SimpleDialog>
      {leaveConfirm ? (
        <DialogLeaveConfirm
          onCancel={() => setLeaveConfirm(false)}
          onConfirm={confirmLeave}
        />
      ) : null}
    </Fragment>
  );
}
