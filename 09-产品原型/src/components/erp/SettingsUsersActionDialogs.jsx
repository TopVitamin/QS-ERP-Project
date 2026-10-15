import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ConfirmDialog, InfoDialog } from '../ui/alert-dialog.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import { Button } from '../ui/button.jsx';
import { Checkbox } from '../ui/checkbox.jsx';
import { FieldAffordance, FieldTrigger } from '../ui/field.jsx';
import { Input } from '../ui/input.jsx';
import { Textarea } from '../ui/textarea.jsx';
import { FormField } from '../ui/form-field.jsx';
import { FormFields } from './FormControl.jsx';
import {
  DialogLeaveConfirm,
  MasterDataFormDialog,
  buildMetaViewFields,
  masterDataDialogFullSpanClassName,
  renderUseStatusTitleExtra,
  useDialogFormState,
} from './MasterDataFormDialog.jsx';
import { allPermissionPointKeys, permissionGroups } from '../../data/settingsUsersPermissions.js';
import {
  accountToForm,
  applyAccountUseStatus,
  applyRolePermissions,
  applyRoleUseStatus,
  buildRoleSelectOptions,
  createEmptyAccountForm,
  createEmptyRoleForm,
  formToAccountRow,
  formToRoleRow,
  getGroupCheckState,
  matchPermissionObject,
  normalizePermissionKeys,
  permissionSetsEqual,
  resolveRoleLabel,
  roleToForm,
  settingsUsersUseStatusLabels,
  togglePermissionGroup,
  togglePermissionPoint,
  validateAccountForSave,
  validatePasswordReset,
  validateRoleForSave,
} from '../../lib/settingsUsersLogic.js';

const useStatusOptions = [
  { value: 'enabled', label: settingsUsersUseStatusLabels.enabled },
  { value: 'disabled', label: settingsUsersUseStatusLabels.disabled },
];

/**
 * 角色下拉多选（弹窗内控件）。
 *
 * 不用公共 MultiSelect 的原因：原型依赖里 @radix-ui/react-dialog@1.1.15 与
 * @radix-ui/react-popover@1.1.23 各自打包了一份 @radix-ui/react-dismissable-layer，
 * 弹窗打开后 body 被置为 pointer-events:none，而 Popover 的图层判断拿不到弹窗的锁定状态，
 * 浮层继承 none 后选项点不动（浏览器实测：elementFromPoint 命中弹窗内控件）。
 * 该问题属公共组件（popover.jsx 的浮层或依赖去重）改动，已在任务报告中给出精确建议；
 * 本控件在此范围内自绘下拉：触发器复用公共 FieldTrigger／FieldAffordance 样式，面板渲染在弹窗内，不经过 Portal。
 */
