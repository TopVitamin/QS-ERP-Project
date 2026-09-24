import { useState } from 'react';
import { DocumentFormPage } from '../components/erp/DocumentFormPage.jsx';
import { OtherInboundRequestActionDialogs } from '../components/erp/OtherInboundRequestActionDialogs.jsx';
import { productOptions, skuOptions } from '../data/masterData.js';
import { getOtherInboundRequestStatusBadges } from '../data/otherInboundRequestData.js';
import {
  buildRequestFormFromRow,
  buildRequestRowFromForm,
  canEditRequest,
  createEmptyRequestForm,
  createRequestLine,
  createRequestLineFromSku,
  generateOtherInboundRequestNo,
  getRequestWarehouseOptions,
  loadOtherInboundRequestById,
  OTHER_INBOUND_REQUEST_NO_PLACEHOLDER,
  otherInboundRequestBusinessTypes,
  persistOtherInboundRequest,
  refreshRequestLines,
  REMARK_500_MAX,
  sumRequestActualQty,
  sumRequestQty,
  validateRequestForSave,
  validateRequestForSubmit,
} from '../lib/otherInboundRequestLogic.js';

const requestLineEditorOptions = { productOptions, skuOptions };

/** 单据信息 6 列栅格：单号只读、入库仓与业务类型必填、备注占 3 列（新增编辑页 PRD §3.1）。 */
function buildFormFields() {
  return [
    { key: 'requestNo', label: '单号', type: 'disabled', getValue: (form) => form.requestNo },
    {
      key: 'warehouse',
      label: '入库仓 *',
      type: 'select',
      // 可选审核通过且启用的逻辑仓，含虚拟在途仓（R02、Q02）。
      options: getRequestWarehouseOptions(),
      placeholder: '请选择入库仓',
    },
    {
      key: 'businessType',
      label: '业务类型 *',
      type: 'select',
      options: otherInboundRequestBusinessTypes.map((value) => ({ value, label: value })),
      placeholder: '请选择业务类型',
    },
    { key: 'remark', label: '备注', type: 'textarea', className: 'col-span-3', placeholder: '请输入备注', maxLength: REMARK_500_MAX },
  ];
}

function getInitialForm(mode, context) {
  if (mode === 'edit') {
    const source = context?.row;
    const latest = source?.id ? (loadOtherInboundRequestById(source.id) || source) : null;
    if (latest) return buildRequestFormFromRow(latest);
  }
  return createEmptyRequestForm();
}

function prepareOnSave(form, { mode }) {
  if (mode !== 'create') return form;
  if (form.requestNo && form.requestNo !== OTHER_INBOUND_REQUEST_NO_PLACEHOLDER) return form;
  return { ...form, requestNo: generateOtherInboundRequestNo() };
}

function buildLineSummary({ form }) {
  const lines = refreshRequestLines(form.lines || []);
  const actualTotal = sumRequestActualQty(lines);
  return {
    quantity: { label: '申请入库数量', value: sumRequestQty(lines) },
    actualQty: { label: '实收数量', value: actualTotal == null ? '-' : actualTotal },
  };
}

function OtherInboundRequestFormPage({ mode = 'create', onFeedback, onOpenPage, ...props }) {
  const [dialog, setDialog] = useState(null);
  const sourceRow = props.context?.row;
  const latestSourceRow = sourceRow?.id ? (loadOtherInboundRequestById(sourceRow.id) || sourceRow) : null;

  function handleSubmitRequest({ form, save, applyValidationResult }) {
    if (!applyValidationResult(validateRequestForSubmit(form))) return;
    setDialog({
      type: 'submit',
      row: { ...buildRequestRowFromForm(form), status: 'draft' },
      onConfirm: () => save('其他入库申请单已提交', true),
    });
  }

  function handleDialogComplete(result) {
    if (result?.message) onFeedback?.(result.message, result.type || 'success');
    setDialog(null);
  }

  const config = {
    listPageId: 'inventory-other-inbound-request',
    createTitle: '新增其他入库申请单',
    editTitle: `编辑其他入库申请单${latestSourceRow?.requestNo ? ` ${latestSourceRow.requestNo}` : ''}`,
    infoSectionTitle: '单据信息',
    lineSectionTitle: '商品明细',
    lineVariant: 'other-inbound-request',
    lineEditorOptions: requestLineEditorOptions,
    enableSkuPicker: true,
    addLineLabel: '添加明细',
    formFields: () => buildFormFields(),
    // 新增页不展示实收数量、未收数量（TSV：新增页=否）。
    hiddenColumns: ({ mode: currentMode }) => (currentMode === 'create' ? ['actualQty', 'remainingQty'] : []),
    getInitialForm,
    validate: validateRequestForSave,
    prepareOnSave,
    transformOnSubmit: (form) => ({ ...form, status: 'pending' }),
    toListRow: (form, meta) => buildRequestRowFromForm(form, meta),
    persistRow: (row, meta) => {
      const saved = persistOtherInboundRequest(row);
      // 提交成功后进入待审核，直接打开详情查看状态与后续动作；保存草稿停留本页（新增编辑页 PRD §6）。
      if (meta?.shouldSubmit) onOpenPage?.('inventory-other-inbound-request-detail', { row: saved });
    },
    navigateOnSave: false,
    getStatusBadges: ({ form }) => getOtherInboundRequestStatusBadges(form),
    showSubmit: ({ form }) => form.status === 'draft',
    onSubmitRequest: handleSubmitRequest,
    createLine: createRequestLine,
    createLineFromSku: createRequestLineFromSku,
    saveLabel: '保存',
    submitLabel: '提交',
    saveMessage: () => '其他入库申请单已保存',
    submitMessage: () => '其他入库申请单已提交',
    summary: { quantityLabel: '申请入库数量', amountLabel: '实收数量' },
    buildLineSummary,
  };

  if (mode === 'edit' && (!latestSourceRow || !canEditRequest(latestSourceRow))) {
    return (
      <div className="rounded-erp-section border border-erp-border-card bg-erp-surface-panel p-6 text-[12px] text-erp-text">
        其他入库申请单不存在或无权查看，当前状态不可编辑。
        <button
          type="button"
          className="ml-2 text-erp-primary"
          onClick={() => onOpenPage?.('inventory-other-inbound-request')}
        >
          返回列表
        </button>
      </div>
    );
  }

  return (
    <>
      <DocumentFormPage {...props} mode={mode} onFeedback={onFeedback} onOpenPage={onOpenPage} config={config} />
      <OtherInboundRequestActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={onFeedback}
      />
    </>
  );
}

export function OtherInboundRequestCreatePage(props) {
  return <OtherInboundRequestFormPage {...props} mode="create" />;
}

export function OtherInboundRequestEditPage(props) {
  return <OtherInboundRequestFormPage {...props} mode="edit" />;
}
