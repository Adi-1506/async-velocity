import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Team } from '../models/Team';
import { User } from '../models/User';
import { StandupEntry } from '../models/StandupEntry';
import { calculateTeamStats, calculateUserStats } from '../services/streaks.service';
import { notifyMember } from '../services/notify.service';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const getTeams = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const teams = await Team.find();
    const todayStr = new Date().toISOString().split('T')[0];
    
    const enrichedTeams = await Promise.all(
      teams.map(async (team) => {
        const stats = await calculateTeamStats(team._id as any);
        
        // Get members for this team segment
        const membersList = await User.find({ teamId: team._id }).select('name avatar title reminderFrequency');
        
        const enrichedMembers = await Promise.all(membersList.map(async (member) => {
          const userStats = await calculateUserStats(member._id as any, member.reminderFrequency);
          
          const latestEntry = await StandupEntry.findOne({ userId: member._id }).sort({ createdAt: -1 });
          const hasSubmittedToday = await StandupEntry.exists({ userId: member._id, date: todayStr });
          
          return {
            id: member._id.toString(),
            name: member.name,
            avatar: member.avatar,
            role: member.title, // Map title to role for frontend compatibility
            lastSubmitted: latestEntry ? latestEntry.createdAt.toISOString() : null,
            hasSubmittedToday: !!hasSubmittedToday,
            streak: userStats.currentStreak,
          };
        }));

        return {
          ...team.toJSON(),
          ...stats,
          members: enrichedMembers,
        };
      })
    );

    res.json({ data: enrichedTeams });
  } catch (error) {
    next(error);
  }
};

export const getTeamById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const teamId = req.params.id;
    const team = await Team.findById(teamId);
    
    if (!team) {
      res.status(404).json({ error: { message: 'Team not found' } });
      return;
    }

    // Authorization: Admin or member of the team
    if (req.user!.role !== 'admin' && req.user!.teamId?.toString() !== teamId) {
      res.status(403).json({ error: { message: 'Forbidden' } });
      return;
    }

    const stats = await calculateTeamStats(team._id as any);
    
    // Get members
    const membersList = await User.find({ teamId }).select('name avatar title reminderFrequency');
    
    const todayStr = new Date().toISOString().split('T')[0];
    
    const enrichedMembers = await Promise.all(membersList.map(async (member) => {
      const userStats = await calculateUserStats(member._id as any, member.reminderFrequency);
      
      const latestEntry = await StandupEntry.findOne({ userId: member._id }).sort({ createdAt: -1 });
      const hasSubmittedToday = await StandupEntry.exists({ userId: member._id, date: todayStr });
      
      return {
        id: member._id.toString(),
        name: member.name,
        avatar: member.avatar,
        role: member.title, // Map title to role for frontend compatibility
        lastSubmitted: latestEntry ? latestEntry.createdAt.toISOString() : null,
        hasSubmittedToday: !!hasSubmittedToday,
        streak: userStats.currentStreak,
      };
    }));

    res.json({
      ...team.toJSON(),
      ...stats,
      members: enrichedMembers,
    });
  } catch (error) {
    next(error);
  }
};

export const createTeam = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, scheduleHour, timezone, category } = req.body;

    const exists = await Team.findOne({ name });
    if (exists) {
      res.status(409).json({ error: { message: 'Team name already exists' } });
      return;
    }

    const team = await Team.create({
      name,
      scheduleHour,
      timezone: timezone || 'UTC+0',
      category: category || 'Active',
      questions: [],
    });

    res.status(201).json(team);
  } catch (error) {
    next(error);
  }
};

export const updateTeam = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, category, scheduleHour, timezone } = req.body;
    
    const team = await Team.findById(req.params.id);
    if (!team) {
      res.status(404).json({ error: { message: 'Team not found' } });
      return;
    }

    if (name !== undefined) team.name = name;
    if (category !== undefined) team.category = category;
    if (scheduleHour !== undefined) team.scheduleHour = scheduleHour;
    if (timezone !== undefined) team.timezone = timezone;

    await team.save();
    res.json(team);
  } catch (error) {
    next(error);
  }
};

export const addMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;
    const teamId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: { message: 'User not found' } });
      return;
    }

    user.teamId = new mongoose.Types.ObjectId(teamId);
    await user.save();

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: { message: 'User not found' } });
      return;
    }

    user.teamId = null;
    await user.save();

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

export const addQuestion = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { text } = req.body;
    const team = await Team.findById(req.params.id);
    
    if (!team) {
      res.status(404).json({ error: { message: 'Team not found' } });
      return;
    }

    team.questions.push({ text } as any);
    await team.save();

    res.json(team);
  } catch (error) {
    next(error);
  }
};

export const removeQuestion = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { questionId } = req.params;
    const team = await Team.findById(req.params.id);
    
    if (!team) {
      res.status(404).json({ error: { message: 'Team not found' } });
      return;
    }

    team.questions = team.questions.filter(q => q._id.toString() !== questionId) as any;
    await team.save();

    res.json(team);
  } catch (error) {
    next(error);
  }
};

export const nudgeTeam = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const teamId = req.params.id;
    const todayStr = new Date().toISOString().split('T')[0];
    
    const members = await User.find({ teamId });
    const nudgedList = [];

    for (const member of members) {
      const hasSubmitted = await StandupEntry.exists({ userId: member._id, date: todayStr });
      if (!hasSubmitted) {
        await notifyMember(member._id as any, "Don't forget to submit your standup today!");
        nudgedList.push({ id: member._id.toString(), name: member.name });
      }
    }

    res.json({ data: nudgedList });
  } catch (error) {
    next(error);
  }
};

export const nudgeMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    
    const member = await User.findById(userId);
    if (!member) {
      res.status(404).json({ error: { message: 'User not found' } });
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const hasSubmitted = await StandupEntry.exists({ userId: member._id, date: todayStr });
    
    if (!hasSubmitted) {
      await notifyMember(member._id as any, "Don't forget to submit your standup today!");
      res.json({ nudged: true, user: { id: member._id.toString(), name: member.name } });
    } else {
      res.json({ nudged: false, message: 'User already submitted today' });
    }
  } catch (error) {
    next(error);
  }
};

export const createAndAddMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, title, role } = req.body;
    const teamId = req.params.id;

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(409).json({ error: { message: 'User already exists' } });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      passwordHash,
      title: title || (role === 'lead' ? 'Tech Lead' : 'Engineer'),
      role: role || 'member',
      teamId: new mongoose.Types.ObjectId(teamId),
      avatar: `https://images.unsplash.com/photo-${role === 'lead' ? '1534528741775-53994a69daeb' : '1539571696357-5a69c17a67c6'}?w=150`,
    });

    res.status(201).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};
