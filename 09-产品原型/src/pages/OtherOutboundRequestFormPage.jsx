import { useState } from 'react';
import { Plus } from 'lucide-react';
import { DocumentEditorFrame, EditorCard } from '../components/erp/DocumentEditorFrame.jsx';
import { FormFields } from '../components/erp/FormControl.jsx';
import { LineItemTable } from '../components/erp/LineItemTable.jsx';
import { Button } from '../components/ui/button.jsx';
import { OtherOutboundRequestActionDialogs } from '../components/erp/OtherOutboundRequestActionDialogs.jsx';
import { useDocumentForm } from '../hooks/useDocumentForm.js';
import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import { erpFieldGridClassName } from '../styles/typography.js';
import { getInventoryLogicalWarehouseOptions, isTransitLogicalWarehouse } from '../data/warehouseData.js';
import { getOtherOutboundRequestStatusBadges } from '../data/otherOutboundRequestData.js';
import { productOptions, skuOptions } from '../data/masterData.js';
import {
  buildOtherOutboundRequestBusinessTypeOptions,
  buildOutboundRequestFormFromRow,
  canEditRequest,
  createEmptyOutboundRequestForm,
  createOtherOutboundRequest,
  createOtherOutboundRequestLine,
  createOtherOutboundRequestLineFromSku,
  isTransitWriteOffBusinessType,
  loadOtherOutboundRequestById,
  otherOutboundRequestStatusLabels,
  refreshOutboundRequestLines,
  sumOutboundRequestActualQty,
  updateOtherOutboundRequest,
  validateOutboundRequestForSave,
  validateOutboundRequestForSubmit,
} from '../lib/otherOutboundRequestLogic.js';

const lineEditorOptions = { productOptions, skuOptions };

const createLine = () => createOtherOutboundRequestLine();
const createLineFromSku = (sku, template) => createOtherOutboundRequestLineFromSku(sku, template);

const requestListPageId = 'inventory-other-outbound-request';

/** 初始表单：新增页空表单；编辑页按单号读取最新草稿（模块级函数，保持引用稳定）。 */
function getRequestForm(mode, context) {
  if (mode !== 'edit') return createEmptyOutboundRequestForm();
  const row = loadOtherOutboundRequestById(context?.row?.id) || context?.row;
  return row ? buildOutboundRequestFormFromRow(row) : createEmptyOutboundRequestForm();
}

/** 在途仓提示行：选中虚拟在途仓时展示，审核后不推送仓库（主PRD R20）。 */
const transitHint = '出库仓选择虚拟在途仓时，审核后不推送仓库，由系统按申请数量直接记账。';

function buildRequestFields() {
  return [
    { key: 'requestNo', label: '单号', type: 'disabled', placeholder: '保存后自动生成', getValue: (form) => form.requestNo },
    {
      key: 'logicalWarehouse',
      label: '出库仓 *',
      type: 'select',
      placeholder: '请选择出库仓',
      options: getInventoryLogicalWarehouseOptions({ includeDisabled: false, includeTransit: true }),
      // 出库仓改回普通仓时清掉只在在途仓可选的「盘亏」（2026-09-24确认）
      onValueChange: (nextValue, form, onFieldChange) => {
        onFieldChange('logicalWarehouse', nextValue);
        if (isTransitWriteOffBusinessType(form.businessType) && !isTransitLogicalWarehouse(nextValue)) {
          onFieldChange('businessType', '');
        }
      },
    },
    {
      key: 'businessType',
      label: '业务类型 *',
      type: 'select',
      placeholder: '请选择业务类型',
      // 盘亏只在出库仓为虚拟在途仓时可选；其余取字段清单已确认枚举
      options: (form) => buildOtherOutboundRequestBusinessTypeOptions(form),
    },
    { key: 'remark', label: '备注', type: 'textarea', className: 'col-span-3', placeholder: '请输入备注', maxLength: 500 },
  ];
}

function FormErrorState({ message, onBack }) {
  return (
    <main className="flex min-h-0 flex-1 flex-col bg-erp-surface text-erp-text">
      <div className="w-full px-4 py-3">
        <div className="flex items-center gap-2 rounded-erp-section border border-erp-border-card bg-erp-surface-panel px-4 py-6 text-[12px] text-erp-text">
          <span>{message}</span>
          <Button variant="outline" size="compact" onClick={onBack}>返回列表</Button>
        </div>
      </div>
    </main>
  );
}

/**
 * 其他出库申请单新增/编辑页（F02、F03）。
 * 新增页不展示状态标签与实出/未出列；编辑页仅草稿可进入，明细增列只读的实出数量、未出数量。
 * 校验分层见《其他出库申请单前端Demo版PRD_新增编辑页》§4：保存校验单头与明细，提交复核仓库启用与业务类型。
 */
