/* ============================================
   YANTRIXIA CLIENTPULSE — Core Application
   B2B Client Health Scorer — Main App Logic
   ============================================ */

const App = (() => {
    // State
    let clients = [];
    let currentView = 'dashboard';
    let editingClientId = null;
    let searchQuery = '';
    let sortBy = 'score';
    let sortDir = 'desc';
    let filterStatus = 'all';

    // Subscription state
    let subscription = {
        plan: 'trial',
        trialStart: null,
        trialDays: 14,
        status: 'trial' // trial, active, expired
    };

    // ========== INITIALIZATION ==========

    function init() {
        loadData();
        loadSubscription();
        setupEventListeners();
        navigateTo('dashboard');
        checkTrialStatus();
        updateNavActive();

        // Show welcome toast for first-time users
        if (clients.length === 0) {
            showToast('Welcome to ClientPulse! Loading demo clients...', 'info');
            setTimeout(() => {
                loadDemoData();
                navigateTo('dashboard');
            }, 1000);
        }
    }

    // ========== DATA LAYER (LocalStorage) ==========

    function loadData() {
        try {
            const stored = localStorage.getItem('cp_clients');
            clients = stored ? JSON.parse(stored) : [];
        } catch (e) {
            clients = [];
        }
    }

    function saveData() {
        localStorage.setItem('cp_clients', JSON.stringify(clients));
    }

    function loadDemoData() {
        clients = ScoringEngine.getDemoClients();
        saveData();
        showToast('Demo clients loaded! Explore the dashboard.', 'success');
    }

    function addClient(clientData) {
        const planLimits = { trial: 100, starter: 25, growth: 100, enterprise: Infinity };
        const limit = planLimits[subscription.plan] || 100;
        if (clients.length >= limit) {
            showToast(`Client limit reached for ${subscription.plan} plan (${limit} clients). Upgrade to add more.`, 'warning');
            return false;
        }

        clientData.id = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        clientData.createdAt = new Date().toISOString();
        clientData.previousScore = null;
        clients.push(clientData);
        saveData();
        showToast(`${clientData.companyName} added successfully!`, 'success');
        return true;
    }

    function updateClient(id, clientData) {
        const idx = clients.findIndex(c => c.id === id);
        if (idx === -1) return false;

        // Save current score as previous score before update
        const currentHealth = ScoringEngine.calculateHealthScore(clients[idx]);
        clientData.previousScore = currentHealth.overall;
        clientData.id = id;
        clientData.createdAt = clients[idx].createdAt;
        clients[idx] = clientData;
        saveData();
        showToast(`${clientData.companyName} updated!`, 'success');
        return true;
    }

    function deleteClient(id) {
        const client = clients.find(c => c.id === id);
        if (!client) return;
        if (confirm(`Delete "${client.companyName}"? This cannot be undone.`)) {
            clients = clients.filter(c => c.id !== id);
            saveData();
            showToast(`${client.companyName} deleted.`, 'info');
            navigateTo('dashboard');
        }
    }

    function getClient(id) {
        return clients.find(c => c.id === id) || null;
    }

    // ========== SUBSCRIPTION ==========

    function loadSubscription() {
        try {
            const stored = localStorage.getItem('cp_subscription');
            if (stored) subscription = JSON.parse(stored);
            if (!subscription.trialStart) {
                subscription.trialStart = Date.now();
                saveSubscription();
            }
        } catch(e) {
            subscription = { plan: 'trial', trialStart: Date.now(), trialDays: 14, status: 'trial' };
            saveSubscription();
        }
    }

    function saveSubscription() {
        localStorage.setItem('cp_subscription', JSON.stringify(subscription));
    }

    function checkTrialStatus() {
        if (subscription.status === 'active') return;
        const elapsed = Date.now() - subscription.trialStart;
        const remaining = subscription.trialDays * 86400000 - elapsed;
        if (remaining <= 0 && subscription.status === 'trial') {
            subscription.status = 'expired';
            saveSubscription();
        }
        updateTrialBanner();
    }

    function getTrialDaysRemaining() {
        if (subscription.status === 'active') return null;
        const elapsed = Date.now() - subscription.trialStart;
        return Math.max(0, Math.ceil((subscription.trialDays * 86400000 - elapsed) / 86400000));
    }

    function updateTrialBanner() {
        const banner = document.getElementById('trialBanner');
        if (!banner) return;
        if (subscription.status === 'active') {
            banner.style.display = 'none';
            return;
        }
        const remaining = getTrialDaysRemaining();
        if (remaining !== null && remaining > 0) {
            banner.style.display = 'flex';
            banner.querySelector('.trial-text').textContent = `Free trial: ${remaining} day${remaining !== 1 ? 's' : ''} remaining`;
            banner.className = 'trial-banner' + (remaining <= 3 ? ' trial-urgent' : '');
        } else if (subscription.status === 'expired') {
            banner.style.display = 'flex';
            banner.querySelector('.trial-text').textContent = 'Trial expired — Subscribe to continue';
            banner.className = 'trial-banner trial-expired';
        } else {
            banner.style.display = 'none';
        }
    }

    // ========== NAVIGATION ==========

    function navigateTo(view, data = null) {
        currentView = view;
        document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
        const target = document.getElementById('view-' + view);
        if (target) {
            target.classList.add('active');
            // Trigger re-render
            setTimeout(() => renderView(view, data), 50);
        }
        updateNavActive();
        // Close mobile sidebar
        document.getElementById('sidebar')?.classList.remove('open');
        document.getElementById('sidebarOverlay')?.classList.remove('open');
    }

    function updateNavActive() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === currentView);
        });
    }

    function renderView(view, data) {
        switch(view) {
            case 'dashboard': renderDashboard(); break;
            case 'addclient': renderAddClientForm(data); break;
            case 'clientdetail': renderClientDetail(data); break;
            case 'scoring': renderScoringConfig(); break;
            case 'pricing': renderPricing(); break;
            case 'settings': renderSettings(); break;
        }
    }

    // ========== DASHBOARD ==========

    function renderDashboard() {
        // Calculate all scores
        const scoredClients = clients.map(c => {
            const health = ScoringEngine.calculateHealthScore(c);
            const trend = ScoringEngine.calculateTrend(health.overall, c.previousScore);
            return { ...c, health, trend };
        });

        // Metrics
        const totalClients = scoredClients.length;
        const healthy = scoredClients.filter(c => c.health.overall >= 70).length;
        const atRisk = scoredClients.filter(c => c.health.overall >= 50 && c.health.overall < 70).length;
        const critical = scoredClients.filter(c => c.health.overall < 50).length;

        const totalRevenue = scoredClients.reduce((sum, c) => sum + (c.monthlyRevenue || 0), 0);
        const revenueAtRisk = scoredClients
            .filter(c => c.health.overall < 70)
            .reduce((sum, c) => sum + (c.monthlyRevenue || 0), 0);

        // All risk flags across clients
        const allFlags = scoredClients.flatMap(c =>
            c.health.riskFlags.map(f => ({ ...f, clientName: c.companyName, clientId: c.id }))
        ).sort((a, b) => (a.type === 'critical' ? -1 : 1));

        // Update metric cards
        Charts.animateCounter('metric-total', totalClients, 800);
        Charts.animateCounter('metric-healthy', healthy, 800);
        Charts.animateCounter('metric-atrisk', atRisk, 800);
        Charts.animateCounter('metric-critical', critical, 800);
        Charts.animateCurrencyCounter('metric-revenue', totalRevenue, 1000);
        Charts.animateCurrencyCounter('metric-revenue-risk', revenueAtRisk, 1000);

        // Doughnut chart
        Charts.drawDoughnut('chart-distribution', [
            { value: healthy, color: '#00d4ff', label: 'Healthy' },
            { value: atRisk, color: '#ffb800', label: 'At Risk' },
            { value: critical, color: '#ff4444', label: 'Critical' }
        ], {
            centerText: totalClients.toString(),
            centerSubtext: 'Total Clients',
            animate: true
        });

        // Client table
        renderClientTable(scoredClients);

        // Alerts
        renderAlerts(allFlags);
    }

    function renderClientTable(scoredClients) {
        const tbody = document.getElementById('clientTableBody');
        if (!tbody) return;

        // Filter
        let filtered = scoredClients;
        if (filterStatus !== 'all') {
            filtered = filtered.filter(c => {
                if (filterStatus === 'healthy') return c.health.overall >= 70;
                if (filterStatus === 'atrisk') return c.health.overall >= 50 && c.health.overall < 70;
                if (filterStatus === 'critical') return c.health.overall < 50;
                return true;
            });
        }

        // Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(c =>
                c.companyName.toLowerCase().includes(q) ||
                (c.contactPerson || '').toLowerCase().includes(q) ||
                (c.industry || '').toLowerCase().includes(q)
            );
        }

        // Sort
        filtered.sort((a, b) => {
            let valA, valB;
            switch(sortBy) {
                case 'name': valA = a.companyName; valB = b.companyName;
                    return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                case 'score': valA = a.health.overall; valB = b.health.overall; break;
                case 'revenue': valA = a.monthlyRevenue || 0; valB = b.monthlyRevenue || 0; break;
                case 'dso': valA = a.averageDSO || 0; valB = b.averageDSO || 0; break;
                default: valA = a.health.overall; valB = b.health.overall;
            }
            return sortDir === 'asc' ? valA - valB : valB - valA;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="7">
                        <div class="empty-state">
                            <span class="empty-icon">📊</span>
                            <p>No clients found</p>
                            <button class="btn-sm btn-accent" onclick="App.navigateTo('addclient')">+ Add Client</button>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(c => `
            <tr class="client-row" onclick="App.navigateTo('clientdetail', '${c.id}')" data-status="${c.health.status.toLowerCase().replace(' ', '')}">
                <td>
                    <div class="client-cell-name">
                        <div class="client-avatar" style="background:${c.health.statusColor}20;color:${c.health.statusColor}">
                            ${c.companyName.charAt(0)}
                        </div>
                        <div>
                            <span class="client-name">${c.companyName}</span>
                            <span class="client-industry">${c.industry || '—'}</span>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="score-badge" style="background:${c.health.statusColor}18;color:${c.health.statusColor};border-color:${c.health.statusColor}30">
                        ${c.health.overall}
                    </div>
                </td>
                <td><span class="grade-pill grade-${c.health.grade.replace('+', 'plus')}">${c.health.grade}</span></td>
                <td>
                    <span class="status-dot" style="background:${c.health.statusColor}"></span>
                    ${c.health.status}
                </td>
                <td class="trend-cell trend-${c.trend.direction}">${c.trend.icon} ${c.trend.label}</td>
                <td class="revenue-cell">${ScoringEngine.formatINR(c.monthlyRevenue)}</td>
                <td>
                    <div class="row-actions">
                        <button class="btn-icon" title="Edit" onclick="event.stopPropagation(); App.navigateTo('addclient', '${c.id}')">✏️</button>
                        <button class="btn-icon btn-danger" title="Delete" onclick="event.stopPropagation(); App.deleteClient('${c.id}')">🗑️</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function renderAlerts(flags) {
        const container = document.getElementById('alertsList');
        if (!container) return;

        if (flags.length === 0) {
            container.innerHTML = '<div class="alert-empty"><span>✅</span> All clients are in good standing</div>';
            return;
        }

        container.innerHTML = flags.slice(0, 8).map(f => `
            <div class="alert-item alert-${f.type}" onclick="App.navigateTo('clientdetail', '${f.clientId}')">
                <span class="alert-icon">${f.icon}</span>
                <div class="alert-content">
                    <span class="alert-client">${f.clientName}</span>
                    <span class="alert-msg">${f.message}</span>
                </div>
                <span class="alert-category">${f.category}</span>
            </div>
        `).join('');
    }

    // ========== ADD / EDIT CLIENT FORM ==========

    function renderAddClientForm(clientId) {
        editingClientId = clientId || null;
        const client = clientId ? getClient(clientId) : null;
        const form = document.getElementById('clientForm');
        if (!form) return;

        const title = document.getElementById('formTitle');
        if (title) title.textContent = client ? `Edit: ${client.companyName}` : 'Add New Client';

        // Populate form
        const fields = [
            'companyName', 'contactPerson', 'email', 'phone', 'industry',
            'monthlyRevenue', 'contractValue', 'paymentTerms', 'gstin', 'gstStatus',
            'lastGSTFiling', 'lastPaymentDate', 'averageDSO', 'outstandingAmount',
            'paymentRating', 'lastContactDate', 'meetingFrequency', 'responseTime',
            'npsScore', 'openTickets', 'avgResolutionTime', 'escalationCount', 'revenueTrend'
        ];

        fields.forEach(field => {
            const el = document.getElementById('field-' + field);
            if (el) el.value = client ? (client[field] || '') : '';
        });

        // GSTIN validation indicator
        const gstinField = document.getElementById('field-gstin');
        if (gstinField) {
            gstinField.addEventListener('input', function() {
                const indicator = document.getElementById('gstin-indicator');
                if (!indicator) return;
                if (!this.value) { indicator.className = 'field-indicator'; indicator.textContent = ''; return; }
                if (ScoringEngine.isValidGSTIN(this.value)) {
                    indicator.className = 'field-indicator valid';
                    indicator.textContent = '✓ Valid GSTIN';
                } else {
                    indicator.className = 'field-indicator invalid';
                    indicator.textContent = '✗ Invalid format';
                }
            });
        }
    }

    function handleFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const data = {};

        // Collect all form data
        new FormData(form).forEach((value, key) => {
            // Convert numeric fields
            const numericFields = ['monthlyRevenue', 'contractValue', 'paymentTerms', 'averageDSO',
                'outstandingAmount', 'paymentRating', 'responseTime', 'npsScore',
                'openTickets', 'avgResolutionTime', 'escalationCount'];
            data[key] = numericFields.includes(key) ? Number(value) || 0 : value;
        });

        // Validate required fields
        if (!data.companyName?.trim()) {
            showToast('Company name is required', 'error');
            return;
        }

        if (editingClientId) {
            updateClient(editingClientId, data);
        } else {
            addClient(data);
        }

        navigateTo('dashboard');
    }

    // ========== CLIENT DETAIL ==========

    function renderClientDetail(clientId) {
        const client = getClient(clientId);
        if (!client) {
            showToast('Client not found', 'error');
            navigateTo('dashboard');
            return;
        }

        const health = ScoringEngine.calculateHealthScore(client);
        const trend = ScoringEngine.calculateTrend(health.overall, client.previousScore);

        // Header info
        const header = document.getElementById('detail-header');
        if (header) {
            header.innerHTML = `
                <div class="detail-top">
                    <button class="btn-back" onclick="App.navigateTo('dashboard')">← Back</button>
                    <div class="detail-actions">
                        <button class="btn-sm btn-accent" onclick="App.navigateTo('addclient', '${client.id}')">✏️ Edit</button>
                        <button class="btn-sm btn-danger" onclick="App.deleteClient('${client.id}')">🗑️ Delete</button>
                    </div>
                </div>
                <div class="detail-company">
                    <div class="detail-avatar" style="background:${health.statusColor}20;color:${health.statusColor}">
                        ${client.companyName.charAt(0)}
                    </div>
                    <div>
                        <h2>${client.companyName}</h2>
                        <p class="detail-meta">${client.contactPerson || ''} ${client.industry ? '· ' + client.industry : ''}</p>
                        <div class="detail-tags">
                            ${client.email ? `<span class="detail-tag">📧 ${client.email}</span>` : ''}
                            ${client.phone ? `<span class="detail-tag">📱 ${client.phone}</span>` : ''}
                            ${client.gstin ? `<span class="detail-tag">🏛️ ${client.gstin}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }

        // Score gauge
        setTimeout(() => Charts.drawGauge('detail-gauge', health.overall), 100);

        // Status info
        const statusEl = document.getElementById('detail-status-info');
        if (statusEl) {
            statusEl.innerHTML = `
                <div class="status-large" style="color:${health.statusColor}">
                    ${health.statusEmoji} ${health.status}
                </div>
                <div class="trend-large trend-${trend.direction}">
                    ${trend.icon} ${trend.label}
                    ${client.previousScore !== null ? `<span class="prev-score">(prev: ${client.previousScore})</span>` : ''}
                </div>
            `;
        }

        // Dimension bars
        setTimeout(() => Charts.drawDimensionBars('detail-dimensions', health.dimensions), 200);

        // Detail metrics grid
        const metricsGrid = document.getElementById('detail-metrics');
        if (metricsGrid) {
            metricsGrid.innerHTML = `
                <div class="detail-metric-card">
                    <span class="dm-icon">💰</span>
                    <span class="dm-label">Monthly Revenue</span>
                    <span class="dm-value">${ScoringEngine.formatINR(client.monthlyRevenue)}</span>
                </div>
                <div class="detail-metric-card">
                    <span class="dm-icon">📅</span>
                    <span class="dm-label">Avg DSO</span>
                    <span class="dm-value">${client.averageDSO || 0} days</span>
                </div>
                <div class="detail-metric-card">
                    <span class="dm-icon">💸</span>
                    <span class="dm-label">Outstanding</span>
                    <span class="dm-value">${ScoringEngine.formatINR(client.outstandingAmount)}</span>
                </div>
                <div class="detail-metric-card">
                    <span class="dm-icon">📋</span>
                    <span class="dm-label">GST Status</span>
                    <span class="dm-value dm-gst-${(client.gstStatus || 'active').toLowerCase()}">${(client.gstStatus || 'Active').toUpperCase()}</span>
                </div>
                <div class="detail-metric-card">
                    <span class="dm-icon">📈</span>
                    <span class="dm-label">Revenue Trend</span>
                    <span class="dm-value">${client.revenueTrend || 'Stable'}</span>
                </div>
                <div class="detail-metric-card">
                    <span class="dm-icon">🤝</span>
                    <span class="dm-label">Last Contact</span>
                    <span class="dm-value">${client.lastContactDate ? formatDate(client.lastContactDate) : 'N/A'}</span>
                </div>
                <div class="detail-metric-card">
                    <span class="dm-icon">⭐</span>
                    <span class="dm-label">NPS Score</span>
                    <span class="dm-value">${client.npsScore !== undefined ? client.npsScore + '/10' : 'N/A'}</span>
                </div>
                <div class="detail-metric-card">
                    <span class="dm-icon">🎫</span>
                    <span class="dm-label">Open Tickets</span>
                    <span class="dm-value">${client.openTickets || 0}</span>
                </div>
            `;
        }

        // Risk flags
        const flagsEl = document.getElementById('detail-flags');
        if (flagsEl) {
            if (health.riskFlags.length === 0) {
                flagsEl.innerHTML = '<div class="no-flags">✅ No risk flags detected</div>';
            } else {
                flagsEl.innerHTML = health.riskFlags.map(f => `
                    <div class="flag-item flag-${f.type}">
                        <span class="flag-icon">${f.icon}</span>
                        <span class="flag-msg">${f.message}</span>
                        <span class="flag-cat">${f.category}</span>
                    </div>
                `).join('');
            }
        }
    }

    // ========== SCORING CONFIG ==========

    function renderScoringConfig() {
        const weights = ScoringEngine.getWeights();
        const dims = [
            { key: 'payment', label: 'Payment Health', icon: '💰', desc: 'DSO, payment delays, outstanding amounts' },
            { key: 'gst', label: 'GST Compliance', icon: '📋', desc: 'Registration status, filing regularity' },
            { key: 'engagement', label: 'Engagement Level', icon: '🤝', desc: 'Contact frequency, NPS, response time' },
            { key: 'revenue', label: 'Revenue Value', icon: '📈', desc: 'Monthly revenue, trends, contract value' },
            { key: 'support', label: 'Support Quality', icon: '🎧', desc: 'Open tickets, resolution time, escalations' }
        ];

        const container = document.getElementById('scoring-config-body');
        if (!container) return;

        container.innerHTML = `
            <div class="config-header">
                <h3>Scoring Weights</h3>
                <p>Customize how each dimension contributes to the overall health score. Weights must total 100%.</p>
            </div>
            <div class="config-sliders">
                ${dims.map(d => `
                    <div class="config-slider-row">
                        <div class="config-dim-info">
                            <span class="config-icon">${d.icon}</span>
                            <div>
                                <span class="config-dim-label">${d.label}</span>
                                <span class="config-dim-desc">${d.desc}</span>
                            </div>
                        </div>
                        <div class="config-slider-control">
                            <input type="range" min="0" max="50" value="${weights[d.key]}"
                                class="config-range" id="weight-${d.key}"
                                oninput="App.updateWeightDisplay('${d.key}', this.value)">
                            <span class="config-weight-val" id="weight-val-${d.key}">${weights[d.key]}%</span>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="config-total" id="config-total">
                Total: <span id="config-total-val">${Object.values(weights).reduce((a,b) => a+b, 0)}%</span>
            </div>
            <div class="config-actions">
                <button class="btn-sm btn-accent" onclick="App.saveWeightsFromUI()">Save Weights</button>
                <button class="btn-sm btn-ghost" onclick="App.resetWeights()">Reset to Default</button>
            </div>
        `;
    }

    function updateWeightDisplay(key, value) {
        document.getElementById('weight-val-' + key).textContent = value + '%';
        // Update total
        const keys = ['payment', 'gst', 'engagement', 'revenue', 'support'];
        const total = keys.reduce((sum, k) => sum + Number(document.getElementById('weight-' + k)?.value || 0), 0);
        const totalEl = document.getElementById('config-total-val');
        if (totalEl) {
            totalEl.textContent = total + '%';
            totalEl.style.color = total === 100 ? '#00d4ff' : '#ff4444';
        }
    }

    function saveWeightsFromUI() {
        const keys = ['payment', 'gst', 'engagement', 'revenue', 'support'];
        const weights = {};
        keys.forEach(k => { weights[k] = Number(document.getElementById('weight-' + k)?.value || 0); });
        const total = Object.values(weights).reduce((a, b) => a + b, 0);
        if (total !== 100) {
            showToast(`Weights must total 100% (currently ${total}%)`, 'error');
            return;
        }
        ScoringEngine.saveWeights(weights);
        showToast('Scoring weights saved!', 'success');
    }

    function resetWeights() {
        ScoringEngine.saveWeights(ScoringEngine.DEFAULT_WEIGHTS);
        renderScoringConfig();
        showToast('Weights reset to defaults', 'info');
    }

    // ========== PRICING ==========

    function renderPricing() {
        const container = document.getElementById('pricing-body');
        if (!container) return;

        const plans = [
            {
                name: 'Starter',
                price: '999',
                period: '/month',
                features: ['Up to 25 clients', 'Basic health scoring', 'Email alerts', 'Dashboard analytics', 'CSV data export'],
                accent: '#00d4ff',
                popular: false
            },
            {
                name: 'Growth',
                price: '2,499',
                period: '/month',
                features: ['Up to 100 clients', 'Custom scoring weights', 'CSV + PDF export', 'Priority support', 'Risk flag alerts', 'Trend analytics'],
                accent: '#00ff88',
                popular: true
            },
            {
                name: 'Enterprise',
                price: '4,999',
                period: '/month',
                features: ['Unlimited clients', 'API access', 'Team accounts', 'GST API integration', 'Custom branding', 'Dedicated support', 'SLA guarantee'],
                accent: '#a855f7',
                popular: false
            }
        ];

        container.innerHTML = `
            <div class="pricing-header">
                <h3>Choose Your Plan</h3>
                <p>All plans include a 14-day free trial. No credit card required to start.</p>
            </div>
            <div class="pricing-grid">
                ${plans.map(plan => `
                    <div class="pricing-card ${plan.popular ? 'popular' : ''}">
                        ${plan.popular ? '<div class="popular-badge">Most Popular</div>' : ''}
                        <div class="pricing-card-header" style="--plan-accent: ${plan.accent}">
                            <h4>${plan.name}</h4>
                            <div class="pricing-amount">
                                <span class="currency">₹</span>
                                <span class="price">${plan.price}</span>
                                <span class="period">${plan.period}</span>
                            </div>
                        </div>
                        <ul class="pricing-features">
                            ${plan.features.map(f => `<li><span class="check" style="color:${plan.accent}">✓</span> ${f}</li>`).join('')}
                        </ul>
                        <button class="btn-pricing" style="background:${plan.accent}" onclick="App.handleSubscribe('${plan.name.toLowerCase()}')">
                            ${subscription.plan === plan.name.toLowerCase() && subscription.status === 'active' ? '✓ Current Plan' : 'Start Free Trial'}
                        </button>
                    </div>
                `).join('')}
            </div>
            <div class="pricing-footer">
                <p>🔒 Secured by Razorpay · Cancel anytime · GST invoice included</p>
            </div>
        `;
    }

    function handleSubscribe(planName) {
        // Razorpay integration (Test Mode)
        if (typeof Razorpay === 'undefined') {
            showToast('Setting up trial for ' + planName + ' plan...', 'info');
            subscription = {
                plan: planName,
                trialStart: Date.now(),
                trialDays: 14,
                status: 'trial'
            };
            saveSubscription();
            setTimeout(() => {
                showToast(`🎉 ${planName.charAt(0).toUpperCase() + planName.slice(1)} trial activated! 14 days free.`, 'success');
                updateTrialBanner();
                renderPricing();
            }, 500);
            return;
        }

        // Razorpay Checkout (when API keys are configured)
        const planPrices = { starter: 99900, growth: 249900, enterprise: 499900 };
        const options = {
            key: 'rzp_test_XXXXXXXXXX', // Replace with actual test key
            subscription_id: '', // Will be created server-side in production
            name: 'Yantrixia ClientPulse',
            description: planName.charAt(0).toUpperCase() + planName.slice(1) + ' Plan — Monthly',
            image: '../assets/logo.jpg',
            handler: function(response) {
                subscription = { plan: planName, status: 'active', paymentId: response.razorpay_payment_id };
                saveSubscription();
                showToast('🎉 Subscription activated!', 'success');
                updateTrialBanner();
                renderPricing();
            },
            prefill: {},
            theme: { color: '#00d4ff' }
        };

        const rzp = new Razorpay(options);
        rzp.open();
    }

    // ========== SETTINGS ==========

    function renderSettings() {
        const container = document.getElementById('settings-body');
        if (!container) return;

        container.innerHTML = `
            <div class="settings-section">
                <h3>📊 Data Management</h3>
                <div class="settings-actions">
                    <button class="btn-sm btn-accent" onclick="App.exportCSV()">📥 Export Clients (CSV)</button>
                    <button class="btn-sm btn-ghost" onclick="App.loadDemoData(); App.navigateTo('dashboard');">🔄 Load Demo Data</button>
                    <button class="btn-sm btn-danger" onclick="App.clearAllData()">🗑️ Clear All Data</button>
                </div>
            </div>
            <div class="settings-section">
                <h3>💳 Subscription</h3>
                <div class="settings-info">
                    <p><strong>Plan:</strong> ${subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)}</p>
                    <p><strong>Status:</strong> ${subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}</p>
                    ${getTrialDaysRemaining() !== null ? `<p><strong>Trial Remaining:</strong> ${getTrialDaysRemaining()} days</p>` : ''}
                </div>
                <button class="btn-sm btn-accent" onclick="App.navigateTo('pricing')">Manage Subscription →</button>
            </div>
            <div class="settings-section">
                <h3>ℹ️ About</h3>
                <div class="settings-info about-info">
                    <p><strong>Yantrixia ClientPulse</strong> v1.0</p>
                    <p>Lightweight India-specific B2B Client Health Scorer</p>
                    <p>Built by <a href="https://www.yantrixa.in" target="_blank" style="color:#00d4ff">Yantrixa</a> — Engineering Intelligence</p>
                    <p class="settings-copy">© 2026 Yantrixa. All rights reserved.</p>
                </div>
            </div>
        `;
    }

    function exportCSV() {
        if (clients.length === 0) {
            showToast('No clients to export', 'warning');
            return;
        }

        const headers = ['Company Name', 'Contact Person', 'Email', 'Phone', 'Industry',
            'Monthly Revenue', 'GSTIN', 'GST Status', 'Avg DSO', 'Outstanding Amount',
            'Payment Rating', 'NPS Score', 'Health Score', 'Grade', 'Status'];

        const rows = clients.map(c => {
            const h = ScoringEngine.calculateHealthScore(c);
            return [
                c.companyName, c.contactPerson, c.email, c.phone, c.industry,
                c.monthlyRevenue, c.gstin, c.gstStatus, c.averageDSO, c.outstandingAmount,
                c.paymentRating, c.npsScore, h.overall, h.grade, h.status
            ];
        });

        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(val => `"${(val || '').toString().replace(/"/g, '""')}"`).join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clientpulse_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('CSV exported successfully!', 'success');
    }

    function clearAllData() {
        if (confirm('⚠️ This will permanently delete ALL client data. Are you sure?')) {
            if (confirm('This action CANNOT be undone. Type "yes" mentally and click OK to confirm.')) {
                clients = [];
                saveData();
                showToast('All data cleared', 'info');
                navigateTo('dashboard');
            }
        }
    }

    // ========== EVENT LISTENERS ==========

    function setupEventListeners() {
        // Navigation clicks
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => navigateTo(item.dataset.view));
        });

        // Search
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                renderDashboard();
            });
        }

        // Sort
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const newSort = btn.dataset.sort;
                if (sortBy === newSort) {
                    sortDir = sortDir === 'asc' ? 'desc' : 'asc';
                } else {
                    sortBy = newSort;
                    sortDir = 'desc';
                }
                document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderDashboard();
            });
        });

        // Filter
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                filterStatus = btn.dataset.filter;
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderDashboard();
            });
        });

        // Form submit
        const form = document.getElementById('clientForm');
        if (form) form.addEventListener('submit', handleFormSubmit);

        // Mobile sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                document.getElementById('sidebar')?.classList.toggle('open');
                document.getElementById('sidebarOverlay')?.classList.toggle('open');
            });
        }

        const sidebarOverlay = document.getElementById('sidebarOverlay');
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', () => {
                document.getElementById('sidebar')?.classList.remove('open');
                sidebarOverlay.classList.remove('open');
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                document.getElementById('searchInput')?.focus();
            }
        });
    }

    // ========== TOAST NOTIFICATIONS ==========

    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // ========== HELPERS ==========

    function formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    // Public API
    return {
        init,
        navigateTo,
        deleteClient,
        handleFormSubmit,
        updateWeightDisplay,
        saveWeightsFromUI,
        resetWeights,
        handleSubscribe,
        exportCSV,
        clearAllData,
        loadDemoData,
        showToast
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', App.init);
