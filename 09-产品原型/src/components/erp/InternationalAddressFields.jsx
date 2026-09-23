import { CnAddressDetailInput, CnRegionPicker } from './CnAddressFields.jsx';
import { FormField } from '../ui/form-field.jsx';
import { Input } from '../ui/input.jsx';
import { SelectField } from '../ui/select-field.jsx';
import {
  countryRegionOptions,
  createEmptyInternationalAddress,
  internationalAddressToCnRegionValue,
  isChinaCountryRegion,
  normalizeInternationalAddress,
  patchInternationalChinaRegion,
} from '../../lib/internationalAddress.js';

export function InternationalAddressFields({
  value,
  onChange,
  fieldErrors = {},
  disabled = false,
  fieldKeyPrefix = 'address',
  detailPlaceholder = '请输入街道、门牌、楼层等',
}) {
  const address = normalizeInternationalAddress(value);
  const isChina = isChinaCountryRegion(address.countryRegion);
  const cnRegionValue = internationalAddressToCnRegionValue(address);

  function patch(partial) {
    onChange({
      ...address,
      ...partial,
    });
  }

  function handleCountryChange(countryRegion) {
    if (countryRegion === address.countryRegion) return;
    onChange({
      ...createEmptyInternationalAddress(),
      countryRegion,
    });
  }

  function handleChinaRegionChange(nextValue) {
    onChange(patchInternationalChinaRegion(address, nextValue));
  }

  return (
    <>
      <FormField label="国家/地区" fieldKey={`${fieldKeyPrefix}.countryRegion`} error={fieldErrors.countryRegion}>
        <SelectField
          value={address.countryRegion || ''}
          onValueChange={handleCountryChange}
          options={countryRegionOptions}
          placeholder="请选择国家/地区"
          ariaLabel="国家/地区"
          disabled={disabled}
        />
      </FormField>

      {isChina ? (
        <>
          <FormField label="省/市/区" fieldKey={`${fieldKeyPrefix}.region`} error={fieldErrors.region} className="col-span-2">
            <CnRegionPicker
              value={cnRegionValue}
              onChange={handleChinaRegionChange}
              disabled={disabled}
              invalid={Boolean(fieldErrors.region)}
            />
          </FormField>
          <FormField label="详细地址" fieldKey={`${fieldKeyPrefix}.detailAddress`} error={fieldErrors.detailAddress} className="col-span-3">
            <CnAddressDetailInput
              value={cnRegionValue}
              onChange={handleChinaRegionChange}
              disabled={disabled}
              invalid={Boolean(fieldErrors.detailAddress)}
              placeholder={detailPlaceholder}
            />
          </FormField>
        </>
      ) : (
        <>
          <FormField label="省/州" fieldKey={`${fieldKeyPrefix}.stateOrProvince`} error={fieldErrors.stateOrProvince}>
            <Input
              value={address.stateOrProvince || ''}
              onChange={(event) => patch({ stateOrProvince: event.target.value })}
              placeholder="请输入省/州"
              aria-label="省/州"
              disabled={disabled}
            />
          </FormField>
          <FormField label="城市" fieldKey={`${fieldKeyPrefix}.city`} error={fieldErrors.city}>
            <Input
              value={address.city || ''}
              onChange={(event) => patch({ city: event.target.value })}
              placeholder="请输入城市"
              aria-label="城市"
              disabled={disabled}
            />
          </FormField>
          <FormField label="详细地址" fieldKey={`${fieldKeyPrefix}.detailAddress`} error={fieldErrors.detailAddress} className="col-span-3">
            <Input
              value={address.detailAddress || ''}
              onChange={(event) => patch({ detailAddress: event.target.value })}
              placeholder={detailPlaceholder}
              aria-label="详细地址"
              disabled={disabled}
            />
          </FormField>
        </>
      )}
    </>
  );
}
