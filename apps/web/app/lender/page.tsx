'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type DecisionRequest = {
  request_id: string;
  borrower_pubkey: string;
  status: string;
  created_at: string;
  decision?: {
    eligible: boolean;
    risk_band?: string;
    max_borrow_usd?: number | string;
    collateral_ratio?: number | string;
    reason: string;
  };
};

export default function LenderPage() {
  const [requests, setRequests] = useState<DecisionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/underwriting/requests?limit=50`, {
        cache: 'no-store'
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to load underwriting requests');
      }
      setRequests(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRequests();
  }, []);

  const stats = useMemo(() => {
    const approved = requests.filter((request) => request.decision?.eligible).length;
    const completed = requests.filter((request) => request.status === 'COMPLETED').length;
    const queued = requests.filter((request) => request.status !== 'COMPLETED').length;

    return { approved, completed, queued, total: requests.length };
  }, [requests]);

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
        alignItems: 'flex-start' 
      }}>
        <div>
          <span style={{ 
            display: 'inline-block', 
            fontSize: '11px', 
            letterSpacing: '0.12em', 
            textTransform: 'uppercase', 
            color: 'var(--color-text-secondary)' 
          }}>
            Lender console
          </span>
          <h1 style={{ 
            margin: '0 0 10px', 
            fontSize: 'clamp(2rem, 4vw, 3.5rem)', 
            fontWeight: 800, 
            color: 'var(--color-text-primary)' 
          }}>
            Review underwriting output, not borrower raw data.
          </h1>
          <p style={{ 
            margin: 0, 
            lineHeight: 1.6, 
            color: 'var(--color-text-secondary)' 
          }}>
            This view is the protocol-side surface: a lender should be able to read risk, terms,
            and status in seconds without digging through proofs.
          </p>
        </div>
        <button onClick={fetchRequests} disabled={loading} style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '8px', 
          padding: '12px 18px', 
          borderRadius: '999px', 
          border: '1px solid var(--color-border-subtle)', 
          fontWeight: 700, 
          cursor: 'pointer', 
          background: 'var(--color-bg-panel)',
          color: 'var(--color-text-primary)'
        }}>
          {loading ? 'Refreshing...' : 'Refresh decisions'}
        </button>
      </section>

      <section style={{ 
        display: 'grid', 
        gap: '14px', 
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))'
      }}>
        <div style={{ 
          padding: '18px', 
          borderRadius: '20px', 
          background: 'var(--color-bg-panel)', 
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--color-border-subtle)'
        }}>
          <span style={{ 
            color: 'var(--color-text-secondary)', 
            fontSize: '11px', 
            letterSpacing: '0.12em', 
            textTransform: 'uppercase'
          }}>Total requests</span>
          <strong style={{ 
            display: 'block', 
            marginTop: '8px',
            fontSize: '2.25rem',
            fontWeight: 700,
            color: 'var(--color-text-primary)'
          }}>{stats.total}</strong>
        </div>
        <div style={{ 
          padding: '18px', 
          borderRadius: '20px', 
          background: 'var(--color-bg-panel)', 
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--color-border-subtle)'
        }}>
          <span style={{ 
            color: 'var(--color-text-secondary)', 
            fontSize: '11px', 
            letterSpacing: '0.12em', 
            textTransform: 'uppercase'
          }}>Completed</span>
          <strong style={{ 
            display: 'block', 
            marginTop: '8px',
            fontSize: '2.25rem',
            fontWeight: 700,
            color: 'var(--color-text-primary)'
          }}>{stats.completed}</strong>
        </div>
        <div style={{ 
          padding: '18px', 
          borderRadius: '20px', 
          background: 'var(--color-bg-panel)', 
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--color-border-subtle)'
        }}>
          <span style={{ 
            color: 'var(--color-text-secondary)', 
            fontSize: '11px', 
            letterSpacing: '0.12em', 
            textTransform: 'uppercase'
          }}>Approved</span>
          <strong style={{ 
            display: 'block', 
            marginTop: '8px',
            fontSize: '2.25rem',
            fontWeight: 700,
            color: 'var(--color-text-primary)'
          }}>{stats.approved}</strong>
        </div>
        <div style={{ 
          padding: '18px', 
          borderRadius: '20px', 
          background: 'var(--color-bg-panel)', 
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--color-border-subtle)',
          position: 'relative'
        }}>
          {stats.queued > 0 && (
            <div style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '12px',
              height: '12px',
              borderRadius: '999px',
              border: '2px solid var(--color-accent-purple)',
              borderTopColor: 'transparent',
              animation: 'spin 1s linear infinite'
            }} />
          )}
          <span style={{ 
            color: 'var(--color-text-secondary)', 
            fontSize: '11px', 
            letterSpacing: '0.12em', 
            textTransform: 'uppercase'
          }}>Queued</span>
          <strong style={{ 
            display: 'block', 
            marginTop: '8px',
            fontSize: '2.25rem',
            fontWeight: 700,
            color: 'var(--color-text-primary)'
          }}>{stats.queued}</strong>
        </div>
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
            Console unavailable
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
        padding: '24px', 
        borderRadius: '26px', 
        background: 'var(--color-bg-panel)', 
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--color-border-subtle)',
        display: 'grid',
        gap: '18px'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          gap: '16px', 
          alignItems: 'flex-start' 
        }}>
          <div>
            <span style={{ 
              display: 'inline-block', 
              fontSize: '11px', 
              letterSpacing: '0.12em', 
              textTransform: 'uppercase', 
              color: 'var(--color-text-secondary)' 
            }}>
              Decision feed
            </span>
            <h2 style={{ 
              margin: '0 0 10px', 
              color: 'var(--color-text-primary)' 
            }}>
              Recent underwriting requests
            </h2>
          </div>
        </div>

        {loading ? (
          <div style={{ 
            padding: '24px', 
            borderRadius: '22px', 
            background: 'var(--color-bg-panel)', 
            border: '1px dashed var(--color-border-subtle)'
          }}>
            <strong style={{ 
              display: 'block', 
              marginBottom: '8px', 
              color: 'var(--color-text-primary)'
            }}>Loading decisions</strong>
            <p style={{ 
              margin: 0, 
              lineHeight: 1.6, 
              color: 'var(--color-text-secondary)'
            }}>
              We are pulling the latest underwriting outputs from the API.
            </p>
          </div>
        ) : requests.length === 0 ? (
          <div style={{ 
            padding: '24px', 
            borderRadius: '22px', 
            background: 'var(--color-bg-panel)', 
            border: '1px dashed var(--color-border-subtle)'
          }}>
            <strong style={{ 
              display: 'block', 
              marginBottom: '8px', 
              color: 'var(--color-text-primary)'
            }}>No decisions yet</strong>
            <p style={{ 
              margin: 0, 
              lineHeight: 1.6, 
              color: 'var(--color-text-secondary)'
            }}>
              The lender console will populate after borrowers submit real requests.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '14px' }}>
            {requests.map((request) => {
              const decision = request.decision;
              return (
                <article key={request.request_id} style={{
                  padding: '18px',
                  borderRadius: '20px',
                  background: 'var(--color-bg-panel)',
                  border: '1px solid var(--color-border-subtle)',
                  display: 'grid',
                  gap: '14px'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    gap: '16px', 
                    alignItems: 'flex-start' 
                  }}>
                    <div>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Borrower</span>
                      <strong style={{ 
                        display: 'block', 
                        marginTop: '8px', 
                        color: 'var(--color-text-primary)',
                        fontFamily: 'var(--font-mono)',
                        wordBreak: 'break-all'
                      }}>
                        {request.borrower_pubkey.slice(0, 8)}...{request.borrower_pubkey.slice(-6)}
                      </strong>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      gap: '8px', 
                      flexWrap: 'wrap' 
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
                        {request.status}
                      </span>
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        padding: '7px 11px', 
                        borderRadius: '999px', 
                        fontSize: '0.78rem', 
                        fontWeight: 700,
                        background: decision?.eligible 
                          ? 'rgba(20, 241, 149, 0.1)' 
                          : decision 
                            ? 'rgba(255, 68, 68, 0.1)' 
                            : 'var(--color-bg-panel-hover)',
                        color: decision?.eligible 
                          ? 'var(--color-accent-teal)' 
                          : decision 
                            ? 'var(--color-accent-crimson)' 
                            : 'var(--color-text-secondary)'
                      }}>
                        {decision ? (decision.eligible ? 'Eligible' : 'Declined') : 'Pending'}
                      </span>
                    </div>
                  </div>

                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                    gap: '16px'
                  }}>
                    <div>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Risk band</span>
                      <strong style={{ 
                        display: 'block', 
                        marginTop: '8px', 
                        color: 'var(--color-text-primary)' 
                      }}>
                        {decision?.risk_band || 'N/A'}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Max borrow</span>
                      <strong style={{ 
                        display: 'block', 
                        marginTop: '8px', 
                        color: 'var(--color-text-primary)' 
                      }}>
                        {decision?.max_borrow_usd ? `$${Number(decision.max_borrow_usd).toLocaleString()}` : 'N/A'}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Collateral</span>
                      <strong style={{ 
                        display: 'block', 
                        marginTop: '8px', 
                        color: 'var(--color-text-primary)' 
                      }}>
                        {decision?.collateral_ratio ? `${(Number(decision.collateral_ratio) * 100).toFixed(0)}%` : 'N/A'}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Created</span>
                      <strong style={{ 
                        display: 'block', 
                        marginTop: '8px', 
                        color: 'var(--color-text-primary)' 
                      }}>
                        {new Date(request.created_at).toLocaleString()}
                      </strong>
                    </div>
                  </div>

                  <p style={{ 
                    margin: 0, 
                    lineHeight: 1.6, 
                    color: 'var(--color-text-secondary)'
                  }}>
                    {decision?.reason || 'Waiting for underwriting output.'}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
