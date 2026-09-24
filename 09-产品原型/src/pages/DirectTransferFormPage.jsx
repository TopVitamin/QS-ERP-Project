import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { DocumentEditorFrame, EditorCard } from '../components/erp/DocumentEditorFrame.jsx';
import { FormFields } from '../components/erp/FormControl.jsx';
import { LineItemTable } from '../components/erp/LineItemTable.jsx';
import { Button } from '../components/ui/button.jsx';
import { DirectTransferActionDialogs } from '../components/erp/DirectTransferActionDialogs.jsx';
import { erpFieldGridClassName } from '../styles/typography.js';
import { useDocumentForm } from '../hooks/useDocumentForm.js';
import { nowStamp } from '../lib/inventoryStockLogic.js';
import { getInventoryLogicalWarehouseOptions } from '../data/warehouseData.js';
import {
  defaultDirectTransferForm,
  directTransferLineEditorOptions,
  getEditableDirectTransfer,
} from '../data/directTransferData.js';
import {
  applySubmitDirectTransfer,
  canEditDirectTransfer,
  createDirectTransfer,
  directTransferAuditLabels,
  directTransferBadgeTones,
  generateDirectTransferNo,
  loadDirectTransferById,
  updateDirectTransfer,
  validateDirectTransferForSave,
  validateDirectTransferForSubmit,
} from '../lib/directTransferLogic.js';
// 重复商品检查复用主单同一实现（不合并、仅提示）
import { findDuplicateTransferOrderProducts } from '../lib/transferOrderLogic.js';

/**
 * 直接调拨单新增/编辑页（F02、F03，仅人工一步式）。
 * 来源类型固定「人工一步式」；单据信息 6 列栅格 + 提示行；明细用 direct-transfer variant。
 */
const warehouseOptions = getInventoryLogicalWarehouseOptions({ includeDisabled: false, includeTransit: false });

function getInitialForm(mode, context) {
  const source = mode === 'edit' ? getEditableDirectTransfer(context?.row) : defaultDirectTransferForm;
  return { ...source, lines: source.lines.map((line) => ({ ...line })) };
}

