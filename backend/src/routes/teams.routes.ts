import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth, requireAdmin, requireLeadOrAdmin } from '../middleware/auth';
import {
  getTeams, getTeamById, createTeam, updateTeam,
  addMember, removeMember, addQuestion, removeQuestion,
  nudgeTeam, nudgeMember, createAndAddMember
} from '../controllers/teams.controller';

const router = Router();
router.use(requireAuth);

const createTeamSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    scheduleHour: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/),
    timezone: z.string().optional(),
    category: z.enum(['Active', 'Underperforming', 'Archived']).optional(),
  })
});

const updateTeamSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    scheduleHour: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/).optional(),
    timezone: z.string().optional(),
    category: z.enum(['Active', 'Underperforming', 'Archived']).optional(),
  })
});

const memberSchema = z.object({
  body: z.object({
    userId: z.string().min(1)
  })
});

const questionSchema = z.object({
  body: z.object({
    text: z.string().min(1)
  })
});

const createMemberSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    title: z.string().optional(),
    role: z.enum(['member', 'lead']).optional(),
  })
});

router.get('/', requireAdmin, getTeams);
router.get('/:id', getTeamById);

router.post('/', requireAdmin, validate(createTeamSchema), createTeam);
router.patch('/:id', requireLeadOrAdmin, validate(updateTeamSchema), updateTeam);

router.post('/:id/members', requireLeadOrAdmin, validate(memberSchema), addMember);
router.post('/:id/members/create', requireLeadOrAdmin, validate(createMemberSchema), createAndAddMember);
router.delete('/:id/members/:userId', requireLeadOrAdmin, removeMember);

router.post('/:id/questions', requireLeadOrAdmin, validate(questionSchema), addQuestion);
router.delete('/:id/questions/:questionId', requireLeadOrAdmin, removeQuestion);

router.post('/:id/nudge', requireLeadOrAdmin, nudgeTeam);
router.post('/:id/members/:userId/nudge', requireLeadOrAdmin, nudgeMember);

export default router;
