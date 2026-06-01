import crypto from "crypto";
//import bcrypt from "bcrypt";
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

        // REMOVED recognisedDevices from here
        await tx.userAuths.create({
            data: { userId: user.id, passwordHash },
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
            data: { userId: user.id, 
                deviceId:deviceId,
                 accessToken, refreshToken },
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
    
    // Find user (don't reveal if exists for security)
    const user = await prisma.users.findUnique({ where: { email } });
    
    if (!user) {
        return {
            success: true,
            message: "If an account exists, an OTP has been sent to your email",
        }
    }
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry
    
    // Delete any existing reset OTP for this user+device
    await prisma.userVerifications.deleteMany({
        where: { 
            userId: user.id, 
            deviceId,
            resetPasswordOTP: { not: null }
        }
    });
    
    // Store OTP in userVerifications table
    await prisma.userVerifications.create({
        data: {
            userId: user.id,
            deviceId:deviceId,
            resetPasswordOTP: otp,
            resetPasswordExpires: expiresAt,
            token: crypto.randomBytes(32).toString('hex'), // required field
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // required field
        }
    }as any);
    
    // Log OTP for testing (remove in production)
    console.log(`\n 🔐 PASSWORD RESET OTP FOR ${email}: ${otp}\n`);
    
    return {
        success: true,
        message: "If an account exists, an OTP has been sent to your email",
    }
}



    public static async resetPassword(input: ResetPasswordDTO): Promise<IService> {
    const { otp, newPassword, deviceId } = input;
    
    // Find valid OTP in userVerifications table
    const otpRecord = await prisma.userVerifications.findFirst({
        where: {
            resetPasswordOTP: otp,
            resetPasswordExpires: { gt: new Date() },
            deviceId: deviceId,
        },
        include: { user: true },
    });
    
    if (!otpRecord || !otpRecord.user) {
        throw new BadRequestError({
            msg: "Invalid or expired OTP",
            errorCode: CustomErrorCode.AUTH_INVALID,
        });
    }
    
    // Hash the new password using helper
    const hashedPassword = await hashPassword(newPassword);
    
    // Update password in userAuths
    await prisma.userAuths.updateMany({
        where: { userId: otpRecord.user.id },
        data: { passwordHash: hashedPassword },
    });
    
    // Delete the used OTP (cleanup)
    await prisma.userVerifications.deleteMany({
        where: {
            userId: otpRecord.user.id,
            resetPasswordOTP: otp,
        }
    });
    
    return {
        success: true,
        message: "Password has been reset successfully",
    }
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