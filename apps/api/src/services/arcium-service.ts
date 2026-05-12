import { RescueCipher, getMXEPublicKey, x25519 } from "@arcium-hq/client";
import { PublicKey } from "@solana/web3.js";
import {
  AccreditationStatus,
  IncomeBand,
  KycStatus,
  type ArciumDecryptResultInput,
  type ArciumEncryptedSession,
  type ArciumReadiness,
  type UnderwritingInputs
} from "@lendveil/types";
import { randomBytes } from "node:crypto";
import { createReadonlyProvider, getArciumConfig, getArciumReadiness } from "../config/arcium.js";
import { ApiError } from "../lib/http.js";
import { createId } from "../lib/id.js";
import { arciumSessions } from "../lib/store.js";

const toHex = (value: Uint8Array) => Buffer.from(value).toString("hex");
const fromHex = (value: string) => Uint8Array.from(Buffer.from(value, "hex"));

const kycEncoding: Record<KycStatus, bigint> = {
  [KycStatus.FAIL]: 0n,
  [KycStatus.PENDING]: 1n,
  [KycStatus.PASS]: 2n
};

const incomeEncoding: Record<IncomeBand, bigint> = {
  [IncomeBand.BAND_0]: 0n,
  [IncomeBand.BAND_1]: 1n,
  [IncomeBand.BAND_2]: 2n
};

const accreditationEncoding: Record<AccreditationStatus, bigint> = {
  [AccreditationStatus.UNKNOWN]: 0n,
  [AccreditationStatus.NOT_ACCREDITED]: 1n,
  [AccreditationStatus.ACCREDITED]: 2n
};

const encodeJurisdiction = (jurisdiction: string): bigint => {
  const normalized = jurisdiction.toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    throw new ApiError(
      "INVALID_JURISDICTION",
      "jurisdiction must be a 2-character ISO code"
    );
  }

  const [a, b] = normalized.split("").map((char) => char.charCodeAt(0));
  return BigInt((a << 8) | b);
};

const parseInputs = (payload: unknown): UnderwritingInputs => {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new ApiError("INVALID_REQUEST_BODY", "Request body must be an object");
  }

  const input = payload as Partial<UnderwritingInputs>;
  if (!input.kyc_status || !input.income_band || !input.jurisdiction) {
    throw new ApiError(
      "MISSING_REQUIRED_FIELD",
      "kyc_status, income_band, and jurisdiction are required"
    );
  }

  return {
    kyc_status: input.kyc_status,
    income_band: input.income_band,
    jurisdiction: input.jurisdiction,
    accreditation_status: input.accreditation_status
  } as UnderwritingInputs;
};

class ArciumService {
  async getStatus(): Promise<ArciumReadiness> {
    return getArciumReadiness();
  }

  async prepareUnderwritingPayload(payload: unknown): Promise<ArciumEncryptedSession> {
    const config = getArciumConfig();
    if (!config.enabled) {
      throw new ApiError(
        "ARCIUM_DISABLED",
        "Set ARCIUM_ENABLED=true before preparing confidential payloads"
      );
    }

    const inputs = parseInputs(payload);
    const readiness = await getArciumReadiness();
    if (!readiness.configured || !readiness.mxe_public_key_hex) {
      throw new ApiError(
        "ARCIUM_NOT_READY",
        readiness.error ?? "Arcium is not ready for encryption"
      );
    }

    const encodedInputs = [
      kycEncoding[inputs.kyc_status],
      incomeEncoding[inputs.income_band],
      encodeJurisdiction(inputs.jurisdiction),
      accreditationEncoding[
        inputs.accreditation_status ?? AccreditationStatus.UNKNOWN
      ]
    ];

    const clientSecretKey = x25519.utils.randomSecretKey();
    const clientPublicKey = x25519.getPublicKey(clientSecretKey);
    const mxePublicKey = fromHex(readiness.mxe_public_key_hex);
    const sharedSecret = x25519.getSharedSecret(clientSecretKey, mxePublicKey);
    const nonce = randomBytes(16);
    const cipher = new RescueCipher(sharedSecret);
    const ciphertext = cipher.encrypt(encodedInputs, nonce);

    const session: ArciumEncryptedSession & { client_secret_key_hex: string } = {
      session_id: createId(),
      created_at: new Date().toISOString(),
      client_public_key_hex: toHex(clientPublicKey),
      client_secret_key_hex: toHex(clientSecretKey),
      nonce_hex: toHex(nonce),
      ciphertext,
      encoded_inputs: encodedInputs.map((value) => value.toString()),
      transport: readiness.transport === "chain_fetch" ? "chain_fetch" : "env_public_key"
    };

    arciumSessions.set(session.session_id, session);

    return {
      session_id: session.session_id,
      created_at: session.created_at,
      client_public_key_hex: session.client_public_key_hex,
      nonce_hex: session.nonce_hex,
      ciphertext: session.ciphertext,
      encoded_inputs: session.encoded_inputs,
      transport: session.transport
    };
  }

