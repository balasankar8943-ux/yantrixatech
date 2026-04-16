/* ============================================
   YANTRIXIA CLIENTPULSE — Charts & Visualizations
   Custom Canvas-based charts (no dependencies)
   ============================================ */

const Charts = (() => {

    /**
     * Draw a doughnut chart on a canvas
     */
    function drawDoughnut(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        const size = options.size || Math.min(canvas.parentElement.clientWidth, 280);
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        canvas.style.width = size + 'px';
        canvas.style.height = size + 'px';
        ctx.scale(dpr, dpr);

        const centerX = size / 2;
        const centerY = size / 2;
        const outerRadius = size / 2 - 10;
        const innerRadius = outerRadius * 0.65;
        const total = data.reduce((sum, d) => sum + d.value, 0);

        if (total === 0) {
            // Draw empty state
            ctx.beginPath();
            ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
            ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2, true);
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fill();

            ctx.font = `600 ${size * 0.08}px 'Rajdhani', sans-serif`;
            ctx.fillStyle = '#606078';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('No Data', centerX, centerY);
            return;
        }

        let startAngle = -Math.PI / 2;
        const gap = 0.03;

        // Animate
        const animDuration = options.animate !== false ? 800 : 0;
        let progress = animDuration ? 0 : 1;
        const startTime = performance.now();

        function render(timestamp) {
            if (animDuration) {
                progress = Math.min(1, (timestamp - startTime) / animDuration);
                progress = easeOutCubic(progress);
            }

            ctx.clearRect(0, 0, size, size);
            let currentAngle = -Math.PI / 2;

            data.forEach((segment, i) => {
                const sliceAngle = (segment.value / total) * Math.PI * 2 * progress;
                if (sliceAngle <= 0) return;

                const midAngle = currentAngle + sliceAngle / 2;

                ctx.beginPath();
                ctx.arc(centerX, centerY, outerRadius, currentAngle + gap, currentAngle + sliceAngle - gap);
                ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle - gap, currentAngle + gap, true);
                ctx.closePath();

                // Gradient fill
                const gradient = ctx.createLinearGradient(
                    centerX + Math.cos(midAngle) * outerRadius,
                    centerY + Math.sin(midAngle) * outerRadius,
                    centerX - Math.cos(midAngle) * outerRadius,
                    centerY - Math.sin(midAngle) * outerRadius
                );
                gradient.addColorStop(0, segment.color);
                gradient.addColorStop(1, adjustBrightness(segment.color, -30));
                ctx.fillStyle = gradient;
                ctx.fill();

                // Subtle shadow
                ctx.shadowColor = segment.color;
                ctx.shadowBlur = 8;
                ctx.fill();
                ctx.shadowBlur = 0;

                currentAngle += sliceAngle;
            });

            // Center text
            if (options.centerText) {
                ctx.font = `800 ${size * 0.14}px 'Orbitron', sans-serif`;
                ctx.fillStyle = '#e8e8f0';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(options.centerText, centerX, centerY - 8);

                if (options.centerSubtext) {
                    ctx.font = `500 ${size * 0.06}px 'Rajdhani', sans-serif`;
                    ctx.fillStyle = '#9090a8';
                    ctx.fillText(options.centerSubtext, centerX, centerY + size * 0.08);
                }
            }

            if (progress < 1) {
                requestAnimationFrame(render);
            }
        }

        requestAnimationFrame(render);
    }

    /**
     * Draw a score gauge (semicircle)
     */
    function drawGauge(canvasId, score, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        const width = options.width || Math.min(canvas.parentElement.clientWidth, 300);
        const height = width * 0.6;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.scale(dpr, dpr);

        const centerX = width / 2;
        const centerY = height - 20;
        const radius = Math.min(width, height) * 0.7;
        const lineWidth = 12;

        const animDuration = 1000;
        const startTime = performance.now();

        function render(timestamp) {
            const progress = Math.min(1, (timestamp - startTime) / animDuration);
            const easedProgress = easeOutCubic(progress);
            const currentScore = score * easedProgress;

            ctx.clearRect(0, 0, width, height);

            // Background arc
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, Math.PI, 0);
            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Score arc
            const scoreAngle = Math.PI + (currentScore / 100) * Math.PI;
            const gradient = ctx.createLinearGradient(0, centerY, width, centerY);

            gradient.addColorStop(0, '#ff4444');
            gradient.addColorStop(0.4, '#ffb800');
            gradient.addColorStop(0.7, '#00d4ff');
            gradient.addColorStop(1, '#00ff88');

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, Math.PI, scoreAngle);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Glow effect
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, Math.PI, scoreAngle);
            ctx.strokeStyle = ScoringEngine.getStatusColor(currentScore);
            ctx.lineWidth = lineWidth + 8;
            ctx.globalAlpha = 0.15;
            ctx.stroke();
            ctx.globalAlpha = 1;

            // Score text
            ctx.font = `800 ${width * 0.18}px 'Orbitron', sans-serif`;
            ctx.fillStyle = ScoringEngine.getStatusColor(currentScore);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(Math.round(currentScore), centerX, centerY - radius * 0.35);

            // Grade text
            ctx.font = `700 ${width * 0.08}px 'Rajdhani', sans-serif`;
            ctx.fillStyle = '#9090a8';
            ctx.fillText(ScoringEngine.getGrade(Math.round(currentScore)), centerX, centerY - radius * 0.1);

            // Labels
            ctx.font = `500 ${width * 0.04}px 'Rajdhani', sans-serif`;
            ctx.fillStyle = '#606078';
            ctx.textAlign = 'left';
            ctx.fillText('0', centerX - radius - 5, centerY + 15);
            ctx.textAlign = 'right';
            ctx.fillText('100', centerX + radius + 5, centerY + 15);

            if (progress < 1) {
                requestAnimationFrame(render);
            }
        }

        requestAnimationFrame(render);
    }

    /**
     * Draw dimension bars chart
     */
    function drawDimensionBars(canvasId, dimensions, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        const labels = [
            { key: 'payment', label: 'Payment', icon: '💰' },
            { key: 'gst', label: 'GST', icon: '📋' },
            { key: 'engagement', label: 'Engage', icon: '🤝' },
            { key: 'revenue', label: 'Revenue', icon: '📈' },
            { key: 'support', label: 'Support', icon: '🎧' }
        ];

        const width = options.width || Math.min(canvas.parentElement.clientWidth, 400);
        const barHeight = 28;
        const gap = 20;
        const labelWidth = 80;
        const valueWidth = 40;
        const height = labels.length * (barHeight + gap) + 20;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.scale(dpr, dpr);

        const animDuration = 800;
        const startTime = performance.now();

        function render(timestamp) {
            const progress = Math.min(1, (timestamp - startTime) / animDuration);
            const ep = easeOutCubic(progress);

            ctx.clearRect(0, 0, width, height);
            const barWidth = width - labelWidth - valueWidth - 20;

            labels.forEach((dim, i) => {
                const y = i * (barHeight + gap) + 10;
                const score = dimensions[dim.key] || 0;
                const currentScore = score * ep;
                const color = ScoringEngine.getStatusColor(score);

                // Label
                ctx.font = `500 13px 'Rajdhani', sans-serif`;
                ctx.fillStyle = '#9090a8';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(dim.label, 0, y + barHeight / 2);

                // Background bar
                const barX = labelWidth;
                ctx.fillStyle = 'rgba(255,255,255,0.04)';
                roundRect(ctx, barX, y, barWidth, barHeight, 6);
                ctx.fill();

                // Score bar
                const fillWidth = (currentScore / 100) * barWidth;
                if (fillWidth > 0) {
                    const barGradient = ctx.createLinearGradient(barX, 0, barX + fillWidth, 0);
                    barGradient.addColorStop(0, adjustBrightness(color, -20));
                    barGradient.addColorStop(1, color);
                    ctx.fillStyle = barGradient;
                    roundRect(ctx, barX, y, Math.max(fillWidth, 8), barHeight, 6);
                    ctx.fill();

                    // Glow
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 10;
                    ctx.globalAlpha = 0.3;
                    roundRect(ctx, barX, y, Math.max(fillWidth, 8), barHeight, 6);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                    ctx.shadowBlur = 0;
                }

                // Value
                ctx.font = `700 14px 'Orbitron', sans-serif`;
                ctx.fillStyle = color;
                ctx.textAlign = 'right';
                ctx.fillText(Math.round(currentScore), width - 4, y + barHeight / 2);
            });

            if (progress < 1) {
                requestAnimationFrame(render);
            }
        }

        requestAnimationFrame(render);
    }

    /**
     * Draw a mini sparkline
     */
    function drawSparkline(canvasId, dataPoints, color = '#00d4ff') {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !dataPoints || dataPoints.length < 2) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        const width = canvas.clientWidth || 80;
        const height = canvas.clientHeight || 30;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        const min = Math.min(...dataPoints) - 5;
        const max = Math.max(...dataPoints) + 5;
        const range = max - min || 1;
        const stepX = width / (dataPoints.length - 1);

        ctx.beginPath();
        dataPoints.forEach((val, i) => {
            const x = i * stepX;
            const y = height - ((val - min) / range) * (height - 4) - 2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();

        // Fill gradient below
        const lastX = (dataPoints.length - 1) * stepX;
        ctx.lineTo(lastX, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, adjustBrightness(color, 0) + '40');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    /**
     * Animated counter for metric cards
     */
    function animateCounter(elementId, targetValue, duration = 1000, prefix = '', suffix = '') {
        const el = document.getElementById(elementId);
        if (!el) return;

        const startValue = 0;
        const startTime = performance.now();

        function update(timestamp) {
            const progress = Math.min(1, (timestamp - startTime) / duration);
            const ep = easeOutCubic(progress);
            const current = Math.round(startValue + (targetValue - startValue) * ep);
            el.textContent = prefix + current.toLocaleString('en-IN') + suffix;

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }

        requestAnimationFrame(update);
    }

    /**
     * Animate a currency counter
     */
    function animateCurrencyCounter(elementId, targetValue, duration = 1200) {
        const el = document.getElementById(elementId);
        if (!el) return;

        const startTime = performance.now();

        function update(timestamp) {
            const progress = Math.min(1, (timestamp - startTime) / duration);
            const ep = easeOutCubic(progress);
            const current = Math.round(targetValue * ep);
            el.textContent = ScoringEngine.formatINR(current);

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }

        requestAnimationFrame(update);
    }

    // Helper: Rounded rectangle
    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    // Helper: Easing function
    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    // Helper: Adjust hex color brightness
    function adjustBrightness(hex, amount) {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        const num = parseInt(hex, 16);
        let r = Math.max(0, Math.min(255, ((num >> 16) & 0xFF) + amount));
        let g = Math.max(0, Math.min(255, ((num >> 8) & 0xFF) + amount));
        let b = Math.max(0, Math.min(255, (num & 0xFF) + amount));
        return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
    }

    return {
        drawDoughnut,
        drawGauge,
        drawDimensionBars,
        drawSparkline,
        animateCounter,
        animateCurrencyCounter
    };
})();
