
/* ========================================
   WEATHER & TIME: Clock, Forecasts
   ======================================== */

// --- CLOCK OVERLAY ---
const clockBtn = document.getElementById("clockBtn");
const timeOverlay = document.getElementById("timeOverlay");
const closeOverlay = document.getElementById("closeOverlay");
const timeEl = document.getElementById("time");
const dateEl = document.getElementById("date");

function updateClock() {
    const devOverride = window.getDevTimeOverride?.();
    const now = devOverride || new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    const options = { weekday: "long", month: "long", day: "numeric", year: "numeric" };
    const dateStr = now.toLocaleDateString(undefined, options);
    if (timeEl) timeEl.textContent = `${hours}:${minutes}:${seconds}`;
    if (dateEl) dateEl.textContent = dateStr;
}

if (window.overlayManager) {
    window.overlayManager.register("timeOverlay");
}

if (clockBtn) {
    clockBtn.addEventListener("click", () => {
        if (window.overlayManager) {
            window.overlayManager.close("sideMenu");
            window.overlayManager.open("timeOverlay");
        }
        updateClock();
    });
}

if (closeOverlay) {
    closeOverlay.addEventListener("click", () => {
        if (window.overlayManager) {
            window.overlayManager.close("timeOverlay");
        }
    });
}

setInterval(updateClock, 1000);

// --- TITLE TIME DISPLAY ---
function updateTitleTime() {
    const devOverride = window.getDevTimeOverride?.();
    const now = devOverride || new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    const timeEl = document.getElementById("titleTime");
    const dateEl = document.getElementById("titleDate");
    
    if (timeEl) {
        timeEl.textContent = `${hours}:${minutes}:${seconds}`;
    }
    
    if (dateEl) {
        const options = { weekday: 'short', day: 'numeric', month: 'short' };
        dateEl.textContent = now.toLocaleDateString('ro-RO', options);
    }
}

// Update every second
setInterval(updateTitleTime, 1000);
updateTitleTime();

document.getElementById("titleTime")?.addEventListener("click", function () {
    const clockBtn = document.getElementById("clockBtn");
    if (clockBtn) clockBtn.click();
});

/* ========================================
   WEATHER SERVICE
   ======================================== */

// WMO Weather Codes Mapping
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
    96: { desc: "Thunderstorm with slight hail", icon: "⛈️" },
    99: { desc: "Thunderstorm with heavy hail", icon: "⛈️" }
};

class WeatherService {
    constructor() {
        if (WeatherService.instance) {
            return WeatherService.instance;
        }
        WeatherService.instance = this;

        this.cacheKey = "weather_cache_v3"; // Bumped version
        this.cacheDuration = 10 * 60 * 1000; // 10 minutes
        
        this.defaultLocation = { lat: 44.4268, lon: 26.1025 }; // Bucharest
        this.weatherData = null;
        this.locationName = "Bucharest (Default)";
        this.lastUpdated = null;
        this.particleEngine = null;

        this.init();
    }

    async init() {
        this.setupOverlay();
        this.loadWeather();
        
        // Auto refresh
        setInterval(() => this.loadWeather(), this.cacheDuration + 1000);
    }

    setupOverlay() {
        // Register Overlay
        if (window.overlayManager) {
            window.overlayManager.register("weatherOverlay", {
                onOpen: () => {
                    if (this.particleEngine) {
                        this.particleEngine.resize();
                        this.particleEngine.start();
                    }
                },
                onClose: () => {
                    if (this.particleEngine) this.particleEngine.stop();
                }
            });
        }

        // Initialize Particle Engine
        if (typeof WeatherParticleEngine !== 'undefined') {
            this.particleEngine = new WeatherParticleEngine('weatherCanvas');
        }

        // Bind Buttons
        const triggers = ['weatherBtn', 'sheetWeatherBtn'];
        triggers.forEach(id => {
            document.getElementById(id)?.addEventListener('click', () => {
                if(window.overlayManager) {
                    window.overlayManager.close('sideMenu');
                    window.overlayManager.open('weatherOverlay');
                }
                this.renderOverlay();
            });
        });

        document.getElementById('closeWeatherOverlay')?.addEventListener('click', () => {
            if(window.overlayManager) window.overlayManager.close('weatherOverlay');
        });

        document.getElementById('refreshWeatherBtn')?.addEventListener('click', () => {
            this.refresh();
        });
    }

    async loadWeather() {
        // Dev Override Check
        const devOverride = localStorage.getItem("dev-weather-override");
        if (devOverride) {
            this.applyDevOverride(parseInt(devOverride));
            return;
        }

        if (this.loadFromCache()) {
            this.updateUI();
            return;
        }
        await this.refresh();
    }

