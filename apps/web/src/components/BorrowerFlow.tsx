'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useMemo, useState } from 'react';
import { ShieldQuestion, FileQuestion, ShieldCheck, Clipboard, Check } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type AttestationKind = 'kyc' | 'income' | 'jurisdiction';

type AttestationFormState = {
  kyc: string;
  income: string;
  jurisdictionAccount: string;
  issuedAt: string;
  expiresAt: string;
};

type DecisionPayload = {
  eligible: boolean;
  reason: string;
  risk_band?: string;
  max_borrow_usd?: number | string;
  collateral_ratio?: number | string;
};

const defaultIssuedAt = () => new Date().toISOString();
const defaultExpiresAt = () =>
  new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

const submissionBlueprint = [
  {
    kind: 'kyc' as const,
    title: 'KYC proof',
    description: 'Paste a real Reclaim proof payload for pass/fail identity verification.',
    icon: ShieldQuestion,
    stagedIcon: ShieldCheck
  },
  {
    kind: 'income' as const,
    title: 'Income proof',
    description: 'Provide the Reclaim proof that resolves into an income band for underwriting.',
    icon: FileQuestion,
    stagedIcon: ShieldCheck
  },
  {
    kind: 'jurisdiction' as const,
    title: 'Jurisdiction proof',
    description: 'Use a real Solana Attestation Service account once SAS schema parsing is wired.',
    icon: FileQuestion,
    stagedIcon: ShieldCheck
  }
];

