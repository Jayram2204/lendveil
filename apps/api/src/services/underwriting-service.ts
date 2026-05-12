import {
  AccreditationStatus,
  AuditEventType,
  DecisionReason,
  IncomeBand,
  KycStatus,
  UnderwritingRequestStatus,
  type SubmitUnderwritingRequestInput,
  type UnderwritingInputs
} from "@lendveil/types";
import { desc, eq } from "drizzle-orm";
import { POLICY_VERSION_HASH, evaluatePolicy } from "../config/policy.js";
import { db } from "../db/index.js";
import {
  attestations as attestationsTable,
  audit_logs,
  underwriting_decisions,
  underwriting_requests
} from "../db/schema.js";
import { ApiError } from "../lib/http.js";
import { createId } from "../lib/id.js";

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const assertEnumValue = <T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  field: string
): T => {
  if (typeof value !== "string" || !allowedValues.includes(value as T)) {
    throw new ApiError("INVALID_POLICY_INPUT", `Invalid ${field} value`);
  }

  return value as T;
};

const buildInputs = async (attestationIds: string[]): Promise<UnderwritingInputs> => {
  const merged: Record<string, unknown> = {};

  for (const attestationId of attestationIds) {
    const attestationResult = await db
      .select()
      .from(attestationsTable)
      .where(eq(attestationsTable.id, attestationId))
      .limit(1);

    if (!attestationResult.length) {
      throw new ApiError(
        "ATTESTATION_NOT_FOUND",
        `Attestation ${attestationId} not found`
      );
    }

    const attestation = attestationResult[0];

    if (new Date(attestation.expires_at) <= new Date()) {
      throw new ApiError(
        DecisionReason.ATTESTATION_EXPIRED,
        `Attestation ${attestationId} has expired`
      );
    }

    Object.assign(merged, attestation.extracted_inputs);
  }

  if (!merged.kyc_status || !merged.income_band || !merged.jurisdiction) {
    throw new ApiError(
      DecisionReason.INSUFFICIENT_ATTESTATIONS,
      "Required underwriting inputs are missing"
    );
  }

  return {
    kyc_status: assertEnumValue(
      merged.kyc_status,
      Object.values(KycStatus),
      "kyc_status"
    ),
    income_band: assertEnumValue(
      merged.income_band,
      Object.values(IncomeBand),
      "income_band"
    ),
    jurisdiction: String(merged.jurisdiction).toUpperCase(),
    accreditation_status: merged.accreditation_status
      ? assertEnumValue(
          merged.accreditation_status,
          Object.values(AccreditationStatus),
          "accreditation_status"
        )
      : undefined
  };
};

class UnderwritingService {
  async submit(payload: unknown) {
    if (!isObject(payload)) {
      throw new ApiError("INVALID_REQUEST_BODY", "Request body must be an object");
    }

    const input = payload as Partial<SubmitUnderwritingRequestInput>;
    if (!input.borrower_pubkey || typeof input.borrower_pubkey !== "string") {
      throw new ApiError("MISSING_REQUIRED_FIELD", "Missing borrower_pubkey");
    }

    if (!Array.isArray(input.attestation_ids) || input.attestation_ids.length === 0) {
      throw new ApiError(
        "MISSING_REQUIRED_FIELD",
        "attestation_ids must be a non-empty array"
      );
    }

    const requestId = createId();
    const now = new Date();

    await db.insert(underwriting_requests).values({
      request_id: requestId,
      borrower_pubkey: input.borrower_pubkey,
      attestation_ids: input.attestation_ids,
      status: UnderwritingRequestStatus.PROCESSING,
      created_at: now
    });

    await db.insert(audit_logs).values({
      id: createId(),
      request_id: requestId,
      event_type: AuditEventType.REQUEST_SUBMITTED,
      details: {
        borrower_pubkey: input.borrower_pubkey,
        attestation_count: input.attestation_ids.length
      },
      timestamp: now,
      policy_version: POLICY_VERSION_HASH
    });

    try {
      const policyInputs = await buildInputs(input.attestation_ids);
      const decision = evaluatePolicy(policyInputs, {
        decision_id: createId(),
        request_id: requestId,
        borrower_pubkey: input.borrower_pubkey,
        timestamp: now.toISOString()
      });

      const [savedDecision] = await db
        .insert(underwriting_decisions)
        .values({
          decision_id: decision.decision_id,
          borrower_pubkey: input.borrower_pubkey,
          request_id: requestId,
          eligible: decision.eligible,
          risk_band: decision.risk_band,
          max_borrow_usd:
            decision.max_borrow_usd === undefined
              ? null
              : String(decision.max_borrow_usd),
          collateral_ratio:
            decision.collateral_ratio === undefined
              ? null
              : String(decision.collateral_ratio),
          reason: decision.reason,
          policy_version_hash: POLICY_VERSION_HASH,
          timestamp: now,
          inputs_used: policyInputs
        })
        .returning();

      await db
        .update(underwriting_requests)
        .set({
          status: UnderwritingRequestStatus.COMPLETED,
          completed_at: now,
          decision_id: decision.decision_id
        })
        .where(eq(underwriting_requests.request_id, requestId));

      await db.insert(audit_logs).values({
        id: createId(),
        request_id: requestId,
        event_type: AuditEventType.DECISION_COMPUTED,
        details: {
          decision_id: decision.decision_id,
          reason: decision.reason,
          eligible: decision.eligible
        },
        timestamp: now,
        policy_version: POLICY_VERSION_HASH
      });

      return {
        request_id: requestId,
        borrower_pubkey: input.borrower_pubkey,
        attestation_ids: input.attestation_ids,
        status: UnderwritingRequestStatus.COMPLETED,
        created_at: now,
        completed_at: now,
        decision: savedDecision
      };
    } catch (error) {
      const failedAt = new Date();

      await db
        .update(underwriting_requests)
        .set({
          status: UnderwritingRequestStatus.FAILED,
          completed_at: failedAt,
          error_message: error instanceof Error ? error.message : "Unknown error"
        })
        .where(eq(underwriting_requests.request_id, requestId));

      await db.insert(audit_logs).values({
        id: createId(),
        request_id: requestId,
        event_type: AuditEventType.REQUEST_FAILED,
        details: {
          error: error instanceof Error ? error.message : "Unknown error"
        },
        timestamp: failedAt,
        policy_version: POLICY_VERSION_HASH
      });

      throw error;
    }
  }

  async getById(requestId: string) {
    const requestResult = await db
      .select()
      .from(underwriting_requests)
      .where(eq(underwriting_requests.request_id, requestId))
      .limit(1);

    if (!requestResult.length) {
      throw new ApiError("REQUEST_NOT_FOUND", `Request ${requestId} not found`, 404);
    }

    const request = requestResult[0];
    const decision = request.decision_id
      ? (
          await db
            .select()
            .from(underwriting_decisions)
            .where(eq(underwriting_decisions.decision_id, request.decision_id))
            .limit(1)
        )[0]
      : undefined;

    return {
      ...request,
      decision
    };
  }

  async listRecent(limit = 25) {
    const requests = await db
      .select()
      .from(underwriting_requests)
      .orderBy(desc(underwriting_requests.created_at))
      .limit(limit);

    const hydrated = [];
    for (const request of requests) {
      const decision = request.decision_id
        ? (
            await db
              .select()
              .from(underwriting_decisions)
              .where(eq(underwriting_decisions.decision_id, request.decision_id))
              .limit(1)
          )[0]
        : undefined;

      hydrated.push({
        ...request,
        decision
      });
    }

    return hydrated;
  }
}

export const underwritingService = new UnderwritingService();
