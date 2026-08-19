"use client";
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/context-menu.tsx
import * as React from "react";
import { IS_DEVELOPMENT } from "@radix-ui/primitive/is-development";
import { composeEventHandlers } from "@radix-ui/primitive";
import { createContextScope } from "@radix-ui/react-context";
import { Primitive } from "@radix-ui/react-primitive";
import * as MenuPrimitive from "@radix-ui/react-menu";
import { createMenuScope } from "@radix-ui/react-menu";
import { useControllableState } from "@radix-ui/react-use-controllable-state";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
var CONTEXT_MENU_NAME = "ContextMenu";
var [createContextMenuContext, createContextMenuScope] = createContextScope(CONTEXT_MENU_NAME, [
  createMenuScope
]);
var useMenuScope = createMenuScope();
var [ContextMenuProvider, useContextMenuContext] = createContextMenuContext(CONTEXT_MENU_NAME);
var ContextMenu = /* @__PURE__ */ __name((props) => {
  const { __scopeContextMenu, children, onOpenChange, open: openProp, dir, modal = true } = props;
  const hasInteractedRef = React.useRef(false);
  if (IS_DEVELOPMENT) {
    const hasWarnedRef = React.useRef(false);
    React.useEffect(() => {
      if (openProp === true && !hasInteractedRef.current && !hasWarnedRef.current) {
        hasWarnedRef.current = true;
        console.warn(
          "ContextMenu: The `open` prop has been set to `true` before the user has interacted with the trigger, so its position is indeterminate. This is likely unintended and will result in the menu being anchored to the top-left corner of the viewport."
        );
      }
    }, [openProp]);
  }
  const [open, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: false,
    onChange: onOpenChange,
    caller: CONTEXT_MENU_NAME
  });
  const menuScope = useMenuScope(__scopeContextMenu);
  return /* @__PURE__ */ jsx(
    ContextMenuProvider,
    {
      scope: __scopeContextMenu,
      open,
      onOpenChange: setOpen,
      modal,
      hasInteractedRef,
      children: /* @__PURE__ */ jsx(MenuPrimitive.Root, { ...menuScope, dir, open, onOpenChange: setOpen, modal, children })
    }
  );
}, "ContextMenu");
var TRIGGER_NAME = "ContextMenuTrigger";
var ContextMenuTrigger = /* @__PURE__ */ React.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ __name(function ContextMenuTrigger2(props, forwardedRef) {
    const { __scopeContextMenu, disabled = false, ...triggerProps } = props;
    const context = useContextMenuContext(TRIGGER_NAME, __scopeContextMenu);
    const menuScope = useMenuScope(__scopeContextMenu);
    const [point, setPoint] = React.useState({ x: 0, y: 0 });
    const virtualRef = React.useMemo(
      () => ({
        current: {
          getBoundingClientRect: /* @__PURE__ */ __name(() => DOMRect.fromRect({ width: 0, height: 0, ...point }), "getBoundingClientRect")
        }
      }),
      [point]
    );
    const longPressTimerRef = React.useRef(0);
    const clearLongPress = React.useCallback(
      () => window.clearTimeout(longPressTimerRef.current),
      []
    );
    const handleOpen = /* @__PURE__ */ __name((event) => {
      context.hasInteractedRef.current = true;
      setPoint({ x: event.clientX, y: event.clientY });
      context.onOpenChange(true);
    }, "handleOpen");
    React.useEffect(() => clearLongPress, [clearLongPress]);
    React.useEffect(() => void (disabled && clearLongPress()), [disabled, clearLongPress]);
    return /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(MenuPrimitive.Anchor, { ...menuScope, virtualRef }),
      /* @__PURE__ */ jsx(
        Primitive.span,
        {
          "data-state": context.open ? "open" : "closed",
          "data-disabled": disabled ? "" : void 0,
          ...triggerProps,
          ref: forwardedRef,
          style: { WebkitTouchCallout: "none", ...props.style },
          onContextMenu: disabled ? props.onContextMenu : composeEventHandlers(props.onContextMenu, (event) => {
            clearLongPress();
            handleOpen(event);
            event.preventDefault();
          }),
          onPointerDown: disabled ? props.onPointerDown : composeEventHandlers(
            props.onPointerDown,
            whenTouchOrPen((event) => {
              clearLongPress();
              if (context.open) {
                context.onOpenChange(false);
              }
              longPressTimerRef.current = window.setTimeout(() => handleOpen(event), 700);
            })
          ),
          onPointerMove: disabled ? props.onPointerMove : composeEventHandlers(props.onPointerMove, whenTouchOrPen(clearLongPress)),
          onPointerCancel: disabled ? props.onPointerCancel : composeEventHandlers(props.onPointerCancel, whenTouchOrPen(clearLongPress)),
          onPointerUp: disabled ? props.onPointerUp : composeEventHandlers(props.onPointerUp, whenTouchOrPen(clearLongPress))
        }
      )
    ] });
  }, "ContextMenuTrigger")
);
var ContextMenuPortal = /* @__PURE__ */ __name((props) => {
  const { __scopeContextMenu, ...portalProps } = props;
  const menuScope = useMenuScope(__scopeContextMenu);
  return /* @__PURE__ */ jsx(MenuPrimitive.Portal, { ...menuScope, ...portalProps });
}, "ContextMenuPortal");
var CONTENT_NAME = "ContextMenuContent";
var ContextMenuContent = /* @__PURE__ */ React.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ __name(function ContextMenuContent2(props, forwardedRef) {
    const { __scopeContextMenu, ...contentProps } = props;
    const context = useContextMenuContext(CONTENT_NAME, __scopeContextMenu);
    const menuScope = useMenuScope(__scopeContextMenu);
    const hasInteractedOutsideRef = React.useRef(false);
    return /* @__PURE__ */ jsx(
      MenuPrimitive.Content,
      {
        ...menuScope,
        ...contentProps,
        ref: forwardedRef,
        side: "right",
        sideOffset: 2,
        align: "start",
        onCloseAutoFocus: (event) => {
          props.onCloseAutoFocus?.(event);
          if (!event.defaultPrevented && hasInteractedOutsideRef.current) {
            event.preventDefault();
          }
          hasInteractedOutsideRef.current = false;
        },
        onInteractOutside: (event) => {
          props.onInteractOutside?.(event);
          if (!event.defaultPrevented && !context.modal) hasInteractedOutsideRef.current = true;
        },
        style: {
          ...props.style,
          // re-namespace exposed content custom properties
          ...{
            "--radix-context-menu-content-transform-origin": "var(--radix-popper-transform-origin)",
            "--radix-context-menu-content-available-width": "var(--radix-popper-available-width)",
            "--radix-context-menu-content-available-height": "var(--radix-popper-available-height)",
            "--radix-context-menu-trigger-width": "var(--radix-popper-anchor-width)",
            "--radix-context-menu-trigger-height": "var(--radix-popper-anchor-height)"
          }
        }
      }
    );
  }, "ContextMenuContent")
);
var ContextMenuGroup = /* @__PURE__ */ React.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ __name(function ContextMenuGroup2(props, forwardedRef) {
    const { __scopeContextMenu, ...groupProps } = props;
    const menuScope = useMenuScope(__scopeContextMenu);
    return /* @__PURE__ */ jsx(MenuPrimitive.Group, { ...menuScope, ...groupProps, ref: forwardedRef });
  }, "ContextMenuGroup")
);
var ContextMenuLabel = /* @__PURE__ */ React.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ __name(function ContextMenuLabel2(props, forwardedRef) {
    const { __scopeContextMenu, ...labelProps } = props;
    const menuScope = useMenuScope(__scopeContextMenu);
    return /* @__PURE__ */ jsx(MenuPrimitive.Label, { ...menuScope, ...labelProps, ref: forwardedRef });
  }, "ContextMenuLabel")
);
var ContextMenuItem = /* @__PURE__ */ React.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ __name(function ContextMenuItem2(props, forwardedRef) {
    const { __scopeContextMenu, ...itemProps } = props;
    const menuScope = useMenuScope(__scopeContextMenu);
    return /* @__PURE__ */ jsx(MenuPrimitive.Item, { ...menuScope, ...itemProps, ref: forwardedRef });
  }, "ContextMenuItem")
);
var ContextMenuCheckboxItem = /* @__PURE__ */ React.forwardRef(/* @__PURE__ */ __name(function ContextMenuCheckboxItem2(props, forwardedRef) {
  const { __scopeContextMenu, ...checkboxItemProps } = props;
  const menuScope = useMenuScope(__scopeContextMenu);
  return /* @__PURE__ */ jsx(MenuPrimitive.CheckboxItem, { ...menuScope, ...checkboxItemProps, ref: forwardedRef });
}, "ContextMenuCheckboxItem"));
var ContextMenuRadioGroup = /* @__PURE__ */ React.forwardRef(/* @__PURE__ */ __name(function ContextMenuRadioGroup2(props, forwardedRef) {
  const { __scopeContextMenu, ...radioGroupProps } = props;
  const menuScope = useMenuScope(__scopeContextMenu);
  return /* @__PURE__ */ jsx(MenuPrimitive.RadioGroup, { ...menuScope, ...radioGroupProps, ref: forwardedRef });
}, "ContextMenuRadioGroup"));
var ContextMenuRadioItem = /* @__PURE__ */ React.forwardRef(/* @__PURE__ */ __name(function ContextMenuRadioItem2(props, forwardedRef) {
  const { __scopeContextMenu, ...radioItemProps } = props;
  const menuScope = useMenuScope(__scopeContextMenu);
  return /* @__PURE__ */ jsx(MenuPrimitive.RadioItem, { ...menuScope, ...radioItemProps, ref: forwardedRef });
}, "ContextMenuRadioItem"));
var ContextMenuItemIndicator = /* @__PURE__ */ React.forwardRef(/* @__PURE__ */ __name(function ContextMenuItemIndicator2(props, forwardedRef) {
  const { __scopeContextMenu, ...itemIndicatorProps } = props;
  const menuScope = useMenuScope(__scopeContextMenu);
  return /* @__PURE__ */ jsx(MenuPrimitive.ItemIndicator, { ...menuScope, ...itemIndicatorProps, ref: forwardedRef });
}, "ContextMenuItemIndicator"));
var ContextMenuSeparator = /* @__PURE__ */ React.forwardRef(/* @__PURE__ */ __name(function ContextMenuSeparator2(props, forwardedRef) {
  const { __scopeContextMenu, ...separatorProps } = props;
  const menuScope = useMenuScope(__scopeContextMenu);
  return /* @__PURE__ */ jsx(MenuPrimitive.Separator, { ...menuScope, ...separatorProps, ref: forwardedRef });
}, "ContextMenuSeparator"));
var ContextMenuArrow = /* @__PURE__ */ React.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ __name(function ContextMenuArrow2(props, forwardedRef) {
    const { __scopeContextMenu, ...arrowProps } = props;
    const menuScope = useMenuScope(__scopeContextMenu);
    return /* @__PURE__ */ jsx(MenuPrimitive.Arrow, { ...menuScope, ...arrowProps, ref: forwardedRef });
  }, "ContextMenuArrow")
);
var SUB_NAME = "ContextMenuSub";
var ContextMenuSub = /* @__PURE__ */ __name((props) => {
  const { __scopeContextMenu, children, onOpenChange, open: openProp, defaultOpen } = props;
  const menuScope = useMenuScope(__scopeContextMenu);
  const [open, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen ?? false,
    onChange: onOpenChange,
    caller: SUB_NAME
  });
  return /* @__PURE__ */ jsx(MenuPrimitive.Sub, { ...menuScope, open, onOpenChange: setOpen, children });
}, "ContextMenuSub");
var ContextMenuSubTrigger = /* @__PURE__ */ React.forwardRef(/* @__PURE__ */ __name(function ContextMenuSubTrigger2(props, forwardedRef) {
  const { __scopeContextMenu, ...triggerItemProps } = props;
  const menuScope = useMenuScope(__scopeContextMenu);
  return /* @__PURE__ */ jsx(MenuPrimitive.SubTrigger, { ...menuScope, ...triggerItemProps, ref: forwardedRef });
}, "ContextMenuSubTrigger"));
var ContextMenuSubContent = /* @__PURE__ */ React.forwardRef(/* @__PURE__ */ __name(function ContextMenuSubContent2(props, forwardedRef) {
  const { __scopeContextMenu, ...subContentProps } = props;
  const menuScope = useMenuScope(__scopeContextMenu);
  return /* @__PURE__ */ jsx(
    MenuPrimitive.SubContent,
    {
      ...menuScope,
      ...subContentProps,
      ref: forwardedRef,
      style: {
        ...props.style,
        // re-namespace exposed content custom properties
        ...{
          "--radix-context-menu-content-transform-origin": "var(--radix-popper-transform-origin)",
          "--radix-context-menu-content-available-width": "var(--radix-popper-available-width)",
          "--radix-context-menu-content-available-height": "var(--radix-popper-available-height)",
          "--radix-context-menu-trigger-width": "var(--radix-popper-anchor-width)",
          "--radix-context-menu-trigger-height": "var(--radix-popper-anchor-height)"
        }
      }
    }
  );
}, "ContextMenuSubContent"));
function whenTouchOrPen(handler) {
  return (event) => event.pointerType !== "mouse" ? handler(event) : void 0;
}
__name(whenTouchOrPen, "whenTouchOrPen");
var Root2 = ContextMenu;
var Trigger = ContextMenuTrigger;
var Portal2 = ContextMenuPortal;
var Content2 = ContextMenuContent;
var Group2 = ContextMenuGroup;
var Label2 = ContextMenuLabel;
var Item2 = ContextMenuItem;
var CheckboxItem2 = ContextMenuCheckboxItem;
var RadioGroup2 = ContextMenuRadioGroup;
var RadioItem2 = ContextMenuRadioItem;
var ItemIndicator2 = ContextMenuItemIndicator;
var Separator2 = ContextMenuSeparator;
var Arrow2 = ContextMenuArrow;
var Sub2 = ContextMenuSub;
var SubTrigger2 = ContextMenuSubTrigger;
var SubContent2 = ContextMenuSubContent;
export {
  Arrow2 as Arrow,
  CheckboxItem2 as CheckboxItem,
  Content2 as Content,
  ContextMenu,
  ContextMenuArrow,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuItemIndicator,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  Group2 as Group,
  Item2 as Item,
  ItemIndicator2 as ItemIndicator,
  Label2 as Label,
  Portal2 as Portal,
  RadioGroup2 as RadioGroup,
  RadioItem2 as RadioItem,
  Root2 as Root,
  Separator2 as Separator,
  Sub2 as Sub,
  SubContent2 as SubContent,
  SubTrigger2 as SubTrigger,
  Trigger,
  createContextMenuScope
};
//# sourceMappingURL=index.mjs.map
