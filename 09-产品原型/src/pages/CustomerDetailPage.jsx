import { PartnerMasterDetail } from '../components/erp/PartnerMasterDetail.jsx';
import { customers, CUSTOMER_STORAGE_KEY } from '../data/customerData.js';
import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import { renderLevel } from '../lib/partnerMasterLogic.js';
import {
  resolveCollectionTermsLabel,
  resolveCurrencyLabel,
  resolveSettlementMethodLabel,
} from '../data/partnerMasterOptions.js';

const customerDetailConfig = {
  entityName: '客户',
  storageKey: CUSTOMER_STORAGE_KEY,
  seedRows: customers,
  listPageId: 'base-customer',
  editPageId: 'base-customer-edit',
  notFoundText: '未找到客户记录',
  settlementTitle: '结算与收款资料',
  renderBusinessInfo: true,
  bankDetailColumns: [
    { key: 'accountName', label: '账户名称', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true },
    { key: 'accountNo', label: '银行账号', defaultWidth: 150, minWidth: 120, maxWidth: 200, ellipsis: true },
    { key: 'bankName', label: '开户银行', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true },
    { key: 'branchName', label: '开户支行', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true },
    { key: 'currency', label: '账户币别', defaultWidth: 100, minWidth: 88, maxWidth: 140, ellipsis: true, render: resolveCurrencyLabel },
    { key: 'isDefault', label: '默认', defaultWidth: 70, minWidth: 60, maxWidth: 90, ellipsis: true },
  ],
  baseInfoFields: (row) => [
    { key: 'code', label: '客户编码', value: row.code },
    { key: 'name', label: '客户名称', value: row.name },
    { key: 'category', label: '客户分类', value: row.category || EMPTY_PLACEHOLDER },
    { key: 'level', label: '客户等级', value: renderLevel(row.level) },
    { key: 'remark', label: '备注', value: row.remark || EMPTY_PLACEHOLDER, className: 'col-span-3' },
  ],
  settlementFields: (row) => [
    { key: 'currency', label: '默认币别', value: row.currency ? resolveCurrencyLabel(row.currency) : EMPTY_PLACEHOLDER },
    { key: 'settlementMethod', label: '结算方式', value: row.settlementMethod ? resolveSettlementMethodLabel(row.settlementMethod) : EMPTY_PLACEHOLDER },
    { key: 'collectionTerms', label: '收款条件', value: row.collectionTerms ? resolveCollectionTermsLabel(row.collectionTerms) : EMPTY_PLACEHOLDER },
  ],
  businessInfoFields: (info) => [
    { key: 'companyName', label: '企业名称', value: info.companyName || EMPTY_PLACEHOLDER },
    { key: 'taxNo', label: '纳税人识别号', value: info.taxNo || EMPTY_PLACEHOLDER },
    { key: 'registeredAddress', label: '注册地址', value: info.registeredAddress || EMPTY_PLACEHOLDER },
    { key: 'registeredPhone', label: '注册电话', value: info.registeredPhone || EMPTY_PLACEHOLDER },
    { key: 'bankName', label: '工商开户银行', value: info.bankName || EMPTY_PLACEHOLDER },
    { key: 'bankAccount', label: '工商银行账号', value: info.bankAccount || EMPTY_PLACEHOLDER },
  ],
};

export function CustomerDetailPage(props) {
  return <PartnerMasterDetail {...props} config={customerDetailConfig} />;
}
