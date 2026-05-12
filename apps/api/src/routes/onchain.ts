import type { FastifyInstance } from 'fastify';
import { sendError, sendSuccess } from '../lib/http.js';
import { onchainService } from '../services/onchain-service.js';
import { underwritingService } from '../services/underwriting-service.js';
import { db } from '../db/index.js';
import { audit_logs } from '../db/schema.js';
import { ApiError } from '../lib/http.js';
import { createId } from '../lib/id.js';
import { POLICY_VERSION_HASH } from '../config/policy.js';
import { AuditEventType } from '@lendveil/types';

export const registerOnchainRoutes = async (app: FastifyInstance) => {
  app.get('/api/onchain/status', async (request, reply) => {
    try {
      const enabled = await onchainService.isEnabled();
      return sendSuccess(reply, {
        onchain_anchoring_enabled: enabled,
        status: enabled ? 'ready' : 'disabled'
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post('/api/onchain/anchor-decision/:requestId', async (request, reply) => {
    try {
      const { requestId } = request.params as { requestId: string };

      // Get the underwriting request
      const underwritingRequest = await underwritingService.getById(requestId);

      if (!underwritingRequest.decision_id) {
        throw new ApiError(
          'NO_DECISION',
          'No decision found for this request',
          400
        );
      }

      // Check if onchain anchoring is enabled
      const enabled = await onchainService.isEnabled();
      if (!enabled) {
        throw new ApiError(
          'ONCHAIN_DISABLED',
          'Onchain anchoring is not configured',
          503
        );
      }

      // Get the decision details
      const decision = (underwritingRequest as any).decision;
      if (!decision) {
        throw new ApiError(
          'DECISION_NOT_FOUND',
          'Decision details not found',
          404
        );
      }

      // Anchor the decision onchain
      const result = await onchainService.anchorDecision({
        decision_id: decision.decision_id,
        borrower_pubkey: decision.borrower_pubkey,
        eligible: decision.eligible,
        risk_band: decision.risk_band,
        max_borrow_usd: decision.max_borrow_usd,
        collateral_ratio: decision.collateral_ratio,
        reason: decision.reason,
        policy_version_hash: decision.policy_version_hash
      });

      // Log the anchoring event
      await db.insert(audit_logs).values({
        id: createId(),
        request_id: requestId,
        event_type: AuditEventType.DECISION_ANCHORED_ONCHAIN,
        details: {
          decision_id: decision.decision_id,
          transaction_signature: result.transaction_signature,
          decision_account: result.decision_account
        },
        timestamp: new Date(),
        policy_version: POLICY_VERSION_HASH
      });

      return sendSuccess(reply, result, 201);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get('/api/onchain/decision/:decisionId', async (request, reply) => {
    try {
      const { decisionId } = request.params as { decisionId: string };

      const result = await onchainService.verifyDecision(decisionId);

      return sendSuccess(reply, result);
    } catch (error) {
      return sendError(reply, error);
    }
  });
};