function RoleMultiSelectField({ label, value, options, onChange, error }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const selectedOptions = options.filter((option) => value.includes(option.value));
  const displayLabel = selectedOptions.length <= 2
    ? selectedOptions.map((option) => option.label).join('、')
    : `${selectedOptions[0]?.label} 等${selectedOptions.length}项`;

  useEffect(() => {
    if (!open) return undefined;
    function handlePointerDown(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [open]);

  function toggleOption(optionValue) {
    onChange(value.includes(optionValue)
      ? value.filter((item) => item !== optionValue)
      : [...value, optionValue]);
  }

  return (
    <FormField label={label} fieldKey="roleIds" error={error}>
      <div ref={containerRef} className="relative w-full">
        <FieldTrigger
          role="combobox"
          aria-expanded={open}
          aria-label="角色"
          hasValue={selectedOptions.length > 0}
          className="justify-between"
          onClick={() => setOpen((current) => !current)}
        >
          <span className="truncate">{displayLabel || '请选择角色'}</span>
        </FieldTrigger>
        <FieldAffordance
          hasValue={selectedOptions.length > 0}
          clearable
          clearAriaLabel="清除全部选择"
          showClearOnHover
          onClear={() => onChange([])}
        />
        {open ? (
          <div
            role="listbox"
            aria-label="角色选项"
            className="absolute left-0 top-[29px] z-[150] max-h-[180px] w-full overflow-y-auto rounded-erp-overlay border border-erp-border-strong bg-erp-surface-panel p-1 shadow-erp-overlay"
          >
            {options.length ? options.map((option) => {
              const checked = value.includes(option.value);
              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={checked}
                  className="flex h-7 cursor-pointer select-none items-center gap-2 rounded-erp-control px-2 text-[12px] hover:bg-erp-primary-soft"
                  onClick={() => toggleOption(option.value)}
                >
                  <Checkbox checked={checked} className="pointer-events-none" aria-hidden="true" tabIndex={-1} />
                  <span className="truncate">{option.label}</span>
                </div>
              );
            }) : <div className="px-2 py-1.5 text-[12px] text-erp-text-muted">没有可选角色</div>}
          </div>
        ) : null}
      </div>
    </FormField>
  );
}

// ---------------------------------------------------------------------------
// 账号：新增／编辑、查看、重置密码、停用
// ---------------------------------------------------------------------------

function AccountFormDialog({ dialog, onClose, onComplete }) {
  const { mode, row, accounts, roles } = dialog;
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
    toForm: accountToForm,
    createEmpty: createEmptyAccountForm,
  });

  const roleOptions = useMemo(() => buildRoleSelectOptions(roles, form.roleIds), [roles, form.roleIds]);

  const baseFields = [
    { key: 'loginName', label: '登录账号 *', type: 'text', placeholder: '请输入登录账号', disabled: isEdit },
    { key: 'name', label: '姓名 *', type: 'text', placeholder: '请输入姓名' },
    { key: 'phone', label: '手机号', type: 'text', placeholder: '请输入手机号' },
    { key: 'email', label: '邮箱', type: 'text', placeholder: '请输入邮箱' },
  ];
  const tailFields = [
    { key: 'useStatus', label: '使用状态', type: 'select', options: useStatusOptions },
  ];

  function handleSave() {
    const result = validateAccountForSave(form, { mode, accountId: row?.id, accounts });
    if (result?.fieldErrors) {
      setFieldErrors(result.fieldErrors);
      return;
    }
    onComplete?.({
      action: 'save-account',
      message: '账号已保存',
      type: 'success',
      nextRow: formToAccountRow(form, { row }),
    });
    onClose?.();
  }

  return (
    <MasterDataFormDialog
      mode={mode}
      title={isEdit ? `编辑账号 ${row.loginName}` : '新增账号'}
      titleExtra={renderUseStatusTitleExtra(row?.useStatus)}
      onClose={onClose}
      onSave={handleSave}
      dirty={dirty}
      form={form}
      fieldErrors={fieldErrors}
      onFieldChange={updateField}
      formChildren={(
        <>
          <FormFields fields={baseFields} form={form} onFieldChange={updateField} fieldErrors={fieldErrors} />
          <RoleMultiSelectField
            label="角色 *"
            value={form.roleIds}
            options={roleOptions}
            onChange={(value) => updateField('roleIds', value)}
            error={fieldErrors.roleIds}
          />
          {!isEdit && (
            <FormField label="初始密码 *" fieldKey="password" error={fieldErrors.password}>
              <Input
                type="password"
                value={form.password}
                onChange={(event) => updateField('password', event.target.value)}
                placeholder="请输入初始密码"
                aria-label="初始密码"
                autoComplete="new-password"
              />
            </FormField>
          )}
          <FormFields fields={tailFields} form={form} onFieldChange={updateField} fieldErrors={fieldErrors} />
          <FormField label="备注" fieldKey="remark" className={masterDataDialogFullSpanClassName}>
            <Textarea
              value={form.remark}
              onChange={(event) => updateField('remark', event.target.value)}
              maxLength={500}
              placeholder="请输入补充说明"
              aria-label="备注"
            />
          </FormField>
        </>
      )}
    />
  );
}

