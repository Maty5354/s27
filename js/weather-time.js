/* ========================================
   WEATHER APP — COMPLETE REWRITE
   Multi-city, full Open-Meteo data, AQI,
   UV, Wind, Sunrise/Sunset, Gauges, Charts
   ======================================== */

/* ── WMO Weather Codes ─────────────────────────── */
const WMO = {
    0:  { d:'Clear sky',             i:'☀️',  n:'🌙' },
    1:  { d:'Mainly clear',          i:'🌤️', n:'🌑' },
    2:  { d:'Partly cloudy',         i:'⛅',  n:'☁️' },
    3:  { d:'Overcast',              i:'☁️',  n:'☁️' },
    45: { d:'Fog',                   i:'🌫️', n:'🌫️' },
    48: { d:'Rime fog',              i:'🌫️', n:'🌫️' },
    51: { d:'Light drizzle',         i:'🌦️', n:'🌦️' },
    53: { d:'Moderate drizzle',      i:'🌦️', n:'🌦️' },
    55: { d:'Dense drizzle',         i:'🌧️', n:'🌧️' },
    56: { d:'Freezing drizzle',      i:'🌧️', n:'🌧️' },
    57: { d:'Heavy freezing drizzle',i:'🌧️', n:'🌧️' },
    61: { d:'Slight rain',           i:'🌧️', n:'🌧️' },
    63: { d:'Moderate rain',         i:'🌧️', n:'🌧️' },
    65: { d:'Heavy rain',            i:'🌧️', n:'🌧️' },
    66: { d:'Light freezing rain',   i:'🌨️', n:'🌨️' },
    67: { d:'Heavy freezing rain',   i:'🌨️', n:'🌨️' },
    71: { d:'Slight snow',           i:'❄️',  n:'❄️' },
    73: { d:'Moderate snow',         i:'🌨️', n:'🌨️' },
    75: { d:'Heavy snow',            i:'❄️',  n:'❄️' },
    77: { d:'Snow grains',           i:'🌨️', n:'🌨️' },
    80: { d:'Light showers',         i:'🌦️', n:'🌦️' },
    81: { d:'Moderate showers',      i:'🌧️', n:'🌧️' },
    82: { d:'Violent showers',       i:'⛈️',  n:'⛈️' },
    85: { d:'Slight snow showers',   i:'🌨️', n:'🌨️' },
    86: { d:'Heavy snow showers',    i:'❄️',  n:'❄️' },
    95: { d:'Thunderstorm',          i:'⛈️',  n:'⛈️' },
    96: { d:'Thunderstorm + hail',   i:'⛈️',  n:'⛈️' },
    99: { d:'Thunderstorm + hail',   i:'⛈️',  n:'⛈️' },
};
function wmoIcon(code, isDay = 1) {
    const w = WMO[code] || WMO[3];
    return isDay ? w.i : (w.n || w.i);
}
function wmoDesc(code) { return (WMO[code] || WMO[3]).d; }

/* ── AQI helpers ───────────────────────────────── */
const AQI_LEVELS = [
    { max: 20,  label: 'Good',       cls: 'good',      icon: '😊' },
    { max: 40,  label: 'Fair',       cls: 'fair',      icon: '🙂' },
    { max: 60,  label: 'Moderate',   cls: 'moderate',  icon: '😐' },
    { max: 80,  label: 'Poor',       cls: 'poor',      icon: '😷' },
    { max: 100, label: 'Very Poor',  cls: 'very-poor', icon: '☠️' },
];
function aqiLevel(val) {
    return AQI_LEVELS.find(l => val <= l.max) || AQI_LEVELS[4];
}

/* ── UV Index helpers ──────────────────────────── */
function uvClass(uv) {
    if (uv < 3)  return 'stat-uv-low';
    if (uv < 6)  return 'stat-uv-mod';
    if (uv < 8)  return 'stat-uv-high';
    if (uv < 11) return 'stat-uv-vhigh';
    return 'stat-uv-ext';
}
function uvLabel(uv) {
    if (uv < 3)  return 'Low';
    if (uv < 6)  return 'Moderate';
    if (uv < 8)  return 'High';
    if (uv < 11) return 'Very High';
    return 'Extreme';
}

/* ── Wind direction ────────────────────────────── */
function windDir(deg) {
    if (deg == null) return '—';
    const dirs = ['N','NE','E','SE','S','SW','W','NW'];
    return dirs[Math.round(deg / 45) % 8];
}

/* ── Dew point comfort ─────────────────────────── */
function dewComfort(dp) {
    if (dp < 10) return { cls: 'dry',        label: 'Dry' };
    if (dp < 16) return { cls: 'comfy',      label: 'Comfortable' };
    if (dp < 21) return { cls: 'humid',      label: 'Humid' };
    return         { cls: 'oppressive',      label: 'Oppressive' };
}

/* ── Visibility formatting ─────────────────────── */
function fmtVis(m) {
    if (m == null) return '—';
    if (m >= 10000) return '10+ km';
    return m >= 1000 ? `${(m/1000).toFixed(1)} km` : `${m} m`;
}

