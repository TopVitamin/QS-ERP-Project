import { useState } from 'react';
import { DocumentFormPage } from '../components/erp/DocumentFormPage.jsx';
import { PurchaseOrderActionDialogs } from '../components/erp/PurchaseOrderActionDialogs.jsx';
import { computeLinesTotals, formatAmount } from '../lib/format.js';
import { currencySymbol } from '../lib/money.js';
import { orders } from '../data/orderData.js';
import { nextDocumentNo } from '../lib/documentNo.js';
import { readMockRows } from '../lib/mockStorage.js';
import {
  computeReceiveStatus,
  findZeroPriceLines,
  normalizeOrderRow,
  ORDER_STORAGE_KEY,
  persistOrder,
  refreshOrderLines,
  sumReceivedQty,
  validateOrderForSubmit,
  validateOrderForSave,
} from '../lib/purchaseOrderLogic.js';
import { currencyOptions } from '../data/masterData.js';
import { getSelectableSupplierOptions } from '../data/supplierData.js';
import { getSelectableLogicalWarehouseOptions } from '../data/warehouseData.js';
import { findCurrentPurchasePrice } from '../lib/priceLogic.js';
import {
  defaultOrderForm,
  getEditableOrder,
  getOrderStatusBadges,
  purchaseLineEditorOptions,
} from '../data/purchaseFormData.js';

function getInitialForm(mode, context) {
  const source = mode === 'edit' ? getEditableOrder(context?.row) : defaultOrderForm;
  return { ...source, lines: source.lines.map((line) => ({ ...line })) };
}

let orderLineSequence = 0;

function createOrderLine() {
  return {
    id: `order-line-${Date.now()}-${orderLineSequence++}`,
    product: '',
    productCode: '',
    productName: '',
    barcode: '',
    unit: '个',
    quantity: 1,
    received: 0,
    notifyQty: 0,
    pushableQty: 0,
    price: '',
    taxRate: '',
  };
}

function createOrderLineFromSku(sku, template, form = {}) {
  const sameSku = template?.product === sku?.value;
  const currentPrice = findCurrentPurchasePrice({ supplier: form.supplier, product: sku?.value, currency: form.currency });
  const line = createOrderLine();
  return {
    ...line,
    product: sku?.value || '',
    productCode: sku?.skuCode || '',
    productName: sku?.productName || '',
    barcode: sku?.barcode || '',
    unit: sku?.unit === '-' ? template?.unit || '个' : sku?.unit || template?.unit || '个',
    quantity: sameSku ? template.quantity : 1,
    price: sameSku && template.price !== '' ? template.price : currentPrice?.price ?? (sameSku ? template.price : ''),
    taxRate: sameSku && template.taxRate !== '' ? template.taxRate : currentPrice?.taxRate ?? (sameSku ? template.taxRate : ''),
  };
}

function clearLinePrices(lines) {
  return lines.map((line) => ({ ...line, price: '', taxRate: '' }));
}

function buildOrderFormFields() {
  // 单据可选项按“审核通过且启用”实时过滤，供应商/逻辑仓取自主数据 Mock（基础资料PRD AC04/AC05）。
  const supplierOptions = getSelectableSupplierOptions();
  return [
  { key: 'orderNo', label: '单号', type: 'disabled', section: 'header' },
  {
    key: 'supplier',
    label: '供应商 *',
    type: 'select',
    options: supplierOptions,
    section: 'header',
    onValueChange: (value, form, onFieldChange) => {
      onFieldChange('supplier', value);
      const defaultCurrency = supplierOptions.find((option) => option.value === value)?.defaultCurrency;
      if (defaultCurrency) onFieldChange('currency', defaultCurrency);
      onFieldChange('lines', clearLinePrices(form.lines));
    },
  },
  {
    key: 'currency',
    label: '币别 *',
    type: 'select',
    options: currencyOptions,
    section: 'header',
    onValueChange: (value, form, onFieldChange) => {
      onFieldChange('currency', value);
      onFieldChange('lines', clearLinePrices(form.lines));
    },
  },
  { key: 'grossAmountTotal', label: '价税合计', type: 'disabled', section: 'header', getValue: (form) => `${currencySymbol(form.currency)} ${formatAmount(computeLinesTotals(form.lines).grossAmount)}` },
  { key: 'taxAmountTotal', label: '税额', type: 'disabled', section: 'header', getValue: (form) => `${currencySymbol(form.currency)} ${formatAmount(computeLinesTotals(form.lines).taxAmount)}` },
  { key: 'netAmountTotal', label: '金额', type: 'disabled', section: 'header', getValue: (form) => `${currencySymbol(form.currency)} ${formatAmount(computeLinesTotals(form.lines).netAmount)}` },
  { key: 'remark', label: '备注', type: 'textarea', className: 'col-span-3', placeholder: '请输入备注', section: 'header' },
  { key: 'warehouse', label: '收货仓库 *', type: 'select', options: getSelectableLogicalWarehouseOptions(), section: 'delivery' },
  { key: 'deliveryDate', label: '承诺交期 *', type: 'date', section: 'delivery' },
  ];
}

