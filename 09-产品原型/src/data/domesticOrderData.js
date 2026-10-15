/**
 * 国内电商订单（二版 B3，只读对象）演示数据：列表列、查询项、种子与本地读取。
 *
 * 口径依据：《国内电商订单主PRD》（F01、F02、R01、R03、R09～R11）、《国内电商订单页面骨架》、
 * 《国内电商订单前端Demo版PRD_列表页》§2～§4、§8 与《…_弹窗与Mock》§3；
 * 字段与取值以《国内电商订单（详细稿）》为准。
 *
 * 演示说明：
 * - 种子为虚构值，订单编号前缀 GNDS 已定（2026-10-15 用户确认固化，主PRD Q01 已确认）；
 * - 订单行累计实际出库／退回数量按关联结果单（销售出库单／销退入库单）实时派生，
 *   与「来源国内电商订单」字段的种子互跳，保证订单行与关联结果单数量一致；
 * - 未匹配订单行的商品编码、名称、基本单位为 `-`，与结果处理异常的恢复演示衔接。
 */
import { EMPTY_PLACEHOLDER, formatAmount } from '../lib/format.js';
import { resolveOptionLabel } from '../lib/codeName.js';
import { readMockRows, upsertMockRow, writeMockRows } from '../lib/mockStorage.js';
import {
  orderFulfillmentStatusLabels,
  orderFulfillmentStatusTextTones,
  orderFulfillmentStatusTones,
  refreshEcommerceOrderRow,
} from '../lib/ecommerceOrderLogic.js';
import { currencyOptions } from './masterData.js';

export const DOMESTIC_ORDER_STORAGE_KEY = 'qs-erp:sales-domestic-orders:v1';

export {
  orderFulfillmentStatusLabels as domesticOrderStatusLabels,
  orderFulfillmentStatusTextTones as domesticOrderStatusTextTones,
  orderFulfillmentStatusTones as domesticOrderStatusTones,
};

/** 平台枚举按《国内电商订单（详细稿）》：天猫、京东、淘宝、拼多多、其他。 */
export const domesticPlatformOptions = ['天猫', '京东', '淘宝', '拼多多', '其他'];

