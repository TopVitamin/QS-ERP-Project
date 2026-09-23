import { useState } from 'react';
import { DocumentFormPage } from '../components/erp/DocumentFormPage.jsx';
import { SalesOrderActionDialogs } from '../components/erp/SalesOrderActionDialogs.jsx';
import { computeLinesTotals, formatAmount } from '../lib/format.js';
import {
  addressRecordToCnAddress,
  createEmptyCnAddress,
  getCustomerAddressOptions,
  getDefaultCustomerAddress,
} from '../lib/cnAddress.js';
import { currencySymbol } from '../lib/money.js';
import { shipMethodLabels } from '../lib/salesDeliveryNoticeLogic.js';
import { salesOrders } from '../data/salesOrderData.js';
import { nextDocumentNo } from '../lib/documentNo.js';
import { readMockRows } from '../lib/mockStorage.js';
import {
  computeShipStatus,
  findZeroPriceLines,
  normalizeOrderRow,
  SALES_ORDER_STORAGE_KEY,
  persistOrder,
  refreshOrderLines,
  sumShippedQty,
  validateOrderForSubmit,
  validateOrderForSave,
} from '../lib/salesOrderLogic.js';
import { currencyOptions } from '../data/masterData.js';
import { getSelectableCustomerOptions } from '../data/customerData.js';
import { getSelectableLogicalWarehouseOptions } from '../data/warehouseData.js';
import { getSelectableLogisticsProductOptions } from '../data/logisticsData.js';
import { toSelectOptions } from '../lib/options.js';
import {
  defaultSalesOrderForm,
  getEditableSalesOrder,
  getSalesOrderStatusBadges,
  salesLineEditorOptions,
} from '../data/salesFormData.js';

function getInitialForm(mode, context) {
  const source = mode === 'edit' ? getEditableSalesOrder(context?.row) : defaultSalesOrderForm;
  return { ...source, lines: source.lines.map((line) => ({ ...line })) };
}

let orderLineSequence = 0;

function createOrderLine() {
  return {
    id: `sales-line-${Date.now()}-${orderLineSequence++}`,
    product: '',
    productCode: '',
    productName: '',
    barcode: '',
    unit: '个',
    quantity: 1,
    shipped: 0,
    notifyQty: 0,
    pushableQty: 0,
    price: 0,
    taxRate: '13',
  };
}

function createOrderLineFromSku(sku, template) {
  const sameSku = template?.product === sku?.value;
  const line = createOrderLine();
  return {
    ...line,
    product: sku?.value || '',
    productCode: sku?.skuCode || '',
    productName: sku?.productName || '',
    barcode: sku?.barcode || '',
    unit: sku?.unit === '-' ? template?.unit || '个' : sku?.unit || template?.unit || '个',
    quantity: sameSku ? template.quantity : 1,
    price: sameSku ? template.price : sku?.referencePrice ?? 0,
    taxRate: sameSku ? template.taxRate : '13',
  };
}

function clearLinePrices(lines) {
  return lines.map((line) => ({ ...line, price: 0, taxRate: '13' }));
}

