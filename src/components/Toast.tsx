import React from 'react';
import { CheckCircle2, Info, AlertTriangle, X, RotateCcw } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning';
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-lg border shadow-lg transition-all duration-150 animate-dialog ${
              isSuccess
                ? 'bg-white dark:bg-[#1F1F1F] border-emerald-500/40 text-stone-900 dark:text-stone-100'
                : isWarning
                ? 'bg-white dark:bg-[#1F1F1F] border-amber-500/40 text-stone-900 dark:text-stone-100'
                : 'bg-white dark:bg-[#1F1F1F] border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
              {isWarning && <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
              {!isSuccess && !isWarning && <Info className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">{toast.title}</p>
              </div>
              {toast.description && (
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5 leading-snug">
                  {toast.description}
                </p>
              )}
              {toast.action && (
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      toast.action?.onClick();
                      onDismiss(toast.id);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-semibold shadow-xs hover:bg-stone-800 dark:hover:bg-white transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{toast.action.label}</span>
                  </button>
                  <span className="text-[10px] text-stone-400 font-mono">⌘Z</span>
                </div>
              )}
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              aria-label="Kapat"
              className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
