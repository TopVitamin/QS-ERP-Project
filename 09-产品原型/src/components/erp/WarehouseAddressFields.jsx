import { InternationalAddressFields } from './InternationalAddressFields.jsx';

export function WarehouseAddressFields(props) {
  return (
    <InternationalAddressFields
      {...props}
      fieldKeyPrefix="warehouseAddress"
      detailPlaceholder="请输入街道、门牌、园区、仓库楼栋等"
    />
  );
}
