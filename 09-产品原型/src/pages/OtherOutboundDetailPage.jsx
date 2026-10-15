import { DocumentDetailPage } from '../components/erp/DocumentDetailPage.jsx';
import { productOptions, skuOptions } from '../data/masterData.js';
import { buildOperationInfoTabs } from '../components/erp/DocumentMetaTabsCard.jsx';
import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import { useDocumentRow } from '../hooks/useDocumentRow.js';
import {
  buildOtherOutboundOperationLogs,
  loadOtherOutboundById,
  otherOutboundSourceTypeLabels,
  OTHER_OUTBOUND_STORAGE_KEY,
  refreshOtherOutboundLines,
} from '../lib/otherOutboundLogic.js';
import { loadOtherOutboundRequestByNo } from '../lib/otherOutboundRequestLogic.js';
import { getOtherOutboundStatusBadges } from '../data/otherOutboundData.js';
import { resolveLogicalWarehouseLabel } from '../data/warehouseData.js';

function getOutboundDetail(row) {
  if (!row) return { lines: [] };
  return {
    ...row,
    lines: refreshOtherOutboundLines(row.lines || []),
  };
}

function buildSourceRequestLink(detail, { onOpenPage, onFeedback }) {
  if (!detail?.sourceRequestNo) return EMPTY_PLACEHOLDER;
  const request = loadOtherOutboundRequestByNo(detail.sourceRequestNo);
  return (
    <button
      type="button"
      className="truncate text-erp-primary hover:underline"
      onClick={() => {
        if (!request) {
          onFeedback?.('单据不存在或不可访问', 'warning');
          return;
        }
        onOpenPage?.('inventory-other-outbound-request-detail', { row: request });
      }}
    >
      {detail.sourceRequestNo}
    </button>
  );
}

function buildOutboundInfoFields({ detail, row, onOpenPage, onFeedback }) {
  return [
    { key: 'outboundNo', label: '单号', value: detail.outboundNo },
    {
      key: 'sourceType',
      label: '来源类型',
      value: otherOutboundSourceTypeLabels[detail.sourceType] || detail.sourceType || EMPTY_PLACEHOLDER,
    },
    {
      key: 'sourceRequestNo',
      label: '来源其他出库申请单',
      value: buildSourceRequestLink(detail, { onOpenPage, onFeedback }),
    },
    { key: 'sourceSystem', label: '来源系统', value: detail.sourceSystem || EMPTY_PLACEHOLDER },
    { key: 'sourceNo', label: '来源单号', value: detail.sourceNo || EMPTY_PLACEHOLDER },
    { key: 'logicalWarehouse', label: '出库仓库', value: resolveLogicalWarehouseLabel(detail.logicalWarehouse) },
    { key: 'businessType', label: '业务类型', value: detail.businessType || EMPTY_PLACEHOLDER },
    { key: 'actualOutboundTime', label: '实际出库时间', value: row.actualOutboundTime || EMPTY_PLACEHOLDER },
    { key: 'businessDate', label: '业务日期', value: row.businessDate || EMPTY_PLACEHOLDER },
    { key: 'pushTime', label: '推送财务ERP时间', value: row.pushTime || EMPTY_PLACEHOLDER },
    { key: 'pushFailReason', label: '推送失败原因', value: row.pushFailReason || EMPTY_PLACEHOLDER, className: 'col-span-3' },
    { key: 'remark', label: '备注', value: detail.remark || EMPTY_PLACEHOLDER, className: 'col-span-3' },
  ];
}

const outboundDetailConfig = {
  listPageId: 'inventory-other-outbound',
  lineSectionTitle: '商品明细',
  lineVariant: 'other-outbound',
  lineEditorOptions: { productOptions, skuOptions },
  getDetail: getOutboundDetail,
  title: (detail) => `其他出库单详情${detail.outboundNo ? ` · ${detail.outboundNo}` : ''}`,
  getStatusBadges: (row) => [
    ...getOtherOutboundStatusBadges(row),
    ...(row?.isMock ? [{ label: 'Mock', tone: 'neutral' }] : []),
  ],
  rowKey: (detail) => detail.outboundNo,
  sections: [
    {
      title: '单据信息',
      fields: ({ detail, row, onOpenPage, onFeedback }) => buildOutboundInfoFields({
        detail,
        row,
        onOpenPage,
        onFeedback,
      }),
    },
  ],
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
      tabs: ({ row }) => buildOperationInfoTabs({
        row,
        buildLogs: buildOtherOutboundOperationLogs,
        toMetaRow: (metaRow) => ({ ...metaRow, creator: metaRow.creator || '系统', updater: metaRow.updater || '系统' }),
      }),
    },
  ],
  buildLineSummary: ({ detail }) => ({
    quantity: { label: '实际出库数量', value: detail.totalOutboundQty ?? 0 },
  }),
};

export function OtherOutboundDetailPage({ onOpenPage, onFeedback, context }) {
  // 单据不存在时由 DocumentDetailPage 统一提供错误态。
  const row = useDocumentRow(context, { storageKey: OTHER_OUTBOUND_STORAGE_KEY, loadById: loadOtherOutboundById });

  const config = {
    ...outboundDetailConfig,
    sections: [
      {
        title: '单据信息',
        fields: ({ detail, row: currentRow, onOpenPage: openPage }) => buildOutboundInfoFields({
          detail,
          row: currentRow,
          onOpenPage: openPage,
          onFeedback,
        }),
      },
    ],
  };

  return <DocumentDetailPage context={{ row }} onOpenPage={onOpenPage} config={config} />;
}
