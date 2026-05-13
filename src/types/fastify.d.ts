import "fastify";

declare module "fastify" {
    interface FastifyRequest {
        adminAuthMethod?: string;
        adminUsername?: string;
        user?: {
            id: string;
            email: string;
        };
        rawBody?: string;
    }
}
