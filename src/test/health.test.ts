import { describe, it, expect } from "@jest/globals";
import { buildServer } from "../server";

describe("Health Check", () => {
    it("GET /health should return 200", async () => {
    const app = buildServer();
    
    // Wait for server to be ready
    await app.ready();
    
    const response = await app.inject({
        method: "GET",
        url: "/health"
    });
    
    expect(response.statusCode).toBe(200);
})});