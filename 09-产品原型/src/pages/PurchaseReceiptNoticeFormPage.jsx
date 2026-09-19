import { useEffect, useMemo, useState } from 'react';
import { DocumentEditorFrame, EditorCard } from '../components/erp/DocumentEditorFrame.jsx';
import { FormFields } from '../components/erp/FormControl.jsx';
import { LineItemTable } from '../components/erp/LineItemTable.jsx';
import { resolveOptionLabel } from '../lib/codeName.js';
import { erpFieldGridClassName } from '../styles/typography.js';
import { supplierOptions, warehouseOptions } from '../data/masterData.js';
import { getNoticeStatusBadges } from '../data/receiptNoticeData.js';
import {
  buildNoticeFormFromOrder,
  canEditRemark,
  createReceiptNotice,
  loadNoticeById,
  updateNoticeRemark,
  validateNoticeForCreate,
} from '../lib/receiptNoticeLogic.js';
import {
  loadOrderById,
  canPushNotice,
} from '../lib/purchaseOrderLogic.js';

function getSourceOrder(context) {
  if (context?.row?.orderNo) return context.row;
  if (context?.sourceOrderId) return loadOrderById(context.sourceOrderId);
  if (context?.row?.id && context?.row?.lines) return loadOrderById(context.row.id) || context.row;
  return null;
}

function buildCreateFields(orderRow) {
  return [
    { key: 'noticeNo', label: '单号', type: 'disabled', getValue: (form) => form.noticeNo },
    { key: 'sourceOrderNo', label: '来源采购订单', type: 'disabled', getValue: () => orderRow?.orderNo || '' },
    { key: 'supplier', label: '供应商', type: 'disabled', getValue: (form) => resolveOptionLabel(form.supplier, supplierOptions) },
    { key: 'warehouse', label: '收货仓库', type: 'disabled', getValue: (form) => resolveOptionLabel(form.warehouse, warehouseOptions) },
    { key: 'remark', label: '备注', type: 'textarea', className: 'col-span-3', placeholder: '请输入备注' },
  ];
}

function buildEditFields() {
  return [
    { key: 'noticeNo', label: '单号', type: 'disabled', getValue: (form) => form.noticeNo },
    { key: 'sourceOrderNo', label: '来源采购订单', type: 'disabled', getValue: (form) => form.sourceOrderNo },
    { key: 'supplier', label: '供应商', type: 'disabled', getValue: (form) => resolveOptionLabel(form.supplier, supplierOptions) },
    { key: 'warehouse', label: '收货仓库', type: 'disabled', getValue: (form) => resolveOptionLabel(form.warehouse, warehouseOptions) },
    { key: 'remark', label: '备注', type: 'textarea', className: 'col-span-3', placeholder: '请输入备注' },
  ];
}

export function PurchaseReceiptNoticeCreatePage({ context, onFeedback, onOpenPage }) {
  const sourceOrder = useMemo(() => getSourceOrder(context), [context]);
  const [form, setForm] = useState(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!sourceOrder) {
      setForm(null);
      return;
    }
    if (!canPushNotice(sourceOrder)) {
      setForm(null);
      return;
    }
    setForm(buildNoticeFormFromOrder(sourceOrder));
    setDirty(false);
  }, [sourceOrder]);

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
    const error = validateNoticeForCreate(form);
    if (error) {
      onFeedback?.(error, 'warning');
      return;
    }
    try {
      createReceiptNotice(sourceOrder, form);
      onFeedback?.('采购收货通知单已创建', 'success');
      onOpenPage?.('purchase-receipt-notice');
    } catch (saveError) {
      onFeedback?.(saveError.message || '创建失败，请重试', 'warning');
    }
  }

  if (!sourceOrder) {
    return (
      <div className="rounded-erp-section border border-erp-border-card bg-erp-surface-panel p-6 text-[12px] text-erp-text">
        来源采购订单不存在或不可下推收货通知。
        <button type="button" className="ml-2 text-erp-primary" onClick={() => onOpenPage?.('purchase-order')}>返回采购订单</button>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="rounded-erp-section border border-erp-border-card bg-erp-surface-panel p-6 text-[12px] text-erp-text">
        当前采购订单不可下推收货通知。
        <button type="button" className="ml-2 text-erp-primary" onClick={() => onOpenPage?.('purchase-order-detail', { row: sourceOrder })}>返回采购订单</button>
      </div>
    );
  }

  const fields = buildCreateFields(sourceOrder);

  return (
    <DocumentEditorFrame
      title="创建采购收货通知单"
      dirty={dirty}
      onCancel={() => onOpenPage?.('purchase-order-detail', { row: sourceOrder })}
      onSave={handleSave}
      saveLabel="保存并创建"
      showSubmit={false}
    >
      <EditorCard title="单据信息">
        <div className={erpFieldGridClassName}>
          <FormFields fields={fields} form={form} onFieldChange={updateField} />
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

export function PurchaseReceiptNoticeEditPage({ context, onFeedback, onOpenPage }) {
  const sourceRow = context?.row;
  const [form, setForm] = useState(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!sourceRow?.id) {
      setForm(null);
      return;
    }
    const latest = loadNoticeById(sourceRow.id) || sourceRow;
    if (!canEditRemark(latest)) {
      setForm(null);
      return;
    }
    setForm({
      ...latest,
      lines: latest.lines.map((line) => ({ ...line })),
    });
    setDirty(false);
  }, [sourceRow]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  function handleSave() {
    const next = updateNoticeRemark(form, form.remark || '');
    onFeedback?.('采购收货通知单已保存', 'success');
    onOpenPage?.('purchase-receipt-notice-detail', { row: next });
  }

  if (!form) {
    return (
      <div className="rounded-erp-section border border-erp-border-card bg-erp-surface-panel p-6 text-[12px] text-erp-text">
        当前状态不可编辑。
        <button type="button" className="ml-2 text-erp-primary" onClick={() => onOpenPage?.('purchase-receipt-notice')}>返回列表</button>
      </div>
    );
  }

  const fields = buildEditFields();

  return (
    <DocumentEditorFrame
      title={`编辑采购收货通知单 ${form.noticeNo}`}
      statuses={getNoticeStatusBadges(form)}
      dirty={dirty}
      onCancel={() => onOpenPage?.('purchase-receipt-notice-detail', { row: form })}
      onSave={handleSave}
      saveLabel="保存"
      showSubmit={false}
    >
      <EditorCard title="单据信息">
        <div className={erpFieldGridClassName}>
          <FormFields fields={fields} form={form} onFieldChange={updateField} />
        </div>
      </EditorCard>

      <EditorCard title="商品明细">
        <LineItemTable variant="receipt-notice" lines={form.lines} />
      </EditorCard>
    </DocumentEditorFrame>
  );
}
