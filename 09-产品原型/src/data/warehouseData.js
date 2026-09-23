import { buildMasterOption, formatCodeName } from '../lib/codeName.js';
import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import { readMockRows } from '../lib/mockStorage.js';
import { formatWarehouseAddress } from '../lib/warehouseAddress.js';
import {
  LOGICAL_STORAGE_KEY,
  physicalAuditLabels,
  physicalAuditTones,
  stockStatusLabels,
  useStatusLabels,
} from '../lib/warehouseLogic.js';

export const warehouseStatusLabels = physicalAuditLabels;
export const warehouseStatusTones = physicalAuditTones;
export const warehouseUseStatusLabels = useStatusLabels;

// 单据可选项：仅审核通过且启用的逻辑仓，展示 Code-Name（仓库主PRD R04、AC04）。
export function getSelectableLogicalWarehouseOptions() {
  return readMockRows(LOGICAL_STORAGE_KEY, logicalWarehouses)
    .filter((row) => row.auditStatus === 'approved' && row.useStatus === 'enabled')
    .map((row) => buildMasterOption({ code: row.code, name: row.name }));
}

const seedPhysicalWarehouses = [
  {
    code: 'WH000001',
    name: '深圳仓',
    operationType: '自营',
    remark: '华南自营主仓',
    warehouseAddress: {
      countryRegion: 'CN',
      provinceCode: '44',
      cityCode: '4403',
      districtCode: '440306',
      stateOrProvince: '',
      city: '',
      detailAddress: '福永街道物流园 3 号库',
    },
    contact: '阿盛',
    phone: '0755-8888 3201',
    dockingType: '直连',
    dockingSystem: '仓库作业系统',
    thirdPartyCode: 'SZ-WH-001',
    thirdPartyOwner: '',
    authConfig: '',
    useStatus: 'enabled',
    auditStatus: 'approved',
    auditor: '主数据管理员',
    auditedAt: '2026-08-16 10:00',
    creator: '阿盛',
    createdAt: '2026-08-10 09:00',
    updater: '阿盛',
    updatedAt: '2026-09-16 10:24',
    referenced: true,
  },
  {
    code: 'WH000002',
    name: '东莞电商仓',
    operationType: '第三方',
    remark: '',
    warehouseAddress: {
      countryRegion: 'CN',
      provinceCode: '44',
      cityCode: '4419',
      districtCode: '441900121',
      stateOrProvince: '',
      city: '',
      detailAddress: '电商产业园 B2 仓',
    },
    contact: '陈仓管',
    phone: '0762-6666 1180',
    dockingType: 'SaaS中转',
    dockingSystem: '聚水潭',
    thirdPartyCode: 'DG-EC-01',
    thirdPartyOwner: '强盛科技',
    authConfig: '',
    useStatus: 'enabled',
    auditStatus: 'approved',
    auditor: '主数据管理员',
    auditedAt: '2026-08-15 14:20',
    creator: '阿盛',
    createdAt: '2026-08-12 11:30',
    updater: '陈仓管',
    updatedAt: '2026-09-15 18:02',
    referenced: false,
  },
  {
    code: 'WH000003',
    name: 'Amazon FBA（美国）',
    operationType: '第三方',
    remark: '',
    warehouseAddress: {
      countryRegion: 'US',
      provinceCode: '',
      cityCode: '',
      districtCode: '',
      stateOrProvince: '加州',
      city: '安大略',
      detailAddress: '亚马逊运营中心',
    },
    contact: '周磊',
    phone: '',
    dockingType: 'SaaS中转',
    dockingSystem: '领星',
    thirdPartyCode: 'FBA-US-ONT8',
    thirdPartyOwner: 'QS-US',
    authConfig: '',
    useStatus: 'enabled',
    auditStatus: 'approved',
    auditor: '主数据管理员',
    auditedAt: '2026-08-14 16:00',
    creator: '周磊',
    createdAt: '2026-08-12 09:00',
    updater: '周磊',
    updatedAt: '2026-09-14 11:20',
    referenced: false,
  },
  {
    code: 'WH000004',
    name: 'Amazon FBA（欧洲）',
    operationType: '第三方',
    remark: '',
    warehouseAddress: {
      countryRegion: 'DE',
      provinceCode: '',
      cityCode: '',
      districtCode: '',
      stateOrProvince: '',
      city: '法兰克福',
      detailAddress: '亚马逊运营中心',
    },
    contact: '周磊',
    phone: '',
    dockingType: 'SaaS中转',
    dockingSystem: '领星',
    thirdPartyCode: '',
    thirdPartyOwner: '',
    authConfig: '',
    useStatus: 'enabled',
    auditStatus: 'pending',
    creator: '周磊',
    createdAt: '2026-08-18 10:05',
    updater: '周磊',
    updatedAt: '2026-09-13 10:05',
    referenced: false,
  },
  {
    code: 'WH000005',
    name: '第三方海外仓（日本）',
    operationType: '第三方',
    remark: '',
    warehouseAddress: {
      countryRegion: 'JP',
      provinceCode: '',
      cityCode: '',
      districtCode: '',
      stateOrProvince: '大阪府',
      city: '大阪',
      detailAddress: '3PL 仓库',
    },
    contact: '周磊',
    phone: '',
    dockingType: 'SaaS中转',
    dockingSystem: '领星',
    thirdPartyCode: '',
    thirdPartyOwner: '',
    authConfig: '',
    useStatus: 'disabled',
    auditStatus: 'pending',
    creator: '周磊',
    createdAt: '2026-08-16 16:40',
    updater: '周磊',
    updatedAt: '2026-09-12 16:40',
    referenced: false,
  },
  {
    code: 'WH000006',
    name: '第三方海外仓（德国）',
    operationType: '第三方',
    remark: '',
    warehouseAddress: {
      countryRegion: 'DE',
      provinceCode: '',
      cityCode: '',
      districtCode: '',
      stateOrProvince: '',
      city: '杜塞尔多夫',
      detailAddress: '3PL 仓库',
    },
    contact: '待填写',
    phone: '',
    dockingType: 'SaaS中转',
    dockingSystem: '领星',
    thirdPartyCode: '',
    thirdPartyOwner: '',
    authConfig: '',
    useStatus: 'disabled',
    auditStatus: 'draft',
    creator: '周磊',
    createdAt: '2026-08-18 14:22',
    updater: '周磊',
    updatedAt: '2026-09-11 14:22',
    referenced: false,
  },
  {
    code: 'WH000007',
    name: '第三方中转仓（香港）',
    operationType: '第三方',
    remark: '',
    warehouseAddress: {
      countryRegion: 'HK',
      provinceCode: '',
      cityCode: '',
      districtCode: '',
      stateOrProvince: '',
      city: '葵涌',
      detailAddress: '货柜码头中转仓',
    },
    contact: '待填写',
    phone: '',
    dockingType: 'SaaS中转',
    dockingSystem: '领星',
    thirdPartyCode: '',
    thirdPartyOwner: '',
    authConfig: '',
    useStatus: 'disabled',
    auditStatus: 'rejected',
    creator: '周磊',
    createdAt: '2026-08-14 10:44',
    updater: '周磊',
    updatedAt: '2026-09-10 10:44',
    referenced: false,
  },
];

