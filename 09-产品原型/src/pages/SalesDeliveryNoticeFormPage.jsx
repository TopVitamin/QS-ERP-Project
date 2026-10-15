import { useMemo } from 'react';
import { DocumentEditorFrame, EditorCard } from '../components/erp/DocumentEditorFrame.jsx';
import { FormFields } from '../components/erp/FormControl.jsx';
import { LineItemTable } from '../components/erp/LineItemTable.jsx';
import { NoticeSourceMissingState, useNoticeFormDraft } from './noticeFormShared.jsx';
import { resolveOptionLabel } from '../lib/codeName.js';
import { createEmptyCnAddress, getCustomerAddressOptions } from '../lib/cnAddress.js';
import { toSelectOptions } from '../lib/options.js';
import { erpFieldGridClassName } from '../styles/typography.js';
import { customerOptions } from '../data/masterData.js';
import { getInventoryLogicalWarehouseOptions } from '../data/warehouseData.js';
import { getSelectableLogisticsProductOptions } from '../data/logisticsData.js';
import { getDeliveryNoticeStatusBadges } from '../data/salesDeliveryNoticeData.js';
import {
  buildNoticeFormFromOrder,
  canEditRemark,
  createDeliveryNotice,
  deliveryModeLabels,
  loadNoticeById,
  resolveDeliveryMode,
  shipMethodLabels,
  updateNoticeRemark,
  validateNoticeForCreate,
} from '../lib/salesDeliveryNoticeLogic.js';
import {
  canPushDeliveryNotice,
  loadOrderById,
} from '../lib/salesOrderLogic.js';

function getSourceOrder(context) {
  if (context?.row?.orderNo) return context.row;
  if (context?.sourceOrderId) return loadOrderById(context.sourceOrderId);
  if (context?.row?.id && context?.row?.lines) return loadOrderById(context.row.id) || context.row;
  return null;
}

// 虚拟出库说明图标文案（《销售发货通知单前端Demo版PRD_新增编辑页》§3、03《集成协作与人工补充》§4.2.1）。
const VIRTUAL_DELIVERY_TIP = '虚拟出库不会推送通知单到仓库，而是直接生成销售出库单，扣减ERP的库存，也不向聚水潭、领星同步库存';

function deliveryModeField({ required = false, disabled = false, showVirtualTip = false } = {}) {
  return {
    key: 'deliveryMode',
    label: required ? '发货处理方式 *' : '发货处理方式',
    type: 'radio',
    options: toSelectOptions(deliveryModeLabels).map((option) => (
      showVirtualTip && option.value === 'virtual'
        ? { ...option, tip: VIRTUAL_DELIVERY_TIP }
        : option
    )),
    disabled,
  };
}

function buildCreateFields(orderRow, form) {
  const showLogistics = form?.shipMethod !== 'pickup';
  const fields = [
    { key: 'noticeNo', label: '单号', type: 'disabled', getValue: (f) => f.noticeNo },
    { key: 'sourceOrderNo', label: '来源销售订单', type: 'disabled', getValue: () => orderRow?.orderNo || '' },
    { key: 'customer', label: '客户', type: 'disabled', getValue: (f) => resolveOptionLabel(f.customer, customerOptions) },
    { key: 'warehouse', label: '发货仓库', type: 'disabled', getValue: (f) => resolveOptionLabel(f.warehouse, getInventoryLogicalWarehouseOptions()) },
    deliveryModeField({ required: true, showVirtualTip: true }),
    {
      key: 'shipMethod',
      label: '发货方式 *',
      type: 'select',
      options: toSelectOptions(shipMethodLabels),
    },
    { key: 'remark', label: '备注', type: 'textarea', className: 'col-span-3', placeholder: '请输入备注' },
  ];

  if (showLogistics) {
    fields.push(
      {
        key: 'logisticsProduct',
        label: '物流服务产品 *',
        type: 'select',
        options: getSelectableLogisticsProductOptions(),
        section: 'logistics',
      },
      {
        key: 'deliveryAddress',
        label: '发货地址 *',
        type: 'customer-address',
        addressOptions: () => getCustomerAddressOptions(orderRow?.customer),
        placeholder: '请选择发货地址',
        className: 'col-span-2',
        section: 'logistics',
      },
    );
  }

  return fields;
}

function buildEditFields() {
  return [
    { key: 'noticeNo', label: '单号', type: 'disabled', getValue: (form) => form.noticeNo },
    { key: 'sourceOrderNo', label: '来源销售订单', type: 'disabled', getValue: (form) => form.sourceOrderNo },
    { key: 'customer', label: '客户', type: 'disabled', getValue: (form) => resolveOptionLabel(form.customer, customerOptions) },
    { key: 'warehouse', label: '发货仓库', type: 'disabled', getValue: (form) => resolveOptionLabel(form.warehouse, getInventoryLogicalWarehouseOptions()) },
    deliveryModeField({ disabled: true }),
    { key: 'remark', label: '备注', type: 'textarea', className: 'col-span-3', placeholder: '请输入备注' },
  ];
}

