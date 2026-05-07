import { buildApp } from "../app"; // adjust path if needed

test("GET /health should return ok", async () => {
  const app = await buildApp();

  const response = await app.inject({
    method: "GET",
    url: "/health"
  });

  expect(response.statusCode).toBe(200);
  expect(JSON.parse(response.body)).toEqual({
    status: "ok"
  });
});