import { useEffect, useState } from 'react';
import { readNotifications, subscribeNotifications } from '../lib/notificationStore.js';

export function useNotifications() {
  const [items, setItems] = useState(readNotifications);

  useEffect(() => subscribeNotifications(setItems), []);

  return items;
}
