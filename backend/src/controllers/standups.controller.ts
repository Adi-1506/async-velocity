import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { StandupEntry } from '../models/StandupEntry';
import { calculateUserStats } from '../services/streaks.service';
import mongoose from 'mongoose';

// Helper to format an entry for the frontend
const formatEntry = (entry: any, currentUserId?: string) => {
  const user = entry.userId;
  
  // Aggregate reactions
  const reactionCounts: Record<string, number> = {};
  const userReactions: string[] = [];
  if (entry.reactions) {
    entry.reactions.forEach((r: any) => {
      reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
      if (currentUserId && r.userId?.toString() === currentUserId.toString()) {
        userReactions.push(r.emoji);
      }
    });
  }

  const formattedComments = (entry.comments || []).map((c: any) => ({
    id: c._id.toString(),
    userName: c.userId?.name || 'Unknown',
    userAvatar: c.userId?.avatar || '',
    text: c.text,
    timestamp: c.createdAt.toISOString(),
  }));

  return {
    id: entry._id.toString(),
    userId: user?._id?.toString(),
    userName: user?.name,
    userAvatar: user?.avatar,
    userRole: user?.title, // spec maps User.title to StandupEntry.userRole
    timestamp: entry.createdAt.toISOString(),
    date: entry.date,
    done: entry.done,
    doing: entry.doing,
    blockers: entry.blockers,
    comments: formattedComments,
    reactions: reactionCounts,
    userReactions,
  };
};

export const getFeed = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', teamId } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = Math.min(parseInt(limit as string, 10), 100);
    
    let targetTeamId = teamId || req.user!.teamId;

    if (!targetTeamId && req.user!.role === 'admin') {
      const TeamModel = mongoose.model('Team');
      const firstTeam = await TeamModel.findOne();
      if (firstTeam) {
        targetTeamId = firstTeam._id as any;
      }
    }

    if (!targetTeamId) {
      res.status(400).json({ error: { message: 'No team specified and user is not in a team' } });
      return;
    }

    const query = { teamId: targetTeamId };
    const total = await StandupEntry.countDocuments(query);
    
    const entries = await StandupEntry.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('userId', 'name avatar title')
      .populate('comments.userId', 'name avatar');

    const formattedData = entries.map(e => formatEntry(e, req.user?._id?.toString()));

    res.json({
      data: formattedData,
      meta: { page: pageNum, limit: limitNum, total }
    });
  } catch (error) {
    next(error);
  }
};

export const getMyHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', search } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = Math.min(parseInt(limit as string, 10), 100);

    const query: any = { userId: req.user!._id };
    
    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      query.$or = [
        { done: searchRegex },
        { doing: searchRegex },
        { blockers: searchRegex },
        { date: searchRegex },
      ];
    }

    const total = await StandupEntry.countDocuments(query);
    
    const entries = await StandupEntry.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('userId', 'name avatar title')
      .populate('comments.userId', 'name avatar');

    const formattedData = entries.map(e => formatEntry(e, req.user?._id?.toString()));

    res.json({
      data: formattedData,
      meta: { page: pageNum, limit: limitNum, total }
    });
  } catch (error) {
    next(error);
  }
};

export const getMyStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await calculateUserStats(req.user!._id as any, req.user!.reminderFrequency);
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

