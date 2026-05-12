import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AccreditationStatus,
  DecisionReason,
  IncomeBand,
  type UnderwritingDecision,
  type UnderwritingInputs,
  RiskBand
} from "@lendveil/types";

const policyHashPath = join(process.cwd(), "../../docs/policies/POLICY_V1_HASH.txt");

export const POLICY_VERSION = "1.0.0";
export const POLICY_VERSION_HASH = readFileSync(policyHashPath, "utf8").trim();
export const RESTRICTED_JURISDICTIONS = new Set(["KP", "IR", "SY", "CU", "ZW"]);

const INCOME_BAND_MIDPOINTS: Record<IncomeBand, number> = {
  [IncomeBand.BAND_0]: 35000,
  [IncomeBand.BAND_1]: 75000,
  [IncomeBand.BAND_2]: 100000
};

const BASE_BORROW_MULTIPLIER: Record<IncomeBand, number> = {
  [IncomeBand.BAND_0]: 0.15,
  [IncomeBand.BAND_1]: 0.25,
  [IncomeBand.BAND_2]: 0.4
};

const INITIAL_RISK_BAND: Record<IncomeBand, RiskBand> = {
  [IncomeBand.BAND_0]: RiskBand.C,
  [IncomeBand.BAND_1]: RiskBand.B,
  [IncomeBand.BAND_2]: RiskBand.A
};

const COLLATERAL_BY_RISK: Record<RiskBand, number> = {
  [RiskBand.A]: 0.75,
  [RiskBand.B]: 0.85,
  [RiskBand.C]: 0.95
};

const upgradeRiskBand = (riskBand: RiskBand): RiskBand => {
  if (riskBand === RiskBand.C) {
    return RiskBand.B;
  }

  return RiskBand.A;
};

export const evaluatePolicy = (
  inputs: UnderwritingInputs,
  meta: Pick<UnderwritingDecision, "decision_id" | "request_id" | "borrower_pubkey" | "timestamp">
): UnderwritingDecision => {
  if (inputs.kyc_status !== "PASS") {
    return {
      ...meta,
      eligible: false,
      reason: DecisionReason.KYC_NOT_PASSED,
      policy_version_hash: POLICY_VERSION_HASH,
      inputs_used: inputs
    };
  }

  if (RESTRICTED_JURISDICTIONS.has(inputs.jurisdiction)) {
    return {
      ...meta,
      eligible: false,
      reason: DecisionReason.RESTRICTED_JURISDICTION,
      policy_version_hash: POLICY_VERSION_HASH,
      inputs_used: inputs
    };
  }

  const incomeBand = inputs.income_band;
  const baseBorrowMultiplier = BASE_BORROW_MULTIPLIER[incomeBand];
  const incomeMidpoint = INCOME_BAND_MIDPOINTS[incomeBand];
  const startingRiskBand = INITIAL_RISK_BAND[incomeBand];
  const riskBand =
    inputs.accreditation_status === AccreditationStatus.ACCREDITED
      ? upgradeRiskBand(startingRiskBand)
      : startingRiskBand;

  return {
    ...meta,
    eligible: true,
    reason: DecisionReason.APPROVED,
    risk_band: riskBand,
    max_borrow_usd: incomeMidpoint * baseBorrowMultiplier,
    collateral_ratio: COLLATERAL_BY_RISK[riskBand],
    policy_version_hash: POLICY_VERSION_HASH,
    inputs_used: inputs
  };
};
