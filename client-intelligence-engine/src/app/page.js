import prisma from '@/lib/prisma';
import { calculateClientMetrics, generateRecommendation } from './utils/intelligenceEngine';
import { updateOverdueInvoices } from './actions/invoiceActions';
import Link from 'next/link';

export default async function Dashboard() {
  const clients = await prisma.client.findMany({ include: { invoices: true }});
  const costs = await prisma.projectCost.findMany();

  let totalRevenueAll = 0;
  let outstandingPayments = 0;
  
  const clientInsights = clients.map(client => {
    const metrics = calculateClientMetrics(client, costs);
    const recommendation = generateRecommendation(metrics);
    
    totalRevenueAll += metrics.totalRevenue;
    
    const clientOutstanding = client.invoices
      .filter(i => i.status !== 'PAID')
      .reduce((sum, i) => sum + i.amount, 0);
    outstandingPayments += clientOutstanding;
    
    return { ...client, metrics, recommendation };
  });

  // Sorting to find highest risk and highest profit
  const topProfitable = [...clientInsights].sort((a, b) => b.metrics.netProfit - a.metrics.netProfit).slice(0, 3);
  const highestRisk = [...clientInsights].filter(c => c.metrics.riskScore >= 40).sort((a, b) => b.metrics.riskScore - a.metrics.riskScore);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
        <div>
          <h1>Intelligence Overview</h1>
          <p style={{ color: 'var(--text-muted)' }}>Actionable insights specifically targeted to maximize your profitability.</p>
        </div>
      </div>

      {/* Top Value Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div className="glass-card">
          <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Total Net Revenue</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 700, margin: '10px 0' }}>${totalRevenueAll.toLocaleString()}</p>
          <span className="status-badge status-positive">Processed</span>
        </div>
        <div className="glass-card">
          <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Outstanding Payments</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 700, margin: '10px 0', color: outstandingPayments > 0 ? 'var(--warning)' : 'inherit' }}>${outstandingPayments.toLocaleString()}</p>
          <span className="status-badge status-warning">Action Required</span>
        </div>
        <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(30, 41, 59, 0.7))', borderColor: 'rgba(239, 68, 68, 0.3)'}}>
          <h3 style={{ color: '#fca5a5', fontSize: '0.9rem', textTransform: 'uppercase' }}>High Risk Clients</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 700, margin: '10px 0', color: 'white' }}>{highestRisk.length}</p>
          <span className="status-badge status-critical">Monitor Carefully</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', marginBottom: '40px' }}>
        
        {/* Core Intelligence Engine Section */}
        <div>
          <h2 style={{ fontSize: '1.4rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px', marginBottom: '20px' }}>
            🧠 Decision Engine Actions
          </h2>
          
          {clientInsights.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {clientInsights.map((client) => (
                <div key={client.id} className="glass-card" style={{ borderLeft: `4px solid var(--${client.recommendation.type})` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <h3 style={{ fontSize: '1.2rem', margin: 0 }}>{client.name}</h3>
                    <span className={`status-badge status-${client.recommendation.type === 'critical' ? 'critical' : client.recommendation.type === 'warning' ? 'warning' : 'positive'}`}>
                      Risk: {client.metrics.riskCategory}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '15px' }}>
                    Profit: <strong style={{color: 'white'}}>${client.metrics.netProfit}</strong> • 
                    Margin: <strong style={{color: 'white'}}>{client.metrics.margin}%</strong>
                  </p>
                  <div style={{ 
                    background: `rgba(${client.recommendation.type === 'critical' ? '239, 68, 68' : client.recommendation.type === 'warning' ? '245, 158, 11' : '16, 185, 129'}, 0.1)`, 
                    padding: '12px', 
                    borderRadius: '8px',
                    border: `1px solid rgba(${client.recommendation.type === 'critical' ? '239, 68, 68' : client.recommendation.type === 'warning' ? '245, 158, 11' : '16, 185, 129'}, 0.2)`
                  }}>
                    <strong style={{ display: 'block', marginBottom: '5px', color: `var(--${client.recommendation.type})`}}>Engine Recommendation:</strong>
                    {client.recommendation.text}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>No client data available yet to generate insights.</p>
              <Link href="/clients"><button className="btn-primary">Add Your First Client</button></Link>
            </div>
          )}
        </div>

        {/* Sidebar Summary Area */}
        <div>
          <div className="glass-card" style={{ marginBottom: '20px' }}>
            <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px', marginBottom: '15px' }}>Top Performers</h3>
            {topProfitable.length > 0 ? topProfitable.map(client => (
              <div key={client.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span>{client.name}</span>
                <strong style={{ color: 'var(--positive)' }}>${client.metrics.netProfit}</strong>
              </div>
            )) : <p style={{ color: 'var(--text-muted)' }}>No data</p>}
          </div>
          
          <div className="glass-card" style={{ background: 'rgba(239, 68, 68, 0.05)' }}>
            <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px', marginBottom: '15px', color: 'var(--critical)' }}>Attention Required</h3>
            {highestRisk.length > 0 ? highestRisk.map(client => (
              <div key={client.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span>{client.name}</span>
                <span className="status-badge status-critical">Score: {client.metrics.riskScore}</span>
              </div>
            )) : <p style={{ color: 'var(--positive)' }}>All clients are currently low risk.</p>}
          </div>
        </div>

      </div>
    </div>
  );
}
