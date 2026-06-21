import {
    ForgotPasswordDTO,
    IService,
    LoginDTO,
    RefreshTokenDTO,
    SignupDTO,
    VerifyDeviceChangeOTPDTO
} from "../interfaces";

import {prisma} from "../lib/db";
import {BadRequestError, CustomErrorCode, NotFoundError, UnAuthorizedError} from "../exceptions";
import {generateJwtToken, hashPassword, TOKEN_TYPE, verifyPassword, verifyToken} from "../helpers";
import { ReferralService } from "./referral.service"; // <-- Import our new Referral Service

const referralService = new ReferralService(); // <-- Instantiate the Referral Service



class AuthService {

    static initialize() {
        new AuthService();
    }

    public static async signup(input: SignupDTO & { referralCode?: string }): Promise<IService> {
        // Updated destructuring to pull referralCode from the input payload
        const {email, password, firstName, lastName, phone, company, deviceId, referralCode} = input;

        const existingUser = await prisma.users.findUnique({where: {email}});
        if (existingUser) {
            throw new BadRequestError({
                msg: "Account with the email already exists",
                errorCode: CustomErrorCode.DUPLICATE_RESOURCE
            });
        }

        const passwordHash = await hashPassword(password);

        const {user, accessToken, refreshToken} = await prisma.$transaction(async (tx) => {
            // Automatically assign the user their own referral code right on database record creation
            const user = await tx.users.create({
                data: {
                    email, 
                    firstName, 
                    lastName, 
                    phone, 
                    company,
                    referralCode: referralService.generateInitialCode(company ?? undefined)
                },
            });

            // If a referral code was provided by the prospect, process the relationship and commission
            if (referralCode) {
                try {
                    await referralService.processSignupReferral(tx, user.id, referralCode);
                } catch (error: any) {
                    throw new BadRequestError({
                        msg: error.message === "INVALID_REFERRAL_CODE"
                            ? "The provided referral code is invalid."
                            : error.message === "SELF_REFERRAL_FORBIDDEN"
                            ? "You cannot refer yourself."
                            : "Failed to process referral code.",
                        errorCode: CustomErrorCode.AUTH_INVALID
                    });
                }
            }

            await tx.userAuths.create({
                data: {userId: user.id, passwordHash, recognisedDevices: [deviceId]},
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
                data: {userId: user.id, deviceId, accessToken, refreshToken},
            });

            return {user, accessToken, refreshToken};
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
        const {email, password, deviceId} = input;

        const user = await prisma.users.findUnique({
            where: {email},
        });
        if (!user) {
            throw new UnAuthorizedError({
                msg: "Invalid email or password",
                errorCode: CustomErrorCode.AUTH_INVALID,
            });
        }

        const userAuth = await prisma.userAuths.findFirst({
            where: {userId: user.id},
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

        const isRecognisedDevice = userAuth.recognisedDevices.includes(deviceId);
        if (!isRecognisedDevice) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

            await prisma.userVerifications.create({
                data: {userId: user.id, token: otp, deviceId, expiresAt},
            });

            // TODO: send OTP to user.email via email service

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
            where: {userId: user.id, deviceId},
            data: {accessToken, refreshToken},
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

    public static async forgotPassword(input: ForgotPasswordDTO): Promise<IService> {
        return {
            success: true,
            message: "Password reset link sent to your email",
            data: {
                confirmationToken: "" 
            }
        }
    }

    public static async resetPassword(input: ForgotPasswordDTO): Promise<IService> {
        return {
            success: true,
            message: "Password reset successful",
        }
    }

}

export default AuthService;