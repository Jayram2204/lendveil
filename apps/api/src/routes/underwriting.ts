import type { FastifyInstance } from "fastify";
import { ApiError, sendError, sendSuccess } from "../lib/http.js";
import { underwritingQueue } from "../queue/underwriting-queue.js";
import { underwritingService } from "../services/underwriting-service.js";

export const registerUnderwritingRoutes = async (app: FastifyInstance) => {
  app.post("/api/underwriting/request", async (request, reply) => {
    try {
      const payload = request.body as any;

      if (!payload.borrower_pubkey || typeof payload.borrower_pubkey !== "string") {
        throw new ApiError("MISSING_REQUIRED_FIELD", "Missing borrower_pubkey");
      }

      if (!Array.isArray(payload.attestation_ids) || payload.attestation_ids.length === 0) {
        throw new ApiError(
          "MISSING_REQUIRED_FIELD",
          "attestation_ids must be a non-empty array"
        );
      }

      const job = await underwritingQueue.add(
        "process",
        {
          borrower_pubkey: payload.borrower_pubkey,
          attestation_ids: payload.attestation_ids
        },
        {
          jobId: `underwriting-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
        }
      );

      return sendSuccess(
        reply,
        {
          job_id: job.id,
          status: "queued",
          message: "Underwriting request queued for processing"
        },
        202
      );
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/underwriting/request/:requestId", async (request, reply) => {
    try {
      const { requestId } = request.params as { requestId: string };
      return sendSuccess(reply, await underwritingService.getById(requestId));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/underwriting/requests", async (request, reply) => {
    try {
      const { limit } = (request.query as { limit?: string }) || {};
      const parsedLimit = limit ? Number(limit) : 25;
      return sendSuccess(reply, await underwritingService.listRecent(parsedLimit));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/underwriting/job/:jobId", async (request, reply) => {
    try {
      const { jobId } = request.params as { jobId: string };
      const job = await underwritingQueue.getJob(jobId);

      if (!job) {
        throw new ApiError("JOB_NOT_FOUND", `Job ${jobId} not found`, 404);
      }

      const state = await job.getState();
      return sendSuccess(reply, {
        job_id: jobId,
        state,
        result: job.returnvalue,
        failed_reason: job.failedReason
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });
};
