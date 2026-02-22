/* ========================================
   ADVANCED WEATHER CHART ENGINE (SVG)
   Temperature, Precipitation, Wind, Pressure
   ======================================== */

class WeatherChartEngine {
    constructor() {
        this.charts = new Map();
    }

    /**
     * Render temperature sparkline chart
     * @param {Object} hourlyData - Hourly weather data
     * @param {string} containerId - Container element ID
     * @param {number} hours - Number of hours to display (default: 24)
     */
    renderTemperatureSparkline(hourlyData, containerId, hours = 24) {
        const container = document.getElementById(containerId);
        if (!container || !hourlyData || !hourlyData.temperature_2m) return;

        const nowIdx = new Date().getHours();
        const temps = hourlyData.temperature_2m.slice(nowIdx, nowIdx + hours);
        
        if (temps.length === 0) return;

        const minT = Math.min(...temps);
        const maxT = Math.max(...temps);
        const range = (maxT - minT) || 1;
        
        // SVG Dimensions
        const width = 800;
        const height = 60;
        const padding = 10;
        const effHeight = height - padding * 2;
        const stepX = width / Math.max(temps.length - 1, 1);

        // Build smooth path
        let pathD = "";
        let areaD = "";
        const points = [];

        temps.forEach((t, i) => {
            const x = i * stepX;
            const y = padding + effHeight - ((t - minT) / range) * effHeight;
            points.push({ x, y, t });
        });

        // Create smooth curve using Catmull-Rom
        if (points.length > 0) {
            pathD = `M ${points[0].x} ${points[0].y}`;
            areaD = `M ${points[0].x} ${height} L ${points[0].x} ${points[0].y}`;

            for (let i = 1; i < points.length; i++) {
                const p0 = points[Math.max(0, i - 1)];
                const p1 = points[i];
                const p2 = points[Math.min(points.length - 1, i + 1)];
                
                const cp1X = p0.x + (p1.x - p0.x) / 2;
                const cp1Y = p0.y;
                const cp2X = p1.x - (p2.x - p1.x) / 2;
                const cp2Y = p1.y;
                
                pathD += ` C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${p1.x} ${p1.y}`;
                areaD += ` C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${p1.x} ${p1.y}`;
            }
            
            areaD += ` L ${points[points.length - 1].x} ${height} Z`;
        }

        // Build SVG
        const svg = `
            <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" class="weather-sparkline">
                <defs>
                    <linearGradient id="sparkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style="stop-color:#60a5fa;stop-opacity:1" />
                        <stop offset="50%" style="stop-color:#a78bfa;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#f472b6;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <path d="${areaD}" class="sparkline-area"/>
                <path d="${pathD}" class="sparkline-path"/>
            </svg>
        `;

        container.innerHTML = svg;
        this.charts.set(containerId, { type: 'sparkline', data: temps });
    }

    /**
     * Render advanced temperature chart with labels
     * @param {Object} hourlyData - Hourly weather data
     * @param {string} containerId - Container element ID
     */
    renderAdvancedTemperatureChart(hourlyData, containerId) {
        const container = document.getElementById(containerId);
        if (!container || !hourlyData) return;

        const nowIdx = new Date().getHours();
        const temps = hourlyData.temperature_2m.slice(nowIdx, nowIdx + 24);
        const times = hourlyData.time.slice(nowIdx, nowIdx + 24);
        
        if (temps.length === 0) return;

        const minT = Math.min(...temps);
        const maxT = Math.max(...temps);
        const range = (maxT - minT) || 1;
        
        // SVG Dimensions
        const width = 800;
        const height = 120;
        const padding = { top: 25, right: 15, bottom: 25, left: 15 };
        const effHeight = height - padding.top - padding.bottom;
        const effWidth = width - padding.left - padding.right;
        const stepX = effWidth / Math.max(temps.length - 1, 1);

        // Build Path
        let pathD = "";
        let areaD = "";
        const points = [];

        temps.forEach((t, i) => {
            const x = padding.left + i * stepX;
            const y = padding.top + effHeight - ((t - minT) / range) * effHeight;
            points.push({ x, y, t, time: times[i] });
        });

        // Create smooth curve
        if (points.length > 0) {
            pathD = `M ${points[0].x} ${points[0].y}`;
            areaD = `M ${points[0].x} ${height - padding.bottom} L ${points[0].x} ${points[0].y}`;

            for (let i = 1; i < points.length; i++) {
                const prev = points[i - 1];
                const curr = points[i];
                const cp1X = prev.x + stepX / 2;
                const cp1Y = prev.y;
                const cp2X = curr.x - stepX / 2;
                const cp2Y = curr.y;
                
                pathD += ` C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${curr.x} ${curr.y}`;
                areaD += ` C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${curr.x} ${curr.y}`;
            }
            
            areaD += ` L ${points[points.length - 1].x} ${height - padding.bottom} Z`;
        }

        // Generate points and labels
        let pointsHtml = "";
        points.forEach((p, i) => {
            if (i % 3 === 0) {
                const hour = new Date(p.time).getHours();
                pointsHtml += `
                    <circle cx="${p.x}" cy="${p.y}" r="3.5" class="sparkline-dot"/>
                    <text x="${p.x}" y="${p.y - 10}" fill="rgba(255,255,255,0.9)" font-size="11" text-anchor="middle" font-weight="600">${Math.round(p.t)}°</text>
                    <text x="${p.x}" y="${height - 8}" fill="rgba(255,255,255,0.5)" font-size="9" text-anchor="middle">${hour}:00</text>
                `;
            }
        });

        const svg = `
            <svg viewBox="0 0 ${width} ${height}" class="w-chart-svg">
                <defs>
                    <linearGradient id="chartGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
                        <stop offset="50%" style="stop-color:#8b5cf6;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#ec4899;stop-opacity:1" />
                    </linearGradient>
                    <linearGradient id="chartAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:0.3" />
                        <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:0.05" />
                    </linearGradient>
                </defs>
                <path d="${areaD}" fill="url(#chartAreaGradient)"/>
                <path d="${pathD}" fill="none" stroke="url(#chartGradient)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                ${pointsHtml}
            </svg>
        `;

        container.innerHTML = svg;
        this.charts.set(containerId, { type: 'advanced', data: temps });
    }

