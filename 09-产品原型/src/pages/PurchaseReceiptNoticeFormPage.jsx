import { useMemo } from 'react';
import { DocumentEditorFrame, EditorCard } from '../components/erp/DocumentEditorFrame.jsx';
import { FormFields } from '../components/erp/FormControl.jsx';
import { LineItemTable } from '../components/erp/LineItemTable.jsx';
import { NoticeSourceMissingState, useNoticeFormDraft } from './noticeFormShared.jsx';
import { resolveOptionLabel } from '../lib/codeName.js';
import { toSelectOptions } from '../lib/options.js';
import { erpFieldGridClassName } from '../styles/typography.js';
import { supplierOptions } from '../data/masterData.js';
import { getInventoryLogicalWarehouseOptions } from '../data/warehouseData.js';
import { getNoticeStatusBadges } from '../data/receiptNoticeData.js';
import {
  buildNoticeFormFromOrder,
  canEditRemark,
  createReceiptNotice,
  loadNoticeById,
  receiptModeLabels,
  resolveReceiptMode,
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

// 收货处理方式说明图标文案（《采购收货通知单前端Demo版PRD_新增编辑页》§3.1、验收场景「处理方式说明」）。
const RECEIPT_MODE_TIPS = {
  warehouse: '通知按收货仓库的链路下发：自营仓由ERP直连；电商仓经聚水潭、领星中转，仍只执行一次收货',
  virtual: '虚拟入库不会推送通知单到仓库，而是直接生成采购入库单，增加ERP的库存，也不向聚水潭、领星同步库存',
};

function receiptModeField({ required = false, disabled = false, showTips = false } = {}) {
  return {
    key: 'receiptMode',
    label: required ? '收货处理方式 *' : '收货处理方式',
    type: 'radio',
    options: toSelectOptions(receiptModeLabels).map((option) => (
      showTips && RECEIPT_MODE_TIPS[option.value]
        ? { ...option, tip: RECEIPT_MODE_TIPS[option.value] }
        : option
    )),
    disabled,
  };
}

function buildCreateFields(orderRow) {
  return [
    { key: 'noticeNo', label: '单号', type: 'disabled', getValue: (form) => form.noticeNo },
    { key: 'sourceOrderNo', label: '来源采购订单', type: 'disabled', getValue: () => orderRow?.orderNo || '' },
    { key: 'supplier', label: '供应商', type: 'disabled', getValue: (form) => resolveOptionLabel(form.supplier, supplierOptions) },
    { key: 'warehouse', label: '收货仓库', type: 'disabled', getValue: (form) => resolveOptionLabel(form.warehouse, getInventoryLogicalWarehouseOptions()) },
    receiptModeField({ required: true, showTips: true }),
    { key: 'remark', label: '备注', type: 'textarea', className: 'col-span-3', placeholder: '请输入备注' },
  ];
}

function buildEditFields() {
  return [
    { key: 'noticeNo', label: '单号', type: 'disabled', getValue: (form) => form.noticeNo },
    { key: 'sourceOrderNo', label: '来源采购订单', type: 'disabled', getValue: (form) => form.sourceOrderNo },
    { key: 'supplier', label: '供应商', type: 'disabled', getValue: (form) => resolveOptionLabel(form.supplier, supplierOptions) },
    { key: 'warehouse', label: '收货仓库', type: 'disabled', getValue: (form) => resolveOptionLabel(form.warehouse, getInventoryLogicalWarehouseOptions()) },
    receiptModeField({ disabled: true }),
    { key: 'remark', label: '备注', type: 'textarea', className: 'col-span-3', placeholder: '请输入备注' },
  ];
}

export function PurchaseReceiptNoticeCreatePage({ context, onFeedback, onOpenPage }) {
  const sourceOrder = useMemo(() => getSourceOrder(context), [context]);
  const { form, dirty, updateField, updateLine } = useNoticeFormDraft(sourceOrder, {
    canPush: canPushNotice,
    buildForm: buildNoticeFormFromOrder,
  });

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
      <NoticeSourceMissingState
        message="来源采购订单不存在或不可下推收货通知。"
        linkLabel="返回采购订单"
        onBack={() => onOpenPage?.('purchase-order')}
      />
    );
  }

  if (!form) {
    return (
      <NoticeSourceMissingState
        message="当前采购订单不可下推收货通知。"
        linkLabel="返回采购订单"
        onBack={() => onOpenPage?.('purchase-order-detail', { row: sourceOrder })}
      />
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

function buildEditableNoticeForm(sourceRow) {
  const latest = loadNoticeById(sourceRow.id) || sourceRow;
  return {
    ...latest,
    receiptMode: resolveReceiptMode(latest),
    lines: latest.lines.map((line) => ({ ...line })),
  };
}

function canEditLoadedNotice(sourceRow) {
  return canEditRemark(loadNoticeById(sourceRow.id) || sourceRow);
}

export function PurchaseReceiptNoticeEditPage({ context, onFeedback, onOpenPage }) {
  const sourceRow = context?.row;
  const { form, dirty, updateField } = useNoticeFormDraft(sourceRow, {
    canPush: canEditLoadedNotice,
    buildForm: buildEditableNoticeForm,
  });

  function handleSave() {
    const next = updateNoticeRemark(form, form.remark || '');
    onFeedback?.('采购收货通知单已保存', 'success');
    onOpenPage?.('purchase-receipt-notice-detail', { row: next });
  }

  if (!form) {
    return (
      <NoticeSourceMissingState
        message="当前状态不可编辑。"
        linkLabel="返回列表"
        onBack={() => onOpenPage?.('purchase-receipt-notice')}
      />
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
