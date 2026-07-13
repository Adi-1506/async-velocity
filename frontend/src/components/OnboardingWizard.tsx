"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, StandupEntry } from '../types';
import { 
  User, Globe, Check, GitPullRequest, ArrowRight, ArrowLeft, 
  MessageSquare, Bell, Clock, Calendar, CheckSquare, Sparkles, Send, Flame, Layers 
} from 'lucide-react';

interface OnboardingWizardProps {
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  onComplete: (firstStandup: Partial<StandupEntry>) => void;
  triggerToast: (title: string, message: string, type: 'success' | 'warning' | 'info') => void;
}

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
  "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150"
];

const TIMEZONES = [
  "UTC-8 (Pacific Standard Time)",
  "UTC-5 (Eastern Standard Time)",
  "UTC+0 (Greenwich Mean Time)",
  "UTC+1 (Central European Time)",
  "UTC+8 (Singapore Standard Time)",
  "UTC+9 (Japan Standard Time)"
];

const MOCK_REPOS = [
  "async-velocity-core",
  "pipeline-orchestrator",
  "auth-compliance-shield",
  "telemetry-aggregator-node",
  "client-view-engine"
];

export default function OnboardingWizard({
  userProfile,
  setUserProfile,
  onComplete,
  triggerToast
}: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isGithubSyncing, setIsGithubSyncing] = useState<boolean>(false);
  const [githubConnected, setGithubConnected] = useState<boolean>(userProfile.githubConnected);
  
  // Custom states for onboarding standup composer
  const [doneBullets, setDoneBullets] = useState<string[]>([""]);
  const [doingBullets, setDoingBullets] = useState<string[]>([""]);
  const [blockerBullets, setBlockerBullets] = useState<string[]>([""]);

  const handleConnectGithub = () => {
    setIsGithubSyncing(true);
    triggerToast("Initiating Sync", "Securing handshake with GitHub auth tunnels...", "info");
    
    setTimeout(() => {
      setGithubConnected(true);
      setUserProfile(prev => ({ ...prev, githubConnected: true }));
      setIsGithubSyncing(false);
      triggerToast("GitHub Synced", "Successfully mapped 5 repositories and commit histories.", "success");
    }, 2000);
  };

  const handleAddBullet = (type: 'done' | 'doing' | 'blocker') => {
    if (type === 'done') setDoneBullets([...doneBullets, ""]);
    if (type === 'doing') setDoingBullets([...doingBullets, ""]);
    if (type === 'blocker') setBlockerBullets([...blockerBullets, ""]);
  };

  const handleUpdateBullet = (type: 'done' | 'doing' | 'blocker', index: number, value: string) => {
    if (type === 'done') {
      const copy = [...doneBullets];
      copy[index] = value;
      setDoneBullets(copy);
    }
    if (type === 'doing') {
      const copy = [...doingBullets];
      copy[index] = value;
      setDoingBullets(copy);
    }
    if (type === 'blocker') {
      const copy = [...blockerBullets];
      copy[index] = value;
      setBlockerBullets(copy);
    }
  };

  const handleRemoveBullet = (type: 'done' | 'doing' | 'blocker', index: number) => {
    if (type === 'done') {
      if (doneBullets.length > 1) setDoneBullets(doneBullets.filter((_, i) => i !== index));
    }
    if (type === 'doing') {
      if (doingBullets.length > 1) setDoingBullets(doingBullets.filter((_, i) => i !== index));
    }
    if (type === 'blocker') {
      if (blockerBullets.length > 1) setBlockerBullets(blockerBullets.filter((_, i) => i !== index));
    }
  };

  const handleNext = () => {
    if (currentStep === 1 && !userProfile.name.trim()) {
      triggerToast("Missing Fields", "Please specify your full name to proceed.", "warning");
      return;
    }
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      const activeDone = doneBullets.filter(b => b.trim() !== "");
      const activeDoing = doingBullets.filter(b => b.trim() !== "");
      const activeBlockers = blockerBullets.filter(b => b.trim() !== "");

      if (activeDone.length === 0 && activeDoing.length === 0) {
        triggerToast("Empty Standup", "Please fill out at least one item under Completed or Focused objectives.", "warning");
        return;
      }

      onComplete({
        done: activeDone,
        doing: activeDoing,
        blockers: activeBlockers
      });
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleRepoToggle = (repoName: string) => {
    const exists = userProfile.selectedRepos.includes(repoName);
    if (exists) {
      setUserProfile(p => ({ ...p, selectedRepos: p.selectedRepos.filter(r => r !== repoName) }));
    } else {
      setUserProfile(p => ({ ...p, selectedRepos: [...p.selectedRepos, repoName] }));
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4" id="onboarding-root">
      {/* Onboarding Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-mono text-zinc-600 dark:text-zinc-400 mb-3 border border-zinc-200/50 dark:border-zinc-700/50">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          Onboarding Progress • Step {currentStep} of 4
        </div>
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
          Welcome to Async Velocity
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-md mx-auto">
          Let's calibrate your daily standup loop, sync with your VCS, and establish automated notification triggers.
        </p>
      </div>

      {/* Steps indicator bar */}
      <div className="flex items-center justify-between max-w-md mx-auto mb-12 relative px-4">
        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-zinc-200 dark:bg-zinc-800 -translate-y-1/2 z-0"></div>
        {[1, 2, 3, 4].map((step) => {
          const isDone = step < currentStep;
          const isActive = step === currentStep;
          return (
            <div key={step} className="relative z-10 flex flex-col items-center">
              <button
                onClick={() => step < currentStep && setCurrentStep(step)}
                disabled={step >= currentStep}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-mono border transition-all ${
                  isDone 
                    ? 'bg-indigo-600 border-indigo-600 text-white cursor-pointer' 
                    : isActive 
                      ? 'bg-white dark:bg-zinc-900 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold ring-4 ring-indigo-500/10' 
                      : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500'
                }`}
                id={`step-indicator-${step}`}
              >
                {isDone ? <Check className="w-4 h-4" /> : step}
              </button>
            </div>
          );
        })}
      </div>

      {/* Main wizard body card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden p-6 md:p-8">
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-medium text-zinc-950 dark:text-zinc-50 mb-1 flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-500" />
                  Step 1: Set Up Your Profile Details
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  How should your colleagues identify your async updates on the dashboard?
                </p>
              </div>

              {/* Avatar Preset Selector */}
              <div className="space-y-3">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block">
                  Select Profile Avatar
                </label>
                <div className="flex flex-wrap items-center gap-4">
                  <img
                    src={userProfile.avatar}
                    alt="Active Preview"
                    className="w-16 h-16 rounded-full object-cover ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-zinc-900 shadow-inner"
                    id="profile-avatar-preview"
                  />
                  <div className="flex gap-2">
                    {AVATAR_PRESETS.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setUserProfile(p => ({ ...p, avatar: url }))}
                        className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all hover:scale-105 ${
                          userProfile.avatar === url 
                            ? 'border-indigo-500 ring-2 ring-indigo-500/10' 
                            : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                        id={`avatar-preset-${i}`}
                      >
                        <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Full Name input */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block">
                  Full Display Name
                </label>
                <input
                  type="text"
                  placeholder="Sarah Jenkins"
                  value={userProfile.name}
                  onChange={(e) => setUserProfile(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  id="profile-name-input"
                />
              </div>

              {/* Timezone Select */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block">
                  Preferred Timezone
                </label>
                <div className="relative">
                  <select
                    value={userProfile.timezone}
                    onChange={(e) => setUserProfile(p => ({ ...p, timezone: e.target.value }))}
                    className="w-full appearance-none px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    id="profile-timezone-select"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz} className="bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
                        {tz}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-400">
                    <Globe className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-medium text-zinc-950 dark:text-zinc-50 mb-1 flex items-center gap-2">
                  <GitPullRequest className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
                  Step 2: Sync Your VCS Workflow
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Automate your standups. Linking GitHub feeds active commits and pull request events directly into your draft composer.
                </p>
              </div>

              {/* Connect Button Panel */}
              <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-800/80 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-zinc-900 text-white rounded-xl">
                    <GitPullRequest className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      VCS Integration Tunnel
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {githubConnected 
                        ? "Connected as github.com/sarahjenkins" 
                        : "Auth signature handshake pending"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleConnectGithub}
                  disabled={isGithubSyncing}
                  className={`px-4 py-2 rounded-xl text-xs font-mono transition-all flex items-center gap-2 ${
                    githubConnected
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-zinc-950 hover:bg-zinc-850 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 font-medium'
                  }`}
                  id="github-connect-btn"
                >
                  {isGithubSyncing ? (
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : githubConnected ? (
                    <><Check className="w-4 h-4" /> Connected</>
                  ) : (
                    "Authorize Handshake"
                  )}
                </button>
              </div>

              {githubConnected && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 pt-2"
                >
                  {/* Repo filter type */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block">
                      Sync Target Configuration
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setUserProfile(p => ({ ...p, githubReposType: 'all' }))}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          userProfile.githubReposType === 'all'
                            ? 'border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10'
                            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                        }`}
                        id="repo-sync-all-btn"
                      >
                        <p className="text-xs font-semibold text-zinc-950 dark:text-zinc-50">All Repositories</p>
                        <p className="text-[10px] text-zinc-500 mt-1">Sync from any team organization repository</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setUserProfile(p => ({ ...p, githubReposType: 'selected' }))}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          userProfile.githubReposType === 'selected'
                            ? 'border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10'
                            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                        }`}
                        id="repo-sync-selected-btn"
                      >
                        <p className="text-xs font-semibold text-zinc-950 dark:text-zinc-50">Specific Only</p>
                        <p className="text-[10px] text-zinc-500 mt-1">Limit updates to selected repositories only</p>
                      </button>
                    </div>
                  </div>

                  {userProfile.githubReposType === 'selected' && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block">
                        Select Linked Repositories
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {MOCK_REPOS.map((repo) => {
                          const isSelected = userProfile.selectedRepos.includes(repo);
                          return (
                            <button
                              key={repo}
                              type="button"
                              onClick={() => handleRepoToggle(repo)}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-50 font-medium'
                                  : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700'
                              }`}
                              id={`repo-tag-${repo}`}
                            >
                              <GitPullRequest className="w-3.5 h-3.5 text-zinc-400" />
                              {repo}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-medium text-zinc-950 dark:text-zinc-50 mb-1 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-indigo-500" />
                  Step 3: Notification & Cadence Preferences
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Calibrate reminder loops, digest mailings, and chat status updates so you never miss a submission streak.
                </p>
              </div>

              {/* Slack Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 flex flex-col justify-between h-36">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Slack Dispatch</h4>
                        <p className="text-[10px] text-zinc-500">Sync nudges directly to Slack</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={userProfile.slackConnected}
                        onChange={(e) => setUserProfile(p => ({ ...p, slackConnected: e.target.checked }))}
                        className="sr-only peer" 
                        id="slack-toggle"
                      />
                      <div className="w-9 h-5 bg-zinc-200 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-normal">
                    Delivers automated push reminders to standup channels and supports immediate slash-commands.
                  </p>
                </div>

                {/* MS Teams Card */}
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 flex flex-col justify-between h-36">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Microsoft Teams</h4>
                        <p className="text-[10px] text-zinc-500">Sync with Teams activity</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={userProfile.teamsConnected}
                        onChange={(e) => setUserProfile(p => ({ ...p, teamsConnected: e.target.checked }))}
                        className="sr-only peer" 
                        id="teams-toggle"
                      />
                      <div className="w-9 h-5 bg-zinc-200 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-normal">
                    Bridges daily action logs and interactive card forms straight to your security group chat.
                  </p>
                </div>
              </div>

              {/* Time Configuration */}
              <div className="space-y-4 border-t border-zinc-100 dark:border-zinc-800/80 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      Preferred Daily Reminder Time
                    </label>
                    <input
                      type="time"
                      value={userProfile.reminderTime}
                      onChange={(e) => setUserProfile(p => ({ ...p, reminderTime: e.target.value }))}
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all"
                      id="reminder-time-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      Cadence Frequency
                    </label>
                    <div className="relative">
                      <select
                        value={userProfile.reminderFrequency}
                        onChange={(e) => setUserProfile(p => ({ ...p, reminderFrequency: e.target.value as any }))}
                        className="w-full appearance-none px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all"
                        id="reminder-frequency-select"
                      >
                        <option value="daily" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50">Daily (7 days / week)</option>
                        <option value="weekdays" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50">Weekdays Only (Mon - Fri)</option>
                        <option value="custom" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50">Custom Schedule</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-400">
                        ▼
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                  <input
                    type="checkbox"
                    checked={userProfile.emailDigest}
                    onChange={(e) => setUserProfile(p => ({ ...p, emailDigest: e.target.checked }))}
                    className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500/20"
                    id="email-digest-checkbox"
                  />
                  <div>
                    <label htmlFor="email-digest-checkbox" className="text-xs font-medium text-zinc-900 dark:text-zinc-100 block cursor-pointer">
                      Weekly Digest Report
                    </label>
                    <span className="text-[10px] text-zinc-500 block leading-tight mt-0.5">
                      Receive an automated weekly metrics summary and standup archive email every Friday afternoon.
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-medium text-zinc-950 dark:text-zinc-50 mb-1 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-indigo-500" />
                  Step 4: Draft Your First Async Standup
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  You are almost live. Submit your inaugural daily update and activate your core participation metrics.
                </p>
              </div>

              {/* Bulleted Composer Form */}
              <div className="space-y-4">
                {/* Completed yesterday */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-mono">
                      Completed (Yesterday / Recently)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAddBullet('done')}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline"
                      id="add-done-bullet-btn"
                    >
                      + Add Item
                    </button>
                  </div>
                  <div className="space-y-2">
                    {doneBullets.map((bullet, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs text-emerald-500 font-mono">✔</span>
                        <input
                          type="text"
                          placeholder="e.g. Conducted system code walkthrough for new engineering hires."
                          value={bullet}
                          onChange={(e) => handleUpdateBullet('done', idx, e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          id={`done-bullet-${idx}`}
                        />
                        {doneBullets.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveBullet('done', idx)}
                            className="text-zinc-400 hover:text-red-500 text-xs px-1"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Focusing on today */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-mono">
                      Today's High-Priority Objectives
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAddBullet('doing')}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline"
                      id="add-doing-bullet-btn"
                    >
                      + Add Item
                    </button>
                  </div>
                  <div className="space-y-2">
                    {doingBullets.map((bullet, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs text-indigo-500 font-mono">➔</span>
                        <input
                          type="text"
                          placeholder="e.g. Set up terraform scripts for staging cluster thresholds."
                          value={bullet}
                          onChange={(e) => handleUpdateBullet('doing', idx, e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          id={`doing-bullet-${idx}`}
                        />
                        {doingBullets.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveBullet('doing', idx)}
                            className="text-zinc-400 hover:text-red-500 text-xs px-1"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active blockers */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider font-mono flex items-center gap-1">
                      Blockers & Dependencies (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAddBullet('blocker')}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline"
                      id="add-blocker-bullet-btn"
                    >
                      + Add Item
                    </button>
                  </div>
                  <div className="space-y-2">
                    {blockerBullets.map((bullet, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs text-amber-500 font-mono">⚠</span>
                        <input
                          type="text"
                          placeholder="e.g. Awaiting final production security clearance from legal team."
                          value={bullet}
                          onChange={(e) => handleUpdateBullet('blocker', idx, e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          id={`blocker-bullet-${idx}`}
                        />
                        {blockerBullets.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveBullet('blocker', idx)}
                            className="text-zinc-400 hover:text-red-500 text-xs px-1"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Side team activity sneak peak */}
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200/50 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Flame className="w-5 h-5 fill-current animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Team Streak Active</h4>
                    <p className="text-[10px] text-zinc-500">Core Infrastructure team is on an 18-day hot streak!</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-500/5 dark:bg-amber-400/5 px-2.5 py-1 rounded-lg border border-amber-500/20">
                  ⚡ 18 days
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wizard Footer Controls */}
        <div className="flex items-center justify-between border-t border-zinc-150 dark:border-zinc-800 pt-6 mt-8">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 1}
            className={`px-4 py-2 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all ${
              currentStep === 1
                ? 'text-zinc-300 dark:text-zinc-700 cursor-not-allowed'
                : 'text-zinc-650 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
            }`}
            id="wizard-back-btn"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="px-5 py-2.5 text-xs font-medium rounded-xl bg-indigo-600 hover:bg-indigo-750 text-white flex items-center gap-1.5 shadow-sm hover:shadow transition-all"
            id="wizard-next-btn"
          >
            {currentStep === 4 ? "Submit & Go Live" : "Continue"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
