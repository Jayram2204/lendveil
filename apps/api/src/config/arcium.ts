import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { getArciumProgramReadonly, getMXEPublicKey } from "@arcium-hq/client";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import type { ArciumReadiness } from "@lendveil/types";

export const getArciumConfig = () => {
  return {
    enabled: process.env.ARCIUM_ENABLED === "true",
    rpcUrl: process.env.ARCIUM_RPC_URL?.trim() || "",
    mxeProgramId: process.env.ARCIUM_MXE_PROGRAM_ID?.trim() || "",
    commitment: (process.env.ARCIUM_COMMITMENT?.trim() || "confirmed") as
      | "processed"
      | "confirmed"
      | "finalized",
    mxePublicKeyHex: process.env.ARCIUM_MXE_PUBLIC_KEY_HEX?.trim() || ""
  };
};

export const createReadonlyProvider = () => {
  const config = getArciumConfig();
  if (!config.rpcUrl) {
    throw new Error("ARCIUM_RPC_URL is required");
  }

  const connection = new Connection(config.rpcUrl, config.commitment);
  const wallet = new Wallet(Keypair.generate());

  return new AnchorProvider(connection, wallet, {
    commitment: config.commitment,
    preflightCommitment: config.commitment
  });
};

const toHex = (value: Uint8Array) => Buffer.from(value).toString("hex");

export const getArciumReadiness = async (): Promise<ArciumReadiness> => {
  const config = getArciumConfig();
  const readiness: ArciumReadiness = {
    enabled: config.enabled,
    configured: false,
    transport: config.enabled ? "chain_fetch" : "disabled",
    rpc_url_present: Boolean(config.rpcUrl),
    mxe_program_id_present: Boolean(config.mxeProgramId),
    mxe_public_key_hex_present: Boolean(config.mxePublicKeyHex)
  };

  if (!config.enabled) {
    readiness.configured = false;
    return readiness;
  }

  if (config.mxePublicKeyHex) {
    readiness.configured = true;
    readiness.transport = "env_public_key";
    readiness.mxe_public_key_hex = config.mxePublicKeyHex;
    return readiness;
  }

  if (!config.rpcUrl || !config.mxeProgramId) {
    readiness.error = "ARCIUM_RPC_URL and ARCIUM_MXE_PROGRAM_ID are required when no MXE public key override is set";
    return readiness;
  }

  try {
    const provider = createReadonlyProvider();
    const arciumProgram = getArciumProgramReadonly(provider);
    const mxeProgramId = new PublicKey(config.mxeProgramId);
    const mxePublicKey = await getMXEPublicKey(provider, mxeProgramId);

    readiness.arcium_program_id = arciumProgram.programId.toBase58();
    readiness.transport = "chain_fetch";
    readiness.configured = Boolean(mxePublicKey);
    readiness.mxe_public_key_hex = mxePublicKey ? toHex(mxePublicKey) : undefined;

    if (!mxePublicKey) {
      readiness.error = "MXE public key is not set on-chain for the configured MXE program";
    }

    return readiness;
  } catch (error) {
    readiness.error = error instanceof Error ? error.message : "Unknown Arcium configuration error";
    return readiness;
  }
};
