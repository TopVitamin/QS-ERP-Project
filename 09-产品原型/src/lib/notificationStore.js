import { readMockRows, subscribeMockRows, writeMockRows } from './mockStorage.js';
import { mockNotifications } from '../data/notificationData.js';
import { readPreferences } from './preferences.js';
import { formatDateTime } from './format.js';

export const NOTIFICATIONS_STORAGE_KEY = 'qs-erp:notifications:v1';

export function readNotifications() {
  return readMockRows(NOTIFICATIONS_STORAGE_KEY, mockNotifications);
}

export function writeNotifications(list) {
  writeMockRows(NOTIFICATIONS_STORAGE_KEY, list);
}

export function subscribeNotifications(onChange) {
  return subscribeMockRows(NOTIFICATIONS_STORAGE_KEY, onChange);
}

export function pushNotification({ title, tag = '系统', category = 'system', link = null }) {
  if (readPreferences().messageEnabled === false) return null;
  const item = {
    id: `notice-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title,
    tag,
    category,
    time: formatDateTime(),
    read: false,
    link,
  };
  writeNotifications([item, ...readNotifications()]);
  return item;
}

export function markNotificationRead(id) {
  writeNotifications(readNotifications().map((item) => (item.id === id ? { ...item, read: true } : item)));
}

export function markAllNotificationsRead() {
  writeNotifications(readNotifications().map((item) => ({ ...item, read: true })));
}

export function removeNotification(id) {
  writeNotifications(readNotifications().filter((item) => item.id !== id));
}

export function clearReadNotifications() {
  writeNotifications(readNotifications().filter((item) => !item.read));
}
