import { PartnerMasterForm } from '../components/erp/PartnerMasterForm.jsx';
import { customers, CUSTOMER_STORAGE_KEY } from '../data/customerData.js';
import {
  currencySelectOptions,
  customerCategoryOptions,
  getCollectionTermsOptions,
  getSettlementMethodOptions,
  partnerLevelOptions,
} from '../data/partnerMasterOptions.js';
import { normalizePartnerAddress } from '../lib/internationalAddress.js';
import { readMockRows } from '../lib/mockStorage.js';
import {
  createEmptyAddress,
  createEmptyBank,
  createEmptyBusinessInfo,
  createEmptyContact,
  createEmptyCustomerForm,
  syncBusinessInfoFromDefaultBank,
  validateCustomerForSave,
} from '../lib/customerLogic.js';

function getInitialForm(mode, context) {
  if (mode === 'edit' && context?.row) {
    return {
      code: context.row.code,
      name: context.row.name,
      category: context.row.category || '',
      level: context.row.level || 'unrated',
      remark: context.row.remark || '',
      currency: context.row.currency || '',
      settlementMethod: context.row.settlementMethod || '',
      collectionTerms: context.row.collectionTerms || '',
      contacts: (context.row.contacts || []).map((item) => ({ ...item })),
      addresses: (context.row.addresses || []).map((item) => normalizePartnerAddress({ ...item })),
      banks: (context.row.banks || []).map((item) => ({ ...item })),
      businessInfo: { ...createEmptyBusinessInfo(), ...(context.row.businessInfo || {}) },
    };
  }
  return createEmptyCustomerForm();
}

const customerBankColumns = [
  { key: 'accountName', label: '账户名称 *', type: 'text', placeholder: '请输入开户名称', width: 120 },
  { key: 'accountNo', label: '银行账号 *', type: 'text', placeholder: '请输入银行账号', width: 140 },
  { key: 'bankName', label: '开户银行 *', type: 'text', placeholder: '请输入开户银行', width: 120 },
  { key: 'branchName', label: '开户支行', type: 'text', placeholder: '开户支行', width: 120 },
  { key: 'bankCode', label: '银行联行号', type: 'text', placeholder: '银行联行号', width: 110 },
  { key: 'currency', label: '账户币别', type: 'select', options: currencySelectOptions, width: 120 },
  { key: 'isDefault', label: '默认账户', type: 'switch', width: 90 },
  { key: 'remark', label: '备注', type: 'text', placeholder: '备注', width: 100 },
];

function buildCustomerFormConfig() {
  return {
  entityName: '客户',
  idPrefix: 'customer',
  storageKey: CUSTOMER_STORAGE_KEY,
  listPageId: 'base-customer',
  createTitle: '新增客户',
  editTitle: '编辑客户',
  saveSuccessMessage: '客户已保存',
  getInitialForm,
  createContact: createEmptyContact,
  createAddress: createEmptyAddress,
  createBank: createEmptyBank,
  bankColumns: customerBankColumns,
  // 工商开户银行/账号只在默认银行账户变更时带出；保存不回填，保证「仍可修改或清空」。
  onFieldChange: (key, value, form) => {
    if (key !== 'banks') return form;
    const prevDefault = (form.banks || []).find((item) => item.isDefault)?.id;
    const nextDefault = (value || []).find((item) => item.isDefault)?.id;
    if (!nextDefault || nextDefault === prevDefault) return form;
    return { ...form, businessInfo: syncBusinessInfoFromDefaultBank({ ...form, banks: value }) };
  },
  validate: (form, currentId) => validateCustomerForSave(form, readMockRows(CUSTOMER_STORAGE_KEY, customers), currentId),
  sections: [
    {
      type: 'fields',
      title: '基础信息',
      fields: [
        { key: 'code', label: '客户编码', type: 'text', placeholder: '请输入客户编码', readOnlyOnEdit: true },
        { key: 'name', label: '客户名称 *', type: 'text', placeholder: '请输入客户正式名称' },
        { key: 'category', label: '客户分类 *', type: 'select', options: customerCategoryOptions, placeholder: '请选择客户分类' },
        { key: 'level', label: '客户等级', type: 'select', options: partnerLevelOptions },
        { key: 'remark', label: '备注', type: 'textarea', placeholder: '请输入客户说明', className: 'col-span-3' },
      ],
    },
    {
      type: 'fields',
      title: '结算与收款资料',
      fields: [
        { key: 'currency', label: '默认币别', type: 'select', options: currencySelectOptions, placeholder: '请选择币别' },
        { key: 'settlementMethod', label: '结算方式', type: 'select', options: getSettlementMethodOptions(), placeholder: '请选择结算方式' },
        { key: 'collectionTerms', label: '收款条件', type: 'select', options: getCollectionTermsOptions(), placeholder: '请选择收款条件' },
      ],
    },
    { type: 'contacts', title: '联系人' },
    { type: 'addresses', title: '地址' },
    { type: 'banks', title: '银行信息' },
    {
      type: 'businessInfo',
      title: '工商信息',
      fields: [
        { key: 'companyName', label: '企业名称', type: 'text', placeholder: '请输入企业名称' },
        { key: 'taxNo', label: '纳税人识别号', type: 'text', placeholder: '请输入纳税人识别号' },
        { key: 'registeredAddress', label: '注册地址', type: 'text', placeholder: '请输入注册地址' },
        { key: 'registeredPhone', label: '注册电话', type: 'text', placeholder: '请输入注册电话' },
        { key: 'bankName', label: '工商开户银行', type: 'text', placeholder: '请输入工商开户银行' },
        { key: 'bankAccount', label: '工商银行账号', type: 'text', placeholder: '请输入工商银行账号' },
      ],
    },
  ],
  };
}

function CustomerForm({ mode, ...props }) {
  return <PartnerMasterForm mode={mode} config={buildCustomerFormConfig()} {...props} />;
}

export function CustomerCreatePage(props) {
  return <CustomerForm mode="create" {...props} />;
}

export function CustomerEditPage(props) {
  return <CustomerForm mode="edit" {...props} />;
}
