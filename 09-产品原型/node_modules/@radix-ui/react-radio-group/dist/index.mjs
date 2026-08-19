"use client";
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/radio-group.tsx
import * as React2 from "react";
import { composeEventHandlers as composeEventHandlers2 } from "@radix-ui/primitive";
import { useComposedRefs as useComposedRefs2 } from "@radix-ui/react-compose-refs";
import { createContextScope as createContextScope2 } from "@radix-ui/react-context";
import { Primitive as Primitive2 } from "@radix-ui/react-primitive";
import * as RovingFocusGroup from "@radix-ui/react-roving-focus";
import { createRovingFocusGroupScope } from "@radix-ui/react-roving-focus";
import { useControllableState } from "@radix-ui/react-use-controllable-state";
import { useDirection } from "@radix-ui/react-direction";

// src/radio.tsx
import * as React from "react";
import { composeEventHandlers } from "@radix-ui/primitive";
import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { createContextScope } from "@radix-ui/react-context";
import { useSize } from "@radix-ui/react-use-size";
import { Presence } from "@radix-ui/react-presence";
import { Primitive } from "@radix-ui/react-primitive";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
var RADIO_NAME = "Radio";
var [createRadioContext, createRadioScope] = createContextScope(RADIO_NAME);
var [RadioProviderImpl, useRadioContext] = createRadioContext(RADIO_NAME);
function RadioProvider(props) {
  const {
    __scopeRadio,
    checked = false,
    children,
    disabled,
    form,
    name,
    onCheck,
    required,
    value = "on",
    // @ts-expect-error
    internal_do_not_use_render
  } = props;
  const [control, setControl] = React.useState(null);
  const [bubbleInput, setBubbleInput] = React.useState(null);
  const hasConsumerStoppedPropagationRef = React.useRef(false);
  const [userInteractionCount, onUserInteraction] = React.useReducer(
    (count) => count + 1,
    0
  );
  const isFormControl = control ? !!form || !!control.closest("form") : (
    // We set this to true by default so that events bubble to forms without JS (SSR)
    true
  );
  const context = {
    checked,
    disabled,
    required,
    name,
    form,
    value,
    control,
    setControl,
    hasConsumerStoppedPropagationRef,
    userInteractionCount,
    onUserInteraction,
    isFormControl,
    bubbleInput,
    setBubbleInput,
    onCheck: /* @__PURE__ */ __name(() => onCheck?.(), "onCheck")
  };
  return /* @__PURE__ */ jsx(RadioProviderImpl, { scope: __scopeRadio, ...context, children: isFunction(internal_do_not_use_render) ? internal_do_not_use_render(context) : children });
}
__name(RadioProvider, "RadioProvider");
var TRIGGER_NAME = "RadioTrigger";
var RadioTrigger = /* @__PURE__ */ React.forwardRef(
  /* @__PURE__ */ __name(function RadioTrigger2({ __scopeRadio, onClick, ...radioProps }, forwardedRef) {
    const {
      checked,
      disabled,
      value,
      setControl,
      onCheck,
      hasConsumerStoppedPropagationRef,
      onUserInteraction,
      isFormControl,
      bubbleInput
    } = useRadioContext(TRIGGER_NAME, __scopeRadio);
    const composedRefs = useComposedRefs(forwardedRef, setControl);
    return /* @__PURE__ */ jsx(
      Primitive.button,
      {
        type: "button",
        role: "radio",
        "aria-checked": checked,
        "data-state": getState(checked),
        "data-disabled": disabled ? "" : void 0,
        disabled,
        value,
        ...radioProps,
        ref: composedRefs,
        onClick: composeEventHandlers(onClick, (event) => {
          if (!checked) {
            onUserInteraction();
            onCheck();
          }
          if (bubbleInput && isFormControl) {
            hasConsumerStoppedPropagationRef.current = event.isPropagationStopped();
            if (!hasConsumerStoppedPropagationRef.current) event.stopPropagation();
          }
        })
      }
    );
  }, "RadioTrigger")
);
var INDICATOR_NAME = "RadioIndicator";
var RadioIndicator = /* @__PURE__ */ React.forwardRef(
  /* @__PURE__ */ __name(function RadioIndicator2(props, forwardedRef) {
    const { __scopeRadio, forceMount, ...indicatorProps } = props;
    const context = useRadioContext(INDICATOR_NAME, __scopeRadio);
    return /* @__PURE__ */ jsx(Presence, { present: forceMount || context.checked, children: /* @__PURE__ */ jsx(
      Primitive.span,
      {
        "data-state": getState(context.checked),
        "data-disabled": context.disabled ? "" : void 0,
        ...indicatorProps,
        ref: forwardedRef
      }
    ) });
  }, "RadioIndicator")
);
var BUBBLE_INPUT_NAME = "RadioBubbleInput";
var RadioBubbleInput = /* @__PURE__ */ React.forwardRef(
  /* @__PURE__ */ __name(function RadioBubbleInput2({ __scopeRadio, onClick, ...props }, forwardedRef) {
    const {
      control,
      checked,
      required,
      disabled,
      name,
      value,
      form,
      bubbleInput,
      setBubbleInput,
      hasConsumerStoppedPropagationRef,
      userInteractionCount
    } = useRadioContext(BUBBLE_INPUT_NAME, __scopeRadio);
    const composedRefs = useComposedRefs(forwardedRef, setBubbleInput);
    const controlSize = useSize(control);
    const shouldStopClickPropagationRef = React.useRef(false);
    const prevCheckedRef = React.useRef(checked);
    const prevUserInteractionCountRef = React.useRef(userInteractionCount);
    React.useEffect(() => {
      const input = bubbleInput;
      if (!input) return;
      const inputProto = window.HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(
        inputProto,
        "checked"
      );
      const setChecked = descriptor.set;
      const isUserInteraction = userInteractionCount !== prevUserInteractionCountRef.current;
      prevUserInteractionCountRef.current = userInteractionCount;
      const checkedChanged = prevCheckedRef.current !== checked;
      prevCheckedRef.current = checked;
      const bubbles = !(isUserInteraction && hasConsumerStoppedPropagationRef.current);
      if (checkedChanged && setChecked) {
        shouldStopClickPropagationRef.current = !isUserInteraction;
        const event = new Event("click", { bubbles });
        setChecked.call(input, checked);
        input.dispatchEvent(event);
        shouldStopClickPropagationRef.current = false;
      }
    }, [bubbleInput, checked, hasConsumerStoppedPropagationRef, userInteractionCount]);
    const defaultCheckedRef = React.useRef(checked);
    return /* @__PURE__ */ jsx(
      Primitive.input,
      {
        type: "radio",
        "aria-hidden": true,
        defaultChecked: defaultCheckedRef.current,
        required,
        disabled,
        name,
        value,
        form,
        ...props,
        tabIndex: -1,
        ref: composedRefs,
        onClick: composeEventHandlers(onClick, (event) => {
          if (shouldStopClickPropagationRef.current) {
            event.stopPropagation();
          }
        }),
        style: {
          ...props.style,
          ...controlSize,
          position: "absolute",
          pointerEvents: "none",
          opacity: 0,
          margin: 0,
          // We transform because the input is absolutely positioned but we have
          // rendered it **after** the button. This pulls it back to sit on top
          // of the button.
          transform: "translateX(-100%)"
        }
      }
    );
  }, "RadioBubbleInput")
);
function isFunction(value) {
  return typeof value === "function";
}
__name(isFunction, "isFunction");
function getState(checked) {
  return checked ? "checked" : "unchecked";
}
__name(getState, "getState");

