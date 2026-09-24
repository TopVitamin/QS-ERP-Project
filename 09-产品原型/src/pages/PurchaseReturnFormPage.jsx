import { useState } from 'react';
import { Plus } from 'lucide-react';
import { DocumentEditorFrame, EditorCard } from '../components/erp/DocumentEditorFrame.jsx';
import { FormFields } from '../components/erp/FormControl.jsx';
import { LineItemTable } from '../components/erp/LineItemTable.jsx';
import { Button } from '../components/ui/button.jsx';
import { PurchaseReturnActionDialogs } from '../components/erp/PurchaseReturnActionDialogs.jsx';
import { erpFieldGridClassName } from '../styles/typography.js';
import { useDocumentForm } from '../hooks/useDocumentForm.js';
import { computeLinesTotals, formatAmount } from '../lib/format.js';
import { currencySymbol } from '../lib/money.js';
import { findCurrentPurchasePrice } from '../lib/priceLogic.js';
import { nextDocumentNo } from '../lib/documentNo.js';
import { currencyOptions } from '../data/masterData.js';
import { getSelectableSupplierOptions } from '../data/supplierData.js';
import { getSelectableLogicalWarehouseOptions } from '../data/warehouseData.js';
import {
  buildReturnLinesFromSourceInbound,
  createReturnLineId,
  detachReturnLinesFromSource,
  findZeroPriceLines,
  getSelectableSourceInboundOptions,
  loadAllReturns,
  loadReturnById,
  loadSourceInboundByNo,
  nowStamp,
  persistReturn,
  refreshReturnLines,
  validateReturnForSave,
  validateReturnForSubmit,
} from '../lib/purchaseReturnLogic.js';
import {
  defaultReturnForm,
  getEditableReturn,
  getReturnStatusBadges,
  purchaseReturnLineEditorOptions,
} from '../data/purchaseReturnData.js';

/**
 * 采购退货单新增/编辑页（F02、F03）。
 * 单据信息 6 列栅格、10 字段三行；明细用 purchase-return variant，行内提供「取当前价」（新增编辑页 PRD §3、§5）。
 * 说明：明细需要行内操作与按模式隐藏列，本页用 DocumentEditorFrame + useDocumentForm 渲染，
 * 校验、脏数据、首错聚焦与报错展示仍复用 useDocumentForm（DocumentFormPage 不透传 lineActions/hiddenColumns）。
 */

function getInitialForm(mode, context) {
  const source = mode === 'edit' ? getEditableReturn(context?.row) : defaultReturnForm;
  return { ...source, lines: source.lines.map((line) => ({ ...line })) };
}

function createReturnLine() {
  return {
    id: createReturnLineId(),
    product: '',
    productCode: '',
    productName: '',
    barcode: '',
    unit: '个',
    sourceInboundLineId: '',
    sourceInboundLine: '',
    quantity: 1,
    price: '',
    taxRate: '',
    receivedQty: 0,
    inTransitQty: 0,
  };
}

/** 无来源选品：价格留空待手填或取当前价（新增编辑页 PRD §3.2.3） */
function createReturnLineFromSku(sku, template) {
  const sameSku = template?.product === sku?.value;
  return {
    ...createReturnLine(),
    product: sku?.value || '',
    productCode: sku?.skuCode || '',
    productName: sku?.productName || '',
    barcode: sku?.barcode || '',
    unit: sku?.unit && sku.unit !== '-' ? sku.unit : (template?.unit || '个'),
    quantity: sameSku ? template.quantity : 1,
    price: '',
    taxRate: sameSku ? template.taxRate : '',
  };
}

function prepareReturnForm(form) {
  if (form.returnNo && form.returnNo !== '保存后自动生成') return form;
  const existingNos = loadAllReturns().map((row) => row.returnNo);
  return { ...form, returnNo: nextDocumentNo('CGTH', nowStamp().slice(0, 10), existingNos) };
}

function toReturnRow(form, { context, shouldSubmit }) {
  const source = context?.row || {};
  const lines = refreshReturnLines(form.lines);
  const sourceInbound = loadSourceInboundByNo(form.sourceInboundNo);
  const stamp = nowStamp();

  return {
    ...source,
    id: source.id || `return-${Date.now()}`,
    returnNo: form.returnNo,
    supplier: form.supplier,
    currency: form.currency,
    warehouse: form.warehouse,
    returnDeadline: form.returnDeadline,
    sourceInboundNo: form.sourceInboundNo || '',
    sourceInboundId: sourceInbound?.id || '',
    remark: form.remark,
    auditStatus: shouldSubmit ? 'pending' : (source.auditStatus || 'draft'),
    businessStatus: source.businessStatus || 'normal',
    lines,
    creator: source.creator || '当前用户',
    createdAt: source.createdAt || stamp,
    updater: '当前用户',
    updatedAt: stamp,
    ...(shouldSubmit ? { submittedAt: stamp, submitter: '当前用户' } : {}),
  };
}

