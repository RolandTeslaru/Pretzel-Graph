import { Request, Response } from 'express';


export const withHandler = (
    handler: (req: Request, res: Response) => Promise<any> | any
) => {
    return async (req: Request, res: Response) => {
        try {
            const result = await handler(req, res);

            if (!res.headersSent && result !== undefined) {
                res.status(200).json(result);
            }
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    };
};


export const withAuth = (
    handler: (token: string, req: Request, res: Response) => Promise<any> | any
) => {
    return withHandler(async (req, res) => {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            throw Object.assign(new Error('Unauthorized: No token provided'), { statusCode: 401 });
        }
        return handler(token, req, res);
    });
};

export type WithAuth<F extends (...args: any[]) => any> =
    (token: string, ...args: Parameters<F>) => ReturnType<F>
