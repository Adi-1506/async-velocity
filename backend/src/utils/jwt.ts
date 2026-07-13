import jwt from 'jsonwebtoken';
import { Response } from 'express';
import mongoose from 'mongoose';

export const generateToken = (userId: mongoose.Types.ObjectId): string => {
  return jwt.sign({ id: userId.toString() }, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any,
  });
};

export const setTokenCookie = (res: Response, token: string) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const clearTokenCookie = (res: Response) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('jwt', '', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    expires: new Date(0),
  });
};
