import { PartnerMasterListPage } from '../components/erp/PartnerMasterListPage.jsx';
import { supplierColumns, suppliers, SUPPLIER_STORAGE_KEY } from '../data/supplierData.js';
import {
  currencySelectOptions,
  getPaymentTermsOptions,
  getSettlementMethodOptions,
  partnerLevelOptions,
  supplierCategoryOptions,
} from '../data/partnerMasterOptions.js';
import { matchesDateRange } from '../lib/listFilters.js';
import { toSelectOptions } from '../lib/options.js';
import { useStatusLabels } from '../lib/partnerMasterLogic.js';

const initialFilters = {
  keyword: '',
  category: '',
  level: '',
  currency: '',
  settlementMethod: '',
  paymentTerms: '',
  useStatus: '',
  auditStatus: '',
  updatedAt: { from: '', to: '' },
};

const filterFields = [
  { key: 'keyword', label: '关键词', type: 'search', placeholder: '请输入编码、名称或统一社会信用代码' },
  { key: 'category', label: '供应商分类', type: 'select', options: [{ value: '', label: '全部分类' }, ...supplierCategoryOptions] },
  { key: 'level', label: '供应商等级', type: 'select', options: [{ value: '', label: '全部等级' }, ...partnerLevelOptions] },
  { key: 'currency', label: '默认币别', type: 'select', options: [{ value: '', label: '全部币别' }, ...currencySelectOptions] },
  { key: 'settlementMethod', label: '结算方式', type: 'select', options: [{ value: '', label: '全部结算方式' }, ...getSettlementMethodOptions()] },
  { key: 'paymentTerms', label: '付款条件', type: 'select', options: [{ value: '', label: '全部付款条件' }, ...getPaymentTermsOptions()] },
  { key: 'useStatus', label: '使用状态', type: 'select', options: [{ value: '', label: '全部使用状态' }, ...toSelectOptions(useStatusLabels)] },
  { key: 'updatedAt', label: '最后更新时间', type: 'date-range' },
];

function filterRows(row, filters) {
  const keyword = filters.keyword.trim().toLowerCase();
  const matchesKeyword = !keyword || [row.code, row.name, row.creditCode].some((value) => String(value || '').toLowerCase().includes(keyword));
  return matchesKeyword
    && (!filters.category || row.category === filters.category)
    && (!filters.level || row.level === filters.level)
    && (!filters.currency || row.currency === filters.currency)
    && (!filters.settlementMethod || row.settlementMethod === filters.settlementMethod)
    && (!filters.paymentTerms || row.paymentTerms === filters.paymentTerms)
    && (!filters.useStatus || row.useStatus === filters.useStatus)
    && (!filters.auditStatus || row.auditStatus === filters.auditStatus)
    && matchesDateRange(row.updatedAt, filters.updatedAt);
}

export function SupplierListPage(props) {
  return (
    <PartnerMasterListPage
      {...props}
      title="供应商资料"
      entityName="供应商"
      storageKey={SUPPLIER_STORAGE_KEY}
      seedRows={suppliers}
      columns={supplierColumns}
      initialFilters={initialFilters}
      filterFields={filterFields}
      filterRows={filterRows}
      transferTargetId="supplier"
      createPageId="base-supplier-create"
      editPageId="base-supplier-edit"
      detailPageId="base-supplier-detail"
    />
  );
}
