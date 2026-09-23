import { PartnerMasterListPage } from '../components/erp/PartnerMasterListPage.jsx';
import { customerColumns, customers, CUSTOMER_STORAGE_KEY } from '../data/customerData.js';
import {
  currencySelectOptions,
  customerCategoryOptions,
  getCollectionTermsOptions,
  getSettlementMethodOptions,
  partnerLevelOptions,
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
  collectionTerms: '',
  useStatus: '',
  auditStatus: '',
  updatedAt: { from: '', to: '' },
};

const filterFields = [
  { key: 'keyword', label: '关键词', type: 'search', placeholder: '请输入编码、名称、企业名称或纳税人识别号' },
  { key: 'category', label: '客户分类', type: 'select', options: [{ value: '', label: '全部分类' }, ...customerCategoryOptions] },
  { key: 'level', label: '客户等级', type: 'select', options: [{ value: '', label: '全部等级' }, ...partnerLevelOptions] },
  { key: 'currency', label: '默认币别', type: 'select', options: [{ value: '', label: '全部币别' }, ...currencySelectOptions] },
  { key: 'settlementMethod', label: '结算方式', type: 'select', options: [{ value: '', label: '全部结算方式' }, ...getSettlementMethodOptions()] },
  { key: 'collectionTerms', label: '收款条件', type: 'select', options: [{ value: '', label: '全部收款条件' }, ...getCollectionTermsOptions()] },
  { key: 'useStatus', label: '使用状态', type: 'select', options: [{ value: '', label: '全部使用状态' }, ...toSelectOptions(useStatusLabels)] },
  { key: 'updatedAt', label: '最后更新时间', type: 'date-range' },
];

function filterRows(row, filters) {
  const keyword = filters.keyword.trim().toLowerCase();
  const matchesKeyword = !keyword || [
    row.code,
    row.name,
    row.businessInfo?.companyName,
    row.businessInfo?.taxNo,
  ].some((value) => String(value || '').toLowerCase().includes(keyword));
  return matchesKeyword
    && (!filters.category || row.category === filters.category)
    && (!filters.level || row.level === filters.level)
    && (!filters.currency || row.currency === filters.currency)
    && (!filters.settlementMethod || row.settlementMethod === filters.settlementMethod)
    && (!filters.collectionTerms || row.collectionTerms === filters.collectionTerms)
    && (!filters.useStatus || row.useStatus === filters.useStatus)
    && (!filters.auditStatus || row.auditStatus === filters.auditStatus)
    && matchesDateRange(row.updatedAt, filters.updatedAt);
}

export function CustomerListPage(props) {
  return (
    <PartnerMasterListPage
      {...props}
      title="客户资料"
      entityName="客户"
      storageKey={CUSTOMER_STORAGE_KEY}
      seedRows={customers}
      columns={customerColumns}
      initialFilters={initialFilters}
      filterFields={filterFields}
      filterRows={filterRows}
      transferTargetId="customer"
      createPageId="base-customer-create"
      editPageId="base-customer-edit"
      detailPageId="base-customer-detail"
    />
  );
}
