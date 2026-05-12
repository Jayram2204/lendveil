import {
  AttestationStatus,
  AuditEventType,
  type ExtractedPolicyInputs,
  type SubmitAttestationInput
} from "@lendveil/types";
import { eq } from "drizzle-orm";
import { POLICY_VERSION_HASH } from "../config/policy.js";
import { db } from "../db/index.js";
import { attestations as attestationsTable, audit_logs } from "../db/schema.js";
import { findTrustedIssuer } from "../lib/allowlist.js";
import { ApiError } from "../lib/http.js";
import { createId } from "../lib/id.js";
import { reclaimVerifier } from "./reclaim-verifier.js";
import { sasVerifier } from "./sas-verifier.js";

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isIsoDate = (value: string) => !Number.isNaN(new Date(value).getTime());

const coerceInputs = (value: unknown): ExtractedPolicyInputs => {
  if (!isObject(value)) {
    throw new ApiError(
      "INVALID_ATTESTATION_INPUTS",
      "policy_inputs must be an object"
    );
  }

  return value as ExtractedPolicyInputs;
};

class AttestationService {
  async submit(payload: unknown) {
    if (!isObject(payload)) {
      throw new ApiError("INVALID_REQUEST_BODY", "Request body must be an object");
    }

    const input = payload as Partial<SubmitAttestationInput>;
    const requiredFields = [
      "borrower_pubkey",
      "issuer_name",
      "schema",
      "issued_at",
      "expires_at",
      "policy_inputs"
    ] as const;

    for (const field of requiredFields) {
      if (!input[field]) {
        throw new ApiError(
          "MISSING_REQUIRED_FIELD",
          `Missing required field: ${field}`
        );
      }
    }

    if (!isIsoDate(input.issued_at!)) {
      throw new ApiError("INVALID_ISSUED_AT", "issued_at must be an ISO timestamp");
    }

    if (!isIsoDate(input.expires_at!)) {
      throw new ApiError(
        "INVALID_EXPIRES_AT",
        "expires_at must be an ISO timestamp"
      );
    }

    if (new Date(input.expires_at!) <= new Date()) {
      throw new ApiError("ATTESTATION_EXPIRED", "Attestation is already expired");
    }

    const issuer = findTrustedIssuer(input.issuer_name!, input.schema!);
    if (!issuer) {
      throw new ApiError(
        "ISSUER_NOT_TRUSTED",
        `Issuer '${input.issuer_name}' is not in the allowlist`
      );
    }

    let extractedData: ExtractedPolicyInputs = {};

    if (input.issuer_name!.includes("Reclaim")) {
      const result = await reclaimVerifier.verify(input.policy_inputs);
      if (!result.valid) {
        throw new ApiError("INVALID_SIGNATURE", "Reclaim proof verification failed");
      }
      extractedData = this.extractPolicyInputsFromReclaim(result.extractedData, input.schema!);
    } else if (
      input.issuer_name!.includes("SAS") ||
      input.issuer_name!.includes("Solana Attestation")
    ) {
      const sasAccount = (input.policy_inputs as any)?.attestation_account;
      if (!sasAccount) {
        throw new ApiError(
          "MISSING_SAS_ACCOUNT",
          "SAS attestation requires attestation_account field"
        );
      }

      const result = await sasVerifier.verify(sasAccount);
      if (!result.valid) {
        throw new ApiError("INVALID_SIGNATURE", "SAS attestation verification failed");
      }
      extractedData = this.extractPolicyInputsFromSAS(result, input.schema!);
    } else {
      if (!input.issuer_signature || input.issuer_signature.trim().length === 0) {
        throw new ApiError(
          "INVALID_SIGNATURE",
          "issuer_signature is required for non-provider attestations"
        );
      }
      extractedData = coerceInputs(input.policy_inputs);
    }

    if (Object.keys(extractedData).length === 0) {
      throw new ApiError(
        "UNUSABLE_ATTESTATION",
        `Verified attestation did not yield usable fields for schema ${input.schema}`
      );
    }

    const attestationId = createId();
    const now = new Date();

    const [attestation] = await db
      .insert(attestationsTable)
      .values({
        id: attestationId,
        borrower_pubkey: input.borrower_pubkey!,
        issuer_name: issuer.name,
        schema: input.schema!,
        issuer_signature: input.issuer_signature ?? "",
        status: AttestationStatus.VALID,
        issued_at: new Date(input.issued_at!),
        expires_at: new Date(input.expires_at!),
        extracted_inputs: extractedData,
        verified_at: now,
        created_at: now
      })
      .returning();

    await db.insert(audit_logs).values({
      id: createId(),
      event_type: AuditEventType.ATTESTATION_SUBMITTED,
      details: {
        attestation_id: attestation.id,
        issuer_name: attestation.issuer_name,
        schema: attestation.schema
      },
      timestamp: now,
      policy_version: POLICY_VERSION_HASH
    });

    return attestation;
  }

