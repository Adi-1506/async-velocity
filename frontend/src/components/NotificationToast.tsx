"use client";
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Check, AlertTriangle, Send } from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'warning' | 'info';
  message: string;
  title: string;
}

interface NotificationToastProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

interface ToastItemProps {
  toast: Toast;
  removeToast: (id: string) => void;
}

function ToastItem({ toast, removeToast }: ToastItemProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, removeToast]);

  const icons = {
    success: <Check className="w-5 h-5 text-emerald-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    info: <Send className="w-5 h-5 text-indigo-500" />,
  };

  const borderColors = {
    success: 'border-emerald-500/20 dark:border-emerald-500/30',
    warning: 'border-amber-500/20 dark:border-amber-500/30',
    info: 'border-indigo-500/20 dark:border-indigo-500/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border bg-white dark:bg-zinc-900 shadow-xl dark:shadow-black/50 ${borderColors[toast.type]}`}
      id={`toast-${toast.id}`}
    >
      <div className="flex-shrink-0 p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800">
        {icons[toast.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">{toast.title}</p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 leading-relaxed">{toast.message}</p>
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="flex-shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors text-xs p-1"
        aria-label="Close alert"
      >
        ✕
      </button>
    </motion.div>
  );
}

export default function NotificationToast({ toasts, removeToast }: NotificationToastProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} removeToast={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
