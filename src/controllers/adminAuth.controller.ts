import { FastifyRequest, FastifyReply } from "fastify";
import { AdminAuthService } from "../services/adminAuth.service";

export class AdminAuthController {

    public static async login(request: FastifyRequest, reply: FastifyReply) {
        const { email, password } = request.body as any;
        const user_agent = request.headers['user-agent'];
        const ip_address = request.ip;

        const result = await AdminAuthService.login(email, password, user_agent, ip_address);
        return reply.status(200).send(result);
    }

    public static async logout(request: FastifyRequest, reply: FastifyReply) {
        const token = (request.headers['authorization'] as string)?.replace('Bearer ', '');
        
        if (!token) {
            return reply.status(400).send({ success: false, message: "Token required" });
        }

        const result = await AdminAuthService.logout(token);
        return reply.status(200).send(result);
    }

    public static async verifyToken(request: FastifyRequest, reply: FastifyReply) {
        const token = (request.headers['authorization'] as string)?.replace('Bearer ', '');
        
        if (!token) {
            return reply.status(401).send({ success: false, message: "Token required" });
        }

        await AdminAuthService.verifyToken(token);
        return reply.status(200).send({ success: true, message: "Token is valid" });
    }
}