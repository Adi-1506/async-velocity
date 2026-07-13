import mongoose from 'mongoose';
import { StandupEntry } from '../models/StandupEntry';
import { User } from '../models/User';
import { Team } from '../models/Team';

// Helper to determine if a given date string (YYYY-MM-DD) is a scheduled day for a user
const isScheduledDay = (dateStr: string, frequency: string): boolean => {
  const date = new Date(dateStr);
  if (frequency === 'daily') return true;
  const dayOfWeek = date.getUTCDay();
  // Mon=1, Tue=2, Wed=3, Thu=4, Fri=5
  return dayOfWeek >= 1 && dayOfWeek <= 5;
};

// Get the previous date string (YYYY-MM-DD)
const getPreviousDay = (dateStr: string): string => {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split('T')[0];
};

export const calculateUserStats = async (userId: mongoose.Types.ObjectId, reminderFrequency: string) => {
  const entries = await StandupEntry.find({ userId }).sort({ date: -1 }).select('date').lean();
  const totalSubmitted = entries.length;

  if (totalSubmitted === 0) {
    return { totalSubmitted: 0, currentStreak: 0, longestStreak: 0 };
  }

  const submittedDates = new Set(entries.map((e) => e.date));

  const todayStr = new Date().toISOString().split('T')[0];
  let currentDateStr = todayStr;
  let currentStreak = 0;
  
  // If today is scheduled and not submitted, we start checking from yesterday.
  // Actually, if today is submitted, it counts. If not submitted, and it is a scheduled day, the streak could be broken *today*,
  // but the prompt says: "Today only counts once it's been submitted; otherwise the streak is counted through yesterday."
  if (!submittedDates.has(todayStr)) {
    currentDateStr = getPreviousDay(todayStr);
  }

  // Calculate current streak
  let checkDateStr = currentDateStr;
  while (true) {
    if (isScheduledDay(checkDateStr, reminderFrequency)) {
      if (submittedDates.has(checkDateStr)) {
        currentStreak++;
      } else {
        break; // Gap found
      }
    }
    // If not scheduled, we just skip it (continue the streak)
    checkDateStr = getPreviousDay(checkDateStr);
    
    // Safety break
    if (currentStreak >= totalSubmitted && !submittedDates.has(checkDateStr)) break;
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  let tempDateStr = entries.length > 0 ? entries[0].date : todayStr;
  
  if (entries.length > 0) {
    // Find the latest submitted date in history to start walking backwards
    let walkDate = entries[0].date; // the most recent submission
    let streakCount = 0;
    // Walk back through a reasonable window or until we've seen all entries
    // A simpler way to calculate longest streak is to walk forward from the earliest date, but backwards is fine too.
    const earliestDate = entries[entries.length - 1].date;
    let iterDate = walkDate;
    
    while (iterDate >= earliestDate) {
      if (isScheduledDay(iterDate, reminderFrequency)) {
        if (submittedDates.has(iterDate)) {
          streakCount++;
          longestStreak = Math.max(longestStreak, streakCount);
        } else {
          streakCount = 0;
        }
      }
      iterDate = getPreviousDay(iterDate);
    }
  }

  // Current streak can potentially be higher than calculated longest due to counting today correctly
  longestStreak = Math.max(longestStreak, currentStreak);

  return {
    totalSubmitted,
    currentStreak,
    longestStreak,
  };
};

export const calculateTeamStats = async (teamId: mongoose.Types.ObjectId) => {
  const team = await Team.findById(teamId);
  if (!team || team.category === 'Archived') {
    return { compliance: 0, streak: 0, memberCount: 0 };
  }

  const members = await User.find({ teamId }).select('_id reminderFrequency').lean();
  const activeMemberCount = members.length;
  if (activeMemberCount === 0) {
    return { compliance: 0, streak: 0, memberCount: 0 };
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const entriesToday = await StandupEntry.countDocuments({ teamId, date: todayStr });
  
  const compliance = Math.round((entriesToday / activeMemberCount) * 100);

  // Calculate team streak
  // consecutive scheduled days on which 100% of the team's active members submitted
  const allEntries = await StandupEntry.find({ teamId }).select('date userId').lean();
  const entriesByDate = new Map<string, Set<string>>();
  for (const e of allEntries) {
    if (!entriesByDate.has(e.date)) entriesByDate.set(e.date, new Set());
    entriesByDate.get(e.date)?.add(e.userId.toString());
  }

  let currentStreak = 0;
  let checkDateStr = todayStr;
  const is100PercentToday = (entriesByDate.get(todayStr)?.size || 0) === activeMemberCount;
  
  if (!is100PercentToday) {
    checkDateStr = getPreviousDay(todayStr);
  }

  // Simplified: we assume weekdays for team streak checking
  while (true) {
    if (isScheduledDay(checkDateStr, 'weekdays')) {
      const submittedCount = entriesByDate.get(checkDateStr)?.size || 0;
      if (submittedCount === activeMemberCount) {
        currentStreak++;
      } else {
        break; // Gap found
      }
    }
    checkDateStr = getPreviousDay(checkDateStr);
    
    // Safety break if we go way past any entries
    if (entriesByDate.size === 0) break;
  }

  return {
    compliance,
    streak: currentStreak,
    memberCount: activeMemberCount
  };
};