function createDirectTransferLine() {
  return {
    id: `direct-transfer-line-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    lineNo: 1,
    product: '',
    productCode: '',
    productName: '',
    unit: '',
    quantity: 1,
  };
}

function createDirectTransferLineFromSku(sku, template) {
  const sameSku = template?.product === sku?.value;
  return {
    ...createDirectTransferLine(),
    product: sku?.value || '',
    productCode: sku?.skuCode || '',
    productName: sku?.productName || '',
    unit: sku?.unit && sku.unit !== '-' ? sku.unit : (template?.unit || ''),
    quantity: sameSku ? template.quantity : 1,
  };
}

function prepareDirectTransferForm(form) {
  if (form.transferNo && form.transferNo !== '保存后自动生成') return form;
  return { ...form, transferNo: generateDirectTransferNo() };
}

export function DirectTransferFormPage({ mode = 'create', context, onFeedback, onOpenPage }) {
  const isCreate = mode === 'create';
  const [dialog, setDialog] = useState(null);
  const savedIdRef = useRef(context?.row?.id || '');

  const {
    form,
    dirty,
    fieldErrors,
    updateField,
    updateLine,
    addLine,
    removeLine,
    replaceLineWithItems,
    save,
  } = useDocumentForm({
    mode,
    context,
    contextId: context?.row?.id || 'create',
    getInitialForm,
    validate: validateDirectTransferForSave,
    prepareOnSave: prepareDirectTransferForm,
    navigateOnSave: false,
    onPersist: (nextForm, meta) => {
      const stamp = nowStamp();
      const existing = savedIdRef.current ? loadDirectTransferById(savedIdRef.current) : null;
      const saved = existing
        ? updateDirectTransfer(existing, nextForm, { time: stamp })
        : createDirectTransfer(nextForm, { time: stamp });
      savedIdRef.current = saved.id;
      if (meta?.shouldSubmit) applySubmitDirectTransfer(loadDirectTransferById(saved.id) || saved, { time: stamp });
    },
    onFeedback,
  });

  function handleSave() {
    // 重复商品不合并、仅提示（Q03）；保存与提交都提示一次
    if (findDuplicateTransferOrderProducts(form.lines).length) {
      onFeedback?.('同一商品建议合并为一行', 'info');
    }
    save('草稿已保存');
  }

  function handleSubmitRequest() {
    const submitError = validateDirectTransferForSubmit(form);
    if (submitError) {
      onFeedback?.(submitError.message || '提交失败，请检查填写内容后重试', 'warning');
      return;
    }
    setDialog({
      type: 'submit',
      onConfirm: () => {
        const saved = save('已提交，等待审核', true);
        if (saved) onOpenPage?.('inventory-direct-transfer');
      },
    });
  }

  const notEditable = !isCreate && !canEditDirectTransfer(context?.row);

  if (notEditable) {
    return (
      <div className="rounded-erp-section border border-erp-border-card bg-erp-surface-panel p-6 text-[12px] text-erp-text">
        当前状态不可编辑。
        <button type="button" className="ml-2 text-erp-primary" onClick={() => onOpenPage?.('inventory-direct-transfer')}>返回列表</button>
      </div>
    );
  }

  const fields = [
    { key: 'transferNo', label: '单号', type: 'disabled', getValue: (current) => current.transferNo },
    { key: 'sourceType', label: '来源类型', type: 'disabled', getValue: () => '人工一步式' },
    { key: 'fromWarehouse', label: '来源逻辑仓 *', type: 'select', options: warehouseOptions, placeholder: '请选择来源逻辑仓' },
    { key: 'toWarehouse', label: '目标逻辑仓 *', type: 'select', options: warehouseOptions, placeholder: '请选择目标逻辑仓' },
    { key: 'remark', label: '备注', type: 'textarea', className: 'col-span-3', placeholder: '请输入备注', maxLength: 500 },
  ];

  const statuses = isCreate
    ? []
    : [{ label: directTransferAuditLabels[context?.row?.auditStatus] || '草稿', tone: directTransferBadgeTones.auditStatus[context?.row?.auditStatus] || 'neutral' }];

  return (
    <>
      <DocumentEditorFrame
        title={isCreate ? '新增直接调拨单' : `编辑直接调拨单${form.transferNo && form.transferNo !== '保存后自动生成' ? ` ${form.transferNo}` : ''}`}
        statuses={statuses}
        dirty={dirty}
        onCancel={() => onOpenPage?.('inventory-direct-transfer')}
        onSave={handleSave}
        onSaveAndSubmit={handleSubmitRequest}
        saveLabel="保存"
        submitLabel="提交"
      >
        <EditorCard title="单据信息">
          <div className={erpFieldGridClassName}>
            <FormFields fields={fields} form={form} onFieldChange={updateField} fieldErrors={fieldErrors} />
          </div>
          <p className="border-t border-erp-border-header px-4 py-2 text-[12px] text-erp-text-muted">
            来源逻辑仓与目标逻辑仓不能相同，也不能选择虚拟在途仓；审核通过后来源仓减少、目标仓增加，不推送仓库、不涉及预占。
          </p>
        </EditorCard>

        <EditorCard
          title="商品明细"
          actions={(
            <Button variant="outline" size="compact" onClick={() => addLine(createDirectTransferLine)}>
              <Plus className="h-3.5 w-3.5" strokeWidth={1.9} />
              添加明细
            </Button>
          )}
        >
          <LineItemTable
            variant="direct-transfer"
            mode="edit"
            lines={form.lines}
            onLineChange={updateLine}
            onLineRemove={removeLine}
            onLineSkusSelect={(lineId, selectedSkus) => replaceLineWithItems(lineId, selectedSkus, createDirectTransferLineFromSku)}
            enableSkuPicker
            editorOptions={directTransferLineEditorOptions}
            summary={{
              quantity: {
                label: '实际调拨数量合计',
                value: form.lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0),
              },
            }}
          />
        </EditorCard>
      </DocumentEditorFrame>

      <DirectTransferActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={() => setDialog(null)}
        onNotify={onFeedback}
      />
    </>
  );
}

export function DirectTransferCreatePage(props) {
  return <DirectTransferFormPage {...props} mode="create" />;
}

export function DirectTransferEditPage(props) {
  return <DirectTransferFormPage {...props} mode="edit" />;
}
