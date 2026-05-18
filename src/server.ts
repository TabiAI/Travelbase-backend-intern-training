import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { healthRoutes } from './routes';
import { welcomeroutes } from './routes';
// import rateLimit from "@fastify/rate-limit";
import {healthRoutes, AuthRouter, UserRouter} from './routes';
import {config} from "./config";
import {ALLOWED_HEADERS, ALLOWED_METHODS} from "./enums";
import {fastifyErrorHandler} from "./exceptions";
import {requireAuthHook, requireDeviceHook} from "./middlewares";

export function buildServer() {
    const app = Fastify({logger: true});

    app.register(cors, {
        origin: config.system.corsOrigin ?? true,
        methods: Object.values(ALLOWED_METHODS),
        allowedHeaders: Object.values(ALLOWED_HEADERS),
    });

    // app.register(rateLimit, {
    //     max: Number(config.system.rateLimitMax ?? 120),
    //     timeWindow: config.system.rateLimitWindowMs ?? "1 minute",
    // });

    app.addHook("preHandler", requireDeviceHook)
    app.addHook("preHandler", requireAuthHook);
    app.register(AuthRouter);
    app.register(UserRouter);
    app.register(healthRoutes);
    app.register(welcomeroutes); 

    // Ensure this is always the last route registered to catch any unhandled routes and errors
    app.setErrorHandler(fastifyErrorHandler);
    return app;
    
}