import type { FastifyInstance } from "fastify";
import { ApiError, sendError, sendSuccess } from "../lib/http.js";
import { arciumService } from "../services/arcium-service.js";

export const registerArciumRoutes = async (app: FastifyInstance) => {
  app.get("/api/arcium/status", async (_request, reply) => {
    try {
      return sendSuccess(reply, await arciumService.getStatus());
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/arcium/prepare-underwriting", async (request, reply) => {
    try {
      return sendSuccess(
        reply,
        await arciumService.prepareUnderwritingPayload(request.body),
        201
      );
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/arcium/decrypt-result", async (request, reply) => {
    try {
      return sendSuccess(reply, await arciumService.decryptResult(request.body));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/arcium/mxe-public-key", async (_request, reply) => {
    try {
      return sendSuccess(reply, await arciumService.refreshMxePublicKeyFromChain());
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post<{
    Body: { session_id: string };
  }>("/api/arcium/submit-to-mxe", async (request, reply) => {
    try {
      const { session_id } = request.body;

      if (!session_id) {
        return sendError(reply, new ApiError(
          "MISSING_SESSION_ID",
          "session_id is required",
          400
        ));
      }

      const result = await arciumService.submitToMXE(session_id);
      return sendSuccess(reply, result, 201);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get<{
    Querystring: { session_id: string };
  }>("/api/arcium/poll-result", async (request, reply) => {
    try {
      const { session_id } = request.query;

      if (!session_id) {
        return sendError(reply, new ApiError(
          "MISSING_SESSION_ID",
          "session_id query parameter is required",
          400
        ));
      }

      const result = await arciumService.pollMXEResult(session_id);
      return sendSuccess(reply, result);
    } catch (error) {
      return sendError(reply, error);
    }
  });
};
