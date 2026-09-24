/**
 * 其他出库申请单详情「关联单据」：下游其他出库单（1:0..1，仅已发货展示）。
 * 简表列按《其他出库申请单前端Demo版PRD_详情页》§3.3：单号、审核状态、金蝶推送状态、实际出库数量、创建时间。
 */
import {
  kingdeePushStatusLabels,
  kingdeePushStatusTones,
  loadOtherOutboundsByRequestNo,
  otherOutboundAuditLabels,
  otherOutboundAuditTones,
} from './otherOutboundLogic.js';

export function buildOtherOutboundRequestRelatedDocumentSections(row) {
  const outbounds = loadOtherOutboundsByRequestNo(row?.requestNo);

  return [
    {
      key: 'other-outbounds',
      title: '其他出库单',
      emptyText: '暂无关联的其他出库单',
      columns: [
        {
          key: 'outboundNo',
          label: '单号',
          link: true,
          pageId: 'inventory-other-outbound-detail',
          resolveRow: (item) => item,
        },
        {
          key: 'auditStatus',
          label: '审核状态',
          badge: true,
          render: (item) => otherOutboundAuditLabels[item.auditStatus] || item.auditStatus,
          badgeTone: (item) => otherOutboundAuditTones[item.auditStatus] || 'success',
        },
        {
          key: 'kingdeePushStatus',
          label: '金蝶推送状态',
          badge: true,
          render: (item) => kingdeePushStatusLabels[item.kingdeePushStatus] || item.kingdeePushStatus,
          badgeTone: (item) => kingdeePushStatusTones[item.kingdeePushStatus] || 'warning',
        },
        {
          key: 'totalOutboundQty',
          label: '实际出库数量',
          align: 'right',
          render: (item) => item.totalOutboundQty ?? 0,
        },
        {
          key: 'createdAt',
          label: '创建时间',
          muted: true,
          render: (item) => item.createdAt || item.actualOutboundTime,
        },
      ],
      rows: outbounds,
    },
  ];
}
