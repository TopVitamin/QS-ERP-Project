import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button.jsx';
import { DataTable } from './DataTable.jsx';
import { DetailField, DocumentDetailFrame, EditorCard } from './DocumentDetailFrame.jsx';
import { PartnerActionDialogs } from './PartnerActionDialogs.jsx';
import { erpFieldGridClassName } from '../../styles/typography.js';
import { EMPTY_PLACEHOLDER } from '../../lib/format.js';
import { readMockRows, subscribeMockRows, upsertMockRow, writeMockRows } from '../../lib/mockStorage.js';
import { resolveCurrencyLabel } from '../../data/partnerMasterOptions.js';
import {
  auditLabels,
  buildPartnerStatusBadges,
  canApprove,
  canDisable,
  canEditPartner,
  canEnable,
  canReject,
  canSubmitAudit,
  canUnapprove,
  renderLevel,
  useStatusLabels,
} from '../../lib/partnerMasterLogic.js';

function DetailSubtable({ title, rows, columns, emptyText }) {
  if (!rows?.length) {
    return (
      <EditorCard title={title}>
        <div className="px-4 py-6 text-center text-[12px] text-erp-text-muted">{emptyText}</div>
      </EditorCard>
    );
  }
  const displayColumns = columns.map((column) => ({
    ...column,
    render: column.render || ((value, row) => {
      if (column.key === 'isDefault' && value) return '默认';
      if (column.type === 'boolean') return value ? '是' : '否';
      return value || EMPTY_PLACEHOLDER;
    }),
  }));
  return (
    <EditorCard title={title}>
      <DataTable rows={rows} columns={displayColumns} rowActions={[]} />
    </EditorCard>
  );
}

