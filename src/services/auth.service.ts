import crypto from "crypto";
//@ts-ignore
import bcrypt from "bcrypt";
import {
    ForgotPasswordDTO,
    IService,
    LoginDTO,
    RefreshTokenDTO,
    ResetPasswordDTO,
    SignupDTO,
    VerifyDeviceChangeOTPDTO
} from "../interfaces";

import {prisma} from "../lib/db";
import {BadRequestError, CustomErrorCode, NotFoundError, UnAuthorizedError} from "../exceptions";
import {generateJwtToken, hashPassword, TOKEN_TYPE, verifyPassword, verifyToken} from "../helpers";

// Source of Truth -> Database

class AuthService {

    static initialize() {
        new AuthService();
    }

    public static async signup(input: SignupDTO): Promise<IService> {
        console.log('1. Signup started');
        const { email, password, firstName, lastName, phone, company, deviceId } = input;
        
        console.log('2. Checking existing user');
        const existingUser = await prisma.users.findUnique({ where: { email } });
        if (existingUser) {
            throw new BadRequestError({
                msg: "Account with the email already exists",
                errorCode: CustomErrorCode.DUPLICATE_RESOURCE
            });
        }

        console.log('3. Creating password hash');
        const passwordHash = await hashPassword(password);

        console.log('4. Starting transaction');
        const { user, accessToken, refreshToken } = await prisma.$transaction(async (tx) => {
            console.log('4a. Creating user');
            const user = await tx.users.create({
                data: { email, firstName, lastName, phone, company },
            });
            console.log('4b. User created:', user.id);

            console.log('4c. Creating userAuth');
            await tx.userAuths.create({
                data: { userId: user.id, passwordHash },
            });

            console.log('4d. Generating tokens');
            const accessToken = generateJwtToken({
                userId: user.id,
                email: user.email,
                deviceId,
                tokenType: TOKEN_TYPE.AUTH_TOKEN
            });
            const refreshToken = generateJwtToken({
                userId: user.id,
                email: user.email,
                deviceId,
                tokenType: TOKEN_TYPE.REFRESH_TOKEN
            });

            console.log('4e. Creating userTokens');
            await tx.userTokens.create({
                data: { userId: user.id, deviceId, accessToken, refreshToken },
            });

            return { user, accessToken, refreshToken };
        });

        console.log('5. Signup successful');
        return {
            success: true,
            message: "Signup successful",
            data: {
                accessToken,
                refreshToken,
                user,
            },
        };
    }