// src/radio-group.tsx
import { Fragment as Fragment2, jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var ARROW_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
var RADIO_GROUP_NAME = "RadioGroup";
var [createRadioGroupContext, createRadioGroupScope] = createContextScope2(RADIO_GROUP_NAME, [
  createRovingFocusGroupScope,
  createRadioScope
]);
var useRovingFocusGroupScope = createRovingFocusGroupScope();
var useRadioScope = createRadioScope();
var [RadioGroupProvider, useRadioGroupContext] = createRadioGroupContext(RADIO_GROUP_NAME);
var RadioGroup = /* @__PURE__ */ React2.forwardRef(
  /* @__PURE__ */ __name(function RadioGroup2(props, forwardedRef) {
    const {
      __scopeRadioGroup,
      name,
      form,
      defaultValue,
      value: valueProp,
      required = false,
      disabled = false,
      orientation,
      dir,
      loop = true,
      onValueChange,
      ...groupProps
    } = props;
    const rovingFocusGroupScope = useRovingFocusGroupScope(__scopeRadioGroup);
    const direction = useDirection(dir);
    const [value, setValue] = useControllableState({
      prop: valueProp,
      defaultProp: defaultValue ?? null,
      onChange: onValueChange,
      caller: RADIO_GROUP_NAME
    });
    const [control, setControl] = React2.useState(null);
    const composedRefs = useComposedRefs2(forwardedRef, setControl);
    const initialValueRef = React2.useRef(value);
    React2.useEffect(() => {
      const associatedForm = form ? control?.ownerDocument.getElementById(form) : control?.closest("form");
      if (associatedForm instanceof HTMLFormElement) {
        const reset = /* @__PURE__ */ __name(() => setValue(initialValueRef.current), "reset");
        associatedForm.addEventListener("reset", reset);
        return () => associatedForm.removeEventListener("reset", reset);
      }
    }, [control, form, setValue]);
    return /* @__PURE__ */ jsx2(
      RadioGroupProvider,
      {
        scope: __scopeRadioGroup,
        name,
        form,
        required,
        disabled,
        value,
        onValueChange: setValue,
        children: /* @__PURE__ */ jsx2(
          RovingFocusGroup.Root,
          {
            asChild: true,
            ...rovingFocusGroupScope,
            orientation,
            dir: direction,
            loop,
            children: /* @__PURE__ */ jsx2(
              Primitive2.div,
              {
                role: "radiogroup",
                "aria-required": required,
                "aria-orientation": orientation,
                "data-disabled": disabled ? "" : void 0,
                dir: direction,
                ...groupProps,
                ref: composedRefs
              }
            )
          }
        )
      }
    );
  }, "RadioGroup")
);
var ITEM_PROVIDER_NAME = "RadioGroupItemProvider";
var ITEM_TRIGGER_NAME = "RadioGroupItemTrigger";
function RadioGroupItemProvider(props) {
  const {
    __scopeRadioGroup,
    value,
    disabled,
    children,
    // @ts-expect-error
    internal_do_not_use_render
  } = props;
  const context = useRadioGroupContext(ITEM_PROVIDER_NAME, __scopeRadioGroup);
  const radioScope = useRadioScope(__scopeRadioGroup);
  const isDisabled = context.disabled || disabled;
  return /* @__PURE__ */ jsx2(
    RadioProvider,
    {
      ...radioScope,
      checked: context.value === value,
      disabled: isDisabled,
      required: context.required,
      name: context.name,
      form: context.form,
      value,
      onCheck: () => context.onValueChange(value),
      internal_do_not_use_render,
      children
    }
  );
}
__name(RadioGroupItemProvider, "RadioGroupItemProvider");
var RadioGroupItemTrigger = /* @__PURE__ */ React2.forwardRef(/* @__PURE__ */ __name(function RadioGroupItemTrigger2(props, forwardedRef) {
  const { __scopeRadioGroup, ...triggerProps } = props;
  const rovingFocusGroupScope = useRovingFocusGroupScope(__scopeRadioGroup);
  const radioScope = useRadioScope(__scopeRadioGroup);
  const { checked, disabled } = useRadioContext(ITEM_TRIGGER_NAME, radioScope.__scopeRadio);
  const ref = React2.useRef(null);
  const composedRefs = useComposedRefs2(forwardedRef, ref);
  const isArrowKeyPressedRef = React2.useRef(false);
  React2.useEffect(() => {
    const handleKeyDown = /* @__PURE__ */ __name((event) => {
      if (ARROW_KEYS.includes(event.key)) {
        isArrowKeyPressedRef.current = true;
      }
    }, "handleKeyDown");
    const handleKeyUp = /* @__PURE__ */ __name(() => isArrowKeyPressedRef.current = false, "handleKeyUp");
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);
  return /* @__PURE__ */ jsx2(
    RovingFocusGroup.Item,
    {
      asChild: true,
      ...rovingFocusGroupScope,
      focusable: !disabled,
      active: checked,
      children: /* @__PURE__ */ jsx2(
        RadioTrigger,
        {
          ...radioScope,
          ...triggerProps,
          ref: composedRefs,
          onKeyDown: composeEventHandlers2(triggerProps.onKeyDown, (event) => {
            if (event.key === "Enter") event.preventDefault();
          }),
          onFocus: composeEventHandlers2(triggerProps.onFocus, () => {
            if (isArrowKeyPressedRef.current) {
              ref.current?.click();
            }
          })
        }
      )
    }
  );
}, "RadioGroupItemTrigger"));
var RadioGroupItem = /* @__PURE__ */ React2.forwardRef(
  /* @__PURE__ */ __name(function RadioGroupItem2(props, forwardedRef) {
    const { __scopeRadioGroup, value, disabled, ...itemProps } = props;
    return /* @__PURE__ */ jsx2(
      RadioGroupItemProvider,
      {
        __scopeRadioGroup,
        value,
        disabled,
        internal_do_not_use_render: ({ isFormControl }) => /* @__PURE__ */ jsxs2(Fragment2, { children: [
          /* @__PURE__ */ jsx2(
            RadioGroupItemTrigger,
            {
              ...itemProps,
              ref: forwardedRef,
              __scopeRadioGroup
            }
          ),
          isFormControl && /* @__PURE__ */ jsx2(
            RadioGroupItemBubbleInput,
            {
              __scopeRadioGroup
            }
          )
        ] })
      }
    );
  }, "RadioGroupItem")
);
var RadioGroupItemBubbleInput = /* @__PURE__ */ React2.forwardRef(/* @__PURE__ */ __name(function RadioGroupItemBubbleInput2(props, forwardedRef) {
  const { __scopeRadioGroup, ...bubbleProps } = props;
  const radioScope = useRadioScope(__scopeRadioGroup);
  return /* @__PURE__ */ jsx2(RadioBubbleInput, { ...radioScope, ...bubbleProps, ref: forwardedRef });
}, "RadioGroupItemBubbleInput"));
var RadioGroupIndicator = /* @__PURE__ */ React2.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ __name(function RadioGroupIndicator2(props, forwardedRef) {
    const { __scopeRadioGroup, ...indicatorProps } = props;
    const radioScope = useRadioScope(__scopeRadioGroup);
    return /* @__PURE__ */ jsx2(RadioIndicator, { ...radioScope, ...indicatorProps, ref: forwardedRef });
  }, "RadioGroupIndicator")
);
export {
  RadioGroupIndicator as Indicator,
  RadioGroupItem as Item,
  RadioGroup,
  RadioGroupIndicator,
  RadioGroupItem,
  RadioGroup as Root,
  createRadioGroupScope,
  RadioGroupItemBubbleInput as unstable_ItemBubbleInput,
  RadioGroupItemProvider as unstable_ItemProvider,
  RadioGroupItemTrigger as unstable_ItemTrigger,
  RadioGroupItemBubbleInput as unstable_RadioGroupItemBubbleInput,
  RadioGroupItemProvider as unstable_RadioGroupItemProvider,
  RadioGroupItemTrigger as unstable_RadioGroupItemTrigger
};
//# sourceMappingURL=index.mjs.map
