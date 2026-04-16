import { getClients, createClient, deleteClient, addProjectCost } from '../actions/clientActions';
import { revalidatePath } from 'next/cache';

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div>
      <h1 style={{ marginBottom: '20px' }}>Client Management</h1>
      
      <div className="glass-card" style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '20px', fontSize: '1.2rem' }}>Add New Client</h2>
        <form action={createClient} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Client Name</label>
            <input type="text" name="name" required className="input-field" placeholder="Acme Corp" />
          </div>
          <div>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Industry</label>
            <input type="text" name="industry" className="input-field" placeholder="Technology" />
          </div>
          <div>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Credit Limit ($)</label>
            <input type="number" name="creditLimit" required className="input-field" defaultValue="5000" />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" className="btn-primary" style={{ width: '100%' }}>Create Client</button>
          </div>
        </form>
      </div>

      <div className="glass-card">
        <h2 style={{ marginBottom: '30px', fontSize: '1.2rem' }}>Active Clients</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {clients.map(client => (
            <div key={client.id} style={{ padding: '20px', border: '1px solid var(--glass-border)', borderRadius: '12px', background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '1.1rem' }}>{client.name}</h3>
                <form action={async () => {
                  'use server';
                  await deleteClient(client.id);
                }}>
                  <button type="submit" style={{ background: 'transparent', color: 'var(--critical)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
                </form>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '15px' }}>{client.industry || 'No Industry'} • Limit: ${client.creditLimit}</p>
              
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>Add Operations Cost</h4>
                <form action={async (formData) => {
                  'use server';
                  await addProjectCost(client.id, formData.get('amount'), formData.get('desc'));
                }} style={{ display: 'flex', gap: '10px' }}>
                  <input type="number" name="amount" placeholder="Cost ($)" required className="input-field" style={{ marginTop: 0, padding: '8px' }} />
                  <input type="text" name="desc" placeholder="Desc" className="input-field" style={{ marginTop: 0, padding: '8px' }} />
                  <button type="submit" className="btn-primary" style={{ padding: '8px 12px' }}>+</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
