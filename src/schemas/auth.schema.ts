import {z} from "zod";

export const LoginRequest = z.object({
    email: z.email().min(4).max(255),
    password: z.string().min(8).max(128),
});

export const ForgotPasswordRequest = z.object({
    email: z.string().email().min(4).max(255),
});

export const ResetPasswordRequest = z.object({
    token: z.string().min(32),
    newPassword: z.string().min(8).max(128),
});
export const SignupRequest = z.object({
    email: z.email().min(4).max(255),
    password: z.string().min(8).max(128),
    firstName: z.string().min(4).max(100),
    lastName: z.string().min(4).max(100),
    phone: z.string().min(11).max(11),
    company: z.string().min(3).max(200),
});

export const VerifyDeviceChangeRequest = z.object({
    otp: z.string().min(6).max(6),
});

export const RefreshTokenRequest = z.object({
    refreshToken: z.string().min(1).max(255),

})
