import { useEffect, useMemo, useState } from 'react';
import { DocumentEditorFrame, EditorCard } from '../components/erp/DocumentEditorFrame.jsx';
import { FormFields } from '../components/erp/FormControl.jsx';
import { LineItemTable } from '../components/erp/LineItemTable.jsx';
import { resolveOptionLabel } from '../lib/codeName.js';
import { toSelectOptions } from '../lib/options.js';
import { erpFieldGridClassName } from '../styles/typography.js';
import { customerOptions, logicalWarehouseOptions } from '../data/masterData.js';
import { getSalesReturnNoticeStatusBadges } from '../data/salesReturnNoticeData.js';
import {
  buildSalesReturnNoticeFormFromReturn,
  canEditSalesReturnNoticeRemark,
  createSalesReturnNoticeFromReturn,
  loadSalesReturnNoticeById,
  resolveReturnReceiveMode,
  returnReceiveModeLabels,
  updateSalesReturnNoticeRemark,
  validateSalesReturnNoticeForCreate,
} from '../lib/salesReturnNoticeLogic.js';
import {
  canPushReturnNotice,
  loadSalesReturnById,
} from '../lib/salesReturnLogic.js';

function getSourceReturn(context) {
  if (context?.row?.returnNo) return context.row;
  if (context?.sourceReturnId) return loadSalesReturnById(context.sourceReturnId);
  if (context?.row?.id && context?.row?.lines) return loadSalesReturnById(context.row.id) || context.row;
  return null;
}

function receiveModeField({ required = false, disabled = false } = {}) {
  return {
    key: 'receiveMode',
    label: required ? '收货处理方式 *' : '收货处理方式',
    type: 'radio',
    options: toSelectOptions(returnReceiveModeLabels),
    disabled,
  };
}

function buildCreateFields(returnRow) {
  return [
    { key: 'noticeNo', label: '单号', type: 'disabled', getValue: (form) => form.noticeNo },
    { key: 'sourceReturnNo', label: '来源销售退货单', type: 'disabled', getValue: () => returnRow?.returnNo || '' },
    { key: 'customer', label: '客户', type: 'disabled', getValue: (form) => resolveOptionLabel(form.customer, customerOptions) },
    { key: 'warehouse', label: '收货仓库', type: 'disabled', getValue: (form) => resolveOptionLabel(form.warehouse, logicalWarehouseOptions) },
    receiveModeField({ required: true }),
    { key: 'remark', label: '备注', type: 'textarea', className: 'col-span-3', placeholder: '请输入备注' },
  ];
}

function buildEditFields() {
  return [
    { key: 'noticeNo', label: '单号', type: 'disabled', getValue: (form) => form.noticeNo },
    { key: 'sourceReturnNo', label: '来源销售退货单', type: 'disabled', getValue: (form) => form.sourceReturnNo },
    { key: 'customer', label: '客户', type: 'disabled', getValue: (form) => resolveOptionLabel(form.customer, customerOptions) },
    { key: 'warehouse', label: '收货仓库', type: 'disabled', getValue: (form) => resolveOptionLabel(form.warehouse, logicalWarehouseOptions) },
    receiveModeField({ disabled: true }),
    { key: 'remark', label: '备注', type: 'textarea', className: 'col-span-3', placeholder: '请输入备注' },
  ];
}