  async decryptResult(payload: unknown) {
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
      throw new ApiError("INVALID_REQUEST_BODY", "Request body must be an object");
    }

    const input = payload as ArciumDecryptResultInput;
    if (!input.session_id || !Array.isArray(input.ciphertext)) {
      throw new ApiError(
        "MISSING_REQUIRED_FIELD",
        "session_id and ciphertext are required"
      );
    }

    const session = arciumSessions.get(input.session_id);
    if (!session) {
      throw new ApiError("ARCIUM_SESSION_NOT_FOUND", "Unknown Arcium session", 404);
    }

    const readiness = await getArciumReadiness();
    const mxePublicKeyHex = readiness.mxe_public_key_hex;
    if (!mxePublicKeyHex) {
      throw new ApiError(
        "ARCIUM_NOT_READY",
        "MXE public key is not available for decryption"
      );
    }

    const sharedSecret = x25519.getSharedSecret(
      fromHex(session.client_secret_key_hex),
      fromHex(mxePublicKeyHex)
    );
    const cipher = new RescueCipher(sharedSecret);
    const plaintext = cipher.decrypt(input.ciphertext, fromHex(session.nonce_hex));

    return {
      session_id: session.session_id,
      decrypted: plaintext.map((value) => value.toString())
    };
  }

  async refreshMxePublicKeyFromChain() {
    const config = getArciumConfig();
    if (!config.rpcUrl || !config.mxeProgramId) {
      throw new ApiError(
        "ARCIUM_NOT_READY",
        "ARCIUM_RPC_URL and ARCIUM_MXE_PROGRAM_ID are required"
      );
    }

    const provider = createReadonlyProvider();
    const mxePublicKey = await getMXEPublicKey(
      provider,
      new PublicKey(config.mxeProgramId)
    );

    return {
      mxe_public_key_hex: mxePublicKey ? toHex(mxePublicKey) : null
    };
  }

  /**
   * Submit encrypted underwriting inputs to MXE program for confidential computation
   * 
   * @param sessionId - Session ID from prepareUnderwritingPayload
   * @returns Transaction signature and computation offset
   * 
   * @throws ApiError if session not found, Arcium not configured, or submission fails
   * 
   * TODO: This method requires MXE program instruction details to be implemented.
   * Specifically needed:
   * 1. MXE program instruction name for submitting computations
   * 2. Required accounts for the instruction
   * 3. Instruction data format
   * 4. Computation definition account (if required)
   * 
   * See docs/arcium/PHASE_4_MXE_INTEGRATION_STATUS.md for details.
   */
  async submitToMXE(sessionId: string) {
    const config = getArciumConfig();
    if (!config.enabled) {
      throw new ApiError(
        "ARCIUM_DISABLED",
        "Set ARCIUM_ENABLED=true before submitting to MXE"
      );
    }

    const session = arciumSessions.get(sessionId);
    if (!session) {
      throw new ApiError("ARCIUM_SESSION_NOT_FOUND", `Session ${sessionId} not found`, 404);
    }

    if (!config.rpcUrl || !config.mxeProgramId) {
      throw new ApiError(
        "ARCIUM_NOT_READY",
        "ARCIUM_RPC_URL and ARCIUM_MXE_PROGRAM_ID are required for MXE submission"
      );
    }

    // TODO: Implement actual MXE submission once program interface is documented
    throw new ApiError(
      "MXE_SUBMISSION_NOT_IMPLEMENTED",
      "MXE program submission requires additional integration details. " +
      "See docs/arcium/PHASE_4_MXE_INTEGRATION_STATUS.md for required information. " +
      "Current session is encrypted and ready for submission once MXE program interface is available.",
      501 // Not Implemented
    );

    // PLACEHOLDER for future implementation:
    // const provider = createReadonlyProvider();
    // const mxeProgram = new Program(MXE_IDL, new PublicKey(config.mxeProgramId), provider);
    // 
    // // Build and send MXE computation submission transaction
    // const tx = await mxeProgram.methods
    //   .submitComputation(/* params */)
    //   .accounts({
    //     /* required accounts */
    //   })
    //   .rpc();
    //
    // const computationOffset = await getComputationOffset(/* tx response */);
    //
    // // Update session with MXE tracking info
    // const updatedSession = {
    //   ...session,
    //   mxe_tx_signature: tx,
    //   mxe_computation_offset: computationOffset.toString(),
    //   mxe_status: "PENDING" as const,
    //   mxe_submitted_at: new Date().toISOString()
    // };
    // arciumSessions.set(sessionId, updatedSession);
    //
    // return {
    //   session_id: sessionId,
    //   tx_signature: tx,
    //   computation_offset: computationOffset.toString(),
    //   status: "SUBMITTED" as const,
    //   submitted_at: updatedSession.mxe_submitted_at
    // };
  }

  /**
   * Poll MXE program for computation completion and retrieve encrypted result
   * 
   * @param sessionId - Session ID from submitToMXE
   * @returns Computation status and encrypted result (if complete)
   * 
   * @throws ApiError if session not found, Arcium not configured, or polling fails
   * 
   * TODO: This method requires MXE program result retrieval details.
   * Specifically needed:
   * 1. How to query computation status from MXE program
   * 2. Where encrypted results are stored (computation account?)
   * 3. Format of encrypted result data
   * 
   * See docs/arcium/PHASE_4_MXE_INTEGRATION_STATUS.md for details.
   */
  async pollMXEResult(sessionId: string) {
    const config = getArciumConfig();
    if (!config.enabled) {
      throw new ApiError(
        "ARCIUM_DISABLED",
        "Set ARCIUM_ENABLED=true before polling MXE results"
      );
    }

    const session = arciumSessions.get(sessionId);
    if (!session) {
      throw new ApiError("ARCIUM_SESSION_NOT_FOUND", `Session ${sessionId} not found`, 404);
    }

    if (!session.mxe_computation_offset || !session.mxe_tx_signature) {
      throw new ApiError(
        "MXE_NOT_SUBMITTED",
        "This session has not been submitted to MXE yet. Call submitToMXE first.",
        400
      );
    }

    if (!config.rpcUrl || !config.mxeProgramId) {
      throw new ApiError(
        "ARCIUM_NOT_READY",
        "ARCIUM_RPC_URL and ARCIUM_MXE_PROGRAM_ID are required for MXE polling"
      );
    }

    // TODO: Implement actual MXE polling once result retrieval is documented
    throw new ApiError(
      "MXE_POLLING_NOT_IMPLEMENTED",
      "MXE result polling requires additional integration details. " +
      "See docs/arcium/PHASE_4_MXE_INTEGRATION_STATUS.md for required information. " +
      `Session ${sessionId} was submitted with tx ${session.mxe_tx_signature} and offset ${session.mxe_computation_offset}.`,
      501 // Not Implemented
    );

    // PLACEHOLDER for future implementation:
    // const provider = createReadonlyProvider();
    // const arciumProgram = getArciumProgramReadonly(provider);
    // const computationAddress = getComputationAccAddress(
    //   new PublicKey(config.mxeProgramId),
    //   new BN(session.mxe_computation_offset)
    // );
    //
    // const computationInfo = await getComputationAccInfo(
    //   arciumProgram,
    //   computationAddress,
    //   config.commitment
    // );
    //
    // // Check computation status
    // if (computationInfo.status === "Complete") {
    //   const updatedSession = {
    //     ...session,
    //     mxe_status: "COMPLETE" as const,
    //     mxe_completed_at: new Date().toISOString()
    //   };
    //   arciumSessions.set(sessionId, updatedSession);
    //
    //   return {
    //     session_id: sessionId,
    //     status: "COMPLETE" as const,
    //     encrypted_result: computationInfo.result // Format TBD
    //   };
    // } else if (computationInfo.status === "Failed") {
    //   const updatedSession = {
    //     ...session,
    //     mxe_status: "FAILED" as const,
    //     mxe_error: computationInfo.error || "Unknown error",
    //     mxe_completed_at: new Date().toISOString()
    //   };
    //   arciumSessions.set(sessionId, updatedSession);
    //
    //   return {
    //     session_id: sessionId,
    //     status: "FAILED" as const,
    //     error: updatedSession.mxe_error
    //   };
    // } else {
    //   return {
    //     session_id: sessionId,
    //     status: "PENDING" as const
    //   };
    // }
  }
}

export const arciumService = new ArciumService();
