import { useMemo, useRef, useState } from 'react';
import { DocumentFormPage } from '../components/erp/DocumentFormPage.jsx';
import { ReturnSourceDocumentPickerDialog } from '../components/erp/ReturnSourceDocumentPickerDialog.jsx';
import { SalesReturnActionDialogs } from '../components/erp/SalesReturnActionDialogs.jsx';
import { SimpleDialog } from '../components/ui/dialog.jsx';
import { Button } from '../components/ui/button.jsx';
import { currencyOptions, logicalWarehouseOptions } from '../data/masterData.js';
import { getCustomerLevel, getSelectableCustomerOptions } from '../data/customerData.js';
import { computeLinesTotals, formatAmount } from '../lib/format.js';
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

function buildSalesReturnFormFields({ onSourceChange, onSourcePick, captureForm }) {
  const customerSelectOptions = getSelectableCustomerOptions();
  return [
    { key: 'returnNo', label: '单号', type: 'disabled', section: 'header', getValue: (form) => form.returnNo || '保存后自动生成' },
    {
      key: 'sourceOutboundNo',
      label: '来源销售出库单',
      type: 'document-picker',
      placeholder: '请选择销售出库单（可选）',
      section: 'header',
      visible: (form) => {
        captureForm(form);
        return true;
      },
      onPick: onSourcePick,
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
  const candidates = useMemo(
    () => buildSourceOutboundCandidates(readMockRows(SALES_RETURN_STORAGE_KEY, salesReturns)),
    [sourceDialog, pickerKey],
  );

  function captureForm(form) {
    formRef.current = form;
  }

  function openSourcePicker(outboundNo, step = 'list') {
    const outbound = candidates.find((item) => item.outboundNo === outboundNo);
    setSourceDialog({ mode: 'pick', step, documentId: outbound?.id || '' });
  }

  function handleSourceFieldChange(value, form, onFieldChange) {
    updateFieldRef.current = onFieldChange;
    formRef.current = form;
    const current = form.sourceOutboundId || '';
    if (!value) {
      if (!current) return;
      setSourceDialog({ mode: 'confirm-clear' });
    }
  }

  function handleSourcePick() {
    const form = formRef.current;
    if (!form) return;
    if (form.sourceOutboundNo) {
      openSourcePicker(form.sourceOutboundNo, 'detail');
      return;
    }
    setSourceDialog({ mode: 'pick', step: 'list', documentId: '' });
  }

  function requestApplySourceOutbound(outbound) {
    const current = formRef.current?.sourceOutboundId;
    if (current && current !== outbound.id) {
      setSourceDialog({ mode: 'confirm-change', document: outbound });
      return;
    }
    applySourceOutbound(outbound);
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
    captureForm,
    onSourcePick: handleSourcePick,
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
        <ReturnSourceDocumentPickerDialog
          title="选择来源销售出库单"
          listDescription="第一步：筛选并选择已审核的销售出库单。"
          detailDescriptionPrefix="第二步：查看"
          quotaHint="剩余可退额度 = 原实际出库数量 − 其他已审核退货已占用数量。"
          partnerLabel="客户"
          partnerOptions={getSelectableCustomerOptions()}
          warehouseOptions={logicalWarehouseOptions}
          warehouseLabel="出库仓库"
          candidates={candidates}
          state={sourceDialog}
          getDocumentNo={(row) => row.outboundNo}
          getPartner={(row) => row.customer}
          getWarehouse={(row) => row.warehouse}
          getBusinessDate={(row) => row.businessDate}
          getAmount={(row) => row.amount}
          onCancel={() => setSourceDialog(null)}
          onSelect={(outbound, nextState) => setSourceDialog({
            mode: 'pick',
            step: nextState?.step || 'detail',
            documentId: outbound.id,
          })}
          onConfirm={requestApplySourceOutbound}
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
                onClick={() => applySourceOutbound(sourceDialog.document)}
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
