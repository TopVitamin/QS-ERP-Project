import { useEffect, useMemo, useState } from 'react';
import { DocumentEditorFrame, EditorCard } from '../components/erp/DocumentEditorFrame.jsx';
import { FormFields } from '../components/erp/FormControl.jsx';
import { LineItemTable } from '../components/erp/LineItemTable.jsx';
import { resolveOptionLabel } from '../lib/codeName.js';
import { toSelectOptions } from '../lib/options.js';
import { erpFieldGridClassName } from '../styles/typography.js';
import { logicalWarehouseOptions, supplierOptions } from '../data/masterData.js';
import { getReturnNoticeStatusBadges } from '../data/purchaseReturnNoticeData.js';
import { canPushReturnNotice, loadReturnById } from '../lib/purchaseReturnLogic.js';
import {
  buildReturnNoticeFormFromReturn,
  canEditReturnNoticeRemark,
  createReturnNoticeFromReturn,
  loadReturnNoticeById,
  refreshReturnNoticeLines,
  resolveReturnShipMode,
  returnShipModeLabels,
  updateReturnNoticeRemark,
  validateReturnNoticeForCreate,
} from '../lib/purchaseReturnNoticeLogic.js';

/**
 * 采退发货通知单下推创建页与编辑备注页（F02、F03）。
 * 创建：来源退货单带入单头与明细，录入通知数量与发货处理方式；编辑：仅备注可改（新增编辑页 PRD §3、§4）。
 */

function shipModeField({ required = false, disabled = false } = {}) {
  return {
    key: 'shipMode',
    label: required ? '发货处理方式 *' : '发货处理方式',
    type: 'radio',
    options: toSelectOptions(returnShipModeLabels),
    disabled,
  };
}

function buildCreateFields(returnRow) {
  return [
    { key: 'noticeNo', label: '单号', type: 'disabled', getValue: (form) => form.noticeNo },
    { key: 'sourceReturnNo', label: '来源采购退货单', type: 'disabled', getValue: () => returnRow?.returnNo || '' },
    { key: 'supplier', label: '供应商', type: 'disabled', getValue: (form) => resolveOptionLabel(form.supplier, supplierOptions) },
    { key: 'warehouse', label: '出库仓库', type: 'disabled', getValue: (form) => resolveOptionLabel(form.warehouse, logicalWarehouseOptions) },
    shipModeField({ required: true }),
    { key: 'remark', label: '备注', type: 'textarea', className: 'col-span-3', placeholder: '请输入备注' },
  ];
}

function buildEditFields() {
  return [
    { key: 'noticeNo', label: '单号', type: 'disabled', getValue: (form) => form.noticeNo },
    { key: 'sourceReturnNo', label: '来源采购退货单', type: 'disabled', getValue: (form) => form.sourceReturnNo },
    { key: 'supplier', label: '供应商', type: 'disabled', getValue: (form) => resolveOptionLabel(form.supplier, supplierOptions) },
    { key: 'warehouse', label: '出库仓库', type: 'disabled', getValue: (form) => resolveOptionLabel(form.warehouse, logicalWarehouseOptions) },
    shipModeField({ disabled: true }),
    { key: 'remark', label: '备注', type: 'textarea', className: 'col-span-3', placeholder: '请输入备注' },
  ];
}

/** 下推创建：来源退货单须已审核+正常+有可下推量（R02） */
function buildNoticeFormForReturn(returnRow) {
  if (!returnRow || !canPushReturnNotice(returnRow)) return null;
  return buildReturnNoticeFormFromReturn(returnRow);
}

/** 编辑备注：仅待推送、推送失败可进入（R12） */
function buildEditableNoticeForm(sourceRow) {
  if (!sourceRow?.id) return null;
  const latest = loadReturnNoticeById(sourceRow.id) || sourceRow;
  if (!canEditReturnNoticeRemark(latest)) return null;
  return {
    ...latest,
    shipMode: resolveReturnShipMode(latest),
    lines: refreshReturnNoticeLines(latest.lines || []),
  };
}

