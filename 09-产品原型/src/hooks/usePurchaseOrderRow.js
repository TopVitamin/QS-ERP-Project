import { useEffect, useState } from 'react';
import { loadOrderById, ORDER_STORAGE_KEY } from '../lib/purchaseOrderLogic.js';
import { subscribeMockRows } from '../lib/mockStorage.js';

export function usePurchaseOrderRow(context) {
  const contextRow = context?.row;
  const [row, setRow] = useState(contextRow || null);

  useEffect(() => {
    if (!contextRow?.id) {
      setRow(contextRow || null);
      return undefined;
    }

    function syncRow() {
      const latest = loadOrderById(contextRow.id);
      setRow(latest || contextRow);
    }

    syncRow();
    return subscribeMockRows(ORDER_STORAGE_KEY, syncRow);
  }, [contextRow]);

  return row;
}
