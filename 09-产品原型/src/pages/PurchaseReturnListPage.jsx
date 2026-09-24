import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { PurchaseReturnActionDialogs } from '../components/erp/PurchaseReturnActionDialogs.jsx';
import { getTransferTarget } from '../lib/transferTargets.js';
import { matchesDateRange, matchesMultiSelect, statusMultiSelectField } from '../lib/listFilters.js';
import { getSelectableLogicalWarehouseOptions } from '../data/warehouseData.js';
import { getSelectableSupplierOptions } from '../data/supplierData.js';
import { skuOptions } from '../data/masterData.js';
import { inboundOrders } from '../data/inboundData.js';
import { loadInboundById } from '../lib/inboundLogic.js';
import {
  buildSourceInboundFilterOptions,
  purchaseReturnColumns,
  purchaseReturns,
  purchaseReturnStatusLabels,
} from '../data/purchaseReturnData.js';
import {
  canAdjustReturnDeadline,
  canApproveReturn,
  canCancelApprovedReturn,
  canCancelPendingReturn,
  canCloseReturn,
  canDeleteDraftReturn,
  canEditReturn,
  canPushReturnNotice,
  canSubmitReturn,
  canWithdrawReturn,
  findZeroPriceLines,
  getReturnCancelBlockReason,
  loadReturnById,
  PURCHASE_RETURN_STORAGE_KEY,
  validateReturnForSubmit,
} from '../lib/purchaseReturnLogic.js';

/**
 * 采购退货单列表（F01、F08）：查询区、列、行内操作与导入导出入口。
 * 查询区顺序、列表列与状态 tone 见列表页 Demo PRD §2、§4；行操作矩阵见 §6.1。
 */

const initialFilters = {
  createdAtRange: { from: '', to: '' },
  returnNo: '',
  supplier: '',
  warehouse: '',
  sourceInboundNo: '',
  deadlineRange: { from: '', to: '' },
  product: '',
  auditStatus: [],
  businessStatus: [],
};

function createFilterFields(rows) {
  return [
    { key: 'createdAtRange', label: '创建时间', type: 'date-range', placeholder: '不限' },
    { key: 'returnNo', label: '单号', type: 'search', placeholder: '请输入采购退货单号' },
    { key: 'supplier', label: '供应商', type: 'select', options: [{ value: '', label: '全部供应商' }, ...getSelectableSupplierOptions()] },
    { key: 'warehouse', label: '出库仓库', type: 'select', options: [{ value: '', label: '全部仓库' }, ...getSelectableLogicalWarehouseOptions()] },
    { key: 'sourceInboundNo', label: '来源采购入库单', type: 'select', options: buildSourceInboundFilterOptions(rows) },
    { key: 'deadlineRange', label: '退货截止日期', type: 'date-range', placeholder: '不限' },
    {
      key: 'product',
      label: '商品',
      type: 'select',
      options: [
        { value: '', label: '全部商品' },
        ...skuOptions.map((sku) => ({ value: sku.value, label: `${sku.skuCode} ${sku.productName}` })),
      ],
    },
    statusMultiSelectField('auditStatus', '审核状态', purchaseReturnStatusLabels.auditStatus),
    statusMultiSelectField('businessStatus', '业务状态', purchaseReturnStatusLabels.businessStatus),
  ];
}

const initialVisibility = Object.fromEntries(purchaseReturnColumns.map((column) => [column.key, true]));
const columnOptions = purchaseReturnColumns.map((column) => ({ key: column.key, label: column.label }));

function filterRows(row, filters) {
  const returnNo = filters.returnNo.trim().toLowerCase();

  return (!returnNo || String(row.returnNo || '').toLowerCase().includes(returnNo))
    && (!filters.supplier || row.supplier === filters.supplier)
    && (!filters.warehouse || row.warehouse === filters.warehouse)
    && (!filters.sourceInboundNo || row.sourceInboundNo === filters.sourceInboundNo)
    && (!filters.product || row.lines?.some((line) => line.product === filters.product))
    && matchesMultiSelect(row.auditStatus, filters.auditStatus)
    && matchesMultiSelect(row.businessStatus, filters.businessStatus)
    && matchesDateRange(row.createdAt, filters.createdAtRange)
    && matchesDateRange(row.returnDeadline, filters.deadlineRange);
}

function handleCellClick(column, row, { onOpenPage }) {
  if (column.key === 'returnNo') {
    onOpenPage?.('purchase-return-detail', { row });
    return;
  }
  if (column.key === 'sourceInboundNo') {
    const relatedInbound = loadInboundById(row.sourceInboundId)
      || inboundOrders.find((inbound) => inbound.inboundNo === row.sourceInboundNo);
    onOpenPage?.('purchase-inbound-detail', {
      row: relatedInbound || { inboundNo: row.sourceInboundNo, id: row.sourceInboundId },
    });
  }
}

