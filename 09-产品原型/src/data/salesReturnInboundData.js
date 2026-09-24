import { resolveOptionLabel } from '../lib/codeName.js';
import { formatAmount } from '../lib/format.js';
import { readMockRows, writeMockRows } from '../lib/mockStorage.js';
import {
  auditStatusLabels,
  buildSeedSalesReturnInboundFromNotice,
  enrichSalesReturnInboundLine,
  financeErpPushStatusLabels,
  loadAllSalesReturnInbounds,
  normalizeSalesReturnInboundRow,
  RETURN_INBOUND_STORAGE_KEY,
  sourceTypeLabels,
} from '../lib/salesReturnInboundLogic.js';
import { currencyOptions, customerOptions, logicalWarehouseOptions } from './masterData.js';
import { salesReturnNotices } from './salesReturnNoticeData.js';
import { salesReturns } from './salesReturnData.js';

function findReturn(returnNo) {
  return salesReturns.find((row) => row.returnNo === returnNo) || null;
}

function findNotice(noticeId) {
  return salesReturnNotices.find((row) => row.id === noticeId) || null;
}

function buildSeedInbound({ noticeId, ...overrides }) {
  const notice = findNotice(noticeId);
  if (!notice) return null;
  return buildSeedSalesReturnInboundFromNotice(notice, findReturn(notice.sourceReturnNo), {
    id: `sales-return-inbound-${noticeId.replace('sales-return-notice-', '')}`,
    ...overrides,
  });
}

/** 路径二（外部ToC）明细行：商品与固定示例价格取 masterData 的 SKU；来源收货通知行留空 */
function tocLine({ id, product, quantity, price, taxRate = '13' }) {
  return enrichSalesReturnInboundLine({ id, product, quantity, price, taxRate });
}

/**
 * 路径二（外部ToC）种子：渠道退货结果按来源拆分接收，不关联通知与销售退货单（主PRD R04、AC10）。
 * 同一外部原始订单可拆成多张入库单（1:N，不自行合并），业务日期取实际收货时间的日期部分。
 */
function buildSeedExternalTocInbound({
  id,
  inboundNo,
  externalOrderNo,
  customer,
  warehouse,
  actualReceiveTime,
  financeErpPushStatus,
  pushTime = '',
  pushFailReason = '',
  updatedAt = '',
  remark = '',
  lines,
}) {
  return normalizeSalesReturnInboundRow({
    id,
    inboundNo,
    sourceType: 'toc',
    externalOrderNo,
    customer,
    warehouse,
    currency: '人民币',
    auditStatus: 'approved',
    financeErpPushStatus,
    businessDate: actualReceiveTime.slice(0, 10),
    actualReceiveTime,
    pushTime,
    pushFailReason,
    remark,
    auditor: '',
    auditTime: actualReceiveTime,
    creator: '系统',
    createdAt: actualReceiveTime,
    updater: '系统',
    updatedAt: updatedAt || actualReceiveTime,
    lines,
  });
}

/**
 * 演示种子 10 张（列表页 Demo PRD §8.1），创建即为已审核，推送状态覆盖四种：
 * 路径一（销退收货通知）：通知 2 实收 3、通知 3 虚拟入库实收 5、通知 9 少收 4（推送失败）。
 * 路径二（外部ToC）：外部原始订单 3 张按来源拆成 7 张入库单；覆盖推送成功、推送失败、未推送、推送中。
 */
