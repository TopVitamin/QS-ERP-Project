import { formatCnAddress, getCnRegionLabels, normalizeAddressValue } from './cnAddress.js';
import { formatCodeName } from './codeName.js';

export const CHINA_COUNTRY_CODE = 'CN';

export const INTERNATIONAL_ADDRESS_KEYS = [
  'countryRegion',
  'provinceCode',
  'cityCode',
  'districtCode',
  'stateOrProvince',
  'city',
  'detailAddress',
];

const countryRegions = [
  { code: CHINA_COUNTRY_CODE, name: '中国' },
  { code: 'US', name: '美国' },
  { code: 'DE', name: '德国' },
  { code: 'JP', name: '日本' },
  { code: 'HK', name: '中国香港' },
];

export const countryRegionOptions = countryRegions.map(({ code, name }) => ({
  value: code,
  code,
  name,
  label: formatCodeName(code, name),
}));

export function createEmptyInternationalAddress() {
  return {
    countryRegion: '',
    provinceCode: '',
    cityCode: '',
    districtCode: '',
    stateOrProvince: '',
    city: '',
    detailAddress: '',
  };
}

export function isChinaCountryRegion(countryRegion) {
  return countryRegion === CHINA_COUNTRY_CODE;
}

export function normalizeInternationalAddress(value, legacyText = '') {
  if (value && typeof value === 'object') {
    return {
      ...createEmptyInternationalAddress(),
      ...value,
    };
  }

  if (legacyText) {
    return {
      ...createEmptyInternationalAddress(),
      countryRegion: '',
      detailAddress: String(legacyText),
    };
  }

  return createEmptyInternationalAddress();
}

export function normalizePartnerAddress(line = {}) {
  if (line.countryRegion) {
    return {
      ...createEmptyInternationalAddress(),
      ...line,
    };
  }

  const isChina = !line.country || line.country === '中国';
  if (isChina) {
    return {
      ...createEmptyInternationalAddress(),
      ...line,
      countryRegion: CHINA_COUNTRY_CODE,
      provinceCode: line.provinceCode || '',
      cityCode: line.cityCode || '',
      districtCode: line.districtCode || '',
      stateOrProvince: line.province || line.stateOrProvince || '',
      city: line.city || '',
      detailAddress: line.detailAddress || '',
    };
  }

  return {
    ...createEmptyInternationalAddress(),
    ...line,
    countryRegion: line.countryRegion || '',
    stateOrProvince: line.province || line.stateOrProvince || '',
    city: line.city || '',
    detailAddress: line.detailAddress || '',
  };
}

export function pickInternationalAddressFields(value) {
  const normalized = normalizeInternationalAddress(value);
  return INTERNATIONAL_ADDRESS_KEYS.reduce((result, key) => {
    result[key] = normalized[key];
    return result;
  }, {});
}

export function getCountryRegionLabel(countryRegion) {
  const option = countryRegionOptions.find((item) => item.value === countryRegion);
  if (option) return option.label;
  return countryRegion || '';
}

export function getCountryRegionName(countryRegion) {
  const option = countryRegionOptions.find((item) => item.value === countryRegion);
  if (option) return option.name;
  return countryRegion || '';
}

export function formatInternationalAddress(address) {
  const normalized = normalizeInternationalAddress(address);
  if (isChinaCountryRegion(normalized.countryRegion)) {
    const formatted = formatCnAddress({
      provinceCode: normalized.provinceCode,
      cityCode: normalized.cityCode,
      districtCode: normalized.districtCode,
      detailAddress: normalized.detailAddress,
    });
    if (formatted) return formatted;
    return [
      normalized.stateOrProvince,
      normalized.city,
      normalized.districtCode,
      normalized.detailAddress,
    ].filter(Boolean).join('');
  }

  const countryName = getCountryRegionName(normalized.countryRegion);
  return [
    countryName,
    normalized.stateOrProvince,
    normalized.city,
    normalized.detailAddress,
  ].filter(Boolean).join('');
}

export function getInternationalAddressDetailFields(address) {
  const normalized = normalizeInternationalAddress(address);
  const countryLabel = getCountryRegionLabel(normalized.countryRegion);

  if (isChinaCountryRegion(normalized.countryRegion)) {
    const { province, city, district } = getCnRegionLabels({
      provinceCode: normalized.provinceCode,
      cityCode: normalized.cityCode,
      districtCode: normalized.districtCode,
    });
    return {
      countryRegion: countryLabel,
      stateOrProvince: province || normalized.stateOrProvince || '',
      city: city || normalized.city || '',
      district: district || '',
      detailAddress: normalized.detailAddress,
      isChina: true,
    };
  }

  return {
    countryRegion: countryLabel,
    stateOrProvince: normalized.stateOrProvince,
    city: normalized.city,
    district: '',
    detailAddress: normalized.detailAddress,
    isChina: false,
  };
}

export function internationalAddressToCnRegionValue(address) {
  const normalized = normalizeInternationalAddress(address);
  return normalizeAddressValue({
    provinceCode: normalized.provinceCode,
    cityCode: normalized.cityCode,
    districtCode: normalized.districtCode,
    detailAddress: normalized.detailAddress,
  });
}

export function patchInternationalChinaRegion(address, partial) {
  const normalized = normalizeInternationalAddress(address);
  return {
    ...normalized,
    provinceCode: partial.provinceCode ?? normalized.provinceCode,
    cityCode: partial.cityCode ?? normalized.cityCode,
    districtCode: partial.districtCode ?? normalized.districtCode,
    detailAddress: partial.detailAddress ?? normalized.detailAddress,
    stateOrProvince: '',
    city: '',
  };
}
