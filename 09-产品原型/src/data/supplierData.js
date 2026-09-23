import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import { buildMasterOption } from '../lib/codeName.js';
import { readMockRows } from '../lib/mockStorage.js';
import {
  resolveCurrencyLabel,
  resolvePaymentTermsLabel,
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

export const SUPPLIER_STORAGE_KEY = 'qs-erp:suppliers:v1';

// 单据可选项：仅审核通过且启用，展示 Code-Name（供应商主PRD F03/F04、AC04/AC05）。
export function getSelectableSupplierOptions() {
  return readMockRows(SUPPLIER_STORAGE_KEY, suppliers)
    .filter((row) => row.auditStatus === 'approved' && row.useStatus === 'enabled')
    .map((row) => buildMasterOption({ code: row.code, name: row.name, defaultCurrency: row.currency }));
}

const seedSuppliers = [
  {
    code: 'SUP000001',
    name: '测试',
    category: '综合类',
    level: 'unrated',
    creditCode: '91440300MA5FXXXX01',
    remark: '',
    currency: '人民币',
    settlementMethod: '月结',
    paymentTerms: '月结30天',
    contacts: [{ id: 'sup-c1', name: '陈明', type: '业务', mobile: '13800138001', phone: '', email: '', isDefault: true, remark: '' }],
    addresses: [{ id: 'sup-a1', addressType: '办公', country: '中国', province: '广东省', city: '深圳市', district: '南山区', detailAddress: '科技园南路 18 号', contactName: '陈明', contactPhone: '13800138001', postalCode: '', isDefault: true, remark: '' }],
    banks: [{ id: 'sup-b1', accountName: '测试', accountNo: '6222000000000001', bankName: '中国银行', branchName: '深圳科技园支行', bankCode: '', currency: '人民币', isDefault: true, remark: '' }],
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
    code: 'SUP000002',
    name: '土豆供应商',
    category: '充电器类',
    level: 'A',
    creditCode: '91440300MA5FXXXX02',
    remark: '主供充电器',
    currency: '人民币',
    settlementMethod: '月结',
    paymentTerms: '月结30天',
    contacts: [{ id: 'sup-c2', name: '王土豆', type: '业务', mobile: '13900139002', phone: '0755-8888 1001', email: 'wang@potato.com', isDefault: true, remark: '' }],
    addresses: [],
    banks: [{ id: 'sup-b2', accountName: '土豆供应商', accountNo: '6228480000000002', bankName: '招商银行', branchName: '', bankCode: '', currency: '人民币', isDefault: true, remark: '' }],
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
    code: 'SUP000003',
    name: '中南批发商行',
    category: '数据线类',
    level: 'B',
    creditCode: '',
    remark: '',
    currency: '美元',
    settlementMethod: '预付',
    paymentTerms: '预付30%',
    contacts: [{ id: 'sup-c3', name: '李批发', type: '财务', mobile: '', phone: '020-6666 2000', email: '', isDefault: true, remark: '' }],
    addresses: [],
    banks: [],
    useStatus: 'enabled',
    auditStatus: 'pending',
    creator: '周磊',
    createdAt: '2026-09-10 10:00',
    updater: '周磊',
    updatedAt: '2026-09-14 11:00',
    referenced: false,
  },
  {
    code: 'SUP000004',
    name: '供应商10086',
    category: '移动电源类',
    level: 'C',
    creditCode: '91440100MA5FXXXX04',
    remark: '',
    currency: '人民币',
    settlementMethod: '现结',
    paymentTerms: '货到付款',
    contacts: [],
    addresses: [],
    banks: [],
    useStatus: 'disabled',
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
    code: 'SUP000005',
    name: '订货散客',
    category: '其他',
    level: 'unrated',
    creditCode: '',
    remark: '草稿示例',
    currency: '人民币',
    settlementMethod: '',
    paymentTerms: '',
    contacts: [{ id: 'sup-c5', name: '张散客', type: '业务', mobile: '13700137005', phone: '', email: '', isDefault: false, remark: '' }],
    addresses: [],
    banks: [],
    useStatus: 'enabled',
    auditStatus: 'draft',
    creator: '周磊',
    createdAt: '2026-09-12 14:22',
    updater: '周磊',
    updatedAt: '2026-09-12 14:22',
    referenced: false,
  },
  {
    code: 'SUP000006',
    name: '我是赠品2',
    category: '综合类',
    level: 'unrated',
    creditCode: '',
    remark: '',
    currency: '人民币',
    settlementMethod: '月结',
    paymentTerms: '月结60天',
    contacts: [],
    addresses: [],
    banks: [],
    useStatus: 'disabled',
    auditStatus: 'rejected',
    creator: '周磊',
    createdAt: '2026-09-10 10:44',
    updater: '周磊',
    updatedAt: '2026-09-10 10:44',
    referenced: false,
  },
];

export const suppliers = seedSuppliers.map((row, index) => ({ id: `supplier-${index + 1}`, ...row }));

function renderAudit(value) {
  return auditLabels[value] || EMPTY_PLACEHOLDER;
}

function renderUse(value) {
  return useStatusLabels[value] || EMPTY_PLACEHOLDER;
}

export const supplierColumns = [
  { key: 'code', label: '供应商编码', defaultWidth: 140, minWidth: 120, maxWidth: 180, ellipsis: true, link: true },
  { key: 'name', label: '供应商名称', defaultWidth: 200, minWidth: 140, maxWidth: 280, ellipsis: true },
  { key: 'category', label: '供应商分类', defaultWidth: 110, minWidth: 96, maxWidth: 160, ellipsis: true },
  { key: 'level', label: '供应商等级', defaultWidth: 100, minWidth: 88, maxWidth: 140, ellipsis: true, render: renderLevel },
  { key: 'currency', label: '默认币别', defaultWidth: 110, minWidth: 96, maxWidth: 150, ellipsis: true, render: resolveCurrencyLabel },
  { key: 'settlementMethod', label: '结算方式', defaultWidth: 100, minWidth: 88, maxWidth: 140, ellipsis: true, render: resolveSettlementMethodLabel },
  { key: 'defaultContactName', label: '联系人姓名', defaultWidth: 110, minWidth: 96, maxWidth: 150, ellipsis: true, render: (_, row) => getDefaultContactName(row.contacts) || EMPTY_PLACEHOLDER },
  { key: 'auditStatus', label: '审核状态', defaultWidth: 100, minWidth: 88, maxWidth: 150, ellipsis: true, render: renderAudit, tone: (value) => auditTones[value] || '' },
  { key: 'useStatus', label: '使用状态', defaultWidth: 100, minWidth: 88, maxWidth: 150, ellipsis: true, render: renderUse, tone: (value) => (value === 'disabled' ? 'text-erp-text-muted' : 'text-erp-success') },
  { key: 'updatedAt', label: '最后更新时间', defaultWidth: 150, minWidth: 130, maxWidth: 200, ellipsis: true, sortable: true },
  { key: 'creditCode', label: '统一社会信用代码', defaultWidth: 180, minWidth: 150, maxWidth: 240, ellipsis: true, defaultVisible: false },
  { key: 'paymentTerms', label: '付款条件', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true, defaultVisible: false, render: resolvePaymentTermsLabel },
  { key: 'defaultContactMobile', label: '手机号码', defaultWidth: 130, minWidth: 110, maxWidth: 170, ellipsis: true, defaultVisible: false, render: (_, row) => getDefaultContactMobile(row.contacts) || EMPTY_PLACEHOLDER },
  { key: 'auditor', label: '审核人', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true, defaultVisible: false },
  { key: 'updater', label: '最后更新人', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true, defaultVisible: false },
];

export function buildInitialVisibility(columns) {
  return Object.fromEntries(columns.map((column) => [column.key, column.defaultVisible !== false]));
}
