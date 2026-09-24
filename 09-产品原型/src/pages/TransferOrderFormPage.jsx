import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { DocumentEditorFrame, EditorCard } from '../components/erp/DocumentEditorFrame.jsx';
import { FormFields } from '../components/erp/FormControl.jsx';
import { LineItemTable } from '../components/erp/LineItemTable.jsx';
import { Button } from '../components/ui/button.jsx';
import { TransferOrderActionDialogs } from '../components/erp/TransferOrderActionDialogs.jsx';
import { erpFieldGridClassName } from '../styles/typography.js';
import { useDocumentForm } from '../hooks/useDocumentForm.js';
import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import { nowStamp } from '../lib/inventoryStockLogic.js';
import { getInventoryLogicalWarehouseOptions } from '../data/warehouseData.js';
import {
  defaultTransferOrderForm,
  getEditableTransferOrder,
  getTransferOrderStatusBadges,
  transferOrderLineEditorOptions,
} from '../data/transferOrderData.js';
import {
  applySubmitTransferOrder,
  canEditTransferOrder,
  createTransferOrder,
  findDuplicateTransferOrderProducts,
  generateTransferOrderNo,
  loadTransferOrderById,
  sumTransferOrderActualInQty,
  sumTransferOrderActualOutQty,
  sumTransferOrderInTransitQty,
  sumTransferOrderQty,
  updateTransferOrder,
  validateTransferOrderForSave,
  validateTransferOrderForSubmit,
} from '../lib/transferOrderLogic.js';

/**
 * 分步式调拨单新增/编辑页（F02、F03）。
 * 单据信息 6 列栅格 + 提示行；明细用 transfer-order variant，新增页隐藏回写列（《新增编辑页 Demo PRD》§3.2.2）。
 * 保存停留本页（草稿可再次保存同一张单），提交走确认弹窗后回列表。
 */

const warehouseOptions = getInventoryLogicalWarehouseOptions({ includeDisabled: false, includeTransit: false });

function getInitialForm(mode, context) {
  const source = mode === 'edit' ? getEditableTransferOrder(context?.row) : defaultTransferOrderForm;
  return { ...source, lines: source.lines.map((line) => ({ ...line })) };
}