    public static async login(input: LoginDTO): Promise<IService> {
        const { email, password, deviceId } = input;

        const user = await prisma.users.findUnique({ where: { email } });
        if (!user) {
            throw new UnAuthorizedError({
                msg: "Invalid email or password",
                errorCode: CustomErrorCode.AUTH_INVALID,
            });
        }

        const userAuth = await prisma.userAuths.findFirst({
            where: { userId: user.id },
            select: {
                id: true,
                userId: true,
                passwordHash: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!userAuth) {
            throw new UnAuthorizedError({
                msg: "Invalid email or password",
                errorCode: CustomErrorCode.AUTH_INVALID,
            });
        }

        const passwordMatch = await verifyPassword(password, userAuth.passwordHash);
        if (!passwordMatch) {
            throw new UnAuthorizedError({
                msg: "Invalid email or password",
                errorCode: CustomErrorCode.AUTH_INVALID,
            });
        }

        const accessToken = generateJwtToken({
            userId: user.id,
            email: user.email,
            deviceId,
            tokenType: TOKEN_TYPE.AUTH_TOKEN
        });
        const refreshToken = generateJwtToken({
            userId: user.id,
            email: user.email,
            deviceId,
            tokenType: TOKEN_TYPE.REFRESH_TOKEN
        });

        await prisma.userTokens.deleteMany({
            where: { userId: user.id, deviceId: deviceId },
        });

        await prisma.userTokens.create({
            data: {
                userId: user.id,
                deviceId: deviceId,
                accessToken: accessToken,
                refreshToken: refreshToken,
            },
        });

        return {
            success: true,
            message: "Login successful",
            data: {
                accessToken,
                refreshToken,
                user,
            },
        };
    }

    public static async verifyDeviceChange(input: VerifyDeviceChangeOTPDTO): Promise<IService> {
        const {otp, deviceId} = input;

        const verification = await prisma.userVerifications.findFirst({
            where: {token: otp, deviceId}
        });

        if (!verification) {
            throw new BadRequestError({
                msg: "Invalid OTP",
                errorCode: CustomErrorCode.AUTH_INVALID
            });
        }

        if (verification.expiresAt < new Date()) {
            await prisma.userVerifications.delete({where: {id: verification.id}});
            throw new BadRequestError({
                msg: "OTP has expired",
                errorCode: CustomErrorCode.AUTH_EXPIRED
            });
        }

        await prisma.userVerifications.delete({where: {id: verification.id}});

        const user = await prisma.users.findUnique({where: {id: verification.userId}});
        if (!user) {
            throw new NotFoundError({msg: "user not found", errorCode: CustomErrorCode.RESOURCE_NOT_FOUND})
        }

        const accessToken = generateJwtToken({
            userId: user.id,
            tokenType: TOKEN_TYPE.AUTH_TOKEN,
            email: user.email,
            deviceId
        });
        const refreshToken = generateJwtToken({
            userId: user.id,
            tokenType: TOKEN_TYPE.REFRESH_TOKEN,
            email: user.email,
            deviceId
        });

        await prisma.userTokens.create({
            data: {userId: verification.userId, accessToken, refreshToken, deviceId}
        });

        return {
            success: true,
            message: "Device change verified",
            data: {accessToken, refreshToken, user}
        };
    }

    public static async forgotPassword(input: ForgotPasswordDTO): Promise<IService> {
        const { email, deviceId } = input;

        const user = await prisma.users.findUnique({
            where: { email }
        });

        if (!user) {
            return {
                success: true,
                message: "If an account exists, a password reset link has been sent to your email",
                data: {}
            }
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        const existingToken = await prisma.userTokens.findFirst({
            where: { userId: user.id, deviceId: deviceId }
        });

        if (existingToken) {
            await prisma.userTokens.update({
                where: { id: existingToken.id },
                data: {
                    resetPasswordToken: resetToken,
                    resetPasswordExpires: expiresAt,
                }
            });
        } else {
            await prisma.userTokens.create({
                data: {
                    userId: user.id,
                    deviceId: deviceId,
                    resetPasswordToken: resetToken,
                    resetPasswordExpires: expiresAt,
                    refreshToken: crypto.randomBytes(40).toString('hex'),
                    accessToken: crypto.randomBytes(32).toString('hex')
                }
            });
        }

        // SECURITY: Only log in development, never expose token
        if (process.env.NODE_ENV === 'development') {
            console.log(`Password reset requested for: ${email}`);
        }

        return {
            success: true,
            message: "If an account exists, a password reset link has been sent to your email",
            data: {}
        }
    }

    public static async resetPassword(input: ResetPasswordDTO): Promise<IService> {
        const { token, newPassword } = input;

        const tokenRecord = await prisma.userTokens.findFirst({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: {
                    gt: new Date(),
                },
            },
            include: {
                user: true,
            },
        });

        if (!tokenRecord) {
            throw new BadRequestError({
                msg: "Invalid or expired reset token",
                errorCode: CustomErrorCode.AUTH_INVALID,
            });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        await prisma.userAuths.updateMany({
            where: { userId: tokenRecord.user.id },  
            data: { passwordHash: hashedPassword },
        });
        await prisma.userTokens.update({
            where: { id: tokenRecord.id },
            data: {
                resetPasswordToken: null,
                resetPasswordExpires: null,
            },
        });

        return {
            success: true,
            message: "Password has been reset successfully",
            data: {}
        }
    }

    public static async changePassword(userId: string, input: { 
        currentPassword: string; 
        newPassword: string; 
        deviceId: string 
    }): Promise<IService> {
        const { currentPassword, newPassword, deviceId } = input;

        const userAuth = await prisma.userAuths.findFirst({
            where: { userId },
        });
        
        if (!userAuth) {
            throw new UnAuthorizedError({
                msg: "User not found",
                errorCode: CustomErrorCode.AUTH_INVALID,
            });
        }

        const isMatch = await verifyPassword(currentPassword, userAuth.passwordHash);
        if (!isMatch) {
            throw new UnAuthorizedError({
                msg: "Current password is incorrect",
                errorCode: CustomErrorCode.AUTH_INVALID,
            });
        }

        const isSamePassword = await verifyPassword(newPassword, userAuth.passwordHash);
        if (isSamePassword) {
            throw new BadRequestError({
                msg: "New password must be different from current password",
                errorCode: CustomErrorCode.BAD_REQUEST,
            });
        }

        const newPasswordHash = await hashPassword(newPassword);

        await prisma.userAuths.updateMany({
            where: { userId },
            data: { passwordHash: newPasswordHash },
        });

        await prisma.userTokens.updateMany({
            where: { userId, deviceId },
            data: { deviceId },
        });

        return {
            success: true,
            message: "Password changed successfully",
            data: {},
        };
    }

    public static async refreshToken(input: RefreshTokenDTO): Promise<IService> {
        const {refreshToken, deviceId} = input;

        const tokenRecord = await prisma.userTokens.findFirst({
            where: {refreshToken}
        });

        if (!tokenRecord) {
            throw new BadRequestError({
                msg: "Session expired, please login again",
                errorCode: CustomErrorCode.SESSION_EXPIRED
            });
        }

        if (tokenRecord.deviceId !== deviceId) {
            throw new BadRequestError({
                msg: "Device mismatch detected",
                errorCode: CustomErrorCode.AUTH_BLOCKED
            });
        }

        const user = await prisma.users.findUnique({where: {id: tokenRecord.userId}});

        if (!user) {
            throw new NotFoundError({msg: "user not found", errorCode: CustomErrorCode.RESOURCE_NOT_FOUND})
        }

        const tokenPayload = verifyToken(refreshToken);
        if (!tokenPayload || tokenPayload.tokenType !== TOKEN_TYPE.REFRESH_TOKEN || tokenPayload.deviceId !== deviceId) {
            throw new BadRequestError({
                msg: "Invalid token",
                errorCode: CustomErrorCode.AUTH_INVALID
            });
        }

        const newAccessToken = generateJwtToken({
            userId: user.id,
            tokenType: TOKEN_TYPE.AUTH_TOKEN,
            email: user.email,
            deviceId
        });
        const newRefreshToken = generateJwtToken({
            userId: user.id,
            tokenType: TOKEN_TYPE.REFRESH_TOKEN,
            email: user.email,
            deviceId
        });

        await prisma.userTokens.update({
            where: {id: tokenRecord.id},
            data: {accessToken: newAccessToken, refreshToken: newRefreshToken}
        });

        return {
            success: true,
            message: "Token refreshed",
            data: {accessToken: newAccessToken, refreshToken: newRefreshToken, user}
        };
    }
}

export default AuthService;