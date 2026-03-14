import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const ITERATIONS = 120000;
const KEYLEN = 64;
const DIGEST = 'sha512';

export class AuthService {
    static hashPassword(password: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const salt = crypto.randomBytes(16).toString('hex');
            crypto.pbkdf2(password, salt, ITERATIONS, KEYLEN, DIGEST, (err, derivedKey) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(`${ITERATIONS}:${salt}:${derivedKey.toString('hex')}`);
            });
        });
    }

    static verifyPassword(password: string, stored: string): Promise<boolean> {
        const [iterationsStr, salt, hash] = stored.split(':');
        const iterations = Number(iterationsStr || ITERATIONS);
        return new Promise((resolve, reject) => {
            crypto.pbkdf2(password, salt, iterations, KEYLEN, DIGEST, (err, derivedKey) => {
                if (err) {
                    reject(err);
                    return;
                }
                const computed = derivedKey.toString('hex');
                resolve(crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash)));
            });
        });
    }

    static signAccessToken(payload: { userId: string; email: string }) {
        const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
        return jwt.sign(payload, secret, { expiresIn: '15m' });
    }

    static signRefreshToken(payload: { userId: string }) {
        const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'dev_refresh_secret_change_me';
        return jwt.sign(payload, secret, { expiresIn: '30d' });
    }

    static verifyAccessToken(token: string): any {
        const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
        return jwt.verify(token, secret);
    }

    static verifyRefreshToken(token: string): any {
        const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'dev_refresh_secret_change_me';
        return jwt.verify(token, secret);
    }
}
