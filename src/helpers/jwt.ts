import jwt from 'jsonwebtoken';
import { config } from '../config';

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

const JWT_SECRET = config.jwt.secret;
const ACCESS_EXPIRES = config.jwt.accessExpiresIn;
const REFRESH_EXPIRES = config.jwt.refreshExpiresIn;

export function generateJwtToken(payload: TokenPayload): string {
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined in config');
    }
    
    const { tokenType, ...cleanPayload } = payload;
    
    if (payload.tokenType === TOKEN_TYPE.AUTH_TOKEN) {
        return jwt.sign(cleanPayload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES as any });
    } else if (payload.tokenType === TOKEN_TYPE.REFRESH_TOKEN) {
        return jwt.sign(cleanPayload, JWT_SECRET, { expiresIn: REFRESH_EXPIRES as any });
    } else if (payload.tokenType === TOKEN_TYPE.RESET_TOKEN) {
        return jwt.sign(cleanPayload, JWT_SECRET, { expiresIn: '1h' as any });
    }
    throw new Error('Invalid token type');
}

export function verifyToken(token: string): TokenPayload {
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined in config');
    }
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
}