    /**
     * Render precipitation probability bar chart
     * @param {Object} hourlyData - Hourly weather data
     * @param {string} containerId - Container element ID
     */
    renderPrecipitationChart(hourlyData, containerId) {
        const container = document.getElementById(containerId);
        if (!container || !hourlyData || !hourlyData.precipitation_probability) return;

        const nowIdx = new Date().getHours();
        const precip = hourlyData.precipitation_probability.slice(nowIdx, nowIdx + 24);
        const times = hourlyData.time.slice(nowIdx, nowIdx + 24);
        
        if (precip.length === 0) return;

        const width = 800;
        const height = 80;
        const barWidth = width / precip.length;

        let barsHtml = "";
        precip.forEach((p, i) => {
            const barHeight = (p / 100) * (height - 20);
            const x = i * barWidth;
            const y = height - barHeight - 10;
            const hour = new Date(times[i]).getHours();
            
            if (i % 3 === 0) {
                barsHtml += `
                    <rect x="${x + barWidth * 0.2}" y="${y}" width="${barWidth * 0.6}" height="${barHeight}" 
                          fill="rgba(96, 165, 250, 0.6)" rx="2"/>
                    <text x="${x + barWidth / 2}" y="${height - 2}" fill="rgba(255,255,255,0.5)" 
                          font-size="8" text-anchor="middle">${hour}:00</text>
                    ${p > 10 ? `<text x="${x + barWidth / 2}" y="${y - 3}" fill="rgba(255,255,255,0.9)" 
                          font-size="9" text-anchor="middle" font-weight="600">${p}%</text>` : ''}
                `;
            }
        });

        const svg = `
            <svg viewBox="0 0 ${width} ${height}" class="w-precip-chart">
                ${barsHtml}
            </svg>
        `;

        container.innerHTML = svg;
        this.charts.set(containerId, { type: 'precipitation', data: precip });
    }

    /**
     * Render sunrise/sunset arc
     * @param {number} sunrise - Sunrise timestamp
     * @param {number} sunset - Sunset timestamp
     * @param {number} currentTime - Current timestamp
     * @param {string} containerId - Container element ID
     */
    renderSunArc(sunrise, sunset, currentTime, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const width = 200;
        const height = 100;
        const cx = width / 2;
        const cy = height - 10;
        const radius = 70;

        // Calculate positions
        const totalDuration = sunset - sunrise;
        const elapsed = Math.max(0, Math.min(totalDuration, currentTime - sunrise));
        const progress = totalDuration > 0 ? elapsed / totalDuration : 0;

        // Arc path (semicircle)
        const startAngle = Math.PI;
        const endAngle = 0;
        const arcPath = this._describeArc(cx, cy, radius, startAngle, endAngle);
        
        // Current sun position
        const currentAngle = Math.PI - (progress * Math.PI);
        const sunX = cx + radius * Math.cos(currentAngle);
        const sunY = cy + radius * Math.sin(currentAngle);

        // Progress arc
        const progressArcLength = Math.PI * radius;
        const progressOffset = progressArcLength * (1 - progress);

        const svg = `
            <defs>
                <linearGradient id="sunGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#fbbf24;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#fb923c;stop-opacity:1" />
                </linearGradient>
            </defs>
            <path d="${arcPath}" class="sun-arc-track"/>
            <path d="${arcPath}" class="sun-arc-fill" 
                  stroke-dasharray="${progressArcLength}" 
                  stroke-dashoffset="${progressOffset}"/>
            <circle cx="${sunX}" cy="${sunY}" r="6" fill="#fbbf24" 
                    filter="drop-shadow(0 0 8px rgba(251, 191, 36, 0.8))" 
                    class="sun-position-circle"/>
        `;

        container.innerHTML = svg;
        this.charts.set(containerId, { type: 'sun-arc', sunrise, sunset, currentTime });
    }

    /**
     * Helper to describe SVG arc path
     */
    _describeArc(cx, cy, radius, startAngle, endAngle) {
        const start = {
            x: cx + radius * Math.cos(startAngle),
            y: cy + radius * Math.sin(startAngle)
        };
        const end = {
            x: cx + radius * Math.cos(endAngle),
            y: cy + radius * Math.sin(endAngle)
        };
        const largeArc = endAngle - startAngle <= Math.PI ? 0 : 1;
        return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
    }

    /**
     * Clear all charts
     */
    clearAll() {
        this.charts.clear();
    }

    /**
     * Get chart by container ID
     */
    getChart(containerId) {
        return this.charts.get(containerId);
    }
}

// Initialize global instance
window.weatherChartEngine = new WeatherChartEngine();

// Legacy compatibility wrapper
window.renderAdvancedChart = function(hourlyData, containerId) {
    window.weatherChartEngine.renderAdvancedTemperatureChart(hourlyData, containerId);
};