const seedInbounds = [
  buildSeedInbound({
    noticeId: 'sales-return-notice-2',
    inboundNo: 'XTRK-20260917-0001',
    financeErpPushStatus: 'push_success',
    pushTime: '2026-09-17 15:31:00',
    updatedAt: '2026-09-17 15:31:00',
  }),
  buildSeedInbound({
    noticeId: 'sales-return-notice-3',
    inboundNo: 'XTRK-20260918-0001',
    financeErpPushStatus: 'push_success',
    pushTime: '2026-09-18 10:31:00',
    updatedAt: '2026-09-18 10:31:00',
  }),
  buildSeedInbound({
    noticeId: 'sales-return-notice-9',
    inboundNo: 'XTRK-20260919-0001',
    financeErpPushStatus: 'push_failed',
    pushTime: '2026-09-19 15:22:00',
    pushFailReason: '接口超时，财务ERP未确认接收',
    updatedAt: '2026-09-19 15:22:00',
  }),
  buildSeedExternalTocInbound({
    id: 'sales-return-inbound-toc-1',
    inboundNo: 'XTRK-20260921-0001',
    externalOrderNo: 'TOC-20260921-8891',
    customer: 'CUS000005',
    warehouse: 'LWH000002',
    actualReceiveTime: '2026-09-21 10:12:00',
    financeErpPushStatus: 'push_success',
    pushTime: '2026-09-21 10:13:00',
    lines: [tocLine({ id: 'sales-return-inbound-toc-1-line-1', product: 'SP0101020001', quantity: 2, price: 169 })],
  }),
  buildSeedExternalTocInbound({
    id: 'sales-return-inbound-toc-2',
    inboundNo: 'XTRK-20260921-0002',
    externalOrderNo: 'TOC-20260921-8891',
    customer: 'CUS000005',
    warehouse: 'LWH000002',
    actualReceiveTime: '2026-09-21 10:18:00',
    financeErpPushStatus: 'push_failed',
    pushTime: '2026-09-21 10:20:00',
    pushFailReason: '接口超时，财务ERP未确认接收',
    lines: [tocLine({ id: 'sales-return-inbound-toc-2-line-1', product: 'SP0103010001', quantity: 1, price: 189 })],
  }),
  buildSeedExternalTocInbound({
    id: 'sales-return-inbound-toc-3',
    inboundNo: 'XTRK-20260921-0003',
    externalOrderNo: 'TOC-20260921-8891',
    customer: 'CUS000005',
    warehouse: 'LWH000002',
    actualReceiveTime: '2026-09-21 10:25:00',
    financeErpPushStatus: 'un_pushed',
    lines: [tocLine({ id: 'sales-return-inbound-toc-3-line-1', product: 'SP0103030001', quantity: 3, price: 99 })],
  }),
  buildSeedExternalTocInbound({
    id: 'sales-return-inbound-toc-4',
    inboundNo: 'XTRK-20260920-0001',
    externalOrderNo: 'TOC-20260920-7712',
    customer: 'CUS000005',
    warehouse: 'LWH000002',
    actualReceiveTime: '2026-09-20 21:05:00',
    financeErpPushStatus: 'pushing',
    pushTime: '2026-09-20 21:06:00',
    lines: [tocLine({ id: 'sales-return-inbound-toc-4-line-1', product: 'SP0102010001', quantity: 1, price: 1299 })],
  }),
  buildSeedExternalTocInbound({
    id: 'sales-return-inbound-toc-5',
    inboundNo: 'XTRK-20260920-0002',
    externalOrderNo: 'TOC-20260920-7712',
    customer: 'CUS000005',
    warehouse: 'LWH000002',
    actualReceiveTime: '2026-09-20 21:20:00',
    financeErpPushStatus: 'push_success',
    pushTime: '2026-09-20 21:21:00',
    lines: [tocLine({ id: 'sales-return-inbound-toc-5-line-1', product: 'SP0103020001', quantity: 4, price: 18 })],
  }),
  buildSeedExternalTocInbound({
    id: 'sales-return-inbound-toc-6',
    inboundNo: 'XTRK-20260919-0002',
    externalOrderNo: 'TOC-20260919-6603',
    customer: 'CUS000005',
    warehouse: 'LWH000003',
    actualReceiveTime: '2026-09-19 14:40:00',
    financeErpPushStatus: 'push_success',
    pushTime: '2026-09-19 14:41:00',
    lines: [tocLine({ id: 'sales-return-inbound-toc-6-line-1', product: 'SP0101010001', quantity: 2, price: 120 })],
  }),
  buildSeedExternalTocInbound({
    id: 'sales-return-inbound-toc-7',
    inboundNo: 'XTRK-20260919-0003',
    externalOrderNo: 'TOC-20260919-6603',
    customer: 'CUS000005',
    warehouse: 'LWH000003',
    actualReceiveTime: '2026-09-19 15:10:00',
    financeErpPushStatus: 'push_success',
    pushTime: '2026-09-19 15:11:00',
    lines: [tocLine({ id: 'sales-return-inbound-toc-7-line-1', product: 'SP0101020002', quantity: 1, price: 165 })],
  }),
].filter(Boolean);

const seedRows = seedInbounds.map(normalizeSalesReturnInboundRow);
const storedRows = loadAllSalesReturnInbounds(seedRows);
// 浏览器已有旧 Mock 时补齐缺失的演示种子，保证列表覆盖两条来源路径；本地已有记录原样保留。
const storedIds = new Set(storedRows.map((row) => row.id));

export const salesReturnInbounds = [
  ...storedRows,
  ...seedRows.filter((row) => !storedIds.has(row.id)),
].map(normalizeSalesReturnInboundRow);

// Mock 种子首次加载时写入本地存储：通知详情关联入库单在未打开入库单列表前也能读到数据。
if (readMockRows(RETURN_INBOUND_STORAGE_KEY, null) == null) {
  writeMockRows(RETURN_INBOUND_STORAGE_KEY, salesReturnInbounds);
}

export function getSalesReturnInboundStatusBadges(row) {
  const auditToneMap = { approved: 'success', draft: 'warning', pending: 'warning' };
  const badges = [
    {
      label: auditStatusLabels[row?.auditStatus] || row?.auditStatus,
      tone: auditToneMap[row?.auditStatus] || 'default',
    },
  ];
  if (row?.financeErpPushStatus) {
    const toneMap = {
      un_pushed: 'warning',
      pushing: 'info',
      push_success: 'success',
      push_failed: 'danger',
    };
    badges.push({
      label: financeErpPushStatusLabels[row.financeErpPushStatus] || row.financeErpPushStatus,
      tone: toneMap[row.financeErpPushStatus] || 'default',
    });
  }
  return badges;
}

