import { useEffect, useState } from 'react';
import { DELIVERY_NOTICE_STORAGE_KEY, loadNoticeById } from '../lib/salesDeliveryNoticeLogic.js';
import { subscribeMockRows } from '../lib/mockStorage.js';

export function useSalesDeliveryNoticeRow(context) {
  const contextRow = context?.row;
  const [row, setRow] = useState(contextRow || null);

  useEffect(() => {
    if (!contextRow?.id) {
      setRow(contextRow || null);
      return undefined;
    }

    function syncRow() {
      const latest = loadNoticeById(contextRow.id);
      setRow(latest || contextRow);
    }

    syncRow();
    return subscribeMockRows(DELIVERY_NOTICE_STORAGE_KEY, syncRow);
  }, [contextRow]);

  return row;
}
