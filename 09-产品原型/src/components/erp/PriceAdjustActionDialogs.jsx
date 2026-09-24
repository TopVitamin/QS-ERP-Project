import { useEffect, useState } from 'react';
import { Button } from '../ui/button.jsx';
import { ConfirmDialog } from '../ui/alert-dialog.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import { Textarea } from '../ui/textarea.jsx';
import {
  applyApprovePriceAdjust,
  applyRejectPriceAdjust,
  applySubmitPriceAdjust,
  canApprovePriceAdjust,
  canDeletePriceAdjust,
  canRejectPriceAdjust,
  canSubmitPriceAdjust,
  deletePriceAdjustById,
  loadPriceAdjustById,
  REMARK_500_MAX,
} from '../../lib/priceAdjustLogic.js';

/** 采购／销售价格调整单的弹窗文案差异（弹窗与Mock PRD §2、§3）。 */
const sideTexts = {
  purchase: {
    title: '采购价格调整单',
    lockText: '供应商、币别和明细价格将被锁定',
    priceListLabel: '采购价目表',
  },
  sales: {
    title: '销售价格调整单',
    lockText: '面向范围、币别和明细价格将被锁定',
    priceListLabel: '销售价目表',
  },
};

const STATE_CHANGED_MESSAGE = '操作失败，单据状态已变更，请刷新后重试';

/**
 * 价格调整单模块弹窗：提交确认、审核、驳回、删除（弹窗与Mock PRD §2、§3.1～§3.3）。
 * 离开未保存由 DocumentEditorFrame 统一确认，不在本文件重复。
 */
export function PriceAdjustActionDialogs({ side = 'purchase', dialog, onClose, onComplete, onNotify }) {
  const [returnComment, setReturnComment] = useState('');
  const texts = sideTexts[side] || sideTexts.purchase;

  useEffect(() => {
    if (!dialog) return;
    setReturnComment('');
  }, [dialog]);

  if (!dialog) return null;

  const { type, row } = dialog;

  function latestRow() {
    return loadPriceAdjustById(side, row?.id) || row;
  }

  function finish(message, typeName = 'success', nextRow) {
    onComplete?.({ message, type: typeName, row: nextRow });
    onClose?.();
  }

  function blockStateChanged() {
    onNotify?.(STATE_CHANGED_MESSAGE, 'warning');
    onClose?.();
  }

  if (type === 'submit') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title={`确认提交${texts.title}？`}
        description={`提交后进入待审核状态，${texts.lockText}；审核通过后立即更新${texts.priceListLabel}当前价。审核前仍可等待审核或由审核人驳回。`}
        confirmLabel="确认提交"
        onConfirm={() => {
          // 表单页传入 onConfirm（走表单保存，保证单号、明细与校验口径一致）；列表/详情直接按单据提交。
          if (dialog.onConfirm) {
            dialog.onConfirm();
            onClose?.();
            return;
          }
          const latest = latestRow();
          if (!canSubmitPriceAdjust(latest)) {
            blockStateChanged();
            return;
          }
          finish(`${texts.title}已提交`, 'success', applySubmitPriceAdjust(latest));
        }}
      />
    );
  }

  if (type === 'approve') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="确认审核？"
        description={`审核通过后立即新增或覆盖${texts.priceListLabel}当前价，已审核的调整单不可修改、删除或撤销。`}
        confirmLabel="确认审核"
        onConfirm={() => {
          const latest = latestRow();
          if (!canApprovePriceAdjust(latest)) {
            blockStateChanged();
            return;
          }
          finish(`${texts.title}已审核，价目表当前价已更新`, 'success', applyApprovePriceAdjust(latest));
        }}
      />
    );
  }

  if (type === 'reject') {
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title={`驳回${texts.title}`}
        description="驳回后单据进入已驳回状态，可修改后重新提交。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              disabled={!returnComment.trim()}
              onClick={() => {
                const latest = latestRow();
                if (!canRejectPriceAdjust(latest)) {
                  blockStateChanged();
                  return;
                }
                finish(`${texts.title}已驳回，可修改后重新提交`, 'success', applyRejectPriceAdjust(latest, returnComment.trim()));
              }}
            >
              确认驳回
            </Button>
          </>
        )}
      >
        <Textarea
          value={returnComment}
          onChange={(event) => setReturnComment(event.target.value)}
          placeholder="请输入驳回意见"
          maxLength={REMARK_500_MAX}
          rows={4}
          className="mt-3"
          aria-label="驳回意见"
        />
      </SimpleDialog>
    );
  }

  if (type === 'delete') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title={`删除${texts.title}？`}
        description="仅草稿和已驳回且未生效的调整单可以删除，删除后不可恢复，单号不重用；已审核不可删除。"
        confirmLabel="删除"
        confirmVariant="danger"
        onConfirm={() => {
          const latest = latestRow();
          if (!canDeletePriceAdjust(latest)) {
            blockStateChanged();
            return;
          }
          deletePriceAdjustById(side, latest.id);
          onComplete?.({ message: `${texts.title}已删除`, type: 'success', deleted: true, id: latest.id });
          onClose?.();
        }}
      />
    );
  }

  return null;
}

/** 详情页页头业务按钮：`返回列表` 之后按状态互斥展示（主PRD §6.4、详情页 Demo PRD §2）。 */
export function PriceAdjustDetailHeaderActions({ row, onAction }) {
  if (!row) return null;

  const actions = [];

  if (canSubmitPriceAdjust(row)) {
    actions.push({ id: 'submit', label: '提交', variant: 'primary' });
  }
  if (canDeletePriceAdjust(row)) {
    actions.push({ id: 'delete', label: '删除', variant: 'outline' });
  }
  if (canApprovePriceAdjust(row)) {
    actions.push({ id: 'approve', label: '审核', variant: 'primary' });
  }
  if (canRejectPriceAdjust(row)) {
    actions.push({ id: 'reject', label: '驳回', variant: 'outline' });
  }
  if (row.auditStatus === 'approved') {
    actions.push({ id: 'viewPriceList', label: '查看价目表', variant: 'outline' });
  }

  return actions.map((action) => (
    <Button key={action.id} variant={action.variant} size="compact" onClick={() => onAction(action.id, row)}>
      {action.label}
    </Button>
  ));
}
