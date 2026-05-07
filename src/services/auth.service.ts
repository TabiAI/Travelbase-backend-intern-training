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
import {BadRequestError, CustomErrorCode, NotFoundError} from "../exceptions";
// Souce of Truth -> Database

class AuthService {

    static initialize() {
        new AuthService();
    }

    public static async signup(input: SignupDTO): Promise<IService> {

        const {email} = input;
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
        // internals of this is that, const allocate a fixed memory space in the heap for the object we aare assigning it to.

        // let and var are different from const in that, they can be re-assigned to a different value or object, while const cannot be re-assigned. However, the properties of an object assigned to a const variable can still be modified.

        return {
            success: true,
            message: "Signup successful",
            data: {}
        }
    }

    public static async login(input: LoginDTO): Promise<IService> {

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
                accessToken: "",
                refreshToken: "",
                user: {}
            }
        }
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
        
        // Check if user exists
        const user = await prisma.users.findUnique({
            where: { email }
        });
        
        // For security, don't reveal if email exists or not
        if (!user) {
            return {
                success: true,
                message: "If an account exists, a password reset link has been sent to your email",
            }
        }
        
        // Generate a secure random token
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        // Token expires in 1 hour
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        
        // Store token in database
        await prisma.userToken.upsert({
            where: { userId: user.id },
            update: {
                resetPasswordToken: resetToken,
                resetPasswordExpires: expiresAt,
            },
            create: {
                userId: user.id,
                resetPasswordToken: resetToken,
                resetPasswordExpires: expiresAt,
            },
        });
        
        // Log token for testing (remove in production)
        console.log(`\n 🔐 RESET TOKEN FOR ${email}: ${resetToken}\n`);
        
        return {
            success: true,
            message: "If an account exists, a password reset link has been sent to your email",
        }
    }
    public static async resetPassword(input: ResetPasswordDTO): Promise<IService> {
        const { token, newPassword, deviceId } = input;
        
        // Find the token in database
        const tokenRecord = await prisma.userToken.findFirst({
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
        await prisma.users.update({
            where: { id: tokenRecord.userId },
            data: { password: hashedPassword },
        });
        
        // Delete the used token
        await prisma.userToken.update({
            where: { userId: tokenRecord.userId },
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



    // Refresh Tokens -> These are tokens use in the background to keep the user logged in without them having to re-enter their credentials.
    // They are usually long-lived and can be used to obtain new access tokens when the old ones expire.
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