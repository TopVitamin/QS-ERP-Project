import { useMemo, useState } from 'react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { OtherInboundActionDialogs } from '../components/erp/OtherInboundActionDialogs.jsx';
import { getTransferTarget } from '../lib/transferTargets.js';
import { matchesBatchSearch, matchesMultiSelect, statusMultiSelectField } from '../lib/listFilters.js';
import { getInventoryLogicalWarehouseOptions } from '../data/warehouseData.js';
import { otherInboundRequests } from '../data/otherInboundRequestData.js';
import {
  buildSourceRequestFilterOptions,
  otherInboundColumns,
  otherInbounds,
} from '../data/otherInboundData.js';
import {
  financeErpPushStatusLabels,
  otherInboundAuditLabels,
  otherInboundBusinessTypes,
  otherInboundSourceTypeLabels,
  OTHER_INBOUND_STORAGE_KEY,
} from '../lib/otherInboundLogic.js';
import { loadOtherInboundRequestById } from '../lib/otherInboundRequestLogic.js';

const initialFilters = {
  inboundNo: '',
  sourceRequestNo: '',
  sourceType: '',
  warehouse: '',
  businessType: '',
  auditStatus: [],
  financeErpPushStatus: [],
  productCode: '',
};

const filterFields = [
  { key: 'inboundNo', label: '单号', type: 'search', placeholder: '请输入其他入库单号' },
  { key: 'sourceRequestNo', label: '来源其他入库申请单', type: 'select', placeholder: '全部', options: buildSourceRequestFilterOptions(otherInbounds) },
  {
    key: 'sourceType',
    label: '来源类型',
    type: 'select',
    placeholder: '全部',
    options: [{ value: '', label: '全部' }, ...Object.entries(otherInboundSourceTypeLabels).map(([value, label]) => ({ value, label }))],
  },
  {
    key: 'warehouse',
    label: '入库仓库',
    type: 'select',
    placeholder: '全部',
    options: [{ value: '', label: '全部' }, ...getInventoryLogicalWarehouseOptions()],
  },
  {
    key: 'businessType',
    label: '业务类型',
    type: 'select',
    placeholder: '全部',
    options: [{ value: '', label: '全部' }, ...otherInboundBusinessTypes.map((value) => ({ value, label: value }))],
  },
  statusMultiSelectField('auditStatus', '审核状态', otherInboundAuditLabels),
  statusMultiSelectField('financeErpPushStatus', '推送财务ERP状态', financeErpPushStatusLabels),
  { key: 'productCode', label: '商品', type: 'search', placeholder: '请输入商品编码' },
];

const initialVisibility = Object.fromEntries(otherInboundColumns.map((column) => [column.key, true]));
const columnOptions = otherInboundColumns.map((column) => ({ key: column.key, label: column.label }));

function filterRows(row, filters) {
  const inboundNo = String(filters.inboundNo || '').trim().toLowerCase();

  return (!inboundNo || String(row.inboundNo || '').toLowerCase().includes(inboundNo))
    && (!filters.sourceRequestNo || row.sourceRequestNo === filters.sourceRequestNo)
    && (!filters.sourceType || row.sourceType === filters.sourceType)
    && (!filters.warehouse || row.warehouse === filters.warehouse)
    && (!filters.businessType || row.businessType === filters.businessType)
    && matchesMultiSelect(row.auditStatus, filters.auditStatus)
    && matchesMultiSelect(row.financeErpPushStatus, filters.financeErpPushStatus)
    && (!filters.productCode || row.lines?.some((line) => matchesBatchSearch(line.productCode, filters.productCode)));
}

function handleCellClick(column, row, { onOpenPage }) {
  if (column.key === 'inboundNo') {
    onOpenPage?.('inventory-other-inbound-detail', { row });
    return;
  }
  if (column.key === 'sourceRequestNo' && row.sourceRequestNo) {
    const relatedRequest = loadOtherInboundRequestById(row.sourceRequestId)
      || otherInboundRequests.find((item) => item.requestNo === row.sourceRequestNo || item.id === row.sourceRequestId);
    onOpenPage?.('inventory-other-inbound-request-detail', {
      row: relatedRequest || { id: row.sourceRequestId, requestNo: row.sourceRequestNo },
    });
  }
}

export function OtherInboundListPage(props) {
  const [dialog, setDialog] = useState(null);

  const listConfig = useMemo(() => ({
    title: '其他入库单',
    rows: otherInbounds,
    storageKey: OTHER_INBOUND_STORAGE_KEY,
    initialFilters,
    initialPinnedKeys: ['inboundNo'],
    filterRows,
    initialVisibility,
    columns: otherInboundColumns,
    columnOptions,
    filterFields,
    // 默认按业务日期倒序（该字段不展示为列，主PRD §7.4）。
    defaultSort: { key: 'businessDate', direction: 'desc' },
    headerActions: [
      { id: 'mock-warehouse-push', label: '模拟仓库主动回传(Mock)', variant: 'outline' },
      {
        id: 'import-export',
        render: (ctx) => (
          <ImportExportActions
            target={getTransferTarget('other-inbound')}
            scopeSource={{ all: ctx.state.rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
            defaultColumnKeys={otherInboundColumns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
            notify={ctx.notify}
            onOpenPage={ctx.onOpenPage}
          />
        ),
      },
    ],
    toolbarActions: [],
    // 结果单整单只读：无新增、无编辑、无取消/作废、无行内重推（主PRD §6.4）。
    rowActions: [],
    resetMessage: '筛选条件已重置',
    queryMessage: null,
    emptyText: '暂无其他入库单',
    emptyTextFiltered: '该条件下暂无其他入库单，可调整查询条件后重试',
    onHeaderAction: (id) => {
      if (id === 'mock-warehouse-push') setDialog({ type: 'warehouse-push' });
    },
    onCellClick: handleCellClick,
  }), []);

  function handleDialogComplete(result) {
    if (result?.message) props.onFeedback?.(result.message, result.type || 'success');
    setDialog(null);
  }

  return (
    <>
      <DocumentListPage {...props} config={listConfig} />
      <OtherInboundActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={props.onFeedback}
      />
    </>
  );
}
