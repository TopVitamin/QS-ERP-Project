import { useEffect, useMemo, useState } from 'react';
import { DocumentEditorFrame, EditorCard } from '../components/erp/DocumentEditorFrame.jsx';
import { FormFields } from '../components/erp/FormControl.jsx';
import { LineItemTable } from '../components/erp/LineItemTable.jsx';
import { resolveOptionLabel } from '../lib/codeName.js';
import { createEmptyCnAddress, getCustomerAddressOptions } from '../lib/cnAddress.js';
import { toSelectOptions } from '../lib/options.js';
import { erpFieldGridClassName } from '../styles/typography.js';
import { customerOptions, logicalWarehouseOptions } from '../data/masterData.js';
import { getSelectableLogisticsProductOptions } from '../data/logisticsData.js';
import { getDeliveryNoticeStatusBadges } from '../data/salesDeliveryNoticeData.js';
import {
  buildNoticeFormFromOrder,
  canEditRemark,
  createDeliveryNotice,
  deliveryModeLabels,
  loadNoticeById,
  resolveDeliveryMode,
  shipMethodLabels,
  updateNoticeRemark,
  validateNoticeForCreate,
} from '../lib/salesDeliveryNoticeLogic.js';
import {
  canPushDeliveryNotice,
  loadOrderById,
} from '../lib/salesOrderLogic.js';

function getSourceOrder(context) {
  if (context?.row?.orderNo) return context.row;
  if (context?.sourceOrderId) return loadOrderById(context.sourceOrderId);
  if (context?.row?.id && context?.row?.lines) return loadOrderById(context.row.id) || context.row;
  return null;
}

function deliveryModeField({ required = false, disabled = false } = {}) {
  return {
    key: 'deliveryMode',
    label: required ? '发货处理方式 *' : '发货处理方式',
    type: 'radio',
    options: toSelectOptions(deliveryModeLabels),
    disabled,
  };
}

function buildCreateFields(orderRow, form) {
  const showLogistics = form?.shipMethod !== 'pickup';
  const fields = [
    { key: 'noticeNo', label: '单号', type: 'disabled', getValue: (f) => f.noticeNo },
    { key: 'sourceOrderNo', label: '来源销售订单', type: 'disabled', getValue: () => orderRow?.orderNo || '' },
    { key: 'customer', label: '客户', type: 'disabled', getValue: (f) => resolveOptionLabel(f.customer, customerOptions) },
    { key: 'warehouse', label: '发货仓库', type: 'disabled', getValue: (f) => resolveOptionLabel(f.warehouse, logicalWarehouseOptions) },
    deliveryModeField({ required: true }),
    {
      key: 'shipMethod',
      label: '发货方式 *',
      type: 'select',
      options: toSelectOptions(shipMethodLabels),
    },
    { key: 'remark', label: '备注', type: 'textarea', className: 'col-span-3', placeholder: '请输入备注' },
  ];

  if (showLogistics) {
    fields.push(
      {
        key: 'logisticsProduct',
        label: '物流服务产品 *',
        type: 'select',
        options: getSelectableLogisticsProductOptions(),
        section: 'logistics',
      },
      {
        key: 'deliveryAddress',
        label: '发货地址 *',
        type: 'customer-address',
        addressOptions: () => getCustomerAddressOptions(orderRow?.customer),
        placeholder: '请选择发货地址',
        className: 'col-span-2',
        section: 'logistics',
      },
    );
  }

  return fields;
}

function buildEditFields() {
  return [
    { key: 'noticeNo', label: '单号', type: 'disabled', getValue: (form) => form.noticeNo },
    { key: 'sourceOrderNo', label: '来源销售订单', type: 'disabled', getValue: (form) => form.sourceOrderNo },
    { key: 'customer', label: '客户', type: 'disabled', getValue: (form) => resolveOptionLabel(form.customer, customerOptions) },
    { key: 'warehouse', label: '发货仓库', type: 'disabled', getValue: (form) => resolveOptionLabel(form.warehouse, logicalWarehouseOptions) },
    deliveryModeField({ disabled: true }),
    { key: 'remark', label: '备注', type: 'textarea', className: 'col-span-3', placeholder: '请输入备注' },
  ];
}

