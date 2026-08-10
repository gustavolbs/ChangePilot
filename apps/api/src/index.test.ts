import { describe, it, expect } from "vitest";
import { app } from "./index.js";

describe("My Hono App", () => {
  it("should return 200 response", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
  });
});

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await app.request("/health");
    const data = await res.json();
    expect(data.status).toBe("ok");
  });
});
