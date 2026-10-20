import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { LogisticsDeliveryRuleDialogs } from '../components/erp/LogisticsDeliveryRuleDialogs.jsx';
import { getProvinces } from '../lib/cnAddress.js';
import { readMockRows, subscribeMockRows, writeMockRows } from '../lib/mockStorage.js';
import {
  applyEnable,
  canDisable,
  canEnable,
  deliveryRuleToForm,
  DELIVERY_RULE_STORAGE_KEY,
  validateDeliveryRuleForSave,
} from '../lib/logisticsDeliveryRuleLogic.js';
import { PRODUCT_STORAGE_KEY, logisticsProducts } from '../data/logisticsData.js';
import {
  buildDeliveryRuleFilterFields,
  buildInitialVisibility,
  createDeliveryRuleColumns,
  deliveryRuleInitialFilters,
  deliveryRules,
  filterDeliveryRuleRows,
} from '../data/logisticsDeliveryRuleData.js';

function buildRowActions() {
  return [
    { id: 'edit', label: '编辑' },
    { id: 'disable', label: '禁用', variant: 'danger', visibleWhen: canDisable },
    { id: 'enable', label: '启用', visibleWhen: canEnable },
  ];
}

export function LogisticsDeliveryRuleListPage({ onFeedback }) {
  const [productRows, setProductRows] = useState(() => readMockRows(PRODUCT_STORAGE_KEY, logisticsProducts));
  const [ruleRows, setRuleRows] = useState(() => readMockRows(DELIVERY_RULE_STORAGE_KEY, deliveryRules));
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    setProductRows(readMockRows(PRODUCT_STORAGE_KEY, logisticsProducts));
    setRuleRows(readMockRows(DELIVERY_RULE_STORAGE_KEY, deliveryRules));
    const unsubProducts = subscribeMockRows(PRODUCT_STORAGE_KEY, setProductRows);
    const unsubRules = subscribeMockRows(DELIVERY_RULE_STORAGE_KEY, setRuleRows);
    return () => {
      unsubProducts();
      unsubRules();
    };
  }, []);

  const columns = useMemo(() => createDeliveryRuleColumns(productRows), [productRows]);
  const provinceOptions = useMemo(() => getProvinces(), []);
  const filterFields = useMemo(
    () => buildDeliveryRuleFilterFields(productRows, provinceOptions),
    [productRows, provinceOptions],
  );

  function upsertRule(row) {
    const current = readMockRows(DELIVERY_RULE_STORAGE_KEY, deliveryRules);
    const index = current.findIndex((item) => item.id === row.id);
    const nextRows = index < 0 ? [row, ...current] : current.map((item, i) => (i === index ? row : item));
    writeMockRows(DELIVERY_RULE_STORAGE_KEY, nextRows);
    setRuleRows(nextRows);
  }

  function openDialog(payload) {
    setDialog({ ...payload, products: productRows });
  }

  function handleDialogComplete(result) {
    if (!result) return;
    if (result.action === 'save-rule' && result.payload) {
      upsertRule(result.payload);
      onFeedback?.(result.message, result.type || 'success');
      return;
    }
    if (result.action === 'update-rule' && result.nextRow) {
      const check = validateDeliveryRuleForSave(
        {
          name: result.nextRow.name,
          senderProvinceCode: result.nextRow.senderProvinceCode,
          senderCityCode: result.nextRow.senderCityCode,
          receiverProvinceCode: result.nextRow.receiverProvinceCode,
          receiverCityCode: result.nextRow.receiverCityCode,
          logisticsProductId: result.nextRow.logisticsProductId,
          remark: result.nextRow.remark,
          useStatus: result.nextRow.useStatus,
        },
        ruleRows,
        productRows,
        result.nextRow.id,
      );
      if (check?.fieldErrors) {
        onFeedback?.('启用失败：与另一条启用规则的发件／收件省、市组合重复', 'warning');
        return;
      }
      upsertRule(result.nextRow);
      onFeedback?.(result.message, result.type || 'success');
    }
  }

  function handleCellClick(column, row) {
    if (column.key === 'name') {
      openDialog({ type: 'rule-form', mode: 'view', row });
    }
  }

  function handleRowAction(id, row) {
    if (id === 'edit') {
      openDialog({ type: 'rule-form', mode: 'edit', row, existingRows: ruleRows });
      return;
    }
    if (id === 'enable') {
      const nextRow = applyEnable(row);
      const check = validateDeliveryRuleForSave(
        { ...deliveryRuleToForm(nextRow), useStatus: 'enabled' },
        ruleRows,
        productRows,
        row.id,
      );
      if (check?.fieldErrors) {
        onFeedback?.('启用失败：与另一条启用规则的发件／收件省、市组合重复', 'warning');
        return;
      }
      upsertRule(nextRow);
      onFeedback?.('规则已启用', 'success');
      return;
    }
    if (id === 'disable') {
      openDialog({ type: 'disable-rule', row });
    }
  }

  const headerActions = [
    {
      id: 'create-rule',
      label: '新增',
      icon: Plus,
      variant: 'primary',
      onAction: () => openDialog({ type: 'rule-form', mode: 'create', existingRows: ruleRows }),
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-erp-surface">
      <DocumentListPage
        onFeedback={onFeedback}
        config={{
          title: '物流配送规则',
          rows: ruleRows,
          storageKey: DELIVERY_RULE_STORAGE_KEY,
          columns,
          initialFilters: deliveryRuleInitialFilters,
          filterFields,
          filterRows: filterDeliveryRuleRows,
          initialVisibility: buildInitialVisibility(columns),
          defaultSort: { key: 'updatedAt', direction: 'desc' },
          headerActions,
          onHeaderAction: (id) => {
            const action = headerActions.find((item) => item.id === id);
            action?.onAction?.();
          },
          queryMessage: '已执行物流配送规则查询',
          toolbarActions: [],
          columnOptions: columns.map((column) => ({ key: column.key, label: column.label })),
          emptyText: '暂无物流配送规则，点击「新增」开始维护',
          emptyTextFiltered: '没有符合条件的记录，请调整筛选条件',
          onCellClick: handleCellClick,
          onRowAction: handleRowAction,
          rowActions: buildRowActions(),
          rowActionsMaxVisible: 3,
        }}
      />
      <LogisticsDeliveryRuleDialogs
        dialog={dialog}
        products={productRows}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
      />
    </div>
  );
}