export const domesticOrderSeeds = [
  {
    id: 'domestic-order-1',
    orderNo: 'GNDS-20260918-0001',
    sourceSystem: 'jushuitan',
    channelOrderNo: 'JST20260918001',
    platformOrderNo: '38472910001111',
    platform: '天猫',
    shop: '天猫旗舰店',
    orderedAt: '2026-09-18 09:12:03',
    customer: 'CUS000005',
    currency: '人民币',
    amount: 2563.00,
    returnAmount: 824.00,
    creator: '系统',
    createdAt: '2026-09-18 09:12:30',
    updater: '系统',
    updatedAt: '2026-09-21 10:25:30',
    lines: [
      { id: 'domestic-order-1-line-1', platformSku: 'TB-884729100023', product: 'SP0101020001', quantity: 10, amount: 1690.00, returnAmount: 338.00 },
      { id: 'domestic-order-1-line-2', platformSku: 'TB-884729100024', product: 'SP0103010001', quantity: 2, amount: 378.00, returnAmount: 189.00 },
      { id: 'domestic-order-1-line-3', platformSku: 'TB-884729100025', product: 'SP0103030001', quantity: 5, amount: 495.00, returnAmount: 297.00 },
    ],
  },
  {
    id: 'domestic-order-2',
    orderNo: 'GNDS-20260921-0002',
    sourceSystem: 'jushuitan',
    channelOrderNo: 'JST20260921002',
    platformOrderNo: '38472910002222',
    platform: '京东',
    shop: '京东自营旗舰店',
    orderedAt: '2026-09-21 11:05:20',
    customer: 'CUS000005',
    currency: '人民币',
    amount: 1007.00,
    returnAmount: 0,
    creator: '系统',
    createdAt: '2026-09-21 11:05:40',
    updater: '系统',
    updatedAt: '2026-09-23 10:20:30',
    lines: [
      { id: 'domestic-order-2-line-1', platformSku: 'JD-884729100023', product: 'SP0101010001', quantity: 4, amount: 512.00, returnAmount: 0 },
      { id: 'domestic-order-2-line-2', platformSku: 'JD-884729100024', product: 'SP0101020002', quantity: 3, amount: 495.00, returnAmount: 0 },
    ],
  },
  {
    id: 'domestic-order-3',
    orderNo: 'GNDS-20260921-0003',
    sourceSystem: 'jushuitan',
    channelOrderNo: 'JST20260921003',
    platformOrderNo: 'TB-20260921-33333',
    platform: '淘宝',
    shop: '淘宝示例店铺',
    orderedAt: '2026-09-21 14:40:11',
    customer: 'CUS000005',
    currency: '人民币',
    amount: 269.00,
    returnAmount: 0,
    creator: '系统',
    createdAt: '2026-09-21 14:40:26',
    updater: '系统',
    updatedAt: '2026-09-21 14:40:26',
    lines: [
      { id: 'domestic-order-3-line-1', platformSku: 'TB-884729100026', product: 'SP0101030002', quantity: 1, amount: 269.00, returnAmount: 0 },
    ],
  },
  {
    id: 'domestic-order-4',
    orderNo: 'GNDS-20260919-0001',
    sourceSystem: 'jushuitan',
    channelOrderNo: 'JST20260919004',
    platformOrderNo: 'PDD-20260919-44444',
    platform: '拼多多',
    shop: '拼多多官方店铺',
    orderedAt: '2026-09-19 20:10:00',
    customer: 'CUS000005',
    currency: '人民币',
    amount: 1371.00,
    returnAmount: 1371.00,
    creator: '系统',
    createdAt: '2026-09-19 20:10:18',
    updater: '系统',
    updatedAt: '2026-09-20 21:20:30',
    lines: [
      { id: 'domestic-order-4-line-1', platformSku: 'PDD-884729100031', product: 'SP0102010001', quantity: 1, amount: 1299.00, returnAmount: 1299.00 },
      { id: 'domestic-order-4-line-2', platformSku: 'PDD-884729100032', product: 'SP0103020001', quantity: 4, amount: 72.00, returnAmount: 72.00 },
    ],
  },
  {
    id: 'domestic-order-5',
    orderNo: 'GNDS-20260922-0001',
    sourceSystem: 'jushuitan',
    channelOrderNo: 'JST20260922005',
    platformOrderNo: '38472910005555',
    platform: '天猫',
    shop: '天猫旗舰店',
    orderedAt: '2026-09-22 08:15:09',
    customer: 'CUS000005',
    currency: '人民币',
    amount: 449.00,
    returnAmount: 0,
    creator: '系统',
    createdAt: '2026-09-22 08:15:22',
    updater: '系统',
    updatedAt: '2026-09-22 08:15:22',
    lines: [
      { id: 'domestic-order-5-line-1', platformSku: 'TB-884729100041', product: 'SP0101010003', quantity: 1, amount: 449.00, returnAmount: 0 },
    ],
  },
  {
    // 金额未回传演示：订单级与行级金额为空，列表与详情展示 `-`（列表页 Demo PRD §8.1）
    id: 'domestic-order-6',
    orderNo: 'GNDS-20261014-0001',
    sourceSystem: 'jushuitan',
    channelOrderNo: 'JST20261014006',
    platformOrderNo: '38472910006666',
    platform: '京东',
    shop: '京东自营旗舰店',
    orderedAt: '2026-10-14 09:20:11',
    customer: 'CUS000005',
    currency: '人民币',
    amount: '',
    returnAmount: 0,
    creator: '系统',
    createdAt: '2026-10-14 09:20:30',
    updater: '系统',
    updatedAt: '2026-10-14 09:20:30',
    lines: [
      { id: 'domestic-order-6-line-1', platformSku: 'JD-884729100051', product: 'SP0101030003', quantity: 1, amount: '', returnAmount: 0 },
    ],
  },
  {
    // 商品匹配失败演示（结果处理 M1）：平台商品编码未匹配到ERP商品，商品编码／名称／单位为 `-`
    id: 'domestic-order-7',
    orderNo: 'GNDS-20261014-0007',
    sourceSystem: 'jushuitan',
    channelOrderNo: 'JST20261014007',
    platformOrderNo: '38472910007777',
    platform: '天猫',
    shop: '天猫旗舰店',
    orderedAt: '2026-10-14 10:05:33',
    customer: 'CUS000005',
    currency: '人民币',
    amount: 330.00,
    returnAmount: 0,
    creator: '系统',
    createdAt: '2026-10-14 10:05:50',
    updater: '系统',
    updatedAt: '2026-10-14 10:06:00',
    lines: [
      { id: 'domestic-order-7-line-1', platformSku: 'TB-884729100061', product: '', quantity: 2, amount: 330.00, returnAmount: 0 },
    ],
  },
  {
    // 库存不足演示（结果处理 M2）：商品已匹配，渠道结果因逻辑仓可用不足未生成结果单
    id: 'domestic-order-8',
    orderNo: 'GNDS-20261014-0008',
    sourceSystem: 'jushuitan',
    channelOrderNo: 'JST20261014008',
    platformOrderNo: '38472910008888',
    platform: '京东',
    shop: '京东自营旗舰店',
    orderedAt: '2026-10-14 11:10:27',
    customer: 'CUS000005',
    currency: '人民币',
    amount: 1690.00,
    returnAmount: 0,
    creator: '系统',
    createdAt: '2026-10-14 11:10:40',
    updater: '系统',
    updatedAt: '2026-10-14 11:12:00',
    lines: [
      { id: 'domestic-order-8-line-1', platformSku: 'JD-884729100071', product: 'SP0101020001', quantity: 10, amount: 1690.00, returnAmount: 0 },
    ],
  },
];

