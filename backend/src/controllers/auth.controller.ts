import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import bcrypt from 'bcryptjs';
import { generateToken, setTokenCookie, clearTokenCookie } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, title } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(409).json({ error: { message: 'User already exists' } });
      return;
    }

    const salt = await bcrypt.genSalt(Number(process.env.BCRYPT_SALT_ROUNDS) || 10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      passwordHash,
      title: title || 'Team Member',
    });

    const token = generateToken(user._id as any);
    setTokenCookie(res, token);

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, expectedRole } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ error: { message: 'Invalid email or password' } });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ error: { message: 'Invalid email or password' } });
      return;
    }

    if (expectedRole && user.role !== expectedRole) {
      res.status(403).json({ error: { message: `Access denied. Account is not a ${expectedRole}.` } });
      return;
    }

    const token = generateToken(user._id as any);
    setTokenCookie(res, token);

    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    clearTokenCookie(res);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user; // already fetched in requireAuth
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const demoLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = req.body; // 'member' or 'admin'
    
    // Seed emails
    const email = role === 'admin' ? 'cto@asyncvelocity.internal' : 'sarah@asyncvelocity.internal';
    
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ error: { message: 'Demo user not found. Did you run the seed script?' } });
      return;
    }

    const token = generateToken(user._id as any);
    setTokenCookie(res, token);

    res.json(user);
  } catch (error) {
    next(error);
  }
};
