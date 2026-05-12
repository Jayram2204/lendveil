import { Connection, PublicKey } from "@solana/web3.js";
import { ApiError } from "../lib/http.js";

export class SASVerifier {
  private connection: Connection;

  constructor() {
    const rpcUrl = process.env.SOLANA_RPC_URL || process.env.ARCIUM_RPC_URL || "https://api.devnet.solana.com";
    this.connection = new Connection(rpcUrl, "confirmed");
  }

  /**
   * Verify SAS attestation on Solana.
   *
   * Current behavior is intentionally strict: we verify that the account exists,
   * but we do not fabricate jurisdiction/accreditation values until the team wires
   * the official SAS account parser for the target schema.
   */
  async verify(attestationAccount: string): Promise<{
    valid: boolean;
    jurisdiction?: string;
    accreditation?: string;
  }> {
    try {
      const pubkey = new PublicKey(attestationAccount);
      const accountInfo = await this.connection.getAccountInfo(pubkey);

      if (!accountInfo) {
        return { valid: false };
      }

      throw new ApiError(
        "SAS_SCHEMA_PARSING_NOT_IMPLEMENTED",
        "SAS account parsing is not implemented yet. Lendveil will not infer jurisdiction or accreditation from placeholder data.",
        501
      );
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        "SAS_VERIFICATION_FAILED",
        `SAS verification failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async checkRevocation(_attestationAccount: string): Promise<boolean> {
    throw new ApiError(
      "SAS_REVOCATION_NOT_IMPLEMENTED",
      "SAS revocation checks are not implemented yet.",
      501
    );
  }
}

export const sasVerifier = new SASVerifier();
