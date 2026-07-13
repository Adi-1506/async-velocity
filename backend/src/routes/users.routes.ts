import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import {
  getProfile, updateProfile, updateNotifications, updateGithub,
  addRepo, removeRepo, testDigest
} from '../controllers/users.controller';

const router = Router();
router.use(requireAuth);

const profileSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    avatar: z.string().url().optional(),
    timezone: z.string().optional(),
    onboardingCompleted: z.boolean().optional(),
  })
});

const notificationsSchema = z.object({
  body: z.object({
    slackConnected: z.boolean().optional(),
    teamsConnected: z.boolean().optional(),
    emailDigest: z.boolean().optional(),
    reminderTime: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/).optional(),
    reminderFrequency: z.enum(['daily', 'weekdays', 'custom']).optional(),
  })
});

const githubSchema = z.object({
  body: z.object({
    githubConnected: z.boolean().optional(),
    githubReposType: z.enum(['all', 'selected']).optional(),
    selectedRepos: z.array(z.string()).optional(),
  })
});

const repoSchema = z.object({
  body: z.object({
    repo: z.string().min(1)
  })
});

router.get('/me', getProfile);
router.patch('/me', validate(profileSchema), updateProfile);
router.patch('/me/notifications', validate(notificationsSchema), updateNotifications);
router.patch('/me/github', validate(githubSchema), updateGithub);
router.post('/me/repos', validate(repoSchema), addRepo);
router.delete('/me/repos/:repo', removeRepo);
router.post('/me/test-digest', testDigest);

export default router;
