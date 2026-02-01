import { Request, Response } from 'express';
import { BlueprintService } from '../../services/Shelf/BlueprintService';
import { Shelf } from '@vx-agent-builder/shared/types';

export class BlueprintController {

    static async create(req: Request, res: Response) {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                res.status(401).json({ error: 'Unauthorized: No token provided' });
                return;
            }

            // Validate Payload
            const payload = Shelf.API.Blueprint.Create.Request.parse(req.body);

            const result = await BlueprintService.create(token, payload);
            res.status(200).json(result);
        } catch (error: any) {
            console.error(error);
            // Distinguish Zod errors (400) from Server errors (500)
            if (error.issues) {
                res.status(400).json({ error: error.issues });
                return;
            }
            res.status(500).json({ error: error.message });
        }
    }

    static async get(req: Request, res: Response) {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const { id } = req.params;
            const result = await BlueprintService.get(token, id as string);
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async list(req: Request, res: Response) {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const drawerId = req.query.drawerId as string | undefined;
            const result = await BlueprintService.list(token, drawerId);
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}