export function SalesReturnNoticeCreatePage({ context, onFeedback, onOpenPage }) {
  const sourceReturn = useMemo(() => getSourceReturn(context), [context]);
  const [form, setForm] = useState(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!sourceReturn) {
      setForm(null);
      return;
    }
    if (!canPushReturnNotice(sourceReturn)) {
      setForm(null);
      return;
    }
    setForm(buildSalesReturnNoticeFormFromReturn(sourceReturn));
    setDirty(false);
  }, [sourceReturn]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  function updateLine(lineId, key, value) {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.id === lineId ? { ...line, [key]: value } : line)),
    }));
    setDirty(true);
  }

  function handleSave() {
    const error = validateSalesReturnNoticeForCreate(form);
    if (error) {
      onFeedback?.(error, 'warning');
      return;
    }
    try {
      createSalesReturnNoticeFromReturn(sourceReturn, form);
      onFeedback?.('销退收货通知单已创建', 'success');
      onOpenPage?.('sales-return-notice');
    } catch (saveError) {
      onFeedback?.(saveError.message || '创建失败，请重试', 'warning');
    }
  }

  if (!sourceReturn) {
    return (
      <div className="rounded-erp-section border border-erp-border-card bg-erp-surface-panel p-6 text-[12px] text-erp-text">
        来源销售退货单不存在或不可下推收货通知。
        <button type="button" className="ml-2 text-erp-primary" onClick={() => onOpenPage?.('sales-return')}>返回销售退货单</button>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="rounded-erp-section border border-erp-border-card bg-erp-surface-panel p-6 text-[12px] text-erp-text">
        当前销售退货单不可下推收货通知。
        <button type="button" className="ml-2 text-erp-primary" onClick={() => onOpenPage?.('sales-return-detail', { row: sourceReturn })}>返回销售退货单</button>
      </div>
    );
  }

  return (
    <DocumentEditorFrame
      title="创建销退收货通知单"
      dirty={dirty}
      onCancel={() => onOpenPage?.('sales-return-detail', { row: sourceReturn })}
      onSave={handleSave}
      saveLabel="保存并创建"
      showSubmit={false}
    >
      <EditorCard title="单据信息">
        <div className={erpFieldGridClassName}>
          <FormFields fields={buildCreateFields(sourceReturn)} form={form} onFieldChange={updateField} />
        </div>
      </EditorCard>

      <EditorCard title="商品明细">
        <LineItemTable
          variant="receipt-notice"
          mode="edit"
          lines={form.lines}
          onLineChange={updateLine}
        />
      </EditorCard>
    </DocumentEditorFrame>
  );
}

export function SalesReturnNoticeEditPage({ context, onFeedback, onOpenPage }) {
  const sourceRow = context?.row;
  const [form, setForm] = useState(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!sourceRow?.id) {
      setForm(null);
      return;
    }
    const latest = loadSalesReturnNoticeById(sourceRow.id) || sourceRow;
    if (!canEditSalesReturnNoticeRemark(latest)) {
      setForm(null);
      return;
    }
    setForm({
      ...latest,
      receiveMode: resolveReturnReceiveMode(latest),
      lines: latest.lines.map((line) => ({ ...line })),
    });
    setDirty(false);
  }, [sourceRow]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  function handleSave() {
    const next = updateSalesReturnNoticeRemark(form, form.remark || '');
    onFeedback?.('销退收货通知单已保存', 'success');
    onOpenPage?.('sales-return-notice-detail', { row: next });
  }

  if (!form) {
    return (
      <div className="rounded-erp-section border border-erp-border-card bg-erp-surface-panel p-6 text-[12px] text-erp-text">
        当前状态不可编辑。
        <button type="button" className="ml-2 text-erp-primary" onClick={() => onOpenPage?.('sales-return-notice')}>返回列表</button>
      </div>
    );
  }

  return (
    <DocumentEditorFrame
      title={`编辑销退收货通知单 ${form.noticeNo}`}
      statuses={getSalesReturnNoticeStatusBadges(form)}
      dirty={dirty}
      onCancel={() => onOpenPage?.('sales-return-notice-detail', { row: form })}
      onSave={handleSave}
      saveLabel="保存"
      showSubmit={false}
    >
      <EditorCard title="单据信息">
        <div className={erpFieldGridClassName}>
          <FormFields fields={buildEditFields()} form={form} onFieldChange={updateField} />
        </div>
      </EditorCard>

      <EditorCard title="商品明细">
        <LineItemTable variant="receipt-notice" lines={form.lines} hiddenColumns={['receivedQty', 'shortQty']} />
      </EditorCard>
    </DocumentEditorFrame>
  );
}