function AccountViewDialog({ dialog, onClose }) {
  const { row, roles } = dialog;
  const roleLabel = (row.roleIds || []).map((roleId) => resolveRoleLabel(roleId, roles)).join(';');

  return (
    <MasterDataFormDialog
      mode="view"
      title={`账号详情 · ${row.loginName}`}
      titleExtra={renderUseStatusTitleExtra(row.useStatus)}
      onClose={onClose}
      viewSections={[
        {
          title: '账号信息',
          fields: [
            { label: '登录账号', value: row.loginName },
            { label: '姓名', value: row.name },
            { label: '手机号', value: row.phone },
            { label: '邮箱', value: row.email },
            { label: '角色', value: roleLabel },
            { label: '使用状态', value: settingsUsersUseStatusLabels[row.useStatus] },
            { label: '备注', value: row.remark, className: masterDataDialogFullSpanClassName },
          ],
        },
        { title: '维护信息', fields: buildMetaViewFields(row) },
      ]}
    />
  );
}

function ResetPasswordDialog({ dialog, onClose, onComplete }) {
  const { row } = dialog;
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const dirty = Boolean(form.password || form.confirmPassword);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function handleCloseRequest() {
    if (dirty) {
      setLeaveConfirm(true);
      return;
    }
    onClose?.();
  }

  function handleConfirm() {
    const result = validatePasswordReset(form);
    if (result?.fieldErrors) {
      setFieldErrors(result.fieldErrors);
      return;
    }
    onComplete?.({
      action: 'reset-password',
      message: '密码已重置，请将新初始密码线下告知用户',
      type: 'success',
      row,
    });
    onClose?.();
  }

  return (
    <Fragment>
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) handleCloseRequest(); }}
        title={`重置密码 · ${row.loginName}`}
        size="md"
        footer={(
          <>
            <Button variant="outline" onClick={handleCloseRequest}>取消</Button>
            <Button variant="primary" onClick={handleConfirm}>确认重置</Button>
          </>
        )}
      >
        <p className="text-[12px] leading-5 text-erp-text-muted">重置后原密码失效，请将新初始密码线下告知用户。</p>
        <div className="mt-3 space-y-3">
          <FormField label="新密码 *" fieldKey="password" error={fieldErrors.password}>
            <Input
              type="password"
              value={form.password}
              onChange={(event) => updateField('password', event.target.value)}
              placeholder="请输入新密码"
              aria-label="新密码"
              autoComplete="new-password"
            />
          </FormField>
          <FormField label="确认新密码 *" fieldKey="confirmPassword" error={fieldErrors.confirmPassword}>
            <Input
              type="password"
              value={form.confirmPassword}
              onChange={(event) => updateField('confirmPassword', event.target.value)}
              placeholder="请再次输入新密码"
              aria-label="确认新密码"
              autoComplete="new-password"
            />
          </FormField>
        </div>
      </SimpleDialog>
      {leaveConfirm ? (
        <DialogLeaveConfirm
          onCancel={() => setLeaveConfirm(false)}
          onConfirm={() => {
            setLeaveConfirm(false);
            onClose?.();
          }}
        />
      ) : null}
    </Fragment>
  );
}

// ---------------------------------------------------------------------------
// 角色：新增／编辑、查看、配置功能权限
// ---------------------------------------------------------------------------

function RoleFormDialog({ dialog, onClose, onComplete }) {
  const { mode, row, roles } = dialog;
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
    toForm: roleToForm,
    createEmpty: createEmptyRoleForm,
  });

  function handleSave() {
    const result = validateRoleForSave(form, { roleId: row?.id, roles });
    if (result?.fieldErrors) {
      setFieldErrors(result.fieldErrors);
      return;
    }
    onComplete?.({
      action: 'save-role',
      message: '角色已保存',
      type: 'success',
      nextRow: formToRoleRow(form, { row }),
    });
    onClose?.();
  }

  return (
    <MasterDataFormDialog
      mode={mode}
      title={isEdit ? `编辑角色 ${row.code}` : '新增角色'}
      titleExtra={renderUseStatusTitleExtra(row?.useStatus)}
      onClose={onClose}
      onSave={handleSave}
      dirty={dirty}
      form={form}
      fieldErrors={fieldErrors}
      onFieldChange={updateField}
      fields={[
        { key: 'code', label: '角色编码 *', type: 'text', placeholder: '请输入角色编码', disabled: isEdit },
        { key: 'name', label: '角色名称 *', type: 'text', placeholder: '请输入角色名称' },
        { key: 'useStatus', label: '使用状态', type: 'select', options: useStatusOptions },
      ]}
      formExtras={(
        <FormField label="备注" fieldKey="remark" className={masterDataDialogFullSpanClassName}>
          <Textarea
            value={form.remark}
            onChange={(event) => updateField('remark', event.target.value)}
            maxLength={500}
            placeholder="请输入补充说明"
            aria-label="备注"
          />
        </FormField>
      )}
    />
  );
}

