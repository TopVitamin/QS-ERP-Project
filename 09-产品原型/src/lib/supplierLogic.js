import {
  createEmptyAddress,
  createEmptyBank,
  createEmptyContact,
  validateAddressLines,
  validateBankLines,
  validateContactLines,
  validatePartnerBase,
} from './partnerMasterLogic.js';

import { SUPPLIER_STORAGE_KEY } from '../data/supplierData.js';

export { SUPPLIER_STORAGE_KEY };

export function createEmptySupplierForm() {
  return {
    code: '',
    name: '',
    category: '',
    level: 'unrated',
    creditCode: '',
    remark: '',
    currency: '',
    settlementMethod: '',
    paymentTerms: '',
    contacts: [],
    addresses: [],
    banks: [],
  };
}

export function validateSupplierForSave(form, existingRows = [], currentId = null) {
  const fieldErrors = validatePartnerBase(form, existingRows, currentId, '供应商编码');
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const contactError = validateContactLines(form.contacts);
  if (contactError) return contactError;

  const addressError = validateAddressLines(form.addresses);
  if (addressError) return addressError;

  const bankError = validateBankLines(form.banks, { accountName: '收款户名', accountNo: '收款账号', bankName: '开户银行' });
  if (bankError) return bankError;

  return null;
}

export { createEmptyContact, createEmptyAddress, createEmptyBank };
