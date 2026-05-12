export enum AttestationStatus {
  VALID = "VALID",
  EXPIRED = "EXPIRED",
  REVOKED = "REVOKED",
  INVALID_SIGNATURE = "INVALID_SIGNATURE",
  ISSUER_NOT_TRUSTED = "ISSUER_NOT_TRUSTED"
}

export enum KycStatus {
  PASS = "PASS",
  FAIL = "FAIL",
  PENDING = "PENDING"
}

export enum IncomeBand {
  BAND_0 = "BAND_0",
  BAND_1 = "BAND_1",
  BAND_2 = "BAND_2"
}

export enum AccreditationStatus {
  ACCREDITED = "ACCREDITED",
  NOT_ACCREDITED = "NOT_ACCREDITED",
  UNKNOWN = "UNKNOWN"
}

export enum RiskBand {
  A = "A",
  B = "B",
  C = "C"
}

export enum DecisionReason {
  APPROVED = "APPROVED",
  KYC_NOT_PASSED = "KYC_NOT_PASSED",
  RESTRICTED_JURISDICTION = "RESTRICTED_JURISDICTION",
  INSUFFICIENT_ATTESTATIONS = "INSUFFICIENT_ATTESTATIONS",
  ATTESTATION_EXPIRED = "ATTESTATION_EXPIRED",
  ISSUER_NOT_TRUSTED = "ISSUER_NOT_TRUSTED",
  INVALID_ATTESTATION = "INVALID_ATTESTATION"
}

export enum UnderwritingRequestStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED"
}

export enum AuditEventType {
  ATTESTATION_SUBMITTED = "ATTESTATION_SUBMITTED",
  ATTESTATION_VALIDATED = "ATTESTATION_VALIDATED",
  REQUEST_SUBMITTED = "REQUEST_SUBMITTED",
  DECISION_COMPUTED = "DECISION_COMPUTED",
  REQUEST_FAILED = "REQUEST_FAILED",
  DECISION_ANCHORED_ONCHAIN = "DECISION_ANCHORED_ONCHAIN"
}

export type UnderwritingInputs = {
  kyc_status: KycStatus;
  income_band: IncomeBand;
  jurisdiction: string;
  accreditation_status?: AccreditationStatus;
  credit_score_band?: string;
};

export type ExtractedPolicyInputs = Partial<UnderwritingInputs>;

export type AttestationRecord = {
  id: string;
  borrower_pubkey: string;
  issuer_name: string;
  schema: string;
  issuer_signature: string;
  status: AttestationStatus;
  issued_at: string;
  expires_at: string;
  extracted_inputs: ExtractedPolicyInputs;
  verified_at?: string;
  created_at: string;
};

export type UnderwritingDecision = {
  decision_id: string;
  borrower_pubkey: string;
  request_id: string;
  eligible: boolean;
  risk_band?: RiskBand;
  max_borrow_usd?: number;
  collateral_ratio?: number;
  reason: DecisionReason;
  policy_version_hash: string;
  timestamp: string;
  inputs_used?: UnderwritingInputs;
};

export type UnderwritingRequestRecord = {
  request_id: string;
  borrower_pubkey: string;
  attestation_ids: string[];
  status: UnderwritingRequestStatus;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  decision?: UnderwritingDecision;
};

export type AuditLog = {
  id: string;
  request_id?: string;
  event_type: AuditEventType;
  details: Record<string, unknown>;
  timestamp: string;
  policy_version: string;
};

export type SubmitAttestationInput = {
  borrower_pubkey: string;
  issuer_name: string;
  schema: string;
  issuer_signature?: string;
  issued_at: string;
  expires_at: string;
  policy_inputs: ExtractedPolicyInputs;
};

export type SubmitUnderwritingRequestInput = {
  borrower_pubkey: string;
  attestation_ids: string[];
};

export type ArciumReadiness = {
  enabled: boolean;
  configured: boolean;
  transport: "disabled" | "env_public_key" | "chain_fetch";
  rpc_url_present: boolean;
  mxe_program_id_present: boolean;
  mxe_public_key_hex_present: boolean;
  arcium_program_id?: string;
  mxe_public_key_hex?: string;
  error?: string;
};

export type ArciumEncryptedSession = {
  session_id: string;
  created_at: string;
  client_public_key_hex: string;
  nonce_hex: string;
  ciphertext: number[][];
  encoded_inputs: string[];
  transport: "env_public_key" | "chain_fetch";
  mxe_computation_offset?: string;
  mxe_tx_signature?: string;
  mxe_status?: "PENDING" | "PROCESSING" | "COMPLETE" | "FAILED";
  mxe_submitted_at?: string;
  mxe_completed_at?: string;
  mxe_error?: string;
};

export type ArciumDecryptResultInput = {
  session_id: string;
  ciphertext: number[][];
};

export type ArciumMXESubmissionResult = {
  session_id: string;
  tx_signature: string;
  computation_offset: string;
  status: "SUBMITTED";
  submitted_at: string;
};

export type ArciumMXEPollResult = {
  session_id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETE" | "FAILED";
  encrypted_result?: number[][];
  error?: string;
};
