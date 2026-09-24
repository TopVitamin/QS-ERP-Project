import { useMemo, useRef, useState } from 'react';
import { DocumentFormPage } from '../components/erp/DocumentFormPage.jsx';
import { SalesReturnActionDialogs } from '../components/erp/SalesReturnActionDialogs.jsx';
import { SimpleDialog } from '../components/ui/dialog.jsx';
import { Button } from '../components/ui/button.jsx';
import { currencyOptions, logicalWarehouseOptions } from '../data/masterData.js';
import { getCustomerLevel, getSelectableCustomerOptions } from '../data/customerData.js';
import { computeLinesTotals, EMPTY_PLACEHOLDER, formatAmount } from '../lib/format.js';
import { currencySymbol } from '../lib/money.js';
import { nextDocumentNo } from '../lib/documentNo.js';
import { findCurrentSalesPrice, getProductDefaultTaxRate } from '../lib/priceLogic.js';
import { readMockRows } from '../lib/mockStorage.js';
import {
  buildSourceOutboundCandidates,
  defaultSalesReturnForm,
  getEditableSalesReturn,
  getSalesReturnStatusBadges,
  salesReturnLineEditorOptions,
  salesReturns,
} from '../data/salesReturnData.js';
import {
  findZeroPriceLines,
  nowStamp,
  persistSalesReturn,
  refreshSalesReturnLines,
  SALES_RETURN_STORAGE_KEY,
  validateSalesReturnForSave,
  validateSalesReturnForSubmit,
} from '../lib/salesReturnLogic.js';

const sourceTableClassName = 'w-full table-fixed border-collapse text-left text-[12px]';
const sourceHeadClassName = 'h-7 border-b border-erp-border-table-header bg-erp-surface-table-head text-erp-text-section';
const sourceThClassName = 'border-r border-erp-border-table-column px-2 font-normal last:border-r-0';
const sourceRowClassName = 'h-8 border-b border-erp-border-table-row last:border-b-0';
const sourceTdClassName = 'border-r border-erp-border-table-column px-2 align-middle last:border-r-0';

let returnLineSequence = 0;

function createReturnLine() {
  return {
    id: `sales-return-line-${Date.now()}-${returnLineSequence++}`,
    sourceOutboundLineId: '',
    sourceOutboundLine: '',
    product: '',
    productCode: '',
    productName: '',
    barcode: '',
    unit: '个',
    quantity: 1,
    price: '',
    taxRate: '',
    returnedQty: 0,
    inTransitQty: 0,
  };
}

function createLineFromSku(sku, template, form = {}) {
  const sameSku = template?.product === sku?.value;
  const currentPrice = findCurrentSalesPrice({
    customer: form.customer,
    customerLevel: getCustomerLevel(form.customer),
    product: sku?.value,
    currency: form.currency,
  });
  return {
    ...createReturnLine(),
    product: sku?.value || '',
    productCode: sku?.skuCode || '',
    productName: sku?.productName || '',
    barcode: sku?.barcode || '',
    unit: sku?.unit === '-' ? template?.unit || '个' : sku?.unit || template?.unit || '个',
    quantity: sameSku ? template.quantity : 1,
    price: sameSku && template.price !== '' ? template.price : currentPrice?.price ?? (sameSku ? template.price : ''),
    taxRate: sameSku && template.taxRate !== ''
      ? template.taxRate
      : currentPrice?.taxRate || getProductDefaultTaxRate(sku?.value) || (sameSku ? template.taxRate : ''),
  };
}

/** 溯源带出行：数量默认取该行剩余可退额度，价格与税率沿原出库单（R04、R06） */
function createLineFromOutbound(outbound, line, index) {
  return {
    ...createReturnLine(),
    sourceOutboundLineId: line.id,
    sourceOutboundLine: `${outbound.outboundNo} 行${index + 1}`,
    product: line.product,
    productCode: line.productCode || '',
    productName: line.productName || '',
    barcode: line.barcode || '',
    unit: line.unit || '个',
    quantity: line.remainingQuota,
    price: line.price,
    taxRate: line.taxRate ?? '',
    returnedQty: 0,
    inTransitQty: 0,
  };
}

/** 改客户或改币别时清空无来源明细价格（R03）；溯源行价格由原出库单带出，不受影响 */
function clearFreeLinePrices(lines) {
  return (lines || []).map((line) => (
    line.sourceOutboundLineId ? line : { ...line, price: '' }
  ));
}

