import { DocumentFormPage } from '../components/erp/DocumentFormPage.jsx';
import { calculateLineAmount } from '../lib/format.js';
import { readMockRows, upsertMockRow } from '../lib/mockStorage.js';
import {
  defaultInboundForm,
  employeeOptions,
  getEditableInbound,
  purchaseLineEditorOptions,
  supplierOptions,
  warehouseOptions,
} from '../data/purchaseFormData.js';
import { orders } from '../data/orderData.js';

const inboundTypeOptions = [
  { value: '采购入库', label: '采购入库' },
  { value: '退货入库', label: '退货入库' },
  { value: '其他入库', label: '其他入库' },
];

const orderStorageKey = 'qs-erp:purchase-orders:v1';

function getOrderOptions() {
  return readMockRows(orderStorageKey, orders).map((order) => ({
    value: order.orderNo,
    label: `${order.orderNo} / ${order.supplier || '未填写供应商'}`,
  }));
}

function getInitialForm(mode, context) {
  const source = mode === 'edit' ? getEditableInbound(context?.row) : defaultInboundForm;
  return { ...source, lines: source.lines.map((line) => ({ ...line })) };
}

function createInboundLine() {
  return {
    id: `inbound-line-${Date.now()}`,
    product: '',
    spec: '',
    unit: '个',
    orderQuantity: 0,
    quantity: 1,
    price: 0,
    remark: '',
  };
}

function buildInboundFormFields(orderOptions) {
  return [
    { key: 'inboundNo', label: '入库单号', type: 'disabled' },
    { key: 'date', label: '单据日期 *', type: 'date' },
    { key: 'inboundType', label: '入库类型 *', type: 'select', options: inboundTypeOptions },
    {
      key: 'relatedOrderNo',
      label: '关联采购订单 *',
      type: 'select',
      options: orderOptions,
      onValueChange: (value, form, update) => {
        const selectedOrder = orderOptions.find((option) => option.value === value);
        const nextSupplier = selectedOrder?.label.split(' / ')[1] || form.supplier;
        update('relatedOrderNo', value);
        update('supplier', nextSupplier);
      },
    },
    {
      key: 'supplier',
      label: '供应商 *',
      type: 'select',
      options: supplierOptions,
      disabled: (form) => form.inboundType === '采购入库',
    },
    { key: 'warehouse', label: '入库仓库 *', type: 'select', options: warehouseOptions },
    { key: 'operator', label: '经办人 *', type: 'select', options: employeeOptions },
    { key: 'status', label: '入库状态', type: 'disabled' },
    { key: 'remark', label: '备注', type: 'textarea', className: 'col-span-3', placeholder: '填写收货、质检或差异说明' },
  ];
}

const inboundStorageKey = 'qs-erp:purchase-inbounds:v1';

function prepareInboundForm(form) {
  if (form.inboundNo && form.inboundNo !== '保存后自动生成') return form;
  const date = String(form.date || '20260819').replaceAll('-', '');
  return { ...form, inboundNo: `CG入库-${date}-${String(Date.now()).slice(-5).padStart(5, '0')}` };
}

function toInboundRow(form, { context }) {
  const source = context?.row || {};
  return {
    id: source.id || `inbound-${Date.now()}`,
    date: form.date,
    inboundNo: form.inboundNo,
    relatedOrderNo: form.relatedOrderNo,
    supplier: form.supplier,
    warehouse: form.warehouse,
    inboundType: form.inboundType,
    status: form.status === '已入库' ? 'completed' : form.status === '部分入库' ? 'partial' : 'pending',
    operator: form.operator,
    quantity: form.lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0),
    amount: form.lines.reduce((sum, line) => sum + calculateLineAmount(line), 0),
    remark: form.remark,
    lines: form.lines.map((line) => ({ ...line })),
  };
}

export function PurchaseInboundCreatePage(props) {
  return <PurchaseInboundFormPage {...props} mode="create" />;
}

export function PurchaseInboundEditPage(props) {
  return <PurchaseInboundFormPage {...props} mode="edit" />;
}

const inboundFormConfig = {
  listPageId: 'purchase-inbound',
  storageKey: inboundStorageKey,
  createTitle: '新增采购入库单',
  editTitle: '修改采购入库单',
  infoSectionTitle: '入库信息',
  lineSectionTitle: '入库明细',
  lineVariant: 'inbound',
  lineEditorOptions: purchaseLineEditorOptions,
  formFields: () => buildInboundFormFields(getOrderOptions()),
  hiddenOnCreate: ['status'],
  getInitialForm,
  prepareOnSave: prepareInboundForm,
  toListRow: toInboundRow,
  persistRow: (row) => upsertMockRow(inboundStorageKey, row),
  validate: (currentForm) => {
    if (!currentForm.supplier || !currentForm.date || !currentForm.warehouse) {
      return '请补充供应商、日期和仓库';
    }
    if (currentForm.lines.some((line) => !line.product || Number(line.quantity) <= 0 || Number(line.quantity) > Number(line.orderQuantity || Number.MAX_SAFE_INTEGER))) {
      return '请检查商品明细，入库数量不能超过可入库数量';
    }
    return null;
  },
  transformOnSubmit: (currentForm) => ({ ...currentForm, status: '已入库' }),
  createLine: createInboundLine,
  saveMessage: ({ isCreate, form }) => (isCreate ? '采购入库单草稿已保存' : `${form.inboundNo} 已保存修改`),
  submitMessage: ({ isCreate, form }) => (isCreate ? '采购入库单已保存并确认入库' : `${form.inboundNo} 已保存并确认入库`),
  submitLabel: '保存并确认',
  summary: { quantityLabel: '入库数量', amountLabel: '入库金额' },
};

export function PurchaseInboundFormPage(props) {
  return <DocumentFormPage {...props} config={inboundFormConfig} />;
}
