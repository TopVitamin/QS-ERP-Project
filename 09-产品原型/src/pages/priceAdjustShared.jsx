import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { DocumentDetailPage } from '../components/erp/DocumentDetailPage.jsx';
import { DocumentFormPage } from '../components/erp/DocumentFormPage.jsx';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { buildCreateMetaFields } from '../components/erp/DocumentMetaTabsCard.jsx';
import {
  PriceAdjustActionDialogs,
  PriceAdjustDetailHeaderActions,
} from '../components/erp/PriceAdjustActionDialogs.jsx';
import { resolveOptionLabel } from '../lib/codeName.js';
import { nextDocumentNo } from '../lib/documentNo.js';
import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import { buildPriceAdjustOperationLogs } from '../lib/operationLog.js';
import { subscribeMockRows } from '../lib/mockStorage.js';
import { getSelectableCustomerOptions } from '../data/customerData.js';
import { customerOptions, supplierOptions } from '../data/masterData.js';
import { getSelectableSupplierOptions } from '../data/supplierData.js';
import {
  createPriceAdjustLine,
  createPriceAdjustLineFromSku,
  defaultPurchaseAdjustForm,
  defaultSalesAdjustForm,
  getEditablePriceAdjust,
  priceAdjustLineEditorOptions,
  purchaseAdjustColumns,
  purchasePriceAdjustments,
  salesAdjustColumns,
  salesPriceAdjustments,
  buildInitialVisibility,
} from '../data/priceAdjustData.js';
import { getTransferTarget } from '../lib/transferTargets.js';
import {
  buildPriceListPresetFilters,
  canApprovePriceAdjust,
  canDeletePriceAdjust,
  canEditPriceAdjust,
  canRejectPriceAdjust,
  canSubmitPriceAdjust,
  canViewPriceList,
  filterPurchaseAdjustRows,
  filterSalesAdjustRows,
  getPriceAdjustStatusBadges,
  getPriceAdjustStorageKey,
  loadAllPriceAdjustments,
  loadPriceAdjustById,
  persistPriceAdjust,
  priceAdjustStatusLabels,
  refreshPriceAdjustLines,
  REMARK_500_MAX,
  syncDuplicateLineErrors,
  validatePurchaseAdjustForSubmit,
  validateSalesAdjustForSubmit,
  validatePriceAdjustForSave,
} from '../lib/priceAdjustLogic.js';
import {
  getEnabledCurrencyOptions,
  nowStamp,
  priceCustomerLevelOptions,
  priceRangeOptions,
  resolvePriceCurrencyLabel,
} from '../lib/priceLogic.js';

/**
 * 价格调整单（采购／销售共用）：列表、新增/编辑、详情。
 * 状态—功能矩阵见主PRD §6.4；页面呈现见各页 Demo PRD；弹窗见《弹窗与Mock》§2、§3。
 */

const sideTexts = {
  purchase: {
    title: '采购价格调整单',
    docPrefix: 'CGJGTZ',
    listPageId: 'price-purchase-adjust',
    createPageId: 'price-purchase-adjust-create',
    editPageId: 'price-purchase-adjust-edit',
    detailPageId: 'price-purchase-adjust-detail',
    priceListPageId: 'price-purchase-list',
    targetId: 'purchase-price-adjust',
  },
  sales: {
    title: '销售价格调整单',
    docPrefix: 'XSJGTZ',
    listPageId: 'price-sales-adjust',
    createPageId: 'price-sales-adjust-create',
    editPageId: 'price-sales-adjust-edit',
    detailPageId: 'price-sales-adjust-detail',
    priceListPageId: 'price-sales-list',
    targetId: 'sales-price-adjust',
  },
};

function buildPurchaseAdjustFilterFields() {
  return [
    { key: 'adjustNo', label: '单号', type: 'search', placeholder: '请输入调整单号' },
    { key: 'supplier', label: '供应商', type: 'select', options: [{ value: '', label: '全部供应商' }, ...getSelectableSupplierOptions()] },
    { key: 'currency', label: '币别', type: 'select', options: [{ value: '', label: '全部' }, ...getEnabledCurrencyOptions()] },
    { key: 'auditStatus', label: '审核状态', type: 'multi-select', placeholder: '全部', options: Object.entries(priceAdjustStatusLabels).map(([value, label]) => ({ value, label })) },
    { key: 'productCode', label: '商品编码', type: 'search', placeholder: '请输入商品编码' },
    { key: 'barcode', label: '商品条码', type: 'search', placeholder: '请输入商品条码' },
    { key: 'createdAtRange', label: '创建时间', type: 'date-range', placeholder: '不限' },
  ];
}

