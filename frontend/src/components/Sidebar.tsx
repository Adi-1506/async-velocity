"use client";
import React from 'react';
import { 
  Sun, Moon, Flame, Menu, X, LogOut 
} from 'lucide-react';
import { UserProfile } from '../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  userProfile: UserProfile;
  logout: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  darkMode,
  setDarkMode,
  userProfile,
  logout,
  isMobileOpen,
  setIsMobileOpen
}: SidebarProps) {
  const tabs = [
    { id: 'feed', label: 'Standup Feed', icon: '📋' },
    { id: 'history', label: 'Personal History', icon: '📅' },
    (userProfile.role === 'admin' || userProfile.role === 'lead') ? { id: 'admin', label: userProfile.role === 'admin' ? 'Super Org Admin' : 'Team Admin', icon: '🛡️' } : null,
    { id: 'settings', label: 'Settings & Sync', icon: '⚙️' }
  ].filter(Boolean) as { id: string, label: string, icon: string }[];

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400 font-mono">⚡ Async Velocity</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-505 dark:text-zinc-400"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-505 dark:text-zinc-400"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Sidebar background overlay for mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside 
        className={`fixed inset-y-0 left-0 w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col justify-between z-50 transition-transform duration-200 md:translate-x-0 md:sticky md:top-0 md:h-screen ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        id="sidebar-root"
      >
        <div className="flex flex-col gap-6 p-4">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm shadow-indigo-600/20">
                <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="font-bold tracking-tight text-zinc-950 dark:text-white text-lg">Async Velocity</span>
            </div>
            <button 
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden text-zinc-405 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile Summary */}
          <button 
            onClick={() => {
              setCurrentTab('settings');
              setIsMobileOpen(false);
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-150 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors text-left"
          >
            {mounted ? (
              <>
                <img 
                  src={userProfile.avatar} 
                  alt={userProfile.name} 
                  className="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 shadow-xs"
                  id="sidebar-avatar"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50 truncate">{userProfile.name}</h4>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-500 truncate mt-0.5 font-mono">{userProfile.title || "Tech Lead"} • Core Infra</p>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10 shrink-0" title="Active Standup session" />
              </>
            ) : (
              <div className="flex items-center gap-3 w-full animate-pulse">
                <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-800 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
                  <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
                </div>
              </div>
            )}
          </button>

          {/* Nav Items */}
          <nav className="flex flex-col gap-1">
            <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest pl-3 mb-2">Main Navigation</span>
            {tabs.map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setCurrentTab(tab.id);
                    setIsMobileOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium rounded-lg transition-all ${
                    isActive 
                      ? 'bg-zinc-100 text-zinc-950 dark:bg-zinc-900 dark:text-white font-semibold' 
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/20'
                  }`}
                  id={`nav-btn-${tab.id}`}
                >
                  <span className="text-sm shrink-0">{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Panel */}
        <div className="p-4 border-t border-zinc-150 dark:border-zinc-800/80 flex flex-col gap-3">
          {/* Active Personal Streak indicator - styled as Lumina Plan widget */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-150 dark:border-zinc-800 rounded-xl">
            <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Standup Stats</p>
            <div className="flex justify-between items-center">
              <p className="text-xs text-zinc-800 dark:text-zinc-200 font-medium">Daily Streak</p>
              <span className="text-xs font-mono font-bold text-amber-500">🔥 15 Days</span>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1 mt-3 rounded-full overflow-hidden">
              <div className="bg-indigo-500 w-11/12 h-full"></div>
            </div>
            {(userProfile.role === 'admin' || userProfile.role === 'lead') && (
              <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-2 font-mono">Weekly compliance at 92%</p>
            )}
          </div>

          {/* Dark Mode toggle & logout */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors p-1"
              id="sidebar-theme-toggle"
            >
              {darkMode ? (
                <><Sun className="w-4 h-4 text-amber-500" /> <span className="text-[10px]">Light mode</span></>
              ) : (
                <><Moon className="w-4 h-4 text-zinc-400" /> <span className="text-[10px]">Dark mode</span></>
              )}
            </button>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-red-500 transition-colors p-1"
              id="sidebar-logout-btn"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="text-[10px]">Log out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
