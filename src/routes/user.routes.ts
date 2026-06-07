import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { UserCtrl } from "../controllers";
import { requireAuthHook } from "../middlewares";

export async function userRoutes(app: FastifyInstance) {
    
    // Get current user's profile - WITH AUTH ✅
    app.get("/v1/users/profile", 
        { preHandler: requireAuthHook },  // ← ADD THIS
        async (request: FastifyRequest, reply: FastifyReply) => 
            UserCtrl.getProfile(request, reply)
    );

    // Update current user's profile - WITH AUTH ✅
    app.put("/v1/users/profile", 
        { preHandler: requireAuthHook },  // ← ADD THIS
        async (request: FastifyRequest, reply: FastifyReply) => 
            UserCtrl.updateProfile(request, reply)
    );

    // Get user by ID - WITH AUTH ✅
    app.get("/v1/users/:id", 
        { preHandler: requireAuthHook },  // ← ADD THIS
        async (request: FastifyRequest, reply: FastifyReply) => 
            UserCtrl.getProfileById(request, reply)
    );

    // Get current user via /me endpoint - WITH AUTH ✅
    app.post("/v1/users/me", 
        { preHandler: requireAuthHook },  // ← ADD THIS
        async (request: FastifyRequest, reply: FastifyReply) => 
            UserCtrl.getProfile(request, reply)
    );
    
    // Change password - WITH AUTH ✅ (already had it)
    app.patch("/v1/user/change-password", 
        { preHandler: requireAuthHook }, 
        async (request: FastifyRequest, reply: FastifyReply) => 
            UserCtrl.changePassword(request, reply)
    );
}