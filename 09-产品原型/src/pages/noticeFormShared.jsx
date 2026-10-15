import { useEffect, useState } from 'react';

/**
 * 下推通知单表单页共享的表单草稿状态。
 * source 就绪且通过 canPush（可选）时构建表单，source 变化即重建；updateField/updateLine
 * 变更即标记 dirty。带字段联动的页面（如销售发货通知的发货方式）用 updateForm 自定义更新。
 * canPush / buildForm 传模块级函数（稳定引用），不要传内联闭包。
 */
export function useNoticeFormDraft(source, { canPush, buildForm }) {
  const ready = Boolean(source && (!canPush || canPush(source)));
  const [form, setForm] = useState(() => (ready ? buildForm(source) : null));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setForm(ready ? buildForm(source) : null);
    setDirty(false);
  }, [source, canPush, buildForm, ready]);

  function updateForm(updater) {
    setForm(updater);
    setDirty(true);
  }

  function updateField(key, value) {
    updateForm((current) => ({ ...current, [key]: value }));
  }

  function updateLine(lineId, key, value) {
    updateForm((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.id === lineId ? { ...line, [key]: value } : line)),
    }));
  }

  return { form, setForm, dirty, updateForm, updateField, updateLine };
}

/** 下推/编辑不可用的提示块：一条说明 + 返回链接。 */
export function NoticeSourceMissingState({ message, linkLabel, onBack }) {
  return (
    <div className="rounded-erp-section border border-erp-border-card bg-erp-surface-panel p-6 text-[12px] text-erp-text">
      {message}
      <button type="button" className="ml-2 text-erp-primary" onClick={onBack}>{linkLabel}</button>
    </div>
  );
}
