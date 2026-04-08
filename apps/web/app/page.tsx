const pillars = [
  {
    title: "Private Eligibility",
    body: "Borrowers present verified attestations. Protocols receive only the underwriting result they need."
  },
  {
    title: "Protocol Decisioning",
    body: "The first workflow is undercollateralized lending with eligibility, risk band, and lending terms."
  },
  {
    title: "Startup Wedge",
    body: "This is decisioning infrastructure for Solana finance, not another identity dashboard or lending fork."
  }
];

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <span className="eyebrow">Confidential Underwriting API</span>
        <h1>Private credit decisions on Solana.</h1>
        <p>
          We help Solana apps evaluate borrower eligibility from verifiable
          credentials without collecting raw sensitive data.
        </p>
        <div className="hero-actions">
          <a className="button primary" href="#">
            Start Borrower Flow
          </a>
          <a className="button secondary" href="#">
            View Lender Dashboard
          </a>
        </div>
      </section>

      <section className="grid" aria-label="Core pillars">
        {pillars.map((pillar) => (
          <article className="card" key={pillar.title}>
            <h2>{pillar.title}</h2>
            <p>{pillar.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