function prepareOrderForm(form) {
  if (form.orderNo && form.orderNo !== '保存后自动生成') return form;
  const existingNos = readMockRows(ORDER_STORAGE_KEY, orders).map((row) => row.orderNo);
  return { ...form, orderNo: nextDocumentNo('CGDD', undefined, existingNos) };
}

function toOrderRow(form, { context, shouldSubmit }) {
  const source = context?.row || {};
  const lines = refreshOrderLines(form.lines);
  const totals = computeLinesTotals(lines);
  const base = {
    id: source.id || `order-${Date.now()}`,
    orderNo: form.orderNo,
    supplier: form.supplier,
    warehouse: form.warehouse,
    deliveryDate: form.deliveryDate,
    currency: form.currency,
    remark: form.remark,
    amount: totals.grossAmount,
    taxAmount: totals.taxAmount,
    netAmount: totals.netAmount,
    receivedQty: sumReceivedQty(lines),
    auditStatus: shouldSubmit ? 'pending' : (source.auditStatus || 'draft'),
    businessStatus: source.businessStatus || 'normal',
    receiveStatus: computeReceiveStatus(lines),
    lines,
    creator: source.creator || '当前用户',
    createdAt: source.createdAt || new Date().toISOString().slice(0, 19).replace('T', ' '),
    updater: '当前用户',
    updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
  };
  return normalizeOrderRow(base);
}

function buildOrderFormConfig({ onSubmitRequest }) {
  return {
    listPageId: 'purchase-order',
    storageKey: ORDER_STORAGE_KEY,
    createTitle: '新增采购订单',
    editTitle: '编辑采购订单',
    fieldSections: [
      { key: 'header', title: '单据信息' },
      { key: 'delivery', title: '收货与交期' },
    ],
    lineSectionTitle: '商品明细',
    lineVariant: 'order',
    lineEditorOptions: purchaseLineEditorOptions,
    enableSkuPicker: true,
    formFields: buildOrderFormFields(),
    navigateOnSave: false,
    getStatusBadges: ({ form, mode, context }) => (
      mode === 'edit' ? getOrderStatusBadges(toOrderRow(form, { context, shouldSubmit: false })) : []
    ),
    showSubmit: ({ context }) => !context?.row || (context.row.auditStatus === 'draft' && context.row.businessStatus === 'normal'),
    onSubmitRequest,
    getInitialForm,
    prepareOnSave: prepareOrderForm,
    toListRow: toOrderRow,
    persistRow: (row) => persistOrder(row),
    validate: validateOrderForSave,
    transformOnSubmit: (currentForm) => currentForm,
    createLine: createOrderLine,
    createLineFromSku: createOrderLineFromSku,
    saveMessage: () => '采购订单已保存',
    submitMessage: () => '采购订单已提交',
    saveLabel: '保存',
    submitLabel: '提交',
    addLineLabel: '添加明细',
    summary: { quantityLabel: '采购数量', amountLabel: '价税合计' },
    buildLineSummary: ({ form, currency }) => {
      const totals = computeLinesTotals(form.lines);
      const prefix = `${currencySymbol(currency)} `;
      return {
        quantity: { label: '采购数量', value: totals.quantity },
        grossAmount: { label: '价税合计', value: totals.grossAmount, format: 'amount', prefix, emphasis: true },
        taxAmount: { label: '税额', value: totals.taxAmount, format: 'amount', prefix },
        netAmount: { label: '金额', value: totals.netAmount, format: 'amount', prefix },
      };
    },
  };
}

export function PurchaseOrderCreatePage(props) {
  return <PurchaseOrderFormPage {...props} mode="create" />;
}

export function PurchaseOrderEditPage(props) {
  return <PurchaseOrderFormPage {...props} mode="edit" />;
}

export function PurchaseOrderFormPage({ mode = 'create', onFeedback, ...props }) {
  const [dialog, setDialog] = useState(null);

  function handleSubmitRequest({ form, save, applyValidationResult }) {
    if (!applyValidationResult(validateOrderForSubmit(form))) return;

    const submit = () => {
      save('采购订单已提交', true);
    };

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
    if (result?.followUp === 'mock-notice' && result?.row) {
      setDialog({ type: 'mock-notice', row: result.row });
      return;
    }
    setDialog(null);
  }

  const config = {
    ...buildOrderFormConfig({ onSubmitRequest: handleSubmitRequest }),
    navigateOnSave: mode === 'create',
  };

  return (
    <>
      <DocumentFormPage {...props} mode={mode} onFeedback={onFeedback} config={config} />
      <PurchaseOrderActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
      />
    </>
  );
}
