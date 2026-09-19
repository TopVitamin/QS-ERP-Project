import { useEffect, useState } from 'react';
import { loadNoticeById, NOTICE_STORAGE_KEY } from '../lib/receiptNoticeLogic.js';
import { subscribeMockRows } from '../lib/mockStorage.js';

export function usePurchaseReceiptNoticeRow(context) {
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
    return subscribeMockRows(NOTICE_STORAGE_KEY, syncRow);
  }, [contextRow]);

  return row;
}
