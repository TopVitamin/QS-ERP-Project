import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../components/ui/button.jsx';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { OtherOutboundRequestActionDialogs } from '../components/erp/OtherOutboundRequestActionDialogs.jsx';
import { getTransferTarget } from '../lib/transferTargets.js';
import { matchesDateRange, matchesMultiSelect, statusMultiSelectField } from '../lib/listFilters.js';
import {
  canApproveRequest,
  canCancelRequest,
  canDeleteRequest,
  canEditRequest,
  canRetryPushRequest,
  canSubmitRequest,
  canWithdrawRequest,
  loadOtherOutboundRequestById,
  OTHER_OUTBOUND_REQUEST_STORAGE_KEY,
  otherOutboundBusinessTypeOptions,
  otherOutboundRequestStatusLabels,
} from '../lib/otherOutboundRequestLogic.js';
import { otherOutboundRequestColumns, otherOutboundRequests } from '../data/otherOutboundRequestData.js';
import { getInventoryLogicalWarehouseOptions } from '../data/warehouseData.js';

const initialFilters = {
  requestNo: '',
  logicalWarehouse: '',
  businessType: '',
  status: [],
  createdAtRange: { from: '', to: '' },
  productCode: '',
};

/** 查询区按《其他出库申请单前端Demo版PRD_列表页》§2 顺序：单号、出库仓、业务类型、单据状态、创建时间、商品。 */
const filterFields = [
  { key: 'requestNo', label: '单号', type: 'search', placeholder: '请输入其他出库申请单号' },
  {
    key: 'logicalWarehouse',
    label: '出库仓',
    type: 'select',
    options: [
      { value: '', label: '全部' },
      ...getInventoryLogicalWarehouseOptions({ includeDisabled: false, includeTransit: true }),
    ],
  },
  {
    key: 'businessType',
    label: '业务类型',
    type: 'select',
    options: [{ value: '', label: '全部' }, ...otherOutboundBusinessTypeOptions],
  },
  statusMultiSelectField('status', '单据状态', otherOutboundRequestStatusLabels),
  { key: 'createdAtRange', label: '创建时间', type: 'date-range', placeholder: '不限' },
  { key: 'productCode', label: '商品', type: 'search', placeholder: '请输入商品编码' },
];

const initialVisibility = Object.fromEntries(otherOutboundRequestColumns.map((column) => [column.key, true]));
const columnOptions = otherOutboundRequestColumns.map((column) => ({ key: column.key, label: column.label }));

function filterRows(row, filters) {
  const requestNo = filters.requestNo.trim().toLowerCase();
  const productCode = filters.productCode.trim().toLowerCase();

  return (!requestNo || String(row.requestNo || '').toLowerCase().includes(requestNo))
    && (!filters.logicalWarehouse || row.logicalWarehouse === filters.logicalWarehouse)
    && (!filters.businessType || row.businessType === filters.businessType)
    && matchesMultiSelect(row.status, filters.status)
    && matchesDateRange(row.createdAt, filters.createdAtRange)
    && (!productCode || row.lines?.some((line) => String(line.productCode || '').toLowerCase().includes(productCode)));
}

function handleCellClick(column, row, { onOpenPage }) {
  if (column.key === 'requestNo') {
    onOpenPage?.('inventory-other-outbound-request-detail', { row });
  }
}

