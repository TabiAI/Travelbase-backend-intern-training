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

import {prisma} from "../lib/db";
import {BadRequestError, CustomErrorCode, UnAuthorizedError} from "../exceptions";
import {generateJwtToken, TOKEN_TYPE, hashPassword, verifyPassword} from "../helpers";

// Source of Truth -> Database

class AuthService {

    static initialize() {
        new AuthService();
    }

    public static async signup(input: SignupDTO): Promise<IService> {
    try {
        console.log('1. Signup started');
        const {email, password, firstName, lastName, phone, company, deviceId} = input;
        
        console.log('2. Checking existing user');
        const existingUser = await prisma.users.findUnique({where: {email}});
        if (existingUser) {
            throw new BadRequestError({
                msg: "Account with the email already exists",
                errorCode: CustomErrorCode.DUPLICATE_RESOURCE
            });
        }

        console.log('3. Creating password hash');
        const passwordHash = await hashPassword(password);

        console.log('4. Starting transaction');
        const {user, accessToken, refreshToken} = await prisma.$transaction(async (tx) => {
            console.log('4a. Creating user');
            const user = await tx.users.create({
                data: {email, firstName, lastName, phone, company},
            });
            console.log('4b. User created:', user.id);

            console.log('4c. Creating userAuth');
            await tx.userAuths.create({
                data: {userId: user.id, passwordHash, recognisedDevices: deviceId},
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
                data: {userId: user.id, deviceId, accessToken, refreshToken},
            });

            return {user, accessToken, refreshToken};
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
    } catch (error) {
        console.error('Signup error details:', error);
        throw error;
    }
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

        // 2. Verify auth row exists
        const userAuth = await prisma.userAuths.findFirst({
            where: {userId: user.id},
            select: {
                id: true,
                userId: true,
                passwordHash: true,
                recognisedDevices: true,
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

        const isRecognisedDevice = userAuth.recognisedDevices === deviceId;
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
            where: {userId: user.id},
            data: { accessToken, refreshToken, deviceId },
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
        const { userId, otp, deviceId } = input;
        // Find verification record
        const verification = await prisma.userVerifications.findFirst({
            where: {
                userId: userId,
                token: otp,
                deviceId: deviceId,
                expiresAt: {
                    gt: new Date()
                }
            }
        });
        if (!verification) {
            throw new BadRequestError({
                msg: "Invalid or expired OTP",
                errorCode: CustomErrorCode.AUTH_INVALID
            });
        }
        // Generate tokens for new device
        const accessToken = crypto.randomBytes(32).toString('hex');
        const refreshToken = crypto.randomBytes(40).toString('hex');

        await prisma.userTokens.create({
            data: {
                userId: userId,
                accessToken: accessToken,
                refreshToken: refreshToken,
                deviceId: deviceId
            }
        });

        // Delete used verification
        await prisma.userVerifications.delete({
            where: { id: verification.id }
        });

        // Get user details
        const user = await prisma.users.findUnique({
            where: { id: userId }
        });

        return {
            success: true,
            message: "Device change verified",
            data: {
                accessToken: accessToken,
                refreshToken: refreshToken,
                user: {
                    id: user?.id,
                    email: user?.email,
                    firstName: user?.firstName,
                    lastName: user?.lastName
                }
            }
        }
    }
    public static async forgotPassword(input: ForgotPasswordDTO): Promise<IService> {
        const { email, deviceId } = input;

        // Check if user exists
        const user = await prisma.users.findUnique({
            where: { email }
        });

        // For security, don't reveal if email exists or not
        if (!user) {
            return {
                success: true,
                message: "If an account exists, a password reset link has been sent to your email",
                data: {}
            }
        }

        // Generate a secure random token
        const resetToken = crypto.randomBytes(32).toString('hex');

        // Token expires in 1 hour
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        // Store token in database - update or create UserTokens
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
                    refreshToken: crypto.randomBytes(40).toString('hex'), // Temporary
                    accessToken: crypto.randomBytes(32).toString('hex')   // Temporary
                }
            });
        }

        // Log token for testing (remove in production)
        console.log(`\n  RESET TOKEN FOR ${email}: ${resetToken}\n`);
        console.log(` Reset link: http://localhost:3000/reset-password?token=${resetToken}\n`);


        return {
            success: true,
            message: "If an account exists, a password reset link has been sent to your email",
            data: {}
        }
    }
    public static async resetPassword(input: ResetPasswordDTO): Promise<IService> {
        const { token, newPassword } = input;

        // Find the token in database
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

        // Check if token exists and is valid
        if (!tokenRecord) {
            throw new BadRequestError({
                msg: "Invalid or expired reset token",
                errorCode: CustomErrorCode.AUTH_INVALID,
            });
        }

        // Hash the new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update user's password
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



    // Refresh Tokens -> These are tokens use in the background to keep the user logged in without them having to re-enter their credentials.
    // They are usually long-lived and can be used to obtain new access tokens when the old ones expire.
    public static async refreshToken(input: RefreshTokenDTO): Promise<IService> {
        const { refreshToken, deviceId } = input;
        const tokenRecord = await prisma.userTokens.findFirst({
            where: {
                refreshToken: refreshToken,
                deviceId: deviceId
            },
            include: {
                user: true
            }
        });
        if (!tokenRecord) {
            throw new BadRequestError({
                msg: "Invalid or expired refresh token",
                errorCode: CustomErrorCode.AUTH_INVALID
            });
        }
        // Generate new tokens
        const newAccessToken = crypto.randomBytes(32).toString('hex');
        const newRefreshToken = crypto.randomBytes(40).toString('hex');

        // Update tokens
        await prisma.userTokens.update({
            where: { id: tokenRecord.id },
            data: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            }
        });

        return {
            success: true,
            message: "Token refreshed",
            data: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                user: {
                    id: tokenRecord.user.id,
                    email: tokenRecord.user.email,
                    firstName: tokenRecord.user.firstName,
                    lastName: tokenRecord.user.lastName
                }
            }
        }
    }

    
}


export default AuthService;