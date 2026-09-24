import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import { FormField } from '../ui/form-field.jsx';
import { Input } from '../ui/input.jsx';
import { Textarea } from '../ui/textarea.jsx';
import { EMPTY_PLACEHOLDER } from '../../lib/format.js';
import { REMARK_500_MAX } from '../../data/inventoryStockData.js';
import {
  applyFreeze,
  applyUnfreeze,
  getStockRow,
  listReservationsForStock,
} from '../../lib/inventoryStockLogic.js';

const reservationTableClassName = 'w-full table-fixed border-collapse text-left text-[12px]';
const reservationHeadClassName = 'h-7 border-b border-erp-border-table-header bg-erp-surface-table-head text-erp-text-section';
const reservationThClassName = 'border-r border-erp-border-table-column px-2 font-normal last:border-r-0';
const reservationRowClassName = 'h-8 border-b border-erp-border-table-row';
const reservationTdClassName = 'border-r border-erp-border-table-column px-2 align-middle last:border-r-0';

function ReadonlyStockInfo({ row }) {
  return (
    <div className="mt-3 space-y-1 rounded-erp-section bg-erp-surface-muted px-3 py-2 text-[12px] text-erp-text">
      <div>逻辑仓：{row.logicalWarehouseLabel || EMPTY_PLACEHOLDER}</div>
      <div>商品：{row.productCode} {row.productName}</div>
    </div>
  );
}

/**
 * 库存查询的模块弹窗：冻结、解冻、预占来源查看。
 * 校验与文案见《库存查询主PRD》F02～F04 与《库存查询前端Demo版PRD_弹窗与Mock》。
 */
export function InventoryStockActionDialogs({ dialog, onClose, onComplete, onOpenPage }) {
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    setQuantity('');
    setReason('');
    setFieldErrors({});
  }, [dialog]);

  const reservations = useMemo(
    () => (dialog?.type === 'reservations' && dialog.row
      ? listReservationsForStock(dialog.row.logicalWarehouse, dialog.row.product)
      : []),
    [dialog],
  );

  if (!dialog) return null;

  const { type, row } = dialog;
  const isFreeze = type === 'freeze';

  function finish(message, typeName = 'success') {
    onComplete?.({ message, type: typeName });
    onClose?.();
  }

  function handleConfirm() {
    const amount = Number(quantity);
    const errors = {};
    if (!quantity || !Number.isInteger(amount) || amount <= 0) {
      errors.quantity = isFreeze ? '冻结数量必须为大于0的整数' : '解冻数量必须为大于0的整数';
    }
    if (!String(reason || '').trim()) {
      errors.reason = isFreeze ? '请输入冻结原因' : '请输入解冻原因';
    }
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }
    try {
      const latest = getStockRow(row.logicalWarehouse, row.product);
      if (isFreeze) {
        applyFreeze(latest || row, { quantity: amount, reason: reason.trim() });
        finish(`已冻结 ${amount}，可用库存已更新`);
      } else {
        applyUnfreeze(latest || row, { quantity: amount, reason: reason.trim() });
        finish(`已解冻 ${amount}，可用库存已更新`);
      }
    } catch (error) {
      onComplete?.({ message: error.message || '操作失败，请稍后重试', type: 'warning', keepOpen: true });
    }
  }

  if (type === 'reservations') {
    const hasReservations = reservations.length > 0;
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="预占来源"
        description="以下来源单据行占用该「逻辑仓＋商品」的预占数量；预占的消耗与释放可在库存流水核对。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>关闭</Button>
            <Button
              variant="primary"
              size="compact"
              onClick={() => {
                onOpenPage?.('inventory-stock-flow', {
                  presetFilters: {
                    logicalWarehouses: [row.logicalWarehouse],
                    productCode: row.productCode,
                    stockStatus: row.stockStatus ? [row.stockStatus] : [],
                  },
                });
                onClose?.();
              }}
            >
              查看库存流水
            </Button>
          </>
        )}
      >
        {hasReservations ? (
          <div className="mt-3 table-scroll overflow-x-auto">
            <table className={reservationTableClassName} style={{ minWidth: '560px' }}>
              <colgroup>
                <col className="w-[150px]" />
                <col className="w-[210px]" />
                <col className="w-[72px]" />
                <col className="w-[96px]" />
              </colgroup>
              <thead className={reservationHeadClassName}>
                <tr>
                  <th className={reservationThClassName}>来源单据类型</th>
                  <th className={reservationThClassName}>来源单号</th>
                  <th className={reservationThClassName}>行号</th>
                  <th className={`${reservationThClassName} text-right`}>预占数量</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((item) => (
                  <tr key={item.id} className={reservationRowClassName}>
                    <td className={reservationTdClassName}>{item.sourceType || EMPTY_PLACEHOLDER}</td>
                    <td className={reservationTdClassName}>{item.sourceNo || EMPTY_PLACEHOLDER}</td>
                    <td className={reservationTdClassName}>{item.sourceLineNo ?? EMPTY_PLACEHOLDER}</td>
                    <td className={`${reservationTdClassName} text-right`}>{item.remainingQty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-[12px] text-erp-text-muted">该行暂无预占来源</p>
        )}
      </SimpleDialog>
    );
  }

  return (
    <SimpleDialog
      open
      onOpenChange={(open) => { if (!open) onClose?.(); }}
      title={isFreeze ? '冻结库存' : '解冻库存'}
      description={isFreeze
        ? '冻结从可用库存中占用，冻结后不再参与业务占用；解冻后恢复可用。'
        : '解冻后这部分数量重新计入可用库存。'}
      footer={(
        <>
          <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
          <Button variant="primary" size="compact" onClick={handleConfirm}>
            {isFreeze ? '确认冻结' : '确认解冻'}
          </Button>
        </>
      )}
    >
      <ReadonlyStockInfo row={row} />
      <div className="mt-3 space-y-1 rounded-erp-section px-0 text-[12px] text-erp-text">
        {isFreeze ? (
          <>
            <div>当前可用库存：{row.availableQty}</div>
            <div>当前冻结库存：{row.frozenQty}</div>
          </>
        ) : (
          <>
            <div>当前冻结库存：{row.frozenQty}</div>
            <div>当前可用库存：{row.availableQty}</div>
          </>
        )}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3">
        <FormField label={isFreeze ? '冻结数量 *' : '解冻数量 *'} error={fieldErrors.quantity}>
          <Input
            type="number"
            min="1"
            step="1"
            value={quantity}
            placeholder={isFreeze ? '请输入冻结数量' : '请输入解冻数量'}
            aria-label={isFreeze ? '冻结数量' : '解冻数量'}
            onChange={(event) => {
              setQuantity(event.target.value);
              setFieldErrors((current) => ({ ...current, quantity: undefined }));
            }}
          />
        </FormField>
        <FormField label={isFreeze ? '冻结原因 *' : '解冻原因 *'} error={fieldErrors.reason}>
          <Textarea
            rows={3}
            maxLength={REMARK_500_MAX}
            value={reason}
            placeholder={isFreeze ? '请输入冻结原因' : '请输入解冻原因'}
            aria-label={isFreeze ? '冻结原因' : '解冻原因'}
            onChange={(event) => {
              setReason(event.target.value);
              setFieldErrors((current) => ({ ...current, reason: undefined }));
            }}
          />
        </FormField>
      </div>
      <p className="mt-3 text-[12px] text-erp-text-muted">
        每次{isFreeze ? '冻结' : '解冻'}生成一条库存流水（事件类型：{isFreeze ? '冻结' : '解冻'}，来源单号为空）。
      </p>
    </SimpleDialog>
  );
}
