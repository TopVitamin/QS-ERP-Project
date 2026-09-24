import { useMemo, useState } from 'react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { ImportExportActions } from '../components/erp/ImportExportActions.jsx';
import { OtherOutboundActionDialogs } from '../components/erp/OtherOutboundActionDialogs.jsx';
import { getTransferTarget } from '../lib/transferTargets.js';
import { matchesMultiSelect, statusMultiSelectField } from '../lib/listFilters.js';
import {
  financeErpPushStatusLabels,
  otherOutboundAuditLabels,
  otherOutboundSourceTypeLabels,
  OTHER_OUTBOUND_STORAGE_KEY,
} from '../lib/otherOutboundLogic.js';
import { otherOutboundBusinessTypeOptions, loadOtherOutboundRequestByNo } from '../lib/otherOutboundRequestLogic.js';
import { otherOutboundColumns, otherOutbounds, buildSourceRequestFilterOptions } from '../data/otherOutboundData.js';
import { getInventoryLogicalWarehouseOptions } from '../data/warehouseData.js';

const initialFilters = {
  outboundNo: '',
  sourceRequestNo: '',
  sourceType: '',
  logicalWarehouse: '',
  businessType: '',
  auditStatus: [],
  financeErpPushStatus: [],
  productCode: '',
};

/** 查询区按《其他出库单前端Demo版PRD_列表页》§2 顺序：单号、来源申请单、来源类型、出库仓库、业务类型、审核状态、推送财务ERP状态、商品。 */
const filterFields = [
  { key: 'outboundNo', label: '单号', type: 'search', placeholder: '请输入其他出库单号' },
  { key: 'sourceRequestNo', label: '来源其他出库申请单', type: 'select', options: buildSourceRequestFilterOptions(otherOutbounds) },
  {
    key: 'sourceType',
    label: '来源类型',
    type: 'select',
    options: [{ value: '', label: '全部' }, ...Object.entries(otherOutboundSourceTypeLabels).map(([value, label]) => ({ value, label }))],
  },
  {
    key: 'logicalWarehouse',
    label: '出库仓库',
    type: 'select',
    options: [
      { value: '', label: '全部' },
      ...getInventoryLogicalWarehouseOptions({ includeDisabled: true, includeTransit: true }),
    ],
  },
  {
    key: 'businessType',
    label: '业务类型',
    type: 'select',
    options: [{ value: '', label: '全部' }, ...otherOutboundBusinessTypeOptions],
  },
  statusMultiSelectField('auditStatus', '审核状态', otherOutboundAuditLabels),
  statusMultiSelectField('financeErpPushStatus', '推送财务ERP状态', financeErpPushStatusLabels),
  { key: 'productCode', label: '商品', type: 'search', placeholder: '请输入商品编码' },
];

const initialVisibility = Object.fromEntries(otherOutboundColumns.map((column) => [column.key, true]));
const columnOptions = otherOutboundColumns.map((column) => ({ key: column.key, label: column.label }));

function filterRows(row, filters) {
  const outboundNo = filters.outboundNo.trim().toLowerCase();
  const productCode = filters.productCode.trim().toLowerCase();

  return (!outboundNo || String(row.outboundNo || '').toLowerCase().includes(outboundNo))
    && (!filters.sourceRequestNo || row.sourceRequestNo === filters.sourceRequestNo)
    && (!filters.sourceType || row.sourceType === filters.sourceType)
    && (!filters.logicalWarehouse || row.logicalWarehouse === filters.logicalWarehouse)
    && (!filters.businessType || row.businessType === filters.businessType)
    && matchesMultiSelect(row.auditStatus, filters.auditStatus)
    && matchesMultiSelect(row.financeErpPushStatus, filters.financeErpPushStatus)
    && (!productCode || row.lines?.some((line) => String(line.productCode || '').toLowerCase().includes(productCode)));
}

function handleCellClick(column, row, { notify, onOpenPage }) {
  if (column.key === 'outboundNo') {
    onOpenPage?.('inventory-other-outbound-detail', { row });
    return;
  }
  if (column.key === 'sourceRequestNo') {
    if (!row.sourceRequestNo) return;
    const request = loadOtherOutboundRequestByNo(row.sourceRequestNo);
    if (!request) {
      notify?.('单据不存在或不可访问', 'warning');
      return;
    }
    onOpenPage?.('inventory-other-outbound-request-detail', { row: request });
  }
}

export function OtherOutboundListPage(props) {
  const [dialog, setDialog] = useState(null);

  const listConfig = useMemo(() => ({
    title: '其他出库单',
    rows: otherOutbounds,
    storageKey: OTHER_OUTBOUND_STORAGE_KEY,
    initialFilters,
    initialPinnedKeys: ['outboundNo'],
    filterRows,
    initialVisibility,
    columns: otherOutboundColumns,
    columnOptions,
    filterFields,
    // 默认按业务日期倒序；业务日期不作为列表列（其他出库单主PRD §7.4）
    defaultSort: { key: 'businessDate', direction: 'desc' },
    headerActions: [
      {
        id: 'import-export',
        render: (ctx) => (
          <ImportExportActions
            target={getTransferTarget('other-outbound')}
            scopeSource={{ all: ctx.state.rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
            defaultColumnKeys={otherOutboundColumns
              .filter((column) => ctx.state.visibility[column.key] !== false)
              .map((column) => column.key)}
            notify={ctx.notify}
            onOpenPage={ctx.onOpenPage}
          />
        ),
      },
      {
        id: 'mock-warehouse-outbound',
        label: '模拟仓库主动回传(Mock)',
        variant: 'outline',
        ariaLabel: '模拟仓库主动回传（Mock）',
      },
    ],
    onHeaderAction: (id) => {
      if (id === 'mock-warehouse-outbound') setDialog({ type: 'mock-warehouse-outbound' });
    },
    toolbarActions: [],
    // 出库单整单只读：无行内业务按钮，查看通过单号链接进入详情（列表页 §6）
    rowActions: [],
    resetMessage: '筛选条件已重置',
    queryMessage: null,
    onCellClick: handleCellClick,
    emptyText: '暂无其他出库单',
    emptyTextFiltered: '该条件下暂无其他出库单，可调整查询条件后重试',
  }), []);

  function handleDialogComplete(result) {
    if (result?.message) props.onFeedback?.(result.message, result.type || 'success');
    setDialog(null);
  }

  return (
    <>
      <DocumentListPage {...props} config={listConfig} />
      <OtherOutboundActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        onNotify={props.onFeedback}
      />
    </>
  );
}
