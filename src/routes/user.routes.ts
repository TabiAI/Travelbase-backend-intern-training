import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { UserCtrl } from "../controllers";
import { requireAuthHook } from "../middlewares";

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

    // Get user by ID
    app.get("/v1/users/:id", 
        async (request: FastifyRequest, reply: FastifyReply) => 
            UserCtrl.getProfileById(request, reply)
    );


    // Get current user via /me endpoint
    app.post("/v1/users/me", 
        async (request: FastifyRequest, reply: FastifyReply) => 
            UserCtrl.getProfile(request, reply)
    );
    
    // Change password
    app.patch("/v1/user/change-password", 
        { preHandler: requireAuthHook }, 
        async (request: FastifyRequest, reply: FastifyReply) => 
            UserCtrl.changePassword(request, reply)
    );
}