/** 列表列（顺序按详细稿「列表展示=是」：订单编号、渠道单号、平台单号、平台、店铺、下单时间、履约状态、币别、金额、退货金额、最后更新时间）。 */
export const domesticOrderColumns = [
  { key: 'orderNo', label: '订单编号', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: true },
  { key: 'channelOrderNo', label: '渠道单号', defaultWidth: 160, minWidth: 140, maxWidth: 210, ellipsis: true },
  { key: 'platformOrderNo', label: '平台单号', defaultWidth: 170, minWidth: 150, maxWidth: 230, ellipsis: true },
  { key: 'platform', label: '平台', defaultWidth: 88, minWidth: 72, maxWidth: 120, ellipsis: true },
  { key: 'shop', label: '店铺', defaultWidth: 150, minWidth: 120, maxWidth: 220, ellipsis: true },
  { key: 'orderedAt', label: '下单时间', defaultWidth: 170, minWidth: 150, maxWidth: 210, ellipsis: true, sortable: true },
  { key: 'fulfillmentStatus', label: '履约状态', defaultWidth: 96, minWidth: 88, maxWidth: 130, ellipsis: true, render: (value) => orderFulfillmentStatusLabels[value] || value, tone: (value) => orderFulfillmentStatusTextTones[value] || '' },
  { key: 'currency', label: '币别', defaultWidth: 112, minWidth: 96, maxWidth: 140, ellipsis: true, render: (value) => resolveOptionLabel(value, currencyOptions) },
  { key: 'amount', label: '成交优惠后金额合计', defaultWidth: 150, minWidth: 130, maxWidth: 200, ellipsis: true, align: 'right', sortable: true, render: (value) => (value === '' || value == null ? EMPTY_PLACEHOLDER : formatAmount(value)) },
  { key: 'returnAmount', label: '退货金额合计', defaultWidth: 128, minWidth: 110, maxWidth: 180, ellipsis: true, align: 'right', sortable: true, render: (value) => (value === '' || value == null ? EMPTY_PLACEHOLDER : formatAmount(value)) },
  { key: 'updatedAt', label: '最后更新时间', defaultWidth: 170, minWidth: 150, maxWidth: 210, ellipsis: true, sortable: true },
];

export const domesticOrderInitialFilters = {
  orderNo: '',
  channelOrderNo: '',
  platformOrderNo: '',
  shop: '',
  platform: '',
  fulfillmentStatus: [],
  orderedAtRange: { from: '', to: '' },
  productCode: '',
  platformSku: '',
};

