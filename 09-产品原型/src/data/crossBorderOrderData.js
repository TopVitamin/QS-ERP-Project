/**
 * 跨境电商订单（二版 B3，只读对象）演示数据：列表列、查询项、种子与本地读取。
 *
 * 口径依据：《跨境电商订单主PRD》（F01、F02、R01、R03、R09～R12）、《跨境电商订单页面骨架》、
 * 《跨境电商订单前端Demo版PRD_列表页》§2～§4、§8 与《…_弹窗与Mock》§3；
 * 字段与取值以《跨境电商订单（详细稿）》为准；结构与国内电商订单一致。
 *
 * 演示说明：
 * - 种子为虚构值，订单编号前缀 KJDS 已定（2026-10-15 用户确认固化，主PRD Q01 已确认）；跨境仅自发货，不生成FBA数据；
 * - 平台枚举待联调核验（主PRD Q03），Mock 与筛选不预填具体平台，列表按「（待确认）」占位展示；
 * - 订单行累计实际出库／退回数量按关联结果单实时派生，与「来源跨境电商订单」字段的种子互跳。
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

export const CROSSBORDER_ORDER_STORAGE_KEY = 'qs-erp:sales-crossborder-orders:v1';

export {
  orderFulfillmentStatusLabels as crossBorderOrderStatusLabels,
  orderFulfillmentStatusTextTones as crossBorderOrderStatusTextTones,
  orderFulfillmentStatusTones as crossBorderOrderStatusTones,
};

/** 平台取值待联调核验：不预填具体平台（主PRD Q03），页面按「（待确认）」占位展示。 */
export const CROSSBORDER_PLATFORM_PLACEHOLDER = '（待确认）';

