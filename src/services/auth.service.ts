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
import { BadRequestError, CustomErrorCode, NotFoundError } from "../exceptions";
// Souce of Truth -> Database

class AuthService {

    static initialize() {
        new AuthService();
    }

    public static async signup(input: SignupDTO): Promise<IService> {

        const { email, password, firstName, lastName } = input;
        const existingUser = await prisma.users.findUnique({
            where: {
                email
            }
        });

        if (existingUser) {
            throw new BadRequestError({
                msg: "Account with the email already exists",
                errorCode: CustomErrorCode.DUPLICATE_RESOURCE
            });
        }
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const result = await prisma.$transaction(async (tx) => {
            // Create user
            const user = await tx.users.create({
                data: {
                    email,
                    firstName,
                    lastName,
                }
            });


            const userAuth = await tx.userAuths.create({
                data: {
                    userId: user.id,
                    passwordHash: hashedPassword,
                }
            });

            return { user, userAuth };
        });
        // internals of this is that, const allocate a fixed memory space in the heap for the object we aare assigning it to.

        // let and var are different from const in that, they can be re-assigned to a different value or object, while const cannot be re-assigned. However, the properties of an object assigned to a const variable can still be modified.

        return {
            success: true,
            message: "Signup successful",
            data: {
                user: {
                    id: result.user.id,
                    email: result.user.email,
                    firstName: result.user.firstName,
                    lastName: result.user.lastName
                }
            }
        }
    }
    public static async login(input: LoginDTO): Promise<IService> {
        const { email, password, deviceId } = input;


        const user = await prisma.users.findUnique({
            where: { email },
            include: {
                UserAuths: true,
                UserTokens: true
            }
        });

        if (!user) {
            throw new BadRequestError({
                msg: "Invalid credentials",
                errorCode: CustomErrorCode.AUTH_INVALID
            });
        }


        const userAuth = user.UserAuths[0];
        if (!userAuth) {
            throw new BadRequestError({
                msg: "Invalid credentials",
                errorCode: CustomErrorCode.AUTH_INVALID
            });
        }

        const isValidPassword = await bcrypt.compare(password, userAuth.passwordHash);

        if (!isValidPassword) {
            throw new BadRequestError({
                msg: "Invalid credentials",
                errorCode: CustomErrorCode.AUTH_INVALID
            });
        }

        const existingToken = user.UserTokens.find(token => token.deviceId === deviceId);

        if (!existingToken) {
            // Device not recognized - need verification
            return {
                success: false,
                message: "New device detected. Please verify with OTP",
                data: { requiresOTP: true, userId: user.id }
            }
        }
        // Generate tokens

        const accessToken = crypto.randomBytes(32).toString('hex');
        const refreshToken = crypto.randomBytes(40).toString('hex');

        // Update tokens

        await prisma.userTokens.update({
            where: { id: existingToken.id },
            data: {
                accessToken: accessToken,
                refreshToken: refreshToken,
                deviceId: deviceId
            }
        });

        //check if the user email is valid and verify the user exist in the database
        // verify they are using the right password...
        // verify the deviceId is a recognised device, if not,
        // we send an email OTP to the user email to let them know that an
        // unrecognised device is trying to access their account from a location
        // that is not recognised.
        // if the device is not recognised, we block the user from logging in and sent them email OTP to verify their identity.

        // if all are true, we generate a JWT tokens and return it to the client.

        return {
            success: true,
            message: "Login successful",
            data: {
                accessToken: accessToken,
                refreshToken: refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName
                }
            }
        }
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
        const { token, newPassword, deviceId } = input;

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