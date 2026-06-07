import { FastifyInstance } from "fastify";
import { AdminAuthController } from "../controllers/adminAuth.controller.ts";

export async function adminRoutes(app: FastifyInstance) {
    
    app.post("/v1/admin/login", async (request, reply) => {
        return AdminAuthController.login(request, reply);
    });

    app.post("/v1/admin/logout", async (request, reply) => {
        return AdminAuthController.logout(request, reply);
    });

    app.get("/v1/admin/verify", async (request, reply) => {
        return AdminAuthController.verifyToken(request, reply);
    });
}