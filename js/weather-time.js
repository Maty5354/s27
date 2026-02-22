/* ========================================
   WEATHER SERVICE (Multi-City & Advanced API)
   ======================================== */

const WMO_CODES = {
    0: { desc: "Clear sky", icon: "☀️" },
    1: { desc: "Mainly clear", icon: "🌤️" },
    2: { desc: "Partly cloudy", icon: "⛅" },
    3: { desc: "Overcast", icon: "☁️" },
    45: { desc: "Fog", icon: "🌫️" },
    48: { desc: "Depositing rime fog", icon: "🌫️" },
    51: { desc: "Light drizzle", icon: "🌦️" },
    53: { desc: "Moderate drizzle", icon: "🌦️" },
    55: { desc: "Dense drizzle", icon: "🌦️" },
    56: { desc: "Light freezing drizzle", icon: "🌧️" },
    57: { desc: "Dense freezing drizzle", icon: "🌧️" },
    61: { desc: "Slight rain", icon: "🌧️" },
    63: { desc: "Moderate rain", icon: "🌧️" },
    65: { desc: "Heavy rain", icon: "🌧️" },
    66: { desc: "Light freezing rain", icon: "🌧️" },
    67: { desc: "Heavy freezing rain", icon: "🌧️" },
    71: { desc: "Slight snow fall", icon: "❄️" },
    73: { desc: "Moderate snow fall", icon: "❄️" },
    75: { desc: "Heavy snow fall", icon: "❄️" },
    77: { desc: "Snow grains", icon: "❄️" },
    80: { desc: "Slight rain showers", icon: "🌧️" },
    81: { desc: "Moderate rain showers", icon: "🌧️" },
    82: { desc: "Violent rain showers", icon: "⛈️" },
    85: { desc: "Slight snow showers", icon: "❄️" },
    86: { desc: "Heavy snow showers", icon: "❄️" },
    95: { desc: "Thunderstorm", icon: "⛈️" },
    96: { desc: "Thunderstorm with hail", icon: "⛈️" },
    99: { desc: "Heavy thunderstorm", icon: "⛈️" }
};

class WeatherApp {
    constructor() {
        this.cities = JSON.parse(localStorage.getItem('w-cities')) || [
            { id: 'bucharest', name: 'Bucharest', lat: 44.4268, lon: 26.1025, country: 'Romania' }
        ];
        this.currentIndex = 0;
        this.weatherDataCache = {};
        
        this.initDOM();
        this.bindEvents();
        this.initSwiper();
        this.loadAllCities();
    }

    initDOM() {
        this.overlay = document.getElementById('weatherOverlay');
        this.swiper = document.getElementById('wSwiper');
        this.dotsContainer = document.getElementById('wCityDots');
        this.cityManager = document.getElementById('wCityManager');
        this.searchInput = document.getElementById('wCitySearch');
        this.searchResults = document.getElementById('wSearchResults');
        this.savedCitiesList = document.getElementById('wSavedCities');

        if(window.overlayManager) {
            window.overlayManager.register('weatherOverlay', {
                onOpen: () => this.onOpen(),
                onClose: () => this.onClose()
            });
        }
    }

    bindEvents() {
        // Triggers
        ['weatherBtn', 'sheetWeatherBtn'].forEach(id => {
            document.getElementById(id)?.addEventListener('click', () => {
                if(window.overlayManager) window.overlayManager.close('sideMenu');
                if(window.overlayManager) window.overlayManager.open('weatherOverlay');
            });
        });

        document.getElementById('closeWeatherOverlay')?.addEventListener('click', () => {
            if(window.overlayManager) window.overlayManager.close('weatherOverlay');
        });

        // City Manager
        document.getElementById('manageCitiesBtn')?.addEventListener('click', () => {
            this.renderSavedCities();
            this.cityManager.classList.remove('hidden');
        });
        document.getElementById('closeCityManager')?.addEventListener('click', () => {
            this.cityManager.classList.add('hidden');
        });

        // Search API
        let debounce;
        this.searchInput?.addEventListener('input', (e) => {
            clearTimeout(debounce);
            debounce = setTimeout(() => this.searchCity(e.target.value), 500);
        });
    }

    onOpen() {
        if(window.weatherParticleEngine) window.weatherParticleEngine.start();
        this.updateBackgroundForCurrentCity();
    }

    onClose() {
        if(window.weatherParticleEngine) window.weatherParticleEngine.stop();
        this.cityManager.classList.add('hidden');
    }

