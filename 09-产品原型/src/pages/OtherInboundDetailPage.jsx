import { useEffect, useState } from 'react';
import { DocumentDetailPage } from '../components/erp/DocumentDetailPage.jsx';
import { buildCreateMetaFields } from '../components/erp/DocumentMetaTabsCard.jsx';
import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import { subscribeMockRows } from '../lib/mockStorage.js';
import { productOptions, skuOptions } from '../data/masterData.js';
import { resolveLogicalWarehouseLabel } from '../data/warehouseData.js';
import { otherInboundRequests } from '../data/otherInboundRequestData.js';
import { getOtherInboundStatusBadges } from '../data/otherInboundData.js';
import { loadOtherInboundRequestById } from '../lib/otherInboundRequestLogic.js';
import {
  buildOtherInboundOperationLogs,
  loadOtherInboundById,
  otherInboundSourceTypeLabels,
  OTHER_INBOUND_STORAGE_KEY,
  refreshOtherInboundLines,
} from '../lib/otherInboundLogic.js';

/** 详情行跟随本地 Mock 集合刷新（Demo 生成后金蝶推送状态即时更新）。 */
function useOtherInboundRow(context) {
  const contextRow = context?.row;
  const [row, setRow] = useState(contextRow || null);

  useEffect(() => {
    if (!contextRow?.id) {
      setRow(contextRow || null);
      return undefined;
    }
    function syncRow() {
      setRow(loadOtherInboundById(contextRow.id) || contextRow);
    }
    syncRow();
    return subscribeMockRows(OTHER_INBOUND_STORAGE_KEY, syncRow);
  }, [contextRow]);

  return row;
}

function getOtherInboundDetail(row) {
  if (!row) return { lines: [] };
  return {
    ...row,
    lines: refreshOtherInboundLines(row.lines || []),
  };
}

function buildSourceRequestLink(detail, onOpenPage, onFeedback) {
  if (!detail?.sourceRequestNo) return EMPTY_PLACEHOLDER;
  const relatedRequest = loadOtherInboundRequestById(detail.sourceRequestId)
    || otherInboundRequests.find((item) => item.requestNo === detail.sourceRequestNo || item.id === detail.sourceRequestId);
  return (
    <button
      type="button"
      className="truncate text-erp-primary hover:underline"
      onClick={() => {
        if (!relatedRequest) {
          onFeedback?.('单据不存在或不可访问', 'warning');
          return;
        }
        onOpenPage?.('inventory-other-inbound-request-detail', { row: relatedRequest });
      }}
    >
      {detail.sourceRequestNo}
    </button>
  );
}

/** 单据信息：按 TSV 行序；推送失败原因与备注各占 3 列（详情页 PRD §3.1）。 */
function buildInboundInfoFields({ detail, row, onOpenPage, onFeedback }) {
  return [
    {
      key: 'inboundNo',
      label: '单号',
      value: row.demoMock
        ? (
          <span className="inline-flex items-center gap-1.5">
            <span>{detail.inboundNo}</span>
            <span className="text-erp-text-muted">（Demo 演示数据）</span>
          </span>
        )
        : detail.inboundNo,
    },
    { key: 'sourceType', label: '来源类型', value: otherInboundSourceTypeLabels[detail.sourceType] || detail.sourceType },
    { key: 'sourceRequestNo', label: '来源其他入库申请单', value: buildSourceRequestLink(detail, onOpenPage, onFeedback) },
    { key: 'sourceSystem', label: '来源系统', value: detail.sourceSystem || EMPTY_PLACEHOLDER },
    { key: 'sourceNo', label: '来源单号', value: detail.sourceNo || EMPTY_PLACEHOLDER },
    { key: 'warehouse', label: '入库仓库', value: resolveLogicalWarehouseLabel(detail.warehouse) },
    { key: 'businessType', label: '业务类型', value: detail.businessType || EMPTY_PLACEHOLDER },
    { key: 'actualInboundTime', label: '实际入库时间', value: detail.actualInboundTime || EMPTY_PLACEHOLDER },
    { key: 'businessDate', label: '业务日期', value: detail.businessDate || EMPTY_PLACEHOLDER },
    { key: 'pushTime', label: '推送金蝶时间', value: detail.pushTime || EMPTY_PLACEHOLDER },
    { key: 'pushFailReason', label: '推送失败原因', value: row.pushFailReason || EMPTY_PLACEHOLDER, className: 'col-span-3' },
    { key: 'remark', label: '备注', value: detail.remark || EMPTY_PLACEHOLDER, className: 'col-span-3' },
  ];
}

const otherInboundDetailConfig = {
  listPageId: 'inventory-other-inbound',
  lineSectionTitle: '商品明细',
  lineVariant: 'other-inbound',
  lineEditorOptions: { productOptions, skuOptions },
  getDetail: getOtherInboundDetail,
  title: (detail) => `其他入库单详情${detail.inboundNo ? ` · ${detail.inboundNo}` : ''}`,
  getStatusBadges: (row) => getOtherInboundStatusBadges(row),
  rowKey: (detail) => detail.inboundNo,
  extraSections: [
    {
      title: '审核信息',
      fields: ({ row }) => [
        { key: 'auditor', label: '审核人', value: row.auditor || EMPTY_PLACEHOLDER },
        { key: 'auditTime', label: '审核时间', value: row.auditTime || EMPTY_PLACEHOLDER },
      ],
    },
    {
      title: '操作信息',
      variant: 'meta-tabs',
      defaultTab: 'create',
      tabs: ({ row }) => [
        { key: 'create', label: '制单信息', fields: buildCreateMetaFields({ ...row, creator: row.creator || '系统', updater: row.updater || '系统' }) },
        { key: 'log', label: '操作日志', variant: 'log', logEntries: () => buildOtherInboundOperationLogs(row) },
      ],
    },
  ],
  buildLineSummary: ({ detail, lineTotals }) => ({
    quantity: { label: '实际入库数量', value: detail.totalInboundQty ?? lineTotals.quantity },
  }),
};

export function OtherInboundDetailPage({ onFeedback, onOpenPage, context }) {
  const row = useOtherInboundRow(context);

  const config = {
    ...otherInboundDetailConfig,
    sections: [
      {
        title: '单据信息',
        fields: ({ detail, onOpenPage: openPage }) => buildInboundInfoFields({
          detail,
          row,
          onOpenPage: openPage,
          onFeedback,
        }),
      },
    ],
  };

  return <DocumentDetailPage context={{ row }} onOpenPage={onOpenPage} config={config} />;
}
