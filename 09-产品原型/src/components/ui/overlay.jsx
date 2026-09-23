/** 弹窗/确认框通用遮罩：半透明压暗，不做 backdrop-blur */
export const overlayClassName = 'fixed inset-0 z-[130] bg-erp-overlay/35';

/** 下拉、Popover 等浮层须高于弹窗内容（z-[140]），否则弹窗内 Select 无法展开。 */
export const popoverLayerClassName = 'z-[150]';