export const getMyCalendar = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const targetMonth = month ? parseInt(month as string, 10) : now.getUTCMonth() + 1;
    const targetYear = year ? parseInt(year as string, 10) : now.getUTCFullYear();

    const startDate = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
    const endDate = new Date(Date.UTC(targetYear, targetMonth, 0)); // last day of month
    
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const entries = await StandupEntry.find({
      userId: req.user!._id,
      date: { $gte: startStr, $lte: endStr }
    }).select('date').lean();

    const submittedDates = new Set(entries.map(e => e.date));
    
    const todayStr = now.toISOString().split('T')[0];
    const calendar: Record<string, string> = {};

    for (let d = 1; d <= endDate.getUTCDate(); d++) {
      const iterDate = new Date(Date.UTC(targetYear, targetMonth - 1, d));
      const dateStr = iterDate.toISOString().split('T')[0];
      
      if (dateStr > todayStr) continue; // future dates omitted
      
      const dayStr = d.toString();
      const isWeekend = iterDate.getUTCDay() === 0 || iterDate.getUTCDay() === 6;

      if (dateStr === todayStr) {
        calendar[dayStr] = 'today';
      } else if (isWeekend) {
        calendar[dayStr] = 'weekend';
      } else if (submittedDates.has(dateStr)) {
        calendar[dayStr] = 'submitted';
      } else {
        calendar[dayStr] = 'missed';
      }
    }

    res.json(calendar);
  } catch (error) {
    next(error);
  }
};

export const createStandup = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user!.teamId) {
      res.status(400).json({ error: { message: 'User must belong to a team to submit a standup' } });
      return;
    }

    const { done, doing, blockers } = req.body;
    const todayStr = new Date().toISOString().split('T')[0];

    const exists = await StandupEntry.exists({ userId: req.user!._id, date: todayStr });
    if (exists) {
      res.status(409).json({ error: { message: 'Standup already exists for today. Use PUT /api/standups/:id instead.' } });
      return;
    }

    const entry = await StandupEntry.create({
      userId: req.user!._id,
      teamId: req.user!.teamId,
      date: todayStr,
      done,
      doing,
      blockers,
    });

    // Populate for response
    await entry.populate('userId', 'name avatar title');
    
    res.status(201).json(formatEntry(entry, req.user?._id?.toString()));
  } catch (error) {
    next(error);
  }
};

export const updateStandup = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { done, doing, blockers } = req.body;
    
    const entry = await StandupEntry.findById(req.params.id);
    if (!entry) {
      res.status(404).json({ error: { message: 'Standup entry not found' } });
      return;
    }

    if (entry.userId.toString() !== req.user!._id?.toString()) {
      res.status(403).json({ error: { message: 'Forbidden: You can only edit your own standup' } });
      return;
    }

    entry.done = done;
    entry.doing = doing;
    entry.blockers = blockers;
    
    await entry.save();
    await entry.populate('userId', 'name avatar title');
    await entry.populate('comments.userId', 'name avatar');

    res.json(formatEntry(entry, req.user?._id?.toString()));
  } catch (error) {
    next(error);
  }
};

export const addComment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { text } = req.body;
    
    const entry = await StandupEntry.findById(req.params.id);
    if (!entry) {
      res.status(404).json({ error: { message: 'Standup entry not found' } });
      return;
    }

    entry.comments.push({
      userId: req.user!._id as any,
      text,
      createdAt: new Date(),
    } as any);

    await entry.save();
    
    await entry.populate('userId', 'name avatar title');
    await entry.populate('comments.userId', 'name avatar');

    res.json(formatEntry(entry, req.user?._id?.toString()));
  } catch (error) {
    next(error);
  }
};

export const toggleReaction = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { emoji } = req.body;
    const userId = req.user!._id;
    
    const entry = await StandupEntry.findById(req.params.id);
    if (!entry) {
      res.status(404).json({ error: { message: 'Standup entry not found' } });
      return;
    }

    const existingReactionIndex = entry.reactions.findIndex(
      r => r.emoji === emoji && r.userId.toString() === userId?.toString()
    );

    if (existingReactionIndex !== -1) {
      // Remove reaction
      entry.reactions.splice(existingReactionIndex, 1);
    } else {
      // Add reaction
      entry.reactions.push({ emoji, userId } as any);
    }

    await entry.save();
    
    await entry.populate('userId', 'name avatar title');
    await entry.populate('comments.userId', 'name avatar');

    res.json(formatEntry(entry, req.user?._id?.toString()));
  } catch (error) {
    next(error);
  }
};
