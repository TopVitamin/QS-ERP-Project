import { PartnerMasterDetail } from '../components/erp/PartnerMasterDetail.jsx';
import { suppliers, SUPPLIER_STORAGE_KEY } from '../data/supplierData.js';
import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import { renderLevel } from '../lib/partnerMasterLogic.js';
import {
  resolveCurrencyLabel,
  resolvePaymentTermsLabel,
  resolveSettlementMethodLabel,
} from '../data/partnerMasterOptions.js';

const supplierDetailConfig = {
  entityName: '供应商',
  storageKey: SUPPLIER_STORAGE_KEY,
  seedRows: suppliers,
  listPageId: 'base-supplier',
  editPageId: 'base-supplier-edit',
  notFoundText: '未找到供应商记录',
  settlementTitle: '结算与付款资料',
  renderBusinessInfo: false,
  baseInfoFields: (row) => [
    { key: 'code', label: '供应商编码', value: row.code },
    { key: 'name', label: '供应商名称', value: row.name },
    { key: 'category', label: '供应商分类', value: row.category || EMPTY_PLACEHOLDER },
    { key: 'level', label: '供应商等级', value: renderLevel(row.level) },
    { key: 'creditCode', label: '统一社会信用代码', value: row.creditCode || EMPTY_PLACEHOLDER },
    { key: 'remark', label: '备注', value: row.remark || EMPTY_PLACEHOLDER, className: 'col-span-3' },
  ],
  settlementFields: (row) => [
    { key: 'currency', label: '默认币别', value: row.currency ? resolveCurrencyLabel(row.currency) : EMPTY_PLACEHOLDER },
    { key: 'settlementMethod', label: '结算方式', value: row.settlementMethod ? resolveSettlementMethodLabel(row.settlementMethod) : EMPTY_PLACEHOLDER },
    { key: 'paymentTerms', label: '付款条件', value: row.paymentTerms ? resolvePaymentTermsLabel(row.paymentTerms) : EMPTY_PLACEHOLDER },
  ],
};

export function SupplierDetailPage(props) {
  return <PartnerMasterDetail {...props} config={supplierDetailConfig} />;
}
