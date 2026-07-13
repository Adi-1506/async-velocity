"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StandupEntry, Comment, UserProfile } from '../types';
import {
  Send, MessageSquare, ThumbsUp, Sparkles, Plus, Trash, AlertCircle,
  HelpCircle, UserCheck, Flame, GitCommit, Check, RefreshCw
} from 'lucide-react';
import { api } from '../lib/api';

interface FeedViewProps {
  feedEntries: StandupEntry[];
  setFeedEntries: React.Dispatch<React.SetStateAction<StandupEntry[]>>;
  userProfile: UserProfile;
  triggerToast: (title: string, message: string, type: 'success' | 'warning' | 'info') => void;
}

const REALTIME_ACTIVITIES = [
  { text: "Alex Rivera is committing code to `velocity-engine`...", type: "github" },
  { text: "Marcus Chen is reviewing PR #1420...", type: "github" },
  { text: "David Kim is looking into Stripe sandbox errors...", type: "slack" }
];

export default function FeedView({
  feedEntries,
  setFeedEntries,
  userProfile,
  triggerToast
}: FeedViewProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [tickerIndex, setTickerIndex] = useState<number>(0);
  const [filterDate, setFilterDate] = useState<string>("");

  // Custom standup composer states
  const [doneItems, setDoneItems] = useState<string[]>([""]);
  const [doingItems, setDoingItems] = useState<string[]>([""]);
  const [blockerItems, setBlockerItems] = useState<string[]>([""]);

  // Interactive comment expansion
  const [expandedCommentsId, setExpandedCommentsId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  // Cycle real-time activities for dashboard realism
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % REALTIME_ACTIVITIES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Feed on mount
  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const response = await api.get<{ data: StandupEntry[] }>('/standups/feed');
        setFeedEntries(response.data);
      } catch (err: any) {
        triggerToast("Failed to load feed", err.message || "An error occurred.", "warning");
      } finally {
        setLoading(false);
      }
    };
    fetchFeed();
  }, [setFeedEntries]);

  const handleAddComposerItem = (type: 'done' | 'doing' | 'blocker') => {
    if (type === 'done') setDoneItems([...doneItems, ""]);
    if (type === 'doing') setDoingItems([...doingItems, ""]);
    if (type === 'blocker') setBlockerItems([...blockerItems, ""]);
  };

  const handleUpdateComposerItem = (type: 'done' | 'doing' | 'blocker', idx: number, value: string) => {
    if (type === 'done') {
      const copy = [...doneItems];
      copy[idx] = value;
      setDoneItems(copy);
    }
    if (type === 'doing') {
      const copy = [...doingItems];
      copy[idx] = value;
      setDoingItems(copy);
    }
    if (type === 'blocker') {
      const copy = [...blockerItems];
      copy[idx] = value;
      setBlockerItems(copy);
    }
  };

  const handleRemoveComposerItem = (type: 'done' | 'doing' | 'blocker', idx: number) => {
    if (type === 'done') {
      if (doneItems.length > 1) setDoneItems(doneItems.filter((_, i) => i !== idx));
    }
    if (type === 'doing') {
      if (doingItems.length > 1) setDoingItems(doingItems.filter((_, i) => i !== idx));
    }
    if (type === 'blocker') {
      if (blockerItems.length > 1) setBlockerItems(blockerItems.filter((_, i) => i !== idx));
    }
  };

  // Submit active user standup
  const handleSubmitStandup = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalDones = doneItems.filter(i => i.trim() !== "");
    const finalDoings = doingItems.filter(i => i.trim() !== "");
    const finalBlockers = blockerItems.filter(i => i.trim() !== "");

    if (finalDones.length === 0 && finalDoings.length === 0) {
      triggerToast("Missing Content", "Please fill in at least one objective details to submit your standup.", "warning");
      return;
    }

    try {
      const newEntry = await api.post<StandupEntry>('/standups', {
        done: finalDones,
        doing: finalDoings,
        blockers: finalBlockers
      });
      setFeedEntries([newEntry, ...feedEntries]);
      triggerToast("Standup Shipped", "Your daily status report has been broadcast to Core Infrastructure team.", "success");

      // Reset composer
      setDoneItems([""]);
      setDoingItems([""]);
      setBlockerItems([""]);
    } catch (err: any) {
      if (err.status === 409) {
        triggerToast("Already Submitted", "You have already submitted today's standup. You can edit your entry in the Personal History tab.", "warning");
      } else {
        triggerToast("Submission Failed", err.message || "Could not publish standup.", "warning");
      }
    }
  };

  // Reaction picker increments (Toggle behavior)
  const handleReact = async (entryId: string, emoji: string) => {
    // Optimistic toggle
    setFeedEntries(prev => prev.map(entry => {
      if (entry.id === entryId) {
        const hasReacted = entry.userReactions?.includes(emoji);
        const nextUserReactions = hasReacted
          ? (entry.userReactions || []).filter(e => e !== emoji)
          : [...(entry.userReactions || []), emoji];
        
        const nextReactions = { ...entry.reactions };
        if (hasReacted) {
          nextReactions[emoji] = Math.max(0, (nextReactions[emoji] || 1) - 1);
        } else {
          nextReactions[emoji] = (nextReactions[emoji] || 0) + 1;
        }

        return {
          ...entry,
          reactions: nextReactions,
          userReactions: nextUserReactions
        };
      }
      return entry;
    }));

    try {
      const updatedEntry = await api.post<StandupEntry>(`/standups/${entryId}/reactions`, { emoji });
      // Reconcile with server response
      setFeedEntries(prev => prev.map(entry => entry.id === entryId ? updatedEntry : entry));
    } catch (err: any) {
      triggerToast("Reaction Failed", err.message || "Could not toggle reaction.", "warning");
    }
  };

  // Comments dispatch
  const handleAddComment = async (entryId: string) => {
    const text = commentInputs[entryId] || "";
    if (!text.trim()) return;

    try {
      const updatedEntry = await api.post<StandupEntry>(`/standups/${entryId}/comments`, { text });
      setFeedEntries(prev => prev.map(entry => entry.id === entryId ? updatedEntry : entry));
      setCommentInputs(prev => ({ ...prev, [entryId]: "" }));
      triggerToast("Comment Posted", "Your feedback was logged in the thread.", "success");
    } catch (err: any) {
      triggerToast("Comment Failed", err.message || "Could not post comment.", "warning");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse" id="feed-loading">
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4" />
          <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
        <div className="space-y-4">
          {[1, 2].map(n => (
            <div key={n} className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4" />
                  <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3" />
                </div>
              </div>
              <div className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="feed-container">
      {/* Real-time sync ticker bar */}
      <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-indigo-700 dark:text-indigo-400 font-medium">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
          <AnimatePresence mode="wait">
            <motion.span
              key={tickerIndex}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              {REALTIME_ACTIVITIES[tickerIndex].text}
            </motion.span>
          </AnimatePresence>
        </div>
        <span className="text-[10px] font-mono font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded-md">
          Live Sync
        </span>
      </div>

      {/* Composer panel */}
      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          Draft Today's Async Standup
        </h3>

        <form onSubmit={handleSubmitStandup} className="space-y-4">
          {/* Done block */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-mono">
                Completed Yesterday
              </label>
              <button
                type="button"
                onClick={() => handleAddComposerItem('done')}
                className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline"
                id="feed-add-done-btn"
              >
                + Add Item
              </button>
            </div>
            {doneItems.map((val, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs text-emerald-500 font-mono">✔</span>
                <input
                  type="text"
                  placeholder="What did you ship or approve?"
                  value={val}
                  onChange={(e) => handleUpdateComposerItem('done', idx, e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  id={`feed-done-item-${idx}`}
                />
                {doneItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveComposerItem('done', idx)}
                    className="text-zinc-400 hover:text-red-500 text-xs px-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Doing block */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-mono">
                Focus Objectives Today
              </label>
              <button
                type="button"
                onClick={() => handleAddComposerItem('doing')}
                className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline"
                id="feed-add-doing-btn"
              >
                + Add Item
              </button>
            </div>
            {doingItems.map((val, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs text-indigo-500 font-mono">➔</span>
                <input
                  type="text"
                  placeholder="What's your primary goal for today?"
                  value={val}
                  onChange={(e) => handleUpdateComposerItem('doing', idx, e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  id={`feed-doing-item-${idx}`}
                />
                {doingItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveComposerItem('doing', idx)}
                    className="text-zinc-400 hover:text-red-500 text-xs px-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Blockers block */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider font-mono">
                Blockers / Dependencies (Optional)
              </label>
              <button
                type="button"
                onClick={() => handleAddComposerItem('blocker')}
                className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline"
                id="feed-add-blocker-btn"
              >
                + Add Item
              </button>
            </div>
            {blockerItems.map((val, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs text-amber-500 font-mono">⚠</span>
                <input
                  type="text"
                  placeholder="Intermittent database bottlenecks or awaiting sign-off?"
                  value={val}
                  onChange={(e) => handleUpdateComposerItem('blocker', idx, e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  id={`feed-blocker-item-${idx}`}
                />
                {blockerItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveComposerItem('blocker', idx)}
                    className="text-zinc-400 hover:text-red-500 text-xs px-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Submit button bar */}
          <div className="flex items-center justify-end pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-medium bg-indigo-600 hover:bg-indigo-750 text-white shadow-xs hover:shadow transition-all flex items-center gap-1.5 font-mono"
              id="feed-submit-btn"
            >
              <Send className="w-3.5 h-3.5" />
              Publish Standup
            </button>
          </div>
        </form>
      </div>

      {/* Feed List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pl-1">Recent Team Broadcasts</span>
          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="px-2 py-1 pr-6 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {filterDate && (
                <button
                  type="button"
                  onClick={() => setFilterDate("")}
                  className="absolute right-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-250 text-xs"
                  title="Clear filter"
                >
                  ✕
                </button>
              )}
            </div>
            <span className="text-xs font-mono text-zinc-400 hidden sm:inline">{userProfile.teamName || "Core Infrastructure"}</span>
          </div>
        </div>

        <div className="space-y-4">
          {(filterDate ? feedEntries.filter(e => e.date === filterDate) : feedEntries).map((entry) => (
            <div
              key={entry.id}
              className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col gap-4"
              id={`feed-entry-${entry.id}`}
            >
              {/* Entry header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={entry.userAvatar}
                    alt={entry.userName}
                    className="w-10 h-10 rounded-full object-cover border border-zinc-150 dark:border-zinc-800"
                  />
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-950 dark:text-zinc-50">{entry.userName}</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{entry.userRole}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {entry.date} • {new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                  {entry.blockers.length > 0 && (
                    <span className="text-[8px] font-bold text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded-full uppercase font-mono">
                      Blocked
                    </span>
                  )}
                </div>
              </div>

              {/* Entry lists */}
              <div className="space-y-3 pl-1 pt-1">
                {/* Completed */}
                {entry.done.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-mono">Completed Yesterday</span>
                    <ul className="space-y-1 pl-3 list-disc text-xs text-zinc-700 dark:text-zinc-300">
                      {entry.done.map((item, i) => (
                        <li key={i} className="leading-relaxed">{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Focusing */}
                {entry.doing.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-mono">Focusing Today</span>
                    <ul className="space-y-1 pl-3 list-disc text-xs text-zinc-700 dark:text-zinc-300">
                      {entry.doing.map((item, i) => (
                        <li key={i} className="leading-relaxed">{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Blockers */}
                {entry.blockers.length > 0 && (
                  <div className="space-y-1 pt-1 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 p-2.5 rounded-xl">
                    <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider font-mono flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" /> Blocking Progress
                    </span>
                    <ul className="space-y-1 pl-3 list-disc text-xs text-zinc-750 dark:text-zinc-350">
                      {entry.blockers.map((item, i) => (
                        <li key={i} className="leading-relaxed">{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Reaction indicators & interaction buttons */}
              <div className="flex flex-col gap-3 border-t border-zinc-100 dark:border-zinc-800/80 pt-4 mt-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Reactions list */}
                  <div className="flex items-center gap-1.5">
                    {["👍", "🔥", "💡", "🙌", "👀"].map((emoji) => {
                      const count = entry.reactions[emoji] || 0;
                      const hasReacted = entry.userReactions?.includes(emoji);
                      return (
                        <button
                          key={emoji}
                          onClick={() => handleReact(entry.id, emoji)}
                          className={`px-2 py-1 rounded-lg text-xs font-mono flex items-center gap-1 transition-all ${hasReacted
                              ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 border font-semibold'
                              : 'bg-zinc-50 dark:bg-zinc-800 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-750 border'
                            }`}
                          id={`react-btn-${entry.id}-${emoji}`}
                        >
                          <span>{emoji}</span>
                          {count > 0 && <span className="text-[10px]">{count}</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Comment Toggle */}
                  <button
                    onClick={() => setExpandedCommentsId(expandedCommentsId === entry.id ? null : entry.id)}
                    className="text-xs text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50 flex items-center gap-1 px-3 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 transition-colors"
                    id={`comments-toggle-${entry.id}`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="font-mono">{entry.comments.length}</span> Comments
                  </button>
                </div>

                {/* Expanded comment section */}
                {expandedCommentsId === entry.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/50"
                  >
                    {entry.comments.map((comment) => (
                      <div key={comment.id} className="flex gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/30 border border-zinc-100/50 dark:border-zinc-800/50">
                        <img
                          src={comment.userAvatar}
                          alt={comment.userName}
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-zinc-900 dark:text-zinc-50">{comment.userName}</span>
                            <span className="text-[8px] text-zinc-400 font-mono">{new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                          <p className="text-[11px] text-zinc-700 dark:text-zinc-400 mt-1 leading-relaxed">{comment.text}</p>
                        </div>
                      </div>
                    ))}

                    {/* Compose comment */}
                    <div className="flex gap-2 items-center pt-2">
                      <input
                        type="text"
                        placeholder="Add your async feedback..."
                        value={commentInputs[entry.id] || ""}
                        onChange={(e) => setCommentInputs({ ...commentInputs, [entry.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddComment(entry.id);
                        }}
                        className="flex-1 px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        id={`comment-input-${entry.id}`}
                      />
                      <button
                        onClick={() => handleAddComment(entry.id)}
                        className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-750 text-white transition-colors"
                        id={`comment-submit-${entry.id}`}
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