function createTransferOrderLine() {
  return {
    id: `transfer-order-line-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    lineNo: 1,
    product: '',
    productCode: '',
    productName: '',
    unit: '',
    quantity: 1,
  };
}

function createTransferOrderLineFromSku(sku, template) {
  const sameSku = template?.product === sku?.value;
  return {
    ...createTransferOrderLine(),
    product: sku?.value || '',
    productCode: sku?.skuCode || '',
    productName: sku?.productName || '',
    unit: sku?.unit && sku.unit !== '-' ? sku.unit : (template?.unit || ''),
    quantity: sameSku ? template.quantity : 1,
  };
}

function prepareTransferOrderForm(form) {
  if (form.orderNo && form.orderNo !== '保存后自动生成') return form;
  return { ...form, orderNo: generateTransferOrderNo() };
}

export function TransferOrderFormPage({ mode = 'create', context, onFeedback, onOpenPage }) {
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
    validate: validateTransferOrderForSave,
    prepareOnSave: prepareTransferOrderForm,
    navigateOnSave: false,
    onPersist: (nextForm, meta) => {
      const stamp = nowStamp();
      const existing = savedIdRef.current ? loadTransferOrderById(savedIdRef.current) : null;
      const saved = existing
        ? updateTransferOrder(existing, nextForm, { time: stamp })
        : createTransferOrder(nextForm, { time: stamp });
      savedIdRef.current = saved.id;
      if (meta?.shouldSubmit) applySubmitTransferOrder(loadTransferOrderById(saved.id) || saved, { time: stamp });
    },
    onFeedback,
  });

  function handleSave() {
    // 重复商品不合并、仅提示（Q02）；保存与提交都提示一次
    if (findDuplicateTransferOrderProducts(form.lines).length) {
      onFeedback?.('同一商品建议合并为一行', 'info');
    }
    save('草稿已保存');
  }

  function handleSubmitRequest() {
    const submitError = validateTransferOrderForSubmit(form);
    if (submitError) {
      onFeedback?.(submitError.message || '提交失败，请检查填写内容后重试', 'warning');
      return;
    }

    const submit = () => {
      const saved = save('已提交，等待审核', true);
      if (saved) onOpenPage?.('inventory-transfer-order');
    };

    const duplicates = findDuplicateTransferOrderProducts(form.lines);
    if (duplicates.length) {
      setDialog({ type: 'submit', onConfirm: () => { onFeedback?.('同一商品建议合并为一行', 'info'); submit(); } });
      return;
    }
    setDialog({ type: 'submit', onConfirm: submit });
  }

  const notEditable = !isCreate && !canEditTransferOrder(context?.row);

  if (notEditable) {
    return (
      <div className="rounded-erp-section border border-erp-border-card bg-erp-surface-panel p-6 text-[12px] text-erp-text">
        当前状态不可编辑。
        <button type="button" className="ml-2 text-erp-primary" onClick={() => onOpenPage?.('inventory-transfer-order')}>返回列表</button>
      </div>
    );
  }

  const totals = {
    quantity: sumTransferOrderQty(form.lines),
    actualOutQty: sumTransferOrderActualOutQty(form.lines),
    actualInQty: sumTransferOrderActualInQty(form.lines),
    inTransitQty: sumTransferOrderInTransitQty(form.lines),
  };

  const fields = [
    { key: 'orderNo', label: '单号', type: 'disabled', getValue: (current) => current.orderNo },
    { key: 'outWarehouse', label: '调出仓 *', type: 'select', options: warehouseOptions, placeholder: '请选择调出仓' },
    { key: 'inWarehouse', label: '接收仓 *', type: 'select', options: warehouseOptions, placeholder: '请选择接收仓' },
    { key: 'remark', label: '备注', type: 'textarea', className: 'col-span-3', placeholder: '请输入备注', maxLength: 500 },
  ];

  return (
    <>
      <DocumentEditorFrame
        title={isCreate ? '新增分步式调拨单' : `编辑分步式调拨单${form.orderNo && form.orderNo !== '保存后自动生成' ? ` ${form.orderNo}` : ''}`}
        statuses={isCreate ? [] : getTransferOrderStatusBadges(context?.row)}
        dirty={dirty}
        onCancel={() => onOpenPage?.('inventory-transfer-order')}
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
            调出仓与接收仓不能相同，也不能选择虚拟在途仓；审核通过时按计划数量预占调出仓可用库存。
          </p>
        </EditorCard>

        <EditorCard
          title="商品明细"
          actions={(
            <Button variant="outline" size="compact" onClick={() => addLine(createTransferOrderLine)}>
              <Plus className="h-3.5 w-3.5" strokeWidth={1.9} />
              添加明细
            </Button>
          )}
        >
          <LineItemTable
            variant="transfer-order"
            mode="edit"
            lines={form.lines}
            onLineChange={updateLine}
            onLineRemove={removeLine}
            onLineSkusSelect={(lineId, selectedSkus) => replaceLineWithItems(lineId, selectedSkus, createTransferOrderLineFromSku)}
            enableSkuPicker
            editorOptions={transferOrderLineEditorOptions}
            hiddenColumns={isCreate ? ['actualOutQty', 'actualInQty', 'remainingQty', 'inTransitQty'] : []}
            summary={{
              quantity: { label: '计划调拨数量合计', value: totals.quantity },
              ...(isCreate ? {} : {
                actualOutQty: { label: '累计实际调出合计', value: totals.actualOutQty ?? EMPTY_PLACEHOLDER },
                actualInQty: { label: '累计实际调入合计', value: totals.actualInQty ?? EMPTY_PLACEHOLDER },
                inTransitQty: { label: '在途数量合计', value: totals.inTransitQty ?? EMPTY_PLACEHOLDER },
              }),
            }}
          />
        </EditorCard>
      </DocumentEditorFrame>

      <TransferOrderActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={() => setDialog(null)}
        onNotify={onFeedback}
      />
    </>
  );
}

export function TransferOrderCreatePage(props) {
  return <TransferOrderFormPage {...props} mode="create" />;
}

export function TransferOrderEditPage(props) {
  return <TransferOrderFormPage {...props} mode="edit" />;
}