export function PartnerMasterDetail({ context, config, onFeedback, onOpenPage }) {
  const [rows, setRows] = useState(() => readMockRows(config.storageKey, config.seedRows));
  const [dialog, setDialog] = useState(null);

  useEffect(() => subscribeMockRows(config.storageKey, setRows), [config.storageKey]);

  const row = useMemo(() => {
    const source = context?.row;
    if (!source) return null;
    return rows.find((item) => item.id === source.id) || source;
  }, [context?.row, rows]);

  if (!row) {
    return (
      <main className="flex min-h-0 flex-1 items-center justify-center bg-erp-surface text-erp-text-muted">
        {config.notFoundText}
      </main>
    );
  }

  function handleDialogComplete(result) {
    if (!result) return;
    if (result.action === 'delete' && result.row) {
      writeMockRows(config.storageKey, rows.filter((item) => item.id !== result.row.id));
      onOpenPage?.(config.listPageId);
      onFeedback?.(result.message, result.type || 'success');
      return;
    }
    if (result.nextRow) upsertMockRow(config.storageKey, { ...result.row, ...result.nextRow, id: result.row.id });
    if (result.message) onFeedback?.(result.message, result.type || 'success');
  }

  function handleAction(id) {
    if (id === 'edit') {
      if (!canEditPartner(row)) {
        setDialog({ type: 'blocked-edit', row });
        return;
      }
      onOpenPage?.(config.editPageId, { row });
      return;
    }
    setDialog({ type: id, row });
  }

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      {canEditPartner(row) && <Button variant="outline" size="compact" onClick={() => handleAction('edit')}>编辑</Button>}
      {canSubmitAudit(row) && <Button variant="outline" size="compact" onClick={() => handleAction('submit')}>提交审核</Button>}
      {canApprove(row) && <Button variant="outline" size="compact" onClick={() => handleAction('approve')}>审核通过</Button>}
      {canReject(row) && <Button variant="outline" size="compact" onClick={() => handleAction('reject')}>驳回</Button>}
      {canUnapprove(row) && <Button variant="outline" size="compact" onClick={() => handleAction('unapprove')}>反审核</Button>}
      {canEnable(row) && <Button variant="outline" size="compact" onClick={() => handleAction('enable')}>启用</Button>}
      {canDisable(row) && <Button variant="outline" size="compact" onClick={() => handleAction('disable')}>禁用</Button>}
    </div>
  );

  const contactColumns = [
    { key: 'name', label: '联系人姓名', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true },
    { key: 'type', label: '联系人类型', defaultWidth: 100, minWidth: 88, maxWidth: 140, ellipsis: true },
    { key: 'mobile', label: '手机号码', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true },
    { key: 'phone', label: '固定电话', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true },
    { key: 'email', label: '电子邮箱', defaultWidth: 140, minWidth: 120, maxWidth: 200, ellipsis: true },
    { key: 'isDefault', label: '默认', defaultWidth: 70, minWidth: 60, maxWidth: 90, ellipsis: true },
    { key: 'remark', label: '备注', defaultWidth: 120, minWidth: 100, maxWidth: 180, ellipsis: true },
  ];

  const addressColumns = [
    { key: 'addressType', label: '地址类型', defaultWidth: 90, minWidth: 80, maxWidth: 120, ellipsis: true },
    { key: 'province', label: '省', defaultWidth: 80, minWidth: 70, maxWidth: 110, ellipsis: true },
    { key: 'city', label: '市', defaultWidth: 80, minWidth: 70, maxWidth: 110, ellipsis: true },
    { key: 'district', label: '区', defaultWidth: 80, minWidth: 70, maxWidth: 110, ellipsis: true },
    { key: 'detailAddress', label: '详细地址', defaultWidth: 200, minWidth: 160, maxWidth: 280, ellipsis: true },
    { key: 'contactName', label: '地址联系人', defaultWidth: 100, minWidth: 88, maxWidth: 140, ellipsis: true },
    { key: 'contactPhone', label: '联系电话', defaultWidth: 110, minWidth: 96, maxWidth: 150, ellipsis: true },
    { key: 'isDefault', label: '默认', defaultWidth: 70, minWidth: 60, maxWidth: 90, ellipsis: true },
  ];

  const bankColumns = config.bankDetailColumns || [
    { key: 'accountName', label: '收款户名', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true },
    { key: 'accountNo', label: '收款账号', defaultWidth: 150, minWidth: 120, maxWidth: 200, ellipsis: true },
    { key: 'bankName', label: '开户银行', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true },
    { key: 'branchName', label: '开户支行', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true },
    { key: 'bankCode', label: '银行联行号', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true },
    { key: 'currency', label: '账户币别', defaultWidth: 100, minWidth: 88, maxWidth: 140, ellipsis: true, render: resolveCurrencyLabel },
    { key: 'isDefault', label: '默认', defaultWidth: 70, minWidth: 60, maxWidth: 90, ellipsis: true },
    { key: 'remark', label: '账户备注', defaultWidth: 140, minWidth: 110, maxWidth: 200, ellipsis: true },
  ];

  const businessInfo = row.businessInfo || {};
  const hasBusinessInfo = config.renderBusinessInfo && Object.values(businessInfo).some((value) => String(value || '').trim());

  return (
    <>
      <DocumentDetailFrame
        title={row.code}
        statuses={buildPartnerStatusBadges(row)}
        headerActions={headerActions}
        onBack={() => onOpenPage?.(config.listPageId)}
      >
        <EditorCard title="基础信息">
          <div className={erpFieldGridClassName}>
            {config.baseInfoFields(row).map((field) => <DetailField key={field.key} {...field} />)}
          </div>
        </EditorCard>
        <EditorCard title={config.settlementTitle}>
          <div className={erpFieldGridClassName}>
            {config.settlementFields(row).map((field) => <DetailField key={field.key} {...field} />)}
          </div>
        </EditorCard>
        <DetailSubtable title="联系人" rows={row.contacts} columns={contactColumns} emptyText="暂无联系人" />
        <DetailSubtable title="地址" rows={row.addresses} columns={addressColumns} emptyText="暂无地址" />
        <DetailSubtable title="银行信息" rows={row.banks} columns={bankColumns} emptyText="暂无银行信息" />
        {config.renderBusinessInfo && (
          <EditorCard title="工商信息">
            {hasBusinessInfo ? (
              <div className={erpFieldGridClassName}>
                {config.businessInfoFields(businessInfo).map((field) => <DetailField key={field.key} {...field} />)}
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-[12px] text-erp-text-muted">暂无工商信息</div>
            )}
          </EditorCard>
        )}
        <EditorCard title="审核与使用">
          <div className={erpFieldGridClassName}>
            <DetailField label="审核状态" value={auditLabels[row.auditStatus] || EMPTY_PLACEHOLDER} />
            <DetailField label="使用状态" value={useStatusLabels[row.useStatus] || EMPTY_PLACEHOLDER} />
          </div>
        </EditorCard>
        <EditorCard title="维护信息">
          <div className={erpFieldGridClassName}>
            <DetailField label="审核人" value={row.auditor || EMPTY_PLACEHOLDER} />
            <DetailField label="审核时间" value={row.auditedAt || EMPTY_PLACEHOLDER} />
            <DetailField label="创建人" value={row.creator || EMPTY_PLACEHOLDER} />
            <DetailField label="创建时间" value={row.createdAt || EMPTY_PLACEHOLDER} />
            <DetailField label="最后更新人" value={row.updater || EMPTY_PLACEHOLDER} />
            <DetailField label="最后更新时间" value={row.updatedAt || EMPTY_PLACEHOLDER} />
          </div>
        </EditorCard>
      </DocumentDetailFrame>
      <PartnerActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        entityName={config.entityName}
      />
    </>
  );
}
