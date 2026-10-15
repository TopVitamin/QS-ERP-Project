import { useMemo } from 'react';
import { DocumentEditorFrame, EditorCard } from '../components/erp/DocumentEditorFrame.jsx';
import { FormFields } from '../components/erp/FormControl.jsx';
import { LineItemTable } from '../components/erp/LineItemTable.jsx';
import { NoticeSourceMissingState, useNoticeFormDraft } from './noticeFormShared.jsx';
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

/** 下推创建：来源退货单须已审核+正常+有可下推量（R02） */
function buildNoticeFormForReturn(sourceReturn) {
  if (!sourceReturn || !canPushReturnNotice(sourceReturn)) return null;
  return buildSalesReturnNoticeFormFromReturn(sourceReturn);
}

/** 编辑备注：仅待推送、推送失败可进入（R12） */
function buildEditableNoticeForm(sourceRow) {
  if (!sourceRow?.id) return null;
  const latest = loadSalesReturnNoticeById(sourceRow.id) || sourceRow;
  if (!canEditSalesReturnNoticeRemark(latest)) return null;
  return {
    ...latest,
    receiveMode: resolveReturnReceiveMode(latest),
    lines: latest.lines.map((line) => ({ ...line })),
  };
}

// 收货处理方式说明图标文案（对照 03《集成协作与人工补充》§4.2.1：仅 ERP 内记账，不向聚水潭／领星同步库存）。
const VIRTUAL_RECEIVE_TIP = '虚拟入库不会推送通知单到仓库，而是直接生成销退入库单，增加ERP的库存，也不向聚水潭、领星同步库存';

function receiveModeField({ required = false, disabled = false, showVirtualTip = false } = {}) {
  return {
    key: 'receiveMode',
    label: required ? '收货处理方式 *' : '收货处理方式',
    type: 'radio',
    options: toSelectOptions(returnReceiveModeLabels).map((option) => (
      showVirtualTip && option.value === 'virtual'
        ? { ...option, tip: VIRTUAL_RECEIVE_TIP }
        : option
    )),
    disabled,
  };
}

function buildCreateFields(returnRow) {
  return [
    { key: 'noticeNo', label: '单号', type: 'disabled', getValue: (form) => form.noticeNo },
    { key: 'sourceReturnNo', label: '来源销售退货单', type: 'disabled', getValue: () => returnRow?.returnNo || '' },
    { key: 'customer', label: '客户', type: 'disabled', getValue: (form) => resolveOptionLabel(form.customer, customerOptions) },
    { key: 'warehouse', label: '收货仓库', type: 'disabled', getValue: (form) => resolveOptionLabel(form.warehouse, logicalWarehouseOptions) },
    receiveModeField({ required: true, showVirtualTip: true }),
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
  const { form, dirty, updateField, updateLine } = useNoticeFormDraft(sourceReturn, {
    buildForm: buildNoticeFormForReturn,
  });

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
      <NoticeSourceMissingState
        message="来源销售退货单不存在或不可下推收货通知。"
        linkLabel="返回销售退货单"
        onBack={() => onOpenPage?.('sales-return')}
      />
    );
  }

  if (!form) {
    return (
      <NoticeSourceMissingState
        message="当前销售退货单不可下推收货通知。"
        linkLabel="返回销售退货单"
        onBack={() => onOpenPage?.('sales-return-detail', { row: sourceReturn })}
      />
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
  const { form, dirty, updateField } = useNoticeFormDraft(sourceRow, {
    buildForm: buildEditableNoticeForm,
  });

  function handleSave() {
    const next = updateSalesReturnNoticeRemark(form, form.remark || '');
    onFeedback?.('销退收货通知单已保存', 'success');
    onOpenPage?.('sales-return-notice-detail', { row: next });
  }

  if (!form) {
    return (
      <NoticeSourceMissingState
        message="当前状态不可编辑。"
        linkLabel="返回列表"
        onBack={() => onOpenPage?.('sales-return-notice')}
      />
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
