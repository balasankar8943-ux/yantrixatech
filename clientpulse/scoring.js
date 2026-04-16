/* ============================================
   YANTRIXIA CLIENTPULSE — Scoring Engine
   India-Specific B2B Client Health Scorer
   ============================================ */

const ScoringEngine = (() => {

    // Default scoring weights
    const DEFAULT_WEIGHTS = {
        payment: 30,
        gst: 20,
        engagement: 25,
        revenue: 15,
        support: 10
    };

    /**
     * Get scoring weights (user-customizable, stored in localStorage)
     */
    function getWeights() {
        const stored = localStorage.getItem('cp_scoring_weights');
        if (stored) {
            try { return JSON.parse(stored); } catch(e) {}
        }
        return { ...DEFAULT_WEIGHTS };
    }

    function saveWeights(weights) {
        localStorage.setItem('cp_scoring_weights', JSON.stringify(weights));
    }

    /**
     * Calculate Payment Health Score (0-100)
     * Factors: DSO, payment delays, outstanding amount ratio, payment rating
     */
    function scorePayment(client) {
        let score = 100;
        const dso = client.averageDSO || 0;
        const paymentRating = client.paymentRating || 3;
        const outstandingAmount = client.outstandingAmount || 0;
        const monthlyRevenue = client.monthlyRevenue || 1;
        const lastPaymentDate = client.lastPaymentDate ? new Date(client.lastPaymentDate) : null;
        const paymentTerms = client.paymentTerms || 30;

        // DSO scoring (Indian B2B typically Net 30-90)
        if (dso <= paymentTerms) {
            score -= 0; // On time
        } else if (dso <= paymentTerms + 15) {
            score -= 15; // Slightly late
        } else if (dso <= paymentTerms + 30) {
            score -= 30; // Moderately late
        } else if (dso <= paymentTerms + 60) {
            score -= 50; // Very late
        } else {
            score -= 70; // Severely overdue
        }

        // Outstanding amount ratio
        const outstandingRatio = outstandingAmount / (monthlyRevenue || 1);
        if (outstandingRatio > 3) score -= 20;
        else if (outstandingRatio > 2) score -= 15;
        else if (outstandingRatio > 1) score -= 10;
        else if (outstandingRatio > 0.5) score -= 5;

        // Payment rating (1-5 user input)
        score += (paymentRating - 3) * 5;

        // Days since last payment
        if (lastPaymentDate) {
            const daysSince = Math.floor((Date.now() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysSince > 90) score -= 15;
            else if (daysSince > 60) score -= 10;
            else if (daysSince > 45) score -= 5;
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Calculate GST Compliance Score (0-100)
     * Factors: GST status, filing regularity, GSTIN validity
     */
    function scoreGST(client) {
        let score = 100;
        const gstStatus = (client.gstStatus || 'active').toLowerCase();
        const lastFilingDate = client.lastGSTFiling ? new Date(client.lastGSTFiling) : null;
        const gstin = client.gstin || '';

        // GST Registration Status
        if (gstStatus === 'cancelled') {
            score = 10; // Critical
        } else if (gstStatus === 'suspended') {
            score = 30; // Severe risk
        } else if (gstStatus === 'inactive') {
            score = 50; // Moderate risk
        }
        // 'active' keeps score at 100

        // Filing regularity
        if (lastFilingDate && gstStatus === 'active') {
            const daysSinceFiling = Math.floor((Date.now() - lastFilingDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysSinceFiling > 180) score -= 30;
            else if (daysSinceFiling > 90) score -= 20;
            else if (daysSinceFiling > 45) score -= 10;
        }

        // GSTIN format validation (15-char alphanumeric)
        if (gstin && !isValidGSTIN(gstin)) {
            score -= 15;
        }

        // No GSTIN provided
        if (!gstin) {
            score -= 10;
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Calculate Engagement Score (0-100)
     * Factors: Last contact, meeting frequency, response time, NPS
     */
    function scoreEngagement(client) {
        let score = 100;
        const lastContact = client.lastContactDate ? new Date(client.lastContactDate) : null;
        const meetingFreq = client.meetingFrequency || 'monthly';
        const responseTime = client.responseTime || 24;
        const nps = client.npsScore !== undefined ? client.npsScore : 7;

        // Days since last contact
        if (lastContact) {
            const daysSince = Math.floor((Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
            if (daysSince > 90) score -= 40;
            else if (daysSince > 60) score -= 25;
            else if (daysSince > 30) score -= 15;
            else if (daysSince > 14) score -= 5;
        } else {
            score -= 20; // No contact date recorded
        }

        // Meeting frequency scoring
        const freqScores = { 'weekly': 0, 'biweekly': -5, 'monthly': -10, 'quarterly': -20, 'rarely': -35 };
        score += (freqScores[meetingFreq] || -10);

        // Response time (hours)
        if (responseTime > 72) score -= 15;
        else if (responseTime > 48) score -= 10;
        else if (responseTime > 24) score -= 5;

        // NPS score (0-10)
        if (nps >= 9) score += 5;
        else if (nps >= 7) score += 0;
        else if (nps >= 5) score -= 10;
        else if (nps >= 3) score -= 20;
        else score -= 30;

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Calculate Revenue Value Score (0-100)
     * Factors: Monthly revenue, trend, contract value
     */
    function scoreRevenue(client) {
        let score = 70; // Base score
        const monthlyRevenue = client.monthlyRevenue || 0;
        const revenueTrend = (client.revenueTrend || 'stable').toLowerCase();
        const contractValue = client.contractValue || 0;

        // Revenue tier (Indian B2B context, in ₹)
        if (monthlyRevenue >= 500000) score += 20;       // 5L+
        else if (monthlyRevenue >= 100000) score += 15;  // 1L+
        else if (monthlyRevenue >= 50000) score += 10;   // 50K+
        else if (monthlyRevenue >= 10000) score += 5;    // 10K+
        else score -= 5;

        // Revenue trend
        if (revenueTrend === 'growing') score += 10;
        else if (revenueTrend === 'stable') score += 0;
        else if (revenueTrend === 'declining') score -= 20;

        // Contract value implies commitment
        if (contractValue > 0) score += 5;

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Calculate Support Quality Score (0-100)
     * Factors: Open tickets, resolution time, escalations
     */
    function scoreSupport(client) {
        let score = 100;
        const openTickets = client.openTickets || 0;
        const avgResolutionTime = client.avgResolutionTime || 0; // hours
        const escalationCount = client.escalationCount || 0;

        // Open tickets
        if (openTickets > 10) score -= 30;
        else if (openTickets > 5) score -= 20;
        else if (openTickets > 2) score -= 10;
        else if (openTickets > 0) score -= 5;

        // Avg resolution time
        if (avgResolutionTime > 72) score -= 25;
        else if (avgResolutionTime > 48) score -= 15;
        else if (avgResolutionTime > 24) score -= 10;
        else if (avgResolutionTime > 8) score -= 5;

        // Escalations
        if (escalationCount > 5) score -= 25;
        else if (escalationCount > 3) score -= 15;
        else if (escalationCount > 1) score -= 10;
        else if (escalationCount > 0) score -= 5;

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Calculate overall health score
     */
    function calculateHealthScore(client) {
        const weights = getWeights();
        const totalWeight = weights.payment + weights.gst + weights.engagement + weights.revenue + weights.support;

        const scores = {
            payment: scorePayment(client),
            gst: scoreGST(client),
            engagement: scoreEngagement(client),
            revenue: scoreRevenue(client),
            support: scoreSupport(client)
        };

        const weightedScore = (
            (scores.payment * weights.payment) +
            (scores.gst * weights.gst) +
            (scores.engagement * weights.engagement) +
            (scores.revenue * weights.revenue) +
            (scores.support * weights.support)
        ) / totalWeight;

        const overallScore = Math.round(weightedScore);

        return {
            overall: overallScore,
            dimensions: scores,
            grade: getGrade(overallScore),
            status: getStatus(overallScore),
            statusColor: getStatusColor(overallScore),
            statusEmoji: getStatusEmoji(overallScore),
            riskFlags: detectRiskFlags(client, scores)
        };
    }

    function getGrade(score) {
        if (score >= 90) return 'A+';
        if (score >= 80) return 'A';
        if (score >= 70) return 'B';
        if (score >= 60) return 'C';
        if (score >= 50) return 'D';
        return 'F';
    }

    function getStatus(score) {
        if (score >= 70) return 'Healthy';
        if (score >= 50) return 'At Risk';
        return 'Critical';
    }

    function getStatusColor(score) {
        if (score >= 70) return '#00d4ff';
        if (score >= 50) return '#ffb800';
        return '#ff4444';
    }

    function getStatusEmoji(score) {
        if (score >= 70) return '🟢';
        if (score >= 50) return '🟡';
        return '🔴';
    }

    /**
     * Detect India-specific risk flags
     */
    function detectRiskFlags(client, scores) {
        const flags = [];
        const now = Date.now();

        // GST status changed
        const gstStatus = (client.gstStatus || 'active').toLowerCase();
        if (gstStatus === 'suspended') {
            flags.push({ type: 'critical', icon: '⚠️', message: 'GST registration SUSPENDED — high compliance risk', category: 'GST' });
        }
        if (gstStatus === 'cancelled') {
            flags.push({ type: 'critical', icon: '🚨', message: 'GST registration CANCELLED — cannot transact legally', category: 'GST' });
        }

        // Payment overdue > 45 days
        if (client.averageDSO > (client.paymentTerms || 30) + 45) {
            flags.push({ type: 'warning', icon: '⚠️', message: `Payment overdue by ${client.averageDSO - (client.paymentTerms || 30)} days beyond terms`, category: 'Payment' });
        }

        // No engagement in > 60 days
        if (client.lastContactDate) {
            const daysSince = Math.floor((now - new Date(client.lastContactDate).getTime()) / (1000 * 60 * 60 * 24));
            if (daysSince > 60) {
                flags.push({ type: 'warning', icon: '📵', message: `No engagement in ${daysSince} days`, category: 'Engagement' });
            }
        }

        // Revenue declining
        if ((client.revenueTrend || '').toLowerCase() === 'declining') {
            flags.push({ type: 'warning', icon: '📉', message: 'Revenue trend is declining', category: 'Revenue' });
        }

        // High outstanding amount
        if (client.outstandingAmount && client.monthlyRevenue) {
            const ratio = client.outstandingAmount / client.monthlyRevenue;
            if (ratio > 3) {
                flags.push({ type: 'critical', icon: '💸', message: `Outstanding amount is ${ratio.toFixed(1)}x monthly revenue`, category: 'Payment' });
            }
        }

        // Low NPS
        if (client.npsScore !== undefined && client.npsScore <= 3) {
            flags.push({ type: 'warning', icon: '😟', message: `Very low NPS score: ${client.npsScore}/10`, category: 'Engagement' });
        }

        // Many open tickets
        if (client.openTickets > 5) {
            flags.push({ type: 'warning', icon: '🎫', message: `${client.openTickets} open support tickets`, category: 'Support' });
        }

        return flags;
    }

    /**
     * Calculate trend compared to previous score
     */
    function calculateTrend(currentScore, previousScore) {
        if (previousScore === null || previousScore === undefined) return { direction: 'new', icon: '🆕', label: 'New' };
        const diff = currentScore - previousScore;
        if (diff > 5) return { direction: 'up', icon: '↑', label: 'Improving' };
        if (diff < -5) return { direction: 'down', icon: '↓', label: 'Declining' };
        return { direction: 'stable', icon: '→', label: 'Stable' };
    }

    /**
     * Validate GSTIN format (15-character Indian GST number)
     * Format: 2-digit state code + 10-char PAN + 1 entity code + Z + 1 check digit
     */
    function isValidGSTIN(gstin) {
        if (!gstin) return false;
        const pattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        return pattern.test(gstin.toUpperCase());
    }

    /**
     * Format currency in Indian style (₹1,23,456)
     */
    function formatINR(amount) {
        if (!amount && amount !== 0) return '₹0';
        const num = Number(amount);
        if (isNaN(num)) return '₹0';
        return '₹' + num.toLocaleString('en-IN');
    }

    /**
     * Get sample demo clients for first-time users
     */
    function getDemoClients() {
        return [
            {
                id: 'demo_1',
                companyName: 'Pinnacle Tech Solutions',
                contactPerson: 'Rajesh Sharma',
                email: 'rajesh@pinnacletech.in',
                phone: '+91 98765 43210',
                industry: 'IT Services',
                monthlyRevenue: 425000,
                contractValue: 5100000,
                paymentTerms: 30,
                gstin: '27AABCP1234A1Z5',
                gstStatus: 'active',
                lastGSTFiling: new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0],
                lastPaymentDate: new Date(Date.now() - 12 * 86400000).toISOString().split('T')[0],
                averageDSO: 25,
                outstandingAmount: 85000,
                paymentRating: 4,
                lastContactDate: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
                meetingFrequency: 'biweekly',
                responseTime: 4,
                npsScore: 9,
                openTickets: 1,
                avgResolutionTime: 6,
                escalationCount: 0,
                revenueTrend: 'growing',
                createdAt: new Date(Date.now() - 180 * 86400000).toISOString(),
                previousScore: 88
            },
            {
                id: 'demo_2',
                companyName: 'Bharat Manufacturing Ltd',
                contactPerson: 'Priya Patel',
                email: 'priya@bharatmfg.co.in',
                phone: '+91 87654 32109',
                industry: 'Manufacturing',
                monthlyRevenue: 280000,
                contractValue: 3360000,
                paymentTerms: 45,
                gstin: '24AABCB5678C1Z8',
                gstStatus: 'active',
                lastGSTFiling: new Date(Date.now() - 25 * 86400000).toISOString().split('T')[0],
                lastPaymentDate: new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0],
                averageDSO: 40,
                outstandingAmount: 140000,
                paymentRating: 3,
                lastContactDate: new Date(Date.now() - 18 * 86400000).toISOString().split('T')[0],
                meetingFrequency: 'monthly',
                responseTime: 12,
                npsScore: 7,
                openTickets: 3,
                avgResolutionTime: 18,
                escalationCount: 1,
                revenueTrend: 'stable',
                createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
                previousScore: 76
            },
            {
                id: 'demo_3',
                companyName: 'QuickServe Logistics',
                contactPerson: 'Arjun Mehta',
                email: 'arjun@quickserve.in',
                phone: '+91 76543 21098',
                industry: 'Logistics',
                monthlyRevenue: 150000,
                contractValue: 0,
                paymentTerms: 30,
                gstin: '29AABCQ9012D1Z3',
                gstStatus: 'active',
                lastGSTFiling: new Date(Date.now() - 70 * 86400000).toISOString().split('T')[0],
                lastPaymentDate: new Date(Date.now() - 55 * 86400000).toISOString().split('T')[0],
                averageDSO: 65,
                outstandingAmount: 320000,
                paymentRating: 2,
                lastContactDate: new Date(Date.now() - 45 * 86400000).toISOString().split('T')[0],
                meetingFrequency: 'quarterly',
                responseTime: 36,
                npsScore: 5,
                openTickets: 6,
                avgResolutionTime: 48,
                escalationCount: 3,
                revenueTrend: 'declining',
                createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
                previousScore: 62
            },
            {
                id: 'demo_4',
                companyName: 'Sunrise Pharma Distributors',
                contactPerson: 'Kavita Reddy',
                email: 'kavita@sunrisepharma.in',
                phone: '+91 65432 10987',
                industry: 'Pharmaceuticals',
                monthlyRevenue: 45000,
                contractValue: 540000,
                paymentTerms: 60,
                gstin: '36AABCS3456E1Z1',
                gstStatus: 'suspended',
                lastGSTFiling: new Date(Date.now() - 120 * 86400000).toISOString().split('T')[0],
                lastPaymentDate: new Date(Date.now() - 95 * 86400000).toISOString().split('T')[0],
                averageDSO: 110,
                outstandingAmount: 185000,
                paymentRating: 1,
                lastContactDate: new Date(Date.now() - 75 * 86400000).toISOString().split('T')[0],
                meetingFrequency: 'rarely',
                responseTime: 96,
                npsScore: 2,
                openTickets: 8,
                avgResolutionTime: 72,
                escalationCount: 5,
                revenueTrend: 'declining',
                createdAt: new Date(Date.now() - 200 * 86400000).toISOString(),
                previousScore: 44
            },
            {
                id: 'demo_5',
                companyName: 'NexGen Digital Agency',
                contactPerson: 'Aditya Kumar',
                email: 'aditya@nexgendigital.in',
                phone: '+91 99887 76655',
                industry: 'Digital Marketing',
                monthlyRevenue: 185000,
                contractValue: 2220000,
                paymentTerms: 30,
                gstin: '07AABCN7890F1Z6',
                gstStatus: 'active',
                lastGSTFiling: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
                lastPaymentDate: new Date(Date.now() - 8 * 86400000).toISOString().split('T')[0],
                averageDSO: 22,
                outstandingAmount: 0,
                paymentRating: 5,
                lastContactDate: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
                meetingFrequency: 'weekly',
                responseTime: 2,
                npsScore: 10,
                openTickets: 0,
                avgResolutionTime: 4,
                escalationCount: 0,
                revenueTrend: 'growing',
                createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
                previousScore: 92
            }
        ];
    }

    // Public API
    return {
        calculateHealthScore,
        getWeights,
        saveWeights,
        DEFAULT_WEIGHTS,
        calculateTrend,
        isValidGSTIN,
        formatINR,
        getDemoClients,
        getGrade,
        getStatus,
        getStatusColor,
        getStatusEmoji,
        // Expose individual scorers for detail views
        scorePayment,
        scoreGST,
        scoreEngagement,
        scoreRevenue,
        scoreSupport
    };
})();
