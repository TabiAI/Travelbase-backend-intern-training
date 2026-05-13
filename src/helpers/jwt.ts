import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
//import {config} from '../config';

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

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

console.log('JWT_SECRET:', JWT_SECRET ? 'FOUND' : 'MISSING');

export function generateJwtToken(payload: TokenPayload): string {
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined');
    }
    
    // Remove tokenType from payload to avoid issues
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
        throw new Error('JWT_SECRET is not defined');
    }
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
}