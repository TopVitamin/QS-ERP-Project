import { readMockRows, subscribeMockRows, writeMockRows } from './mockStorage.js';

export const PREFERENCES_STORAGE_KEY = 'qs-erp:preferences:v2';

const defaultPreferences = {
  theme: 'blue',
  defaultHome: 'purchase-order',
  messageEnabled: true,
};

export function readPreferences() {
  const [stored] = readMockRows(PREFERENCES_STORAGE_KEY, []);
  return { ...defaultPreferences, ...(stored || {}) };
}

export function writePreferences(patch) {
  writeMockRows(PREFERENCES_STORAGE_KEY, [{ ...readPreferences(), ...patch }]);
}

export function subscribePreferences(onChange) {
  return subscribeMockRows(PREFERENCES_STORAGE_KEY, (rows) => {
    const [stored] = Array.isArray(rows) ? rows : [];
    onChange({ ...defaultPreferences, ...(stored || {}) });
  });
}