export function SalesDeliveryNoticeCreatePage({ context, onFeedback, onOpenPage }) {
  const sourceOrder = useMemo(() => getSourceOrder(context), [context]);
  const [form, setForm] = useState(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!sourceOrder) {
      setForm(null);
      return;
    }
    if (!canPushDeliveryNotice(sourceOrder)) {
      setForm(null);
      return;
    }
    setForm(buildNoticeFormFromOrder(sourceOrder));
    setDirty(false);
  }, [sourceOrder]);

  function updateField(key, value) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'shipMethod' && value === 'pickup') {
        next.deliveryAddress = createEmptyCnAddress();
        next.logisticsProduct = '';
      }
      if (key === 'shipMethod' && value === 'logistics') {
        if (!next.deliveryAddress?.provinceCode) {
          next.deliveryAddress = buildNoticeFormFromOrder(sourceOrder).deliveryAddress;
        }
        next.logisticsProduct = next.logisticsProduct || 'LSP000001';
      }
      return next;
    });
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
      createDeliveryNotice(sourceOrder, form);
      onFeedback?.('销售发货通知单已创建', 'success');
      onOpenPage?.('sales-delivery-notice');
    } catch (saveError) {
      onFeedback?.(saveError.message || '创建失败，请重试', 'warning');
    }
  }

  if (!sourceOrder) {
    return (
      <div className="rounded-erp-section border border-erp-border-card bg-erp-surface-panel p-6 text-[12px] text-erp-text">
        来源销售订单不存在或不可下推发货通知。
        <button type="button" className="ml-2 text-erp-primary" onClick={() => onOpenPage?.('sales-order')}>返回销售订单</button>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="rounded-erp-section border border-erp-border-card bg-erp-surface-panel p-6 text-[12px] text-erp-text">
        当前销售订单不可下推发货通知。
        <button type="button" className="ml-2 text-erp-primary" onClick={() => onOpenPage?.('sales-order-detail', { row: sourceOrder })}>返回销售订单</button>
      </div>
    );
  }

  const docFields = buildCreateFields(sourceOrder, form);
  const headerFields = docFields.filter((field) => field.section !== 'logistics');
  const logisticsFields = docFields.filter((field) => field.section === 'logistics');

  return (
    <DocumentEditorFrame
      title="创建销售发货通知单"
      dirty={dirty}
      onCancel={() => onOpenPage?.('sales-order-detail', { row: sourceOrder })}
      onSave={handleSave}
      saveLabel="保存并创建"
      showSubmit={false}
    >
      <EditorCard title="单据信息">
        <div className={erpFieldGridClassName}>
          <FormFields fields={headerFields} form={form} onFieldChange={updateField} />
        </div>
      </EditorCard>

      {logisticsFields.length > 0 && (
        <EditorCard title="发货与物流">
          <div className={erpFieldGridClassName}>
            <FormFields fields={logisticsFields} form={form} onFieldChange={updateField} />
          </div>
        </EditorCard>
      )}

      <EditorCard title="商品明细">
        <LineItemTable
          variant="delivery-notice"
          mode="edit"
          lines={form.lines}
          onLineChange={updateLine}
        />
      </EditorCard>
    </DocumentEditorFrame>
  );
}

export function SalesDeliveryNoticeEditPage({ context, onFeedback, onOpenPage }) {
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
      deliveryMode: resolveDeliveryMode(latest),
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
    onFeedback?.('销售发货通知单已保存', 'success');
    onOpenPage?.('sales-delivery-notice-detail', { row: next });
  }

  if (!form) {
    return (
      <div className="rounded-erp-section border border-erp-border-card bg-erp-surface-panel p-6 text-[12px] text-erp-text">
        当前状态不可编辑。
        <button type="button" className="ml-2 text-erp-primary" onClick={() => onOpenPage?.('sales-delivery-notice')}>返回列表</button>
      </div>
    );
  }

  const fields = buildEditFields();

  return (
    <DocumentEditorFrame
      title={`编辑销售发货通知单 ${form.noticeNo}`}
      statuses={getDeliveryNoticeStatusBadges(form)}
      dirty={dirty}
      onCancel={() => onOpenPage?.('sales-delivery-notice-detail', { row: form })}
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
        <LineItemTable variant="delivery-notice" lines={form.lines} />
      </EditorCard>
    </DocumentEditorFrame>
  );
}
