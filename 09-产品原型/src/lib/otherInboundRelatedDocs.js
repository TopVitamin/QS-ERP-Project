import { otherInbounds } from '../data/otherInboundData.js';
import {
  financeErpPushStatusLabels,
  financeErpPushStatusTones,
  loadOtherInboundByRequestId,
  otherInboundAuditLabels,
  otherInboundAuditTones,
} from './otherInboundLogic.js';

/**
 * 申请单详情「关联单据」：回传实收>0 生成的其他入库单（1:0..1，主PRD §3.3、R14）。
 * 优先读本地 Mock 集合；集合尚未装载时用演示种子兜底，保证详情页能展示关联结果单。
 */
export function resolveOtherInboundForRequest(row) {
  if (!row) return null;
  return loadOtherInboundByRequestId(row.id, row.requestNo)
    || otherInbounds.find((item) => item.sourceRequestId === row.id || item.sourceRequestNo === row.requestNo)
    || null;
}

/** 关联单据分区（仅已收货展示，见《其他入库申请单前端Demo版PRD_详情页》§3.3）。 */
export function buildOtherInboundRequestRelatedDocumentSections(row) {
  const inbound = resolveOtherInboundForRequest(row);

  return [
    {
      key: 'other-inbounds',
      title: '其他入库单',
      emptyText: '暂无关联的其他入库单',
      columns: [
        {
          key: 'inboundNo',
          label: '单号',
          link: true,
          pageId: 'inventory-other-inbound-detail',
          resolveRow: (item) => item,
        },
        {
          key: 'auditStatus',
          label: '审核状态',
          badge: true,
          render: (item) => otherInboundAuditLabels[item.auditStatus] || item.auditStatus,
          badgeTone: (item) => otherInboundAuditTones[item.auditStatus] || 'success',
        },
        {
          key: 'financeErpPushStatus',
          label: '推送财务ERP状态',
          badge: true,
          render: (item) => financeErpPushStatusLabels[item.financeErpPushStatus] || item.financeErpPushStatus,
          badgeTone: (item) => financeErpPushStatusTones[item.financeErpPushStatus] || 'warning',
        },
        {
          key: 'totalInboundQty',
          label: '实际入库数量',
          align: 'right',
          render: (item) => item.totalInboundQty ?? 0,
        },
        {
          key: 'createdAt',
          label: '创建时间',
          muted: true,
          render: (item) => item.createdAt,
        },
      ],
      rows: inbound ? [inbound] : [],
    },
  ];
}