  async getById(id: string) {
    const attestation = await db
      .select()
      .from(attestationsTable)
      .where(eq(attestationsTable.id, id))
      .limit(1);

    if (!attestation.length) {
      throw new ApiError("ATTESTATION_NOT_FOUND", `Attestation ${id} not found`, 404);
    }

    return attestation[0];
  }

  async verifyValidity(id: string) {
    const attestation = await this.getById(id);
    const now = new Date();

    if (new Date(attestation.expires_at) <= now) {
      await db
        .update(attestationsTable)
        .set({ status: AttestationStatus.EXPIRED })
        .where(eq(attestationsTable.id, id));
      return false;
    }

    if (attestation.issuer_name.includes("Reclaim")) {
      const isRevoked = await reclaimVerifier.checkRevocation(attestation.id);
      if (isRevoked) {
        await db
          .update(attestationsTable)
          .set({ status: AttestationStatus.REVOKED })
          .where(eq(attestationsTable.id, id));
        return false;
      }
    }

    if (
      attestation.issuer_name.includes("SAS") ||
      attestation.issuer_name.includes("Solana Attestation")
    ) {
      const sasAccount = (attestation.extracted_inputs as any)?.attestation_account;
      if (sasAccount) {
        const isRevoked = await sasVerifier.checkRevocation(sasAccount);
        if (isRevoked) {
          await db
            .update(attestationsTable)
            .set({ status: AttestationStatus.REVOKED })
            .where(eq(attestationsTable.id, id));
          return false;
        }
      }
    }

    return attestation.status === AttestationStatus.VALID;
  }

  private extractPolicyInputsFromReclaim(
    data: Record<string, unknown>,
    schema: string
  ): ExtractedPolicyInputs {
    const inputs: ExtractedPolicyInputs = {};

    switch (schema) {
      case "kyc_status": {
        const statusValue = data.status ?? data.kyc_status;
        if (!statusValue) {
          throw new ApiError(
            "RECLAIM_DATA_MISSING",
            "Reclaim proof is missing kyc_status or status"
          );
        }
        inputs.kyc_status = String(statusValue).toUpperCase() as any;
        break;
      }

      case "income_band": {
        if (data.income_band) {
          inputs.income_band = String(data.income_band).toUpperCase() as any;
          break;
        }

        const income = Number(
          data.income ?? data.annualIncome ?? data.annual_income ?? NaN
        );
        if (Number.isNaN(income)) {
          throw new ApiError(
            "RECLAIM_DATA_MISSING",
            "Reclaim proof is missing income or income_band"
          );
        }
        inputs.income_band = this.calculateIncomeBand(income);
        break;
      }

      default:
        if (data.kyc_status) inputs.kyc_status = String(data.kyc_status).toUpperCase() as any;
        if (data.income_band) inputs.income_band = String(data.income_band).toUpperCase() as any;
        if (data.jurisdiction) inputs.jurisdiction = String(data.jurisdiction).toUpperCase();
        if (data.accreditation_status) {
          inputs.accreditation_status = String(data.accreditation_status).toUpperCase() as any;
        }
    }

    return inputs;
  }

  private extractPolicyInputsFromSAS(
    result: { valid: boolean; jurisdiction?: string; accreditation?: string },
    schema: string
  ): ExtractedPolicyInputs {
    const inputs: ExtractedPolicyInputs = {};

    switch (schema) {
      case "jurisdiction":
        if (result.jurisdiction) {
          inputs.jurisdiction = result.jurisdiction.toUpperCase();
        }
        break;

      case "accreditation_status":
        if (result.accreditation) {
          inputs.accreditation_status = result.accreditation.toUpperCase() as any;
        }
        break;

      default:
        if (result.jurisdiction) inputs.jurisdiction = result.jurisdiction.toUpperCase();
        if (result.accreditation) {
          inputs.accreditation_status = result.accreditation.toUpperCase() as any;
        }
    }

    return inputs;
  }

  private calculateIncomeBand(income: number): any {
    if (income >= 100000) return "BAND_2";
    if (income >= 50000) return "BAND_1";
    return "BAND_0";
  }
}

export const attestationService = new AttestationService();