export const domesticOrderFilterFields = [
  { key: 'orderNo', label: '订单编号', type: 'search', placeholder: '请输入订单编号' },
  { key: 'channelOrderNo', label: '渠道单号', type: 'search', placeholder: '请输入渠道单号' },
  { key: 'platformOrderNo', label: '平台单号', type: 'search', placeholder: '请输入平台单号' },
  { key: 'shop', label: '店铺', type: 'search', placeholder: '请输入店铺' },
  { key: 'platform', label: '平台', type: 'select', options: [{ value: '', label: '全部' }, ...domesticPlatformOptions.map((value) => ({ value, label: value }))] },
  { key: 'fulfillmentStatus', label: '履约状态', type: 'multi-select', placeholder: '全部', options: Object.entries(orderFulfillmentStatusLabels).map(([value, label]) => ({ value, label })) },
  { key: 'orderedAtRange', label: '下单时间', type: 'date-range', placeholder: '不限' },
  { key: 'productCode', label: '商品编码', type: 'search', placeholder: '请输入商品编码' },
  { key: 'platformSku', label: '平台商品编码', type: 'search', placeholder: '请输入平台商品编码' },
];

function matchDateRange(value, range) {
  const day = String(value || '').slice(0, 10);
  if (range?.from && (!day || day < range.from)) return false;
  if (range?.to && (!day || day > range.to)) return false;
  return true;
}

function includesText(value, input) {
  const keyword = String(input || '').trim().toLowerCase();
  if (!keyword) return true;
  return String(value || '').toLowerCase().includes(keyword);
}

/** 商品编码、平台商品编码为行级匹配：命中订单行即返回该订单记录，不展开为多行（主PRD AC01）。 */
function matchLineField(lines, field, input) {
  const keyword = String(input || '').trim().toLowerCase();
  if (!keyword) return true;
  return (lines || []).some((line) => String(line[field] || '').toLowerCase().includes(keyword));
}

export function filterDomesticOrderRows(row, filters) {
  return includesText(row.orderNo, filters.orderNo)
    && includesText(row.channelOrderNo, filters.channelOrderNo)
    && includesText(row.platformOrderNo, filters.platformOrderNo)
    && includesText(row.shop, filters.shop)
    && (!filters.platform || row.platform === filters.platform)
    && (filters.fulfillmentStatus.length === 0 || filters.fulfillmentStatus.includes(row.fulfillmentStatus))
    && matchDateRange(row.orderedAt, filters.orderedAtRange)
    && matchLineField(row.lines, 'product', filters.productCode)
    && matchLineField(row.lines, 'platformSku', filters.platformSku);
}

export function normalizeDomesticOrderRow(row) {
  return refreshEcommerceOrderRow(row, 'domestic');
}

export function normalizeDomesticOrderRows(rows = []) {
  return rows.map(normalizeDomesticOrderRow);
}

/** 读取本地订单集合：已落库记录 + 缺失种子补齐（列表与详情/恢复演示共用同一份数据）。 */
export function loadDomesticOrders() {
  const stored = readMockRows(DOMESTIC_ORDER_STORAGE_KEY, null);
  if (!Array.isArray(stored)) {
    writeMockRows(DOMESTIC_ORDER_STORAGE_KEY, domesticOrderSeeds);
    return normalizeDomesticOrderRows(domesticOrderSeeds);
  }
  const missingSeeds = domesticOrderSeeds.filter((seed) => !stored.some((row) => row.id === seed.id));
  const merged = missingSeeds.length ? [...stored, ...missingSeeds] : stored;
  if (missingSeeds.length) writeMockRows(DOMESTIC_ORDER_STORAGE_KEY, merged);
  return normalizeDomesticOrderRows(merged);
}

export function loadDomesticOrderById(id) {
  return loadDomesticOrders().find((row) => row.id === id) || null;
}

export function loadDomesticOrderByNo(orderNo) {
  return loadDomesticOrders().find((row) => row.orderNo === orderNo) || null;
}

export function upsertDomesticOrder(row) {
  upsertMockRow(DOMESTIC_ORDER_STORAGE_KEY, normalizeDomesticOrderRow(row));
}