export const crossBorderOrderSeeds = [
  {
    id: 'crossborder-order-1',
    orderNo: 'KJDS-20260918-0001',
    sourceSystem: 'lingxing',
    channelOrderNo: 'LX20260918001',
    platformOrderNo: 'PLT-20260918-0000123',
    platform: CROSSBORDER_PLATFORM_PLACEHOLDER,
    shop: '示例跨境店铺A',
    orderedAt: '2026-09-18 08:12:05',
    customer: 'CUS000005',
    currency: '美元',
    amount: 950.00,
    returnAmount: 405.00,
    creator: '系统',
    createdAt: '2026-09-18 08:12:30',
    updater: '系统',
    updatedAt: '2026-09-23 16:20:31',
    lines: [
      { id: 'crossborder-order-1-line-1', platformSku: 'P-EXAMPLE-SKU01', product: 'SP0101010001', quantity: 5, amount: 620.00, returnAmount: 240.00 },
      { id: 'crossborder-order-1-line-2', platformSku: 'P-EXAMPLE-SKU02', product: 'SP0101020002', quantity: 2, amount: 330.00, returnAmount: 165.00 },
    ],
  },
  {
    id: 'crossborder-order-2',
    orderNo: 'KJDS-20261014-0002',
    sourceSystem: 'lingxing',
    channelOrderNo: 'LX20261014002',
    platformOrderNo: 'PLT-20261014-0000124',
    platform: CROSSBORDER_PLATFORM_PLACEHOLDER,
    shop: '示例跨境店铺B',
    orderedAt: '2026-10-14 09:40:27',
    customer: 'CUS000005',
    currency: '美元',
    amount: 420.00,
    returnAmount: 0,
    creator: '系统',
    createdAt: '2026-10-14 09:41:02',
    updater: '系统',
    updatedAt: '2026-10-14 09:41:02',
    lines: [
      { id: 'crossborder-order-2-line-1', platformSku: 'P-EXAMPLE-SKU03', product: 'SP0101020003', quantity: 1, amount: 420.00, returnAmount: 0 },
    ],
  },
  {
    id: 'crossborder-order-3',
    orderNo: 'KJDS-20261013-0001',
    sourceSystem: 'lingxing',
    channelOrderNo: 'LX20261013001',
    platformOrderNo: 'PLT-20261013-0000122',
    platform: CROSSBORDER_PLATFORM_PLACEHOLDER,
    shop: '示例跨境店铺A',
    orderedAt: '2026-10-13 16:20:00',
    customer: 'CUS000005',
    currency: '人民币',
    amount: 357.00,
    returnAmount: 0,
    creator: '系统',
    createdAt: '2026-10-13 16:20:20',
    updater: '系统',
    updatedAt: '2026-10-14 16:18:40',
    lines: [
      { id: 'crossborder-order-3-line-1', platformSku: 'P-EXAMPLE-SKU04', product: 'SP0103010003', quantity: 3, amount: 357.00, returnAmount: 0 },
    ],
  },
  {
    id: 'crossborder-order-4',
    orderNo: 'KJDS-20261014-0004',
    sourceSystem: 'lingxing',
    channelOrderNo: 'LX20261014004',
    platformOrderNo: 'PLT-20261014-0000126',
    platform: CROSSBORDER_PLATFORM_PLACEHOLDER,
    shop: '示例跨境店铺B',
    orderedAt: '2026-10-14 12:05:41',
    customer: 'CUS000005',
    currency: '美元',
    amount: 199.00,
    returnAmount: 0,
    creator: '系统',
    createdAt: '2026-10-14 12:06:03',
    updater: '系统',
    updatedAt: '2026-10-14 12:06:03',
    lines: [
      { id: 'crossborder-order-4-line-1', platformSku: 'P-EXAMPLE-SKU05', product: 'SP0101010004', quantity: 1, amount: 199.00, returnAmount: 0 },
    ],
  },
  {
    // 商品匹配失败演示：平台商品编码未匹配到ERP商品，商品编码／名称／单位为 `-`
    id: 'crossborder-order-5',
    orderNo: 'KJDS-20261014-0005',
    sourceSystem: 'lingxing',
    channelOrderNo: 'LX20261014005',
    platformOrderNo: 'PLT-20261014-0000127',
    platform: CROSSBORDER_PLATFORM_PLACEHOLDER,
    shop: '示例跨境店铺A',
    orderedAt: '2026-10-14 13:22:18',
    customer: 'CUS000005',
    currency: '美元',
    amount: 658.00,
    returnAmount: 0,
    creator: '系统',
    createdAt: '2026-10-14 13:22:40',
    updater: '系统',
    updatedAt: '2026-10-14 13:25:00',
    lines: [
      { id: 'crossborder-order-5-line-1', platformSku: 'P-EXAMPLE-SKU06', product: '', quantity: 2, amount: 658.00, returnAmount: 0 },
    ],
  },
  {
    // 金额未回传演示：订单级金额为空，展示 `-`
    id: 'crossborder-order-6',
    orderNo: 'KJDS-20261014-0006',
    sourceSystem: 'lingxing',
    channelOrderNo: 'LX20261014006',
    platformOrderNo: 'PLT-20261014-0000128',
    platform: CROSSBORDER_PLATFORM_PLACEHOLDER,
    shop: '示例跨境店铺B',
    orderedAt: '2026-10-14 15:47:02',
    customer: 'CUS000005',
    currency: '美元',
    amount: '',
    returnAmount: 0,
    creator: '系统',
    createdAt: '2026-10-14 15:47:20',
    updater: '系统',
    updatedAt: '2026-10-14 15:47:20',
    lines: [
      { id: 'crossborder-order-6-line-1', platformSku: 'P-EXAMPLE-SKU07', product: 'SP0103020004', quantity: 5, amount: '', returnAmount: 0 },
    ],
  },
];

