import { buildMasterOption, formatCodeName } from '../lib/codeName.js';
import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import { readMockRows } from '../lib/mockStorage.js';
import { formatWarehouseAddress } from '../lib/warehouseAddress.js';
import {
  LOGICAL_STORAGE_KEY,
  PHYSICAL_STORAGE_KEY,
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

/** 库存模块口径：全部逻辑仓，含已禁用逻辑仓与虚拟在途仓（库存查询主PRD Q04、库存流水主PRD Q05）。 */
export function getAllLogicalWarehouses() {
  return readMockRows(LOGICAL_STORAGE_KEY, logicalWarehouses);
}

export function isTransitLogicalWarehouse(rowOrCode) {
  const row = typeof rowOrCode === 'string'
    ? getAllLogicalWarehouses().find((item) => item.code === rowOrCode)
    : rowOrCode;
  return row?.warehouseKind === 'transit';
}

/**
 * 库存模块逻辑仓选项（Code-Name）。
 * 默认含已禁用逻辑仓与虚拟在途仓；业务单据按各自PRD决定是否过滤在途仓。
 */
export function getInventoryLogicalWarehouseOptions({ includeDisabled = true, includeTransit = true } = {}) {
  return getAllLogicalWarehouses()
    .filter((row) => (includeDisabled || row.useStatus === 'enabled'))
    .filter((row) => (includeTransit || row.warehouseKind !== 'transit'))
    .map((row) => buildMasterOption({ code: row.code, name: row.name }));
}

/** 实体仓选项（库存查询、库存流水的所属实体仓筛选）：码值取实体仓编码，选项含已禁用实体仓。 */
export function getInventoryPhysicalWarehouseOptions() {
  return readMockRows(PHYSICAL_STORAGE_KEY, physicalWarehouses)
    .map((row) => buildMasterOption({ code: row.code, name: row.name }));
}

export function resolveLogicalWarehouseRow(codeOrId) {
  return getAllLogicalWarehouses().find((row) => row.code === codeOrId || row.id === codeOrId) || null;
}

export function resolveLogicalWarehouseLabel(code) {
  const row = resolveLogicalWarehouseRow(code);
  return row ? formatCodeName(row.code, row.name) : EMPTY_PLACEHOLDER;
}

/** 逻辑仓归属的实体仓编码与名称；实体仓档案被删或缺失时按 `-` 兜底。 */
export function resolveLogicalWarehousePhysical(code, physicalRows = readMockRows(PHYSICAL_STORAGE_KEY, physicalWarehouses)) {
  const logical = resolveLogicalWarehouseRow(code);
  const physical = physicalRows.find((row) => row.id === logical?.physicalWarehouseId || row.code === logical?.physicalWarehouseId);
  if (!physical) return { code: '', name: '', label: EMPTY_PLACEHOLDER, row: null };
  return { code: physical.code, name: physical.name, label: formatCodeName(physical.code, physical.name), row: physical };
}

export function resolveLogicalWarehouseStockStatus(code) {
  return resolveLogicalWarehouseRow(code)?.stockStatus || '';
}

/** 按实体仓编码（或 id）取 Code-Name 展示值；库存比对按实体仓汇总展示时使用。 */
export function resolvePhysicalWarehouseLabel(code) {
  const row = readMockRows(PHYSICAL_STORAGE_KEY, physicalWarehouses).find((item) => item.code === code || item.id === code);
  return row ? formatCodeName(row.code, row.name) : EMPTY_PLACEHOLDER;
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
  {
    code: 'LWH000005',
    name: '深圳正常品二号仓',
    physicalWarehouseId: 'physical-warehouse-1',
    stockStatus: 'normal',
    remark: '与 LWH000001 同实体仓同库存状态，用于库存汇总核对',
    useStatus: 'enabled',
    auditStatus: 'approved',
    auditor: '主数据管理员',
    auditedAt: '2026-09-05 10:00',
    creator: '阿盛',
    createdAt: '2026-09-04 09:30',
    updater: '阿盛',
    updatedAt: '2026-09-20 09:00',
    referenced: false,
  },
  {
    code: 'LWH000006',
    name: '深圳待检品仓',
    physicalWarehouseId: 'physical-warehouse-1',
    stockStatus: 'inspection',
    remark: '',
    useStatus: 'enabled',
    auditStatus: 'approved',
    auditor: '主数据管理员',
    auditedAt: '2026-09-05 10:10',
    creator: '阿盛',
    createdAt: '2026-09-04 09:40',
    updater: '阿盛',
    updatedAt: '2026-09-19 16:20',
    referenced: false,
  },
  {
    code: 'LWH000007',
    name: '东莞电商待检品仓',
    physicalWarehouseId: 'physical-warehouse-2',
    stockStatus: 'inspection',
    remark: '',
    useStatus: 'enabled',
    auditStatus: 'approved',
    auditor: '主数据管理员',
    auditedAt: '2026-09-08 11:00',
    creator: '陈仓管',
    createdAt: '2026-09-07 15:30',
    updater: '陈仓管',
    updatedAt: '2026-09-18 10:10',
    referenced: false,
  },
  {
    code: 'LWH000008',
    name: '东莞电商残次品仓',
    physicalWarehouseId: 'physical-warehouse-2',
    stockStatus: 'defective',
    remark: '已禁用逻辑仓，仍可能有存量库存',
    useStatus: 'disabled',
    auditStatus: 'approved',
    auditor: '主数据管理员',
    auditedAt: '2026-08-20 09:00',
    creator: '陈仓管',
    createdAt: '2026-08-19 14:00',
    updater: '陈仓管',
    updatedAt: '2026-09-12 11:40',
    referenced: false,
  },
  {
    // 虚拟在途仓：用于分步式调拨在途记账（《库存与仓储业务设计》§4.2）。
    // 档案仍按库存查询主PRD Q04记录待确认项；该逻辑仓承载调拨在途数量，并可用于其他出入库申请。
    code: 'LWH000009',
    name: '深圳在途仓',
    physicalWarehouseId: 'physical-warehouse-1',
    stockStatus: 'normal',
    warehouseKind: 'transit',
    remark: '虚拟逻辑仓，承载分步式调拨在途数量，可作为其他出入库申请的逻辑仓',
    useStatus: 'enabled',
    auditStatus: 'approved',
    auditor: '主数据管理员',
    auditedAt: '2026-09-01 09:00',
    creator: '系统',
    createdAt: '2026-09-01 09:00',
    updater: '系统',
    updatedAt: '2026-09-23 10:00',
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
