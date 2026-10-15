import { useMemo } from 'react';
import { DocumentEditorFrame, EditorCard } from '../components/erp/DocumentEditorFrame.jsx';
import { FormFields } from '../components/erp/FormControl.jsx';
import { LineItemTable } from '../components/erp/LineItemTable.jsx';
import { NoticeSourceMissingState, useNoticeFormDraft } from './noticeFormShared.jsx';
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

// 发货处理方式说明图标文案（《采退发货通知单前端Demo版PRD_新增编辑页》§3、03《集成协作与人工补充》§4.2.1）。
const SHIP_MODE_TIPS = {
  warehouse: '通知按出库仓库的链路下发：自营仓由ERP直连；电商仓经聚水潭、领星中转，仍只执行一次退货出库',
  virtual: '虚拟出库不会推送通知单到仓库，而是直接生成采退出库单，扣减ERP的库存，也不向聚水潭、领星同步库存',
};

function shipModeField({ required = false, disabled = false, showTips = false } = {}) {
  return {
    key: 'shipMode',
    label: required ? '发货处理方式 *' : '发货处理方式',
    type: 'radio',
    options: toSelectOptions(returnShipModeLabels).map((option) => (
      showTips && SHIP_MODE_TIPS[option.value]
        ? { ...option, tip: SHIP_MODE_TIPS[option.value] }
        : option
    )),
    disabled,
  };
}

function buildCreateFields(returnRow) {
  return [
    { key: 'noticeNo', label: '单号', type: 'disabled', getValue: (form) => form.noticeNo },
    { key: 'sourceReturnNo', label: '来源采购退货单', type: 'disabled', getValue: () => returnRow?.returnNo || '' },
    { key: 'supplier', label: '供应商', type: 'disabled', getValue: (form) => resolveOptionLabel(form.supplier, supplierOptions) },
    { key: 'warehouse', label: '出库仓库', type: 'disabled', getValue: (form) => resolveOptionLabel(form.warehouse, logicalWarehouseOptions) },
    shipModeField({ required: true, showTips: true }),
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

  const { form, dirty, updateField, updateLine } = useNoticeFormDraft(sourceReturn, {
    buildForm: buildNoticeFormForReturn,
  });

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
      <NoticeSourceMissingState
        message="来源采购退货单不存在或不可下推发货通知。"
        linkLabel="返回采购退货单"
        onBack={() => onOpenPage?.('purchase-return')}
      />
    );
  }

  if (!form) {
    return (
      <NoticeSourceMissingState
        message="当前采购退货单不可下推发货通知。"
        linkLabel="返回采购退货单"
        onBack={() => onOpenPage?.('purchase-return-detail', { row: sourceReturn })}
      />
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
  const { form, dirty, updateField } = useNoticeFormDraft(sourceRow, {
    buildForm: buildEditableNoticeForm,
  });

  function handleSave() {
    const next = updateReturnNoticeRemark(form, form.remark || '');
    onFeedback?.('采退发货通知单已保存', 'success');
    onOpenPage?.('purchase-return-notice-detail', { row: next });
  }

  if (!form) {
    return (
      <NoticeSourceMissingState
        message="当前状态不可编辑。"
        linkLabel="返回列表"
        onBack={() => onOpenPage?.('purchase-return-notice')}
      />
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
