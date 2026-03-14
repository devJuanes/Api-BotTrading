import { NextFunction, Request, Response } from 'express';
import { AuthService } from '../services/AuthService';

export interface AuthenticatedRequest extends Request {
    auth?: {
        userId: string;
        email: string;
    };
}

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization || '';
    const [, token] = authHeader.split(' ');
    if (!token) {
        res.status(401).json({ message: 'Token requerido' });
        return;
    }
    try {
        const decoded = AuthService.verifyAccessToken(token) as any;
        req.auth = { userId: decoded.userId, email: decoded.email };
        next();
    } catch (_error) {
        res.status(401).json({ message: 'Token inválido o expirado' });
    }
};