function buildSalesAdjustFilterFields() {
  return [
    { key: 'adjustNo', label: '单号', type: 'search', placeholder: '请输入调整单号' },
    { key: 'range', label: '面向范围', type: 'multi-select', placeholder: '全部', options: priceRangeOptions },
    { key: 'level', label: '客户等级', type: 'multi-select', placeholder: '全部', options: priceCustomerLevelOptions },
    { key: 'customer', label: '客户', type: 'select', options: [{ value: '', label: '全部客户' }, ...getSelectableCustomerOptions()] },
    { key: 'currency', label: '币别', type: 'select', options: [{ value: '', label: '全部' }, ...getEnabledCurrencyOptions()] },
    { key: 'auditStatus', label: '审核状态', type: 'multi-select', placeholder: '全部', options: Object.entries(priceAdjustStatusLabels).map(([value, label]) => ({ value, label })) },
    { key: 'productCode', label: '商品编码', type: 'search', placeholder: '请输入商品编码' },
    { key: 'barcode', label: '商品条码', type: 'search', placeholder: '请输入商品条码' },
    { key: 'createdAtRange', label: '创建时间', type: 'date-range', placeholder: '不限' },
  ];
}

const purchaseAdjustInitialFilters = {
  adjustNo: '',
  supplier: '',
  currency: '',
  auditStatus: [],
  productCode: '',
  barcode: '',
  createdAtRange: { from: '', to: '' },
};

const salesAdjustInitialFilters = {
  adjustNo: '',
  range: [],
  level: [],
  customer: '',
  currency: '',
  auditStatus: [],
  productCode: '',
  barcode: '',
  createdAtRange: { from: '', to: '' },
};

const listConfigs = {
  purchase: {
    title: '采购价格调整单',
    rows: purchasePriceAdjustments,
    columns: purchaseAdjustColumns,
    targetId: 'purchase-price-adjust',
    initialFilters: purchaseAdjustInitialFilters,
    filterRows: filterPurchaseAdjustRows,
    buildFilterFields: buildPurchaseAdjustFilterFields,
    emptyText: '暂无采购价格调整单',
    emptyTextFiltered: '暂无符合条件的采购价格调整单',
  },
  sales: {
    title: '销售价格调整单',
    rows: salesPriceAdjustments,
    columns: salesAdjustColumns,
    targetId: 'sales-price-adjust',
    initialFilters: salesAdjustInitialFilters,
    filterRows: filterSalesAdjustRows,
    buildFilterFields: buildSalesAdjustFilterFields,
    emptyText: '暂无销售价格调整单',
    emptyTextFiltered: '暂无符合条件的销售价格调整单',
  },
};

/* ------------------------------------------------------------------ *
 * 列表页
 * ------------------------------------------------------------------ */