function RoleViewDialog({ dialog, onClose }) {
  const { row } = dialog;
  return (
    <MasterDataFormDialog
      mode="view"
      title={`角色详情 · ${row.code}`}
      titleExtra={renderUseStatusTitleExtra(row.useStatus)}
      onClose={onClose}
      viewSections={[
        {
          title: '角色信息',
          fields: [
            { label: '角色编码', value: row.code },
            { label: '角色名称', value: row.name },
            { label: '使用状态', value: settingsUsersUseStatusLabels[row.useStatus] },
            { label: '备注', value: row.remark, className: masterDataDialogFullSpanClassName },
          ],
        },
        { title: '维护信息', fields: buildMetaViewFields(row) },
      ]}
    />
  );
}

function PermissionDialog({ dialog, onClose, onComplete }) {
  const { row } = dialog;
  const readOnly = Boolean(row.preset);
  const initialSelected = useMemo(
    () => normalizePermissionKeys(readOnly ? allPermissionPointKeys : (row.permissionKeys || [])),
    [readOnly, row],
  );
  const [selected, setSelected] = useState(() => new Set(initialSelected));
  const [expandedGroups, setExpandedGroups] = useState(() => Object.fromEntries(
    permissionGroups.map((group) => [
      group.id,
      group.objects.some((object) => object.pointKeys.some((key) => initialSelected.includes(key))),
    ]),
  ));
  const [keyword, setKeyword] = useState('');
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const searching = keyword.trim().length > 0;
  const dirty = !permissionSetsEqual([...selected], initialSelected);

  function handleCloseRequest() {
    if (!readOnly && dirty) {
      setLeaveConfirm(true);
      return;
    }
    onClose?.();
  }

  function handleSave() {
    onComplete?.({
      action: 'save-permissions',
      message: '功能权限已保存，对已分配账号立即生效',
      type: 'success',
      nextRow: applyRolePermissions(row, [...selected]),
    });
    onClose?.();
  }

  return (
    <Fragment>
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) handleCloseRequest(); }}
        title={`配置功能权限 · ${row.code} ${row.name}`}
        description="勾选任一业务操作自动带出「查看」；取消「查看」联动取消该菜单全部操作；保存即生效。"
        size="xl"
        framed
        footer={(
          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3 text-[12px]">
              <span className="shrink-0 text-erp-text">已勾选 <span className="text-erp-primary">{selected.size}</span> 项</span>
              {readOnly ? (
                <span className="truncate text-erp-text-muted">系统管理员角色拥有全部权限点，不可修改</span>
              ) : (
                <>
                  <span className="h-3 w-px shrink-0 bg-erp-border-light" aria-hidden="true" />
                  <button type="button" className="shrink-0 text-erp-primary hover:underline" onClick={() => setSelected(new Set(allPermissionPointKeys))}>全选</button>
                  <button type="button" className="shrink-0 text-erp-primary hover:underline" onClick={() => setSelected(new Set())}>全不选</button>
                </>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {readOnly ? (
                <Button variant="outline" onClick={() => onClose?.()}>关闭</Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleCloseRequest}>取消</Button>
                  <Button variant="primary" onClick={handleSave}>保存</Button>
                </>
              )}
            </div>
          </div>
        )}
      >
        <div className="space-y-3">
          <div className="w-[280px]">
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索权限点"
              aria-label="搜索权限点"
            />
          </div>
          <div className="max-h-[380px] min-h-[240px] overflow-y-auto rounded-erp-section border border-erp-border-light px-3">
            {permissionGroups.map((group) => {
              const objects = searching
                ? group.objects.filter((object) => matchPermissionObject(keyword, group, object))
                : group.objects;
              if (!objects.length) return null;
              const expanded = searching || expandedGroups[group.id];
              const groupState = getGroupCheckState(selected, group);
              const groupKeys = group.objects.flatMap((object) => object.pointKeys);
              const groupSelectedCount = groupKeys.filter((key) => selected.has(key)).length;
              return (
                <div key={group.id} className="border-b border-erp-border-light py-0.5 last:border-b-0">
                  <div className="flex h-8 items-center gap-1.5">
                    <button
                      type="button"
                      aria-label={expanded ? `收起${group.label}` : `展开${group.label}`}
                      aria-expanded={expanded}
                      disabled={searching}
                      className="flex size-5 shrink-0 items-center justify-center rounded-erp-control text-erp-text-muted hover:bg-erp-surface-muted hover:text-erp-text"
                      onClick={() => setExpandedGroups((current) => ({ ...current, [group.id]: !current[group.id] }))}
                    >
                      {expanded
                        ? <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
                        : <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />}
                    </button>
                    <Checkbox
                      checked={groupState === 'checked' ? true : groupState === 'indeterminate' ? 'indeterminate' : false}
                      disabled={readOnly}
                      onCheckedChange={() => {
                        if (readOnly) return;
                        setSelected((current) => togglePermissionGroup(current, group));
                      }}
                      aria-label={`${group.label}全选`}
                    />
                    <span className="text-[12px] font-medium text-erp-text">{group.label}</span>
                    <span className="text-[11px] text-erp-text-muted">{groupSelectedCount}/{groupKeys.length}</span>
                  </div>
                  {expanded && (
                    <div className="pb-1">
                      {objects.map((object) => (
                        <div key={object.id} className="flex items-start gap-3 py-1 pl-7">
                          <span className="w-[104px] shrink-0 truncate text-[12px] text-erp-text" title={object.label}>{object.label}</span>
                          {object.noPoints ? (
                            <span className="text-[12px] text-erp-text-muted">{object.note}</span>
                          ) : (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                              {object.points.map((point) => (
                                <div key={point.key} className="flex items-center gap-1.5 text-[12px] text-erp-text">
                                  <Checkbox
                                    checked={selected.has(point.key)}
                                    disabled={readOnly}
                                    onCheckedChange={() => {
                                      if (readOnly) return;
                                      setSelected((current) => togglePermissionPoint(current, object, point.key));
                                    }}
                                    aria-label={`${object.label}${point.label}`}
                                  />
                                  <span
                                    className={readOnly ? undefined : 'cursor-pointer select-none'}
                                    onClick={() => {
                                      if (readOnly) return;
                                      setSelected((current) => togglePermissionPoint(current, object, point.key));
                                    }}
                                  >
                                    {point.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </SimpleDialog>
      {leaveConfirm ? (
        <DialogLeaveConfirm
          onCancel={() => setLeaveConfirm(false)}
          onConfirm={() => {
            setLeaveConfirm(false);
            onClose?.();
          }}
        />
      ) : null}
    </Fragment>
  );
}

// ---------------------------------------------------------------------------
// 数据权限：一期预留占位弹窗（主PRD Q01、Q02，2026-10-15 已定：一期不启用数据过滤，
// 不可编辑、不提供保存）
// ---------------------------------------------------------------------------

function DataPermissionDialog({ dialog, onClose }) {
  const { row } = dialog;
  const [remark, setRemark] = useState('');
  return (
    <SimpleDialog
      open
      onOpenChange={(open) => { if (!open) onClose?.(); }}
      title={`配置数据权限 · ${row.roleCode} ${row.roleName}`}
      description="一期不启用数据权限过滤（预留结构）；启用后按最终规则补配置项与校验。"
      size="md"
      footer={(
        <Button variant="outline" onClick={() => onClose?.()}>关闭</Button>
      )}
    >
      <div className="mt-3 space-y-3">
        <FormField label="数据范围" fieldKey="dataRange">
          <Input disabled value="一期不启用（预留）" aria-label="数据范围" />
        </FormField>
        <FormField label="受控模块" fieldKey="controlledModules">
          <Input disabled value="一期不启用（预留）" aria-label="受控模块" />
        </FormField>
        <FormField label="备注">
          <Textarea
            value={remark}
            onChange={(event) => setRemark(event.target.value)}
            maxLength={500}
            placeholder="请输入补充说明"
            aria-label="备注"
          />
        </FormField>
      </div>
    </SimpleDialog>
  );
}

// ---------------------------------------------------------------------------
// 弹窗总入口：页面把 dialog 状态交到这里，动作结果经 onComplete 回传
// ---------------------------------------------------------------------------

export function SettingsUsersActionDialogs({ dialog, onClose, onComplete }) {
  if (!dialog) return null;
  const { type, row } = dialog;

  if (type === 'account-form') {
    return <AccountFormDialog dialog={dialog} onClose={onClose} onComplete={onComplete} />;
  }

  if (type === 'account-view') {
    return <AccountViewDialog dialog={dialog} onClose={onClose} />;
  }

  if (type === 'reset-password') {
    return <ResetPasswordDialog dialog={dialog} onClose={onClose} onComplete={onComplete} />;
  }

  if (type === 'role-form') {
    return <RoleFormDialog dialog={dialog} onClose={onClose} onComplete={onComplete} />;
  }

  if (type === 'role-view') {
    return <RoleViewDialog dialog={dialog} onClose={onClose} />;
  }

  if (type === 'permissions') {
    return <PermissionDialog dialog={dialog} onClose={onClose} onComplete={onComplete} />;
  }

  if (type === 'data-permission') {
    return <DataPermissionDialog dialog={dialog} onClose={onClose} />;
  }

  if (type === 'disable-account') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="停用账号"
        description="停用后该账号立即不能登录，历史记录不受影响。"
        confirmLabel="确认停用"
        confirmVariant="danger"
        onConfirm={() => {
          onComplete?.({
            action: 'disable-account',
            message: '账号已停用，该账号将不能登录',
            type: 'success',
            nextRow: applyAccountUseStatus(row, 'disabled'),
          });
          onClose?.();
        }}
      />
    );
  }

  if (type === 'role-disable') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="停用角色"
        description="停用后已分配账号将立即失去该角色对应的菜单与操作权限，分配关系保留，重新启用后恢复。"
        confirmLabel="确认停用"
        confirmVariant="danger"
        onConfirm={() => {
          onComplete?.({
            action: 'disable-role',
            message: '角色已停用，已分配账号将失去该角色权限',
            type: 'success',
            nextRow: applyRoleUseStatus(row, 'disabled'),
          });
          onClose?.();
        }}
      />
    );
  }

  if (type === 'role-delete') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="删除角色"
        description="删除后不可恢复；只有未被账号引用的角色可删除。"
        confirmLabel="确认删除"
        confirmVariant="danger"
        onConfirm={() => {
          onComplete?.({ action: 'delete-role', message: '角色已删除', type: 'success', row });
          onClose?.();
        }}
      />
    );
  }

  // 防御分支：行内按钮按行操作矩阵隐藏（预置角色不展示停用/删除，被引用角色不展示删除），
  // 若动作仍被触发则按 Demo《弹窗与Mock》§3 的阻止文案提示。
  if (type === 'blocked-disable-role') {
    return (
      <InfoDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="不可停用"
        description="系统管理员角色不可停用，用于保证系统始终有可管理人员。"
        confirmLabel="知道了"
        onConfirm={() => onClose?.()}
      />
    );
  }

  if (type === 'blocked-delete-role') {
    return (
      <InfoDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="不可删除"
        description="该角色已分配给账号，不能删除，可改为停用。"
        confirmLabel="知道了"
        onConfirm={() => onClose?.()}
      />
    );
  }

  return null;
}
