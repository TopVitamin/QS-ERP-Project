import { PartnerMasterListPage } from '../components/erp/PartnerMasterListPage.jsx';
import { supplierColumns, suppliers, SUPPLIER_STORAGE_KEY } from '../data/supplierData.js';
import {
  partnerLevelOptions,
  supplierCategoryOptions,
} from '../data/partnerMasterOptions.js';
import { matchesDateRange, matchesTextContains } from '../lib/listFilters.js';
import { toSelectOptions } from '../lib/options.js';
import { useStatusLabels } from '../lib/partnerMasterLogic.js';

const initialFilters = {
  code: '',
  name: '',
  creditCode: '',
  category: '',
  level: '',
  useStatus: '',
  auditStatus: '',
  updatedAt: { from: '', to: '' },
};

const filterFields = [
  { key: 'code', label: '供应商编码', type: 'search', placeholder: '请输入供应商编码' },
  { key: 'name', label: '供应商名称', type: 'search', placeholder: '请输入供应商名称' },
  { key: 'creditCode', label: '统一社会信用代码', type: 'search', placeholder: '请输入统一社会信用代码' },
  { key: 'category', label: '供应商分类', type: 'select', options: [{ value: '', label: '全部分类' }, ...supplierCategoryOptions] },
  { key: 'level', label: '供应商等级', type: 'select', options: [{ value: '', label: '全部等级' }, ...partnerLevelOptions] },
  { key: 'useStatus', label: '使用状态', type: 'select', options: [{ value: '', label: '全部使用状态' }, ...toSelectOptions(useStatusLabels)] },
  { key: 'updatedAt', label: '最后更新时间', type: 'date-range' },
];

function filterRows(row, filters) {
  return matchesTextContains(row.code, filters.code)
    && matchesTextContains(row.name, filters.name)
    && matchesTextContains(row.creditCode, filters.creditCode)
    && (!filters.category || row.category === filters.category)
    && (!filters.level || row.level === filters.level)
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
