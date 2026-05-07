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
