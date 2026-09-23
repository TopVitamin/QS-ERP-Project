import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import { useStatusLabels } from '../lib/partnerMasterLogic.js';
import { readMockRows } from '../lib/mockStorage.js';
import {
  AUXILIARY_STORAGE_KEY,
  auxiliaryTypeLabels,
  CATEGORY_STORAGE_KEY,
  levelLabels,
} from '../lib/auxiliaryLogic.js';

export { AUXILIARY_STORAGE_KEY, CATEGORY_STORAGE_KEY };

// 商品等模块引用辅助资料时的可选项：仅启用项（辅助资料主PRD R07、AC06）。
export function getSelectableAuxiliaryOptions(typeId) {
  return readMockRows(AUXILIARY_STORAGE_KEY, auxiliaryItems)
    .filter((row) => row.type === typeId && row.useStatus === 'enabled')
    .map((row) => ({ value: row.name, label: row.name }));
}

export const auxiliaryTypeTree = [
  {
    group: '公共资料',
    items: [
      { id: 'unit', label: '基本单位', mode: 'list' },
      { id: 'currency', label: '币别', mode: 'list', isCurrency: true },
      { id: 'settlement', label: '结算方式', mode: 'list' },
    ],
  },
  {
    group: '商品资料',
    items: [
      { id: 'product_category', label: '商品分类', mode: 'category' },
      { id: 'brand', label: '品牌', mode: 'list' },
    ],
  },
  {
    group: '采购资料',
    items: [{ id: 'payment_terms', label: '付款条件', mode: 'list' }],
  },
  {
    group: '销售资料',
    items: [{ id: 'collection_terms', label: '收款条件', mode: 'list' }],
  },
];

const now = '2026-09-16 10:24';

