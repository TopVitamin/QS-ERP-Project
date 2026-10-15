/**
 * 国内电商订单 / 跨境电商订单（二版 B3，并列只读对象）共享逻辑：
 * 回传状态派生、关联结果单与异常回传记录读取、关联简表与跳转解析。
 *
 * 口径依据：《国内电商订单主PRD》《跨境电商订单主PRD》（F02～F04、R06～R10、§6.2）；
 * 《结果处理规则（二版）》§二、§四（来源订单「分两张」）与 §八 Mock 要点；
 * 页面骨架与前端 Demo 版 PRD（列表列、详情分区、Mock 覆盖）。
 *
 * 演示说明：
 * - 订单与结果单为本地 Mock（localStorage）；订单行累计数量按关联结果单实时派生，
 *   保证「订单行累计＝结果单数量合计」可连续核对；
 * - 回传状态为派生值：存在未处理异常→异常；否则按累计实际出库是否覆盖订购数量
 *   派生 待回传／已回传（主PRD §6.2、§6.5）；分次出库只增加关联结果单与行累计数量，未收齐前仍为待回传。
 */
import { EMPTY_PLACEHOLDER } from './format.js';
import { skuOptions } from '../data/masterData.js';
import { readMockRows } from './mockStorage.js';
import {
  loadAllOutbounds,
  normalizeOutboundRow,
  auditStatusLabels as outboundAuditStatusLabels,
  financeErpPushStatusLabels as outboundFinanceErpPushStatusLabels,
} from './salesOutboundLogic.js';
import {
  RETURN_INBOUND_STORAGE_KEY,
  normalizeSalesReturnInboundRow,
} from './salesReturnInboundLogic.js';
import { salesOutbounds } from '../data/salesOutboundData.js';
import { salesReturnInbounds } from '../data/salesReturnInboundData.js';
import {
  PUSH_EXCEPTION_STORAGE_KEY,
  pushExceptionSeeds,
  pushExceptionStageLabels,
  pushExceptionStatusLabels,
} from '../data/pushExceptionData.js';

/** 两类订单对象的固定差异：来源系统与结果单来源订单字段（TSV、结果处理规则 §四）。 */
export const ecommerceOrderKindConfig = {
  domestic: {
    kind: 'domestic',
    label: '国内电商订单',
    sourceSystem: 'jushuitan',
    sourceSystemLabel: '聚水潭',
    resultOrderField: 'sourceDomesticOrderNo',
  },
  crossborder: {
    kind: 'crossborder',
    label: '跨境电商订单',
    sourceSystem: 'lingxing',
    sourceSystemLabel: '领星',
    resultOrderField: 'sourceCrossborderOrderNo',
  },
};

/** 回传状态（本对象唯一状态维度，系统派生、只读展示；主PRD §6.1）。 */
export const orderFulfillmentStatusLabels = {
  pending: '待回传',
  fulfilled: '已回传',
  exception: '异常',
};

/** 详情页头 StatusBadge 语义色（详情 Demo PRD §2.1）。 */
export const orderFulfillmentStatusTones = {
  pending: 'neutral',
  fulfilled: 'success',
  exception: 'danger',
};

/** 列表状态列语义色文字（列表页 Demo PRD §4.3）。 */
export const orderFulfillmentStatusTextTones = {
  pending: '',
  fulfilled: 'text-erp-success',
  exception: 'text-erp-danger',
};

/** 异常回传记录的关联结果单类型（结果处理规则 §四）。 */
export const orderResultDocLabels = {
  sales_outbound: '销售出库单',
  sales_return_inbound: '销退入库单',
};

const stageLabels = pushExceptionStageLabels;
const statusLabels = pushExceptionStatusLabels;

/** 合并「已落库记录」与「缺失种子」：结果单集合可能从未落库或只落了部分种子。 */
function readRowsWithSeedFallback(storageKey, seedRows) {
  const stored = readMockRows(storageKey, null);
  if (!Array.isArray(stored)) return seedRows;
  return [...stored, ...seedRows.filter((seed) => !stored.some((row) => row.id === seed.id))];
}

