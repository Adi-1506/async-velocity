import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { sendTestDigestEmail } from '../services/notify.service';

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!._id).populate('teamId');
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, avatar, timezone, onboardingCompleted } = req.body;
    
    if (name !== undefined) req.user!.name = name;
    if (avatar !== undefined) req.user!.avatar = avatar;
    if (timezone !== undefined) req.user!.timezone = timezone;
    if (onboardingCompleted !== undefined) req.user!.onboardingCompleted = onboardingCompleted;

    await req.user!.save();
    const populated = await User.findById(req.user!._id).populate('teamId');
    res.json(populated);
  } catch (error) {
    next(error);
  }
};

export const updateNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { slackConnected, teamsConnected, emailDigest, reminderTime, reminderFrequency } = req.body;

    if (slackConnected !== undefined) req.user!.slackConnected = slackConnected;
    if (teamsConnected !== undefined) req.user!.teamsConnected = teamsConnected;
    if (emailDigest !== undefined) req.user!.emailDigest = emailDigest;
    if (reminderTime !== undefined) req.user!.reminderTime = reminderTime;
    if (reminderFrequency !== undefined) req.user!.reminderFrequency = reminderFrequency;

    await req.user!.save();
    const populated = await User.findById(req.user!._id).populate('teamId');
    res.json(populated);
  } catch (error) {
    next(error);
  }
};

export const updateGithub = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { githubConnected, githubReposType, selectedRepos } = req.body;

    if (githubConnected !== undefined) req.user!.githubConnected = githubConnected;
    if (githubReposType !== undefined) req.user!.githubReposType = githubReposType;
    if (selectedRepos !== undefined) req.user!.selectedRepos = selectedRepos;

    await req.user!.save();
    const populated = await User.findById(req.user!._id).populate('teamId');
    res.json(populated);
  } catch (error) {
    next(error);
  }
};

export const addRepo = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { repo } = req.body;
    
    if (req.user!.selectedRepos.includes(repo)) {
      res.status(409).json({ error: { message: 'Repo already exists in selection' } });
      return;
    }

    req.user!.selectedRepos.push(repo);
    await req.user!.save();
    res.json(req.user);
  } catch (error) {
    next(error);
  }
};

export const removeRepo = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { repo } = req.params;
    
    req.user!.selectedRepos = req.user!.selectedRepos.filter((r: string) => r !== repo);
    await req.user!.save();
    res.json(req.user);
  } catch (error) {
    next(error);
  }
};

export const testDigest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await sendTestDigestEmail(req.user!._id as any);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
