import { prisma } from "../lib/db";
import { UnAuthorizedError, CustomErrorCode } from "../exceptions";
import { generateJwtToken, TOKEN_TYPE, verifyPassword } from "../helpers";
import crypto from "crypto";
import jwt from 'jsonwebtoken';

// Helper function to hash tokens
function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

export class AdminAuthService {

    // Admin login with single session enforcement
    public static async login(email: string, password: string, user_agent?: string, ip_address?: string) {

        // Find admin by email
        const admin = await prisma.admins.findUnique({
            where: { email }
        });

        if (!admin) {
            throw new UnAuthorizedError({
                msg: "Invalid email or password",
                errorCode: CustomErrorCode.AUTH_INVALID
            });
        }

        // Verify password
        const passwordValid = await verifyPassword(password, admin.password_hash);
        if (!passwordValid) {
            throw new UnAuthorizedError({
                msg: "Invalid email or password",
                errorCode: CustomErrorCode.AUTH_INVALID
            });
        }

        // Use ACID transaction to ensure atomicity
        const result = await prisma.$transaction(async (tx) => {

            // 1. Revoke all existing active tokens for this admin
            await tx.adminTokens.updateMany({
                where: {
                    admin_id: admin.id,
                    is_revoked: false
                },
                data: {
                    is_revoked: true
                }
            });

            // 2. Generate new JWT token using simple approach
            const jwtToken = jwt.sign(
                { userId: admin.id, email: admin.email },
                process.env.JWT_SECRET || 'your_secret_key',
                { expiresIn: '7d' }
            );
            // 3. Hash the token for storage
            const tokenHash = hashToken(jwtToken);

            // 4. Set expiry (7 days from now)
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            // 5. Create new token record
            await tx.adminTokens.create({
                data: {
                    admin_id: admin.id,
                    token_hash: tokenHash,
                    user_agent: user_agent || null,
                    ip_address: ip_address || null,
                    expires_at: expiresAt
                }
            });

            return jwtToken;
        });

        // TODO: Clear old Redis cache key (uncomment when Redis is configured)
        // await redis.del(`admin_session:${admin.id}`);

        return {
            success: true,
            message: "Login successful",
            data: { token: result }
        };
    }

    // Verify if token is valid and not revoked
    public static async verifyToken(token: string) {
        const tokenHash = hashToken(token);

        const tokenRecord = await prisma.adminTokens.findFirst({
            where: {
                token_hash: tokenHash,
                is_revoked: false,
                expires_at: {
                    gt: new Date()
                }
            }
        });

        if (!tokenRecord) {
            throw new UnAuthorizedError({
                msg: "Invalid or expired token. Please login again.",
                errorCode: CustomErrorCode.AUTH_INVALID
            });
        }

        return tokenRecord;
    }

    // Logout - revoke the current token
    public static async logout(token: string) {
        const tokenHash = hashToken(token);

        await prisma.adminTokens.updateMany({
            where: {
                token_hash: tokenHash,
                is_revoked: false
            },
            data: {
                is_revoked: true
            }
        });

        return {
            success: true,
            message: "Logged out successfully"
        };
    }
}