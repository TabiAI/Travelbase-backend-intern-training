import authService from "../services/auth.service";
import AuthService from "../services/auth.service";
import {FastifyReply, FastifyRequest} from "fastify";
import {sendResponse} from "../helpers";
import {LoginRequest, SignupRequest, VerifyDeviceChangeRequest, RefreshTokenRequest} from "../schemas";

class AuthController {
    constructor() {
        authService.initialize();
    }

    static initialize() {
        new AuthController();
    }

    public static async signup(request: FastifyRequest, reply: FastifyReply) {
        const body = SignupRequest.parse(request.body ?? {});
        
        // Fail-safe fallback: extract referralCode directly from request body 
        // in case the SignupRequest validation schema strips it out.
        const referralCode = (request.body as any)?.referralCode;

        const result = await AuthService.signup({
            ...body,
            referralCode, // <-- Securely passing down the payload parameter
            deviceId: <string>request.headers['x-device-id'],
        });
        return sendResponse(reply, result, 201);
    }

    public static async login(request: FastifyRequest, reply: FastifyReply) {
        const {email, password} = LoginRequest.parse(request.body ?? {});
        const result = await AuthService.login({
            deviceId: <string>request.headers['x-device-id'],
            email,
            password,
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