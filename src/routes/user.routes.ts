import {FastifyInstance, FastifyReply, FastifyRequest} from "fastify";
import {UserCtrl} from "../controllers";
import {requireAuthHook} from "../middlewares";

UserCtrl.initialize();

export async function UserRouter(app: FastifyInstance) {
    app.post("/v1/users/me", async (request: FastifyRequest, reply: FastifyReply) => UserCtrl.getUserProfile(request, reply));
    app.patch("/v1/user/change-password", {preHandler: requireAuthHook}, async (request: FastifyRequest, reply: FastifyReply) => UserCtrl.changePassword(request, reply));


    app.get("/hello", async () => {
        return { 
            message: "Good day Michael, I just built my first new route!" 
        };
    });
}