function getInitialForm(mode, context) {
  const source = mode === 'edit' ? getEditableSalesReturn(context?.row) : defaultSalesReturnForm;
  return { ...source, lines: source.lines.map((line) => ({ ...line })) };
}

function prepareReturnForm(form) {
  const next = { ...form };
  if (!next.id) next.id = `sales-return-${Date.now()}`;
  if (!next.returnNo || next.returnNo === '保存后自动生成') {
    const existingNos = readMockRows(SALES_RETURN_STORAGE_KEY, salesReturns).map((row) => row.returnNo);
    next.returnNo = nextDocumentNo('XSTH', new Date().toISOString().slice(0, 10), existingNos);
  }
  return next;
}

function toReturnRow(form, { context, shouldSubmit } = {}) {
  const source = context?.row || {};
  const stamp = nowStamp();
  const lines = refreshSalesReturnLines(form.lines);
  const totals = computeLinesTotals(lines);
  const next = {
    ...source,
    id: source.id || form.id || `sales-return-${Date.now()}`,
    returnNo: form.returnNo,
    customer: form.customer,
    currency: form.currency,
    warehouse: form.warehouse,
    returnDeadline: form.returnDeadline,
    sourceOutboundId: form.sourceOutboundId || '',
    sourceOutboundNo: form.sourceOutboundNo || '',
    remark: form.remark || '',
    amount: totals.grossAmount,
    taxAmount: totals.taxAmount,
    netAmount: totals.netAmount,
    auditStatus: shouldSubmit ? 'pending' : (source.auditStatus || 'draft'),
    businessStatus: source.businessStatus || 'normal',
    lines,
    creator: source.creator || '当前用户',
    createdAt: source.createdAt || stamp,
    updater: '当前用户',
    updatedAt: stamp,
  };
  if (shouldSubmit) {
    next.submittedAt = stamp;
    next.submitter = '当前用户';
  }
  return next;
}

function buildSalesReturnFormFields({ onSourceChange, candidates, captureForm }) {
  const customerSelectOptions = getSelectableCustomerOptions();
  return [
    { key: 'returnNo', label: '单号', type: 'disabled', section: 'header', getValue: (form) => form.returnNo || '保存后自动生成' },
    {
      key: 'sourceOutboundNo',
      label: '来源销售出库单',
      type: 'select',
      placeholder: '请选择销售出库单（可选）',
      options: candidates.map((outbound) => ({ value: outbound.outboundNo, label: outbound.outboundNo })),
      section: 'header',
      visible: (form) => {
        captureForm(form);
        return true;
      },
      onValueChange: (value, form, onFieldChange) => onSourceChange(value, form, onFieldChange),
    },
    {
      key: 'customer',
      label: '客户 *',
      type: 'select',
      options: customerSelectOptions,
      section: 'header',
      disabled: (form) => Boolean(form.sourceOutboundId),
      onValueChange: (value, form, onFieldChange) => {
        onFieldChange('customer', value);
        const defaultCurrency = customerSelectOptions.find((option) => option.value === value)?.defaultCurrency;
        if (defaultCurrency) onFieldChange('currency', defaultCurrency);
        onFieldChange('lines', clearFreeLinePrices(form.lines));
      },
    },
    {
      key: 'currency',
      label: '币别 *',
      type: 'select',
      options: currencyOptions,
      section: 'header',
      disabled: (form) => Boolean(form.sourceOutboundId),
      onValueChange: (value, form, onFieldChange) => {
        onFieldChange('currency', value);
        onFieldChange('lines', clearFreeLinePrices(form.lines));
      },
    },
    { key: 'grossAmountTotal', label: '价税合计', type: 'disabled', section: 'header', getValue: (form) => `${currencySymbol(form.currency)} ${formatAmount(computeLinesTotals(form.lines).grossAmount)}` },
    { key: 'taxAmountTotal', label: '税额', type: 'disabled', section: 'header', getValue: (form) => `${currencySymbol(form.currency)} ${formatAmount(computeLinesTotals(form.lines).taxAmount)}` },
    { key: 'netAmountTotal', label: '金额', type: 'disabled', section: 'header', getValue: (form) => `${currencySymbol(form.currency)} ${formatAmount(computeLinesTotals(form.lines).netAmount)}` },
    {
      key: 'warehouse',
      label: '收货仓库 *',
      type: 'select',
      options: logicalWarehouseOptions,
      section: 'header',
      disabled: (form) => Boolean(form.sourceOutboundId),
    },
    {
      key: 'returnDeadline',
      label: '退货截止日期 *',
      type: 'date',
      placeholder: '请选择日期',
      section: 'header',
    },
    { key: 'remark', label: '备注', type: 'textarea', className: 'col-span-3', placeholder: '请输入备注', section: 'header' },
  ];
}

