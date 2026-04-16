export function calculateClientMetrics(client, costs) {
  const totalRevenue = client.invoices
    .filter(inv => inv.status === 'PAID')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const totalCost = costs
    .filter(c => c.clientId === client.id)
    .reduce((sum, c) => sum + c.costAmount, 0);
  
  const netProfit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

  // Risk Score calculation
  let riskScore = 0;
  
  const overdueInvoices = client.invoices.filter(inv => 
    inv.status === 'OVERDUE' || (inv.status === 'UNPAID' && new Date(inv.dueDate) < new Date())
  );
  const unpaidInvoices = client.invoices.filter(inv => inv.status === 'UNPAID' && new Date(inv.dueDate) >= new Date());
  
  // +20 points for every overdue invoice
  riskScore += overdueInvoices.length * 20;
  // +5 points for unpaid invoices that aren't overdue yet (just slight risk if piling up)
  if (unpaidInvoices.length > 3) riskScore += 10;
  
  let riskCategory = 'Low';
  if (riskScore >= 40) riskCategory = 'High';
  else if (riskScore >= 20) riskCategory = 'Medium';

  return {
    totalRevenue,
    netProfit,
    margin,
    riskScore,
    riskCategory,
    overdueCount: overdueInvoices.length
  };
}

export function generateRecommendation(metrics) {
  const { netProfit, riskCategory, riskScore } = metrics;
  
  if (netProfit > 5000 && riskCategory === 'Low') {
    return { text: 'Ideal Client - Prioritize & Retain', type: 'positive' };
  }
  
  if (netProfit > 5000 && riskCategory === 'High') {
    return { text: 'Profitable but High Risk - Monitor Late Payments Closely', type: 'warning' };
  }
  
  if (netProfit <= 0 && riskCategory === 'High') {
    return { text: 'Negative Profit + High Risk -> Avoid / Terminate', type: 'critical' };
  }
  
  if (netProfit < 1000 && riskCategory === 'Low') {
    return { text: 'Low Profit - Consider Pricing Increase', type: 'neutral' };
  }
  
  if (riskScore > 60) {
    return { text: 'Frequent late payer -> Reduce Credit Limit or Require Upfront Payment', type: 'critical' };
  }

  return { text: 'Stable Client - Maintain operations', type: 'neutral' };
}
