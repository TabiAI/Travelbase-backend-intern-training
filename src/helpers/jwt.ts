import jwt from 'jsonwebtoken';
import {config} from '../config';

export enum TOKEN_TYPE {
    AUTH_TOKEN = 'AUTH_TOKEN',
    REFRESH_TOKEN = 'REFRESH_TOKEN',
    RESET_TOKEN = 'RESET_TOKEN',
}

export interface TokenPayload {
    userId: string;
    email: string;
    deviceId: string;
    tokenType: TOKEN_TYPE;
}

export function generateJwtToken(payload: TokenPayload): string {
    if (payload.tokenType === TOKEN_TYPE.AUTH_TOKEN) {
        return jwt.sign(payload, config.jwt.secret, {
            expiresIn: config.jwt.accessExpiresIn as jwt.SignOptions['expiresIn'],
        });
    } else if (payload.tokenType === TOKEN_TYPE.REFRESH_TOKEN) {
        return jwt.sign(payload, config.jwt.secret, {
            expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
        });
    } else if (payload.tokenType === TOKEN_TYPE.RESET_TOKEN) {
        return jwt.sign(payload, config.jwt.secret, {
            expiresIn: '1h',
        });
    }
    throw new Error('Invalid token type');
}

export function verifyToken(token: string): TokenPayload {
    return jwt.verify(token, config.jwt.secret) as TokenPayload;
}
