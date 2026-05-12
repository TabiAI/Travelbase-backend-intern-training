import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {UserCtrl} from "../controllers";

export async function userRoutes(app: FastifyInstance) {
    // Get current user's profile
    app.get("/v1/users/profile", 
        async (request: FastifyRequest, reply: FastifyReply) => 
            UserCtrl.getProfile(request, reply)
    );

    // Update current user's profile
    app.put("/v1/users/profile", 
        async (request: FastifyRequest, reply: FastifyReply) => 
            UserCtrl.updateProfile(request, reply)
    );

    // Get user by ID (admin only - implement auth check)
    app.get("/v1/users/:id", 
        async (request: FastifyRequest, reply: FastifyReply) => 
            UserCtrl.getProfileById(request, reply)
    )}