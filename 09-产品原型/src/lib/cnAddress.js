import cnAddressRegions from '../data/cnAddressRegions.js';
import { customerAddressOptions } from '../data/masterData.js';

export function createEmptyCnAddress() {
  return {
    provinceCode: '',
    cityCode: '',
    districtCode: '',
    detailAddress: '',
    savedAddressId: '',
  };
}

export function getProvinces() {
  return cnAddressRegions.map(({ code, name }) => ({ value: code, label: name }));
}

export function getCities(provinceCode) {
  if (!provinceCode) return [];
  const province = cnAddressRegions.find((item) => item.code === provinceCode);
  return (province?.children || []).map(({ code, name }) => ({ value: code, label: name }));
}

export function getDistricts(provinceCode, cityCode) {
  if (!provinceCode || !cityCode) return [];
  const province = cnAddressRegions.find((item) => item.code === provinceCode);
  const city = province?.children?.find((item) => item.code === cityCode);
  return (city?.children || []).map(({ code, name }) => ({ value: code, label: name }));
}

let regionSearchIndex = null;

function buildRegionSearchIndex() {
  if (regionSearchIndex) return regionSearchIndex;

  regionSearchIndex = cnAddressRegions.flatMap((province) => (
    (province.children || []).flatMap((city) => (
      (city.children || []).map((district) => ({
        provinceCode: province.code,
        cityCode: city.code,
        districtCode: district.code,
        label: `${province.name}/${city.name}/${district.name}`,
        keywords: `${province.name}${city.name}${district.name}`,
      }))
    ))
  ));

  return regionSearchIndex;
}

/** 按关键字搜索完整省市区路径，默认最多返回50条。 */
export function searchCnRegions(keyword, limit = 50) {
  const normalized = String(keyword || '').trim().toLowerCase();
  if (!normalized) return [];

  return buildRegionSearchIndex()
    .filter((item) => item.label.toLowerCase().includes(normalized)
      || item.keywords.toLowerCase().includes(normalized))
    .slice(0, limit);
}

function findRegionName(code, list = []) {
  return list.find((item) => item.code === code)?.name || '';
}

function getRegionNames(normalized) {
  const province = findRegionName(normalized.provinceCode, cnAddressRegions);
  const city = findRegionName(
    normalized.cityCode,
    cnAddressRegions.find((item) => item.code === normalized.provinceCode)?.children || [],
  );
  const district = findRegionName(
    normalized.districtCode,
    cnAddressRegions
      .find((item) => item.code === normalized.provinceCode)
      ?.children?.find((item) => item.code === normalized.cityCode)
      ?.children || [],
  );
  return { province, city, district };
}

/** 返回省、市、区中文名称。 */
export function getCnRegionLabels(address) {
  const normalized = normalizeAddressValue(address);
  return getRegionNames(normalized);
}

/** 省市区展示，如：广西壮族自治区/南宁市/隆安县 */
export function formatCnRegion(address) {
  const normalized = normalizeAddressValue(address);
  const { province, city, district } = getRegionNames(normalized);
  return [province, city, district].filter(Boolean).join('/');
}

export function formatCnAddress(address) {
  const normalized = normalizeAddressValue(address);
  if (!normalized.provinceCode && !normalized.detailAddress) return '';

  const { province, city, district } = getRegionNames(normalized);

  return [province, city, district, normalized.detailAddress].filter(Boolean).join('');
}

export function findCustomerAddressById(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  return customerAddressOptions.find((item) => item.value === value) || null;
}

export function addressRecordToCnAddress(record) {
  if (!record) return createEmptyCnAddress();
  return {
    provinceCode: record.provinceCode || '',
    cityCode: record.cityCode || '',
    districtCode: record.districtCode || '',
    detailAddress: record.detailAddress || '',
    savedAddressId: record.value || record.savedAddressId || '',
  };
}

export function normalizeAddressValue(value) {
  if (!value) return createEmptyCnAddress();
  if (typeof value === 'string') {
    return addressRecordToCnAddress(findCustomerAddressById(value));
  }
  return {
    ...createEmptyCnAddress(),
    ...value,
  };
}

export function getCustomerAddressOptions(customer) {
  return customerAddressOptions
    .filter((item) => item.customer === customer)
    .map((item) => ({
      value: item.value,
      label: formatCnAddress(item),
    }));
}

/** 将结构化地址匹配回客户地址明细 id，供下拉回显。 */
export function matchCustomerAddressId(address, customer) {
  const normalized = normalizeAddressValue(address);
  if (normalized.savedAddressId) return normalized.savedAddressId;

  const candidate = customerAddressOptions.find((item) => item.customer === customer
    && item.provinceCode === normalized.provinceCode
    && item.cityCode === normalized.cityCode
    && item.districtCode === normalized.districtCode
    && String(item.detailAddress || '').trim() === String(normalized.detailAddress || '').trim());

  return candidate?.value || '';
}

export function getDefaultCustomerAddress(customer) {
  const addresses = customerAddressOptions.filter((item) => item.customer === customer);
  return addresses.find((item) => item.isDefault) || addresses[0] || null;
}

export function resolveAddressLabel(value) {
  const normalized = normalizeAddressValue(value);
  const formatted = formatCnAddress(normalized);
  return formatted || (typeof value === 'string' ? value : '');
}

export function isCnAddressComplete(address, { requireDetail = true } = {}) {
  const normalized = normalizeAddressValue(address);
  if (!normalized.provinceCode || !normalized.cityCode || !normalized.districtCode) {
    return false;
  }
  if (requireDetail && !String(normalized.detailAddress || '').trim()) {
    return false;
  }
  return true;
}

export function addressesEqual(left, right) {
  const a = normalizeAddressValue(left);
  const b = normalizeAddressValue(right);
  return a.provinceCode === b.provinceCode
    && a.cityCode === b.cityCode
    && a.districtCode === b.districtCode
    && String(a.detailAddress || '').trim() === String(b.detailAddress || '').trim();
}
