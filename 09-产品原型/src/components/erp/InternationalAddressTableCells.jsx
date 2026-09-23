import { CnAddressDetailInput } from './CnAddressFields.jsx';
import { Input } from '../ui/input.jsx';
import { SelectField } from '../ui/select-field.jsx';
import { getCities, getDistricts, getProvinces } from '../../lib/cnAddress.js';
import {
  countryRegionOptions,
  createEmptyInternationalAddress,
  internationalAddressToCnRegionValue,
  isChinaCountryRegion,
  normalizeInternationalAddress,
  patchInternationalChinaRegion,
  pickInternationalAddressFields,
} from '../../lib/internationalAddress.js';

function OverseasPlaceholder() {
  return <span className="px-1 text-erp-text-muted">-</span>;
}

export function CountryRegionTableCell({ row, onPatch }) {
  const address = normalizeInternationalAddress(row);

  return (
    <SelectField
      value={address.countryRegion || ''}
      options={countryRegionOptions}
      placeholder="国家/地区"
      ariaLabel="国家/地区"
      onValueChange={(countryRegion) => {
        if (countryRegion === address.countryRegion) return;
        onPatch(pickInternationalAddressFields({
          ...createEmptyInternationalAddress(),
          countryRegion,
        }));
      }}
    />
  );
}

export function StateProvinceTableCell({ row, onPatch }) {
  const address = normalizeInternationalAddress(row);

  if (isChinaCountryRegion(address.countryRegion)) {
    return (
      <SelectField
        value={address.provinceCode || ''}
        options={getProvinces()}
        placeholder="省"
        ariaLabel="省"
        onValueChange={(provinceCode) => {
          onPatch(patchInternationalChinaRegion(address, {
            provinceCode,
            cityCode: '',
            districtCode: '',
          }));
        }}
      />
    );
  }

  return (
    <Input
      value={address.stateOrProvince || ''}
      placeholder="省/州"
      aria-label="省/州"
      onChange={(event) => onPatch({ stateOrProvince: event.target.value })}
    />
  );
}

export function CityTableCell({ row, onPatch }) {
  const address = normalizeInternationalAddress(row);

  if (isChinaCountryRegion(address.countryRegion)) {
    return (
      <SelectField
        value={address.cityCode || ''}
        options={getCities(address.provinceCode)}
        placeholder="市"
        ariaLabel="市"
        disabled={!address.provinceCode}
        onValueChange={(cityCode) => {
          onPatch(patchInternationalChinaRegion(address, {
            cityCode,
            districtCode: '',
          }));
        }}
      />
    );
  }

  return (
    <Input
      value={address.city || ''}
      placeholder="城市"
      aria-label="城市"
      onChange={(event) => onPatch({ city: event.target.value })}
    />
  );
}

export function DistrictTableCell({ row, onPatch }) {
  const address = normalizeInternationalAddress(row);

  if (!isChinaCountryRegion(address.countryRegion)) {
    return <OverseasPlaceholder />;
  }

  return (
    <SelectField
      value={address.districtCode || ''}
      options={getDistricts(address.provinceCode, address.cityCode)}
      placeholder="区"
      ariaLabel="区"
      disabled={!address.cityCode}
      onValueChange={(districtCode) => {
        onPatch(patchInternationalChinaRegion(address, { districtCode }));
      }}
    />
  );
}

export function DetailAddressTableCell({ row, onPatch }) {
  const address = normalizeInternationalAddress(row);

  if (isChinaCountryRegion(address.countryRegion)) {
    const cnValue = internationalAddressToCnRegionValue(address);
    return (
      <CnAddressDetailInput
        value={cnValue}
        placeholder="街道、门牌、楼层"
        onChange={(nextValue) => {
          onPatch(patchInternationalChinaRegion(address, {
            detailAddress: nextValue.detailAddress,
          }));
        }}
      />
    );
  }

  return (
    <Input
      value={address.detailAddress || ''}
      placeholder="街道、门牌、楼层"
      aria-label="详细地址"
      onChange={(event) => onPatch({ detailAddress: event.target.value })}
    />
  );
}
