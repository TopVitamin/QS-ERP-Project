import { useEffect, useState } from 'react';
import { subscribeMockRows } from '../lib/mockStorage.js';

/**
 * 详情页行数据订阅：context 传入行时按 id 订阅本地 Mock 集合。
 * 系统自动推送、回传生成的后续变化（如通知单推送中→待发货）会即时刷新详情。
 */
export function useTransferDocRow(context, { storageKey, loadById }) {
  const contextRow = context?.row;
  const [row, setRow] = useState(contextRow || null);

  useEffect(() => {
    if (!contextRow?.id) {
      setRow(contextRow || null);
      return undefined;
    }

    function syncRow() {
      const latest = loadById(contextRow.id);
      setRow(latest || contextRow);
    }

    syncRow();
    return subscribeMockRows(storageKey, syncRow);
  }, [contextRow, storageKey, loadById]);

  return row;
}
