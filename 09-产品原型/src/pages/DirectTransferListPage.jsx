import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { DirectTransferActionDialogs } from '../components/erp/DirectTransferActionDialogs.jsx';
import { matchesDateRange, matchesMultiSelect, statusMultiSelectField } from '../lib/listFilters.js';
import { getTransferTarget } from '../lib/transferTargets.js';
import { getInventoryLogicalWarehouseOptions } from '../data/warehouseData.js';
import { directTransferColumns, directTransfers } from '../data/directTransferData.js';
import { transferOrders } from '../data/transferOrderData.js';
import {
  canApproveDirectTransfer,
  canDeleteDirectTransfer,
  canEditDirectTransfer,
  canSubmitDirectTransfer,
  canWithdrawDirectTransfer,
  directTransferAuditLabels,
  directTransferSourceTypeLabels,
  kingdeePushStatusLabels,
  loadDirectTransferById,
  DIRECT_TRANSFER_STORAGE_KEY,
} from '../lib/directTransferLogic.js';
import { loadTransferOutNoticeByNo } from '../lib/transferOutNoticeLogic.js';
import { loadTransferInNoticeByNo } from '../lib/transferInNoticeLogic.js';
import { loadTransferOrderById } from '../lib/transferOrderLogic.js';
import { toSelectOptions } from '../lib/options.js';

/**
 * 直接调拨单列表（F01）：新增只创建人工一步式；分步式两端与仓库主动回传结果不提供人工建单。
 * 查询区与列见《列表页 Demo PRD》§2、§4；默认按业务日期倒序（业务日期不列表展示）。
 */

const initialFilters = {
  transferNo: '',
  sourceType: '',
  sourceOrderNo: '',
  sourceNoticeNo: '',
  fromWarehouse: '',
  toWarehouse: '',
  auditStatus: [],
  kingdeePushStatus: [],
  product: '',
  createdAtRange: { from: '', to: '' },
};

// 结果单筛选含虚拟在途仓：分步式两端结果的来源／目标逻辑仓由系统写入在途仓（列表页 Demo PRD §2）。
const allWarehouseOptions = getInventoryLogicalWarehouseOptions({ includeDisabled: true, includeTransit: true });

const filterFields = [
  { key: 'transferNo', label: '单号', type: 'search', placeholder: '请输入直接调拨单号' },
  { key: 'sourceType', label: '来源类型', type: 'select', placeholder: '全部', options: [{ value: '', label: '全部' }, ...toSelectOptions(directTransferSourceTypeLabels)] },
  { key: 'sourceOrderNo', label: '来源分步式调拨单', type: 'search', placeholder: '请输入来源分步式调拨单号' },
  { key: 'sourceNoticeNo', label: '来源通知单', type: 'search', placeholder: '请输入来源调出／调入通知单号' },
  { key: 'fromWarehouse', label: '来源逻辑仓', type: 'searchable-select', placeholder: '全部', options: allWarehouseOptions },
  { key: 'toWarehouse', label: '目标逻辑仓', type: 'searchable-select', placeholder: '全部', options: allWarehouseOptions },
  statusMultiSelectField('auditStatus', '审核状态', directTransferAuditLabels),
  statusMultiSelectField('kingdeePushStatus', '金蝶推送状态', kingdeePushStatusLabels),
  { key: 'product', label: '商品', type: 'search', placeholder: '请输入商品编码' },
  { key: 'createdAtRange', label: '创建时间', type: 'date-range', placeholder: '不限' },
];

const initialVisibility = Object.fromEntries(directTransferColumns.map((column) => [column.key, true]));
const columnOptions = directTransferColumns.map((column) => ({ key: column.key, label: column.label }));

function filterRows(row, filters) {
  const transferNo = filters.transferNo.trim().toLowerCase();
  const sourceOrderNo = filters.sourceOrderNo.trim().toLowerCase();
  const sourceNoticeNo = filters.sourceNoticeNo.trim().toLowerCase();
  const product = filters.product.trim().toLowerCase();

  return (!transferNo || String(row.transferNo || '').toLowerCase().includes(transferNo))
    && (!filters.sourceType || row.sourceType === filters.sourceType)
    && (!sourceOrderNo || String(row.sourceOrderNo || '').toLowerCase().includes(sourceOrderNo))
    && (!sourceNoticeNo || String(row.sourceNoticeNo || '').toLowerCase().includes(sourceNoticeNo))
    && (!filters.fromWarehouse || row.fromWarehouse === filters.fromWarehouse)
    && (!filters.toWarehouse || row.toWarehouse === filters.toWarehouse)
    && matchesMultiSelect(row.auditStatus, filters.auditStatus)
    && matchesMultiSelect(row.kingdeePushStatus, filters.kingdeePushStatus)
    && matchesDateRange(row.createdAt, filters.createdAtRange)
    && (!product || row.lines?.some((line) => String(line.productCode || '').toLowerCase().includes(product)));
}