function buildSalesOrderFormFields() {
  // 单据可选项按“审核通过且启用/启用中”实时过滤，取自主数据 Mock（基础资料PRD AC04/AC05）。
  const customerOptions = getSelectableCustomerOptions();
  return [
  { key: 'orderNo', label: '单号', type: 'disabled', section: 'header' },
  { key: 'date', label: '单据日期 *', type: 'date', section: 'header' },
  {
    key: 'customer',
    label: '客户 *',
    type: 'select',
    options: customerOptions,
    section: 'header',
    onValueChange: (value, form, onFieldChange) => {
      onFieldChange('customer', value);
      const defaultCurrency = customerOptions.find((option) => option.value === value)?.defaultCurrency;
      if (defaultCurrency) onFieldChange('currency', defaultCurrency);
      onFieldChange('lines', clearLinePrices(form.lines));
      const defaultAddress = getDefaultCustomerAddress(value);
      onFieldChange('deliveryAddress', addressRecordToCnAddress(defaultAddress));
      onFieldChange('shipMethod', 'logistics');
      onFieldChange('logisticsProduct', defaultAddress ? 'LSP000001' : '');
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
  { key: 'warehouse', label: '发货仓库 *', type: 'select', options: getSelectableLogicalWarehouseOptions(), section: 'delivery' },
  { key: 'deliveryDate', label: '交期 *', type: 'date', section: 'delivery' },
  {
    key: 'shipMethod',
    label: '发货方式 *',
    type: 'select',
    options: toSelectOptions(shipMethodLabels),
    section: 'delivery',
    onValueChange: (value, form, onFieldChange) => {
      onFieldChange('shipMethod', value);
      if (value === 'pickup') {
        onFieldChange('deliveryAddress', createEmptyCnAddress());
        onFieldChange('logisticsProduct', '');
        return;
      }
      if (!form.deliveryAddress?.provinceCode && form.customer) {
        onFieldChange('deliveryAddress', addressRecordToCnAddress(getDefaultCustomerAddress(form.customer)));
      }
      if (!form.logisticsProduct) onFieldChange('logisticsProduct', 'LSP000001');
    },
  },
  {
    key: 'logisticsProduct',
    label: '物流服务产品 *',
    type: 'select',
    options: getSelectableLogisticsProductOptions(),
    section: 'delivery',
    visible: (form) => form.shipMethod !== 'pickup',
  },
  {
    key: 'deliveryAddress',
    label: '省/市/区 *',
    type: 'cn-address',
    section: 'delivery',
    savedAddressOptions: (form) => getCustomerAddressOptions(form.customer),
    visible: (form) => form.shipMethod !== 'pickup',
  },
  ];
}

function prepareOrderForm(form) {
  if (form.orderNo && form.orderNo !== '保存后自动生成') return form;
  const existingNos = readMockRows(SALES_ORDER_STORAGE_KEY, salesOrders).map((row) => row.orderNo);
  return { ...form, orderNo: nextDocumentNo('XSDD', form.date, existingNos) };
}

function toOrderRow(form, { context, shouldSubmit }) {
  const source = context?.row || {};
  const lines = refreshOrderLines(form.lines);
  const totals = computeLinesTotals(lines);
  const base = {
    id: source.id || `sales-order-${Date.now()}`,
    orderNo: form.orderNo,
    date: form.date,
    customer: form.customer,
    warehouse: form.warehouse,
    deliveryDate: form.deliveryDate,
    shipMethod: form.shipMethod || 'logistics',
    deliveryAddress: form.deliveryAddress,
    logisticsProduct: form.logisticsProduct || '',
    currency: form.currency,
    remark: form.remark,
    amount: totals.grossAmount,
    taxAmount: totals.taxAmount,
    netAmount: totals.netAmount,
    shippedQty: sumShippedQty(lines),
    auditStatus: shouldSubmit ? 'pending' : (source.auditStatus || 'draft'),
    businessStatus: source.businessStatus || 'normal',
    shipStatus: computeShipStatus(lines),
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
    listPageId: 'sales-order',
    storageKey: SALES_ORDER_STORAGE_KEY,
    createTitle: '新增销售订单',
    editTitle: '编辑销售订单',
    fieldSections: [
      { key: 'header', title: '单据信息' },
      { key: 'delivery', title: '发货与交期' },
    ],
    lineSectionTitle: '商品明细',
    lineVariant: 'sales-order',
    lineEditorOptions: salesLineEditorOptions,
    enableSkuPicker: true,
    formFields: buildSalesOrderFormFields(),
    navigateOnSave: false,
    getStatusBadges: ({ form, mode, context }) => (
      mode === 'edit' ? getSalesOrderStatusBadges(toOrderRow(form, { context, shouldSubmit: false })) : []
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
    saveMessage: () => '销售订单已保存',
    submitMessage: () => '销售订单已提交',
    saveLabel: '保存',
    submitLabel: '提交',
    addLineLabel: '添加明细',
    summary: { quantityLabel: '销售数量', amountLabel: '价税合计' },
    buildLineSummary: ({ form, currency }) => {
      const totals = computeLinesTotals(form.lines);
      const prefix = `${currencySymbol(currency)} `;
      return {
        quantity: { label: '销售数量', value: totals.quantity },
        grossAmount: { label: '价税合计', value: totals.grossAmount, format: 'amount', prefix, emphasis: true },
        taxAmount: { label: '税额', value: totals.taxAmount, format: 'amount', prefix },
        netAmount: { label: '金额', value: totals.netAmount, format: 'amount', prefix },
      };
    },
  };
}

export function SalesOrderCreatePage(props) {
  return <SalesOrderFormPage {...props} mode="create" />;
}

export function SalesOrderEditPage(props) {
  return <SalesOrderFormPage {...props} mode="edit" />;
}

export function SalesOrderFormPage({ mode = 'create', onFeedback, ...props }) {
  const [dialog, setDialog] = useState(null);

  function handleSubmitRequest({ form, save, applyValidationResult }) {
    if (!applyValidationResult(validateOrderForSubmit(form))) return;

    const submit = () => {
      save('销售订单已提交', true);
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
      <SalesOrderActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
      />
    </>
  );
}
