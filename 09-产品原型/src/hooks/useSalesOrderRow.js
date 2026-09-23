import { useEffect, useState } from 'react';
import { loadOrderById, SALES_ORDER_STORAGE_KEY } from '../lib/salesOrderLogic.js';
import { subscribeMockRows } from '../lib/mockStorage.js';

export function useSalesOrderRow(context) {
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
    return subscribeMockRows(SALES_ORDER_STORAGE_KEY, syncRow);
  }, [contextRow]);

  return row;
}