    async refresh() {
        try {
            const btn = document.getElementById('refreshWeatherBtn');
            if(btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';

            const position = await this.getGeolocation();
            const { latitude, longitude } = position.coords;
            await this.fetchData(latitude, longitude);
            
            // Reverse Geocode (Simple mock or API if available, defaulting to generic)
            this.locationName = "Current Location"; // Or fetch from OpenStreetMap API
            
            this.updateUI();
            
            if(btn) btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Refresh';
        } catch (error) {
            console.warn("Weather error:", error);
            if (!this.weatherData) {
                await this.fetchData(this.defaultLocation.lat, this.defaultLocation.lon);
                this.locationName = "Bucharest";
                this.updateUI();
            }
            if(document.getElementById('refreshWeatherBtn')) {
                document.getElementById('refreshWeatherBtn').innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Error';
            }
        }
    }

    getGeolocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) return reject("Not supported");
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
    }

    async fetchData(lat, lon) {
        const params = new URLSearchParams({
            latitude: lat,
            longitude: lon,
            current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m",
            hourly: "temperature_2m,precipitation_probability,weather_code",
            daily: "temperature_2m_max,temperature_2m_min",
            timezone: "auto"
        });

        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
        if (!response.ok) throw new Error("API failed");
        
        this.weatherData = await response.json();
        this.lastUpdated = Date.now();
        this.saveToCache();
    }

    saveToCache() {
        if (!this.weatherData) return;
        localStorage.setItem(this.cacheKey, JSON.stringify({
            timestamp: this.lastUpdated,
            data: this.weatherData,
            locationName: this.locationName
        }));
    }

    loadFromCache() {
        const cached = localStorage.getItem(this.cacheKey);
        if (!cached) return false;
        try {
            const { timestamp, data, locationName } = JSON.parse(cached);
            if (Date.now() - timestamp < this.cacheDuration) {
                this.weatherData = data;
                this.locationName = locationName;
                return true;
            }
        } catch (e) { return false; }
        return false;
    }

    getWeatherInfo(code, isDay = 1) {
        const info = WMO_CODES[code] || { desc: "Unknown", icon: "❓" };
        let icon = info.icon;
        if (isDay === 0 && [0,1,2].includes(code)) icon = code === 0 ? "🌙" : "☁️";
        return { ...info, icon };
    }

    applyDevOverride(code) {
        const info = this.getWeatherInfo(code);
        // Mock structure matching API
        this.weatherData = {
            current: {
                temperature_2m: 20,
                weather_code: code,
                is_day: 1,
                relative_humidity_2m: 50,
                apparent_temperature: 21,
                wind_speed_10m: 10,
                precipitation: 0
            },
            daily: { temperature_2m_max: [25], temperature_2m_min: [15] }
        };
        this.locationName = "Dev Override";
        this.updateUI();
    }

    updateUI() {
        if (!this.weatherData) return;
        const current = this.weatherData.current;
        const info = this.getWeatherInfo(current.weather_code, current.is_day);
        
        // 1. Update Menu Buttons
        const updateBtn = (emojiId, tempId) => {
            const el1 = document.getElementById(emojiId);
            const el2 = document.getElementById(tempId);
            if(el1) el1.textContent = info.icon;
            if(el2) el2.textContent = `${Math.round(current.temperature_2m)}°C`;
        };
        updateBtn("menuWeatherEmoji", "menuWeatherTemp");
        updateBtn("sheetWeatherEmoji", "sheetWeatherTemp");

        // 2. Render Overlay if open (or prepare it)
        this.renderOverlay();
        
        // 3. Update Particles
        if (this.particleEngine) {
            this.particleEngine.setCondition(current.weather_code, current.is_day);
        }
    }

    renderOverlay() {
        if (!this.weatherData) return;
        const current = this.weatherData.current;
        const daily = this.weatherData.daily;
        const info = this.getWeatherInfo(current.weather_code, current.is_day);

        // Text Elements
        const setText = (id, txt) => {
            const el = document.getElementById(id);
            if(el) el.textContent = txt;
        };

        setText('weatherLocationName', this.locationName);
        setText('weatherCoords', `${this.weatherData.latitude.toFixed(2)}, ${this.weatherData.longitude.toFixed(2)}`);
        setText('weatherCurrentTemp', Math.round(current.temperature_2m));
        setText('weatherCondition', info.desc);
        setText('weatherHigh', Math.round(daily.temperature_2m_max[0]));
        setText('weatherLow', Math.round(daily.temperature_2m_min[0]));
        
        setText('weatherWind', `${current.wind_speed_10m} km/h`);
        setText('weatherHumidity', `${current.relative_humidity_2m}%`);
        setText('weatherPrecip', `${current.precipitation} mm`);
        setText('weatherFeelsLike', `${Math.round(current.apparent_temperature)}°`);

        // Icon
        const iconEl = document.getElementById('weatherIconLarge');
        if(iconEl) {
            iconEl.textContent = info.icon;
            // Reset animation to sync
            iconEl.style.animation = 'none';
            iconEl.offsetHeight; 
            iconEl.style.animation = 'floatEmoji 6s ease-in-out infinite';
        }

        // Render Chart
        if (window.renderForecastChart && this.weatherData.hourly) {
            window.renderForecastChart(this.weatherData.hourly);
        }
    }
}

// Initialize Global Service
const weatherService = new WeatherService();
window.weatherService = weatherService;
