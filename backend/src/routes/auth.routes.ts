import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { register, login, logout, getMe, demoLogin } from '../controllers/auth.controller';
import rateLimit from 'express-rate-limit';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: { message: 'Too many requests from this IP, please try again after 15 minutes' } }
});

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    title: z.string().optional()
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string()
  })
});

const demoSchema = z.object({
  body: z.object({
    role: z.enum(['member', 'admin'])
  })
});

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/demo-login', authLimiter, validate(demoSchema), demoLogin);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, getMe);

export default router;