/** 列表列（顺序按详细稿「列表展示=是」，结构与国内电商订单一致）。 */
export const crossBorderOrderColumns = [
  { key: 'orderNo', label: '订单编号', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: true },
  { key: 'channelOrderNo', label: '渠道单号', defaultWidth: 160, minWidth: 140, maxWidth: 210, ellipsis: true },
  { key: 'platformOrderNo', label: '平台单号', defaultWidth: 190, minWidth: 160, maxWidth: 250, ellipsis: true },
  { key: 'platform', label: '平台', defaultWidth: 96, minWidth: 84, maxWidth: 140, ellipsis: true },
  { key: 'shop', label: '店铺', defaultWidth: 150, minWidth: 120, maxWidth: 220, ellipsis: true },
  { key: 'orderedAt', label: '下单时间', defaultWidth: 170, minWidth: 150, maxWidth: 210, ellipsis: true, sortable: true },
  { key: 'fulfillmentStatus', label: '履约状态', defaultWidth: 96, minWidth: 88, maxWidth: 130, ellipsis: true, render: (value) => orderFulfillmentStatusLabels[value] || value, tone: (value) => orderFulfillmentStatusTextTones[value] || '' },
  { key: 'currency', label: '币别', defaultWidth: 112, minWidth: 96, maxWidth: 140, ellipsis: true, render: (value) => resolveOptionLabel(value, currencyOptions) },
  { key: 'amount', label: '成交优惠后金额合计', defaultWidth: 150, minWidth: 130, maxWidth: 200, ellipsis: true, align: 'right', sortable: true, render: (value) => (value === '' || value == null ? EMPTY_PLACEHOLDER : formatAmount(value)) },
  { key: 'returnAmount', label: '退货金额合计', defaultWidth: 128, minWidth: 110, maxWidth: 180, ellipsis: true, align: 'right', sortable: true, render: (value) => (value === '' || value == null ? EMPTY_PLACEHOLDER : formatAmount(value)) },
  { key: 'updatedAt', label: '最后更新时间', defaultWidth: 170, minWidth: 150, maxWidth: 210, ellipsis: true, sortable: true },
];

export const crossBorderOrderInitialFilters = {
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

export const crossBorderOrderFilterFields = [
  { key: 'orderNo', label: '订单编号', type: 'search', placeholder: '请输入订单编号' },
  { key: 'channelOrderNo', label: '渠道单号', type: 'search', placeholder: '请输入渠道单号' },
  { key: 'platformOrderNo', label: '平台单号', type: 'search', placeholder: '请输入平台单号' },
  { key: 'shop', label: '店铺', type: 'search', placeholder: '请输入店铺' },
  // 跨境自发货平台选项待联调核验（主PRD Q03），当前不预填具体平台
  { key: 'platform', label: '平台', type: 'select', options: [{ value: '', label: '全部' }] },
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

export function filterCrossBorderOrderRows(row, filters) {
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

export function normalizeCrossBorderOrderRow(row) {
  return refreshEcommerceOrderRow(row, 'crossborder');
}

export function normalizeCrossBorderOrderRows(rows = []) {
  return rows.map(normalizeCrossBorderOrderRow);
}

/** 读取本地订单集合：已落库记录 + 缺失种子补齐（列表与详情共用同一份数据）。 */
export function loadCrossBorderOrders() {
  const stored = readMockRows(CROSSBORDER_ORDER_STORAGE_KEY, null);
  if (!Array.isArray(stored)) {
    writeMockRows(CROSSBORDER_ORDER_STORAGE_KEY, crossBorderOrderSeeds);
    return normalizeCrossBorderOrderRows(crossBorderOrderSeeds);
  }
  const missingSeeds = crossBorderOrderSeeds.filter((seed) => !stored.some((row) => row.id === seed.id));
  const merged = missingSeeds.length ? [...stored, ...missingSeeds] : stored;
  if (missingSeeds.length) writeMockRows(CROSSBORDER_ORDER_STORAGE_KEY, merged);
  return normalizeCrossBorderOrderRows(merged);
}

export function loadCrossBorderOrderById(id) {
  return loadCrossBorderOrders().find((row) => row.id === id) || null;
}

export function loadCrossBorderOrderByNo(orderNo) {
  return loadCrossBorderOrders().find((row) => row.orderNo === orderNo) || null;
}

export function upsertCrossBorderOrder(row) {
  upsertMockRow(CROSSBORDER_ORDER_STORAGE_KEY, normalizeCrossBorderOrderRow(row));
}
