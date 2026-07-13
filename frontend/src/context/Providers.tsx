"use client";

import React from 'react';
import { AppProvider, useAppContext } from './AppContext';
import NotificationToast from '../components/NotificationToast';
import Confetti from '../components/Confetti';

function AppContent({ children }: { children: React.ReactNode }) {
  const { toasts, removeToast, isCelebrationActive } = useAppContext();
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      <NotificationToast toasts={toasts} removeToast={removeToast} />
      <Confetti active={isCelebrationActive} />
      {children}
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <AppContent>
        {children}
      </AppContent>
    </AppProvider>
  );
}
