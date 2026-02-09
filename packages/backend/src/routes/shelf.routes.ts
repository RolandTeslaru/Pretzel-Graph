import { Router } from 'express';
import { ShelfService } from '../services/Shelf/service';

const router = Router();

router.use('/', ShelfService.routes);

export const ShelfRoutes = router;
