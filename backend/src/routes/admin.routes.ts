import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { getOrgStats } from '../controllers/admin.controller';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/stats', getOrgStats);

export default router;
