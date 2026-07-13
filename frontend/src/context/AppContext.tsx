"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { UserProfile, StandupEntry, Team } from '../types';
import {
  INITIAL_USER_PROFILE, INITIAL_TEAMS, INITIAL_FEED_ENTRIES, PERSONAL_HISTORY_ENTRIES
} from '../data';
import { api } from '../lib/api';

interface Toast {
  id: string;
  type: 'success' | 'warning' | 'info';
  message: string;
  title: string;
}

interface AppContextType {
  darkMode: boolean;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  isMobileOpen: boolean;
  setIsMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  teams: Team[];
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
  feedEntries: StandupEntry[];
  setFeedEntries: React.Dispatch<React.SetStateAction<StandupEntry[]>>;
  historyEntries: StandupEntry[];
  setHistoryEntries: React.Dispatch<React.SetStateAction<StandupEntry[]>>;
  toasts: Toast[];
  triggerToast: (title: string, message: string, type: 'success' | 'warning' | 'info') => void;
  removeToast: (id: string) => void;
  isCelebrationActive: boolean;
  setIsCelebrationActive: React.Dispatch<React.SetStateAction<boolean>>;
  handleLogin: (role: string, userData?: any) => void;
  logout: () => void;
  handleOnboardingComplete: (firstStandup: Partial<StandupEntry>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('userProfile');
      if (saved) {
        try {
          setUserProfile(JSON.parse(saved));
        } catch (e) {}
      }
    }
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const isLoginPath = pathname.includes('login') || pathname.endsWith('onboarding');
      if (isLoginPath) return;
      try {
        const user = await api.get<UserProfile>('/users/me');
        setUserProfile(user);
      } catch (err) {
        console.error('Session verification failed', err);
        localStorage.removeItem('userProfile');
        setUserProfile(INITIAL_USER_PROFILE);
        
        if (pathname.startsWith('/super-admin')) {
          router.push('/super-admin-login');
        } else if (pathname.startsWith('/lead')) {
          router.push('/lead-login');
        } else {
          router.push('/login');
        }
      }
    };
    checkSession();
  }, [pathname, router]);

  useEffect(() => {
    if (userProfile !== INITIAL_USER_PROFILE) {
      localStorage.setItem('userProfile', JSON.stringify(userProfile));
    }
  }, [userProfile]);

  const [teams, setTeams] = useState<Team[]>([]);
  const [feedEntries, setFeedEntries] = useState<StandupEntry[]>([]);
  const [historyEntries, setHistoryEntries] = useState<StandupEntry[]>([]);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isCelebrationActive, setIsCelebrationActive] = useState<boolean>(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setDarkMode(false);
    } else {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const getDashboardPrefix = (role: string) => {
    if (role === 'admin') return '/super-admin';
    if (role === 'lead') return '/lead';
    return '/'; // Normal users go to root
  };

  const triggerToast = (title: string, message: string, type: 'success' | 'warning' | 'info') => {
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = {
      id: `toast-${Date.now()}-${randomSuffix}`,
      title,
      message,
      type
    };
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleLogin = (role: string, userData?: any) => {
    if (userData) {
      setUserProfile(prev => ({
        ...prev,
        name: userData.name || prev.name,
        role: userData.role || role,
        email: userData.email || prev.email,
        title: userData.title || prev.title,
        avatar: userData.avatar || prev.avatar,
        timezone: userData.timezone || prev.timezone,
      }));
    }

    if (role === 'onboarding') {
      router.push('/onboarding');
    } else {
      const actualRole = userData?.role || role;
      router.push(getDashboardPrefix(actualRole));
    }
  };

  const handleOnboardingComplete = (firstStandup: Partial<StandupEntry>) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const formattedStandup: StandupEntry = {
      id: `first-standup-${Date.now()}`,
      userId: "self",
      userName: userProfile.name,
      userAvatar: userProfile.avatar,
      userRole: "Tech Lead",
      timestamp: "Just now",
      date: todayStr,
      done: firstStandup.done || [],
      doing: firstStandup.doing || [],
      blockers: firstStandup.blockers || [],
      comments: [],
      reactions: { "👋": 2, "👍": 3 }
    };

    setFeedEntries(prev => [formattedStandup, ...prev]);
    setHistoryEntries(prev => [formattedStandup, ...prev]);

    setTeams(prev => prev.map(t => {
      if (t.id === 't1') {
        const membersUpdated = t.members.map(m => {
          if (m.name === "Sarah Jenkins") {
            return {
              ...m,
              lastSubmitted: "Just now",
              hasSubmittedToday: true,
              streak: 16
            };
          }
          return m;
        });
        return {
          ...t,
          members: membersUpdated,
          compliance: 100
        };
      }
      return t;
    }));

    setIsCelebrationActive(true);
    triggerToast("Inaugural Report Submitted!", "Your credentials have been authenticated and live sync tunnels are operational.", "success");

    setTimeout(() => {
      router.push(getDashboardPrefix(userProfile.role));
    }, 1500);

    setTimeout(() => {
      setIsCelebrationActive(false);
    }, 5000);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Backend logout failed', e);
    }
    localStorage.removeItem('userProfile');
    setUserProfile(INITIAL_USER_PROFILE);
    router.push('/login');
    triggerToast("Signed Out", "Your active workspace session was securely closed.", "info");
  };

  return (
    <AppContext.Provider value={{
      darkMode, setDarkMode, isMobileOpen, setIsMobileOpen,
      userProfile, setUserProfile, teams, setTeams,
      feedEntries, setFeedEntries, historyEntries, setHistoryEntries,
      toasts, triggerToast, removeToast, isCelebrationActive, setIsCelebrationActive,
      handleLogin, logout, handleOnboardingComplete
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
