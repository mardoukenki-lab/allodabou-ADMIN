import React from 'react';
import { ToastMessage } from '../types';
import { Bell, X, ArrowRight } from 'lucide-react';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
  onSelectDriver?: (driverId: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss, onSelectDriver }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 p-4 rounded-2xl bg-[#0D631B] text-white shadow-xl shadow-green-950/20 border border-green-700/50 transition-all animate-bounce-in"
        >
          <div className="p-2 rounded-xl bg-white/20 text-white shrink-0 mt-0.5">
            <Bell className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm leading-tight text-white">{toast.title}</h4>
            <p className="text-xs text-green-100 mt-1 line-clamp-2">{toast.message}</p>
            {toast.driverId && onSelectDriver && (
              <button
                onClick={() => {
                  onSelectDriver(toast.driverId!);
                  onDismiss(toast.id);
                }}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 hover:text-white transition-colors"
              >
                <span>Examiner le dossier</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
