import type { FastifyInstance } from "fastify";
import { sendError, sendSuccess } from "../lib/http.js";
import { attestationService } from "../services/attestation-service.js";

export const registerAttestationRoutes = async (app: FastifyInstance) => {
  app.post("/api/attestations/submit", async (request, reply) => {
    try {
      const attestation = await attestationService.submit(request.body);

      return sendSuccess(
        reply,
        {
          attestation_id: attestation.id,
          status: attestation.status,
          expires_at: attestation.expires_at
        },
        201
      );
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/attestations/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const attestation = await attestationService.getById(id);
      const valid = await attestationService.verifyValidity(id);

      return sendSuccess(reply, {
        id: attestation.id,
        issuer_name: attestation.issuer_name,
        status: attestation.status,
        valid,
        expires_at: attestation.expires_at,
        extracted_inputs: attestation.extracted_inputs
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });
};
