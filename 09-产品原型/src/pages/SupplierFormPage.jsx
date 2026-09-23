import { PartnerMasterForm } from '../components/erp/PartnerMasterForm.jsx';
import { suppliers, SUPPLIER_STORAGE_KEY } from '../data/supplierData.js';
import {
  currencySelectOptions,
  getPaymentTermsOptions,
  getSettlementMethodOptions,
  partnerLevelOptions,
  supplierCategoryOptions,
} from '../data/partnerMasterOptions.js';
import { normalizePartnerAddress } from '../lib/internationalAddress.js';
import { readMockRows } from '../lib/mockStorage.js';
import {
  createEmptyAddress,
  createEmptyBank,
  createEmptyContact,
  createEmptySupplierForm,
  validateSupplierForSave,
} from '../lib/supplierLogic.js';

function getInitialForm(mode, context) {
  if (mode === 'edit' && context?.row) {
    return {
      code: context.row.code,
      name: context.row.name,
      category: context.row.category || '',
      level: context.row.level || 'unrated',
      creditCode: context.row.creditCode || '',
      remark: context.row.remark || '',
      currency: context.row.currency || '',
      settlementMethod: context.row.settlementMethod || '',
      paymentTerms: context.row.paymentTerms || '',
      contacts: (context.row.contacts || []).map((item) => ({ ...item })),
      addresses: (context.row.addresses || []).map((item) => normalizePartnerAddress({ ...item })),
      banks: (context.row.banks || []).map((item) => ({ ...item })),
    };
  }
  return createEmptySupplierForm();
}

function buildSupplierFormConfig() {
  return {
  entityName: '供应商',
  idPrefix: 'supplier',
  storageKey: SUPPLIER_STORAGE_KEY,
  listPageId: 'base-supplier',
  createTitle: '新增供应商',
  editTitle: '编辑供应商',
  saveSuccessMessage: '供应商已保存',
  getInitialForm,
  createContact: createEmptyContact,
  createAddress: createEmptyAddress,
  createBank: createEmptyBank,
  validate: (form, currentId) => validateSupplierForSave(form, readMockRows(SUPPLIER_STORAGE_KEY, suppliers), currentId),
  sections: [
    {
      type: 'fields',
      title: '基础信息',
      fields: [
        { key: 'code', label: '供应商编码', type: 'text', placeholder: '请输入供应商编码', readOnlyOnEdit: true },
        { key: 'name', label: '供应商名称 *', type: 'text', placeholder: '请输入供应商正式名称' },
        { key: 'category', label: '供应商分类 *', type: 'select', options: supplierCategoryOptions, placeholder: '请选择供应商分类' },
        { key: 'level', label: '供应商等级', type: 'select', options: partnerLevelOptions },
        { key: 'creditCode', label: '统一社会信用代码', type: 'text', placeholder: '请输入统一社会信用代码' },
        { key: 'remark', label: '备注', type: 'textarea', placeholder: '请输入供应商说明', className: 'col-span-3' },
      ],
    },
    {
      type: 'fields',
      title: '结算与付款资料',
      fields: [
        { key: 'currency', label: '默认币别', type: 'select', options: currencySelectOptions, placeholder: '请选择币别' },
        { key: 'settlementMethod', label: '结算方式', type: 'select', options: getSettlementMethodOptions(), placeholder: '请选择结算方式' },
        { key: 'paymentTerms', label: '付款条件', type: 'select', options: getPaymentTermsOptions(), placeholder: '请选择付款条件' },
      ],
    },
    { type: 'contacts', title: '联系人' },
    { type: 'addresses', title: '地址' },
    { type: 'banks', title: '银行信息' },
  ],
  };
}

function SupplierForm({ mode, ...props }) {
  return <PartnerMasterForm mode={mode} config={buildSupplierFormConfig()} {...props} />;
}

export function SupplierCreatePage(props) {
  return <SupplierForm mode="create" {...props} />;
}

export function SupplierEditPage(props) {
  return <SupplierForm mode="edit" {...props} />;
}
