import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import { buildMasterOption } from '../lib/codeName.js';
import { readMockRows } from '../lib/mockStorage.js';
import {
  resolveCollectionTermsLabel,
  resolveCurrencyLabel,
  resolveSettlementMethodLabel,
} from './partnerMasterOptions.js';
import {
  auditLabels,
  auditTones,
  getDefaultContactMobile,
  getDefaultContactName,
  renderLevel,
  useStatusLabels,
} from '../lib/partnerMasterLogic.js';

export const CUSTOMER_STORAGE_KEY = 'qs-erp:customers:v1';

// 单据可选项：仅审核通过且启用，展示 Code-Name（客户主PRD F03/F04、AC04/AC05）。
export function getSelectableCustomerOptions() {
  return readMockRows(CUSTOMER_STORAGE_KEY, customers)
    .filter((row) => row.auditStatus === 'approved' && row.useStatus === 'enabled')
    .map((row) => buildMasterOption({ code: row.code, name: row.name, defaultCurrency: row.currency }));
}

function createEmptyBusinessInfo() {
  return { companyName: '', taxNo: '', registeredAddress: '', registeredPhone: '', bankName: '', bankAccount: '' };
}

const seedCustomers = [
  {
    code: 'CUS000001',
    name: '示例客户有限公司',
    category: '国内2B客户',
    level: 'A',
    remark: '',
    currency: '人民币',
    settlementMethod: '月结',
    collectionTerms: '月结30天',
    contacts: [{ id: 'cus-c1', name: '李静', type: '业务', mobile: '13800138011', phone: '', email: 'li@example.com', isDefault: true, remark: '' }],
    addresses: [{
      id: 'cus-a1',
      addressType: '收货',
      countryRegion: 'CN',
      provinceCode: '44',
      cityCode: '4403',
      districtCode: '440305',
      stateOrProvince: '',
      city: '',
      detailAddress: '科技园南路 88 号',
      contactName: '李静',
      contactPhone: '13800138011',
      postalCode: '',
      isDefault: true,
      remark: '',
    }],
    banks: [{ id: 'cus-b1', accountName: '示例客户有限公司', accountNo: '6222000000000101', bankName: '工商银行', branchName: '深圳科技园支行', bankCode: '', currency: '人民币', isDefault: true, remark: '' }],
    businessInfo: { companyName: '示例客户有限公司', taxNo: '91440300MA5FYYYY01', registeredAddress: '深圳市南山区科技园南路 88 号', registeredPhone: '0755-8888 8801', bankName: '工商银行', bankAccount: '6222000000000101' },
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
    code: 'CUS000002',
    name: '华东连锁商贸',
    category: '代理商',
    level: 'S',
    remark: '',
    currency: '人民币',
    settlementMethod: '月结',
    collectionTerms: '月结45天',
    contacts: [{ id: 'cus-c2', name: '赵连锁', type: '业务', mobile: '13900139012', phone: '', email: '', isDefault: true, remark: '' }],
    addresses: [],
    banks: [],
    businessInfo: { companyName: '华东连锁商贸有限公司', taxNo: '91310000MA5FYYYY02', registeredAddress: '', registeredPhone: '', bankName: '', bankAccount: '' },
    useStatus: 'enabled',
    auditStatus: 'approved',
    auditor: '主数据管理员',
    auditedAt: '2026-08-15 14:20',
    creator: '阿盛',
    createdAt: '2026-08-12 11:30',
    updater: '阿盛',
    updatedAt: '2026-09-15 18:02',
    referenced: true,
  },
  {
    code: 'CUS000003',
    name: '深圳科技经销',
    category: '国内2B客户',
    level: 'B',
    remark: '',
    currency: '人民币',
    settlementMethod: '现结',
    collectionTerms: '货到付款',
    contacts: [],
    addresses: [],
    banks: [],
    businessInfo: createEmptyBusinessInfo(),
    useStatus: 'enabled',
    auditStatus: 'pending',
    creator: '周磊',
    createdAt: '2026-09-10 10:00',
    updater: '周磊',
    updatedAt: '2026-09-14 11:00',
    referenced: false,
  },
  {
    code: 'CUS000004',
    name: '海外经销客户A',
    category: '跨境2B客户',
    level: 'A',
    remark: '',
    currency: '美元',
    settlementMethod: '预付',
    collectionTerms: '预收30%',
    contacts: [{ id: 'cus-c4', name: 'John', type: '业务', mobile: '', phone: '+1-555-0100', email: 'john@oversea.com', isDefault: true, remark: '' }],
    addresses: [],
    banks: [],
    businessInfo: createEmptyBusinessInfo(),
    useStatus: 'enabled',
    auditStatus: 'approved',
    auditor: '主数据管理员',
    auditedAt: '2026-08-14 16:00',
    creator: '周磊',
    createdAt: '2026-08-12 09:00',
    updater: '周磊',
    updatedAt: '2026-09-13 08:40',
    referenced: true,
  },
  {
    code: 'CUS000005',
    name: '零售散客渠道',
    category: '国内电商2C客户',
    level: 'unrated',
    remark: '通用2C客户档案',
    currency: '人民币',
    settlementMethod: '现结',
    collectionTerms: '货到付款',
    contacts: [],
    addresses: [],
    banks: [],
    businessInfo: createEmptyBusinessInfo(),
    useStatus: 'enabled',
    auditStatus: 'approved',
    auditor: '主数据管理员',
    auditedAt: '2026-08-17 09:00',
    creator: '周磊',
    createdAt: '2026-08-16 17:00',
    updater: '周磊',
    updatedAt: '2026-09-12 16:40',
    referenced: false,
  },
  {
    code: 'CUS000006',
    name: '草稿客户示例',
    category: '国内2B客户',
    level: 'unrated',
    remark: '',
    currency: '',
    settlementMethod: '',
    collectionTerms: '',
    contacts: [{ id: 'cus-c6', name: '测试联系人', type: '业务', mobile: '', phone: '', email: '', isDefault: false, remark: '' }],
    addresses: [],
    banks: [],
    businessInfo: createEmptyBusinessInfo(),
    useStatus: 'enabled',
    auditStatus: 'draft',
    creator: '周磊',
    createdAt: '2026-09-12 14:22',
    updater: '周磊',
    updatedAt: '2026-09-12 14:22',
    referenced: false,
  },
];