export function PriceAdjustListPage({ side = 'purchase', ...props }) {
  const [dialog, setDialog] = useState(null);
  const base = sideTexts[side] || sideTexts.purchase;
  const listBase = listConfigs[side] || listConfigs.purchase;

  function handleHeaderAction(id, { onOpenPage }) {
    if (id === 'create') onOpenPage?.(base.createPageId);
  }

  function handleCellClick(column, row, { onOpenPage }) {
    if (column.key === 'adjustNo') onOpenPage?.(base.detailPageId, { row });
  }

  function handleRowAction(id, row, { notify, onOpenPage }) {
    const latest = loadPriceAdjustById(side, row.id) || row;

    if (id === 'edit') {
      if (!canEditPriceAdjust(latest)) {
        notify('仅草稿或已驳回状态可编辑', 'warning');
        return;
      }
      onOpenPage?.(base.editPageId, { row: latest });
      return;
    }
    if (id === 'viewPriceList') {
      onOpenPage?.(base.priceListPageId, { presetFilters: buildPriceListPresetFilters(latest) });
      return;
    }
    if (id === 'submit') {
      const result = side === 'sales' ? validateSalesAdjustForSubmit(latest) : validatePurchaseAdjustForSubmit(latest);
      if (result) {
        notify(result.message || '请修正表单中的错误后再提交', 'warning');
        return;
      }
    }
    setDialog({ type: id, row: latest });
  }

  function handleDialogComplete(result) {
    if (result?.message) props.onFeedback?.(result.message, result.type || 'success');
    setDialog(null);
  }

  const config = {
    title: listBase.title,
    rows: listBase.rows,
    storageKey: getPriceAdjustStorageKey(side),
    columns: listBase.columns,
    initialFilters: listBase.initialFilters,
    filterRows: listBase.filterRows,
    initialVisibility: buildInitialVisibility(listBase.columns),
    columnOptions: listBase.columns.map((column) => ({ key: column.key, label: column.label })),
    filterFields: listBase.buildFilterFields(),
    defaultSort: { key: 'createdAt', direction: 'desc' },
    initialPinnedKeys: ['adjustNo'],
    emptyText: listBase.emptyText,
    emptyTextFiltered: listBase.emptyTextFiltered,
    queryMessage: null,
    headerActions: [
      { id: 'create', label: '新增', icon: Plus, variant: 'primary' },
      {
        id: 'import-export',
        render: (ctx) => (
          <ImportExportActions
            target={getTransferTarget(listBase.targetId)}
            scopeSource={{ all: ctx.state.rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
            defaultColumnKeys={listBase.columns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
            notify={ctx.notify}
            onOpenPage={ctx.onOpenPage}
          />
        ),
      },
    ],
    toolbarActions: [],
    rowActionsMaxVisible: 3,
    rowActions: [
      { id: 'edit', label: '编辑', visibleWhen: (row) => canEditPriceAdjust(row) },
      { id: 'submit', label: '提交', visibleWhen: (row) => canSubmitPriceAdjust(row) },
      { id: 'delete', label: '删除', visibleWhen: (row) => canDeletePriceAdjust(row), variant: 'danger' },
      { id: 'approve', label: '审核', visibleWhen: (row) => canApprovePriceAdjust(row) },
      { id: 'reject', label: '驳回', visibleWhen: (row) => canRejectPriceAdjust(row) },
      { id: 'viewPriceList', label: '查看价目表', visibleWhen: (row) => canViewPriceList(row) },
    ],
    resetMessage: '筛选条件已重置',
    onHeaderAction: handleHeaderAction,
    onCellClick: handleCellClick,
    onRowAction: handleRowAction,
  };

  return (
    <>
      <DocumentListPage {...props} config={config} />
      <PriceAdjustActionDialogs
        side={side}
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={props.onFeedback}
      />
    </>
  );
}

/* ------------------------------------------------------------------ *
 * 新增/编辑页
 * ------------------------------------------------------------------ */

function clearLinePrices(lines = []) {
  return lines.map((line) => ({ ...line, price: '', taxRate: '' }));
}

function hasLinePrices(lines = []) {
  return lines.some((line) => line.price !== '' || line.taxRate !== '');
}

function buildPurchaseFormFields(onFeedback) {
  const supplierOptions = getSelectableSupplierOptions();
  return [
    { key: 'adjustNo', label: '单号', type: 'disabled', section: 'header' },
    {
      key: 'supplier',
      label: '供应商 *',
      type: 'select',
      options: supplierOptions,
      placeholder: '请选择供应商',
      section: 'header',
      onValueChange: (value, form, onFieldChange) => {
        onFieldChange('supplier', value);
        const defaultCurrency = supplierOptions.find((option) => option.value === value)?.defaultCurrency;
        if (defaultCurrency) onFieldChange('currency', defaultCurrency);
        if (form.supplier && form.supplier !== value && hasLinePrices(form.lines)) {
          onFeedback?.('供应商已变更，请重新填写价格', 'warning');
        }
        onFieldChange('lines', clearLinePrices(form.lines));
      },
    },
    {
      key: 'currency',
      label: '币别 *',
      type: 'select',
      options: getEnabledCurrencyOptions(),
      placeholder: '请选择币别',
      section: 'header',
      onValueChange: (value, form, onFieldChange) => {
        if (form.currency && form.currency !== value && hasLinePrices(form.lines)) {
          onFeedback?.('币别已变更，请重新填写价格', 'warning');
        }
        onFieldChange('currency', value);
        onFieldChange('lines', clearLinePrices(form.lines));
      },
    },
    { key: 'lineCount', label: '明细条数', type: 'disabled', getValue: (form) => form.lines.length, section: 'header' },
    {
      key: 'remark',
      label: '备注',
      type: 'textarea',
      className: 'col-span-3',
      placeholder: '请输入备注',
      maxLength: REMARK_500_MAX,
      hint: (form) => (form.remark ? `${String(form.remark).length}/${REMARK_500_MAX}` : ''),
      section: 'header',
    },
  ];
}

function buildSalesFormFields(onFeedback) {
  const customerOptions = getSelectableCustomerOptions();
  return [
    { key: 'adjustNo', label: '单号', type: 'disabled', section: 'header' },
    {
      key: 'range',
      label: '面向范围 *',
      type: 'select',
      options: priceRangeOptions,
      placeholder: '请选择面向范围',
      section: 'header',
      onValueChange: (value, form, onFieldChange) => {
        onFieldChange('range', value);
        onFieldChange('customerLevel', '');
        onFieldChange('customer', '');
        if (form.range && form.range !== value && hasLinePrices(form.lines)) {
          onFeedback?.('面向范围已变更，请重新填写价格', 'warning');
        }
        onFieldChange('lines', clearLinePrices(form.lines));
      },
    },
    {
      key: 'customerLevel',
      label: '客户等级 *',
      type: 'select',
      options: priceCustomerLevelOptions,
      placeholder: '请选择客户等级',
      section: 'header',
      visible: (form) => form.range === 'level',
    },
    {
      key: 'customer',
      label: '客户 *',
      type: 'select',
      options: customerOptions,
      placeholder: '请选择客户',
      section: 'header',
      visible: (form) => form.range === 'customer',
      onValueChange: (value, form, onFieldChange) => {
        onFieldChange('customer', value);
        const defaultCurrency = customerOptions.find((option) => option.value === value)?.defaultCurrency;
        if (defaultCurrency) onFieldChange('currency', defaultCurrency);
        if (form.customer && form.customer !== value && hasLinePrices(form.lines)) {
          onFeedback?.('客户已变更，请重新填写价格', 'warning');
        }
        onFieldChange('lines', clearLinePrices(form.lines));
      },
    },
    {
      key: 'currency',
      label: '币别 *',
      type: 'select',
      options: getEnabledCurrencyOptions(),
      placeholder: '请选择币别',
      section: 'header',
      onValueChange: (value, form, onFieldChange) => {
        if (form.currency && form.currency !== value && hasLinePrices(form.lines)) {
          onFeedback?.('币别已变更，请重新填写价格', 'warning');
        }
        onFieldChange('currency', value);
        onFieldChange('lines', clearLinePrices(form.lines));
      },
    },
    { key: 'lineCount', label: '明细条数', type: 'disabled', getValue: (form) => form.lines.length, section: 'header' },
    {
      key: 'remark',
      label: '备注',
      type: 'textarea',
      className: 'col-span-3',
      placeholder: '请输入备注',
      maxLength: REMARK_500_MAX,
      hint: (form) => (form.remark ? `${String(form.remark).length}/${REMARK_500_MAX}` : ''),
      section: 'header',
    },
  ];
}

function toPriceAdjustRow(form, { context, shouldSubmit, side }) {
  const source = context?.row || {};
  const stamp = nowStamp();
  const lines = refreshPriceAdjustLines(form.lines);
  // 已驳回单保存后回到草稿（2026-09-24确认）：保留驳回记录，重新提交进入待审核。
  const draftStatus = source.auditStatus === 'rejected' ? 'draft' : (source.auditStatus || 'draft');
  const base = {
    ...source,
    id: form.id || source.id || `${side}-adjust-${Date.now()}`,
    side,
    adjustNo: form.adjustNo,
    currency: form.currency,
    remark: form.remark,
    auditStatus: shouldSubmit ? 'pending' : draftStatus,
    lines,
    creator: source.creator || '当前用户',
    createdAt: source.createdAt || stamp,
    updater: '当前用户',
    updatedAt: stamp,
    ...(shouldSubmit ? { submittedAt: stamp, submitter: '当前用户' } : {}),
  };
  if (side === 'sales') {
    return {
      ...base,
      range: form.range,
      customerLevel: form.range === 'level' ? form.customerLevel : '',
      customer: form.range === 'customer' ? form.customer : '',
    };
  }
  return { ...base, supplier: form.supplier };
}

function preparePriceAdjustForm(form, side, meta) {
  const next = { ...form };
  if (!next.id) next.id = meta?.context?.row?.id || `${side}-adjust-${Date.now()}`;
  if (!next.adjustNo || next.adjustNo === '保存后显示') {
    const existingNos = loadAllPriceAdjustments(side).map((row) => row.adjustNo);
    next.adjustNo = nextDocumentNo(sideTexts[side].docPrefix, nowStamp().slice(0, 10), existingNos);
  }
  return next;
}

export function PriceAdjustFormPage({ side = 'purchase', mode = 'create', context, onFeedback, onOpenPage, ...props }) {
  const isCreate = mode === 'create';
  const [dialog, setDialog] = useState(null);
  const persistedRowRef = useRef(null);
  const base = sideTexts[side] || sideTexts.purchase;

  const getInitialForm = useCallback((nextMode, nextContext) => {
    const source = nextMode === 'edit'
      ? getEditablePriceAdjust(nextContext?.row, side)
      : (side === 'sales' ? defaultSalesAdjustForm : defaultPurchaseAdjustForm);
    return { ...source, lines: source.lines.map((line) => ({ ...line })) };
  }, [side]);

  // 选品/改行后同步「同一商品只能出现一次」的行内错误（R04）。
  const handleLinesChanged = useCallback(({ form: currentForm, setLineErrors }) => {
    syncDuplicateLineErrors(currentForm.lines, setLineErrors);
  }, []);

  const notEditable = !isCreate && !canEditPriceAdjust(context?.row);

  function handleSubmitRequest({ form, save, applyValidationResult }) {
    const result = side === 'sales' ? validateSalesAdjustForSubmit(form) : validatePurchaseAdjustForSubmit(form);
    if (!applyValidationResult(result)) return;

    const submit = () => {
      const saved = save(`${base.title}已提交`);
      if (saved && persistedRowRef.current) {
        onOpenPage?.(base.detailPageId, { row: persistedRowRef.current });
      }
    };
    setDialog({ type: 'submit', onConfirm: submit });
  }

  function handleDialogComplete(result) {
    if (result?.message) onFeedback?.(result.message, result.type || 'success');
    setDialog(null);
  }

  if (notEditable) {
    return (
      <div className="rounded-erp-section border border-erp-border-card bg-erp-surface-panel p-6 text-[12px] text-erp-text">
        当前状态不可编辑。
        <button type="button" className="ml-2 text-erp-primary" onClick={() => onOpenPage?.(base.listPageId)}>返回列表</button>
      </div>
    );
  }

  const config = {
    listPageId: base.listPageId,
    storageKey: getPriceAdjustStorageKey(side),
    createTitle: `新增${base.title}`,
    editTitle: (form) => `编辑${base.title}${form.adjustNo && form.adjustNo !== '保存后显示' ? ` ${form.adjustNo}` : ''}`,
    fieldSections: [{ key: 'header', title: '单据信息' }],
    lineSectionTitle: '商品明细',
    lineVariant: 'price-adjust',
    lineEditorOptions: priceAdjustLineEditorOptions,
    enableSkuPicker: true,
    hiddenOnCreate: ['lineCount'],
    formFields: (side === 'sales' ? buildSalesFormFields(onFeedback) : buildPurchaseFormFields(onFeedback)),
    navigateOnSave: false,
    getStatusBadges: ({ mode: currentMode, context: currentContext }) => {
      if (currentMode !== 'edit') return [];
      // 编辑页标签读最新落库状态：已驳回单保存后回到草稿（2026-09-24确认）。
      const latest = currentContext?.row?.id
        ? (loadPriceAdjustById(side, currentContext.row.id) || currentContext.row)
        : currentContext?.row;
      return getPriceAdjustStatusBadges(latest);
    },
    onSubmitRequest: handleSubmitRequest,
    getInitialForm,
    prepareOnSave: (form, meta) => preparePriceAdjustForm(form, side, meta),
    toListRow: (form, meta) => toPriceAdjustRow(form, { context, shouldSubmit: meta?.shouldSubmit, side }),
    persistRow: (row) => {
      const persisted = persistPriceAdjust(row);
      persistedRowRef.current = persisted;
      return persisted;
    },
    validate: validatePriceAdjustForSave,
    onLinesChanged: handleLinesChanged,
    createLine: createPriceAdjustLine,
    createLineFromSku: (sku, template) => createPriceAdjustLineFromSku(sku, template, side),
    saveMessage: () => `${base.title}已保存`,
    submitMessage: () => `${base.title}已提交`,
    saveLabel: '保存',
    submitLabel: '提交',
    addLineLabel: '添加明细',
    // 调整单只有单价，不含数量和金额，不汇总价税合计、税额和金额（主PRD §4.1）。
    buildLineSummary: () => null,
  };

  return (
    <>
      <DocumentFormPage {...props} mode={mode} context={context} onFeedback={onFeedback} onOpenPage={onOpenPage} config={config} />
      <PriceAdjustActionDialogs
        side={side}
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={onFeedback}
      />
    </>
  );
}

/* ------------------------------------------------------------------ *
 * 详情页
 * ------------------------------------------------------------------ */

function usePriceAdjustRow(side, context) {
  const contextRow = context?.row;
  const [row, setRow] = useState(contextRow || null);

  useEffect(() => {
    if (!contextRow?.id) {
      setRow(contextRow || null);
      return undefined;
    }

    function syncRow() {
      setRow(loadPriceAdjustById(side, contextRow.id) || contextRow);
    }

    syncRow();
    return subscribeMockRows(getPriceAdjustStorageKey(side), syncRow);
  }, [side, contextRow]);

  return row;
}

function buildPurchaseInfoFields(detail) {
  return [
    { key: 'adjustNo', label: '单号', value: detail.adjustNo },
    { key: 'supplier', label: '供应商', value: resolveOptionLabel(detail.supplier, supplierOptions) },
    { key: 'currency', label: '币别', value: resolvePriceCurrencyLabel(detail.currency) },
    { key: 'lineCount', label: '明细条数', value: detail.lineCount ?? detail.lines?.length ?? 0 },
    { key: 'auditStatus', label: '审核状态', value: priceAdjustStatusLabels[detail.auditStatus] || EMPTY_PLACEHOLDER },
    { key: 'remark', label: '备注', value: detail.remark || EMPTY_PLACEHOLDER, className: 'col-span-3' },
  ];
}

function buildSalesInfoFields(detail) {
  return [
    { key: 'adjustNo', label: '单号', value: detail.adjustNo },
    { key: 'range', label: '面向范围', value: priceRangeOptions.find((option) => option.value === detail.range)?.label || EMPTY_PLACEHOLDER },
    { key: 'customerLevel', label: '客户等级', value: detail.customerLevel ? (priceCustomerLevelOptions.find((option) => option.value === detail.customerLevel)?.label || detail.customerLevel) : EMPTY_PLACEHOLDER },
    { key: 'customer', label: '客户', value: resolveOptionLabel(detail.customer, customerOptions) },
    { key: 'currency', label: '币别', value: resolvePriceCurrencyLabel(detail.currency) },
    { key: 'lineCount', label: '明细条数', value: detail.lineCount ?? detail.lines?.length ?? 0 },
    { key: 'auditStatus', label: '审核状态', value: priceAdjustStatusLabels[detail.auditStatus] || EMPTY_PLACEHOLDER },
    { key: 'remark', label: '备注', value: detail.remark || EMPTY_PLACEHOLDER, className: 'col-span-3' },
  ];
}

export function PriceAdjustDetailPage({ side = 'purchase', onFeedback, onOpenPage, context }) {
  const row = usePriceAdjustRow(side, context);
  const [dialog, setDialog] = useState(null);
  const base = sideTexts[side] || sideTexts.purchase;

  function handleDialogComplete(result) {
    if (result?.message) onFeedback?.(result.message, result.type || 'success');
    if (result?.deleted) {
      onOpenPage?.(base.listPageId);
      setDialog(null);
      return;
    }
    if (result?.row) {
      onOpenPage?.(base.detailPageId, { row: loadPriceAdjustById(side, result.row.id) || result.row });
    }
    setDialog(null);
  }

  const config = {
    listPageId: base.listPageId,
    editPageId: base.editPageId,
    lineSectionTitle: '商品明细',
    lineVariant: 'price-adjust',
    lineEditorOptions: priceAdjustLineEditorOptions,
    getDetail: (sourceRow) => ({ ...(sourceRow || {}), lines: refreshPriceAdjustLines(sourceRow?.lines || []) }),
    title: (detail) => `${base.title}详情${detail.adjustNo ? ` · ${detail.adjustNo}` : ''}`,
    getStatusBadges: (currentRow) => [
      ...getPriceAdjustStatusBadges(currentRow),
      // Demo 标记：本次审核通过后本地更新了价目表（弹窗与Mock PRD §4）。
      ...(currentRow?.isMock ? [{ label: '演示数据', tone: 'neutral' }] : []),
    ],
    canEdit: (currentRow) => canEditPriceAdjust(currentRow),
    editLabel: '编辑',
    rowKey: (detail) => detail.adjustNo,
    sections: [
      {
        title: '单据信息',
        fields: ({ detail }) => (side === 'sales' ? buildSalesInfoFields(detail) : buildPurchaseInfoFields(detail)),
      },
    ],
    renderAfterLines: ({ row: currentRow }) => (currentRow?.auditStatus === 'approved' ? (
      <div className="rounded-erp-section border border-erp-border-card bg-erp-surface-panel px-4 py-2.5 text-[12px] text-erp-text-muted">
        {side === 'sales'
          ? '本单价格已生效，只影响之后的新单；独立站与外部电商金额不受影响。'
          : '本单价格已生效，只影响之后的新单。'}
      </div>
    ) : null),
    extraSections: [
      {
        title: '驳回信息',
        visibleWhen: ({ row: currentRow }) => currentRow?.auditStatus === 'rejected',
        fields: ({ row: currentRow }) => [
          { key: 'returnComment', label: '驳回意见', value: currentRow.returnComment || EMPTY_PLACEHOLDER, className: 'col-span-3' },
          { key: 'auditor', label: '审核人', value: currentRow.auditor || EMPTY_PLACEHOLDER },
          { key: 'auditTime', label: '审核时间', value: currentRow.auditTime || EMPTY_PLACEHOLDER },
        ],
      },
      {
        title: '操作信息',
        variant: 'meta-tabs',
        defaultTab: 'create',
        tabs: ({ row: currentRow }) => [
          { key: 'create', label: '制单信息', fields: buildCreateMetaFields(currentRow) },
          { key: 'log', label: '操作日志', variant: 'log', logEntries: () => buildPriceAdjustOperationLogs(currentRow) },
        ],
      },
    ],
    // 调整单只有单价，不含数量和金额，不汇总价税合计、税额和金额（主PRD §4.1）。
    buildLineSummary: () => null,
    renderHeaderActions: ({ row: currentRow, onOpenPage: openPage }) => (
      <PriceAdjustDetailHeaderActions
        row={currentRow}
        onAction={(id, actionRow) => {
          if (id === 'viewPriceList') {
            openPage?.(base.priceListPageId, { presetFilters: buildPriceListPresetFilters(actionRow) });
            return;
          }
          setDialog({ type: id, row: actionRow });
        }}
      />
    ),
  };

  return (
    <>
      <DocumentDetailPage context={{ row }} onOpenPage={onOpenPage} config={config} />
      <PriceAdjustActionDialogs
        side={side}
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={onFeedback}
      />
    </>
  );
}