function buildReturnFormConfig({ onSubmitRequest, formFields }) {
  return {
    listPageId: 'sales-return',
    storageKey: SALES_RETURN_STORAGE_KEY,
    createTitle: '新增销售退货单',
    editTitle: '编辑销售退货单',
    fieldSections: [{ key: 'header', title: '单据信息' }],
    lineSectionTitle: '商品明细',
    lineVariant: 'sales-return',
    lineEditorOptions: salesReturnLineEditorOptions,
    enableSkuPicker: true,
    hiddenColumns: ({ mode }) => (mode === 'create' ? ['returnedQty'] : []),
    formFields,
    navigateOnSave: false,
    getStatusBadges: ({ form, mode, context }) => (
      mode === 'edit' ? getSalesReturnStatusBadges(toReturnRow(form, { context })) : []
    ),
    showSubmit: ({ context }) => !context?.row || (context.row.auditStatus === 'draft' && context.row.businessStatus === 'normal'),
    onSubmitRequest,
    getInitialForm,
    prepareOnSave: prepareReturnForm,
    toListRow: toReturnRow,
    persistRow: (row) => persistSalesReturn(row),
    validate: validateSalesReturnForSave,
    transformOnSubmit: (currentForm) => currentForm,
    createLine: createReturnLine,
    createLineFromSku,
    saveMessage: () => '销售退货单已保存',
    submitMessage: () => '销售退货单已提交',
    saveLabel: '保存',
    submitLabel: '提交',
    addLineLabel: '添加明细',
    summary: { quantityLabel: '退货数量', amountLabel: '价税合计' },
    buildLineSummary: ({ form, currency }) => {
      const totals = computeLinesTotals(form.lines);
      const prefix = `${currencySymbol(currency)} `;
      return {
        quantity: { label: '退货数量', value: totals.quantity },
        grossAmount: { label: '价税合计', value: totals.grossAmount, format: 'amount', prefix, emphasis: true },
        taxAmount: { label: '税额', value: totals.taxAmount, format: 'amount', prefix },
        netAmount: { label: '金额', value: totals.netAmount, format: 'amount', prefix },
      };
    },
  };
}