/** 按订单的 ERP 单号读取关联销售出库单（来源订单「分两张」：来源国内电商订单／来源跨境电商订单）。 */
export function loadOutboundsForOrder(order, kind) {
  if (!order?.orderNo) return [];
  const config = ecommerceOrderKindConfig[kind];
  return loadAllOutbounds(salesOutbounds)
    .filter((row) => row[config.resultOrderField] === order.orderNo)
    .map((row) => normalizeOutboundRow(row))
    .sort((left, right) => String(right.businessDate || right.createdAt || '').localeCompare(String(left.businessDate || left.createdAt || '')));
}

/** 按订单的 ERP 单号读取关联销退入库单。 */
export function loadInboundsForOrder(order, kind) {
  if (!order?.orderNo) return [];
  const config = ecommerceOrderKindConfig[kind];
  return readRowsWithSeedFallback(RETURN_INBOUND_STORAGE_KEY, salesReturnInbounds)
    .filter((row) => row[config.resultOrderField] === order.orderNo)
    .map((row) => normalizeSalesReturnInboundRow(row))
    .sort((left, right) => String(right.businessDate || right.createdAt || '').localeCompare(String(left.businessDate || left.createdAt || '')));
}

/** 结果单明细数量合计（实际出库／实际退回），供关联简表列展示。 */
export function sumResultDocQty(row) {
  return (row?.lines || []).reduce((sum, line) => sum + Number(line.quantity || 0), 0);
}

function sumDocProductQty(docs, product) {
  return docs.reduce((total, doc) => total
    + (doc.lines || []).reduce((sum, line) => (
      line.product && line.product === product ? sum + Number(line.quantity || 0) : sum
    ), 0), 0);
}

/**
 * 按关联结果单派生订单行累计数量与回传状态（主PRD R07、§6.2、§6.5）。
 * 订单行商品未匹配（product 为空）时累计为 0，匹配可在异常恢复后补齐（R09）。
 */
export function refreshEcommerceOrderRow(row, kind) {
  if (!row) return row;
  const config = ecommerceOrderKindConfig[kind];
  const outbounds = loadOutboundsForOrder(row, kind);
  const inbounds = loadInboundsForOrder(row, kind);
  const exceptionRows = loadOrderExceptionRecords(row, kind);
  const pendingExceptionCount = exceptionRows.filter((item) => item.status === 'pending').length;

  const lines = (row.lines || []).map((line, index) => {
    const sku = line.product ? skuOptions.find((item) => item.value === line.product) : null;
    return {
      ...line,
      lineNo: index + 1,
      productCode: line.product ? (line.productCode || sku?.skuCode || line.product) : '',
      productName: line.product ? (line.productName || sku?.productName || '') : '',
      unit: line.product ? (line.unit || sku?.unit || '') : '',
      quantity: Number(line.quantity || 0),
      shippedQty: line.product ? sumDocProductQty(outbounds, line.product) : 0,
      returnedQty: line.product ? sumDocProductQty(inbounds, line.product) : 0,
    };
  });

  const totalOrderedQty = lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
  const totalShippedQty = lines.reduce((sum, line) => sum + Number(line.shippedQty || 0), 0);
  const totalReturnedQty = lines.reduce((sum, line) => sum + Number(line.returnedQty || 0), 0);
  const covered = lines.length > 0 && lines.every((line) => line.shippedQty >= line.quantity);

  let fulfillmentStatus = 'pending';
  if (pendingExceptionCount > 0) fulfillmentStatus = 'exception';
  else if (covered) fulfillmentStatus = 'fulfilled';

  return {
    ...row,
    orderKind: config.kind,
    sourceSystemLabel: config.sourceSystemLabel,
    lines,
    totalOrderedQty,
    totalShippedQty,
    totalReturnedQty,
    pendingExceptionCount,
    fulfillmentStatus,
    relatedOutboundCount: outbounds.length,
    relatedInboundCount: inbounds.length,
  };
}

/**
 * 异常回传记录：结果处理页签中与本订单同来源（来源系统＋来源单号＝渠道单号）的记录，只读展示（主PRD R10）。
 * 按失败时间倒序。
 */
