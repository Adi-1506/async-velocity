"use client";

import Sidebar from "@/components/Sidebar";
import { useAppContext } from "@/context/AppContext";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

export default function DashboardsLayout({ children }: { children: React.ReactNode }) {
  const { userProfile, darkMode, setDarkMode, logout, isMobileOpen, setIsMobileOpen } = useAppContext();
  const pathname = usePathname();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Parse pathname to determine role, userId, and tab
  const parts = pathname.split("/").filter(Boolean);
  
  let rolePrefix = "";
  let userIdParam = "";
  let currentTab = "dashboard";

  if (parts.length > 0) {
    rolePrefix = parts[0];
    userIdParam = parts[1] || "";
    currentTab = parts[2] || "dashboard";
  }

  useEffect(() => {
    if (!isMounted) return;
    
    // Strict access control: redirect unauthorized roles to their respective login portals
    if (rolePrefix === 'lead' && userProfile.role !== 'lead') {
      router.replace('/lead-login');
    } else if (rolePrefix === 'super-admin' && userProfile.role !== 'admin') {
      router.replace('/super-admin-login');
    } else if (rolePrefix === 'member' && userProfile.role !== 'member') {
      router.replace('/login');
    } else if (userProfile.uuid) {
      const expectedPrefix = userProfile.role === 'admin' ? 'super-admin' : userProfile.role === 'lead' ? 'lead' : 'member';
      if (rolePrefix !== expectedPrefix || userIdParam !== userProfile.uuid) {
        router.replace(`/${expectedPrefix}/${userProfile.uuid}/${currentTab}`);
      }
    }
  }, [isMounted, userProfile.role, userProfile.uuid, rolePrefix, userIdParam, currentTab, router]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen relative">
      <Sidebar
        currentTab={currentTab === 'dashboard' ? 'feed' : currentTab}
        setCurrentTab={(tab) => {
          const expectedPrefix = userProfile.role === 'admin' ? 'super-admin' : userProfile.role === 'lead' ? 'lead' : 'member';
          const tabName = tab === "feed" ? "dashboard" : tab;
          router.push(`/${expectedPrefix}/${userProfile.uuid}/${tabName}`);
        }}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        userProfile={userProfile}
        logout={logout}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />
      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6 overflow-x-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-150 dark:border-zinc-800/80">
          <div>
            <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
              {currentTab === 'dashboard' && "Team Synchronizer"}
              {currentTab === 'history' && "Personal logs"}
              {currentTab === 'admin' && "Administration"}
              {currentTab === 'settings' && "Calibrations"}
            </span>
            <h2 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 mt-1">
              {currentTab === 'dashboard' && `${userProfile.teamName || "Core Infrastructure"} Feed`}
              {currentTab === 'history' && "Your Standup History"}
              {currentTab === 'admin' && "Super Org Compliance Dashboard"}
              {currentTab === 'settings' && "Preferences & VCS Mapping"}
            </h2>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span>Workgroup:</span>
            <span className="text-zinc-800 dark:text-zinc-200 font-semibold">
              {userProfile.teamName 
                ? `${userProfile.teamName.toLowerCase().replace(/\s+/g, '-')}-04` 
                : "core-infra-04"}
            </span>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
