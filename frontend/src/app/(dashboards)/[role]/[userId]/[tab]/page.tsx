"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import { useAppContext } from "@/context/AppContext";
import FeedView from "@/components/FeedView";
import HistoryView from "@/components/HistoryView";
import SettingsView from "@/components/SettingsView";
import AdminView from "@/components/AdminView";

export default function TabPage() {
  const params = useParams();
  const role = params?.role as string;
  const userId = params?.userId as string;
  const tab = params?.tab as string;

  const {
    feedEntries,
    setFeedEntries,
    historyEntries,
    setHistoryEntries,
    userProfile,
    setUserProfile,
    teams,
    setTeams,
    triggerToast
  } = useAppContext();

  if (tab === 'dashboard') {
    return (
      <FeedView
        feedEntries={feedEntries}
        setFeedEntries={setFeedEntries}
        userProfile={userProfile}
        triggerToast={triggerToast}
      />
    );
  }

  if (tab === 'history') {
    return (
      <HistoryView
        historyEntries={historyEntries}
        setHistoryEntries={setHistoryEntries}
        userProfile={userProfile}
        triggerToast={triggerToast}
      />
    );
  }

  if (tab === 'settings') {
    return (
      <SettingsView
        userProfile={userProfile}
        setUserProfile={setUserProfile}
        triggerToast={triggerToast}
      />
    );
  }

  if (tab === 'admin') {
    return (
      <AdminView
        teams={teams}
        setTeams={setTeams}
        triggerToast={triggerToast}
      />
    );
  }

  return (
    <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 font-mono text-sm">
      View Not Found
    </div>
  );
}
