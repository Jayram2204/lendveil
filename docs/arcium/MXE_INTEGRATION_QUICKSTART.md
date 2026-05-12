# MXE Integration Quick Start Guide

## For Future Implementation

This guide shows exactly where to add MXE program interaction code once the details are available.

## Step 1: Understand MXE Program Interface

Before coding, answer these questions:

### Computation Submission
- [ ] What is the instruction name? (e.g., `submitComputation`, `queueComputation`)
- [ ] What accounts are required?
  - [ ] Payer account?
  - [ ] Computation account (PDA)?
  - [ ] Computation definition account?
  - [ ] MXE program account?
  - [ ] System program?
- [ ] What data does the instruction expect?
  - [ ] Encrypted inputs format?
  - [ ] Client public key?
  - [ ] Nonce?
  - [ ] Computation definition ID?

### Result Retrieval
- [ ] Where is the result stored? (Computation account data?)
- [ ] What is the result format? (Array of bigints? Bytes?)
- [ ] How to check if computation is complete?
- [ ] How to handle computation failures?

## Step 2: Replace Placeholder in submitToMXE()

**File:** `apps/api/src/services/arcium-service.ts`

**Location:** Search for `// TODO: Implement actual MXE submission`

**Replace this block:**
```typescript
throw new ApiError(
  "MXE_SUBMISSION_NOT_IMPLEMENTED",
  "MXE program submission requires additional integration details...",
  501
);
```

**With something like:**
```typescript
import { BN } from "@coral-xyz/anchor";
import { getComputationAccAddress } from "@arcium-hq/client";

const provider = createReadonlyProvider();

// Get or create computation definition (if needed)
// const compDefId = await getOrCreateComputationDefinition(provider, ...);

// Derive computation account PDA
const computationOffset = new BN(Date.now()); // Or use a counter
const computationAccount = getComputationAccAddress(
  new PublicKey(config.mxeProgramId),
  computationOffset
);

// Build MXE submission transaction
// NOTE: Replace with actual MXE program method
const mxeProgram = new Program(MXE_IDL, new PublicKey(config.mxeProgramId), provider);

const tx = await mxeProgram.methods
  .submitComputation({
    encryptedInputs: session.ciphertext,
    clientPublicKey: fromHex(session.client_public_key_hex),
    nonce: fromHex(session.nonce_hex),
    // ... other required params
  })
  .accounts({
    computation: computationAccount,
    payer: provider.wallet.publicKey,
    // ... other required accounts
  })
  .rpc();

// Update session with MXE tracking info
const updatedSession = {
  ...session,
  mxe_tx_signature: tx,
  mxe_computation_offset: computationOffset.toString(),
  mxe_status: "PENDING" as const,
  mxe_submitted_at: new Date().toISOString()
};
arciumSessions.set(sessionId, updatedSession);

return {
  session_id: sessionId,
  tx_signature: tx,
  computation_offset: computationOffset.toString(),
  status: "SUBMITTED" as const,
  submitted_at: updatedSession.mxe_submitted_at
};
```

## Step 3: Replace Placeholder in pollMXEResult()

**File:** `apps/api/src/services/arcium-service.ts`

**Location:** Search for `// TODO: Implement actual MXE polling`

**Replace this block:**
```typescript
throw new ApiError(
  "MXE_POLLING_NOT_IMPLEMENTED",
  "MXE result polling requires additional integration details...",
  501
);
```

**With something like:**
```typescript
import { BN } from "@coral-xyz/anchor";
import { getComputationAccAddress } from "@arcium-hq/client";
import { getComputationAccInfo } from "@arcium-hq/reader";

const provider = createReadonlyProvider();
const arciumProgram = getArciumProgramReadonly(provider);

// Derive computation account address
const computationAddress = getComputationAccAddress(
  new PublicKey(config.mxeProgramId),
  new BN(session.mxe_computation_offset!)
);

// Fetch computation account data
const computationInfo = await getComputationAccInfo(
  arciumProgram,
  computationAddress,
  config.commitment
);

// Check computation status
// NOTE: Adjust status field names based on actual account structure
if (computationInfo.status === "Complete" || computationInfo.isComplete) {
  const updatedSession = {
    ...session,
    mxe_status: "COMPLETE" as const,
    mxe_completed_at: new Date().toISOString()
  };
  arciumSessions.set(sessionId, updatedSession);

  return {
    session_id: sessionId,
    status: "COMPLETE" as const,
    encrypted_result: computationInfo.result // Adjust field name
  };
} else if (computationInfo.status === "Failed" || computationInfo.hasFailed) {
  const updatedSession = {
    ...session,
    mxe_status: "FAILED" as const,
    mxe_error: computationInfo.error || "Unknown error",
    mxe_completed_at: new Date().toISOString()
  };
  arciumSessions.set(sessionId, updatedSession);

  return {
    session_id: sessionId,
    status: "FAILED" as const,
    error: updatedSession.mxe_error
  };
} else {
  return {
    session_id: sessionId,
    status: "PENDING" as const
  };
}
```

## Step 4: Test the Implementation

### 4.1 Start the Server
```bash
cd apps/api
pnpm dev
```

### 4.2 Prepare Encrypted Session
```bash
curl -X POST http://localhost:4000/api/arcium/prepare-underwriting \
  -H "Content-Type: application/json" \
  -d '{
    "kyc_status": "PASS",
    "income_band": "BAND_2",
    "jurisdiction": "US",
    "accreditation_status": "ACCREDITED"
  }'
```

