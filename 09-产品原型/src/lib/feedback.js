import { toast } from 'sonner';

const defaultOptions = { duration: 1600 };

/**
 * 统一反馈入口。底层使用 Sonner，业务层只调 feedback.* 即可。
 *
 * feedback.message('已保存')
 * feedback.success('审核成功')
 * feedback.error('操作失败')
 * feedback.warning('请先选择数据')
 * feedback.info('该功能即将上线')
 * feedback.loading('提交中...') / feedback.dismiss(id)
 * feedback.promise(save(), { loading: '保存中', success: '已保存', error: '保存失败' })
 */
export const feedback = {
  message(text, options) {
    return toast(text, { ...defaultOptions, ...options });
  },

  success(text, options) {
    return toast.success(text, { ...defaultOptions, ...options });
  },

  error(text, options) {
    return toast.error(text, { ...defaultOptions, ...options });
  },

  warning(text, options) {
    return toast.warning(text, { ...defaultOptions, ...options });
  },

  info(text, options) {
    return toast.info(text, { ...defaultOptions, ...options });
  },

  loading(text, options) {
    return toast.loading(text, options);
  },

  promise(promise, messages, options) {
    return toast.promise(promise, messages, options);
  },

  dismiss(id) {
    toast.dismiss(id);
  },
};
