import { Component } from 'react';
import { Button } from './ui/button.jsx';
import { clearAllMockData } from '../lib/mockStorage.js';

/**
 * 全局错误边界：渲染期异常（如旧版 localStorage 数据触发）不再白屏，
 * 提供「重置演示数据」自救入口。演示原型不接真实后端，错误基本来自本地数据。
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[强盛ERP演示] 页面渲染出错', error, info?.componentStack);
  }

  handleReset = () => {
    clearAllMockData();
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-erp-surface px-6 text-erp-text">
        <div className="text-[15px] font-semibold">页面显示出了问题</div>
        <p className="max-w-md text-center text-[12px] leading-5 text-erp-text-muted">
          页面渲染失败，可能是浏览器里残留的旧版演示数据与当前版本不兼容。可先刷新重试，或重置演示数据后重新进入。
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>刷新页面</Button>
          <Button variant="primary" onClick={this.handleReset}>重置演示数据并刷新</Button>
        </div>
      </div>
    );
  }
}