/** 选择来源销售出库单：候选单列表 → 明细与剩余可退额度 → 确认带出（Q09） */
function SourceOutboundPickerDialog({ state, candidates, onCancel, onSelect, onConfirm, onFeedback }) {
  const outbound = candidates.find((item) => item.id === state.outboundId) || null;
  const step = state.step === 'detail' && outbound ? 'detail' : 'list';

  return (
    <SimpleDialog
      open
      onOpenChange={(open) => { if (!open) onCancel?.(); }}
      size="xl"
      title="选择来源销售出库单"
      description={step === 'list'
        ? '第一步：选择已审核的销售出库单。'
        : `第二步：查看 ${outbound.outboundNo} 明细与剩余可退额度，确认后带出商品、数量、价格、税率与来源出库单行，收货仓库同步锁定。`}
      footer={step === 'list' ? (
        <Button variant="outline" size="compact" onClick={onCancel}>取消</Button>
      ) : (
        <>
          <Button variant="outline" size="compact" className="mr-auto" onClick={() => onSelect?.(outbound, { step: 'list' })}>
            返回候选单
          </Button>
          <Button variant="outline" size="compact" onClick={onCancel}>取消</Button>
          <Button variant="primary" size="compact" onClick={() => onConfirm?.(outbound)}>确认带出</Button>
        </>
      )}
    >
      <div className="mt-3 space-y-3">
        <div className="overflow-hidden rounded border border-erp-border-table-row">
          <div className="table-scroll overflow-x-auto">
            {step === 'list' ? (
              <table className={sourceTableClassName} style={{ minWidth: '760px' }}>
                <colgroup>
                  <col className="w-[200px]" />
                  <col className="w-[180px]" />
                  <col className="w-[120px]" />
                  <col className="w-[140px]" />
                  <col className="w-[100px]" />
                </colgroup>
                <thead className={sourceHeadClassName}>
                  <tr>
                    <th className={sourceThClassName}>单号</th>
                    <th className={sourceThClassName}>出库仓库</th>
                    <th className={sourceThClassName}>业务日期</th>
                    <th className={`${sourceThClassName} text-right`}>价税合计</th>
                    <th className={sourceThClassName} />
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((item) => (
                    <tr key={item.id} className={sourceRowClassName}>
                      <td className={sourceTdClassName}>{item.outboundNo}</td>
                      <td className={sourceTdClassName}>{item.warehouse || EMPTY_PLACEHOLDER}</td>
                      <td className={sourceTdClassName}>{item.businessDate || EMPTY_PLACEHOLDER}</td>
                      <td className={`${sourceTdClassName} text-right`}>{formatAmount(item.amount ?? 0)}</td>
                      <td className={`${sourceTdClassName} text-center`}>
                        <button
                          type="button"
                          className="px-1 text-erp-primary hover:underline"
                          onClick={() => onSelect?.(item, { step: 'detail' })}
                        >
                          选择
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!candidates.length && (
                    <tr>
                      <td colSpan="5" className="h-24 text-center text-[12px] text-erp-text-muted">暂无可选的已审核销售出库单</td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className={sourceTableClassName} style={{ minWidth: '760px' }}>
                <colgroup>
                  <col className="w-[140px]" />
                  <col className="w-[200px]" />
                  <col className="w-[130px]" />
                  <col className="w-[150px]" />
                </colgroup>
                <thead className={sourceHeadClassName}>
                  <tr>
                    <th className={sourceThClassName}>商品编码</th>
                    <th className={sourceThClassName}>商品名称</th>
                    <th className={`${sourceThClassName} text-right`}>实际出库数量</th>
                    <th className={`${sourceThClassName} text-right`}>剩余可退额度</th>
                  </tr>
                </thead>
                <tbody>
                  {outbound.lines.map((line) => (
                    <tr key={line.id} className={sourceRowClassName}>
                      <td className={sourceTdClassName}>{line.productCode || EMPTY_PLACEHOLDER}</td>
                      <td className={sourceTdClassName}>{line.productName || EMPTY_PLACEHOLDER}</td>
                      <td className={`${sourceTdClassName} text-right`}>{line.quantity ?? 0}</td>
                      <td className={`${sourceTdClassName} text-right ${line.remainingQuota > 0 ? '' : 'text-erp-text-muted'}`}>
                        {line.remainingQuota}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <p className="text-[12px] text-erp-text-muted">剩余可退额度 = 原实际出库数量 − 其他已审核退货已占用数量。</p>
      </div>
    </SimpleDialog>
  );
}

export function SalesReturnCreatePage(props) {
  return <SalesReturnFormPage {...props} mode="create" />;
}

export function SalesReturnEditPage(props) {
  return <SalesReturnFormPage {...props} mode="edit" />;
}

export function SalesReturnFormPage({ mode = 'create', onFeedback, ...props }) {
  const [dialog, setDialog] = useState(null);
  const [sourceDialog, setSourceDialog] = useState(null);
  const [pickerKey, setPickerKey] = useState(0);
  const formRef = useRef(null);
  const updateFieldRef = useRef(null);
  const candidates = useMemo(() => buildSourceOutboundCandidates(), [sourceDialog, pickerKey]);

  function captureForm(form) {
    formRef.current = form;
  }

  function openSourcePicker(outboundNo, step = 'list') {
    const outbound = candidates.find((item) => item.outboundNo === outboundNo);
    setSourceDialog({ mode: 'pick', step, outboundId: outbound?.id || '' });
  }

  function handleSourceFieldChange(value, form, onFieldChange) {
    updateFieldRef.current = onFieldChange;
    formRef.current = form;
    const current = form.sourceOutboundId || '';
    if (!value) {
      if (!current) return;
      setSourceDialog({ mode: 'confirm-clear' });
      return;
    }
    if (value === form.sourceOutboundNo) {
      openSourcePicker(value, 'detail');
      return;
    }
    if (current) {
      setSourceDialog({ mode: 'confirm-change', outboundNo: value });
      return;
    }
    openSourcePicker(value);
  }

  function applySourceOutbound(outbound) {
    const updateField = updateFieldRef.current;
    if (!updateField) return;
    const availableLines = outbound.lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => Number(line.remainingQuota || 0) > 0);
    if (!availableLines.length) {
      onFeedback?.('退货数量不能超过该行剩余可退额度', 'warning');
      return;
    }
    updateField('sourceOutboundId', outbound.id);
    updateField('sourceOutboundNo', outbound.outboundNo);
    updateField('customer', outbound.customer || '');
    updateField('currency', outbound.currency || '人民币');
    updateField('warehouse', outbound.warehouse);
    updateField('lines', availableLines.map(({ line, index }) => createLineFromOutbound(outbound, line, index)));
    if (availableLines.length < outbound.lines.length) {
      onFeedback?.('部分明细剩余可退额度为 0，未带入', 'info');
    }
    setSourceDialog(null);
    setPickerKey((current) => current + 1);
  }

  function clearSource() {
    const updateField = updateFieldRef.current;
    if (!updateField) return;
    updateField('sourceOutboundId', '');
    updateField('sourceOutboundNo', '');
    updateField('customer', '');
    updateField('currency', '人民币');
    updateField('warehouse', '');
    updateField('lines', (formRef.current?.lines || []).map((line) => ({
      ...line,
      sourceOutboundLineId: '',
      sourceOutboundLine: '',
    })));
    setSourceDialog(null);
    setPickerKey((current) => current + 1);
  }

  function handleSubmitRequest({ form, save, applyValidationResult }) {
    if (!applyValidationResult(validateSalesReturnForSubmit(form, { excludeReturnId: form.id }))) return;

    const submit = () => save('销售退货单已提交', true);
    const zeroLines = findZeroPriceLines(form);
    if (zeroLines.length) {
      setDialog({
        type: 'zeroPrice',
        form,
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

  const formFields = () => buildSalesReturnFormFields({
    candidates,
    captureForm,
    onSourceChange: (value, form, onFieldChange) => handleSourceFieldChange(value, form, onFieldChange),
  });

  const config = {
    ...buildReturnFormConfig({ onSubmitRequest: handleSubmitRequest, formFields }),
    // 保存后停留本页（新增首次保存生成单号，编辑刷新本页数据）
    navigateOnSave: false,
  };

  return (
    <>
      <DocumentFormPage {...props} mode={mode} onFeedback={onFeedback} config={config} />
      {sourceDialog?.mode === 'pick' && (
        <SourceOutboundPickerDialog
          state={sourceDialog}
          candidates={candidates}
          onFeedback={onFeedback}
          onCancel={() => setSourceDialog(null)}
          onSelect={(outbound, nextState) => setSourceDialog({ mode: 'pick', step: nextState?.step || 'detail', outboundId: outbound.id })}
          onConfirm={applySourceOutbound}
        />
      )}
      {sourceDialog?.mode === 'confirm-change' && (
        <SimpleDialog
          open
          onOpenChange={(open) => { if (!open) setSourceDialog(null); }}
          title="更换来源销售出库单？"
          description="更换后将按新来源重新带出客户、币别、商品明细、数量、价格与税率，收货仓库同步锁定为原出库单仓库，原带出内容全部清空。"
          footer={(
            <>
              <Button variant="outline" size="compact" onClick={() => setSourceDialog(null)}>取消</Button>
              <Button
                variant="primary"
                size="compact"
                onClick={() => openSourcePicker(sourceDialog.outboundNo)}
              >
                确认更换
              </Button>
            </>
          )}
        />
      )}
      {sourceDialog?.mode === 'confirm-clear' && (
        <SimpleDialog
          open
          onOpenChange={(open) => { if (!open) setSourceDialog(null); }}
          title="取消来源关联？"
          description="取消后清空带出的客户、币别与收货仓库，收货仓库恢复为可选；现有明细保留、来源出库单行清空，并按无来源口径校验。"
          footer={(
            <>
              <Button variant="outline" size="compact" onClick={() => setSourceDialog(null)}>取消</Button>
              <Button variant="primary" size="compact" onClick={clearSource}>确认取消来源</Button>
            </>
          )}
        />
      )}
      <SalesReturnActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={onFeedback}
      />
    </>
  );
}