function createRowActionHandler(openDialog) {
  return function handleRowAction(id, row, { notify, onOpenPage }) {
    const latest = loadReturnById(row.id) || row;

    if (id === 'edit') {
      if (!canEditReturn(latest)) {
        notify('仅草稿状态可编辑', 'warning');
        return;
      }
      onOpenPage?.('purchase-return-edit', { row: latest });
      return;
    }
    if (id === 'notice') {
      onOpenPage?.('purchase-return-notice-create', { sourceReturnId: latest.id, row: latest });
      return;
    }
    if (id === 'submit') {
      const result = validateReturnForSubmit(latest);
      if (result) {
        notify(result.message || '请修正表单中的错误后再提交', 'warning');
        return;
      }
      const zeroLines = findZeroPriceLines(latest);
      if (zeroLines.length) {
        openDialog({
          type: 'zeroPrice',
          row: latest,
          description: `第${zeroLines.map(({ index }) => index + 1).join('、')}行含税单价为0，请确认业务约定。`,
          onConfirm: () => openDialog({ type: 'submit', row: latest }),
        });
        return;
      }
      openDialog({ type: 'submit', row: latest });
      return;
    }
    if (id === 'cancel') {
      const blockReason = getReturnCancelBlockReason(latest);
      if (blockReason) {
        notify(blockReason, 'warning');
        return;
      }
    }
    openDialog({ type: id, row: latest });
  };
}

export function PurchaseReturnListPage(props) {
  const [dialog, setDialog] = useState(null);

  const listConfig = useMemo(() => ({
    title: '采购退货单',
    rows: purchaseReturns,
    storageKey: PURCHASE_RETURN_STORAGE_KEY,
    initialFilters,
    filterRows,
    initialVisibility,
    columns: purchaseReturnColumns,
    columnOptions,
    filterFields: createFilterFields(purchaseReturns),
    defaultSort: { key: 'createdAt', direction: 'desc' },
    headerActions: [
      { id: 'create', label: '新增', icon: Plus, variant: 'primary' },
      {
        id: 'import-export',
        render: (ctx) => (
          <ImportExportActions
            target={getTransferTarget('purchase-return')}
            scopeSource={{ all: ctx.state.rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
            defaultColumnKeys={purchaseReturnColumns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
            notify={ctx.notify}
            onOpenPage={ctx.onOpenPage}
          />
        ),
      },
    ],
    toolbarActions: [],
    rowActionsMaxVisible: 3,
    rowActions: [
      { id: 'edit', label: '编辑', visibleWhen: (row) => canEditReturn(row) },
      { id: 'submit', label: '提交', visibleWhen: (row) => canSubmitReturn(row) },
      { id: 'delete', label: '删除', visibleWhen: (row) => canDeleteDraftReturn(row), variant: 'danger' },
      { id: 'approve', label: '审核', visibleWhen: (row) => canApproveReturn(row) },
      { id: 'withdraw', label: '撤回', visibleWhen: (row) => canWithdrawReturn(row) },
      { id: 'notice', label: '下推通知单', visibleWhen: (row) => canPushReturnNotice(row) },
      { id: 'close', label: '关闭', visibleWhen: (row) => canCloseReturn(row) },
      { id: 'adjustDeadline', label: '调整截止时间', visibleWhen: (row) => canAdjustReturnDeadline(row) },
      { id: 'cancel', label: '取消', visibleWhen: (row) => canCancelPendingReturn(row) || canCancelApprovedReturn(row), variant: 'danger' },
    ],
    resetMessage: '筛选条件已重置',
    queryMessage: '已执行采购退货单查询',
    onHeaderAction: (id, { onOpenPage }) => {
      if (id === 'create') onOpenPage?.('purchase-return-create');
    },
    onCellClick: handleCellClick,
    onRowAction: createRowActionHandler(setDialog),
  }), []);

  function handleDialogComplete(result) {
    if (result?.type === 'zeroPriceConfirmed') {
      result.onConfirm?.();
      return;
    }
    if (result?.message) props.onFeedback?.(result.message, result.type || 'success');
    if (result?.followUp === 'mock-notice' && result?.row) {
      setDialog({ type: 'mock-notice', row: loadReturnById(result.row.id) || result.row });
      return;
    }
    setDialog(null);
  }

  return (
    <>
      <DocumentListPage {...props} config={listConfig} />
      <PurchaseReturnActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={props.onFeedback}
      />
    </>
  );
}