function handleCellClick(column, row, { onOpenPage }) {
  if (column.key === 'transferNo') {
    onOpenPage?.('inventory-direct-transfer-detail', { row });
    return;
  }
  if (column.key === 'sourceOrderNo') {
    const order = loadTransferOrderById(row.sourceOrderId)
      || transferOrders.find((item) => item.orderNo === row.sourceOrderNo);
    onOpenPage?.('inventory-transfer-order-detail', {
      row: order || { orderNo: row.sourceOrderNo, id: row.sourceOrderId },
    });
    return;
  }
  if (column.key === 'sourceNoticeNo' && row.sourceNoticeNo) {
    if (row.sourceType === 'step_in') {
      const notice = loadTransferInNoticeByNo(row.sourceNoticeNo);
      onOpenPage?.('inventory-transfer-in-notice-detail', {
        row: notice || { noticeNo: row.sourceNoticeNo, id: row.sourceNoticeId },
      });
      return;
    }
    const notice = loadTransferOutNoticeByNo(row.sourceNoticeNo);
    onOpenPage?.('inventory-transfer-out-notice-detail', {
      row: notice || { noticeNo: row.sourceNoticeNo, id: row.sourceNoticeId },
    });
  }
}

function createRowActionHandler(openDialog) {
  return function handleRowAction(id, row, { notify, onOpenPage }) {
    const latest = loadDirectTransferById(row.id) || row;

    if (id === 'edit') {
      if (!canEditDirectTransfer(latest)) {
        notify('操作失败，单据状态已变更，请刷新后重试', 'warning');
        return;
      }
      onOpenPage?.('inventory-direct-transfer-edit', { row: latest });
      return;
    }
    if (id === 'submit' || id === 'withdraw' || id === 'delete' || id === 'approve') {
      openDialog({ type: id, row: latest });
    }
  };
}

export function DirectTransferListPage(props) {
  const [dialog, setDialog] = useState(null);

  const listConfig = useMemo(() => ({
    title: '直接调拨单',
    rows: directTransfers,
    storageKey: DIRECT_TRANSFER_STORAGE_KEY,
    initialFilters,
    initialPinnedKeys: ['transferNo'],
    filterRows,
    initialVisibility,
    columns: directTransferColumns,
    columnOptions,
    filterFields,
    defaultSort: { key: 'businessDate', direction: 'desc' },
    headerActions: [
      { id: 'create', label: '新增', variant: 'primary', icon: Plus },
      { id: 'mock-callback', label: '模拟回传生成(Mock)', variant: 'outline' },
      {
        id: 'import-export',
        render: (ctx) => (
          <ImportExportActions
            target={getTransferTarget('direct-transfer')}
            scopeSource={{ all: ctx.state.rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
            defaultColumnKeys={directTransferColumns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
            notify={ctx.notify}
            onOpenPage={ctx.onOpenPage}
          />
        ),
      },
    ],
    onHeaderAction: (id, ctx) => {
      if (id === 'create') ctx.onOpenPage?.('inventory-direct-transfer-create');
      if (id === 'mock-callback') setDialog({ type: 'mock-callback' });
    },
    toolbarActions: [],
    rowActionsMaxVisible: 3,
    rowActions: [
      { id: 'edit', label: '编辑', visibleWhen: (row) => canEditDirectTransfer(row) },
      { id: 'submit', label: '提交', visibleWhen: (row) => canSubmitDirectTransfer(row) },
      { id: 'delete', label: '删除', visibleWhen: (row) => canDeleteDirectTransfer(row), variant: 'danger' },
      { id: 'approve', label: '审核', visibleWhen: (row) => canApproveDirectTransfer(row) },
      { id: 'withdraw', label: '撤回', visibleWhen: (row) => canWithdrawDirectTransfer(row) },
    ],
    resetMessage: '筛选条件已重置',
    queryMessage: '已执行直接调拨单查询',
    emptyText: '暂无直接调拨单',
    emptyTextFiltered: '该条件下暂无直接调拨单，可调整查询条件后重试',
    onCellClick: handleCellClick,
    onRowAction: createRowActionHandler(setDialog),
  }), []);

  function handleDialogComplete(result) {
    if (result?.message) props.onFeedback?.(result.message, result.type || 'success');
    setDialog(null);
  }

  return (
    <>
      <DocumentListPage {...props} config={listConfig} />
      <DirectTransferActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={props.onFeedback}
      />
    </>
  );
}
