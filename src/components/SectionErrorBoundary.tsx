import React, { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

/** Prevents a single section crash from blanking the whole app (white screen). */
export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Unknown error' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[SectionErrorBoundary]', error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="m-4 p-6 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200">
          <h3 className="font-bold text-sm mb-1">{this.props.fallbackTitle || 'Qaybtan waa la xayiray si ku meel gaar ah'}</h3>
          <p className="text-xs opacity-80 mb-3">{this.state.message}</p>
          <button
            type="button"
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700"
            onClick={() => this.setState({ hasError: false, message: '' })}
          >
            Isku day mar kale
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
