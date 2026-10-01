import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-[#090a10] text-slate-900 dark:text-zinc-100">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#12141e] border-2 border-black dark:border-white/10 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-bold tracking-tight">Beklenmeyen Bir Hata Oluştu</h2>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Uygulama çalışırken beklenmeyen bir istisna meydana geldi. Rehberlik verileriniz güvendedir ve bulutta saklanmaktadır.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-black/50 border border-slate-200 dark:border-white/5 font-mono text-[11px] text-rose-600 dark:text-rose-400 break-words max-h-32 overflow-y-auto">
                {this.state.error.message || 'Bilinmeyen Hata'}
              </div>
            )}

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-black hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black font-semibold text-xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sayfayı Yenile</span>
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 text-slate-700 dark:text-zinc-300 font-medium text-xs hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <span>Yeniden Dene</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
