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

// Source of Truth -> Database

class AuthService {

    static initialize() {
        new AuthService();
    }

    public static async signup(input: SignupDTO): Promise<IService> {
        const {email, password, firstName, lastName, phone, company, deviceId} = input;

        const existingUser = await prisma.users.findUnique({where: {email}});
        if (existingUser) {
            throw new BadRequestError({
                msg: "Account with the email already exists",
                errorCode: CustomErrorCode.DUPLICATE_RESOURCE
            });
        }

        const passwordHash = await hashPassword(password);

        const {user, accessToken, refreshToken} = await prisma.$transaction(async (tx) => {
            const user = await tx.users.create({
                data: {email, firstName, lastName, phone, company},
            });

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
                confirmationToken: "" // a jwt token that will used an header to verify the reset is coming from our server initiated request
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