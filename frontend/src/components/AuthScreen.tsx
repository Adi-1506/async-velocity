"use client";
import React, { useState } from 'react';
import { User, Key, ArrowRight } from 'lucide-react';

interface AuthScreenProps {
  role: 'member' | 'lead' | 'admin';
  onLogin: (role: 'member' | 'lead' | 'admin' | 'onboarding', userData?: any) => void;
  triggerToast: (title: string, message: string, type: 'success' | 'warning' | 'info') => void;
}

export default function AuthScreen({ role, onLogin, triggerToast }: AuthScreenProps) {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const roleTitle = role === 'admin' ? 'Super Admin' : role === 'lead' ? 'Team Lead' : 'Member';
  const rolePlaceholder = role === 'admin' ? 'cto@asyncvelocity.internal' : role === 'lead' ? 'lead@asyncvelocity.internal' : 'sarah@asyncvelocity.internal';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      triggerToast("Email Required", "Please enter your internal corporate email address.", "warning");
      return;
    }

    setIsLoading(true);
    triggerToast("Authenticating", "Verifying token signatures and organization policies...", "info");

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, expectedRole: role })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Authentication failed');
      }

      triggerToast("Welcome Back", `Successfully authenticated as ${roleTitle}.`, "success");
      onLogin(role, data);
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
        triggerToast("Connection Error", "Cannot connect to backend server on port 5001.", "warning");
      } else {
        triggerToast("Access Denied", err.message, "warning");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden" id="auth-root">
      {/* Background visual accents */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/5 dark:bg-indigo-400/5 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/5 dark:bg-emerald-400/5 rounded-full blur-3xl pointer-events-none translate-x-1/2 translate-y-1/2" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm mb-4">
          <span className="text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400 font-mono">⚡</span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 font-sans">
          Async Velocity
        </h1>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto uppercase tracking-widest font-mono">
          {roleTitle} Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block">Corporate Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  placeholder={rolePlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  id="auth-email-input"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 pointer-events-none">
                  <User className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block">Access Key / Passcode</label>
                <span className="text-[10px] text-zinc-400 font-mono">Token standard SHA-256</span>
              </div>
              <div className="relative">
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  id="auth-password-input"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 pointer-events-none">
                  <Key className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-sm hover:shadow transition-all font-mono"
              id="auth-submit-btn"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Sign In as {roleTitle} <ArrowRight className="w-3.5 h-3.5" /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
