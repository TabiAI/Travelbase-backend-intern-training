import {FastifyInstance, FastifyReply, FastifyRequest,} from "fastify";
import {AuthenticationController} from "../controllers";

AuthenticationController.initialize();

export async function AuthRouter(app: FastifyInstance) {
    app.post("/v1/auth/signup", async (request: FastifyRequest, reply: FastifyReply) => AuthenticationController.signup(request, reply));
    app.post("/v1/auth/login", async (request: FastifyRequest, reply: FastifyReply) => AuthenticationController.login(request, reply));
    app.post("/v1/auth/verify-device-change", async (request, reply) => AuthenticationController.verifyDeviceChange(request, reply));
    app.post("/v1/auth/refresh-token", async (request, reply) => AuthenticationController.refreshToken(request, reply));
}

