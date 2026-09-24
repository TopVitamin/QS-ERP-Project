import { useEffect, useState } from 'react';
import { Button } from '../ui/button.jsx';
import { Checkbox } from '../ui/checkbox.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import { FormField } from '../ui/form-field.jsx';
import { Textarea } from '../ui/textarea.jsx';
import { EMPTY_PLACEHOLDER } from '../../lib/format.js';
import {
  FINANCE_RESULT_NOTE_MAX,
  listFinancePushRecords,
  pushResultLabels,
  pushResultTones,
  pushTriggerLabels,
  retryFinanceResultDoc,
} from '../../lib/financeResultLogic.js';

const recordTableClassName = 'w-full table-fixed border-collapse text-left text-[12px]';
const recordHeadClassName = 'h-7 border-b border-erp-border-table-header bg-erp-surface-table-head text-erp-text-section';
const recordThClassName = 'border-r border-erp-border-table-column px-2 font-normal last:border-r-0';
const recordRowClassName = 'h-8 border-b border-erp-border-table-row';
const recordTdClassName = 'border-r border-erp-border-table-column px-2 align-middle last:border-r-0';

/**
 * 业财结果单据的模块弹窗：推送记录（F02）、重推确认（F03）、异常运维重推（F04）。
 * 标题、正文、必填项与 Mock 规则见《业财结果单据前端Demo版PRD_弹窗与Mock》§2～§4。
 */
export function FinanceResultActionDialogs({ dialog, onClose, onComplete, onPushFinished }) {
  const [note, setNote] = useState('');
  const [forceFail, setForceFail] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    setNote('');
    setForceFail(false);
    setFieldErrors({});
  }, [dialog]);

  if (!dialog) return null;

  const { type, row } = dialog;

  if (type === 'records') {
    const records = listFinancePushRecords(row);
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        size="xl"
        title={`推送记录 · ${row.docNo}`}
        footer={(
          <Button variant="outline" size="compact" onClick={onClose}>关闭</Button>
        )}
      >
        {records.length ? (
          <div className="mt-3 table-scroll overflow-x-auto">
            <table className={recordTableClassName} style={{ minWidth: '840px' }}>
              <colgroup>
                <col className="w-[72px]" />
                <col className="w-[160px]" />
                <col className="w-[80px]" />
                <col className="w-[180px]" />
                <col className="w-[110px]" />
                <col className="w-[96px]" />
                <col className="w-[150px]" />
              </colgroup>
              <thead className={recordHeadClassName}>
                <tr>
                  <th className={`${recordThClassName} text-right`}>推送序号</th>
                  <th className={recordThClassName}>推送时间</th>
                  <th className={recordThClassName}>推送结果</th>
                  <th className={recordThClassName}>推送失败原因</th>
                  <th className={recordThClassName}>触发方式</th>
                  <th className={recordThClassName}>操作人</th>
                  <th className={recordThClassName}>处理说明</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.seq} className={recordRowClassName}>
                    <td className={`${recordTdClassName} text-right`}>{record.seq ?? EMPTY_PLACEHOLDER}</td>
                    <td className={recordTdClassName}>{record.pushTime || EMPTY_PLACEHOLDER}</td>
                    <td className={`${recordTdClassName} ${pushResultTones[record.result] || ''}`}>
                      {pushResultLabels[record.result] || record.result || EMPTY_PLACEHOLDER}
                    </td>
                    <td className={recordTdClassName} title={record.failReason || ''}>{record.failReason || EMPTY_PLACEHOLDER}</td>
                    <td className={recordTdClassName}>{pushTriggerLabels[record.trigger] || record.trigger || EMPTY_PLACEHOLDER}</td>
                    <td className={recordTdClassName}>{record.operator || EMPTY_PLACEHOLDER}</td>
                    <td className={recordTdClassName} title={record.note || ''}>{record.note || EMPTY_PLACEHOLDER}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-[12px] text-erp-text-muted">暂无推送记录</p>
        )}
      </SimpleDialog>
    );
  }

  const isOpsRetry = type === 'ops-retry';

  function handleConfirm() {
    if (isOpsRetry && !note.trim()) {
      setFieldErrors({ note: '请输入重推原因' });
      return;
    }
    const result = retryFinanceResultDoc(row.id, {
      trigger: isOpsRetry ? 'ops_manual' : 'manual',
      note: note.trim(),
      forceFail,
      onFinished: onPushFinished,
    });
    if (!result.ok) {
      onComplete?.({ message: result.message, type: 'warning', keepOpen: true });
      return;
    }
    onClose?.();
  }

  return (
    <SimpleDialog
      open
      onOpenChange={(open) => { if (!open) onClose?.(); }}
      title={isOpsRetry ? '异常运维重推' : '确认重推财务ERP？'}
      description={isOpsRetry
        ? '用于推送成功后财务ERP侧发现异常的情形：请先在财务ERP删除错误单据，再重新推送本结果单。'
        : `将对结果单 ${row.docNo} 重新推送财务ERP。重推不重新审核、不重复记账，库存与业务结果不回滚。`}
      footer={(
        <>
          <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
          <Button variant="primary" size="compact" onClick={handleConfirm}>确认重推</Button>
        </>
      )}
    >
      <div className="mt-3 space-y-3">
        <FormField
          label={isOpsRetry ? '重推原因 *' : '处理说明（选填）'}
          error={fieldErrors.note}
          hint={isOpsRetry ? `${note.length}/${FINANCE_RESULT_NOTE_MAX}` : undefined}
        >
          <Textarea
            rows={3}
            maxLength={FINANCE_RESULT_NOTE_MAX}
            value={note}
            placeholder={isOpsRetry ? '请输入重推原因（如：金额错误，财务ERP已删单重推）' : '请输入处理说明'}
            aria-label={isOpsRetry ? '重推原因' : '处理说明'}
            onChange={(event) => {
              setNote(event.target.value);
              setFieldErrors((current) => ({ ...current, note: undefined }));
            }}
          />
        </FormField>
        <label className="flex items-center gap-2 text-[12px] text-erp-text">
          <Checkbox
            checked={forceFail}
            aria-label="Demo：模拟推送失败"
            onCheckedChange={(checked) => setForceFail(checked === true)}
          />
          Demo：模拟推送失败（勾选后本次推送固定失败，用于演示失败原因更新与继续重试）
        </label>
      </div>
    </SimpleDialog>
  );
}
