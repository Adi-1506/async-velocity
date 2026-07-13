import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;
  if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    res.status(401).json({ error: { message: 'Not authorized, no token' } });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      res.status(401).json({ error: { message: 'Not authorized, user not found' } });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: { message: 'Not authorized, token failed' } });
    return;
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: { message: 'Not authorized as an admin' } });
  }
};

export const requireLeadOrAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, no user found' });
  }
  
  if (req.user.role === 'admin') {
    return next();
  }

  if (req.user.role === 'lead' && req.user.teamId && req.user.teamId.toString() === req.params.id) {
    return next();
  }

  return res.status(403).json({ message: 'Not authorized. Requires Admin or Team Lead status for this team.' });
};
