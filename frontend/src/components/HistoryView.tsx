"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { StandupEntry, UserProfile } from '../types';
import {
  Calendar as CalendarIcon, Search, Edit2, Share2, Sparkles, Check,
  Flame, Award, CheckCircle2, AlertTriangle, HelpCircle, X
} from 'lucide-react';
import { api } from '../lib/api';

interface HistoryViewProps {
  historyEntries: StandupEntry[];
  setHistoryEntries: React.Dispatch<React.SetStateAction<StandupEntry[]>>;
  userProfile: UserProfile;
  triggerToast: (title: string, message: string, type: 'success' | 'warning' | 'info') => void;
}

export default function HistoryView({
  historyEntries,
  setHistoryEntries,
  userProfile,
  triggerToast
}: HistoryViewProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  
  const [stats, setStats] = useState<{ totalSubmitted: number; currentStreak: number; longestStreak: number } | null>(null);
  const [calendar, setCalendar] = useState<Record<string, 'submitted' | 'missed' | 'weekend' | 'today'>>({});
  const [loading, setLoading] = useState<boolean>(true);

  // Inline editing state
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editDone, setEditDone] = useState<string>("");
  const [editDoing, setEditDoing] = useState<string>("");
  const [editBlockers, setEditBlockers] = useState<string>("");

  useEffect(() => {
    const loadHistoryData = async () => {
      try {
        const [statsData, calendarData] = await Promise.all([
          api.get<{ totalSubmitted: number; currentStreak: number; longestStreak: number }>('/standups/me/stats'),
          api.get<Record<string, any>>('/standups/me/calendar?month=7&year=2026') // Seed data is centered in July 2026
        ]);
        setStats(statsData);
        setCalendar(calendarData);
      } catch (err: any) {
        triggerToast("Failed to load history metrics", err.message || "An error occurred.", "warning");
      }
    };
    loadHistoryData();
  }, []);

  useEffect(() => {
    const fetchHistoryLogs = async () => {
      try {
        const query = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '';
        const response = await api.get<{ data: StandupEntry[] }>(`/standups/me${query}`);
        setHistoryEntries(response.data);
      } catch (err: any) {
        triggerToast("Failed to fetch historical updates", err.message || "An error occurred.", "warning");
      } finally {
        setLoading(false);
      }
    };
    const timeout = setTimeout(fetchHistoryLogs, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, setHistoryEntries]);

  const handleEditInit = (entry: StandupEntry) => {
    setEditingEntryId(entry.id);
    setEditDone(entry.done.join('\n'));
    setEditDoing(entry.doing.join('\n'));
    setEditBlockers(entry.blockers.join('\n'));
  };

  const handleSaveEdit = async (entryId: string) => {
    const parsedDone = editDone.split('\n').filter(l => l.trim() !== "");
    const parsedDoing = editDoing.split('\n').filter(l => l.trim() !== "");
    const parsedBlockers = editBlockers.split('\n').filter(l => l.trim() !== "");

    if (parsedDone.length === 0 && parsedDoing.length === 0) {
      triggerToast("Empty Updates", "Please enter at least one item to save changes.", "warning");
      return;
    }

    try {
      const updated = await api.put<StandupEntry>(`/standups/${entryId}`, {
        done: parsedDone,
        doing: parsedDoing,
        blockers: parsedBlockers
      });

      setHistoryEntries(prev => prev.map(item => item.id === entryId ? updated : item));
      setEditingEntryId(null);
      triggerToast("Update Saved", "Past standup entry revised successfully.", "success");
      
      // Hot reload stats and calendar compliance indicators
      const [freshStats, freshCalendar] = await Promise.all([
        api.get<{ totalSubmitted: number; currentStreak: number; longestStreak: number }>('/standups/me/stats'),
        api.get<Record<string, any>>('/standups/me/calendar?month=7&year=2026')
      ]);
      setStats(freshStats);
      setCalendar(freshCalendar);
    } catch (err: any) {
      triggerToast("Update Failed", err.message || "Could not save edits.", "warning");
    }
  };

  const handleShare = (entry: StandupEntry) => {
    const shareText = `*Standup - ${entry.date}*\n\n*Done:*\n- ${entry.done.join('\n- ')}\n\n*Doing:*\n- ${entry.doing.join('\n- ')}`;
    navigator.clipboard.writeText(shareText);
    triggerToast("Copied to Clipboard", "Standup text formatted and copied for Slack/Teams.", "success");
  };

  const filteredEntries = historyEntries.filter(entry => {
    if (selectedDate !== null) {
      const dayStr = selectedDate.toString().padStart(2, '0');
      if (!entry.date.endsWith(`-${dayStr}`)) {
        return false;
      }
    }
    return true;
  });

  const daysInMonth = Array.from({ length: 30 }).map((_, i) => i + 1);

  if (loading && historyEntries.length === 0) {
    return (
      <div className="space-y-6 animate-pulse" id="history-loading">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(n => <div key={n} className="h-20 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
          <div className="lg:col-span-2 h-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="history-container">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider font-mono">Total Submitted</span>
            <h4 className="text-xl font-bold text-zinc-950 dark:text-zinc-50 mt-0.5">
              {stats ? `${stats.totalSubmitted} updates` : "—"}
            </h4>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-lg">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider font-mono">Current Streak</span>
            <h4 className="text-xl font-bold text-zinc-950 dark:text-zinc-50 mt-0.5">
              {stats ? `${stats.currentStreak} days` : "—"}
            </h4>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-600 rounded-lg">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider font-mono">Longest Streak</span>
            <h4 className="text-xl font-bold text-zinc-950 dark:text-zinc-50 mt-0.5">
              {stats ? `${stats.longestStreak} days` : "—"}
            </h4>
          </div>
        </div>
      </div>

      {/* Calendar card & History logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar visualizer */}
        <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 text-indigo-500" />
              July 2026
            </h3>
            <span className="text-[10px] text-zinc-400 font-mono">
              {stats && stats.totalSubmitted > 0 ? `${Math.min(100, Math.round((stats.totalSubmitted / 22) * 100))}% Compliance` : "0% Compliance"}
            </span>
          </div>

          {/* Grid of days */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold text-zinc-400 font-mono mb-2">
            <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {/* Pad calendar for day 1 starting on Wednesday (July 1st, 2026 is Wed) */}
            <div className="aspect-square" />
            <div className="aspect-square" />

            {daysInMonth.map((day) => {
              const status = calendar[day.toString()];

              let bgClass = "bg-zinc-50 dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500";
              let titleText = `Day ${day} - No submission required or pending`;

              if (status === 'submitted') {
                bgClass = "bg-emerald-500/15 border border-emerald-500/35 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 font-bold";
                titleText = `Day ${day} - Submitted on time`;
              } else if (status === 'missed') {
                bgClass = "bg-red-500/15 border border-red-500/35 text-red-700 dark:text-red-400 hover:bg-red-500/25";
                titleText = `Day ${day} - Missed report window`;
              } else if (status === 'weekend') {
                bgClass = "bg-zinc-100 dark:bg-zinc-800/50 text-zinc-400 dark:text-zinc-600";
                titleText = `Day ${day} - Weekend`;
              }

              if (status === 'today') {
                bgClass = "ring-2 ring-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs";
                titleText = `Day ${day} - Active today`;
              }

              return (
                <div
                  key={day}
                  title={titleText}
                  onClick={() => setSelectedDate(day)}
                  className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-mono cursor-pointer transition-all ${selectedDate === day ? 'ring-2 ring-indigo-500 scale-110 z-10 shadow-lg ' : ''
                    }${bgClass}`}
                  id={`calendar-day-${day}`}
                >
                  {day}
                </div>
              );
            })}
          </div>

          {/* Calendar Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-5 pt-4 border-t border-zinc-150 dark:border-zinc-800/80 text-[10px] font-medium text-zinc-500 font-mono">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500/40" /> Submitted</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-500/20 border border-red-500/40" /> Missed</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-zinc-100 dark:bg-zinc-800" /> Weekend</span>
          </div>
        </div>

        {/* History entries log list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs flex items-center gap-3">
              <Search className="w-4 h-4 text-zinc-400 shrink-0" />
              <input
                type="text"
                placeholder="Search past updates (e.g. conduct, telemetry, db replication)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none text-xs text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-0"
                id="history-search-input"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-zinc-400 hover:text-zinc-600 text-xs">✕</button>
              )}
            </div>

            {selectedDate !== null && (
              <button
                onClick={() => setSelectedDate(null)}
                className="px-4 py-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors whitespace-nowrap flex items-center"
              >
                ← Clear Date Filter
              </button>
            )}
          </div>

          <div className="space-y-4">
            {filteredEntries.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">No Historical Records Found</h4>
                <p className="text-[10px] text-zinc-505 mt-1 max-w-xs mx-auto leading-relaxed">
                  We searched all logged daily logs but couldn't find matches containing your search term.
                </p>
              </div>
            ) : (
              filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs"
                  id={`history-entry-${entry.id}`}
                >
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-50 font-mono">
                        {entry.date}
                      </span>
                      <span className="text-[10px] text-zinc-405 font-mono">({new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})</span>
                    </div>

                    {editingEntryId !== entry.id && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleEditInit(entry)}
                          className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-505 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                          title="Edit this entry"
                          id={`edit-entry-btn-${entry.id}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleShare(entry)}
                          className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-505 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                          title="Copy standup text"
                          id={`share-entry-btn-${entry.id}`}
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {editingEntryId === entry.id ? (
                    <div className="space-y-4">
                      {/* Done */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-mono">Done (One per line)</label>
                        <textarea
                          rows={2}
                          value={editDone}
                          onChange={(e) => setEditDone(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Doing */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-mono">Doing (One per line)</label>
                        <textarea
                          rows={2}
                          value={editDoing}
                          onChange={(e) => setEditDoing(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Blockers */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider font-mono">Blockers (One per line)</label>
                        <textarea
                          rows={1}
                          value={editBlockers}
                          onChange={(e) => setEditBlockers(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                        <button
                          onClick={() => setEditingEntryId(null)}
                          className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 hover:text-zinc-700"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(entry.id)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-semibold flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Done */}
                      {entry.done.length > 0 && (
                        <div>
                          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-mono block mb-1">Completed</span>
                          <ul className="list-disc pl-4 text-xs text-zinc-700 dark:text-zinc-300 space-y-1">
                            {entry.done.map((item, idx) => (
                              <li key={idx} className="leading-relaxed">{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Doing */}
                      {entry.doing.length > 0 && (
                        <div className="pt-1">
                          <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-mono block mb-1">Focus Objectives</span>
                          <ul className="list-disc pl-4 text-xs text-zinc-700 dark:text-zinc-300 space-y-1">
                            {entry.doing.map((item, idx) => (
                              <li key={idx} className="leading-relaxed">{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Blockers */}
                      {entry.blockers.length > 0 && (
                        <div className="pt-2 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 p-2.5 rounded-xl">
                          <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider font-mono block mb-1">Blockers</span>
                          <ul className="list-disc pl-4 text-xs text-zinc-700 dark:text-zinc-350 space-y-1">
                            {entry.blockers.map((item, idx) => (
                              <li key={idx} className="leading-relaxed">{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