export const physicalWarehouses = seedPhysicalWarehouses.map((row, index) => ({
  id: `physical-warehouse-${index + 1}`,
  ...row,
  address: formatWarehouseAddress(row.warehouseAddress),
}));

const seedLogicalWarehouses = [
  {
    code: 'LWH000001',
    name: '深圳正常品仓',
    physicalWarehouseId: 'physical-warehouse-1',
    stockStatus: 'normal',
    remark: '',
    useStatus: 'enabled',
    auditStatus: 'approved',
    auditor: '主数据管理员',
    auditedAt: '2026-08-17 11:00',
    creator: '阿盛',
    createdAt: '2026-08-16 15:00',
    updater: '阿盛',
    updatedAt: '2026-09-16 09:30',
    referenced: true,
  },
  {
    code: 'LWH000002',
    name: '深圳残次品仓',
    physicalWarehouseId: 'physical-warehouse-1',
    stockStatus: 'defective',
    remark: '',
    useStatus: 'enabled',
    auditStatus: 'approved',
    auditor: '主数据管理员',
    auditedAt: '2026-08-17 11:10',
    creator: '阿盛',
    createdAt: '2026-08-16 15:10',
    updater: '阿盛',
    updatedAt: '2026-09-15 17:20',
    referenced: false,
  },
  {
    code: 'LWH000003',
    name: '东莞电商正常品仓',
    physicalWarehouseId: 'physical-warehouse-2',
    stockStatus: 'normal',
    remark: '',
    useStatus: 'enabled',
    auditStatus: 'draft',
    creator: '陈仓管',
    createdAt: '2026-09-10 10:00',
    updater: '陈仓管',
    updatedAt: '2026-09-14 14:00',
    referenced: false,
  },
  {
    code: 'LWH000004',
    name: '日本海外正常品仓',
    physicalWarehouseId: 'physical-warehouse-5',
    stockStatus: 'normal',
    remark: '父实体仓已禁用，逻辑仓仍保留',
    useStatus: 'enabled',
    auditStatus: 'approved',
    auditor: '主数据管理员',
    auditedAt: '2026-08-17 09:00',
    creator: '周磊',
    createdAt: '2026-08-16 17:00',
    updater: '周磊',
    updatedAt: '2026-09-13 08:40',
    referenced: false,
  },
];

export const logicalWarehouses = seedLogicalWarehouses.map((row, index) => ({
  id: `logical-warehouse-${index + 1}`,
  ...row,
}));

export const warehouses = physicalWarehouses;

export function getPhysicalWarehouseOption(row) {
  return { value: row.id, code: row.code, name: row.name, label: formatCodeName(row.code, row.name) };
}

