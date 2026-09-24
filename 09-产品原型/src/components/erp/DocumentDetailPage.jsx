import { useMemo } from 'react';
import { DetailField, DocumentDetailFrame, EditorCard } from './DocumentDetailFrame.jsx';
import { DocumentMetaTabsCard } from './DocumentMetaTabsCard.jsx';
import { LineItemTable } from './LineItemTable.jsx';
import { erpFieldGridClassName } from '../../styles/typography.js';
import { computeLinesTotals } from '../../lib/format.js';
import { currencySymbol } from '../../lib/money.js';

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
  const lineTotals = computeLinesTotals(detail.lines);
  const totalQuantity = lineTotals.quantity;
  const totalAmount = lineTotals.grossAmount;
  const status = config.getStatus?.(row, detail);
  const statuses = config.getStatusBadges?.(row, detail) ?? (status ? [{ label: status }] : []);
  const sectionContext = { row, detail, status, totalAmount, onOpenPage };
  const sections = config.sections || [{ title: config.infoSectionTitle, fields: config.infoFields }];
  const headerActions = config.renderHeaderActions?.({ row, detail, onOpenPage }) ?? null;

  return (
    <DocumentDetailFrame
      title={config.title(detail)}
      statuses={statuses}
      headerActions={headerActions}
      onBack={() => onOpenPage?.(config.listPageId)}
      onEdit={config.canEdit?.(row) ? () => onOpenPage?.(config.editPageId, { row }) : undefined}
      editLabel={config.editLabel}
    >
      {sections.map((section) => {
        if (section.visibleWhen && !section.visibleWhen(sectionContext)) return null;
        const fields = typeof section.fields === 'function' ? section.fields(sectionContext) : section.fields;
        if (!fields?.length) return null;

        return (
          <EditorCard key={section.title} title={section.title}>
            <DetailFieldGrid fields={fields} />
          </EditorCard>
        );
      })}

      <EditorCard title={config.lineSectionTitle}>
        <LineItemTable
          variant={config.lineVariant}
          lines={detail.lines}
          rowKeyPrefix={config.rowKey(detail)}
          editorOptions={config.lineEditorOptions}
          summary={config.buildLineSummary
            ? config.buildLineSummary({
              detail,
              row,
              totalQuantity,
              totalAmount,
              lineTotals,
              currency: detail[config.currencyKey || 'currency'] || row.currency,
            })
            : {
              quantity: { label: config.summary.quantityLabel, value: totalQuantity },
              amount: { label: config.summary.amountLabel, value: totalAmount, format: 'amount', prefix: `${currencySymbol(detail[config.currencyKey || 'currency'] || row.currency)} `, emphasis: true },
            }}
        />
      </EditorCard>

      {config.renderAfterLines?.(sectionContext)}

      {(config.extraSections || []).map((section) => {
        if (section.visibleWhen && !section.visibleWhen(sectionContext)) return null;

        if (section.variant === 'meta-tabs') {
          const tabs = typeof section.tabs === 'function' ? section.tabs(sectionContext) : section.tabs;
          if (!tabs?.length) return null;
          return (
            <DocumentMetaTabsCard
              key={section.title}
              title={section.title}
              tabs={tabs}
              context={sectionContext}
              defaultTab={section.defaultTab}
            />
          );
        }

        const fields = typeof section.fields === 'function' ? section.fields(sectionContext) : section.fields;
        if (!fields?.length) return null;

        return (
          <EditorCard key={section.title} title={section.title}>
            <DetailFieldGrid fields={fields} />
          </EditorCard>
        );
      })}

      {config.statusFields ? (
        <EditorCard title={config.statusSectionTitle}>
          <DetailFieldGrid fields={config.statusFields(sectionContext)} />
        </EditorCard>
      ) : null}
    </DocumentDetailFrame>
  );
}
