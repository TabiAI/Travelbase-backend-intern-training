import crypto from "crypto";
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

import { prisma } from "../lib/db";
import { BadRequestError, CustomErrorCode, UnAuthorizedError } from "../exceptions";
import { generateJwtToken, TOKEN_TYPE, hashPassword, verifyPassword } from "../helpers";

class AuthService {

    static initialize() {
        new AuthService();
    }

    public static async signup(input: SignupDTO): Promise<IService> {
        const { email, password, firstName, lastName, phone, company, deviceId } = input;

        const existingUser = await prisma.users.findUnique({ where: { email } });
        if (existingUser) {
            throw new BadRequestError({
                msg: "Account with the email already exists",
                errorCode: CustomErrorCode.DUPLICATE_RESOURCE
            });
        }

        const passwordHash = await hashPassword(password);

        const { user, accessToken, refreshToken } = await prisma.$transaction(async (tx) => {
            const user = await tx.users.create({
                data: { email, firstName, lastName, phone, company },
            });

            await tx.userAuths.create({
                data: { userId: user.id, passwordHash, recognisedDevices: deviceId },
            });

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

            await tx.userTokens.create({
                data: { userId: user.id, deviceId, accessToken, refreshToken },
            });

            return { user, accessToken, refreshToken };
        });

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

        const isRecognisedDevice = userAuth.recognisedDevices === deviceId;
        if (!isRecognisedDevice) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

            await prisma.userVerifications.create({
                data: { userId: user.id, token: otp, deviceId, expiresAt },
            });

            throw new UnAuthorizedError({
                msg: "Unrecognised device. A verification code has been sent to your email.",
                errorCode: CustomErrorCode.AUTH_BLOCKED,
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

        await prisma.userTokens.updateMany({
            where: { userId: user.id, deviceId },
            data: { accessToken, refreshToken },
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
        return {
            success: true,
            message: "Device change verified",
            data: {
                accessToken: "",
                refreshToken: "",
                user: {}
            }
        }
    }

    public static async forgotPassword(input: ForgotPasswordDTO): Promise<IService> {
        const { email, deviceId } = input;
        
        const user = await prisma.users.findUnique({ where: { email } });
        
        if (!user) {
            return {
                success: true,
                message: "If an account exists, a password reset link has been sent to your email",
            }
        }
        
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        
        // Use userTokens table (plural)
        const existingToken = await prisma.userTokens.findFirst({
            where: { userId: user.id, deviceId }
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
                    deviceId,
                    resetPasswordToken: resetToken,
                    resetPasswordExpires: expiresAt,
                    refreshToken: crypto.randomBytes(40).toString('hex'),
                    accessToken: crypto.randomBytes(32).toString('hex')
                }
            });
        }
        
        console.log(`\n 🔐 RESET TOKEN FOR ${email}: ${resetToken}\n`);
        
        return {
            success: true,
            message: "If an account exists, a password reset link has been sent to your email",
        }
    }

    public static async resetPassword(input: ResetPasswordDTO): Promise<IService> {
        const { token, newPassword, deviceId } = input;
        
        const tokenRecord = await prisma.userTokens.findFirst({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { gt: new Date() },
            },
            include: { user: true },
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
        }
    }

    public static async refreshToken(input: RefreshTokenDTO): Promise<IService> {
        return {
            success: true,
            message: "Token refreshed",
            data: {
                accessToken: "",
                refreshToken: "",
                user: {}
            }
        }
    }
}

export default AuthService;