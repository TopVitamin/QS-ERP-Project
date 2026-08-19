import { ChevronDown, Settings } from 'lucide-react';
import { Fragment, useState } from 'react';
import { Button } from '../ui/button.jsx';
import { ConfirmDialog } from '../ui/alert-dialog.jsx';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu.jsx';
import { Switch } from '../ui/switch.jsx';

export function BulkActionBar({ selectedCount, actions = [], onAction, switchConfig, columnOptions = [], columnVisibility = {}, onColumnVisibilityChange }) {
  return (
    <div className="flex h-12 shrink-0 items-center justify-between overflow-hidden bg-erp-surface-panel px-4 text-[14px] text-erp-text">
      <div className="no-scrollbar flex min-w-0 items-center overflow-x-auto">
        <span className="mr-1 shrink-0 text-erp-text-muted">已选中<span className="text-erp-primary">{selectedCount}</span>条</span>
        {actions.map((action, index) => (
          <Fragment key={action.id}>
            {index > 0 && <ToolbarDivider />}
            <BulkAction action={action} selectedCount={selectedCount} onAction={onAction} />
          </Fragment>
        ))}
      </div>
      <div className="ml-3 flex shrink-0 items-center gap-3 pl-3">
        {switchConfig && (
          <div className="flex items-center gap-2 text-[12px] text-erp-text">
            <label htmlFor={switchConfig.id || 'whole-order-switch'} className="cursor-pointer">{switchConfig.label}</label>
            <Switch
              id={switchConfig.id || 'whole-order-switch'}
              checked={switchConfig.checked}
              onCheckedChange={switchConfig.onCheckedChange}
              aria-label={switchConfig.label}
            />
          </div>
        )}
        {columnOptions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-erp-text-subtle" aria-label="列设置" title="列设置">
                <Settings className="h-4 w-4" strokeWidth={1.8} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {columnOptions.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.key}
                  checked={Boolean(columnVisibility[option.key])}
                  onCheckedChange={(checked) => onColumnVisibilityChange?.(option.key, checked === true)}
                >
                  {option.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

function ToolbarDivider() {
  return <span className="mx-2 h-3.5 w-px shrink-0 bg-erp-border-light" aria-hidden="true" />;
}

function BulkAction({ action, selectedCount, onAction }) {
  const [pendingItem, setPendingItem] = useState(null);
  const disabled = action.disabled || (action.requiresSelection && selectedCount === 0);
  const Icon = action.icon;
  const trigger = (
    <Button variant={action.variant || 'ghost'} size="compact" disabled={disabled} className="gap-1 px-2">
      {Icon && <Icon className="h-[17px] w-[17px]" strokeWidth={2.1} />}
      <span>{action.label}</span>
      {action.menuItems && <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />}
    </Button>
  );

  function handleMenuSelect(item) {
    if (item.confirm) {
      setPendingItem(item);
      return;
    }
    onAction?.(item.id);
  }

  function handleConfirm() {
    const actionId = pendingItem?.id ?? action.id;
    onAction?.(actionId);
    setPendingItem(null);
  }

  if (action.confirm) {
    return (
      <>
        <ConfirmDialog
          trigger={trigger}
          title={action.confirm.title}
          description={action.confirm.description}
          confirmLabel={action.confirm.confirmLabel || '确认'}
          confirmVariant={action.confirm.confirmVariant || 'primary'}
          onConfirm={() => onAction?.(action.id)}
        />
      </>
    );
  }

  if (action.menuItems) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {action.menuItems.map((item) => (
              <DropdownMenuItem key={item.id} disabled={disabled} onSelect={() => handleMenuSelect(item)}>
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {pendingItem?.confirm && (
          <ConfirmDialog
            open
            onOpenChange={(open) => { if (!open) setPendingItem(null); }}
            title={pendingItem.confirm.title}
            description={pendingItem.confirm.description}
            confirmLabel={pendingItem.confirm.confirmLabel || '确认'}
            confirmVariant={pendingItem.confirm.confirmVariant || 'primary'}
            onConfirm={handleConfirm}
          />
        )}
      </>
    );
  }

  return (
    <Button
      variant={action.variant || 'ghost'}
      size="compact"
      disabled={disabled}
      className="gap-1 px-2"
      onClick={() => onAction?.(action.id)}
    >
      {Icon && <Icon className="h-[17px] w-[17px]" strokeWidth={2.1} />}
      <span>{action.label}</span>
    </Button>
  );
}
