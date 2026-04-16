import { getInvoices, createInvoice, markInvoicePaid } from '../actions/invoiceActions';
import { getClients } from '../actions/clientActions';

export default async function InvoicesPage() {
  const invoices = await getInvoices();
  const clients = await getClients();

  return (
    <div>
      <h1 style={{ marginBottom: '20px' }}>Invoices & Payments</h1>
      
      <div className="glass-card" style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '20px', fontSize: '1.2rem' }}>Create New Invoice</h2>
        <form action={createInvoice} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Select Client</label>
            <select name="clientId" required className="input-field" style={{ padding: '13px' }}>
              <option value="" disabled selected>-- Choose Client --</option>
              {clients.map(c => (
                <option key={c.id} value={c.id} style={{ color: 'black' }}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Amount ($)</label>
            <input type="number" name="amount" required className="input-field" placeholder="1000" />
          </div>
          <div>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Due Date</label>
            <input type="date" name="dueDate" required className="input-field" style={{ padding: '10px 16px' }} />
          </div>
          <div style={{ gridColumn: 'span 3', display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button type="submit" className="btn-primary" style={{ width: '200px' }}>Issue Invoice</button>
          </div>
        </form>
      </div>

      <div className="glass-card">
        <h2 style={{ marginBottom: '20px', fontSize: '1.2rem' }}>Invoices Tracker</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <th style={{ padding: '15px' }}>Client</th>
              <th style={{ padding: '15px' }}>Amount</th>
              <th style={{ padding: '15px' }}>Due Date</th>
              <th style={{ padding: '15px' }}>Status</th>
              <th style={{ padding: '15px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(invoice => {
              const isOverdue = invoice.status === 'UNPAID' && new Date(invoice.dueDate) < new Date();
              const displayStatus = isOverdue ? 'OVERDUE' : invoice.status;
              
              return (
              <tr key={invoice.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '15px' }}>{invoice.client.name}</td>
                <td style={{ padding: '15px', fontWeight: 'bold' }}>${invoice.amount}</td>
                <td style={{ padding: '15px' }}>{new Date(invoice.dueDate).toLocaleDateString()}</td>
                <td style={{ padding: '15px' }}>
                  <span className={`status-badge status-${displayStatus === 'PAID' ? 'positive' : displayStatus === 'OVERDUE' ? 'critical' : 'warning'}`}>
                    {displayStatus}
                  </span>
                </td>
                <td style={{ padding: '15px', textAlign: 'right' }}>
                  {invoice.status !== 'PAID' && (
                    <form action={async () => {
                      'use server';
                      await markInvoicePaid(invoice.id);
                    }}>
                      <button type="submit" className="status-badge" style={{ cursor: 'pointer', background: 'rgba(59, 130, 246, 0.2)', color: 'var(--accent)', border: '1px solid var(--accent-glow)' }}>
                        Mark Paid
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            )})}
            {invoices.length === 0 && (
              <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No invoices found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