export const customers = seedCustomers.map((row, index) => ({ id: `customer-${index + 1}`, ...row }));

function renderAudit(value) {
  return auditLabels[value] || EMPTY_PLACEHOLDER;
}

function renderUse(value) {
  return useStatusLabels[value] || EMPTY_PLACEHOLDER;
}

export const customerColumns = [
  { key: 'code', label: '客户编码', defaultWidth: 140, minWidth: 120, maxWidth: 180, ellipsis: true, link: true },
  { key: 'name', label: '客户名称', defaultWidth: 200, minWidth: 140, maxWidth: 280, ellipsis: true },
  { key: 'category', label: '客户分类', defaultWidth: 130, minWidth: 110, maxWidth: 180, ellipsis: true },
  { key: 'level', label: '客户等级', defaultWidth: 100, minWidth: 88, maxWidth: 140, ellipsis: true, render: renderLevel },
  { key: 'currency', label: '默认币别', defaultWidth: 110, minWidth: 96, maxWidth: 150, ellipsis: true, render: resolveCurrencyLabel },
  { key: 'settlementMethod', label: '结算方式', defaultWidth: 100, minWidth: 88, maxWidth: 140, ellipsis: true, render: resolveSettlementMethodLabel },
  { key: 'defaultContactName', label: '联系人姓名', defaultWidth: 110, minWidth: 96, maxWidth: 150, ellipsis: true, render: (_, row) => getDefaultContactName(row.contacts) || EMPTY_PLACEHOLDER },
  { key: 'auditStatus', label: '审核状态', defaultWidth: 100, minWidth: 88, maxWidth: 150, ellipsis: true, render: renderAudit, tone: (value) => auditTones[value] || '' },
  { key: 'useStatus', label: '使用状态', defaultWidth: 100, minWidth: 88, maxWidth: 150, ellipsis: true, render: renderUse, tone: (value) => (value === 'disabled' ? 'text-erp-text-muted' : 'text-erp-success') },
  { key: 'updatedAt', label: '最后更新时间', defaultWidth: 150, minWidth: 130, maxWidth: 200, ellipsis: true, sortable: true },
  { key: 'collectionTerms', label: '收款条件', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true, defaultVisible: false, render: resolveCollectionTermsLabel },
  { key: 'defaultContactMobile', label: '手机号码', defaultWidth: 130, minWidth: 110, maxWidth: 170, ellipsis: true, defaultVisible: false, render: (_, row) => getDefaultContactMobile(row.contacts) || EMPTY_PLACEHOLDER },
  { key: 'companyName', label: '企业名称', defaultWidth: 180, minWidth: 140, maxWidth: 240, ellipsis: true, defaultVisible: false, render: (_, row) => row.businessInfo?.companyName || EMPTY_PLACEHOLDER },
  { key: 'taxNo', label: '纳税人识别号', defaultWidth: 180, minWidth: 150, maxWidth: 240, ellipsis: true, defaultVisible: false, render: (_, row) => row.businessInfo?.taxNo || EMPTY_PLACEHOLDER },
  { key: 'auditor', label: '审核人', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true, defaultVisible: false },
  { key: 'updater', label: '最后更新人', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true, defaultVisible: false },
];

export function buildInitialVisibility(columns) {
  return Object.fromEntries(columns.map((column) => [column.key, column.defaultVisible !== false]));
}
