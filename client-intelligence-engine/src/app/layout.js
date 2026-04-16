import "./globals.css";
import Link from 'next/link';

export const metadata = {
  title: "Client Intelligence Engine",
  description: "B2B SaaS to actively help businesses increase profitability and reduce risk.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="layout-container">
          <aside className="sidebar">
            <h2 style={{color: 'white', marginBottom: '40px', fontSize: '1.5rem', fontWeight: 700}}>
              Intelligence <span style={{color: 'var(--accent)'}}>Engine</span>
            </h2>
            <nav>
              <Link href="/" className="nav-link">Dashboard</Link>
              <Link href="/clients" className="nav-link">Client Profiles</Link>
              <Link href="/invoices" className="nav-link">Invoices & Payments</Link>
              <div style={{ marginTop: 'auto', paddingTop: '40px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>BETA v0.1</p>
              </div>
            </nav>
          </aside>
          <main style={{flex: 1}}>
            <div className="main-content">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