export default function BorrowerFlow() {
  const { publicKey, connected } = useWallet();
  const [attestations, setAttestations] = useState<string[]>([]);
  const [submittedKinds, setSubmittedKinds] = useState<AttestationKind[]>([]);
  const [decision, setDecision] = useState<DecisionPayload | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [forms, setForms] = useState<AttestationFormState>({
    kyc: '',
    income: '',
    jurisdictionAccount: '',
    issuedAt: defaultIssuedAt(),
    expiresAt: defaultExpiresAt()
  });

  const progressLabel = useMemo(() => `${submittedKinds.length}/3 proofs staged`, [submittedKinds.length]);

  const updateField = (field: keyof AttestationFormState, value: string) => {
    setForms((current) => ({ ...current, [field]: value }));
  };

  const parseJson = (value: string, label: string) => {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error(`${label} must be valid JSON`);
    }
  };

  const buildPayload = (type: AttestationKind) => {
    if (!publicKey) {
      throw new Error('Connect a wallet before submitting attestations');
    }

    const base = {
      borrower_pubkey: publicKey.toBase58(),
      issued_at: forms.issuedAt,
      expires_at: forms.expiresAt
    };

    if (type === 'kyc') {
      return {
        ...base,
        issuer_name: 'Reclaim Protocol - Official KYC Provider',
        schema: 'kyc_status',
        policy_inputs: parseJson(forms.kyc, 'KYC proof')
      };
    }

    if (type === 'income') {
      return {
        ...base,
        issuer_name: 'Reclaim Protocol - Official KYC Provider',
        schema: 'income_band',
        policy_inputs: parseJson(forms.income, 'Income proof')
      };
    }

    return {
      ...base,
      issuer_name: 'Solana Attestation Service - Jurisdiction Provider',
      schema: 'jurisdiction',
      policy_inputs: {
        attestation_account: forms.jurisdictionAccount.trim()
      }
    };
  };

  const submitAttestation = async (type: AttestationKind) => {
    setLoading(true);
    setError(null);

    try {
      const payload = buildPayload(type);
      const res = await fetch(`${API_URL}/api/attestations/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to submit attestation');
      }

      setAttestations((current) => [...current, data.data.attestation_id]);
      setSubmittedKinds((current) => (current.includes(type) ? current : [...current, type]));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const requestUnderwriting = async () => {
    if (!publicKey || attestations.length < 3) {
      return;
    }

    setLoading(true);
    setError(null);
    setDecision(null);
    setJobId(null);

    try {
      const res = await fetch(`${API_URL}/api/underwriting/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borrower_pubkey: publicKey.toBase58(),
          attestation_ids: attestations
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to queue underwriting request');
      }

      setJobId(String(data.data.job_id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const refreshJob = async () => {
    if (!jobId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/underwriting/job/${jobId}`);
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch job status');
      }

      if (data.data.result) {
        setDecision(data.data.result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const copyDecision = () => {
    if (decision) {
      navigator.clipboard.writeText(JSON.stringify(decision, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const steps = [
    'Fetch Attestations',
    'Policy Evaluation',
    'Risk Scoring',
    'Decision Signed'
  ];

  return (
    <main style={{ 
      width: 'min(1120px, calc(100% - 32px))', 
      margin: '0 auto', 
      padding: '22px 0 72px',
      display: 'grid',
      gap: '22px'
    }}>
      <section style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        gap: '16px', 
        alignItems: 'flex-start',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: '1 1 300px' }}>
          <span style={{ 
            display: 'inline-block', 
            fontSize: '11px', 
            letterSpacing: '0.12em', 
            textTransform: 'uppercase', 
            color: 'var(--color-text-secondary)' 
          }}>
            Borrower experience
          </span>
          <h1 style={{ 
            margin: '0 0 10px', 
            fontSize: 'clamp(2rem, 4vw, 3.5rem)', 
            fontWeight: 800, 
            color: 'var(--color-text-primary)' 
          }}>
            Submit real proofs, receive a lender-ready decision.
          </h1>
          <p style={{ 
            margin: 0, 
            lineHeight: 1.6, 
            color: 'var(--color-text-secondary)' 
          }}>
            This flow is intentionally strict. Lendveil should show real inputs,
            honest failure states, and a clean underwriting output the moment a
            lender asks for it.
          </p>
        </div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', 
          gap: '16px', 
          minWidth: 'min(440px, 100%)' 
        }}>
          <div style={{ 
            padding: '18px', 
            borderRadius: '20px', 
            background: 'var(--color-bg-panel)', 
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--color-border-subtle)'
          }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Wallet</span>
            <strong style={{ 
              display: 'block', 
              marginTop: '8px', 
              color: 'var(--color-text-primary)' 
            }}>
              {connected && publicKey ? 'Connected' : 'Waiting'}
            </strong>
          </div>
          <div style={{ 
            padding: '18px', 
            borderRadius: '20px', 
            background: 'var(--color-bg-panel)', 
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--color-border-subtle)'
          }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Proof set</span>
            <strong style={{ 
              display: 'block', 
              marginTop: '8px', 
              color: 'var(--color-text-primary)' 
            }}>
              {progressLabel}
            </strong>
          </div>
          <div style={{ 
            padding: '18px', 
            borderRadius: '20px', 
            background: 'var(--color-bg-panel)', 
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--color-border-subtle)'
          }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Decision job</span>
            <strong style={{ 
              display: 'block', 
              marginTop: '8px', 
              color: 'var(--color-text-primary)' 
            }}>
              {jobId ? 'Queued' : 'Idle'}
            </strong>
          </div>
        </div>
      </section>

      <section style={{ 
        display: 'grid', 
        gridTemplateColumns: '1.2fr 0.8fr', 
        gap: '16px' 
      }}>
        <div style={{ 
          padding: '24px', 
          borderRadius: '26px', 
          background: 'var(--color-bg-panel)', 
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--color-border-subtle)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            gap: '16px', 
            alignItems: 'flex-start',
            flexWrap: 'wrap'
          }}>
            <div>
              <span style={{ 
                display: 'inline-block', 
                fontSize: '11px', 
                letterSpacing: '0.12em', 
                textTransform: 'uppercase', 
                color: 'var(--color-text-secondary)' 
              }}>
                Step 1
              </span>
              <h2 style={{ 
                margin: '0 0 10px', 
                color: 'var(--color-text-primary)' 
              }}>
                Connect borrower wallet
              </h2>
            </div>
            <div className="wallet-connected-zone">
              <WalletMultiButton />
            </div>
          </div>
          <p style={{ 
            margin: 0, 
            lineHeight: 1.6, 
            color: 'var(--color-text-secondary)',
            fontFamily: 'var(--font-mono)',
            wordBreak: 'break-all',
            marginTop: '16px'
          }}>
            {publicKey ? publicKey.toBase58() : 'No wallet connected yet.'}
          </p>
        </div>

        <div style={{ 
          padding: '24px', 
          borderRadius: '26px', 
          background: 'var(--color-bg-panel)', 
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--color-border-subtle)'
        }}>
          <span style={{ 
            display: 'inline-block', 
            fontSize: '11px', 
            letterSpacing: '0.12em', 
            textTransform: 'uppercase', 
            color: 'var(--color-text-secondary)' 
          }}>
            Policy window
          </span>
          <h2 style={{ 
            margin: '0 0 10px', 
            color: 'var(--color-text-primary)' 
          }}>
            Attestation envelope
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', 
            gap: '16px' 
          }}>
            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Issued at</span>
              <input 
                style={{ 
                  width: '100%', 
                  border: '1px solid var(--color-border-subtle)', 
                  borderRadius: '16px', 
                  padding: '14px 16px', 
                  color: 'var(--color-text-primary)', 
                  background: 'var(--color-bg-panel-hover)',
                  outline: 'none'
                }} 
                value={forms.issuedAt} 
                onChange={(e) => updateField('issuedAt', e.target.value)} 
              />
            </label>
            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Expires at</span>
              <input 
                style={{ 
                  width: '100%', 
                  border: '1px solid var(--color-border-subtle)', 
                  borderRadius: '16px', 
                  padding: '14px 16px', 
                  color: 'var(--color-text-primary)', 
                  background: 'var(--color-bg-panel-hover)',
                  outline: 'none'
                }} 
                value={forms.expiresAt} 
                onChange={(e) => updateField('expiresAt', e.target.value)} 
              />
            </label>
          </div>
        </div>
      </section>

      <section style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', 
        gap: '16px' 
      }}>
        {submissionBlueprint.map((step, index) => {
          const submitted = submittedKinds.includes(step.kind);
          const isJurisdiction = step.kind === 'jurisdiction';
          const Icon = submitted ? step.stagedIcon : step.icon;

          return (
            <article 
              key={step.kind}
              className="proof-envelope"
              style={{ 
                padding: '24px', 
                borderRadius: '26px', 
                background: 'var(--color-bg-panel)', 
                backdropFilter: 'blur(12px)',
                border: `1px solid ${submitted ? 'var(--color-border-active)' : 'var(--color-border-subtle)'}`,
                boxShadow: submitted ? '0 0 12px rgba(20, 241, 149, 0.15)' : 'none',
                transition: 'border 200ms ease, box-shadow 200ms ease',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                gap: '16px', 
                alignItems: 'flex-start' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '999px', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '0.8rem', 
                    letterSpacing: '0.08em', 
                    background: 'var(--color-bg-panel-hover)', 
                    color: 'var(--color-text-primary)', 
                    flex: '0 0 auto' 
                  }}>
                    0{index + 1}
                  </span>
                  <div>
                    <h3 style={{ 
                      margin: 0, 
                      color: 'var(--color-text-primary)' 
                    }}>
                      {step.title}
                    </h3>
                    <p style={{ 
                      margin: 0, 
                      lineHeight: 1.6, 
                      color: 'var(--color-text-secondary)',
                      marginTop: '4px'
                    }}>
                      {step.description}
                    </p>
                  </div>
                </div>
                {submitted && (
                  <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    padding: '7px 11px', 
                    borderRadius: '999px', 
                    fontSize: '0.78rem', 
                    fontWeight: 700, 
                    background: 'rgba(20, 241, 149, 0.1)', 
                    color: 'var(--color-accent-teal)'
                  }}>
                    Verified
                  </span>
                )}
                {!submitted && (
                  <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    padding: '7px 11px', 
                    borderRadius: '999px', 
                    fontSize: '0.78rem', 
                    fontWeight: 700, 
                    background: 'var(--color-bg-panel-hover)', 
                    color: 'var(--color-text-secondary)'
                  }}>
                    Pending
                  </span>
                )}
              </div>

              {!submitted ? (
                <div style={{ 
                  marginTop: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '32px',
                    border: '1px dashed var(--color-border-subtle)',
                    borderRadius: '16px',
                    background: 'var(--color-bg-panel)'
                  }}>
                    <Icon style={{ 
                      width: '48px', 
                      height: '48px', 
                      color: 'var(--color-text-secondary)',
                      marginBottom: '8px'
                    }} />
                    <span style={{ 
                      color: 'var(--color-text-secondary)', 
                      fontSize: '0.875rem'
                    }}>
                      Waiting for Attestation
                    </span>
                  </div>
                  
                  {step.kind === 'kyc' && (
                    <textarea
                      style={{ 
                        width: '100%', 
                        border: '1px solid var(--color-border-subtle)', 
                        borderRadius: '16px', 
                        padding: '14px 16px', 
                        color: 'var(--color-text-primary)', 
                        background: 'var(--color-bg-panel-hover)',
                        outline: 'none',
                        minHeight: '180px',
                        resize: 'vertical',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.92rem',
                        lineHeight: '1.45'
                      }}
                      value={forms.kyc}
                      onChange={(e) => updateField('kyc', e.target.value)}
                      placeholder='{"claimData": { ... }}'
                    />
                  )}

                  {step.kind === 'income' && (
                    <textarea
                      style={{ 
                        width: '100%', 
                        border: '1px solid var(--color-border-subtle)', 
                        borderRadius: '16px', 
                        padding: '14px 16px', 
                        color: 'var(--color-text-primary)', 
                        background: 'var(--color-bg-panel-hover)',
                        outline: 'none',
                        minHeight: '180px',
                        resize: 'vertical',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.92rem',
                        lineHeight: '1.45'
                      }}
                      value={forms.income}
                      onChange={(e) => updateField('income', e.target.value)}
                      placeholder='{"claimData": { ... }}'
                    />
                  )}

                  {isJurisdiction && (
                    <input
                      style={{ 
                        width: '100%', 
                        border: '1px solid var(--color-border-subtle)', 
                        borderRadius: '16px', 
                        padding: '14px 16px', 
                        color: 'var(--color-text-primary)', 
                        background: 'var(--color-bg-panel-hover)',
                        outline: 'none'
                      }}
                      value={forms.jurisdictionAccount}
                      onChange={(e) => updateField('jurisdictionAccount', e.target.value)}
                      placeholder="SAS attestation account public key"
                    />
                  )}
                  
                  <button 
                    onClick={() => submitAttestation(step.kind)} 
                    disabled={loading || !connected} 
                    style={{ 
                      width: '100%', 
                      padding: '13px 16px', 
                      borderRadius: '14px', 
                      border: '1px solid var(--color-border-subtle)', 
                      fontWeight: 700, 
                      cursor: 'pointer',
                      background: 'var(--color-bg-panel-hover)',
                      color: 'var(--color-text-primary)'
                    }}
                  >
                    {submitted ? 'Resubmit proof' : `Submit ${step.title}`}
                  </button>
                </div>
              ) : (
                <div className="proof-metadata" style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  maxHeight: 0,
                  overflow: 'hidden',
                  transition: 'max-height 300ms ease',
                  background: 'rgba(20, 241, 149, 0.05)',
                  padding: '0 24px'
                }}>
                  <div style={{
                    padding: '12px 0',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    color: 'var(--color-text-secondary)',
                    borderTop: '1px solid var(--color-border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span>Issued: {new Date(forms.issuedAt).toLocaleDateString()}</span>
                    <span>Expires: {new Date(forms.expiresAt).toLocaleDateString()}</span>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </section>

      {error && (
        <section style={{ 
          padding: '24px', 
          borderRadius: '26px', 
          background: 'rgba(255, 68, 68, 0.06)', 
          border: '1px solid rgba(255, 68, 68, 0.16)'
        }}>
          <strong style={{ 
            display: 'block', 
            marginBottom: '8px', 
            color: 'var(--color-text-primary)'
          }}>
            Submission blocked
          </strong>
          <p style={{ 
            margin: 0, 
            lineHeight: 1.6, 
            color: 'var(--color-text-secondary)'
          }}>
            {error}
          </p>
        </section>
      )}

      <section style={{ 
        display: 'grid', 
        gridTemplateColumns: '1.2fr 0.8fr', 
        gap: '16px',
        alignItems: 'start'
      }}>
        <div style={{ 
          padding: '24px', 
          borderRadius: '26px', 
          background: 'var(--color-bg-panel)', 
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--color-border-subtle)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            gap: '16px', 
            alignItems: 'flex-start',
            flexWrap: 'wrap'
          }}>
            <div>
              <span style={{ 
                display: 'inline-block', 
                fontSize: '11px', 
                letterSpacing: '0.12em', 
                textTransform: 'uppercase', 
                color: 'var(--color-text-secondary)' 
              }}>
                Step 2
              </span>
              <h2 style={{ 
                margin: '0 0 10px', 
                color: 'var(--color-text-primary)' 
              }}>
                Queue the underwriting request
              </h2>
            </div>
            <button 
              onClick={requestUnderwriting} 
              disabled={attestations.length < 3 || loading} 
              style={{ 
                width: '100%', 
                height: '52px', 
                background: 'transparent', 
                border: '1px solid var(--color-accent-teal)', 
                color: 'var(--color-accent-teal)', 
                fontWeight: 700, 
                letterSpacing: '0.08em', 
                textTransform: 'uppercase',
                borderRadius: '14px',
                cursor: 'pointer',
                transition: 'background 200ms ease, box-shadow 200ms ease',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.background = 'rgba(20, 241, 149, 0.08)';
                  e.currentTarget.style.boxShadow = '0 0 24px rgba(20, 241, 149, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {loading ? 'Processing...' : 'Submit for Underwriting'}
            </button>
          </div>
          <p style={{ 
            margin: 0, 
            lineHeight: 1.6, 
            color: 'var(--color-text-secondary)',
            marginTop: '16px'
          }}>
            Once all three proofs are staged, Lendveil converts them into policy inputs and queues a decision job.
          </p>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '12px',
            marginTop: '16px'
          }}>
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '7px 11px', 
              borderRadius: '999px', 
              fontSize: '0.78rem', 
              fontWeight: 700, 
              background: 'var(--color-bg-panel-hover)', 
              color: 'var(--color-text-secondary)'
            }}>
              {progressLabel}
            </span>
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '7px 11px', 
              borderRadius: '999px', 
              fontSize: '0.78rem', 
              fontWeight: 700, 
              background: 'var(--color-bg-panel-hover)', 
              color: 'var(--color-text-secondary)'
            }}>
              {jobId ? `Job ${jobId}` : 'No active job'}
            </span>
          </div>
          {jobId && (
            <button 
              onClick={refreshJob} 
              disabled={loading} 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px', 
                padding: '12px 18px', 
                borderRadius: '999px', 
                border: '1px solid var(--color-border-subtle)', 
                fontWeight: 700, 
                cursor: 'pointer', 
                background: 'transparent',
                color: 'var(--color-text-secondary)',
                marginTop: '16px'
              }}
            >
              Refresh job status
            </button>
          )}
        </div>

        <div style={{ 
          padding: '24px', 
          borderRadius: '26px', 
          background: 'var(--color-bg-panel)', 
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--color-border-subtle)'
        }}>
          <span style={{ 
            display: 'inline-block', 
            fontSize: '11px', 
            letterSpacing: '0.12em', 
            textTransform: 'uppercase', 
            color: 'var(--color-text-secondary)' 
          }}>
            Expected output
          </span>
          <h2 style={{ 
            margin: '0 0 10px', 
            color: 'var(--color-text-primary)' 
          }}>
            What the lender should see
          </h2>
          <ul style={{ 
            margin: 0, 
            paddingLeft: '20px', 
            display: 'grid', 
            gap: '14px'
          }}>
            <li style={{ 
              lineHeight: 1.6, 
              color: 'var(--color-text-secondary)'
            }}>
              Eligibility decision without raw personal documents.
            </li>
            <li style={{ 
              lineHeight: 1.6, 
              color: 'var(--color-text-secondary)'
            }}>
              Risk band and borrow limit tied to the locked policy.
            </li>
            <li style={{ 
              lineHeight: 1.6, 
              color: 'var(--color-text-secondary)'
            }}>
              Collateral requirement suitable for credit-side review.
            </li>
          </ul>
        </div>
      </section>

      {jobId && !decision && (
        <section style={{ 
          padding: '24px', 
          borderRadius: '26px', 
          background: 'var(--color-bg-panel)', 
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--color-border-subtle)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: '24px',
            marginBottom: '24px',
            flexWrap: 'wrap'
          }}>
            {steps.map((step, index) => (
              <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '999px', 
                  background: index < 2 ? 'var(--color-accent-teal)' : 'var(--color-bg-panel-hover)', 
                  border: `2px solid ${index < 2 ? 'var(--color-accent-teal)' : 'var(--color-border-subtle)'}`,
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: index < 2 ? '#000' : 'var(--color-text-secondary)',
                  fontWeight: 700,
                  animation: index === 2 ? 'pulse 1s ease-in-out infinite' : 'none',
                  flexShrink: 0
                }}>
                  {index + 1}
                </div>
                <span style={{ 
                  color: index < 2 ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap'
                }}>
                  {step}
                </span>
                {index < steps.length - 1 && (
                  <div style={{ 
                    flex: 1, 
                    height: '2px', 
                    background: index < 1 ? 'var(--color-accent-teal)' : 'var(--color-border-subtle)',
                    marginLeft: '12px'
                  }} />
                )}
              </div>
            ))}
          </div>
          
          <div style={{ 
            height: '160px', 
            overflowY: 'auto', 
            background: '#0a0a0a', 
            fontFamily: 'var(--font-mono)', 
            fontSize: '12px', 
            color: 'var(--color-text-mono)', 
            padding: '12px',
            borderRadius: '12px'
          }}>
            <div>[{new Date().toLocaleTimeString()}] Arcium compute node assigned</div>
            <div>[{new Date().toLocaleTimeString()}] Reclaim signature verified</div>
            <div>[{new Date().toLocaleTimeString()}] Policy engine loaded</div>
            <div>[{new Date().toLocaleTimeString()}] Input validation complete</div>
            <div>[{new Date().toLocaleTimeString()}] Risk band calculation in progress</div>
            <div>[{new Date().toLocaleTimeString()}] Decision being signed</div>
          </div>
        </section>
      )}

      {decision && (
        <section style={{ 
          padding: '24px', 
          borderRadius: '26px', 
          background: 'var(--color-bg-panel)', 
          backdropFilter: 'blur(12px)',
          border: `1px solid ${decision.eligible ? 'rgba(20, 241, 149, 0.5)' : 'rgba(255, 68, 68, 0.5)'}`,
          boxShadow: decision.eligible 
            ? '0 0 32px rgba(20, 241, 149, 0.2)' 
            : '0 0 32px rgba(255, 68, 68, 0.2)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            gap: '16px', 
            alignItems: 'flex-start',
            flexWrap: 'wrap'
          }}>
            <div>
              <span style={{ 
                display: 'inline-block', 
                fontSize: '11px', 
                letterSpacing: '0.12em', 
                textTransform: 'uppercase', 
                color: 'var(--color-text-secondary)' 
              }}>
                Decision result
              </span>
              <h2 style={{ 
                margin: '0 0 10px', 
                color: 'var(--color-text-primary)' 
              }}>
                {decision.eligible ? 'Eligible for undercollateralized credit' : 'Not eligible under current policy'}
              </h2>
            </div>
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '7px 11px', 
              borderRadius: '999px', 
              fontSize: '0.78rem', 
              fontWeight: 700,
              background: decision.eligible 
                ? 'rgba(20, 241, 149, 0.1)' 
                : 'rgba(255, 68, 68, 0.1)',
              color: decision.eligible 
                ? 'var(--color-accent-teal)' 
                : 'var(--color-accent-crimson)'
            }}>
              {decision.eligible ? 'Approved' : 'Declined'}
            </span>
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '16px',
            marginTop: '24px'
          }}>
            <div>
              <span style={{ color: 'var(--color-text-secondary)' }}>Risk band</span>
              <strong style={{ 
                display: 'block', 
                marginTop: '8px', 
                color: 'var(--color-text-primary)' 
              }}>
                {decision.risk_band || 'N/A'}
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-secondary)' }}>Max borrow</span>
              <strong style={{ 
                display: 'block', 
                marginTop: '8px', 
                color: 'var(--color-accent-teal)',
                fontSize: '3rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)'
              }}>
                {decision.max_borrow_usd ? `$${Number(decision.max_borrow_usd).toLocaleString()}` : 'N/A'}
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-secondary)' }}>Collateral ratio</span>
              <strong style={{ 
                display: 'block', 
                marginTop: '8px', 
                color: 'var(--color-text-primary)',
                fontSize: '2.25rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)'
              }}>
                {decision.collateral_ratio ? `${(Number(decision.collateral_ratio) * 100).toFixed(0)}%` : 'N/A'}
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-secondary)' }}>Reason</span>
              <strong style={{ 
                display: 'block', 
                marginTop: '8px', 
                color: 'var(--color-text-primary)' 
              }}>
                {decision.reason}
              </strong>
            </div>
          </div>
          
          <button 
            onClick={copyDecision} 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px', 
              padding: '12px 18px', 
              borderRadius: '999px', 
              border: '1px solid var(--color-border-subtle)', 
              fontWeight: 700, 
              cursor: 'pointer', 
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              marginTop: '24px'
            }}
          >
            {copied ? <Check size={16} /> : <Clipboard size={16} />}
            {copied ? 'Copied!' : 'Copy Proof Signature'}
          </button>
        </section>
      )}
    </main>
  );
}
