import {
  createEmptyAddress,
  createEmptyBank,
  createEmptyBusinessInfo,
  createEmptyContact,
  validateAddressLines,
  validateBankLines,
  validateContactLines,
  validatePartnerBase,
} from './partnerMasterLogic.js';

import { CUSTOMER_STORAGE_KEY } from '../data/customerData.js';

export { CUSTOMER_STORAGE_KEY };

const generic2cCategories = new Set(['国内电商2C客户', '跨境电商2C客户']);

export function createEmptyCustomerForm() {
  return {
    code: '',
    name: '',
    category: '',
    level: 'unrated',
    remark: '',
    currency: '',
    settlementMethod: '',
    collectionTerms: '',
    contacts: [],
    addresses: [],
    banks: [],
    businessInfo: createEmptyBusinessInfo(),
  };
}

export function validateCustomerForSave(form, existingRows = [], currentId = null) {
  const fieldErrors = validatePartnerBase(form, existingRows, currentId, '客户编码');
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  if (generic2cCategories.has(form.category)) {
    const duplicate = existingRows.find((row) => row.id !== currentId && row.category === form.category);
    if (duplicate) {
      const label = form.category === '国内电商2C客户' ? '国内电商2C通用客户' : '跨境电商2C通用客户';
      return { message: `已存在${label}，不能重复创建` };
    }
  }

  const contactError = validateContactLines(form.contacts);
  if (contactError) return contactError;

  const addressError = validateAddressLines(form.addresses);
  if (addressError) return addressError;

  const bankError = validateBankLines(form.banks, { accountName: '账户名称', accountNo: '银行账号', bankName: '开户银行' });
  if (bankError) return bankError;

  return null;
}

export function syncBusinessInfoFromDefaultBank(form) {
  const defaultBank = form.banks.find((item) => item.isDefault);
  if (!defaultBank) return form.businessInfo;
  return {
    ...form.businessInfo,
    bankName: form.businessInfo.bankName || defaultBank.bankName || '',
    bankAccount: form.businessInfo.bankAccount || defaultBank.accountNo || '',
  };
}

export { createEmptyContact, createEmptyAddress, createEmptyBank, createEmptyBusinessInfo };
