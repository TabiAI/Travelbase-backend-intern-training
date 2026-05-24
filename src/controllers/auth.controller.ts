import AuthService from "../services/auth.service";
import { FastifyReply, FastifyRequest } from "fastify";
import { sendResponse } from "../helpers";
import { 
    LoginRequest, 
    SignupRequest, 
    ForgotPasswordRequest, 
    ResetPasswordRequest,
    VerifyDeviceChangeRequest, 
    RefreshTokenRequest 
} from "../schemas";

class AuthController {
    static initialize() {
        new AuthController();
    }

    constructor() {
        AuthService.initialize();
    }

    public static async signup(request: FastifyRequest, reply: FastifyReply) {
        const { email, password, firstName, lastName, phone, company } = SignupRequest.parse(request.body ?? {});
        const result = await AuthService.signup({
            email,
            password,
            firstName,
            lastName,
            phone,
            company: company || '',
            deviceId: request.headers['x-device-id'] as string,
        });
        return sendResponse(reply, result, 201);
    }

    public static async login(request: FastifyRequest, reply: FastifyReply) {
        const { email, password } = LoginRequest.parse(request.body ?? {});
        const result = await AuthService.login({
            deviceId: request.headers['x-device-id'] as string,
            email,
            password,
        });
        return sendResponse(reply, result);
    }

    public static async forgotPassword(request: FastifyRequest, reply: FastifyReply) {
        const { email } = ForgotPasswordRequest.parse(request.body ?? {});
        const result = await AuthService.forgotPassword({
            deviceId: request.headers['x-device-id'] as string,
            email,
        });
        return sendResponse(reply, result);
    }

    public static async resetPassword(request: FastifyRequest, reply: FastifyReply) {
        const { token, newPassword } = ResetPasswordRequest.parse(request.body ?? {});
        const result = await AuthService.resetPassword({
            deviceId: request.headers['x-device-id'] as string,
            token,
            newPassword,
        });
        return sendResponse(reply, result);
    }

    public static async verifyDeviceChange(request: FastifyRequest, reply: FastifyReply) {
        const {otp} = VerifyDeviceChangeRequest.parse(request.body ?? {});
        const result = await AuthService.verifyDeviceChange({
            deviceId: <string>request.headers['x-device-id'],
            otp,
        });
        return sendResponse(reply, result);
    }

    public static async refreshToken(request: FastifyRequest, reply: FastifyReply) {
        const {refreshToken} = RefreshTokenRequest.parse(request.body ?? {});
        const result = await AuthService.refreshToken({
            deviceId: <string>request.headers['x-device-id'],
            refreshToken,
        });
        return sendResponse(reply, result);
    }
}

export const AuthenticationController = AuthController;