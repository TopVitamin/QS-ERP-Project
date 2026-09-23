import { useEffect, useState } from 'react';
import { loadOutboundById, SALES_OUTBOUND_STORAGE_KEY } from '../lib/salesOutboundLogic.js';
import { subscribeMockRows } from '../lib/mockStorage.js';

export function useSalesOutboundRow(context) {
  const contextRow = context?.row;
  const [row, setRow] = useState(contextRow || null);

  useEffect(() => {
    if (!contextRow?.id) {
      setRow(contextRow || null);
      return undefined;
    }

    function syncRow() {
      const latest = loadOutboundById(contextRow.id);
      setRow(latest || contextRow);
    }

    syncRow();
    return subscribeMockRows(SALES_OUTBOUND_STORAGE_KEY, syncRow);
  }, [contextRow]);

  return row;
}