export function SalesDeliveryNoticeCreatePage({ context, onFeedback, onOpenPage }) {
  const sourceOrder = useMemo(() => getSourceOrder(context), [context]);
  const { form, dirty, updateForm, updateLine } = useNoticeFormDraft(sourceOrder, {
    canPush: canPushDeliveryNotice,
    buildForm: buildNoticeFormFromOrder,
  });

  // 发货方式切换联动：自提清空收货地址与物流商，物流补默认地址与物流商（Demo PRD §3）。
  function updateField(key, value) {
    updateForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'shipMethod' && value === 'pickup') {
        next.deliveryAddress = createEmptyCnAddress();
        next.logisticsProduct = '';
      }
      if (key === 'shipMethod' && value === 'logistics') {
        if (!next.deliveryAddress?.provinceCode) {
          next.deliveryAddress = buildNoticeFormFromOrder(sourceOrder).deliveryAddress;
        }
        next.logisticsProduct = next.logisticsProduct || 'LSP000001';
      }
      return next;
    });
  }

  function handleSave() {
    const error = validateNoticeForCreate(form);
    if (error) {
      onFeedback?.(error, 'warning');
      return;
    }
    try {
      createDeliveryNotice(sourceOrder, form);
      onFeedback?.('销售发货通知单已创建', 'success');
      onOpenPage?.('sales-delivery-notice');
    } catch (saveError) {
      onFeedback?.(saveError.message || '创建失败，请重试', 'warning');
    }
  }

  if (!sourceOrder) {
    return (
      <NoticeSourceMissingState
        message="来源销售订单不存在或不可下推发货通知。"
        linkLabel="返回销售订单"
        onBack={() => onOpenPage?.('sales-order')}
      />
    );
  }

  if (!form) {
    return (
      <NoticeSourceMissingState
        message="当前销售订单不可下推发货通知。"
        linkLabel="返回销售订单"
        onBack={() => onOpenPage?.('sales-order-detail', { row: sourceOrder })}
      />
    );
  }

  const docFields = buildCreateFields(sourceOrder, form);
  const headerFields = docFields.filter((field) => field.section !== 'logistics');
  const logisticsFields = docFields.filter((field) => field.section === 'logistics');

  return (
    <DocumentEditorFrame
      title="创建销售发货通知单"
      dirty={dirty}
      onCancel={() => onOpenPage?.('sales-order-detail', { row: sourceOrder })}
      onSave={handleSave}
      saveLabel="保存并创建"
      showSubmit={false}
    >
      <EditorCard title="单据信息">
        <div className={erpFieldGridClassName}>
          <FormFields fields={headerFields} form={form} onFieldChange={updateField} />
        </div>
      </EditorCard>

      {logisticsFields.length > 0 && (
        <EditorCard title="发货与物流">
          <div className={erpFieldGridClassName}>
            <FormFields fields={logisticsFields} form={form} onFieldChange={updateField} />
          </div>
        </EditorCard>
      )}

      <EditorCard title="商品明细">
        <LineItemTable
          variant="delivery-notice"
          mode="edit"
          lines={form.lines}
          onLineChange={updateLine}
        />
      </EditorCard>
    </DocumentEditorFrame>
  );
}

function buildEditableNoticeForm(sourceRow) {
  const latest = loadNoticeById(sourceRow.id) || sourceRow;
  return {
    ...latest,
    deliveryMode: resolveDeliveryMode(latest),
    lines: latest.lines.map((line) => ({ ...line })),
  };
}

export function SalesDeliveryNoticeEditPage({ context, onFeedback, onOpenPage }) {
  const sourceRow = context?.row;
  const { form, dirty, updateField } = useNoticeFormDraft(sourceRow, {
    canPush: canEditRemark,
    buildForm: buildEditableNoticeForm,
  });

  function handleSave() {
    const next = updateNoticeRemark(form, form.remark || '');
    onFeedback?.('销售发货通知单已保存', 'success');
    onOpenPage?.('sales-delivery-notice-detail', { row: next });
  }

  if (!form) {
    return (
      <NoticeSourceMissingState
        message="当前状态不可编辑。"
        linkLabel="返回列表"
        onBack={() => onOpenPage?.('sales-delivery-notice')}
      />
    );
  }

  const fields = buildEditFields();

  return (
    <DocumentEditorFrame
      title={`编辑销售发货通知单 ${form.noticeNo}`}
      statuses={getDeliveryNoticeStatusBadges(form)}
      dirty={dirty}
      onCancel={() => onOpenPage?.('sales-delivery-notice-detail', { row: form })}
      onSave={handleSave}
      saveLabel="保存"
      showSubmit={false}
    >
      <EditorCard title="单据信息">
        <div className={erpFieldGridClassName}>
          <FormFields fields={fields} form={form} onFieldChange={updateField} />
        </div>
      </EditorCard>

      <EditorCard title="商品明细">
        <LineItemTable variant="delivery-notice" lines={form.lines} />
      </EditorCard>
    </DocumentEditorFrame>
  );
}
