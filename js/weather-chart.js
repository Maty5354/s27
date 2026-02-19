/* ========================================
   WEATHER CHART RENDERER
   ======================================== */

function renderForecastChart(hourlyData) {
    const container = document.getElementById('weatherChart');
    if (!container || !hourlyData) return;

    // Structure: hourlyData = { time: [], temperature_2m: [] }
    // Get next 24 hours
    const currentHourIndex = new Date().getHours();
    const temps = hourlyData.temperature_2m.slice(currentHourIndex, currentHourIndex + 24);
    const times = hourlyData.time.slice(currentHourIndex, currentHourIndex + 24);

    if (temps.length === 0) return;

    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const range = maxTemp - minTemp || 1; // Avoid divide by zero

    let html = '<div class="weather-chart-scroll">';

    temps.forEach((t, i) => {
        const height = ((t - minTemp) / range) * 60 + 20; // Scale to 20%-80% height
        const time = new Date(times[i]).getHours().toString().padStart(2, '0') + ':00';
        
        html += `
            <div class="chart-bar-container">
                <span class="chart-bar-label">${Math.round(t)}°</span>
                <div class="chart-bar-line" style="height: ${height}px;"></div>
                <span class="chart-bar-time">${time}</span>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}