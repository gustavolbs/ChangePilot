import { describe, expect, it } from "vitest";
import { app } from "./index.js";

describe("GET /health", () => {
  it("returns API health", async () => {
    const response = await app.request("/health");
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      status: "ok",
      service: "changepilot-api",
    });
  });
});