export function PurchaseReturnFormPage({ mode = 'create', context, onFeedback, onOpenPage }) {
  const isCreate = mode === 'create';
  const [dialog, setDialog] = useState(null);

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
    applyValidationResult,
  } = useDocumentForm({
    mode,
    context,
    contextId: context?.row?.id || 'create',
    getInitialForm,
    validate: validateReturnForSave,
    prepareOnSave: prepareReturnForm,
    navigateOnSave: isCreate,
    onPersist: (nextForm, meta) => persistReturn(toReturnRow(nextForm, { context, shouldSubmit: meta?.shouldSubmit })),
    onFeedback,
    onNavigate: () => onOpenPage?.('purchase-return'),
  });

  /** 取当前价：按当前采购价目填入含税单价与税率（R04） */
  function handleTakeCurrentPrice(line) {
    if (!line.product) {
      onFeedback?.('请先选择商品', 'warning');
      return;
    }
    const currentPrice = findCurrentPurchasePrice({ supplier: form.supplier, product: line.product, currency: form.currency });
    if (!currentPrice) {
      onFeedback?.('当前采购价目中无该商品价格，请手工填写', 'warning');
      return;
    }
    updateLine(line.id, 'price', currentPrice.price);
    updateLine(line.id, 'taxRate', currentPrice.taxRate ?? '');
  }

  /** 来源联动：带出供应商、币别与明细（新增编辑页 PRD §5）；更换来源按新来源整组重带 */
  function applySourceInbound(inboundRow) {
    updateField('sourceInboundNo', inboundRow?.inboundNo || '');
    updateField('sourceInboundId', inboundRow?.id || '');
    updateField('supplier', inboundRow?.supplier || '');
    updateField('currency', inboundRow?.currency || '人民币');
    updateField('lines', inboundRow ? buildReturnLinesFromSourceInbound(inboundRow) : [createReturnLine()]);
  }

  /** 来源联动：首次带出、更换二次确认、清空转无来源口径（新增编辑页 PRD §5） */
  function handleSourceChange(value) {
    const nextInbound = loadSourceInboundByNo(value);

    if (value && form.sourceInboundId && value !== form.sourceInboundNo) {
      setDialog({ type: 'changeSource', onConfirm: () => applySourceInbound(nextInbound) });
      return;
    }
    if (!value && form.sourceInboundId) {
      setDialog({
        type: 'clearSource',
        onConfirm: () => {
          updateField('sourceInboundNo', '');
          updateField('sourceInboundId', '');
          updateField('supplier', '');
          updateField('currency', '人民币');
          updateField('lines', detachReturnLinesFromSource(form.lines));
        },
      });
      return;
    }
    applySourceInbound(nextInbound);
  }

  function handleSave() {
    save('采购退货单已保存');
  }

  function handleSubmitRequest() {
    if (!applyValidationResult(validateReturnForSubmit(form))) return;

    const submit = () => {
      const saved = save('采购退货单已提交', true);
      if (saved && !isCreate && context?.row?.id) {
        onOpenPage?.('purchase-return-detail', { row: loadReturnById(context.row.id) || context.row });
      }
    };

    const zeroLines = findZeroPriceLines(form);
    if (zeroLines.length) {
      setDialog({
        type: 'zeroPrice',
        description: `第${zeroLines.map(({ index }) => index + 1).join('、')}行含税单价为 0，请确认业务约定。`,
        onConfirm: () => setDialog({ type: 'submit', onConfirm: submit }),
      });
      return;
    }
    setDialog({ type: 'submit', onConfirm: submit });
  }

  function handleDialogComplete(result) {
    if (result?.type === 'zeroPriceConfirmed') {
      result.onConfirm?.();
      return;
    }
    if (result?.message) onFeedback?.(result.message, result.type || 'success');
    setDialog(null);
  }

  const notEditable = !isCreate && !(context?.row && context.row.auditStatus === 'draft' && context.row.businessStatus === 'normal');

  if (notEditable) {
    return (
      <div className="rounded-erp-section border border-erp-border-card bg-erp-surface-panel p-6 text-[12px] text-erp-text">
        当前状态不可编辑。
        <button type="button" className="ml-2 text-erp-primary" onClick={() => onOpenPage?.('purchase-return')}>返回列表</button>
      </div>
    );
  }

  const totals = computeLinesTotals(form.lines);
  const prefix = `${currencySymbol(form.currency)} `;

  return (
    <>
      <DocumentEditorFrame
        title={isCreate ? '新增采购退货单' : `编辑采购退货单${form.returnNo && form.returnNo !== '保存后自动生成' ? ` ${form.returnNo}` : ''}`}
        statuses={isCreate ? [] : getReturnStatusBadges(toReturnRow(form, { context, shouldSubmit: false }))}
        dirty={dirty}
        onCancel={() => onOpenPage?.('purchase-return')}
        onSave={handleSave}
        onSaveAndSubmit={handleSubmitRequest}
        saveLabel="保存"
        submitLabel="提交"
      >
        <EditorCard title="单据信息">
          <div className={erpFieldGridClassName}>
            <FormFields
              fields={[
                { key: 'returnNo', label: '单号', type: 'disabled', getValue: (form) => form.returnNo },
                {
                  key: 'sourceInboundNo',
                  label: '来源采购入库单',
                  type: 'select',
                  placeholder: '请选择来源采购入库单（可选）',
                  options: getSelectableSourceInboundOptions(),
                  onValueChange: (value) => handleSourceChange(value),
                },
                {
                  key: 'supplier',
                  label: '供应商 *',
                  type: 'select',
                  options: getSelectableSupplierOptions(),
                  placeholder: '请选择供应商',
                  disabled: (form) => Boolean(form.sourceInboundId),
                },
                {
                  key: 'currency',
                  label: '币别 *',
                  type: 'select',
                  options: currencyOptions,
                  placeholder: '请选择币别',
                  disabled: (form) => Boolean(form.sourceInboundId),
                },
                { key: 'grossAmountTotal', label: '价税合计', type: 'disabled', getValue: (form) => `${currencySymbol(form.currency)} ${formatAmount(computeLinesTotals(form.lines).grossAmount)}` },
                { key: 'taxAmountTotal', label: '税额', type: 'disabled', getValue: (form) => `${currencySymbol(form.currency)} ${formatAmount(computeLinesTotals(form.lines).taxAmount)}` },
                { key: 'netAmountTotal', label: '金额', type: 'disabled', getValue: (form) => `${currencySymbol(form.currency)} ${formatAmount(computeLinesTotals(form.lines).netAmount)}` },
                { key: 'warehouse', label: '出库仓库 *', type: 'select', options: getSelectableLogicalWarehouseOptions(), placeholder: '请选择出库仓库' },
                { key: 'returnDeadline', label: '退货截止日期 *', type: 'date', placeholder: '请选择日期' },
                { key: 'remark', label: '备注', type: 'textarea', className: 'col-span-3', placeholder: '请输入备注' },
              ]}
              form={form}
              onFieldChange={updateField}
              fieldErrors={fieldErrors}
            />
          </div>
        </EditorCard>

        <EditorCard
          title="商品明细"
          actions={(
            <Button variant="outline" size="compact" onClick={() => addLine(createReturnLine)}>
              <Plus className="h-3.5 w-3.5" strokeWidth={1.9} />
              添加明细
            </Button>
          )}
        >
          <LineItemTable
            variant="purchase-return"
            mode="edit"
            lines={form.lines}
            onLineChange={updateLine}
            onLineRemove={removeLine}
            onLineSkusSelect={(lineId, selectedSkus) => replaceLineWithItems(lineId, selectedSkus, createReturnLineFromSku)}
            enableSkuPicker
            editorOptions={purchaseReturnLineEditorOptions}
            hiddenColumns={isCreate ? ['receivedQty'] : []}
            lineActions={[{ id: 'currentPrice', label: '取当前价', onClick: handleTakeCurrentPrice }]}
            summary={{
              quantity: { label: '退货数量', value: totals.quantity },
              grossAmount: { label: '价税合计', value: totals.grossAmount, format: 'amount', prefix, emphasis: true },
              taxAmount: { label: '税额', value: totals.taxAmount, format: 'amount', prefix },
              netAmount: { label: '金额', value: totals.netAmount, format: 'amount', prefix },
            }}
          />
        </EditorCard>
      </DocumentEditorFrame>

      <PurchaseReturnActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={onFeedback}
      />
    </>
  );
}

export function PurchaseReturnCreatePage(props) {
  return <PurchaseReturnFormPage {...props} mode="create" />;
}

export function PurchaseReturnEditPage(props) {
  return <PurchaseReturnFormPage {...props} mode="edit" />;
}
