import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AuthenticationController } from "../controllers";

AuthenticationController.initialize();

export async function AuthRouter(app: FastifyInstance) {
    // Signup & Login
    app.post("/v1/auth/signup", async (request: FastifyRequest, reply: FastifyReply) => {
        return AuthenticationController.signup(request, reply);
    });
    
    app.post("/v1/auth/login", async (request: FastifyRequest, reply: FastifyReply) => {
        return AuthenticationController.login(request, reply);
    });

    // Forgot & Reset Password
    app.post("/v1/auth/forgot-password", async (request: FastifyRequest, reply: FastifyReply) => {
        return AuthenticationController.forgotPassword(request, reply);
    });

    app.post("/v1/auth/reset-password", async (request: FastifyRequest, reply: FastifyReply) => {
        return AuthenticationController.resetPassword(request, reply);
    });

    // Verify Device & Refresh Token
    app.post("/v1/auth/verify-device-change", async (request, reply) => {
        return AuthenticationController.verifyDeviceChange(request, reply);
    });

    app.post("/v1/auth/refresh-token", async (request, reply) => {
        return AuthenticationController.refreshToken(request, reply);
    });
}