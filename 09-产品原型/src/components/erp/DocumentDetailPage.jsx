import { useMemo } from 'react';
import { DetailField, DocumentDetailFrame, EditorCard } from './DocumentDetailFrame.jsx';
import { LineItemTable } from './LineItemTable.jsx';
import { erpFieldGridClassName } from '../../styles/typography.js';

function DetailFieldGrid({ fields }) {
  return (
    <div className={erpFieldGridClassName}>
      {fields.map(({ key, label, value, className }) => (
        <DetailField key={key || label} label={label} value={value} className={className} />
      ))}
    </div>
  );
}

/**
 * 配置驱动的单据详情页。
 * 订单、入库单等页面只提供详情转换和字段清单，保持详情页结构一致。
 */
export function DocumentDetailPage({ context, onOpenPage, config }) {
  const row = context?.row || {};
  const detail = useMemo(() => config.getDetail(row), [config, row]);
  const totalQuantity = detail.lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
  const totalAmount = detail.lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.price || 0), 0);
  const status = config.getStatus(row, detail);

  return (
    <DocumentDetailFrame
      title={config.title(detail)}
      status={status}
      onBack={() => onOpenPage?.(config.listPageId)}
      onEdit={config.canEdit(row) ? () => onOpenPage?.(config.editPageId, { row }) : undefined}
      editLabel={config.editLabel}
    >
      <EditorCard title={config.infoSectionTitle}>
        <DetailFieldGrid fields={config.infoFields({ row, detail, status })} />
      </EditorCard>

      <EditorCard title={config.lineSectionTitle}>
        <LineItemTable
          variant={config.lineVariant}
          lines={detail.lines}
          rowKeyPrefix={config.rowKey(detail)}
          editorOptions={config.lineEditorOptions}
          summary={{
            quantity: { label: config.summary.quantityLabel, value: totalQuantity },
            amount: { label: config.summary.amountLabel, value: totalAmount, format: 'amount', prefix: '¥ ', emphasis: true },
          }}
        />
      </EditorCard>

      {config.statusFields ? (
        <EditorCard title={config.statusSectionTitle}>
          <DetailFieldGrid fields={config.statusFields({ row, detail, status, totalAmount })} />
        </EditorCard>
      ) : null}
    </DocumentDetailFrame>
  );
}
