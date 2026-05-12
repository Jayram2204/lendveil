import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { ApiError } from '../lib/http.js';

export interface AnchorDecisionParams {
  decision_id: string;
  borrower_pubkey: string;
  eligible: boolean;
  risk_band: string;
  max_borrow_usd: string;
  collateral_ratio: string;
  reason: string;
  policy_version_hash: string;
}

export interface AnchorDecisionResult {
  transaction_signature: string;
  decision_account: string;
  timestamp: string;
}

class OnchainService {
  private connection: Connection;
  private programId: PublicKey | null = null;
  private authority: Keypair | null = null;

  constructor() {
    const rpcUrl = process.env.SOLANA_RPC_URL || process.env.ARCIUM_RPC_URL || 'https://api.devnet.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');

    if (process.env.UNDERWRITING_PROGRAM_ID) {
      this.programId = new PublicKey(process.env.UNDERWRITING_PROGRAM_ID);
    }

    if (process.env.UNDERWRITING_AUTHORITY_KEY) {
      try {
        const keyBuffer = Buffer.from(process.env.UNDERWRITING_AUTHORITY_KEY, 'base64');
        this.authority = Keypair.fromSecretKey(keyBuffer);
      } catch {
        this.authority = null;
      }
    }
  }

  async isEnabled(): Promise<boolean> {
    return Boolean(this.authority && this.programId && process.env.ONCHAIN_ANCHORING === 'true');
  }

  async anchorDecision(_params: AnchorDecisionParams): Promise<AnchorDecisionResult> {
    throw new ApiError(
      'ONCHAIN_NOT_IMPLEMENTED',
      'Real onchain anchoring is not wired yet. A deployed Anchor instruction and IDL-backed client are still required.',
      501
    );
  }

  async verifyDecision(decisionId: string): Promise<{
    valid: boolean;
    decision_account: string;
    transaction_signature?: string;
  }> {
    if (!this.programId) {
      throw new ApiError(
        'ONCHAIN_DISABLED',
        'Onchain anchoring is not configured'
      );
    }

    const [decisionAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('decision'), Buffer.from(decisionId)],
      this.programId
    );

    const accountInfo = await this.connection.getAccountInfo(decisionAccount);
    return {
      valid: Boolean(accountInfo),
      decision_account: decisionAccount.toString()
    };
  }
}

export const onchainService = new OnchainService();
