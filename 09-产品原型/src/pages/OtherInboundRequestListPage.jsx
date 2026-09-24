import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { OtherInboundRequestActionDialogs } from '../components/erp/OtherInboundRequestActionDialogs.jsx';
import { getTransferTarget } from '../lib/transferTargets.js';
import { matchesBatchSearch, matchesDateRange, matchesMultiSelect, statusMultiSelectField } from '../lib/listFilters.js';
import {
  otherInboundRequestColumns,
  otherInboundRequests,
} from '../data/otherInboundRequestData.js';import {
  buildStatusMismatchMessage,
  canApplyCancelRequest,
  canApproveRequest,
  canCancelApprovedRequest,
  canCancelPendingRequest,
  canDeleteRequest,
  canEditRequest,
  canRetryPushRequest,
  canSubmitRequest,
  canWithdrawRequest,
  getRequestWarehouseOptions,
  loadOtherInboundRequestById,
  OTHER_INBOUND_REQUEST_STORAGE_KEY,
  otherInboundRequestBusinessTypes,
  otherInboundRequestStatusLabels,
} from '../lib/otherInboundRequestLogic.js';

const initialFilters = {
  requestNo: '',
  warehouse: '',
  businessType: '',
  status: [],
  createdAtRange: { from: '', to: '' },
  productCode: '',
};

const filterFields = [
  { key: 'requestNo', label: '单号', type: 'search', placeholder: '请输入其他入库申请单号' },
  {
    key: 'warehouse',
    label: '入库仓',
    type: 'select',
    placeholder: '全部',
    options: [{ value: '', label: '全部' }, ...getRequestWarehouseOptions()],
  },
  {
    key: 'businessType',
    label: '业务类型',
    type: 'select',
    placeholder: '全部',
    options: [{ value: '', label: '全部' }, ...otherInboundRequestBusinessTypes.map((value) => ({ value, label: value }))],
  },
  statusMultiSelectField('status', '单据状态', otherInboundRequestStatusLabels),
  { key: 'createdAtRange', label: '创建时间', type: 'date-range', placeholder: '不限' },
  { key: 'productCode', label: '商品', type: 'search', placeholder: '请输入商品编码' },
];

const initialVisibility = Object.fromEntries(otherInboundRequestColumns.map((column) => [column.key, true]));
const columnOptions = otherInboundRequestColumns.map((column) => ({ key: column.key, label: column.label }));

function filterRows(row, filters) {
  const requestNo = String(filters.requestNo || '').trim().toLowerCase();

  return (!requestNo || String(row.requestNo || '').toLowerCase().includes(requestNo))
    && (!filters.warehouse || row.warehouse === filters.warehouse)
    && (!filters.businessType || row.businessType === filters.businessType)
    && matchesMultiSelect(row.status, filters.status)
    && matchesDateRange(row.createdAt, filters.createdAtRange)
    && (!filters.productCode || row.lines?.some((line) => matchesBatchSearch(line.productCode, filters.productCode)));
}

const rowActions = [
  { id: 'edit', label: '编辑', visibleWhen: (row) => canEditRequest(row) },
  { id: 'submit', label: '提交', visibleWhen: (row) => canSubmitRequest(row) },
  { id: 'delete', label: '删除', visibleWhen: (row) => canDeleteRequest(row), variant: 'danger' },
  { id: 'approve', label: '审核', visibleWhen: (row) => canApproveRequest(row) },
  { id: 'withdraw', label: '撤回', visibleWhen: (row) => canWithdrawRequest(row) },
  { id: 'retry', label: '重试推送', visibleWhen: (row) => canRetryPushRequest(row) },
  { id: 'cancel', label: '取消', visibleWhen: (row) => canCancelPendingRequest(row) || canCancelApprovedRequest(row), variant: 'danger' },
  { id: 'apply-cancel', label: '取消', visibleWhen: (row) => canApplyCancelRequest(row), variant: 'danger' },
];

function handleHeaderAction(id, { onOpenPage }) {
  if (id === 'create') onOpenPage?.('inventory-other-inbound-request-create');
}

function handleCellClick(column, row, { onOpenPage }) {
  if (column.key === 'requestNo') onOpenPage?.('inventory-other-inbound-request-detail', { row });
}

const ROW_ACTION_LABELS = {
  submit: '提交',
  approve: '审核',
  withdraw: '撤回',
  retry: '重试推送',
  cancel: '取消',
  'apply-cancel': '取消',
};

const ROW_ACTION_GUARDS = {
  submit: canSubmitRequest,
  approve: canApproveRequest,
  withdraw: canWithdrawRequest,
  retry: canRetryPushRequest,
  cancel: (row) => canCancelPendingRequest(row) || canCancelApprovedRequest(row),
  'apply-cancel': canApplyCancelRequest,
};

function createRowActionHandler(openDialog) {
  return function handleRowAction(id, row, { notify, onOpenPage }) {
    const latest = loadOtherInboundRequestById(row.id) || row;

    if (id === 'edit') {
      if (!canEditRequest(latest)) {
        notify(buildStatusMismatchMessage(latest, '编辑'), 'warning');
        return;
      }
      onOpenPage?.('inventory-other-inbound-request-edit', { row: latest });
      return;
    }

    const guard = ROW_ACTION_GUARDS[id];
    if (guard && !guard(latest)) {
      notify(buildStatusMismatchMessage(latest, ROW_ACTION_LABELS[id] || '操作'), 'warning');
      return;
    }

    openDialog({ type: id, row: latest });
  };
}

const requestListConfig = {
  title: '其他入库申请单',
  rows: otherInboundRequests,
  storageKey: OTHER_INBOUND_REQUEST_STORAGE_KEY,
  initialFilters,
  initialPinnedKeys: ['requestNo'],
  filterRows,
  initialVisibility,
  columns: otherInboundRequestColumns,
  columnOptions,
  filterFields,
  defaultSort: { key: 'createdAt', direction: 'desc' },
  headerActions: [
    { id: 'create', label: '新增', icon: Plus, variant: 'primary' },
    {
      id: 'import-export',
      render: (ctx) => (
        <ImportExportActions
          target={getTransferTarget('other-inbound-request')}
          scopeSource={{ all: ctx.state.rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
          defaultColumnKeys={otherInboundRequestColumns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
          notify={ctx.notify}
          onOpenPage={ctx.onOpenPage}
        />
      ),
    },
  ],
  toolbarActions: [],
  rowActionsMaxVisible: 3,
  rowActions,
  resetMessage: '筛选条件已重置',
  queryMessage: null,
  emptyText: '暂无其他入库申请单',
  emptyTextFiltered: '该条件下暂无其他入库申请单，可调整查询条件后重试',
  onHeaderAction: handleHeaderAction,
  onCellClick: handleCellClick,
};

export function OtherInboundRequestListPage(props) {
  const [dialog, setDialog] = useState(null);
  const config = useMemo(() => ({ ...requestListConfig, onRowAction: createRowActionHandler(setDialog) }), []);

  function handleDialogComplete(result) {
    if (result?.message) props.onFeedback?.(result.message, result.type || 'success');
    setDialog(null);
  }

  return (
    <>
      <DocumentListPage {...props} config={config} />
      <OtherInboundRequestActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={props.onFeedback}
      />
    </>
  );
}
