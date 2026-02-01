import { Request, Response } from 'express';


// utils/controllerUtils.ts
export const withAuth = (
    handler: (token: string, req: Request, res: Response) => Promise<any>
) => {
    return async (req: Request, res: Response) => {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                 res.status(401).json({ error: 'Unauthorized: No token provided' });
                 return;
            }

            const result = await handler(token, req, res);
            

            if (!res.headersSent && result !== undefined) {
                res.status(200).json(result);
            }
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    };
};