function createRowActionHandler(openDialog) {
  return function handleRowAction(id, row, { notify, onOpenPage }) {
    const latest = loadOtherOutboundRequestById(row.id) || row;

    if (id === 'edit') {
      if (!canEditRequest(latest)) {
        notify(`当前单据状态为${otherOutboundRequestStatusLabels[latest.status] || latest.status}，不可执行编辑`, 'warning');
        return;
      }
      onOpenPage?.('inventory-other-outbound-request-edit', { row: latest });
      return;
    }
    if (id === 'submit' && !canSubmitRequest(latest)) {
      notify(`当前单据状态为${otherOutboundRequestStatusLabels[latest.status] || latest.status}，不可执行提交`, 'warning');
      return;
    }
    if (id === 'delete' && !canDeleteRequest(latest)) {
      notify(`当前单据状态为${otherOutboundRequestStatusLabels[latest.status] || latest.status}，不可执行删除`, 'warning');
      return;
    }
    if (id === 'approve' && !canApproveRequest(latest)) {
      notify(`当前单据状态为${otherOutboundRequestStatusLabels[latest.status] || latest.status}，不可执行审核`, 'warning');
      return;
    }
    if (id === 'withdraw' && !canWithdrawRequest(latest)) {
      notify(`当前单据状态为${otherOutboundRequestStatusLabels[latest.status] || latest.status}，不可执行撤回`, 'warning');
      return;
    }
    if (id === 'cancel' && !canCancelRequest(latest)) {
      notify(`当前单据状态为${otherOutboundRequestStatusLabels[latest.status] || latest.status}，不可执行取消`, 'warning');
      return;
    }
    if (id === 'retry' && !canRetryPushRequest(latest)) {
      notify(`当前单据状态为${otherOutboundRequestStatusLabels[latest.status] || latest.status}，不可执行重试推送`, 'warning');
      return;
    }

    openDialog({ type: id, row: latest });
  };
}

export function OtherOutboundRequestListPage(props) {
  const [dialog, setDialog] = useState(null);

  const listConfig = useMemo(() => ({
    title: '其他出库申请单',
    rows: otherOutboundRequests,
    storageKey: OTHER_OUTBOUND_REQUEST_STORAGE_KEY,
    initialFilters,
    initialPinnedKeys: ['requestNo'],
    filterRows,
    initialVisibility,
    columns: otherOutboundRequestColumns,
    columnOptions,
    filterFields,
    defaultSort: { key: 'createdAt', direction: 'desc' },
    headerActions: [
      {
        id: 'create',
        label: '新增',
        variant: 'primary',
        icon: Plus,
        ariaLabel: '新增其他出库申请单',
      },
      {
        id: 'import-export',
        render: (ctx) => (
          <ImportExportActions
            target={getTransferTarget('other-outbound-request')}
            scopeSource={{ all: ctx.state.rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
            defaultColumnKeys={otherOutboundRequestColumns
              .filter((column) => ctx.state.visibility[column.key] !== false)
              .map((column) => column.key)}
            notify={ctx.notify}
            onOpenPage={ctx.onOpenPage}
          />
        ),
      },
    ],
    onHeaderAction: (id, { onOpenPage }) => {
      if (id === 'create') onOpenPage?.('inventory-other-outbound-request-create');
    },
    toolbarActions: [],
    rowActionsMaxVisible: 3,
    rowActions: [
      { id: 'edit', label: '编辑', visibleWhen: (row) => canEditRequest(row) },
      { id: 'submit', label: '提交', visibleWhen: (row) => canSubmitRequest(row) },
      { id: 'delete', label: '删除', visibleWhen: (row) => canDeleteRequest(row), variant: 'danger' },
      { id: 'approve', label: '审核', visibleWhen: (row) => canApproveRequest(row) },
      { id: 'withdraw', label: '撤回', visibleWhen: (row) => canWithdrawRequest(row) },
      // 推送失败按「重试推送 → 取消」排列，与详情页头顺序一致
      { id: 'retry', label: '重试推送', visibleWhen: (row) => canRetryPushRequest(row) },
      { id: 'cancel', label: '取消', visibleWhen: (row) => canCancelRequest(row), variant: 'danger' },
    ],
    resetMessage: '筛选条件已重置',
    queryMessage: null,
    onCellClick: handleCellClick,
    onRowAction: createRowActionHandler(setDialog),
    emptyText: '暂无其他出库申请单',
    emptyTextFiltered: '该条件下暂无其他出库申请单，可调整查询条件后重试',
  }), []);

  function handleDialogComplete(result) {
    if (result?.message) props.onFeedback?.(result.message, result.type || 'success');
    setDialog(null);
  }

  return (
    <>
      <DocumentListPage {...props} config={listConfig} />
      <OtherOutboundRequestActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={props.onFeedback}
      />
    </>
  );
}
