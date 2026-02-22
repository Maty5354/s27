/* ========================================
   ADVANCED WEATHER CHART (SVG)
   ======================================== */

window.renderAdvancedChart = function(hourlyData, containerId) {
    const container = document.getElementById(containerId);
    if (!container || !hourlyData) return;

    const nowIdx = new Date().getHours();
    const temps = hourlyData.temperature_2m.slice(nowIdx, nowIdx + 24);
    
    if (temps.length === 0) return;

    const minT = Math.min(...temps);
    const maxT = Math.max(...temps);
    const range = (maxT - minT) || 1;
    
    // SVG Dimensions
    const width = 800; // Fixed internal width, scales via viewBox
    const height = 100;
    const padding = 20;
    const effHeight = height - padding * 2;
    const stepX = width / (temps.length - 1);

    // Build Path (Smooth Curve)
    let pathD = "";
    const points = [];

    temps.forEach((t, i) => {
        const x = i * stepX;
        const y = padding + effHeight - ((t - minT) / range) * effHeight;
        points.push({x, y, t});
        
        if (i === 0) {
            pathD += `M ${x} ${y} `;
        } else {
            // Simple Catmull-Rom to Cubic Bezier conversion (simplified for aesthetic)
            const prev = points[i-1];
            const cp1X = prev.x + stepX / 2;
            const cp1Y = prev.y;
            const cp2X = x - stepX / 2;
            const cp2Y = y;
            pathD += `C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${x} ${y} `;
        }
    });

    // Generate Points & Text
    let pointsHtml = "";
    points.forEach((p, i) => {
        // Only show text for every 3rd hour to prevent crowding
        if (i % 3 === 0) {
            pointsHtml += `
                <circle cx="${p.x}" cy="${p.y}" r="4" class="w-chart-point"/>
                <text x="${p.x}" y="${p.y - 12}" fill="var(--w-text-main)" font-size="12" text-anchor="middle" font-weight="600">${Math.round(p.t)}&deg;</text>
            `;
        }
    });

    const svg = `
        <svg viewBox="0 -15 ${width} ${height + 20}" preserveAspectRatio="none" class="w-chart-svg">
            <path d="${pathD}" class="w-chart-path"/>
            ${pointsHtml}
        </svg>
    `;

    container.innerHTML = svg;
};
