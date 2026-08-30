import { DocumentFormPage } from '../components/erp/DocumentFormPage.jsx';
import { calculateLineAmount } from '../lib/format.js';
import { upsertMockRow } from '../lib/mockStorage.js';
import {
  departmentOptions,
  defaultOrderForm,
  employeeOptions,
  getEditableOrder,
  paymentTermOptions,
  purchaseLineEditorOptions,
  supplierOptions,
} from '../data/purchaseFormData.js';

const modeOptions = [
  { value: '普通采购', label: '普通采购' },
  { value: '委外采购', label: '委外采购' },
];

function getInitialForm(mode, context) {
  const source = mode === 'edit' ? getEditableOrder(context?.row) : defaultOrderForm;
  return { ...source, lines: source.lines.map((line) => ({ ...line })) };
}

let orderLineSequence = 0;

function createOrderLine() {
  return {
    id: `order-line-${Date.now()}-${orderLineSequence++}`,
    product: '',
    spec: '',
    unit: '个',
    quantity: 1,
    received: 0,
    price: 0,
    taxRate: '13',
    remark: '',
  };
}

function createOrderLineFromSku(sku, template) {
  const sameSku = template?.product === sku?.value;
  const line = createOrderLine();
  return {
    ...line,
    product: sku?.value || '',
    spec: sku?.spec === '—' ? '' : sku?.spec || '',
    unit: sku?.unit === '—' ? template?.unit || '个' : sku?.unit || template?.unit || '个',
    quantity: sameSku ? template.quantity : 1,
    received: sameSku ? template.received : 0,
    price: sameSku ? template.price : sku?.referencePrice ?? 0,
    taxRate: sameSku ? template.taxRate : '13',
    remark: sameSku ? template.remark : '',
  };
}

const orderFormFields = [
  { key: 'orderNo', label: '单据编号', type: 'disabled' },
  { key: 'date', label: '单据日期 *', type: 'date' },
  { key: 'mode', label: '采购模式 *', type: 'select', options: modeOptions },
  { key: 'supplier', label: '供应商 *', type: 'select', options: supplierOptions },
  { key: 'settleSupplier', label: '结算供应商', type: 'select', options: supplierOptions },
  { key: 'settlePeriod', label: '结算期限', type: 'select', options: paymentTermOptions },
  { key: 'salesman', label: '业务员', type: 'select', options: employeeOptions },
  { key: 'department', label: '部门', type: 'select', options: departmentOptions },
  { key: 'deliveryDate', label: '预计交货日期', type: 'date' },
  { key: 'creatorDisplay', label: '制单人', type: 'disabled', value: '当前用户' },
  { key: 'status', label: '审核状态', type: 'disabled' },
  { key: 'remark', label: '备注', type: 'textarea', className: 'col-span-3', placeholder: '填写本单的补充说明' },
];

const orderStorageKey = 'qs-erp:purchase-orders:v1';

function prepareOrderForm(form) {
  if (form.orderNo && form.orderNo !== '保存后自动生成') return form;
  const date = String(form.date || '20260819').replaceAll('-', '');
  return { ...form, orderNo: `CGDD-${date}-${String(Date.now()).slice(-5).padStart(5, '0')}` };
}

function toOrderRow(form, { context }) {
  const source = context?.row || {};
  return {
    id: source.id || `order-${Date.now()}`,
    date: form.date,
    mode: form.mode,
    orderNo: form.orderNo,
    supplier: form.supplier,
    settleSupplier: form.settleSupplier,
    settlePeriod: form.settlePeriod,
    salesman: form.salesman,
    department: form.department,
    remark: form.remark,
    deliveryDate: form.deliveryDate,
    auditStatus: form.status === '已审核' ? 'approved' : 'pending',
    executionStatus: source.executionStatus || 'not_started',
    inboundStatus: source.inboundStatus || 'not_received',
    closeStatus: source.closeStatus || 'open',
    paymentStatus: source.paymentStatus || 'unpaid',
    amount: form.lines.reduce((sum, line) => sum + calculateLineAmount(line), 0),
    executedAmount: source.executedAmount || 0,
    lines: form.lines.map((line) => ({ ...line })),
  };
}

export function PurchaseOrderCreatePage(props) {
  return <PurchaseOrderFormPage {...props} mode="create" />;
}

export function PurchaseOrderEditPage(props) {
  return <PurchaseOrderFormPage {...props} mode="edit" />;
}

const orderFormConfig = {
  listPageId: 'purchase-order',
  storageKey: orderStorageKey,
  createTitle: '新增采购订单',
  editTitle: '修改采购订单',
  infoSectionTitle: '基础信息',
  lineSectionTitle: '采购明细',
  lineVariant: 'order',
  lineEditorOptions: purchaseLineEditorOptions,
  enableSkuPicker: true,
  formFields: orderFormFields,
  hiddenOnCreate: ['status'],
  getInitialForm,
  prepareOnSave: prepareOrderForm,
  toListRow: toOrderRow,
  persistRow: (row) => upsertMockRow(orderStorageKey, row),
  validate: (currentForm) => {
    if (!currentForm.supplier || !currentForm.date || currentForm.lines.some((line) => !line.product || Number(line.quantity) <= 0)) {
      return '请补充供应商、单据日期和有效的商品明细';
    }
    return null;
  },
  transformOnSubmit: (currentForm) => ({ ...currentForm, status: '已审核' }),
  createLine: createOrderLine,
  createLineFromSku: createOrderLineFromSku,
  saveMessage: ({ isCreate, form }) => (isCreate ? '采购订单草稿已保存' : `${form.orderNo} 已保存修改`),
  submitMessage: ({ isCreate, form }) => (isCreate ? '采购订单已保存并审核' : `${form.orderNo} 已保存并审核`),
  submitLabel: '保存并审核',
  summary: { quantityLabel: '采购数量', amountLabel: '含税金额' },
};

export function PurchaseOrderFormPage(props) {
  return <DocumentFormPage {...props} config={orderFormConfig} />;
}
