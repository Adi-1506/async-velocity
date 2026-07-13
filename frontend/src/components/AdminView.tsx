"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Team } from '../types';
import {
  Users, Plus, Clock, Edit3, Trash, Bell, AlertCircle, ShieldCheck,
  Layers, Search, Check, Sparkles, X, ChevronRight, HelpCircle
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { api } from '../lib/api';

interface AdminViewProps {
  teams: Team[];
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
  triggerToast: (title: string, message: string, type: 'success' | 'warning' | 'info') => void;
}

export default function AdminView({
  teams,
  setTeams,
  triggerToast
}: AdminViewProps) {
  const { userProfile } = useAppContext();
  const isAdmin = userProfile.role === 'admin';

  const [loading, setLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<'All' | 'Active' | 'Underperforming' | 'Archived'>('All');
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [isProvisioningOpen, setIsProvisioningOpen] = useState<boolean>(false);
  const [newTeamName, setNewTeamName] = useState<string>("");
  const [newTeamHour, setNewTeamHour] = useState<string>("09:00");

  // Custom prompt edit states
  const [newPromptText, setNewPromptText] = useState<string>("");

  // New member creation states
  const [isAddMemberOpen, setIsAddMemberOpen] = useState<boolean>(false);
  const [newMemberName, setNewMemberName] = useState<string>("");
  const [newMemberEmail, setNewMemberEmail] = useState<string>("");
  const [newMemberPassword, setNewMemberPassword] = useState<string>("Password123!");
  const [newMemberTitle, setNewMemberTitle] = useState<string>("");
  const [newMemberRole, setNewMemberRole] = useState<'member' | 'lead'>("member");

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberEmail.trim() || !newMemberPassword.trim()) {
      triggerToast("Missing Fields", "Please populate all mandatory fields.", "warning");
      return;
    }
    const teamId = activeTeam.id || (activeTeam as any)._id;
    try {
      await api.post<{ success: boolean; user: any }>(`/teams/${teamId}/members/create`, {
        name: newMemberName,
        email: newMemberEmail,
        password: newMemberPassword,
        title: newMemberTitle,
        role: newMemberRole
      });

      // Reload team members list locally in state
      const freshTeam = await api.get<Team>(`/teams/${teamId}`);
      setTeams(prev => prev.map(t => (t.id === teamId || (t as any)._id === teamId) ? freshTeam : t));

      setIsAddMemberOpen(false);
      setNewMemberName("");
      setNewMemberEmail("");
      setNewMemberPassword("Password123!");
      setNewMemberTitle("");
      setNewMemberRole("member");

      triggerToast("Member Added", `Successfully registered ${newMemberName} and assigned to ${activeTeam.name}.`, "success");
    } catch (err: any) {
      triggerToast("Failed to Add Member", err.message || "An error occurred.", "warning");
    }
  };

  useEffect(() => {
    const loadTeams = async () => {
      try {
        if (isAdmin) {
          const response = await api.get<{ data: Team[] }>('/teams');
          setTeams(response.data);
          if (response.data.length > 0) {
            setSelectedTeamId(response.data[0].id || (response.data[0] as any)._id);
          }
        } else if (userProfile.teamId) {
          const team = await api.get<Team>(`/teams/${userProfile.teamId}`);
          setTeams([team]);
          setSelectedTeamId(team.id || (team as any)._id);
        }
      } catch (err: any) {
        triggerToast("Failed to load teams", err.message || "An error occurred.", "warning");
      } finally {
        setLoading(false);
      }
    };
    if (userProfile.role) {
      loadTeams();
    }
  }, [isAdmin, userProfile.teamId, userProfile.role, setTeams]);

  const visibleTeams = teams;
  const activeTeam = visibleTeams.find(t => (t.id === selectedTeamId || (t as any)._id === selectedTeamId)) || visibleTeams[0];

  const filteredTeams = visibleTeams.filter(t => {
    if (activeFilter === 'All') return true;
    return t.category === activeFilter;
  });

  const handleNudgeMember = async (memberId: string, memberName: string) => {
    if (!activeTeam) return;
    const teamId = activeTeam.id || (activeTeam as any)._id;
    try {
      const response = await api.post<{ nudged: boolean, message?: string }>(`/teams/${teamId}/members/${memberId}/nudge`);
      if (response.nudged) {
        triggerToast(
          "Nudge Dispatched",
          `Sent a customized async reminder ping to ${memberName} via corporate Slack channels.`,
          "info"
        );
      } else {
        triggerToast("Nudge Skipped", response.message || `${memberName} already submitted today.`, "info");
      }
    } catch (err: any) {
      triggerToast("Nudge Failed", err.message || "Could not nudge member.", "warning");
    }
  };

  const handleNudgeTeamAll = async (teamId: string, teamName: string) => {
    try {
      const response = await api.post<{ data: Array<{ id: string, name: string }> }>(`/teams/${teamId}/nudge`);
      const nudgedNames = response.data.map(m => m.name).join(', ');
      if (response.data.length > 0) {
        triggerToast(
          "Team Broadcast Sent",
          `Dispatched dynamic reminder cards to: ${nudgedNames}.`,
          "success"
        );
      } else {
        triggerToast("Broadcast Skipped", "All members have already submitted today's standup.", "info");
      }
    } catch (err: any) {
      triggerToast("Team Nudge Failed", err.message || "Could not nudge team.", "warning");
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) {
      triggerToast("Missing Name", "Please specify a descriptive team name.", "warning");
      return;
    }

    try {
      const created = await api.post<Team>('/teams', {
        name: newTeamName,
        scheduleHour: newTeamHour,
        timezone: "UTC-8"
      });

      setTeams([...teams, created]);
      setNewTeamName("");
      setIsProvisioningOpen(false);
      triggerToast("Team Created", `Provisioned ${newTeamName} and configured standup schedules.`, "success");
    } catch (err: any) {
      triggerToast("Creation Failed", err.message || "Could not create team.", "warning");
    }
  };

  const handleAddPrompt = async () => {
    if (!newPromptText.trim() || !activeTeam) return;
    const teamId = activeTeam.id || (activeTeam as any)._id;
    try {
      const updatedTeam = await api.post<Team>(`/teams/${teamId}/questions`, { text: newPromptText });
      setTeams(prev => prev.map(t => (t.id === teamId || (t as any)._id === teamId) ? { ...t, questions: updatedTeam.questions } : t));
      setNewPromptText("");
      triggerToast("Prompt Appended", "New custom question added to team standup templates.", "success");
    } catch (err: any) {
      triggerToast("Failed to Add Prompt", err.message || "Could not add template question.", "warning");
    }
  };

  const handleDeletePrompt = async (questionId: string) => {
    if (!activeTeam) return;
    const teamId = activeTeam.id || (activeTeam as any)._id;
    try {
      const updatedTeam = await api.delete<Team>(`/teams/${teamId}/questions/${questionId}`);
      setTeams(prev => prev.map(t => (t.id === teamId || (t as any)._id === teamId) ? { ...t, questions: updatedTeam.questions } : t));
      triggerToast("Prompt Deleted", "Standup template question removed.", "warning");
    } catch (err: any) {
      triggerToast("Failed to Delete Prompt", err.message || "Could not delete template question.", "warning");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse" id="admin-loading">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4" />
          <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-1/6" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(n => <div key={n} className="h-28 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="admin-container">
      {/* Filters & Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Category filters */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          {(['All', 'Active', 'Underperforming', 'Archived'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all ${activeFilter === filter
                  ? 'bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 shadow-xs font-semibold'
                  : 'text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-300'
                }`}
              id={`filter-btn-${filter}`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Provision new team button (Super Admin Only) */}
        {isAdmin && (
          <button
            onClick={() => setIsProvisioningOpen(true)}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-750 text-white shadow-xs hover:shadow transition-all flex items-center gap-1.5 font-mono"
            id="provision-new-team-btn"
          >
            <Plus className="w-4 h-4" />
            Provision Team
          </button>
        )}
      </div>

      {/* Grid of Teams */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeams.map((t) => {
          const tId = t.id || (t as any)._id;
          const isSelected = selectedTeamId === tId;

          // Color indicator based on compliance
          let barColor = "bg-emerald-500";
          let textColor = "text-emerald-600 dark:text-emerald-400";
          let badgeBg = "bg-emerald-500/10";

          if (t.compliance < 75) {
            barColor = "bg-red-500";
            textColor = "text-red-600 dark:text-red-400";
            badgeBg = "bg-red-500/10";
          } else if (t.compliance < 90) {
            barColor = "bg-amber-500";
            textColor = "text-amber-600 dark:text-amber-400";
            badgeBg = "bg-amber-500/10";
          }

          if (t.category === 'Archived') {
            barColor = "bg-zinc-400";
            textColor = "text-zinc-400";
            badgeBg = "bg-zinc-150 dark:bg-zinc-800";
          }

          return (
            <div
              key={tId}
              onClick={() => setSelectedTeamId(tId)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer bg-white dark:bg-zinc-900/50 ${isSelected
                  ? 'border-indigo-600 dark:border-indigo-400 ring-2 ring-indigo-500/5 shadow-md'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-350 dark:hover:border-zinc-700 shadow-xs'
                }`}
              id={`team-card-${tId}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-bold text-zinc-950 dark:text-zinc-50 truncate max-w-[150px]">{t.name}</h4>
                  <p className="text-[10px] text-zinc-500 mt-1 font-mono">{t.memberCount} Members • {t.scheduleHour} {t.timezone}</p>
                </div>
                {t.category !== 'Archived' && (
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full font-mono ${textColor} ${badgeBg}`}>
                    {t.compliance}% Match
                  </span>
                )}
              </div>

              {/* Progress bar visual */}
              {t.category !== 'Archived' ? (
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400">
                    <span>VCS compliance score</span>
                    <span>{t.compliance}/100</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor}`} style={{ width: `${t.compliance}%` }} />
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-2 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl text-center text-[10px] text-zinc-400 font-mono">
                  Archived / Legacy
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Main Admin focus view: Selected Team details & compliance listing */}
      {activeTeam ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          {/* Compliance Table of members */}
          <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs lg:col-span-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-800/50">
              <div>
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider font-mono">
                  {activeTeam.name} Compliance Sheet
                </h3>
                <p className="text-[10px] text-zinc-400 mt-1 font-semibold">Track daily status broadcasts and nudge non-submitted members.</p>
              </div>

              {activeTeam.category !== 'Archived' && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setIsAddMemberOpen(true)}
                    className="px-3 py-1.5 text-[10px] font-mono font-medium rounded-lg bg-indigo-600 hover:bg-indigo-755 text-white transition-colors"
                    id="add-member-btn"
                  >
                    ➕ Add Member
                  </button>
                  <button
                    onClick={() => handleNudgeTeamAll(activeTeam.id || (activeTeam as any)._id, activeTeam.name)}
                    className="px-3 py-1.5 text-[10px] font-mono font-medium rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 hover:bg-indigo-100 transition-colors"
                    id="nudge-all-team-btn"
                  >
                    🔔 Nudge Pending Members
                  </button>
                </div>
              )}
            </div>

            {(activeTeam.members || []).length === 0 ? (
              <div className="p-8 text-center text-zinc-400 text-xs">
                No registered members found on this database segment.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-400">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[10px] uppercase font-mono text-zinc-400 font-bold">
                      <th className="pb-3 pl-1">Engineer</th>
                      <th className="pb-3">VCS Role</th>
                      <th className="pb-3">Last Submission</th>
                      <th className="pb-3">Streak</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {(activeTeam.members || []).map((member) => (
                      <tr key={member.name} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                        <td className="py-3.5 pl-1 flex items-center gap-2.5">
                          <img src={member.avatar} alt={member.name} className="w-7 h-7 rounded-full object-cover" />
                          <span className="font-semibold text-zinc-900 dark:text-zinc-50">{member.name}</span>
                        </td>
                        <td className="py-3.5 text-zinc-500">{member.role}</td>
                        <td className="py-3.5">
                          {member.hasSubmittedToday ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold flex items-center gap-1">
                              ✔ {member.lastSubmitted ? new Date(member.lastSubmitted).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Today'}
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 font-mono font-semibold flex items-center gap-1">
                              ⏳ Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 font-mono">⚡ {member.streak} days</td>
                        <td className="py-3.5 text-right">
                          {!member.hasSubmittedToday && activeTeam.category !== 'Archived' && (
                            <button
                              onClick={() => handleNudgeMember(member.id || "", member.name)}
                              className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 hover:underline px-2 py-1 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                              id={`nudge-btn-${member.name.replace(/\s+/g, '-')}`}
                            >
                              Nudge Slack
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Questions Template Customize sidebar */}
          <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs lg:col-span-1 flex flex-col justify-between min-h-[300px]">
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800/50">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider font-mono">
                  Standup Templates
                </h3>
              </div>

              <p className="text-[10px] text-zinc-500 leading-normal mb-4">
                Configure the specific prompts that members fill out under the standup loop for <strong>{activeTeam.name}</strong>.
              </p>

              <div className="space-y-3">
                {(activeTeam.questions || []).map((q: any, idx) => (
                  <div
                    key={q._id || idx}
                    className="p-3 rounded-xl border border-zinc-150 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/20 text-xs text-zinc-850 dark:text-zinc-200 flex items-start gap-2 group"
                  >
                    <span className="text-[10px] text-zinc-400 font-mono mt-0.5">{idx + 1}.</span>
                    <p className="flex-1 leading-relaxed">{q.text}</p>
                    <button
                      onClick={() => handleDeletePrompt(q._id)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 text-[10px] p-0.5 transition-opacity"
                      title="Remove question"
                      id={`delete-prompt-${q._id}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-zinc-150 dark:border-zinc-800/50 space-y-2">
              <input
                type="text"
                placeholder="e.g. What were your code review cycles today?"
                value={newPromptText}
                onChange={(e) => setNewPromptText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddPrompt();
                }}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                id="new-prompt-input"
              />
              <button
                onClick={handleAddPrompt}
                className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 text-xs font-bold rounded-xl transition-colors"
                id="add-prompt-submit"
              >
                Append Prompt
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="pt-8 pb-4 text-center">
          <p className="text-zinc-500 text-sm font-medium">You are not assigned to any active teams.</p>
        </div>
      )}

      {/* Provision New Team Dialog Modal overlay */}
      <AnimatePresence>
        {isProvisioningOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setIsProvisioningOpen(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 text-sm"
              >
                ✕
              </button>

              <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider font-mono mb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Provision New Team Segments
              </h3>
              <p className="text-[11px] text-zinc-500 mb-6">
                Establish corporate sync groups, assign webhook trigger schedules, and allocate standard template patterns.
              </p>

              <form onSubmit={handleCreateTeam} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Team / Group Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Frontend Platform"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    id="new-team-name-input"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Reminder Webhook Hour</label>
                  <input
                    type="time"
                    value={newTeamHour}
                    onChange={(e) => setNewTeamHour(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    id="new-team-hour-input"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-850">
                  <button
                    type="button"
                    onClick={() => setIsProvisioningOpen(false)}
                    className="px-3 py-2 text-xs text-zinc-500 hover:text-zinc-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl shadow-xs"
                    id="new-team-submit"
                  >
                    Activate Segment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add New Member/Lead Dialog Modal overlay */}
      <AnimatePresence>
        {isAddMemberOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setIsAddMemberOpen(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 text-sm"
              >
                ✕
              </button>

              <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider font-mono mb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Add Team Member / Lead
              </h3>
              <p className="text-[11px] text-zinc-500 mb-6">
                Register a new corporate account and bind them directly to the <strong>{activeTeam.name}</strong> sync segment.
              </p>

              <form onSubmit={handleAddMember} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Rivera"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    id="new-member-name-input"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Corporate Email</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. alex@asyncvelocity.internal"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    id="new-member-email-input"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Access Password</label>
                  <input
                    type="text"
                    required
                    value={newMemberPassword}
                    onChange={(e) => setNewMemberPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    id="new-member-password-input"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Job Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior SRE (Defaults to Engineer)"
                    value={newMemberTitle}
                    onChange={(e) => setNewMemberTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    id="new-member-title-input"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block">Organization Role</label>
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    id="new-member-role-select"
                  >
                    <option value="member">Regular Team Member</option>
                    <option value="lead">Team Lead (SARAH dashboard role)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-850">
                  <button
                    type="button"
                    onClick={() => setIsAddMemberOpen(false)}
                    className="px-3 py-2 text-xs text-zinc-500 hover:text-zinc-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-755 text-white rounded-xl shadow-xs"
                    id="new-member-submit"
                  >
                    Add to Team
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
