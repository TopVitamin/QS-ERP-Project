import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import { useStatusLabels } from '../lib/partnerMasterLogic.js';
import {
  buildLogisticsProductOptions,
  renderReceiverRoute,
  renderSenderRoute,
  resolveLogisticsProductLabel,
} from '../lib/logisticsDeliveryRuleLogic.js';
import { buildInitialVisibility } from './logisticsData.js';

export const deliveryRules = [
  {
    id: 'delivery-rule-001',
    name: '深圳仓发北京-顺丰标快',
    senderProvinceCode: '44',
    senderCityCode: '4403',
    receiverProvinceCode: '11',
    receiverCityCode: '',
    senderProvinceName: '广东省',
    senderCityName: '深圳市',
    receiverProvinceName: '北京市',
    receiverCityName: '',
    logisticsProductId: 'lsp-000001',
    remark: '演示：收件市留空表示北京市全省',
    useStatus: 'enabled',
    creator: '阿盛',
    createdAt: '2026-10-18 09:00',
    updater: '阿盛',
    updatedAt: '2026-10-20 10:00',
  },
  {
    id: 'delivery-rule-002',
    name: '广东发上海-德邦精准卡航',
    senderProvinceCode: '44',
    senderCityCode: '',
    receiverProvinceCode: '31',
    receiverCityCode: '3101',
    senderProvinceName: '广东省',
    senderCityName: '',
    receiverProvinceName: '上海市',
    receiverCityName: '上海市',
    logisticsProductId: 'lsp-000002',
    remark: '演示：发件市留空表示广东省全省',
    useStatus: 'enabled',
    creator: '阿盛',
    createdAt: '2026-10-18 09:30',
    updater: '周磊',
    updatedAt: '2026-10-19 15:20',
  },
  {
    id: 'delivery-rule-003',
    name: '深圳仓发上海-中通经济（停用）',
    senderProvinceCode: '44',
    senderCityCode: '4403',
    receiverProvinceCode: '31',
    receiverCityCode: '3101',
    senderProvinceName: '广东省',
    senderCityName: '深圳市',
    receiverProvinceName: '上海市',
    receiverCityName: '上海市',
    logisticsProductId: 'lsp-000003',
    remark: '演示禁用规则不参与匹配',
    useStatus: 'disabled',
    creator: '周磊',
    createdAt: '2026-10-10 11:00',
    updater: '周磊',
    updatedAt: '2026-10-12 16:00',
  },
];

function renderUse(value) {
  return useStatusLabels[value] || EMPTY_PLACEHOLDER;
}

export function createDeliveryRuleColumns(products) {
  return [
    { key: 'name', label: '规则名称', defaultWidth: 200, minWidth: 160, maxWidth: 280, ellipsis: true, link: true },
    {
      key: 'senderRoute',
      label: '发件省/市',
      defaultWidth: 160,
      minWidth: 130,
      maxWidth: 220,
      ellipsis: true,
      render: (_, row) => renderSenderRoute(row),
    },
    {
      key: 'receiverRoute',
      label: '收件省/市',
      defaultWidth: 160,
      minWidth: 130,
      maxWidth: 220,
      ellipsis: true,
      render: (_, row) => renderReceiverRoute(row),
    },
    {
      key: 'logisticsProductId',
      label: '物流服务产品',
      defaultWidth: 200,
      minWidth: 160,
      maxWidth: 260,
      ellipsis: true,
      render: (value) => resolveLogisticsProductLabel(value, products),
    },
    {
      key: 'useStatus',
      label: '使用状态',
      defaultWidth: 100,
      minWidth: 88,
      maxWidth: 140,
      ellipsis: true,
      render: renderUse,
      tone: (value) => (value === 'disabled' ? 'text-erp-text-muted' : 'text-erp-success'),
    },
    { key: 'updatedAt', label: '最后更新时间', defaultWidth: 150, minWidth: 130, maxWidth: 200, ellipsis: true, sortable: true },
    { key: 'remark', label: '备注', defaultWidth: 180, minWidth: 120, maxWidth: 260, ellipsis: true, defaultVisible: false },
  ];
}

export function buildDeliveryRuleFilterFields(products, provinceOptions) {
  return [
    { key: 'name', label: '规则名称', type: 'search', placeholder: '请输入规则名称' },
    { key: 'senderProvinceCode', label: '发件省份', type: 'select', options: [{ value: '', label: '全部省份' }, ...provinceOptions] },
    { key: 'receiverProvinceCode', label: '收件省份', type: 'select', options: [{ value: '', label: '全部省份' }, ...provinceOptions] },
    {
      key: 'logisticsProductId',
      label: '物流服务产品',
      type: 'select',
      options: [{ value: '', label: '全部产品' }, ...buildLogisticsProductOptions(products)],
    },
    {
      key: 'useStatus',
      label: '使用状态',
      type: 'select',
      options: [{ value: '', label: '全部状态' }, { value: 'enabled', label: '启用' }, { value: 'disabled', label: '禁用' }],
    },
  ];
}

export const deliveryRuleInitialFilters = {
  name: '',
  senderProvinceCode: '',
  receiverProvinceCode: '',
  logisticsProductId: '',
  useStatus: '',
};

export function filterDeliveryRuleRows(row, filters) {
  const name = String(filters.name || '').trim().toLowerCase();
  if (name && !String(row.name || '').toLowerCase().includes(name)) return false;
  if (filters.senderProvinceCode && row.senderProvinceCode !== filters.senderProvinceCode) return false;
  if (filters.receiverProvinceCode && row.receiverProvinceCode !== filters.receiverProvinceCode) return false;
  if (filters.logisticsProductId && row.logisticsProductId !== filters.logisticsProductId) return false;
  if (filters.useStatus && row.useStatus !== filters.useStatus) return false;
  return true;
}

export { buildInitialVisibility };