    /* --- Swiper Logic --- */
    initSwiper() {
        let startX = 0;
        let isDragging = false;
        let currentTranslate = 0;
        let prevTranslate = 0;

        this.swiper.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
            this.swiper.style.transition = 'none';
        }, {passive: true});

        this.swiper.addEventListener('touchmove', (e) => {
            if(!isDragging) return;
            const currentX = e.touches[0].clientX;
            const diff = currentX - startX;
            currentTranslate = prevTranslate + diff;
            this.swiper.style.transform = `translateX(${currentTranslate}px)`;
        }, {passive: true});

        this.swiper.addEventListener('touchend', (e) => {
            isDragging = false;
            const movedBy = currentTranslate - prevTranslate;
            this.swiper.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
            
            if (movedBy < -70 && this.currentIndex < this.cities.length - 1) this.currentIndex += 1;
            if (movedBy > 70 && this.currentIndex > 0) this.currentIndex -= 1;
            
            this.snapToCurrentIndex();
        });
    }

    snapToCurrentIndex() {
        const translate = this.currentIndex * -window.innerWidth;
        this.swiper.style.transform = `translateX(${translate}px)`;
        // Update dots
        Array.from(this.dotsContainer.children).forEach((dot, i) => {
            dot.classList.toggle('active', i === this.currentIndex);
        });
        this.updateBackgroundForCurrentCity();
    }

    /* --- Data Fetching --- */
    async loadAllCities() {
        this.swiper.innerHTML = '';
        this.dotsContainer.innerHTML = '';

        for (let i = 0; i < this.cities.length; i++) {
            // Build Slide Skeleton
            const slide = document.createElement('div');
            slide.className = 'w-slide';
            slide.id = `w-slide-${i}`;
            slide.innerHTML = `<div class="w-slide-content" id="w-content-${i}"><div style="text-align:center; margin-top:50px;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div></div>`;
            this.swiper.appendChild(slide);

            // Add Dot
            const dot = document.createElement('div');
            dot.className = `w-dot ${i === this.currentIndex ? 'active' : ''}`;
            this.dotsContainer.appendChild(dot);
            
            // Fetch
            this.fetchCityData(this.cities[i], i);
        }
        this.snapToCurrentIndex();
    }

    async fetchCityData(city, index) {
        try {
            const weatherParams = new URLSearchParams({
                latitude: city.lat, longitude: city.lon,
                current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure",
                hourly: "temperature_2m,precipitation_probability,weather_code",
                daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max",
                timezone: "auto"
            });
            const aqiParams = new URLSearchParams({
                latitude: city.lat, longitude: city.lon,
                current: "european_aqi,uv_index",
                timezone: "auto"
            });

            const [wRes, aRes] = await Promise.all([
                fetch(`https://api.open-meteo.com/v1/forecast?${weatherParams}`),
                fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${aqiParams}`)
            ]);

            const weather = await wRes.json();
            const aqi = aRes.ok ? await aRes.json() : null;

            this.weatherDataCache[index] = { weather, aqi, city };
            this.renderSlide(index);
            
            // Update Menu buttons if it's the first city
            if(index === 0) this.updateMenuButtons(weather.current);

        } catch (e) {
            console.error("Failed to load weather for", city.name, e);
            document.getElementById(`w-content-${index}`).innerHTML = `<div style="text-align:center; margin-top:50px;">Failed to load data.</div>`;
        }
    }

    /* --- Rendering --- */
    renderSlide(index) {
        const { weather, aqi, city } = this.weatherDataCache[index];
        const cur = weather.current;
        const daily = weather.daily;
        const info = WMO_CODES[cur.weather_code] || WMO_CODES[0];
        
        // AQI & UV
        const currentAqi = aqi?.current?.european_aqi || 0;
        const currentUv = aqi?.current?.uv_index || 0;

        const content = document.getElementById(`w-content-${index}`);
        
        let html = `
            <!-- HERO -->
            <div class="w-hero">
                <h2 class="w-city-name">${city.name}</h2>
                <div class="w-temp">${Math.round(cur.temperature_2m)}&deg;</div>
                <div class="w-condition">${info.icon} ${info.desc}</div>
                <div class="w-hilo">H:${Math.round(daily.temperature_2m_max[0])}&deg; L:${Math.round(daily.temperature_2m_min[0])}&deg;</div>
            </div>

            <!-- HOURLY & CHART -->
            <div class="w-panel">
                <div class="w-panel-title"><i class="fa-solid fa-clock"></i> 24-Hour Forecast</div>
                <div class="w-hourly-scroll">
                    ${this.generateHourlyHTML(weather.hourly)}
                </div>
                <div class="w-chart-container" id="w-chart-${index}"></div>
            </div>

            <!-- GAUGES GRID -->
            <div class="w-grid">
                <!-- UV Index -->
                <div class="w-grid-card">
                    <h4><i class="fa-solid fa-sun"></i> UV Index</h4>
                    ${this.generateGaugeHTML(currentUv, 11, this.getUVDesc(currentUv))}
                </div>
                <!-- Air Quality -->
                <div class="w-grid-card">
                    <h4><i class="fa-solid fa-leaf"></i> Air Quality</h4>
                    ${this.generateGaugeHTML(currentAqi, 100, this.getAQIDesc(currentAqi))}
                </div>
                <!-- Wind -->
                <div class="w-grid-card">
                    <h4><i class="fa-solid fa-wind"></i> Wind</h4>
                    <div style="font-size:1.5rem; font-weight:700;">${cur.wind_speed_10m} <span style="font-size:1rem; opacity:0.7;">km/h</span></div>
                    <div class="w-gauge-desc">Direction: ${cur.wind_direction_10m}&deg;</div>
                </div>
                <!-- Humidity -->
                <div class="w-grid-card">
                    <h4><i class="fa-solid fa-droplet"></i> Humidity</h4>
                    <div style="font-size:1.5rem; font-weight:700;">${cur.relative_humidity_2m}%</div>
                    <div class="w-gauge-desc">Dew point is matched.</div>
                </div>
                <!-- Sunrise/Sunset -->
                <div class="w-grid-card" style="grid-column: span 2;">
                    <h4><i class="fa-solid fa-mountain-sun"></i> Sun</h4>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>Rise: <b>${new Date(daily.sunrise[0]).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</b></div>
                        <div>Set: <b>${new Date(daily.sunset[0]).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</b></div>
                    </div>
                </div>
            </div>

            <!-- DAILY -->
            <div class="w-panel">
                <div class="w-panel-title"><i class="fa-solid fa-calendar-days"></i> 7-Day Forecast</div>
                ${this.generateDailyHTML(daily)}
            </div>
        `;

        content.innerHTML = html;

        // Render Chart
        if(window.renderAdvancedChart) {
            window.renderAdvancedChart(weather.hourly, `w-chart-${index}`);
        }

        // Scroll listener for Background fade
        content.addEventListener('scroll', (e) => {
            if(index === this.currentIndex && window.weatherParticleEngine) {
                window.weatherParticleEngine.setScroll(e.target.scrollTop);
            }
        });
    }

    generateHourlyHTML(hourly) {
        const nowIdx = new Date().getHours();
        let html = '';
        for(let i=nowIdx; i<nowIdx+24; i++) {
            const time = new Date(hourly.time[i]).getHours() + ':00';
            const icon = (WMO_CODES[hourly.weather_code[i]] || WMO_CODES[0]).icon;
            const temp = Math.round(hourly.temperature_2m[i]);
            html += `
                <div class="w-hour-item">
                    <div class="w-hour-time">${time}</div>
                    <div class="w-hour-icon">${icon}</div>
                    <div class="w-hour-temp">${temp}&deg;</div>
                </div>
            `;
        }
        return html;
    }

    generateDailyHTML(daily) {
        let html = '';
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        // Global min/max for scale bar
        const globMin = Math.min(...daily.temperature_2m_min);
        const globMax = Math.max(...daily.temperature_2m_max);
        const range = globMax - globMin;

        for(let i=0; i<7; i++) {
            const date = new Date(daily.time[i]);
            const dayName = i === 0 ? 'Today' : days[date.getDay()];
            const icon = (WMO_CODES[daily.weather_code[i]] || WMO_CODES[0]).icon;
            const min = Math.round(daily.temperature_2m_min[i]);
            const max = Math.round(daily.temperature_2m_max[i]);
            
            const leftPct = ((min - globMin) / range) * 100;
            const widthPct = ((max - min) / range) * 100;

            html += `
                <div class="w-daily-row">
                    <div class="w-daily-day">${dayName}</div>
                    <div class="w-daily-icon">${icon}</div>
                    <div class="w-daily-temps">
                        <span class="w-temp-min">${min}&deg;</span>
                        <div class="w-temp-bar-wrap">
                            <div class="w-temp-bar" style="left: ${leftPct}%; width: ${widthPct}%;"></div>
                        </div>
                        <span class="w-temp-max">${max}&deg;</span>
                    </div>
                </div>
            `;
        }
        return html;
    }

    generateGaugeHTML(value, max, desc) {
        const pct = Math.min(value / max, 1);
        const offset = 125.6 - (125.6 * pct);
        // Map color based on value
        let color = '#10b981'; // green
        if(pct > 0.33) color = '#f59e0b'; // yellow
        if(pct > 0.66) color = '#ef4444'; // red

        return `
            <div class="w-gauge-wrap">
                <svg viewBox="0 0 100 50" class="w-gauge-svg">
                    <path class="w-gauge-bg" d="M 10 50 A 40 40 0 0 1 90 50" fill="none" />
                    <path class="w-gauge-fill" d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke-dasharray="125.6" stroke-dashoffset="${offset}" stroke="${color}" />
                </svg>
                <div class="w-gauge-value">${value}</div>
            </div>
            <div class="w-gauge-desc">${desc}</div>
        `;
    }

    getUVDesc(uv) {
        if(uv < 3) return "Low";
        if(uv < 6) return "Moderate";
        if(uv < 8) return "High";
        return "Very High";
    }

    getAQIDesc(aqi) {
        if(aqi < 20) return "Good";
        if(aqi < 40) return "Fair";
        if(aqi < 60) return "Moderate";
        return "Poor";
    }

    updateBackgroundForCurrentCity() {
        const data = this.weatherDataCache[this.currentIndex];
        if(!data || !window.weatherParticleEngine) return;
        const c = data.weather.current;
        window.weatherParticleEngine.setCondition(c.weather_code, c.is_day);
        
        // Reset scroll value on change
        const content = document.getElementById(`w-content-${this.currentIndex}`);
        if(content) window.weatherParticleEngine.setScroll(content.scrollTop);
    }

    updateMenuButtons(cur) {
        const info = WMO_CODES[cur.weather_code] || WMO_CODES[0];
        ['menuWeatherEmoji', 'sheetWeatherEmoji'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.textContent = info.icon;
        });
        ['menuWeatherTemp', 'sheetWeatherTemp'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerHTML = `${Math.round(cur.temperature_2m)}&deg;C`;
        });
    }

    /* --- City Manager --- */
    async searchCity(query) {
        if(query.length < 2) {
            this.searchResults.innerHTML = '';
            return;
        }
        try {
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5`);
            const data = await res.json();
            if(!data.results) {
                this.searchResults.innerHTML = '<div class="w-result-item">No results found.</div>';
                return;
            }
            this.searchResults.innerHTML = data.results.map(r => `
                <div class="w-result-item" data-name="${r.name}" data-lat="${r.latitude}" data-lon="${r.longitude}" data-country="${r.country}">
                    <div><b>${r.name}</b>, ${r.country}</div>
                    <i class="fa-solid fa-plus"></i>
                </div>
            `).join('');

            this.searchResults.querySelectorAll('.w-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    this.addCity({
                        id: Date.now().toString(),
                        name: item.dataset.name,
                        lat: parseFloat(item.dataset.lat),
                        lon: parseFloat(item.dataset.lon),
                        country: item.dataset.country
                    });
                });
            });
        } catch (e) {
            console.error(e);
        }
    }

    addCity(cityObj) {
        this.cities.push(cityObj);
        this.saveCities();
        this.searchInput.value = '';
        this.searchResults.innerHTML = '';
        this.renderSavedCities();
        this.loadAllCities(); // Re-render swiper
        this.currentIndex = this.cities.length - 1; // Go to new city
        setTimeout(() => this.snapToCurrentIndex(), 100);
    }

    removeCity(index) {
        if(this.cities.length <= 1) return alert("You must have at least one city.");
        this.cities.splice(index, 1);
        this.saveCities();
        this.currentIndex = 0;
        this.renderSavedCities();
        this.loadAllCities();
    }

    saveCities() {
        localStorage.setItem('w-cities', JSON.stringify(this.cities));
    }

    renderSavedCities() {
        this.savedCitiesList.innerHTML = this.cities.map((c, i) => `
            <div class="w-saved-city">
                <div class="w-saved-city-info">
                    <h4>${c.name}</h4>
                    <p>${c.country || ''}</p>
                </div>
                ${this.cities.length > 1 ? `<button class="w-city-del" onclick="window.weatherApp.removeCity(${i})"><i class="fa-solid fa-trash"></i></button>` : ''}
            </div>
        `).join('');
    }
}

// Initialize Global App
window.addEventListener('DOMContentLoaded', () => {
    window.weatherApp = new WeatherApp();
});
