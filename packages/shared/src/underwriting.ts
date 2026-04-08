export type UnderwritingDecision = {
  applicant: string;
  eligible: boolean;
  riskBand: string;
  maxBorrowAmountUsd: number;
  requiredCollateralRatio: number;
};
