import { PartnerMasterListPage } from '../components/erp/PartnerMasterListPage.jsx';
import { customerColumns, customers, CUSTOMER_STORAGE_KEY } from '../data/customerData.js';
import {
  customerCategoryOptions,
  partnerLevelOptions,
} from '../data/partnerMasterOptions.js';
import { matchesDateRange, matchesTextContains } from '../lib/listFilters.js';
import { toSelectOptions } from '../lib/options.js';
import { useStatusLabels } from '../lib/partnerMasterLogic.js';

const initialFilters = {
  code: '',
  name: '',
  companyName: '',
  taxNo: '',
  category: '',
  level: '',
  useStatus: '',
  auditStatus: '',
  updatedAt: { from: '', to: '' },
};

const filterFields = [
  { key: 'code', label: '客户编码', type: 'search', placeholder: '请输入客户编码' },
  { key: 'name', label: '客户名称', type: 'search', placeholder: '请输入客户名称' },
  { key: 'companyName', label: '企业名称', type: 'search', placeholder: '请输入工商企业名称' },
  { key: 'taxNo', label: '纳税人识别号', type: 'search', placeholder: '请输入纳税人识别号' },
  { key: 'category', label: '客户分类', type: 'select', options: [{ value: '', label: '全部分类' }, ...customerCategoryOptions] },
  { key: 'level', label: '客户等级', type: 'select', options: [{ value: '', label: '全部等级' }, ...partnerLevelOptions] },
  { key: 'useStatus', label: '使用状态', type: 'select', options: [{ value: '', label: '全部使用状态' }, ...toSelectOptions(useStatusLabels)] },
  { key: 'updatedAt', label: '最后更新时间', type: 'date-range' },
];

function filterRows(row, filters) {
  return matchesTextContains(row.code, filters.code)
    && matchesTextContains(row.name, filters.name)
    && matchesTextContains(row.businessInfo?.companyName, filters.companyName)
    && matchesTextContains(row.businessInfo?.taxNo, filters.taxNo)
    && (!filters.category || row.category === filters.category)
    && (!filters.level || row.level === filters.level)
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
