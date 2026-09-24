import { Button } from '../ui/button.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import { EMPTY_PLACEHOLDER } from '../../lib/format.js';
import {
  listPushExceptionRecords,
  pushExceptionMethodLabels,
  pushExceptionResultLabels,
  pushExceptionResultTones,
} from '../../lib/pushExceptionLogic.js';

const recordTableClassName = 'w-full table-fixed border-collapse text-left text-[12px]';
const recordHeadClassName = 'h-7 border-b border-erp-border-table-header bg-erp-surface-table-head text-erp-text-section';
const recordThClassName = 'border-r border-erp-border-table-column px-2 font-normal last:border-r-0';
const recordRowClassName = 'h-8 border-b border-erp-border-table-row';
const recordTdClassName = 'border-r border-erp-border-table-column px-2 align-middle last:border-r-0';

/**
 * 推送异常的模块弹窗：处理记录（F03）。
 * 标题、内容列与空态见《推送异常前端Demo版PRD_弹窗与Mock》§2。
 */
export function PushExceptionActionDialogs({ dialog, onClose }) {
  if (!dialog) return null;

  const { type, row } = dialog;
  if (type !== 'records') return null;

  const records = listPushExceptionRecords(row);
  const objectNo = row.docNo || row.productCode || row.sourceNo || '';

  return (
    <SimpleDialog
      open
      onOpenChange={(open) => { if (!open) onClose?.(); }}
      size="xl"
      title={`处理记录 · ${objectNo}`}
      footer={(
        <Button variant="outline" size="compact" onClick={onClose}>关闭</Button>
      )}
    >
      {records.length ? (
        <div className="mt-3 table-scroll overflow-x-auto">
          <table className={recordTableClassName} style={{ minWidth: '720px' }}>
            <colgroup>
              <col className="w-[170px]" />
              <col className="w-[130px]" />
              <col className="w-[90px]" />
              <col className="w-[110px]" />
              <col className="w-[220px]" />
            </colgroup>
            <thead className={recordHeadClassName}>
              <tr>
                <th className={recordThClassName}>处理时间</th>
                <th className={recordThClassName}>处理方式</th>
                <th className={recordThClassName}>处理结果</th>
                <th className={recordThClassName}>操作人</th>
                <th className={recordThClassName}>说明</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className={recordRowClassName}>
                  <td className={recordTdClassName}>{record.time || EMPTY_PLACEHOLDER}</td>
                  <td className={recordTdClassName}>{pushExceptionMethodLabels[record.method] || record.method || EMPTY_PLACEHOLDER}</td>
                  <td className={`${recordTdClassName} ${pushExceptionResultTones[record.result] || ''}`}>
                    {pushExceptionResultLabels[record.result] || record.result || EMPTY_PLACEHOLDER}
                  </td>
                  <td className={recordTdClassName}>{record.operator || EMPTY_PLACEHOLDER}</td>
                  <td className={recordTdClassName} title={record.note || ''}>{record.note || EMPTY_PLACEHOLDER}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 text-[12px] text-erp-text-muted">暂无处理记录</p>
      )}
    </SimpleDialog>
  );
}