export function PurchaseReturnNoticeCreatePage({ context, onFeedback, onOpenPage }) {
  const sourceReturn = useMemo(() => {
    if (context?.row?.returnNo) return context.row;
    if (context?.sourceReturnId) return loadReturnById(context.sourceReturnId);
    if (context?.row?.id) return loadReturnById(context.row.id) || context.row;
    return null;
  }, [context]);

  const [form, setForm] = useState(() => buildNoticeFormForReturn(sourceReturn));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setForm(buildNoticeFormForReturn(sourceReturn));
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
    const error = validateReturnNoticeForCreate(form);
    if (error) {
      onFeedback?.(error, 'warning');
      return;
    }
    try {
      const { notice } = createReturnNoticeFromReturn(sourceReturn, form);
      onFeedback?.('采退发货通知单已创建', 'success');
      onOpenPage?.('purchase-return-notice-detail', { row: loadReturnNoticeById(notice.id) || notice });
    } catch (saveError) {
      onFeedback?.(saveError.message || '创建失败，请重试', 'warning');
    }
  }

  if (!sourceReturn) {
    return (
      <div className="rounded-erp-section border border-erp-border-card bg-erp-surface-panel p-6 text-[12px] text-erp-text">
        来源采购退货单不存在或不可下推发货通知。
        <button type="button" className="ml-2 text-erp-primary" onClick={() => onOpenPage?.('purchase-return')}>返回采购退货单</button>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="rounded-erp-section border border-erp-border-card bg-erp-surface-panel p-6 text-[12px] text-erp-text">
        当前采购退货单不可下推发货通知。
        <button type="button" className="ml-2 text-erp-primary" onClick={() => onOpenPage?.('purchase-return-detail', { row: sourceReturn })}>返回采购退货单</button>
      </div>
    );
  }

  const notifyTotal = form.lines.reduce((sum, line) => sum + Number(line.notifyQty || 0), 0);

  return (
    <DocumentEditorFrame
      title="创建采退发货通知单"
      dirty={dirty}
      onCancel={() => onOpenPage?.('purchase-return-detail', { row: sourceReturn })}
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
          variant="purchase-return-notice"
          mode="edit"
          lines={form.lines}
          onLineChange={updateLine}
          summary={{
            notifyQty: { label: '通知数量', value: notifyTotal },
          }}
        />
      </EditorCard>
    </DocumentEditorFrame>
  );
}

export function PurchaseReturnNoticeEditPage({ context, onFeedback, onOpenPage }) {
  const sourceRow = context?.row;
  const [form, setForm] = useState(() => buildEditableNoticeForm(sourceRow));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setForm(buildEditableNoticeForm(sourceRow));
    setDirty(false);
  }, [sourceRow]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  function handleSave() {
    const next = updateReturnNoticeRemark(form, form.remark || '');
    onFeedback?.('采退发货通知单已保存', 'success');
    onOpenPage?.('purchase-return-notice-detail', { row: next });
  }

  if (!form) {
    return (
      <div className="rounded-erp-section border border-erp-border-card bg-erp-surface-panel p-6 text-[12px] text-erp-text">
        当前状态不可编辑。
        <button type="button" className="ml-2 text-erp-primary" onClick={() => onOpenPage?.('purchase-return-notice')}>返回列表</button>
      </div>
    );
  }

  return (
    <DocumentEditorFrame
      title={`编辑采退发货通知单 ${form.noticeNo}`}
      statuses={getReturnNoticeStatusBadges(form)}
      dirty={dirty}
      onCancel={() => onOpenPage?.('purchase-return-notice-detail', { row: form })}
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
        <LineItemTable
          variant="purchase-return-notice"
          lines={form.lines}
          hiddenColumns={['shippedQty', 'shortQty']}
        />
      </EditorCard>
    </DocumentEditorFrame>
  );
}
