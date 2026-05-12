import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import WalletContextProvider from "@/components/WalletProvider";

export const metadata: Metadata = {
  title: "Lendveil",
  description: "Private credit decisions on Solana."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <WalletContextProvider>
          <div className="site-bg" />
          <div className="site-shell">
            <header style={{ 
              width: 'min(1120px, calc(100% - 32px))', 
              margin: '0 auto', 
              padding: '22px 0 10px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              gap: '18px'
            }}>
              <Link href="/" style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '12px',
                color: 'inherit',
                textDecoration: 'none'
              }} aria-label="Lendveil home">
                <span style={{ 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '999px', 
                  background: 'linear-gradient(135deg, var(--color-accent-purple), var(--color-accent-teal))', 
                  boxShadow: '0 0 0 6px rgba(20, 241, 149, 0.08)'
                }} />
                <span>
                  <strong style={{ 
                    display: 'block', 
                    fontSize: '1rem',
                    color: 'var(--color-text-primary)'
                  }}>Lendveil</strong>
                  <small style={{ 
                    display: 'block', 
                    color: 'var(--color-text-secondary)', 
                    fontSize: '0.78rem'
                  }}>Confidential underwriting infrastructure</small>
                </span>
              </Link>
              <nav style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px', 
                color: 'var(--color-text-secondary)', 
                fontSize: '0.95rem'
              }} aria-label="Primary">
                <Link href="/" style={{ 
                  color: 'inherit',
                  textDecoration: 'none'
                }}>Overview</Link>
                <Link href="/borrower" style={{ 
                  color: 'inherit',
                  textDecoration: 'none'
                }}>Borrower Flow</Link>
                <Link href="/lender" style={{ 
                  color: 'inherit',
                  textDecoration: 'none'
                }}>Lender Console</Link>
              </nav>
            </header>
            {children}
          </div>
        </WalletContextProvider>
      </body>
    </html>
  );
}
