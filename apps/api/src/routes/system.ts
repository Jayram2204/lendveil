import type { FastifyInstance } from "fastify";
import { POLICY_VERSION, POLICY_VERSION_HASH } from "../config/policy.js";

export const registerSystemRoutes = async (app: FastifyInstance) => {
  app.get("/api/health", async () => {
    return {
      status: "ok",
      service: "lendveil-api",
      timestamp: new Date().toISOString()
    };
  });

  app.get("/api/status", async () => {
    return {
      service: "Lendveil",
      version: "0.1.0",
      policyVersion: POLICY_VERSION,
      policyHash: POLICY_VERSION_HASH,
      environment: process.env.NODE_ENV ?? "development",
      timestamp: new Date().toISOString()
    };
  });
};
