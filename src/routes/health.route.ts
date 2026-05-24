import {FastifyInstance} from "fastify";
import {IService} from "../interfaces";

export async function healthRoutes(app: FastifyInstance) {
    app.get("/health", async (): Promise<IService> => {
        return {
            success: true,
            message: "Hello World! I am Saeed and i am just starting to train on fastify",
            data: {
                time: new Date().toISOString(),
                timeZone: "Asia/Qatar"
            }
        };
    });
}
