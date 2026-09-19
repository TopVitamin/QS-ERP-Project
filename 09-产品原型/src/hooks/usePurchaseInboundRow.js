import { useEffect, useState } from 'react';
import { INBOUND_STORAGE_KEY, loadInboundById } from '../lib/inboundLogic.js';
import { subscribeMockRows } from '../lib/mockStorage.js';

export function usePurchaseInboundRow(context) {
  const contextRow = context?.row;
  const [row, setRow] = useState(contextRow || null);

  useEffect(() => {
    if (!contextRow?.id) {
      setRow(contextRow || null);
      return undefined;
    }

    function syncRow() {
      const latest = loadInboundById(contextRow.id);
      setRow(latest || contextRow);
    }

    syncRow();
    return subscribeMockRows(INBOUND_STORAGE_KEY, syncRow);
  }, [contextRow]);

  return row;
}