export const auxiliaryItems = [
  { id: 'aux-unit-1', type: 'unit', code: 'DW0001', name: '个', remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-01 09:00', updater: '阿盛', updatedAt: now, referenced: true },
  { id: 'aux-unit-2', type: 'unit', code: 'DW0002', name: '件', remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-01 09:05', updater: '阿盛', updatedAt: '2026-09-15 11:00', referenced: true },
  { id: 'aux-unit-3', type: 'unit', code: 'DW0003', name: '箱', remark: '整箱计量', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-02 10:00', updater: '阿盛', updatedAt: '2026-09-14 09:30', referenced: false },
  { id: 'aux-unit-4', type: 'unit', code: 'DW0004', name: '台', remark: '', useStatus: 'enabled', creator: '周磊', createdAt: '2026-09-01 14:00', updater: '周磊', updatedAt: '2026-09-12 16:00', referenced: false },
  { id: 'aux-currency-1', type: 'currency', code: 'CNY', name: '人民币', remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-01 09:00', updater: '阿盛', updatedAt: now, referenced: true },
  { id: 'aux-currency-2', type: 'currency', code: 'USD', name: '美元', remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-01 09:10', updater: '阿盛', updatedAt: '2026-09-15 10:00', referenced: true },
  { id: 'aux-currency-3', type: 'currency', code: 'EUR', name: '欧元', remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-03 11:00', updater: '阿盛', updatedAt: '2026-09-13 09:00', referenced: false },
  { id: 'aux-currency-4', type: 'currency', code: 'HKD', name: '港币', remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-03 11:10', updater: '阿盛', updatedAt: '2026-09-12 15:00', referenced: false },
  { id: 'aux-settlement-1', type: 'settlement', code: 'JS0001', name: '月结', remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-04 09:00', updater: '阿盛', updatedAt: now, referenced: true },
  { id: 'aux-settlement-2', type: 'settlement', code: 'JS0002', name: '现结', remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-04 09:10', updater: '阿盛', updatedAt: '2026-09-14 10:00', referenced: true },
  { id: 'aux-settlement-3', type: 'settlement', code: 'JS0003', name: '预付', remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-05 10:00', updater: '阿盛', updatedAt: '2026-09-13 11:00', referenced: true },
  { id: 'aux-brand-1', type: 'brand', code: 'PP0001', name: '罗技', remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-06 09:00', updater: '阿盛', updatedAt: now, referenced: true },
  { id: 'aux-brand-2', type: 'brand', code: 'PP0002', name: '联想', remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-06 09:10', updater: '阿盛', updatedAt: '2026-09-15 09:00', referenced: true },
  { id: 'aux-brand-3', type: 'brand', code: 'PP0003', name: '绿联', remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-06 09:20', updater: '阿盛', updatedAt: '2026-09-14 08:00', referenced: true },
  { id: 'aux-brand-4', type: 'brand', code: 'PP0004', name: '虚构品牌', remark: '演示用', useStatus: 'disabled', creator: '周磊', createdAt: '2026-09-01 10:00', updater: '周磊', updatedAt: '2026-09-12 14:00', referenced: false },
  { id: 'aux-brand-5', type: 'brand', code: 'PP0005', name: '强盛自营', remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-07 09:00', updater: '阿盛', updatedAt: '2026-09-13 10:00', referenced: true },
  { id: 'aux-payment-1', type: 'payment_terms', code: 'FK0001', name: '月结30天', remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-08 09:00', updater: '阿盛', updatedAt: now, referenced: true },
  { id: 'aux-payment-2', type: 'payment_terms', code: 'FK0002', name: '月结60天', remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-08 09:10', updater: '阿盛', updatedAt: '2026-09-14 11:00', referenced: false },
  { id: 'aux-payment-3', type: 'payment_terms', code: 'FK0003', name: '货到付款', remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-08 09:20', updater: '阿盛', updatedAt: '2026-09-13 09:30', referenced: true },
  { id: 'aux-payment-4', type: 'payment_terms', code: 'FK0004', name: '预付30%', remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-08 09:30', updater: '阿盛', updatedAt: '2026-09-12 16:00', referenced: true },
  { id: 'aux-collection-1', type: 'collection_terms', code: 'SK0001', name: '月结30天', remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-09 09:00', updater: '阿盛', updatedAt: now, referenced: true },
  { id: 'aux-collection-2', type: 'collection_terms', code: 'SK0002', name: '月结45天', remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-09 09:10', updater: '阿盛', updatedAt: '2026-09-14 10:30', referenced: false },
  { id: 'aux-collection-3', type: 'collection_terms', code: 'SK0003', name: '货到付款', remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-09 09:20', updater: '阿盛', updatedAt: '2026-09-13 11:30', referenced: true },
  { id: 'aux-collection-4', type: 'collection_terms', code: 'SK0004', name: '预收30%', remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-09 09:30', updater: '阿盛', updatedAt: '2026-09-12 15:30', referenced: false },
];

export const seedCategories = [
  { id: 'cat-electronics', code: '01', name: '电子产品', parentId: '', level: 1, remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-01 09:00', updater: '阿盛', updatedAt: now, referenced: false },
  { id: 'cat-peripheral', code: '0101', name: '电脑外设', parentId: 'cat-electronics', level: 2, remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-01 09:10', updater: '阿盛', updatedAt: now, referenced: false },
  { id: 'cat-keyboard', code: '010101', name: '键盘', parentId: 'cat-peripheral', level: 3, remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-01 09:20', updater: '阿盛', updatedAt: now, referenced: true },
  { id: 'cat-mouse', code: '010102', name: '鼠标', parentId: 'cat-peripheral', level: 3, remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-01 09:25', updater: '阿盛', updatedAt: '2026-09-15 10:00', referenced: true },
  { id: 'cat-dock', code: '010103', name: '扩展坞', parentId: 'cat-peripheral', level: 3, remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-01 09:30', updater: '阿盛', updatedAt: '2026-09-14 09:00', referenced: true },
  { id: 'cat-display', code: '0102', name: '显示设备', parentId: 'cat-electronics', level: 2, remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-02 10:00', updater: '阿盛', updatedAt: '2026-09-15 11:00', referenced: false },
  { id: 'cat-monitor', code: '010201', name: '显示器', parentId: 'cat-display', level: 3, remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-02 10:10', updater: '阿盛', updatedAt: '2026-09-14 10:00', referenced: true },
  { id: 'cat-stand', code: '010202', name: '支架', parentId: 'cat-display', level: 3, remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-02 10:20', updater: '阿盛', updatedAt: '2026-09-13 09:00', referenced: true },
  { id: 'cat-accessory', code: '0103', name: '配件', parentId: 'cat-electronics', level: 2, remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-03 11:00', updater: '阿盛', updatedAt: '2026-09-12 16:00', referenced: false },
  { id: 'cat-bag', code: '010301', name: '背包', parentId: 'cat-accessory', level: 3, remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-03 11:10', updater: '阿盛', updatedAt: '2026-09-12 15:00', referenced: true },
  { id: 'cat-cable', code: '010302', name: '线缆', parentId: 'cat-accessory', level: 3, remark: '', useStatus: 'enabled', creator: '阿盛', createdAt: '2026-08-03 11:20', updater: '阿盛', updatedAt: '2026-09-11 14:00', referenced: true },
  { id: 'cat-socket', code: '010303', name: '插座', parentId: 'cat-accessory', level: 3, remark: '', useStatus: 'disabled', creator: '周磊', createdAt: '2026-09-01 10:00', updater: '周磊', updatedAt: '2026-09-10 10:00', referenced: false },
];

function renderUse(value) {
  return useStatusLabels[value] || EMPTY_PLACEHOLDER;
}

export const auxiliaryColumns = [
  { key: 'code', label: '资料编码', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true },
  { key: 'name', label: '资料名称', defaultWidth: 160, minWidth: 120, maxWidth: 220, ellipsis: true },
  { key: 'useStatus', label: '使用状态', defaultWidth: 100, minWidth: 88, maxWidth: 140, ellipsis: true, render: renderUse, tone: (value) => (value === 'disabled' ? 'text-erp-text-muted' : 'text-erp-success') },
  { key: 'remark', label: '备注', defaultWidth: 180, minWidth: 120, maxWidth: 260, ellipsis: true },
  { key: 'updatedAt', label: '最后更新时间', defaultWidth: 150, minWidth: 130, maxWidth: 200, ellipsis: true, sortable: true },
  { key: 'updater', label: '最后更新人', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true, defaultVisible: false },
];

export const categoryColumns = [
  { key: 'code', label: '分类编码', defaultWidth: 110, minWidth: 96, maxWidth: 140, ellipsis: true },
  { key: 'name', label: '分类名称', defaultWidth: 220, minWidth: 160, maxWidth: 320, ellipsis: true, link: true },
  { key: 'level', label: '分类级别', defaultWidth: 100, minWidth: 88, maxWidth: 120, ellipsis: true, render: (value) => levelLabels[value] || EMPTY_PLACEHOLDER },
  { key: 'useStatus', label: '使用状态', defaultWidth: 100, minWidth: 88, maxWidth: 140, ellipsis: true, render: renderUse, tone: (value) => (value === 'disabled' ? 'text-erp-text-muted' : 'text-erp-success') },
  { key: 'remark', label: '备注', defaultWidth: 160, minWidth: 120, maxWidth: 220, ellipsis: true, defaultVisible: false },
  { key: 'updater', label: '最后更新人', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true, defaultVisible: false },
];

export function buildInitialVisibility(columns) {
  return Object.fromEntries(columns.map((column) => [column.key, column.defaultVisible !== false]));
}

export function getAuxiliaryTypeConfig(typeId) {
  for (const group of auxiliaryTypeTree) {
    const item = group.items.find((entry) => entry.id === typeId);
    if (item) return { ...item, group: group.group };
  }
  return null;
}

export function getTypeLabel(typeId) {
  return auxiliaryTypeLabels[typeId] || getAuxiliaryTypeConfig(typeId)?.label || typeId;
}
