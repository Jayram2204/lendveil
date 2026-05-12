import { verifyProof } from "@reclaimprotocol/js-sdk";
import { ApiError } from "../lib/http.js";

export class ReclaimVerifier {
  async verify(proof: unknown): Promise<{
    valid: boolean;
    extractedData: Record<string, unknown>;
  }> {
    try {
      const result = await verifyProof(proof as any, {
        dangerouslyDisableContentValidation: true
      });

      if (!result.isVerified) {
        return { valid: false, extractedData: {} };
      }

      const proofData = proof as any;
      const extractedData: Record<string, unknown> = {};

      if (result.data && result.data.length > 0) {
        for (const trustedData of result.data) {
          if (trustedData.extractedParameters) {
            Object.assign(extractedData, trustedData.extractedParameters);
          }
          if (trustedData.context) {
            extractedData.context = trustedData.context;
          }
        }
      }

      if (proofData.claimData?.context) {
        extractedData.context = proofData.claimData.context;
      }

      if (proofData.claimData?.parameters) {
        Object.assign(extractedData, proofData.claimData.parameters);
      }

      if (proofData.extractedParameterValues) {
        Object.assign(extractedData, proofData.extractedParameterValues);
      }

      return { valid: true, extractedData };
    } catch (error) {
      throw new ApiError(
        "RECLAIM_VERIFICATION_FAILED",
        `Reclaim proof verification failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async checkRevocation(_attestationId: string): Promise<boolean> {
    return false;
  }
}

export const reclaimVerifier = new ReclaimVerifier();