export function loadOrderExceptionRecords(order, kind) {
  if (!order?.channelOrderNo) return [];
  const config = ecommerceOrderKindConfig[kind];
  return readMockRows(PUSH_EXCEPTION_STORAGE_KEY, pushExceptionSeeds)
    .filter((row) => row.tab === 'result'
      && row.sourceNo === order.channelOrderNo
      && row.sourceSystem === config.sourceSystem)
    .sort((left, right) => String(right.failTime || '').localeCompare(String(left.failTime || '')));
}

/** 异常回传记录的关联结果单跳转（处理成功后生成的结果单；未处理为 `-`，主PRD R10）。 */
export function loadResultDocRow(exceptionRow) {
  if (!exceptionRow?.resultDocNo) return null;
  if (exceptionRow.resultDocType === 'sales_return_inbound') {
    const row = readRowsWithSeedFallback(RETURN_INBOUND_STORAGE_KEY, salesReturnInbounds)
      .find((item) => item.inboundNo === exceptionRow.resultDocNo);
    return row ? { pageId: 'sales-return-inbound-detail', row: normalizeSalesReturnInboundRow(row) } : null;
  }
  const row = loadAllOutbounds(salesOutbounds).find((item) => item.outboundNo === exceptionRow.resultDocNo);
  return row ? { pageId: 'sales-outbound-detail', row: normalizeOutboundRow(row) } : null;
}

/** 异常回传记录列展示用：异常环节、处理状态、关联结果单类型。 */
export function renderExceptionStage(value) {
  return stageLabels[value] || value || EMPTY_PLACEHOLDER;
}

export function renderExceptionStatus(value) {
  return statusLabels[value] || value || EMPTY_PLACEHOLDER;
}

/**
 * 订单详情的「关联结果单」简表配置（RelatedDocumentsCard）：
 * 销售出库单／销退入库单两个 Tab 始终展示，无数据空态；单号可跳转结果单详情（F03）。
 */
export function buildOrderResultSections(order, kind) {
  const outbounds = loadOutboundsForOrder(order, kind);
  const inbounds = loadInboundsForOrder(order, kind);

  return [
    {
      key: 'outbounds',
      title: '销售出库单',
      emptyText: '暂无关联的销售出库单',
      rows: outbounds,
      columns: [
        { key: 'outboundNo', label: '单号', link: true, pageId: 'sales-outbound-detail', resolveRow: (row) => row },
        { key: 'businessDate', label: '业务日期' },
        { key: 'totalOutboundQty', label: '实际出库数量', align: 'right', render: (row) => row.totalOutboundQty ?? sumResultDocQty(row) },
        { key: 'auditStatus', label: '审核状态', render: (row) => outboundAuditStatusLabels[row.auditStatus] || row.auditStatus || EMPTY_PLACEHOLDER },
        { key: 'financeErpPushStatus', label: '推送财务ERP状态', render: (row) => outboundFinanceErpPushStatusLabels[row.financeErpPushStatus] || row.financeErpPushStatus || EMPTY_PLACEHOLDER },
        { key: 'createdAt', label: '创建时间', muted: true, render: (row) => row.createdAt || EMPTY_PLACEHOLDER },
      ],
    },
    {
      key: 'return-inbounds',
      title: '销退入库单',
      emptyText: '暂无关联的销退入库单',
      rows: inbounds,
      columns: [
        { key: 'inboundNo', label: '单号', link: true, pageId: 'sales-return-inbound-detail', resolveRow: (row) => row },
        { key: 'businessDate', label: '业务日期' },
        { key: 'totalReceiveQty', label: '实际退回数量', align: 'right', render: (row) => row.totalReceiveQty ?? sumResultDocQty(row) },
        { key: 'auditStatus', label: '审核状态', render: (row) => outboundAuditStatusLabels[row.auditStatus] || row.auditStatus || EMPTY_PLACEHOLDER },
        { key: 'financeErpPushStatus', label: '推送财务ERP状态', render: (row) => outboundFinanceErpPushStatusLabels[row.financeErpPushStatus] || row.financeErpPushStatus || EMPTY_PLACEHOLDER },
        { key: 'createdAt', label: '创建时间', muted: true, render: (row) => row.createdAt || EMPTY_PLACEHOLDER },
      ],
    },
  ];
}