const qtyCell = (value) => value ?? 0;
const auditTone = (value) => (value === 'approved' ? 'text-erp-success' : 'text-erp-warning');
const financeErpTone = (value) => {
  if (value === 'push_success') return 'text-erp-success';
  if (value === 'push_failed') return 'text-erp-danger';
  if (value === 'pushing') return 'text-erp-info';
  return 'text-erp-warning';
};

/** 列顺序按列表页 Demo PRD §4.2（TSV「列表展示=是」全集） */
export const salesReturnInboundColumns = [
  { key: 'inboundNo', label: '单号', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: true },
  { key: 'businessDate', label: '业务日期', defaultWidth: 112, minWidth: 96, maxWidth: 160, ellipsis: true, sortable: true },
  { key: 'sourceType', label: '来源类型', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true, render: (value) => sourceTypeLabels[value] || value },
  { key: 'sourceNoticeNo', label: '来源销退收货通知单', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: true },
  { key: 'sourceReturnNo', label: '来源销售退货单', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: true },
  { key: 'customer', label: '客户', defaultWidth: 200, minWidth: 140, maxWidth: 280, ellipsis: true, render: (value) => resolveOptionLabel(value, customerOptions) },
  { key: 'currency', label: '币别', defaultWidth: 112, minWidth: 96, maxWidth: 140, ellipsis: true, render: (value) => resolveOptionLabel(value, currencyOptions) },
  { key: 'warehouse', label: '收货仓库', defaultWidth: 170, minWidth: 130, maxWidth: 230, ellipsis: true, render: (value) => resolveOptionLabel(value, logicalWarehouseOptions) },
  { key: 'auditStatus', label: '审核状态', defaultWidth: 96, minWidth: 88, maxWidth: 140, ellipsis: true, render: (value) => auditStatusLabels[value] || value, tone: auditTone },
  { key: 'financeErpPushStatus', label: '推送财务ERP状态', defaultWidth: 112, minWidth: 96, maxWidth: 160, ellipsis: true, render: (value) => financeErpPushStatusLabels[value] || value, tone: financeErpTone },
  { key: 'totalReceiveQty', label: '实际收货数量', defaultWidth: 112, minWidth: 96, maxWidth: 150, ellipsis: true, align: 'right', sortable: true, render: qtyCell },
  { key: 'amount', label: '价税合计', defaultWidth: 124, minWidth: 104, maxWidth: 170, ellipsis: true, align: 'right', sortable: true, render: (value) => formatAmount(value) },
  { key: 'taxAmount', label: '税额', defaultWidth: 104, minWidth: 88, maxWidth: 140, ellipsis: true, align: 'right', render: (value) => formatAmount(value) },
  { key: 'netAmount', label: '金额', defaultWidth: 124, minWidth: 104, maxWidth: 170, ellipsis: true, align: 'right', sortable: true, render: (value) => formatAmount(value) },
  { key: 'createdAt', label: '创建时间', defaultWidth: 160, minWidth: 140, maxWidth: 200, ellipsis: true, sortable: true },
  { key: 'updatedAt', label: '最后更新时间', defaultWidth: 160, minWidth: 140, maxWidth: 200, ellipsis: true, sortable: true },
];

export function buildSourceNoticeFilterOptions(rows = []) {
  const map = new Map();
  rows.forEach((row) => {
    if (!row.sourceNoticeNo) return;
    map.set(row.sourceNoticeNo, { value: row.sourceNoticeNo, label: row.sourceNoticeNo });
  });
  return [{ value: '', label: '全部来源销退收货通知单' }, ...map.values()];
}

export function buildSourceReturnFilterOptions(rows = []) {
  const map = new Map();
  rows.forEach((row) => {
    if (!row.sourceReturnNo) return;
    map.set(row.sourceReturnNo, { value: row.sourceReturnNo, label: row.sourceReturnNo });
  });
  return [{ value: '', label: '全部来源销售退货单' }, ...map.values()];
}

/** 外部原始订单仅路径二单据有值（TSV：外部ToC路径展示与筛选） */
export function buildExternalOrderFilterOptions(rows = []) {
  const map = new Map();
  rows.forEach((row) => {
    if (!row.externalOrderNo) return;
    map.set(row.externalOrderNo, { value: row.externalOrderNo, label: row.externalOrderNo });
  });
  return [{ value: '', label: '全部外部原始订单' }, ...map.values()];
}

export function buildProductFilterOptions() {
  const map = new Map();
  salesReturnInbounds.forEach((row) => {
    (row.lines || []).forEach((line) => {
      if (!line.product) return;
      map.set(line.product, {
        value: line.product,
        label: `${line.productCode || line.product} ${line.productName || ''}`.trim(),
      });
    });
  });
  return [{ value: '', label: '全部商品' }, ...map.values()];
}
