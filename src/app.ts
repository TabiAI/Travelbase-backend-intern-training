import { buildServer } from "./server";

export async function buildApp() {
    const app = buildServer();
    await app.ready();
    return app;
}