export function resolvePhysicalLabel(physicalWarehouseId, physicalRows = physicalWarehouses) {
  const row = physicalRows.find((item) => item.id === physicalWarehouseId);
  if (!row) return EMPTY_PLACEHOLDER;
  return formatCodeName(row.code, row.name);
}

function renderAuditStatus(value) {
  return physicalAuditLabels[value] || EMPTY_PLACEHOLDER;
}

function renderUseStatus(value) {
  return useStatusLabels[value] || EMPTY_PLACEHOLDER;
}

export const physicalWarehouseColumns = [
  { key: 'code', label: '实体仓编码', defaultWidth: 150, minWidth: 130, maxWidth: 220, ellipsis: true, link: true },
  { key: 'name', label: '实体仓名称', defaultWidth: 190, minWidth: 140, maxWidth: 260, ellipsis: true },
  { key: 'operationType', label: '运营类型', defaultWidth: 100, minWidth: 88, maxWidth: 150, ellipsis: true },
  { key: 'contact', label: '联系人', defaultWidth: 100, minWidth: 88, maxWidth: 150, ellipsis: true },
  { key: 'dockingType', label: '对接方式', defaultWidth: 110, minWidth: 96, maxWidth: 160, ellipsis: true },
  { key: 'dockingSystem', label: '对接系统', defaultWidth: 140, minWidth: 110, maxWidth: 200, ellipsis: true },
  { key: 'thirdPartyCode', label: '第三方仓库编码', defaultWidth: 160, minWidth: 130, maxWidth: 220, ellipsis: true },
  { key: 'auditStatus', label: '审核状态', defaultWidth: 100, minWidth: 88, maxWidth: 150, ellipsis: true, render: renderAuditStatus, tone: (value) => physicalAuditTones[value] || '' },
  { key: 'useStatus', label: '使用状态', defaultWidth: 100, minWidth: 88, maxWidth: 150, ellipsis: true, render: renderUseStatus, tone: (value) => (value === 'disabled' ? 'text-erp-text-muted' : 'text-erp-success') },
  { key: 'updatedAt', label: '最后更新时间', defaultWidth: 150, minWidth: 130, maxWidth: 200, ellipsis: true, sortable: true },
  { key: 'address', label: '仓库地址', defaultWidth: 260, minWidth: 160, maxWidth: 360, ellipsis: true, defaultVisible: false, render: (_, row) => formatWarehouseAddress(row.warehouseAddress || row.address) || EMPTY_PLACEHOLDER },
  { key: 'phone', label: '联系电话', defaultWidth: 150, minWidth: 120, maxWidth: 200, ellipsis: true, defaultVisible: false },
  { key: 'thirdPartyOwner', label: '第三方仓库货主', defaultWidth: 150, minWidth: 120, maxWidth: 200, ellipsis: true, defaultVisible: false },
  { key: 'auditor', label: '审核人', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true, defaultVisible: false },
  { key: 'updater', label: '最后更新人', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true, defaultVisible: false },
];

export function createLogicalWarehouseColumns(physicalRows = physicalWarehouses) {
  return [
  { key: 'code', label: '逻辑仓编码', defaultWidth: 150, minWidth: 130, maxWidth: 220, ellipsis: true, link: true },
  { key: 'name', label: '逻辑仓名称', defaultWidth: 190, minWidth: 140, maxWidth: 260, ellipsis: true },
  {
    key: 'physicalWarehouseId',
    label: '所属实体仓',
    defaultWidth: 200,
    minWidth: 160,
    maxWidth: 280,
    ellipsis: true,
    link: true,
    render: (value) => resolvePhysicalLabel(value, physicalRows),
  },
  { key: 'stockStatus', label: '库存状态', defaultWidth: 100, minWidth: 88, maxWidth: 150, ellipsis: true, render: (value) => stockStatusLabels[value] || EMPTY_PLACEHOLDER },
  { key: 'auditStatus', label: '审核状态', defaultWidth: 100, minWidth: 88, maxWidth: 150, ellipsis: true, render: renderAuditStatus, tone: (value) => physicalAuditTones[value] || '' },
  { key: 'useStatus', label: '使用状态', defaultWidth: 100, minWidth: 88, maxWidth: 150, ellipsis: true, render: renderUseStatus, tone: (value) => (value === 'disabled' ? 'text-erp-text-muted' : 'text-erp-success') },
  { key: 'updatedAt', label: '最后更新时间', defaultWidth: 150, minWidth: 130, maxWidth: 200, ellipsis: true, sortable: true },
  { key: 'auditor', label: '审核人', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true, defaultVisible: false },
  { key: 'updater', label: '最后更新人', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true, defaultVisible: false },
  ];
}

export const logicalWarehouseColumns = createLogicalWarehouseColumns();

export const warehouseColumns = physicalWarehouseColumns;

export function buildInitialVisibility(columns) {
  return Object.fromEntries(columns.map((column) => [column.key, column.defaultVisible !== false]));
}
