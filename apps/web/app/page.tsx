const pillars = [
  {
    title: "Private eligibility, not raw exposure",
    body: "Borrowers present verifiable credentials, and protocols receive only the decisioning output they need to underwrite responsibly."
  },
  {
    title: "Built for protocol operators",
    body: "Lendveil is shaped as decisioning infrastructure for undercollateralized credit, RWAs, and institution-facing Solana products."
  },
  {
    title: "Auditability without data drag",
    body: "Every request resolves into a policy result, risk band, and terms payload that teams can review without warehousing sensitive user data."
  }
];

const workflow = [
  "Borrower connects a wallet and submits verified KYC, income, and jurisdiction attestations.",
  "Lendveil validates the issuer path, maps proofs to policy inputs, and prepares a confidential evaluation payload.",
  "The lender receives only the output that matters: eligibility, risk band, borrow limit, and collateral requirement."
];

const metrics = [
  { label: "Primary wedge", value: "Private credit" },
  { label: "Decision output", value: "Eligibility + risk" },
  { label: "Deployment shape", value: "API + web + queue" }
];

export default function HomePage() {
  return (
    <main style={{ 
      width: 'min(1120px, calc(100% - 32px))', 
      margin: '0 auto', 
      padding: '22px 0 72px',
      display: 'grid',
      gap: '22px'
    }}>
      <section style={{ 
        display: 'grid', 
        gap: '28px', 
        padding: '32px', 
        borderRadius: '30px', 
        background: 'var(--color-bg-panel)', 
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--color-border-subtle)',
        gridTemplateColumns: '1.3fr 0.9fr'
      }}>
        <div style={{ 
          display: 'grid', 
          gap: '20px'
        }}>
          <span style={{ 
            display: 'inline-block', 
            fontSize: '11px', 
            letterSpacing: '0.12em', 
            textTransform: 'uppercase', 
            color: 'var(--color-text-secondary)' 
          }}>
            Solana underwriting stack
          </span>
          <h1 style={{ 
            margin: 0, 
            fontSize: 'clamp(2.65rem, 6vw, 5.4rem)', 
            lineHeight: 0.95, 
            letterSpacing: '-0.04em',
            color: 'var(--color-text-primary)'
          }}>
            Private credit decisions that feel like a product, not a protocol demo.
          </h1>
          <p style={{ 
            margin: 0, 
            lineHeight: 1.6, 
            color: 'var(--color-text-secondary)'
          }}>
            Lendveil helps lenders evaluate borrowers from verifiable credentials
            without collecting raw financial or identity data. The result is a
            cleaner underwriting flow for institutional DeFi.
          </p>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '12px'
          }}>
            <a href="/borrower" style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px', 
              padding: '12px 18px', 
              borderRadius: '999px', 
              border: '1px solid var(--color-accent-teal)', 
              background: 'var(--color-accent-teal)',
              color: '#000',
              fontWeight: 700, 
              cursor: 'pointer',
              textDecoration: 'none'
            }}>
              Launch Borrower Flow
            </a>
            <a href="/lender" style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px', 
              padding: '12px 18px', 
              borderRadius: '999px', 
              border: '1px solid var(--color-border-subtle)', 
              background: 'transparent',
              color: 'var(--color-text-primary)',
              fontWeight: 700, 
              cursor: 'pointer',
              textDecoration: 'none'
            }}>
              Open Lender Console
            </a>
          </div>
        </div>

        <div style={{ 
          display: 'grid',
          gap: '16px'
        }}>
          <div style={{ 
            padding: '20px',
            borderRadius: '22px',
            background: 'linear-gradient(180deg, rgba(20, 241, 149, 0.1), rgba(255, 255, 255, 0.03))',
            border: '1px solid rgba(20, 241, 149, 0.12)'
          }}>
            <span style={{ 
              color: 'var(--color-text-secondary)', 
              fontSize: '11px', 
              letterSpacing: '0.12em', 
              textTransform: 'uppercase'
            }}>Live product narrative</span>
            <strong style={{ 
              display: 'block', 
              marginTop: '8px',
              color: 'var(--color-text-primary)'
            }}>Private underwriting on Solana</strong>
            <p style={{ 
              margin: 0, 
              lineHeight: 1.6, 
              color: 'var(--color-text-secondary)',
              marginTop: '8px'
            }}>
              The borrower sees a guided submission flow. The lender sees a clean
              decision console. No repo archaeology required during the demo.
            </p>
          </div>
          <div style={{ 
            display: 'grid',
            gap: '14px',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))'
          }}>
            {metrics.map((metric) => (
              <div key={metric.label} style={{ 
                padding: '18px', 
                borderRadius: '20px', 
                background: 'var(--color-bg-panel)', 
                backdropFilter: 'blur(12px)',
                border: '1px solid var(--color-border-subtle)'
              }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>{metric.label}</span>
                <strong style={{ 
                  display: 'block', 
                  marginTop: '8px',
                  color: 'var(--color-text-primary)'
                }}>{metric.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: '16px'
      }} aria-label="Core pillars">
        {pillars.map((pillar) => (
          <article key={pillar.title} style={{ 
            padding: '24px',
            borderRadius: '26px',
            background: 'var(--color-bg-panel)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--color-border-subtle)'
          }}>
            <h2 style={{ 
              margin: 0,
              color: 'var(--color-text-primary)'
            }}>{pillar.title}</h2>
            <p style={{ 
              margin: 0, 
              lineHeight: 1.6, 
              color: 'var(--color-text-secondary)',
              marginTop: '8px'
            }}>{pillar.body}</p>
          </article>
        ))}
      </section>

      <section style={{ 
        padding: '24px',
        borderRadius: '26px',
        background: 'var(--color-bg-panel)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--color-border-subtle)',
        display: 'grid',
        gridTemplateColumns: '0.9fr 1.1fr',
        gap: '18px',
        alignItems: 'start'
      }}>
        <div>
          <span style={{ 
            display: 'inline-block', 
            fontSize: '11px', 
            letterSpacing: '0.12em', 
            textTransform: 'uppercase', 
            color: 'var(--color-text-secondary)' 
          }}>
            Workflow
          </span>
          <h2 style={{ 
            margin: '0 0 10px', 
            color: 'var(--color-text-primary)' 
          }}>
            One crisp flow, end to end.
          </h2>
          <p style={{ 
            margin: 0, 
            lineHeight: 1.6, 
            color: 'var(--color-text-secondary)'
          }}>
            The fastest way to make this feel fundable is to show one borrower,
            one policy, and one decision outcome with zero ambiguity.
          </p>
        </div>
        <ol style={{ 
          margin: 0, 
          paddingLeft: '20px', 
          display: 'grid', 
          gap: '14px'
        }}>
          {workflow.map((item) => (
            <li key={item} style={{ 
              lineHeight: 1.6, 
              color: 'var(--color-text-secondary)'
            }}>
              {item}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
