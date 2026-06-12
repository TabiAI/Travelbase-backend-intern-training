import {FastifyInstance} from "fastify";
import {IService} from "../interfaces";

export async function healthRoutes(app: FastifyInstance) {
    app.get("/health", async (): Promise<IService> => {
        return {
            success: true,
            message: "Posi Here, Typescript & fastify training",
            data: {
                time: new Date().toISOString(),
                timeZone: "Asia/Qatar"
            }
        };
    });
}