/* ── Time formatting ───────────────────────────── */
function fmtTime(isoStr) {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}
function fmtHour(isoStr) {
    if (!isoStr) return '';
    return new Date(isoStr).getHours().toString().padStart(2, '0') + ':00';
}
function fmtDayName(isoStr, short = false) {
    const d = new Date(isoStr + 'T12:00');
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const fmt = short ? 'short' : 'long';
    return d.toLocaleDateString([], { weekday: fmt });
}
function fmtShortDate(isoStr) {
    return new Date(isoStr + 'T12:00').toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/* ── Debounce ──────────────────────────────────── */
function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* ========================================
   WEATHER APP CLASS
   ======================================== */
class WeatherApp {
    constructor() {
        if (WeatherApp._inst) return WeatherApp._inst;
        WeatherApp._inst = this;

        this.CITY_KEY    = 'weather-saved-cities-v3';
        this.CACHE_KEY   = 'weather-cache-v4-';
        this.CACHE_TTL   = 10 * 60 * 1000; // 10 min

        this.cities      = this._loadCities();   // [{name,lat,lon,country}]
        this.cityIdx     = 0;
        this.cityData    = {};                   // lat,lon -> { weather, aqi, ts }
        this.loading     = false;
        this.searchOpen  = false;
        this.activeTab   = 'today';
        this.particleEng = null;
        this.swipeStartX = 0;
        this.dragging    = false;

        this._bindDOM();
        this._initParticles();
        this._initOverlay();
        this._initClockAndTitle();
    }

    /* ── DOM binding ─────────────────────────────── */
    _bindDOM() {
        // Buttons
        this._q('#weatherBtn')?.addEventListener('click',   () => this.open());
        this._q('#sheetWeatherBtn')?.addEventListener('click', () => this.open());
        this._q('#closeWeatherOverlay')?.addEventListener('click', () => this.close());
        this._q('#weatherSearchToggleBtn')?.addEventListener('click', () => this.toggleSearch());
        this._q('#weatherSearchCloseBtn')?.addEventListener('click', () => this.closeSearch());
        this._q('#weatherRefreshBtn')?.addEventListener('click', () => this.refresh());

        // Search input
        const si = this._q('#weatherSearchInput');
        if (si) {
            si.addEventListener('input', debounce((e) => this._onSearchInput(e.target.value), 350));
            si.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.closeSearch(); });
        }

        // City add button
        this._q('#weatherAddCityBtn')?.addEventListener('click', () => this.toggleSearch());

        // Tab bar (mobile)
        document.querySelectorAll('.weather-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
        // Right-side tabs (desktop)
        document.querySelectorAll('.weather-right-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchDesktopTab(btn.dataset.tab));
        });

        // Swipe between cities
        const swipeEl = this._q('#weatherCityPages');
        if (swipeEl) {
            swipeEl.addEventListener('touchstart',  (e) => this._swipeStart(e), { passive: true });
            swipeEl.addEventListener('touchend',    (e) => this._swipeEnd(e),   { passive: true });
        }
    }

    _q(sel) { return document.querySelector(sel); }
    _qq(sel) { return document.querySelectorAll(sel); }

    /* ── Particle Engine ─────────────────────────── */
    _initParticles() {
        if (typeof WeatherParticleEngine !== 'undefined') {
            this.particleEng = new WeatherParticleEngine('weatherCanvas');
        }
    }

    /* ── Overlay Manager registration ───────────── */
    _initOverlay() {
        if (window.overlayManager) {
            window.overlayManager.register('weatherOverlay', {
                onOpen:  () => { this.particleEng?.start(); },
                onClose: () => { this.particleEng?.stop(); },
            });
        }
    }

    /* ── open / close ────────────────────────────── */
    open() {
        window.overlayManager?.close('sideMenu');
        window.overlayManager?.open('weatherOverlay');
        if (!Object.keys(this.cityData).length) {
            this._loadAllCities();
        } else {
            this._renderCurrentCity();
        }
    }
    close() { window.overlayManager?.close('weatherOverlay'); }

    /* ── Cities management ───────────────────────── */
    _loadCities() {
        try {
            const saved = JSON.parse(localStorage.getItem(this.CITY_KEY) || '[]');
            if (!saved.length) saved.push({ name: 'Bucharest', lat: 44.4268, lon: 26.1025, country: 'RO' });
            return saved;
        } catch { return [{ name: 'Bucharest', lat: 44.4268, lon: 26.1025, country: 'RO' }]; }
    }
    _saveCities() {
        localStorage.setItem(this.CITY_KEY, JSON.stringify(this.cities));
    }
    addCity(city) {
        if (this.cities.some(c => c.name === city.name && c.lat === city.lat)) return;
        if (this.cities.length >= 5) { this.cities.shift(); } // max 5
        this.cities.push(city);
        this._saveCities();
        this.cityIdx = this.cities.length - 1;
        this._renderCityChips();
        this._loadCityData(city);
    }
    removeCity(idx) {
        if (this.cities.length <= 1) return;
        this.cities.splice(idx, 1);
        this._saveCities();
        this.cityIdx = Math.min(this.cityIdx, this.cities.length - 1);
        this._renderCityChips();
        this._renderCurrentCity();
    }

    /* ── Cache helpers ───────────────────────────── */
    _cacheKey(lat, lon) { return `${this.CACHE_KEY}${lat.toFixed(3)}_${lon.toFixed(3)}`; }
    _fromCache(lat, lon) {
        try {
            const c = JSON.parse(localStorage.getItem(this._cacheKey(lat, lon)) || 'null');
            if (c && Date.now() - c.ts < this.CACHE_TTL) return c;
        } catch {}
        return null;
    }
    _toCache(lat, lon, data) {
        try {
            localStorage.setItem(this._cacheKey(lat, lon), JSON.stringify({ ...data, ts: Date.now() }));
        } catch {}
    }
    _cityKey(city) { return `${city.lat.toFixed(3)}_${city.lon.toFixed(3)}`; }

    /* ── Data loading ────────────────────────────── */
    async _loadAllCities() {
        this._showLoading(true);
        // Try geolocation for first city override
        try {
            const pos = await new Promise((res, rej) =>
                navigator.geolocation.getCurrentPosition(res, rej, { timeout: 6000 })
            );
            const { latitude: lat, longitude: lon } = pos.coords;
            // Try reverse geocode via open-meteo geocoding (limited, fallback to coords)
            const name = await this._reverseGeocode(lat, lon);
            const geoCity = { name, lat, lon, country: '' };
            if (!this.cities.some(c => Math.abs(c.lat - lat) < 0.1)) {
                this.cities[0] = geoCity;
                this._saveCities();
            }
        } catch {}

        for (const city of this.cities) {
            await this._loadCityData(city);
        }
        this._showLoading(false);
        this._renderCityChips();
        this._renderCurrentCity();
    }

    async _reverseGeocode(lat, lon) {
        try {
            const url = `https://geocoding-api.open-meteo.com/v1/search?name=&latitude=${lat}&longitude=${lon}&count=1&language=en&format=json`;
            // Open-Meteo geocoding doesn't do reverse; use a known city name approximation
        } catch {}
        return 'My Location';
    }

    async _loadCityData(city) {
        const key = this._cityKey(city);
        const cached = this._fromCache(city.lat, city.lon);
        if (cached) { this.cityData[key] = cached; return; }

        try {
            const [weather, aqi] = await Promise.all([
                this._fetchWeather(city.lat, city.lon),
                this._fetchAQI(city.lat, city.lon),
            ]);
            const data = { weather, aqi };
            this.cityData[key] = data;
            this._toCache(city.lat, city.lon, data);

            // Update menu button with first city
            if (city === this.cities[0] || Object.keys(this.cityData).length === 1) {
                this._updateMenuBtn(weather);
            }
        } catch (err) {
            console.error('Weather fetch error:', err);
        }
    }

    async _fetchWeather(lat, lon) {
        const params = new URLSearchParams({
            latitude: lat,
            longitude: lon,
            current: [
                'temperature_2m', 'relative_humidity_2m', 'apparent_temperature',
                'is_day', 'precipitation', 'rain', 'showers', 'snowfall',
                'weather_code', 'cloud_cover', 'pressure_msl', 'surface_pressure',
                'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m',
            ].join(','),
            hourly: [
                'temperature_2m', 'relative_humidity_2m', 'dew_point_2m',
                'apparent_temperature', 'precipitation_probability', 'precipitation',
                'weather_code', 'cloud_cover', 'visibility', 'wind_speed_10m',
                'wind_direction_10m', 'uv_index',
            ].join(','),
            daily: [
                'weather_code', 'temperature_2m_max', 'temperature_2m_min',
                'apparent_temperature_max', 'apparent_temperature_min',
                'sunrise', 'sunset', 'uv_index_max',
                'precipitation_sum', 'precipitation_hours', 'precipitation_probability_max',
                'wind_speed_10m_max', 'wind_gusts_10m_max', 'wind_direction_10m_dominant',
            ].join(','),
            timezone: 'auto',
            forecast_days: 7,
            wind_speed_unit: 'kmh',
        });
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
        if (!res.ok) throw new Error('Weather API failed');
        return res.json();
    }

    async _fetchAQI(lat, lon) {
        const params = new URLSearchParams({
            latitude: lat,
            longitude: lon,
            hourly: 'european_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust',
            timezone: 'auto',
        });
        try {
            const res = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${params}`);
            if (!res.ok) return null;
            return res.json();
        } catch { return null; }
    }

    /* ── City search ─────────────────────────────── */
    async _onSearchInput(q) {
        const container = this._q('#weatherSearchResults');
        if (!container) return;
        if (!q.trim()) { container.innerHTML = ''; return; }
        container.innerHTML = '<div class="weather-loading-text" style="padding:0.75rem;font-size:0.85rem;color:var(--w-text-muted)"><i class="fa-solid fa-spinner fa-spin"></i> Searching...</div>';
        try {
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`);
            const data = await res.json();
            container.innerHTML = '';
            (data.results || []).forEach(r => {
                const el = document.createElement('div');
                el.className = 'weather-search-result-item';
                const region = [r.admin1, r.country].filter(Boolean).join(', ');
                el.innerHTML = `<i class="fa-solid fa-location-dot"></i><div><div class="city-name">${r.name}</div><div class="city-region">${region}</div></div>`;
                el.addEventListener('click', () => {
                    this.addCity({ name: r.name, lat: r.latitude, lon: r.longitude, country: r.country_code || '' });
                    this.closeSearch();
                });
                container.appendChild(el);
            });
            if (!data.results?.length) {
                container.innerHTML = '<div style="padding:0.75rem;font-size:0.85rem;color:var(--w-text-muted)">No results found</div>';
            }
        } catch {
            container.innerHTML = '<div style="padding:0.75rem;font-size:0.85rem;color:#f87171">Search failed</div>';
        }
    }

    toggleSearch() {
        this.searchOpen = !this.searchOpen;
        const panel = this._q('#weatherSearchPanel');
        if (panel) panel.classList.toggle('open', this.searchOpen);
        if (this.searchOpen) {
            this._renderSavedCitiesList();
            setTimeout(() => this._q('#weatherSearchInput')?.focus(), 300);
        }
    }
    closeSearch() {
        this.searchOpen = false;
        this._q('#weatherSearchPanel')?.classList.remove('open');
    }
    _renderSavedCitiesList() {
        const c = this._q('#weatherSavedCitiesList');
        if (!c) return;
        c.innerHTML = this.cities.map((city, i) => `
            <div class="weather-saved-city-row">
                <i class="fa-solid fa-location-dot" style="color:var(--w-text-muted);font-size:0.85rem;"></i>
                <span>${city.name}${city.country ? `, ${city.country}` : ''}</span>
                ${this.cities.length > 1 ? `<button class="remove-city-btn" data-idx="${i}"><i class="fa-solid fa-xmark"></i></button>` : ''}
            </div>
        `).join('');
        c.querySelectorAll('.remove-city-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeCity(parseInt(btn.dataset.idx));
                this._renderSavedCitiesList();
            });
        });
    }

    /* ── Swipe city switching ────────────────────── */
    _swipeStart(e) {
        this.swipeStartX = e.touches[0].clientX;
        this.dragging    = true;
    }
    _swipeEnd(e) {
        if (!this.dragging) return;
        const dx = e.changedTouches[0].clientX - this.swipeStartX;
        this.dragging = false;
        if (Math.abs(dx) < 60) return;
        if (dx < 0 && this.cityIdx < this.cities.length - 1) this.cityIdx++;
        else if (dx > 0 && this.cityIdx > 0)                 this.cityIdx--;
        else return;
        this._renderCityChips();
        this._renderCurrentCity();
    }

    /* ── Tab switching ───────────────────────────── */
    switchTab(tab) {
        this.activeTab = tab;
        this._qq('.weather-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        this._qq('.weather-tab-panel').forEach(p => p.classList.toggle('active', p.dataset.tab === tab));
    }
    switchDesktopTab(tab) {
        this._qq('.weather-right-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        this._qq('[data-desktop-panel]').forEach(p => p.classList.toggle('active', p.dataset.desktopPanel === tab));
    }

    /* ── Refresh ─────────────────────────────────── */
    async refresh() {
        const btn = this._q('#weatherRefreshBtn');
        if (btn) { btn.classList.add('loading'); }
        // Clear cache for current city
        const city = this.cities[this.cityIdx];
        if (city) {
            localStorage.removeItem(this._cacheKey(city.lat, city.lon));
            this._showLoading(true);
            await this._loadCityData(city);
            this._showLoading(false);
            this._renderCurrentCity();
        }
        if (btn) { btn.classList.remove('loading'); }
    }

    /* ── Loading overlay ─────────────────────────── */
    _showLoading(show) {
        this.loading = show;
        const el = this._q('#weatherLoadingOverlay');
        if (el) el.style.display = show ? 'flex' : 'none';
    }

    /* ── RENDER ──────────────────────────────────── */
    _renderCityChips() {
        const c = this._q('#weatherCityChips');
        if (!c) return;
        c.innerHTML = this.cities.map((city, i) => `
            <button class="weather-city-chip${i === this.cityIdx ? ' active' : ''}" data-city-idx="${i}">
                ${city.name}
            </button>
        `).join('');
        c.querySelectorAll('.weather-city-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                this.cityIdx = parseInt(btn.dataset.cityIdx);
                this._renderCityChips();
                this._renderCurrentCity();
            });
        });
        // Slide city pages
        const pages = this._q('#weatherCityPages');
        if (pages) pages.style.transform = `translateX(-${this.cityIdx * 100}%)`;
    }

    _renderCurrentCity() {
        const city = this.cities[this.cityIdx];
        if (!city) return;
        const key  = this._cityKey(city);
        const data = this.cityData[key];
        if (!data) {
            this._loadCityData(city).then(() => this._renderCurrentCity());
            return;
        }
        const pageEl = this._q(`#weatherPage_${this.cityIdx}`);
        if (pageEl) this._renderPage(pageEl, city, data);
    }

    _renderAllPages() {
        this.cities.forEach((city, i) => {
            const key  = this._cityKey(city);
            const data = this.cityData[key];
            const page = this._q(`#weatherPage_${i}`);
            if (page && data) this._renderPage(page, city, data);
        });
    }

    /* ── Full page render ────────────────────────── */
    _renderPage(el, city, { weather, aqi }) {
        if (!weather?.current) { el.innerHTML = this._errorHTML(); return; }
        const cur   = weather.current;
        const daily = weather.daily;
        const hourly= weather.hourly;
        const isDay = cur.is_day;
        const code  = cur.weather_code;

        // Update particles
        this.particleEng?.setCondition(code, isDay);

        // Build layout for this page
        el.innerHTML = `
            <div class="weather-left-panel">
                ${this._heroHTML(cur, daily, city, isDay)}
                ${this._statsGridHTML(cur, hourly)}
                ${this._sunArcHTML(daily)}
            </div>
            <div class="weather-right-panel">
                <div class="weather-right-tabs">
                    <button class="weather-right-tab-btn active" data-tab="today">Today</button>
                    <button class="weather-right-tab-btn" data-tab="hourly">24h Forecast</button>
                    <button class="weather-right-tab-btn" data-tab="daily">7 Days</button>
                    <button class="weather-right-tab-btn" data-tab="air">Air Quality</button>
                </div>
                <div data-desktop-panel="today" class="weather-tab-panel active">
                    ${this._hourlyStripHTML(hourly, isDay)}
                    ${this._dailyForecastHTML(daily)}
                </div>
                <div data-desktop-panel="hourly" class="weather-tab-panel">
                    ${this._hourlyTableHTML(hourly, isDay)}
                </div>
                <div data-desktop-panel="daily" class="weather-tab-panel">
                    ${this._sevenDayHTML(daily)}
                </div>
                <div data-desktop-panel="air" class="weather-tab-panel">
                    ${this._aqiHTML(aqi)}
                </div>
            </div>
            <!-- Mobile tab panels -->
            <div data-tab="today" class="weather-tab-panel active">
                ${this._hourlyStripHTML(hourly, isDay)}
                ${this._statsGridHTML(cur, hourly)}
                ${this._sunArcHTML(daily)}
                ${this._dailyForecastHTML(daily)}
            </div>
            <div data-tab="hourly" class="weather-tab-panel">
                ${this._hourlyTableHTML(hourly, isDay)}
            </div>
            <div data-tab="daily" class="weather-tab-panel">
                ${this._sevenDayHTML(daily)}
            </div>
            <div data-tab="air" class="weather-tab-panel">
                ${this._aqiHTML(aqi)}
            </div>
        `;

        // Bind events
        this._bindPageEvents(el);
        // Animate gauges/arcs after paint
        requestAnimationFrame(() => {
            this._animateSunArc(el, daily);
            this._animateCloudCover(el, cur.cloud_cover);
            this._animateAQIGauge(el, aqi);
        });
    }

    /* ── Hero HTML ───────────────────────────────── */
    _heroHTML(cur, daily, city, isDay) {
        const code  = cur.weather_code;
        const icon  = wmoIcon(code, isDay);
        const desc  = wmoDesc(code);
        const temp  = Math.round(cur.temperature_2m);
        const hi    = daily ? Math.round(daily.temperature_2m_max[0]) : '—';
        const lo    = daily ? Math.round(daily.temperature_2m_min[0]) : '—';
        const ts    = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });

        return `
        <div class="weather-hero w-anim-up">
            <div class="weather-hero-location">
                <i class="fa-solid fa-location-dot" style="margin-right:0.3rem;font-size:0.75rem;"></i>
                ${city.name}${city.country ? ', ' + city.country : ''}
            </div>
            <span class="weather-hero-icon">${icon}</span>
            <div class="weather-hero-temp-row">
                <span class="weather-hero-temp">${temp}</span>
                <span class="weather-hero-unit">°C</span>
            </div>
            <div class="weather-hero-condition">${desc}</div>
            <div class="weather-hero-range">
                <span class="hi">▲ ${hi}°</span>
                <span style="opacity:0.4">|</span>
                <span class="lo">▼ ${lo}°</span>
            </div>
            <div class="weather-hero-updated">Updated ${ts}</div>
        </div>`;
    }

    /* ── Stats Grid ──────────────────────────────── */
    _statsGridHTML(cur, hourly) {
        const now = new Date().getHours();
        const idx = hourly?.time?.findIndex(t => new Date(t).getHours() === now) ?? 0;
        const uv  = hourly?.uv_index?.[idx] ?? 0;
        const vis = hourly?.visibility?.[idx] ?? cur.visibility;
        const dp  = hourly?.dew_point_2m?.[idx];
        const cc  = cur.cloud_cover ?? 0;
        const comfort = dp != null ? dewComfort(dp) : null;

        const visMax  = 10000;
        const visPct  = Math.min(100, ((vis ?? 0) / visMax) * 100);

        const stats = [
            {
                label: 'Feels Like',
                icon: 'fa-solid fa-temperature-half',
                value: `${Math.round(cur.apparent_temperature)}°C`,
                dataIcon: '🌡️',
            },
            {
                label: 'Humidity',
                icon: 'fa-solid fa-droplet',
                value: `${cur.relative_humidity_2m}%`,
                dataIcon: '💧',
                extra: `<div class="precip-bar"><div class="precip-fill" style="width:${cur.relative_humidity_2m}%"></div></div>`,
            },
            {
                label: 'Wind',
                icon: 'fa-solid fa-wind',
                value: `${Math.round(cur.wind_speed_10m)} <span style="font-size:0.8rem;font-weight:400">km/h</span>`,
                dataIcon: '💨',
                sub: `${windDir(cur.wind_direction_10m)} · Gusts ${Math.round(cur.wind_gusts_10m ?? 0)} km/h`,
            },
            {
                label: 'UV Index',
                icon: 'fa-solid fa-sun',
                value: `<span class="${uvClass(uv)}">${uv.toFixed(1)}</span>`,
                dataIcon: '☀️',
                sub: uvLabel(uv),
            },
            {
                label: 'Pressure',
                icon: 'fa-solid fa-gauge',
                value: `${Math.round(cur.pressure_msl ?? cur.surface_pressure)} <span style="font-size:0.75rem;font-weight:400">hPa</span>`,
                dataIcon: '⏱️',
            },
            {
                label: 'Visibility',
                icon: 'fa-solid fa-eye',
                value: fmtVis(vis),
                dataIcon: '👁️',
                extra: `<div class="visibility-meter"><div class="visibility-fill" style="width:${visPct}%"></div></div>`,
            },
            {
                label: 'Dew Point',
                icon: 'fa-solid fa-cloud-rain',
                value: dp != null ? `${Math.round(dp)}°C` : '—',
                dataIcon: '🌊',
                extra: comfort ? `<div class="dew-point-comfort ${comfort.cls}">${comfort.label}</div>` : '',
            },
            {
                label: 'Cloud Cover',
                icon: 'fa-solid fa-cloud',
                value: `${cc}%`,
                dataIcon: '☁️',
                extra: `<svg class="cloud-cover-ring" viewBox="0 0 50 50"><circle class="cloud-ring-track" cx="25" cy="25" r="21"/><circle class="cloud-ring-fill" cx="25" cy="25" r="21" style="stroke-dashoffset:${133 - (133 * cc / 100)}"/></svg>`,
            },
            {
                label: 'Precipitation',
                icon: 'fa-solid fa-cloud-showers-heavy',
                value: `${(cur.precipitation ?? 0).toFixed(1)} <span style="font-size:0.75rem;font-weight:400">mm</span>`,
                dataIcon: '🌧️',
                sub: `Rain ${(cur.rain ?? 0).toFixed(1)} · Snow ${(cur.snowfall ?? 0).toFixed(1)} cm`,
            },
            {
                label: 'Wind Direction',
                icon: 'fa-solid fa-compass',
                value: windDir(cur.wind_direction_10m),
                dataIcon: '🧭',
                extra: this._compassHTML(cur.wind_direction_10m),
            },
        ];

        return `
        <div class="weather-stats-grid w-anim-up-1">
            ${stats.map(s => `
                <div class="weather-stat-card" data-icon="${s.dataIcon}">
                    <div class="stat-icon-row">
                        <i class="${s.icon}"></i>
                        <span class="stat-label">${s.label}</span>
                    </div>
                    <div class="stat-value">${s.value}</div>
                    ${s.sub  ? `<div class="stat-sub">${s.sub}</div>`   : ''}
                    ${s.extra ? s.extra : ''}
                </div>
            `).join('')}
        </div>`;
    }

    _compassHTML(deg) {
        if (deg == null) return '';
        return `
        <svg width="40" height="40" viewBox="0 0 40 40" style="margin-top:0.25rem">
            <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2"/>
            <text x="20" y="6"  text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="5" font-weight="700">N</text>
            <text x="20" y="37" text-anchor="middle" fill="rgba(255,255,255,0.3)" font-size="5">S</text>
            <text x="37" y="22" text-anchor="middle" fill="rgba(255,255,255,0.3)" font-size="5">E</text>
            <text x="3"  y="22" text-anchor="middle" fill="rgba(255,255,255,0.3)" font-size="5">W</text>
            <g transform="rotate(${deg} 20 20)">
                <polygon points="20,4 23,22 20,19 17,22" fill="rgba(255,100,100,0.9)"/>
                <polygon points="20,36 23,22 20,19 17,22" fill="rgba(255,255,255,0.6)"/>
            </g>
        </svg>`;
    }

    /* ── Hourly strip ────────────────────────────── */
    _hourlyStripHTML(hourly, isDay) {
        if (!hourly?.time) return '';
        const now = new Date();
        const curH = now.getHours();
        const items = [];
        let sparkPts = [];
        const temps  = [];

        for (let i = 0; i < Math.min(hourly.time.length, 24); i++) {
            const t    = new Date(hourly.time[i]);
            const tH   = t.getHours();
            const isCur= tH === curH && t.toDateString() === now.toDateString();
            const temp = Math.round(hourly.temperature_2m[i]);
            const code = hourly.weather_code[i];
            const icon = wmoIcon(code, tH >= 6 && tH < 20 ? 1 : 0);
            const pp   = hourly.precipitation_probability?.[i];
            temps.push(temp);
            items.push({ hour: fmtHour(hourly.time[i]), temp, icon, pp, isCur });
        }

        // Sparkline data
        const minT = Math.min(...temps), maxT = Math.max(...temps);
        const rng  = (maxT - minT) || 1;
        const W = 24 * 68, H = 50;
        sparkPts = items.map((it, i) => ({
            x: i * 68 + 34,
            y: H - ((it.temp - minT) / rng) * (H - 8) - 4,
        }));
        const pathD  = sparkPts.map((p,i) => `${i?'L':'M'}${p.x},${p.y}`).join('');
        const areaD  = `M${sparkPts[0].x},${H} ${pathD} L${sparkPts[sparkPts.length-1].x},${H} Z`;

        return `
        <div class="weather-hourly-strip w-anim-up-2">
            <div class="weather-section-title"><i class="fa-solid fa-clock"></i> 24-Hour Forecast</div>
            <div style="overflow-x:auto;scrollbar-width:none;margin:0 -0.25rem;padding:0 0.25rem">
                <svg width="${W}" height="${H+4}" viewBox="0 0 ${W} ${H+4}" style="display:block;overflow:visible">
                    <defs>
                        <linearGradient id="sparkGradient" x1="0" x2="1" y1="0" y2="0">
                            <stop offset="0%" stop-color="rgba(147,197,253,0.9)"/>
                            <stop offset="50%" stop-color="rgba(250,204,21,0.9)"/>
                            <stop offset="100%" stop-color="rgba(251,146,60,0.9)"/>
                        </linearGradient>
                        <linearGradient id="sparkAreaGrad" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stop-color="rgba(147,197,253,0.3)"/>
                            <stop offset="100%" stop-color="rgba(147,197,253,0)"/>
                        </linearGradient>
                    </defs>
                    <path d="${areaD}" fill="url(#sparkAreaGrad)"/>
                    <path d="${pathD}" fill="none" stroke="url(#sparkGradient)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                    ${sparkPts.map((p,i) => `
                        <circle cx="${p.x}" cy="${p.y}" r="${items[i].isCur ? 4 : 2.5}" fill="${items[i].isCur ? 'white' : 'rgba(255,255,255,0.6)'}"/>
                        <text x="${p.x}" y="${p.y-6}" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.75)" font-weight="600">${items[i].temp}°</text>
                    `).join('')}
                </svg>
            </div>
            <div class="weather-hourly-strip-inner">
                ${items.map(it => `
                    <div class="weather-hourly-item${it.isCur ? ' now' : ''}">
                        <div class="h-time">${it.isCur ? 'Now' : it.hour}</div>
                        <div class="h-icon">${it.icon}</div>
                        <div class="h-temp">${it.temp}°</div>
                        <div class="h-precip">${it.pp ? it.pp + '%' : ''}</div>
                    </div>
                `).join('')}
            </div>
        </div>`;
    }

    /* ── Sun Arc ─────────────────────────────────── */
    _sunArcHTML(daily) {
        if (!daily?.sunrise?.[0]) return '';
        const sunrise = daily.sunrise[0];
        const sunset  = daily.sunset[0];
        return `
        <div class="weather-sun-arc-section w-anim-up-3">
            <div class="weather-sun-arc-card">
                <div class="sun-arc-title"><i class="fa-solid fa-sun" style="color:#fbbf24;margin-right:0.3rem;"></i> Sun</div>
                <svg class="sun-arc-svg" viewBox="0 0 300 100" id="sunArcSvg_${this.cityIdx}">
                    <defs>
                        <linearGradient id="sunGradient" x1="0" x2="1">
                            <stop offset="0%" stop-color="#fbbf24"/>
                            <stop offset="100%" stop-color="#fb923c"/>
                        </linearGradient>
                    </defs>
                    <path d="M20,90 Q150,-10 280,90" class="sun-arc-track" fill="none"/>
                    <path d="M20,90 Q150,-10 280,90" class="sun-arc-fill" fill="none" stroke-dasharray="330" stroke-dashoffset="330" id="sunArcFill_${this.cityIdx}"/>
                    <circle id="sunDot_${this.cityIdx}" cx="20" cy="90" r="8" fill="#fbbf24" filter="url(#sunGlow)">
                        <animate attributeName="r" values="7;9;7" dur="2s" repeatCount="indefinite"/>
                    </circle>
                    <defs>
                        <filter id="sunGlow">
                            <feGaussianBlur stdDeviation="3" result="blur"/>
                            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                    </defs>
                </svg>
                <div class="sun-arc-times">
                    <span class="rise"><i class="fa-solid fa-arrow-up"></i>${fmtTime(sunrise)}</span>
                    <span style="color:var(--w-text-dim);font-size:0.78rem">${this._dayLength(sunrise,sunset)}</span>
                    <span class="set"><i class="fa-solid fa-arrow-down"></i>${fmtTime(sunset)}</span>
                </div>
            </div>
        </div>`;
    }
    _dayLength(rise, set) {
        const m = (new Date(set) - new Date(rise)) / 60000;
        return `${Math.floor(m/60)}h ${Math.round(m%60)}m`;
    }
    _animateSunArc(el, daily) {
        if (!daily?.sunrise?.[0]) return;
        const rise = new Date(daily.sunrise[0]).getTime();
        const set  = new Date(daily.sunset[0]).getTime();
        const now  = Date.now();
        let pct    = (now - rise) / (set - rise);
        pct        = Math.max(0, Math.min(1, pct));

        const fill = el.querySelector(`#sunArcFill_${this.cityIdx}`);
        const dot  = el.querySelector(`#sunDot_${this.cityIdx}`);
        if (fill) fill.style.strokeDashoffset = 330 * (1 - pct);
        if (dot) {
            const t   = pct;
            const x   = 20 + (280 - 20) * t;
            // Quadratic bezier: P = (1-t)^2*P0 + 2t(1-t)*P1 + t^2*P2
            // P0=(20,90), P1=(150,-10), P2=(280,90)
            const y   = Math.pow(1-t,2)*90 + 2*t*(1-t)*(-10) + Math.pow(t,2)*90;
            dot.setAttribute('cx', x.toFixed(1));
            dot.setAttribute('cy', y.toFixed(1));
        }
    }
    _animateCloudCover(el, cc) {
        const ring = el.querySelector('.cloud-ring-fill');
        if (ring) ring.style.strokeDashoffset = 133 - (133 * (cc ?? 0) / 100);
    }

    /* ── Daily forecast ──────────────────────────── */
    _dailyForecastHTML(daily) {
        if (!daily) return '';
        const today = new Date().toDateString();
        const allHi  = daily.temperature_2m_max;
        const allLo  = daily.temperature_2m_min;
        const minAll = Math.min(...allLo);
        const maxAll = Math.max(...allHi);
        const rng    = (maxAll - minAll) || 1;

        return `
        <div class="weather-daily-section w-anim-up-4">
            <div class="weather-section-title"><i class="fa-solid fa-calendar-week"></i> 7-Day Forecast</div>
            <div class="weather-daily-list">
                ${daily.time.map((t, i) => {
                    const hi   = Math.round(allHi[i]);
                    const lo   = Math.round(allLo[i]);
                    const barLeft  = ((lo - minAll) / rng * 60).toFixed(1);
                    const barWidth = (((hi - lo) / rng) * 60).toFixed(1);
                    const pp   = daily.precipitation_probability_max?.[i];
                    const isTo = new Date(t + 'T12:00').toDateString() === today;
                    return `
                    <div class="weather-daily-row${isTo ? ' today' : ''}" data-day-idx="${i}">
                        <div>
                            <div class="day-name">${fmtDayName(t)}</div>
                            <div class="day-date">${fmtShortDate(t)}</div>
                        </div>
                        <div class="day-icon">${wmoIcon(daily.weather_code[i], 1)}</div>
                        <div class="day-precip">${pp ? pp + '%' : ''}</div>
                        <div class="day-range">
                            <span class="lo">${lo}°</span>
                            <div class="day-range-bar-wrap">
                                <div class="day-range-bar" style="left:${barLeft}px;width:${barWidth}px"></div>
                            </div>
                            <span class="hi">${hi}°</span>
                        </div>
                    </div>
                    <div class="weather-daily-detail" style="display:none;grid-column:1/-1;grid-template-columns:repeat(3,1fr);gap:0.5rem;padding:0.75rem 1rem;background:rgba(0,0,0,0.1);border-bottom:1px solid var(--w-divider)">
                        <div class="detail-chip"><span>UV Max</span><strong>${daily.uv_index_max?.[i]?.toFixed(1) ?? '—'}</strong></div>
                        <div class="detail-chip"><span>Wind Max</span><strong>${Math.round(daily.wind_speed_10m_max?.[i] ?? 0)} km/h</strong></div>
                        <div class="detail-chip"><span>Precip</span><strong>${(daily.precipitation_sum?.[i] ?? 0).toFixed(1)} mm</strong></div>
                        <div class="detail-chip"><span>Feels ↑</span><strong>${Math.round(daily.apparent_temperature_max?.[i] ?? hi)}°</strong></div>
                        <div class="detail-chip"><span>Feels ↓</span><strong>${Math.round(daily.apparent_temperature_min?.[i] ?? lo)}°</strong></div>
                        <div class="detail-chip"><span>Gusts</span><strong>${Math.round(daily.wind_gusts_10m_max?.[i] ?? 0)} km/h</strong></div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    }

    /* ── Hourly Table (24h tab) ──────────────────── */
    _hourlyTableHTML(hourly, isDay) {
        if (!hourly?.time) return '';
        const now = new Date();
        const curH = now.getHours();
        return `
        <div class="weather-hourly-table-section">
            <div class="weather-section-title"><i class="fa-solid fa-list"></i> Hourly Detail</div>
            <div style="overflow-x:auto">
            <table class="weather-hourly-table">
                <thead>
                    <tr>
                        <th>Time</th><th>Icon</th><th>Temp</th><th>Feels</th>
                        <th>Rain%</th><th>Wind</th><th>Vis</th><th>UV</th><th>Cloud</th>
                    </tr>
                </thead>
                <tbody>
                    ${hourly.time.slice(0, 24).map((t, i) => {
                        const h    = new Date(t);
                        const isCur= h.getHours() === curH && h.toDateString() === now.toDateString();
                        const code = hourly.weather_code[i];
                        const tH   = h.getHours();
                        return `
                        <tr class="${isCur ? 'now-row' : ''}">
                            <td>${isCur ? '<strong>Now</strong>' : fmtHour(t)}</td>
                            <td class="w-hourly-icon">${wmoIcon(code, tH>=6&&tH<20?1:0)}</td>
                            <td>${Math.round(hourly.temperature_2m[i])}°</td>
                            <td>${Math.round(hourly.apparent_temperature?.[i] ?? hourly.temperature_2m[i])}°</td>
                            <td>${hourly.precipitation_probability?.[i] ?? 0}%</td>
                            <td>${Math.round(hourly.wind_speed_10m?.[i] ?? 0)} <small>km/h</small></td>
                            <td style="font-size:0.78rem">${fmtVis(hourly.visibility?.[i])}</td>
                            <td><span class="${uvClass(hourly.uv_index?.[i]??0)}">${(hourly.uv_index?.[i]??0).toFixed(1)}</span></td>
                            <td>${hourly.cloud_cover?.[i] ?? 0}%</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
            </div>
        </div>`;
    }

    /* ── 7-Day tab ───────────────────────────────── */
    _sevenDayHTML(daily) {
        if (!daily) return '';
        const today = new Date().toDateString();
        return `
        <div class="weather-7day-section">
            <div class="weather-section-title"><i class="fa-solid fa-calendar"></i> Extended Forecast</div>
            ${daily.time.map((t, i) => {
                const isTo = new Date(t+'T12:00').toDateString() === today;
                return `
                <div class="weather-7day-card${isTo ? ' is-today' : ''}">
                    <div class="weather-7day-card-header" data-day7-toggle="${i}">
                        <div>
                            <div class="day-name">${fmtDayName(t)}</div>
                            <div class="day-date" style="font-size:0.75rem;color:var(--w-text-muted)">${fmtShortDate(t)}</div>
                        </div>
                        <div style="font-size:1.5rem">${wmoIcon(daily.weather_code[i], 1)}</div>
                        <div style="color:var(--w-text-muted);font-size:0.8rem">${wmoDesc(daily.weather_code[i])}</div>
                        <div class="day-range">
                            <span class="lo">${Math.round(daily.temperature_2m_min[i])}°</span>
                            <span style="opacity:0.4">/</span>
                            <span class="hi">${Math.round(daily.temperature_2m_max[i])}°</span>
                        </div>
                    </div>
                    <div class="weather-7day-card-body">
                        <div class="detail-chip"><span>UV Max</span><strong>${daily.uv_index_max?.[i]?.toFixed(1) ?? '—'}</strong></div>
                        <div class="detail-chip"><span>Precip</span><strong>${(daily.precipitation_sum?.[i]??0).toFixed(1)} mm</strong></div>
                        <div class="detail-chip"><span>Rain %</span><strong>${daily.precipitation_probability_max?.[i] ?? 0}%</strong></div>
                        <div class="detail-chip"><span>Wind</span><strong>${Math.round(daily.wind_speed_10m_max?.[i]??0)} km/h</strong></div>
                        <div class="detail-chip"><span>Gusts</span><strong>${Math.round(daily.wind_gusts_10m_max?.[i]??0)} km/h</strong></div>
                        <div class="detail-chip"><span>Direction</span><strong>${windDir(daily.wind_direction_10m_dominant?.[i])}</strong></div>
                        <div class="detail-chip"><span>Sunrise</span><strong>${fmtTime(daily.sunrise?.[i])}</strong></div>
                        <div class="detail-chip"><span>Sunset</span><strong>${fmtTime(daily.sunset?.[i])}</strong></div>
                        <div class="detail-chip"><span>Precip h</span><strong>${daily.precipitation_hours?.[i] ?? 0}h</strong></div>
                    </div>
                </div>`;
            }).join('')}
        </div>`;
    }

    /* ── AQI HTML ────────────────────────────────── */
    _aqiHTML(aqi) {
        if (!aqi?.hourly) return `
        <div class="weather-aqi-section">
            <div class="weather-aqi-card">
                <div class="weather-section-title"><i class="fa-solid fa-wind"></i> Air Quality</div>
                <div style="color:var(--w-text-muted);font-size:0.85rem;padding:0.5rem 0">Air quality data unavailable</div>
            </div>
        </div>`;

        const h = aqi.hourly;
        const now = new Date().getHours();
        const idx = h.time?.findIndex(t => new Date(t).getHours() === now) ?? 0;
        const aqiVal = h.european_aqi?.[idx] ?? 0;
        const lvl    = aqiLevel(aqiVal);
        const pct    = Math.min(100, (aqiVal / 100) * 100);

        const pollutants = [
            { name: 'PM2.5', val: h.pm2_5?.[idx], unit: 'μg/m³' },
            { name: 'PM10',  val: h.pm10?.[idx],  unit: 'μg/m³' },
            { name: 'O₃',    val: h.ozone?.[idx], unit: 'μg/m³' },
            { name: 'NO₂',   val: h.nitrogen_dioxide?.[idx], unit: 'μg/m³' },
            { name: 'SO₂',   val: h.sulphur_dioxide?.[idx],  unit: 'μg/m³' },
            { name: 'CO',    val: h.carbon_monoxide?.[idx] != null ? (h.carbon_monoxide[idx]/1000).toFixed(2) : null, unit: 'mg/m³' },
        ];

        return `
        <div class="weather-aqi-section">
            <div class="weather-section-title"><i class="fa-solid fa-leaf"></i> Air Quality</div>
            <div class="weather-aqi-card">
                <div class="aqi-header">
                    <div>
                        <div class="stat-label">European AQI</div>
                        <div class="aqi-big-number">${aqiVal}</div>
                    </div>
                    <div class="aqi-badge ${lvl.cls}">${lvl.icon} ${lvl.label}</div>
                </div>
                <div class="aqi-scale-bar" id="aqiScaleBar">
                    <div class="aqi-scale-cursor" style="left:${pct}%"></div>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:0.65rem;color:var(--w-text-dim);margin:0.3rem 0 0.75rem;padding:0 2px">
                    <span>Good</span><span>Fair</span><span>Moderate</span><span>Poor</span><span>Very Poor</span>
                </div>
                <div class="aqi-pollutants-grid">
                    ${pollutants.map(p => `
                        <div class="aqi-pollutant">
                            <div class="p-name">${p.name}</div>
                            <div class="p-value">${p.val != null ? Number(p.val).toFixed(1) : '—'}</div>
                            <div style="font-size:0.6rem;color:var(--w-text-dim)">${p.unit}</div>
                        </div>
                    `).join('')}
                </div>
                ${h.dust?.[idx] != null ? `
                    <div style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--w-divider);display:flex;gap:1rem;font-size:0.8rem">
                        <span style="color:var(--w-text-muted)"><i class="fa-solid fa-smog" style="margin-right:0.3rem"></i>Dust: <strong style="color:var(--w-text)">${h.dust[idx].toFixed(1)} μg/m³</strong></span>
                    </div>
                ` : ''}
            </div>
        </div>`;
    }
    _animateAQIGauge(el, aqi) {
        // AQI scale cursor is already positioned via inline style
    }

    _errorHTML() {
        return `<div class="weather-error-card">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <h3>Failed to load weather</h3>
            <p>Check your connection and try again.</p>
        </div>`;
    }

    /* ── Bind events inside rendered page ───────── */
    _bindPageEvents(el) {
        // Daily row accordion
        el.querySelectorAll('.weather-daily-row').forEach(row => {
            row.addEventListener('click', () => {
                const detail = row.nextElementSibling;
                if (!detail?.style) return;
                const open = detail.style.display !== 'grid';
                // Close all
                el.querySelectorAll('.weather-daily-detail').forEach(d => d.style.display = 'none');
                el.querySelectorAll('.weather-daily-row').forEach(r => r.classList.remove('open'));
                if (open) {
                    detail.style.display = 'grid';
                    row.classList.add('open');
                }
            });
        });
        // 7-day toggle
        el.querySelectorAll('[data-day7-toggle]').forEach(h => {
            h.addEventListener('click', () => {
                const card = h.closest('.weather-7day-card');
                card?.classList.toggle('expanded');
            });
        });
        // Desktop tabs
        el.querySelectorAll('.weather-right-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                el.querySelectorAll('.weather-right-tab-btn').forEach(b => b.classList.remove('active'));
                el.querySelectorAll('[data-desktop-panel]').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                el.querySelector(`[data-desktop-panel="${btn.dataset.tab}"]`)?.classList.add('active');
            });
        });
        // Mobile tabs
        el.querySelectorAll('.weather-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
    }

    /* ── Update menu button ──────────────────────── */
    _updateMenuBtn(weather) {
        if (!weather?.current) return;
        const cur  = weather.current;
        const info = { icon: wmoIcon(cur.weather_code, cur.is_day), temp: Math.round(cur.temperature_2m) };
        ['menuWeatherEmoji','sheetWeatherEmoji'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = info.icon;
        });
        ['menuWeatherTemp','sheetWeatherTemp'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = `${info.temp}°C`;
        });
    }

    /* ── Scaffold city page elements ─────────────── */
    _scaffoldCityPages() {
        const container = document.getElementById('weatherCityPages');
        if (!container) return;
        container.innerHTML = '';
        this.cities.forEach((_, i) => {
            const page = document.createElement('div');
            page.className   = 'weather-city-page';
            page.id          = `weatherPage_${i}`;
            page.innerHTML   = '<div class="w-skeleton" style="height:200px;margin:1rem"></div>';
            container.appendChild(page);
        });
        container.style.width = `${this.cities.length * 100}%`;
    }

    /* ── Clock & Title (moved here from old file) ── */
    _initClockAndTitle() {
        const updateClock = () => {
            const d    = window.getDevTimeOverride?.() || new Date();
            const pad  = n => n.toString().padStart(2, '0');
            const ts   = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
            const opts = { weekday:'long', month:'long', day:'numeric', year:'numeric' };
            const ds   = d.toLocaleDateString(undefined, opts);

            const t    = document.getElementById('time');
            const dt   = document.getElementById('date');
            if (t) t.textContent = ts;
            if (dt) dt.textContent = ds;

            const tt   = document.getElementById('titleTime');
            const tdt  = document.getElementById('titleDate');
            if (tt) tt.textContent = ts;
            if (tdt) tdt.textContent = d.toLocaleDateString('ro-RO', { weekday:'short', day:'numeric', month:'short' });

            const mht  = document.getElementById('mobileHeaderTime');
            const mhd  = document.getElementById('mobileHeaderDate');
            if (mht) mht.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
            if (mhd) mhd.textContent = d.toLocaleDateString('ro-RO', { weekday:'short', day:'numeric', month:'short' });
        };
        updateClock();
        setInterval(updateClock, 1000);

        // Clock overlay
        const clockBtn    = document.getElementById('clockBtn');
        const closeOv     = document.getElementById('closeOverlay');
        if (clockBtn) clockBtn.addEventListener('click', () => {
            window.overlayManager?.close('sideMenu');
            window.overlayManager?.open('timeOverlay');
        });
        if (closeOv) closeOv.addEventListener('click', () => window.overlayManager?.close('timeOverlay'));
        document.getElementById('titleTime')?.addEventListener('click', () => document.getElementById('clockBtn')?.click());

        if (window.overlayManager) {
            window.overlayManager.register('timeOverlay');
        }
    }
}

/* ── Bootstrap ─────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    const app = new WeatherApp();
    window.weatherApp = app;

    // Scaffold pages after cities are known
    app._scaffoldCityPages();
    app._renderCityChips();
});