export function OtherOutboundRequestFormPage({ mode = 'create', context, onFeedback, onOpenPage }) {
  const [dialog, setDialog] = useState(null);
  const isEdit = mode === 'edit';
  const sourceRow = isEdit ? (loadOtherOutboundRequestById(context?.row?.id) || context?.row || null) : null;

  const {
    form,
    dirty,
    fieldErrors,
    totalQuantity,
    updateField,
    updateLine,
    addLine,
    removeLine,
    replaceLineWithItems,
    save,
    applyValidationResult,
  } = useDocumentForm({
    mode,
    context,
    contextId: context?.row?.id || 'create',
    getInitialForm: getRequestForm,
    validate: validateOutboundRequestForSave,
    prepareOnSave: (currentForm, { mode: formMode, shouldSubmit }) => {
      if (formMode === 'edit' || currentForm.id) {
        const source = loadOtherOutboundRequestById(currentForm.id) || sourceRow;
        return buildOutboundRequestFormFromRow(
          updateOtherOutboundRequest(source, currentForm, { submit: shouldSubmit }),
        );
      }
      return buildOutboundRequestFormFromRow(
        createOtherOutboundRequest(currentForm, { submit: shouldSubmit }),
      );
    },
    navigateOnSave: false,
    onFeedback,
  });

  if (isEdit && !sourceRow) {
    return <FormErrorState message="其他出库申请单不存在或无权查看" onBack={() => onOpenPage?.(requestListPageId)} />;
  }

  if (isEdit && !canEditRequest(sourceRow)) {
    return (
      <FormErrorState
        message={`当前单据状态为${otherOutboundRequestStatusLabels[sourceRow.status] || sourceRow.status}，不可编辑`}
        onBack={() => onOpenPage?.(requestListPageId)}
      />
    );
  }

  function handleSubmitRequest() {
    const result = validateOutboundRequestForSubmit(form);
    if (!result) {
      setDialog({ type: 'submit', row: form, onConfirm: () => save('其他出库申请单已提交', true) });
      return;
    }
    const hasFieldErrors = Object.keys(result.fieldErrors || {}).length > 0;
    applyValidationResult(result);
    if (hasFieldErrors) onFeedback?.('请修正表单中的错误后再提交', 'warning');
  }

  function handleDialogComplete(result) {
    if (result?.message) onFeedback?.(result.message, result.type || 'success');
    setDialog(null);
  }

  const lines = refreshOutboundRequestLines(form.lines || []);
  const actualTotal = sumOutboundRequestActualQty(lines);
  const showTransitHint = isTransitLogicalWarehouse(form.logicalWarehouse);
  const summary = isEdit
    ? {
      quantity: { label: '申请出库数量', value: totalQuantity },
      actualQty: { label: '实出数量', value: actualTotal == null ? EMPTY_PLACEHOLDER : actualTotal },
    }
    : { quantity: { label: '申请出库数量', value: totalQuantity } };

  return (
    <>
      <DocumentEditorFrame
        title={isEdit ? `编辑其他出库申请单 ${form.requestNo || ''}` : '新增其他出库申请单'}
        statuses={isEdit ? getOtherOutboundRequestStatusBadges(form) : []}
        dirty={dirty}
        onCancel={() => onOpenPage?.(requestListPageId)}
        onSave={() => save('其他出库申请单已保存')}
        onSaveAndSubmit={handleSubmitRequest}
        saveLabel="保存"
        submitLabel="提交"
      >
        <EditorCard title="单据信息">
          <div className={erpFieldGridClassName}>
            <FormFields fields={buildRequestFields()} form={form} onFieldChange={updateField} fieldErrors={fieldErrors} />
          </div>
          {showTransitHint ? (
            <div className="px-4 pb-3 text-[12px] text-erp-text">{transitHint}</div>
          ) : null}
        </EditorCard>

        <EditorCard
          title="商品明细"
          actions={(
            <Button variant="outline" size="compact" onClick={() => addLine(createLine)}>
              <Plus className="h-3.5 w-3.5" strokeWidth={1.9} />
              添加明细
            </Button>
          )}
        >
          <LineItemTable
            variant="other-outbound-request"
            mode="edit"
            lines={lines}
            onLineChange={updateLine}
            onLineRemove={removeLine}
            onLineSkusSelect={(lineId, selectedSkus) => replaceLineWithItems(lineId, selectedSkus, createLineFromSku)}
            enableSkuPicker
            editorOptions={lineEditorOptions}
            hiddenColumns={isEdit ? [] : ['actualQty', 'remainingQty']}
            summary={summary}
          />
        </EditorCard>
      </DocumentEditorFrame>

      <OtherOutboundRequestActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={onFeedback}
      />
    </>
  );
}

export function OtherOutboundRequestCreatePage(props) {
  return <OtherOutboundRequestFormPage {...props} mode="create" />;
}

export function OtherOutboundRequestEditPage(props) {
  return <OtherOutboundRequestFormPage {...props} mode="edit" />;
}
