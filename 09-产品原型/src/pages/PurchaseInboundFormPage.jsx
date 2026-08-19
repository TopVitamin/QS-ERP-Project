import { Plus } from 'lucide-react';
import { DocumentEditorFrame, EditorCard } from '../components/erp/DocumentEditorFrame.jsx';
import { DocumentSummaryBar } from '../components/erp/DocumentSummaryBar.jsx';
import { FormFields } from '../components/erp/FormControl.jsx';
import { LineItemTable } from '../components/erp/LineItemTable.jsx';
import { Button } from '../components/ui/button.jsx';
import { erpFieldGridClassName } from '../styles/typography.js';
import { useDocumentForm } from '../hooks/useDocumentForm.js';
import {
  defaultInboundForm,
  employeeOptions,
  getEditableInbound,
  supplierOptions,
  warehouseOptions,
} from '../data/purchaseFormData.js';

const inboundTypeOptions = [
  { value: '采购入库', label: '采购入库' },
  { value: '退货入库', label: '退货入库' },
  { value: '其他入库', label: '其他入库' },
];

const orderOptions = [
  { value: 'CGDD-20260818-00045', label: 'CGDD-20260818-00045 / 测试' },
  { value: 'CGDD-20260818-00043', label: 'CGDD-20260818-00043 / 我是赠品2' },
  { value: 'CGDD-20260818-00034', label: 'CGDD-20260818-00034 / 中南批发商行' },
  { value: 'CGDD-20260818-00030', label: 'CGDD-20260818-00030 / 测试' },
];

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

function buildInboundFormFields() {
  return [
    { key: 'inboundNo', label: '入库单号', type: 'disabled' },
    { key: 'date', label: '单据日期 *', type: 'date' },
    { key: 'inboundType', label: '入库类型 *', type: 'select', options: inboundTypeOptions },
    {
      key: 'relatedOrderNo',
      label: '关联采购订单 *',
      type: 'select',
      className: 'col-span-6',
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
    { key: 'remark', label: '备注', type: 'textarea', className: 'col-span-6', placeholder: '填写收货、质检或差异说明' },
  ];
}

export function PurchaseInboundCreatePage(props) {
  return <PurchaseInboundFormPage {...props} mode="create" />;
}

export function PurchaseInboundEditPage(props) {
  return <PurchaseInboundFormPage {...props} mode="edit" />;
}

export function PurchaseInboundFormPage({ mode = 'create', context, onFeedback, onOpenPage }) {
  const isCreate = mode === 'create';
  const contextId = context?.row?.id || 'create';

  const {
    form,
    dirty,
    totalQuantity,
    totalAmount,
    updateField,
    updateLine,
    addLine,
    removeLine,
    save,
  } = useDocumentForm({
    mode,
    context,
    contextId,
    getInitialForm,
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
    onFeedback,
    onNavigate: () => onOpenPage?.('purchase-inbound'),
  });

  const inboundFormFields = buildInboundFormFields();
  const visibleFormFields = isCreate ? inboundFormFields.filter((field) => field.key !== 'status') : inboundFormFields;

  return (
    <DocumentEditorFrame
      title={isCreate ? '新增采购入库单' : '修改采购入库单'}
      status={isCreate ? undefined : form.status}
      dirty={dirty}
      onCancel={() => onOpenPage?.('purchase-inbound')}
      onSave={() => save(isCreate ? '采购入库单草稿已保存' : `${form.inboundNo} 已保存修改`)}
      onSaveAndSubmit={() => save(isCreate ? '采购入库单已保存并确认入库' : `${form.inboundNo} 已保存并确认入库`, true)}
      submitLabel="保存并确认"
    >
      <EditorCard title="入库信息">
        <div className={erpFieldGridClassName}>
          <FormFields fields={visibleFormFields} form={form} onFieldChange={updateField} />
        </div>
      </EditorCard>

      <EditorCard
        title="入库明细"
        actions={<Button variant="outline" size="compact" onClick={() => addLine(createInboundLine)}><Plus className="h-3.5 w-3.5" strokeWidth={1.9} />新增明细</Button>}
      >
        <LineItemTable variant="inbound" mode="edit" lines={form.lines} onLineChange={updateLine} onLineRemove={removeLine} />
        <DocumentSummaryBar quantityLabel="入库数量" quantity={totalQuantity} amountLabel="入库金额" amount={totalAmount} />
      </EditorCard>
    </DocumentEditorFrame>
  );
}
