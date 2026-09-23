export {
  CHINA_COUNTRY_CODE,
  countryRegionOptions as warehouseCountryOptions,
  createEmptyInternationalAddress as createEmptyWarehouseAddress,
  formatInternationalAddress as formatWarehouseAddress,
  getCountryRegionLabel as getWarehouseCountryLabel,
  getCountryRegionName as getWarehouseCountryName,
  getInternationalAddressDetailFields as getWarehouseAddressDetailFields,
  internationalAddressToCnRegionValue as warehouseAddressToCnRegionValue,
  isChinaCountryRegion as isChinaWarehouseCountry,
  normalizeInternationalAddress as normalizeWarehouseAddress,
  patchInternationalChinaRegion as patchWarehouseChinaRegion,
} from './internationalAddress.js';
