import { Router } from 'express';
import { BlueprintController } from '../controllers/Shelf/BlueprintController';

const router = Router();

// /api/shelf/blueprints
router.post('/blueprints', BlueprintController.create);
router.get('/blueprints/:id', BlueprintController.get);
router.get('/blueprints', BlueprintController.list);

export const ShelfRoutes = router;
