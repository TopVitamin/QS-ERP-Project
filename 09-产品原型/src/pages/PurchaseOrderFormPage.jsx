import { Plus } from 'lucide-react';
import { DocumentEditorFrame, EditorCard } from '../components/erp/DocumentEditorFrame.jsx';
import { DocumentSummaryBar } from '../components/erp/DocumentSummaryBar.jsx';
import { FormFields } from '../components/erp/FormControl.jsx';
import { LineItemTable } from '../components/erp/LineItemTable.jsx';
import { Button } from '../components/ui/button.jsx';
import { erpFieldGridClassName } from '../styles/typography.js';
import { useDocumentForm } from '../hooks/useDocumentForm.js';
import {
  departmentOptions,
  defaultOrderForm,
  employeeOptions,
  getEditableOrder,
  paymentTermOptions,
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

function createOrderLine() {
  return {
    id: `order-line-${Date.now()}`,
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
  { key: 'remark', label: '备注', type: 'textarea', className: 'col-span-6', placeholder: '填写本单的补充说明' },
];

export function PurchaseOrderCreatePage(props) {
  return <PurchaseOrderFormPage {...props} mode="create" />;
}

export function PurchaseOrderEditPage(props) {
  return <PurchaseOrderFormPage {...props} mode="edit" />;
}

export function PurchaseOrderFormPage({ mode = 'create', context, onFeedback, onOpenPage }) {
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
      if (!currentForm.supplier || !currentForm.date || currentForm.lines.some((line) => !line.product || Number(line.quantity) <= 0)) {
        return '请补充供应商、单据日期和有效的商品明细';
      }
      return null;
    },
    transformOnSubmit: (currentForm) => ({ ...currentForm, status: '已审核' }),
    onFeedback,
    onNavigate: () => onOpenPage?.('purchase-order'),
  });

  const visibleFormFields = isCreate ? orderFormFields.filter((field) => field.key !== 'status') : orderFormFields;

  return (
    <DocumentEditorFrame
      title={isCreate ? '新增采购订单' : '修改采购订单'}
      status={isCreate ? undefined : form.status}
      dirty={dirty}
      onCancel={() => onOpenPage?.('purchase-order')}
      onSave={() => save(isCreate ? '采购订单草稿已保存' : `${form.orderNo} 已保存修改`)}
      onSaveAndSubmit={() => save(isCreate ? '采购订单已保存并审核' : `${form.orderNo} 已保存并审核`, true)}
      submitLabel="保存并审核"
    >
      <EditorCard title="基础信息">
        <div className={erpFieldGridClassName}>
          <FormFields fields={visibleFormFields} form={form} onFieldChange={updateField} />
        </div>
      </EditorCard>

      <EditorCard
        title="采购明细"
        actions={<Button variant="outline" size="compact" onClick={() => addLine(createOrderLine)}><Plus className="h-3.5 w-3.5" strokeWidth={1.9} />新增明细</Button>}
      >
        <LineItemTable variant="order" mode="edit" lines={form.lines} onLineChange={updateLine} onLineRemove={removeLine} />
        <DocumentSummaryBar quantityLabel="采购数量" quantity={totalQuantity} amountLabel="含税金额" amount={totalAmount} />
      </EditorCard>
    </DocumentEditorFrame>
  );
}
