import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import { formatCodeName } from '../lib/codeName.js';
import { readMockRows } from '../lib/mockStorage.js';
import { useStatusLabels } from '../lib/partnerMasterLogic.js';
import {
  CARRIER_STORAGE_KEY,
  PRODUCT_STORAGE_KEY,
  renderTransportType,
  resolveCarrierLabel,
} from '../lib/logisticsLogic.js';

export { CARRIER_STORAGE_KEY, PRODUCT_STORAGE_KEY };

export const carriers = [
  {
    id: 'carrier-log000001',
    code: 'LOG000001',
    name: '顺丰速运',
    contact: '陈伟',
    phone: '400-000-0001',
    address: '广东省深圳市福田区益田路 5033 号',
    useStatus: 'enabled',
    creator: '阿盛',
    createdAt: '2026-08-01 09:00',
    updater: '阿盛',
    updatedAt: '2026-09-16 10:24',
    referenced: false,
  },
  {
    id: 'carrier-log000002',
    code: 'LOG000002',
    name: '德邦物流',
    contact: '李大件',
    phone: '400-000-0002',
    address: '上海市青浦区华新镇华志路 1685 号',
    useStatus: 'enabled',
    creator: '阿盛',
    createdAt: '2026-08-05 11:00',
    updater: '周磊',
    updatedAt: '2026-09-15 14:30',
    referenced: false,
  },
  {
    id: 'carrier-log000003',
    code: 'LOG000003',
    name: '中通快递',
    contact: '王快递',
    phone: '400-000-0003',
    address: '上海市青浦区华新镇华志路 1685 号',
    useStatus: 'enabled',
    creator: '阿盛',
    createdAt: '2026-08-08 10:00',
    updater: '阿盛',
    updatedAt: '2026-09-14 09:18',
    referenced: false,
  },
  {
    id: 'carrier-log000004',
    code: 'LOG000004',
    name: '示例停用物流',
    contact: '测试',
    phone: '',
    address: '',
    useStatus: 'disabled',
    creator: '周磊',
    createdAt: '2026-09-01 15:00',
    updater: '周磊',
    updatedAt: '2026-09-12 16:00',
    referenced: false,
  },
];

export const logisticsProducts = [
  {
    id: 'lsp-000001',
    code: 'LSP000001',
    name: '顺丰标快',
    carrierId: 'carrier-log000001',
    transportType: 'domestic_express',
    useStatus: 'enabled',
    creator: '阿盛',
    createdAt: '2026-08-02 09:30',
    updater: '阿盛',
    updatedAt: '2026-09-16 10:20',
    referenced: true,
  },
  {
    id: 'lsp-000002',
    code: 'LSP000002',
    name: '德邦大件',
    carrierId: 'carrier-log000002',
    transportType: 'domestic_ltl',
    useStatus: 'enabled',
    creator: '阿盛',
    createdAt: '2026-08-06 11:20',
    updater: '周磊',
    updatedAt: '2026-09-15 14:10',
    referenced: true,
  },
  {
    id: 'lsp-000003',
    code: 'LSP000003',
    name: '中通经济',
    carrierId: 'carrier-log000003',
    transportType: 'domestic_express',
    useStatus: 'enabled',
    creator: '阿盛',
    createdAt: '2026-08-09 10:40',
    updater: '阿盛',
    updatedAt: '2026-09-14 09:00',
    referenced: false,
  },
  {
    id: 'lsp-000004',
    code: 'LSP000004',
    name: '顺丰国际快递',
    carrierId: 'carrier-log000001',
    transportType: 'international_express',
    useStatus: 'disabled',
    creator: '周磊',
    createdAt: '2026-09-05 13:00',
    updater: '周磊',
    updatedAt: '2026-09-13 11:30',
    referenced: false,
  },
];

function renderUse(value) {
  return useStatusLabels[value] || EMPTY_PLACEHOLDER;
}

// 单据可选项：仅启用中的物流服务产品，展示 Code-Name（物流主PRD R03、AC04）。
export function getSelectableLogisticsProductOptions() {
  const productOptions = readMockRows(PRODUCT_STORAGE_KEY, logisticsProducts)
    .filter((row) => row.useStatus === 'enabled')
    .map((row) => ({ value: row.code, label: formatCodeName(row.code, row.name) }));
  return [...productOptions, { value: 'warehouse-assign', label: '由仓库指定' }];
}

export const carrierColumns = [
  { key: 'code', label: '物流商编码', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true, link: true },
  { key: 'name', label: '物流商名称', defaultWidth: 160, minWidth: 120, maxWidth: 220, ellipsis: true },
  { key: 'contact', label: '联系人', defaultWidth: 100, minWidth: 88, maxWidth: 140, ellipsis: true },
  { key: 'phone', label: '联系电话', defaultWidth: 130, minWidth: 110, maxWidth: 170, ellipsis: true },
  { key: 'useStatus', label: '使用状态', defaultWidth: 100, minWidth: 88, maxWidth: 140, ellipsis: true, render: renderUse, tone: (value) => (value === 'disabled' ? 'text-erp-text-muted' : 'text-erp-success') },
  { key: 'updatedAt', label: '最后更新时间', defaultWidth: 150, minWidth: 130, maxWidth: 200, ellipsis: true, sortable: true },
  { key: 'address', label: '联系地址', defaultWidth: 200, minWidth: 140, maxWidth: 280, ellipsis: true, defaultVisible: false },
  { key: 'updater', label: '最后更新人', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true, defaultVisible: false },
];

export function createProductColumns(carrierRows) {
  return [
    { key: 'code', label: '物流服务产品编码', defaultWidth: 150, minWidth: 120, maxWidth: 180, ellipsis: true, link: true },
    { key: 'name', label: '物流服务产品名称', defaultWidth: 180, minWidth: 140, maxWidth: 240, ellipsis: true },
    { key: 'carrierId', label: '所属物流商', defaultWidth: 180, minWidth: 140, maxWidth: 240, ellipsis: true, link: true, render: (value) => resolveCarrierLabel(value, carrierRows) },
    { key: 'transportType', label: '运输类型', defaultWidth: 110, minWidth: 96, maxWidth: 150, ellipsis: true, render: renderTransportType },
    { key: 'useStatus', label: '使用状态', defaultWidth: 100, minWidth: 88, maxWidth: 140, ellipsis: true, render: renderUse, tone: (value) => (value === 'disabled' ? 'text-erp-text-muted' : 'text-erp-success') },
    { key: 'updatedAt', label: '最后更新时间', defaultWidth: 150, minWidth: 130, maxWidth: 200, ellipsis: true, sortable: true },
    { key: 'updater', label: '最后更新人', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true, defaultVisible: false },
  ];
}

export function buildCarrierFilterOptions(carrierRows) {
  return [
    { value: '', label: '全部物流商' },
    ...carrierRows.map((item) => ({ value: item.id, label: formatCodeName(item.code, item.name) })),
  ];
}

export function buildInitialVisibility(columns) {
  return Object.fromEntries(columns.map((column) => [column.key, column.defaultVisible !== false]));
}