Save the `session_id` from the response.

### 4.3 Submit to MXE
```bash
curl -X POST http://localhost:4000/api/arcium/submit-to-mxe \
  -H "Content-Type: application/json" \
  -d '{"session_id": "YOUR_SESSION_ID"}'
```

Should return:
```json
{
  "success": true,
  "data": {
    "session_id": "...",
    "tx_signature": "...",
    "computation_offset": "...",
    "status": "SUBMITTED",
    "submitted_at": "..."
  }
}
```

### 4.4 Poll for Result
```bash
curl "http://localhost:4000/api/arcium/poll-result?session_id=YOUR_SESSION_ID"
```

Should eventually return:
```json
{
  "success": true,
  "data": {
    "session_id": "...",
    "status": "COMPLETE",
    "encrypted_result": [[...], [...], ...]
  }
}
```

### 4.5 Decrypt Result
```bash
curl -X POST http://localhost:4000/api/arcium/decrypt-result \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "YOUR_SESSION_ID",
    "ciphertext": [[...], [...], ...]
  }'
```

Should return decrypted integers.

## Step 5: Integrate with Underwriting Service

Once MXE submission and polling work, integrate into the underwriting flow.

**File:** `apps/api/src/services/underwriting-service.ts`

**Add confidential compute path:**
```typescript
async processRequest(requestId: string, useConfidentialCompute: boolean = false) {
  // ... existing code to fetch request and build inputs ...

  if (useConfidentialCompute && process.env.ARCIUM_ENABLED === 'true') {
    // CONFIDENTIAL COMPUTE PATH
    
    // 1. Prepare encrypted inputs
    const session = await arciumService.prepareUnderwritingPayload(mergedInputs);
    
    // 2. Submit to MXE
    const { tx_signature, computation_offset } = await arciumService.submitToMXE(
      session.session_id
    );
    
    // 3. Poll for result (with timeout)
    const maxPolls = 30; // 30 seconds
    let polls = 0;
    let mxeResult;
    
    while (polls < maxPolls) {
      mxeResult = await arciumService.pollMXEResult(session.session_id);
      
      if (mxeResult.status === 'COMPLETE') {
        break;
      } else if (mxeResult.status === 'FAILED') {
        throw new Error(`MXE computation failed: ${mxeResult.error}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      polls++;
    }
    
    if (mxeResult?.status !== 'COMPLETE') {
      throw new Error('MXE computation timeout');
    }
    
    // 4. Decrypt result
    const decrypted = await arciumService.decryptResult({
      session_id: session.session_id,
      ciphertext: mxeResult.encrypted_result!
    });
    
    // 5. Convert decrypted integers to decision
    const decision = this.decryptedIntegersToDecision(
      decrypted,
      requestId,
      request.borrower_pubkey,
      mergedInputs
    );
    
    return decision;
  } else {
    // STANDARD (NON-CONFIDENTIAL) PATH
    return this.evaluatePolicy(mergedInputs, requestId, request.borrower_pubkey);
  }
}
```

## Step 6: Add Underwriting Route Parameter

**File:** `apps/api/src/routes/underwriting.ts`

**Update POST /api/underwriting/request:**
```typescript
app.post<{
  Body: { borrower_pubkey: string; attestation_ids: string[] };
  Querystring: { confidential?: string };
}>('/api/underwriting/request', async (request, reply) => {
  const { borrower_pubkey, attestation_ids } = request.body;
  const useConfidential = request.query.confidential === 'true';
  
  // ... validation ...
  
  const decision = await underwritingService.processRequest(
    requestId,
    useConfidential
  );
  
  return sendSuccess(reply, {
    request_id: requestId,
    decision,
    confidential_compute_used: useConfidential
  });
});
```

## Step 7: End-to-End Test

```bash
# Submit attestations (existing flow)
# ... submit 3 attestations, get IDs ...

# Request underwriting with confidential compute
curl -X POST "http://localhost:4000/api/underwriting/request?confidential=true" \
  -H "Content-Type: application/json" \
  -d '{
    "borrower_pubkey": "test-borrower-123",
    "attestation_ids": ["attest-1", "attest-2", "attest-3"]
  }'
```

Should return a complete underwriting decision computed confidentially via MXE!

## Common Issues

### Issue: Transaction fails with "invalid account"
**Solution:** Check that all required accounts are included in the instruction

### Issue: Computation never completes
**Solution:** Check MXE program logs, verify computation definition is correct

### Issue: Decryption fails
**Solution:** Verify the encrypted result format matches what RescueCipher expects

### Issue: Result doesn't match expected decision
**Solution:** Check the encoding/decoding logic for underwriting outputs

## Resources

- Arcium Documentation: https://docs.arcium.com
- Arcium GitHub: https://github.com/arcium-hq
- Solana Web3.js: https://solana-labs.github.io/solana-web3.js/
- Anchor Framework: https://www.anchor-lang.com/

## Support

If you encounter issues:
1. Check Arcium Discord/community
2. Review MXE program IDL
3. Examine transaction logs on Solana explorer
4. Test with Arcium CLI tools (if available)

---

**Last Updated:** April 11, 2026  
**Status:** Ready for implementation once MXE details are available
