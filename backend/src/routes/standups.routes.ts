import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import {
  getFeed, getMyHistory, getMyStats, getMyCalendar,
  createStandup, updateStandup, addComment, toggleReaction
} from '../controllers/standups.controller';

const router = Router();
router.use(requireAuth);

const standupSchema = z.object({
  body: z.object({
    done: z.array(z.string().trim().min(1)).max(20),
    doing: z.array(z.string().trim().min(1)).max(20),
    blockers: z.array(z.string().trim().min(1)).max(20).optional().default([]),
  }).refine(data => data.done.length > 0 || data.doing.length > 0, {
    message: "At least one item in 'done' or 'doing' is required",
    path: ['done'] // attaching error to done
  })
});

const commentSchema = z.object({
  body: z.object({
    text: z.string().trim().min(1)
  })
});

const ALLOWED_EMOJIS = ['👍', '🔥', '💡', '🙌', '👀'] as const;

const reactionSchema = z.object({
  body: z.object({
    emoji: z.enum(ALLOWED_EMOJIS, { errorMap: () => ({ message: 'Invalid emoji' }) })
  })
});

router.get('/feed', getFeed);
router.get('/me', getMyHistory);
router.get('/me/stats', getMyStats);
router.get('/me/calendar', getMyCalendar);

router.post('/', validate(standupSchema), createStandup);
router.put('/:id', validate(standupSchema), updateStandup);

router.post('/:id/comments', validate(commentSchema), addComment);
router.post('/:id/reactions', validate(reactionSchema), toggleReaction);

export default router;
