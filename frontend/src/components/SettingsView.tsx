"use client";
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import {
  Settings, Save, Check, Shield, GitBranch, Terminal, RefreshCw,
  Trash2, Plus, MessageSquare, Bell, Clock, Compass
} from 'lucide-react';
import { api } from '../lib/api';

interface SettingsViewProps {
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  triggerToast: (title: string, message: string, type: 'success' | 'warning' | 'info') => void;
}

export default function SettingsView({
  userProfile,
  setUserProfile,
  triggerToast
}: SettingsViewProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [testMailLoading, setTestMailLoading] = useState<boolean>(false);

  // Local form states
  const [name, setName] = useState<string>("");
  const [timezone, setTimezone] = useState<string>("");
  const [newRepo, setNewRepo] = useState<string>("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await api.get<UserProfile>('/users/me');
        setUserProfile(profile);
        setName(profile.name);
        setTimezone(profile.timezone);
      } catch (err: any) {
        triggerToast("Failed to load profile", err.message || "An error occurred.", "warning");
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [setUserProfile]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const updated = await api.patch<UserProfile>('/users/me', { name, timezone });
      setUserProfile(updated);
      triggerToast("Preferences Updated", "All system sync intervals and notification schemas have been updated.", "success");
    } catch (err: any) {
      triggerToast("Save Failed", err.message || "Could not save preferences.", "warning");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSendTestMail = async () => {
    setTestMailLoading(true);
    triggerToast("Preparing Digest", "Synthesized and compiling your personal standup metrics...", "info");
    try {
      await api.post('/users/me/test-digest');
      triggerToast("Test Digest Delivered", `A prototype Friday standup summary mail has been sent to ${userProfile.name.toLowerCase().replace(/\s+/g, '')}@asyncvelocity.internal.`, "success");
    } catch (err: any) {
      triggerToast("Failed to Send", err.message || "Could not deliver test digest.", "warning");
    } finally {
      setTestMailLoading(false);
    }
  };

  const handleAddRepo = async () => {
    const cleanRepo = newRepo.trim();
    if (!cleanRepo) {
      triggerToast("Input Required", "Please enter a repository name.", "warning");
      return;
    }
    if ((userProfile.selectedRepos || []).includes(cleanRepo)) {
      triggerToast("Already Bound", "This repository is already linked.", "warning");
      return;
    }
    try {
      const updated = await api.post<UserProfile>('/users/me/repos', { repo: cleanRepo });
      setUserProfile(updated);
      setNewRepo("");
      triggerToast("Repository Added", "Synced branch tree and event streams successfully.", "success");
    } catch (err: any) {
      triggerToast("Add Repo Failed", err.message || "Could not link repository.", "warning");
    }
  };

  const handleRemoveRepo = async (repo: string) => {
    try {
      const updated = await api.delete<UserProfile>(`/users/me/repos/${repo}`);
      setUserProfile(updated);
      triggerToast("Repository Unlinked", "VCS event stream listeners detached.", "warning");
    } catch (err: any) {
      triggerToast("Remove Repo Failed", err.message || "Could not unlink repository.", "warning");
    }
  };

  const handleNotificationToggle = async (field: 'slackConnected' | 'emailDigest', checked: boolean) => {
    // Optimistic local update
    setUserProfile(p => ({ ...p, [field]: checked }));
    try {
      const updated = await api.patch<UserProfile>('/users/me/notifications', { [field]: checked });
      setUserProfile(updated);
      triggerToast("Preferences Saved", `${field === 'slackConnected' ? 'Slack integration' : 'Email digest'} settings updated.`, "success");
    } catch (err: any) {
      // Revert on failure
      setUserProfile(p => ({ ...p, [field]: !checked }));
      triggerToast("Toggle Failed", err.message || "Could not update notification setting.", "warning");
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 md:p-8 shadow-xs max-w-4xl mx-auto animate-pulse space-y-6" id="settings-loading">
        <div className="flex items-center gap-2 pb-4 border-b border-zinc-100 dark:border-zinc-800/50">
          <div className="w-5 h-5 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4" />
            <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
        <div className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 md:p-8 shadow-xs max-w-4xl mx-auto" id="settings-container">
      <div className="flex items-center gap-2 pb-4 border-b border-zinc-100 dark:border-zinc-800/50 mb-6">
        <Settings className="w-5 h-5 text-indigo-500" />
        <div>
          <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50">Settings & Sync Channels</h3>
          <p className="text-[10px] text-zinc-500 mt-0.5">Edit credentials, linked repositories, and daily schedule hooks.</p>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Core user credentials section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              id="settings-name-input"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">TimeZone</label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              id="settings-timezone-input"
            />
          </div>
        </div>

        {/* Repos list */}
        <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-850">
          <div>
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <GitBranch className="w-4 h-4 text-zinc-500" /> Linked Version Control Assets
            </h4>
            <p className="text-[10px] text-zinc-500 mt-0.5">Add or unlink repositories that trigger async commit logs.</p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. backend-api-services"
              value={newRepo}
              onChange={(e) => setNewRepo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddRepo();
                }
              }}
              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              id="settings-new-repo-input"
            />
            <button
              type="button"
              onClick={handleAddRepo}
              className="px-3 py-1.5 bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-bold rounded-lg transition-colors"
              id="settings-add-repo-btn"
            >
              Add Repo
            </button>
          </div>

          <div className="space-y-1.5">
            {(userProfile.selectedRepos || []).map((repo) => (
              <div
                key={repo}
                className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-150 dark:border-zinc-800 flex items-center justify-between"
              >
                <span className="text-xs font-mono text-zinc-850 dark:text-zinc-200">{repo}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveRepo(repo)}
                  className="text-zinc-400 hover:text-red-500 text-xs p-1"
                  title="Unlink asset"
                  id={`remove-repo-btn-${repo}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-850">
          <div>
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-indigo-500" /> Messaging Preferences
            </h4>
            <p className="text-[10px] text-zinc-500 mt-0.5">Toggle live chat tunnels and notifications.</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-150 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4 text-indigo-500" />
                <div>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-50 block">Slack Integration Hook</span>
                  <span className="text-[10px] text-zinc-500">Route nudges and daily cards to #engineering-feed</span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={userProfile.slackConnected || false}
                  onChange={(e) => handleNotificationToggle('slackConnected', e.target.checked)}
                  className="sr-only peer"
                  id="settings-slack-toggle"
                />
                <div className="w-9 h-5 bg-zinc-200 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-150 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-indigo-500" />
                <div>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-50 block">Digest Mailing System</span>
                  <span className="text-[10px] text-zinc-500">Weekly analytical roundups dispatched to your inbox</span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={userProfile.emailDigest || false}
                  onChange={(e) => handleNotificationToggle('emailDigest', e.target.checked)}
                  className="sr-only peer"
                  id="settings-email-toggle"
                />
                <div className="w-9 h-5 bg-zinc-200 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-850">
          <button
            type="button"
            onClick={handleSendTestMail}
            disabled={testMailLoading}
            className="px-4 py-2 text-xs font-medium border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center gap-1.5 transition-colors"
            id="settings-test-digest-btn"
          >
            {testMailLoading ? (
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              "Send Test Email Digest"
            )}
          </button>

          <button
            type="submit"
            disabled={saveLoading}
            className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-750 text-white flex items-center justify-center gap-1.5 shadow-sm transition-all font-mono"
            id="settings-save-btn"
          >
            {saveLoading ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Preferences
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
