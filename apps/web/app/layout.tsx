import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Confidential Underwriting API",
  description: "Private credit decisions on Solana."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
