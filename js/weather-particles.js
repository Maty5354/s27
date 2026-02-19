/* ========================================
   WEATHER PARTICLE ENGINE (ADVANCED)
   ======================================== */

class WeatherParticleEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        
        // State
        this.particles = [];
        this.w = 0;
        this.h = 0;
        this.animationId = null;
        this.conditionCode = 0;
        this.isDay = 1;
        
        // Thunder
        this.isThunderstorm = false;
        this.lightningTimer = 0;
        this.flashOpacity = 0;

        // Resize & Init
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        if (!this.canvas) return;
        this.w = this.canvas.width = window.innerWidth;
        this.h = this.canvas.height = window.innerHeight;
        // Re-initialize particles to fill new dimensions if needed, 
        // or just let them flow. We'll refresh on significant changes.
    }

    setCondition(code, isDay = 1) {
        // Debounce if same condition
        if (this.conditionCode === code && this.isDay === isDay) return;

        this.conditionCode = code;
        this.isDay = isDay;
        
        // Determine if thunderstorm
        // WMO 95, 96, 99 are Thunderstorm
        this.isThunderstorm = [95, 96, 99].includes(code);
        
        this.updateGradient();
        this.initParticles();
    }

    updateGradient() {
        const canvas = this.canvas;
        const code = this.conditionCode;
        const isDay = this.isDay === 1;
        
        let bg = '';

        // --- Gradients based on Weather & Time ---
        if ([0, 1].includes(code)) { 
            // Clear / Mainly Clear
            if (isDay) bg = 'linear-gradient(180deg, #2980b9 0%, #6dd5fa 100%)'; // Blue Sky
            else bg = 'linear-gradient(180deg, #0f2027 0%, #203a43 50%, #2c5364 100%)'; // Deep Night
        } 
        else if ([2, 3].includes(code)) { 
            // Cloudy
            if (isDay) bg = 'linear-gradient(180deg, #4b6cb7 0%, #182848 100%)';
            else bg = 'linear-gradient(180deg, #232526 0%, #414345 100%)'; // Dark Grey
        } 
        else if ([45, 48].includes(code)) { 
            // Fog
            if (isDay) bg = 'linear-gradient(180deg, #3e5151 0%, #decba4 100%)'; // Sepia fog
            else bg = 'linear-gradient(180deg, #16222a 0%, #3a6073 100%)'; // Night fog
        } 
        else if (code >= 51 && code <= 67 || (code >= 80 && code <= 82)) { 
            // Rain / Drizzle
            if (isDay) bg = 'linear-gradient(180deg, #203a43 0%, #2c5364 100%)';
            else bg = 'linear-gradient(180deg, #000000 0%, #434343 100%)';
        } 
        else if ([71, 73, 75, 77, 85, 86].includes(code)) { 
            // Snow
            if (isDay) bg = 'linear-gradient(180deg, #83a4d4 0%, #b6fbff 100%)'; // Cold Blue
            else bg = 'linear-gradient(180deg, #000428 0%, #004e92 100%)'; // Deep Cold Night
        } 
        else if (this.isThunderstorm) {
            // Thunderstorm
            bg = 'linear-gradient(180deg, #0f0c29 0%, #302b63 50%, #24243e 100%)'; // Deep Purple/Dark
        } 
        else {
            // Default
            bg = 'linear-gradient(180deg, #1e3c72 0%, #2a5298 100%)';
        }

        canvas.style.background = bg;
    }

    initParticles() {
        this.particles = [];
        const code = this.conditionCode;
        const count = this.w < 600 ? 50 : 100; // Mobile optimization

        // --- STARS (Clear Night) ---
        if ([0, 1, 2].includes(code) && this.isDay === 0) {
            for (let i = 0; i < 80; i++) {
                this.particles.push({
                    type: 'star',
                    x: Math.random() * this.w,
                    y: Math.random() * this.h,
                    r: Math.random() * 1.5,
                    alpha: Math.random(),
                    twinkleSpeed: 0.01 + Math.random() * 0.03
                });
            }
        }

        // --- RAIN ---
        if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || this.isThunderstorm) {
            const rainCount = this.isThunderstorm || code >= 65 ? count * 3 : count * 1.5;
            for (let i = 0; i < rainCount; i++) {
                this.particles.push({
                    type: 'rain',
                    x: Math.random() * this.w,
                    y: Math.random() * this.h,
                    l: Math.random() * 20 + 10, // Length
                    xs: -1 + Math.random() * 2, // Slight drift
                    ys: Math.random() * 10 + 15 // Speed
                });
            }
        }

        // --- SNOW ---
        if ([71, 73, 75, 77, 85, 86].includes(code)) {
            const snowCount = code >= 75 ? count * 2 : count;
            for (let i = 0; i < snowCount; i++) {
                this.particles.push({
                    type: 'snow',
                    x: Math.random() * this.w,
                    y: Math.random() * this.h,
                    r: Math.random() * 3 + 1, // Radius
                    d: Math.random() * snowCount, // Density/Seed for sway
                    a: Math.random(), // Angle for sway
                    ys: Math.random() * 2 + 1 // Speed
                });
            }
        }

        // --- FOG ---
        if ([45, 48].includes(code)) {
            // Fog uses large, low opacity circles moving slowly
            for (let i = 0; i < 15; i++) {
                this.particles.push({
                    type: 'fog',
                    x: Math.random() * this.w,
                    y: Math.random() * this.h,
                    r: 100 + Math.random() * 200, // Large radius
                    xs: (Math.random() - 0.5) * 0.5 // Slow horizontal drift
                });
            }
        }

        // --- CLOUDS (Cloudy/Overcast) ---
        if ([2, 3].includes(code)) {
            const cloudCount = code === 3 ? 12 : 6;
            for (let i = 0; i < cloudCount; i++) {
                this.particles.push({
                    type: 'cloud',
                    x: Math.random() * this.w,
                    y: Math.random() * (this.h * 0.6), // Top 60% only
                    r: 60 + Math.random() * 80,
                    xs: 0.2 + Math.random() * 0.4
                });
            }
        }
    }

    start() {
        if (this.animationId) return;
        this.animate();
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.w, this.h);

        // --- THUNDER LOGIC ---
        if (this.isThunderstorm) {
            // Random lightning strike (approx every few seconds)
            if (Math.random() < 0.005 && this.flashOpacity <= 0) {
                this.flashOpacity = 0.8;
                // Optional: You could trigger a sound here if audio was enabled
            }
        }

        // Draw Flash
        if (this.flashOpacity > 0) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${this.flashOpacity})`;
            this.ctx.fillRect(0, 0, this.w, this.h);
            this.flashOpacity -= 0.05; // Fade out
            if (this.flashOpacity < 0) this.flashOpacity = 0;
        }

        // --- PARTICLES ---
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];

            if (p.type === 'rain') {
                this.ctx.strokeStyle = 'rgba(200, 220, 255, 0.6)';
                this.ctx.lineWidth = 1.5;
                this.ctx.beginPath();
                this.ctx.moveTo(p.x, p.y);
                this.ctx.lineTo(p.x + p.xs, p.y + p.l);
                this.ctx.stroke();
                
                p.x += p.xs;
                p.y += p.ys;
                if (p.y > this.h) {
                    p.y = -p.l;
                    p.x = Math.random() * this.w;
                }
            } 
            else if (p.type === 'snow') {
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                this.ctx.fill();
                
                p.a += 0.02; // Sway angle
                // Sway x + drift
                p.x += Math.sin(p.a) * 0.5; 
                p.y += p.ys;
                
                if (p.y > this.h) {
                    p.y = -10;
                    p.x = Math.random() * this.w;
                }
                if (p.x > this.w) p.x = 0;
                if (p.x < 0) p.x = this.w;
            }
            else if (p.type === 'star') {
                // Twinkle
                if (Math.random() < 0.05) {
                    p.alpha += (Math.random() - 0.5) * 0.2;
                    if (p.alpha < 0.2) p.alpha = 0.2;
                    if (p.alpha > 1) p.alpha = 1;
                }
                this.ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                this.ctx.fill();
            }
            else if (p.type === 'fog') {
                const grad = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
                grad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
                grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                this.ctx.fillStyle = grad;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                this.ctx.fill();
                
                p.x += p.xs;
                if (p.x - p.r > this.w) p.x = -p.r;
                if (p.x + p.r < 0) p.x = this.w + p.r;
            }
            else if (p.type === 'cloud') {
                const grad = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
                grad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
                grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                this.ctx.fillStyle = grad;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                this.ctx.fill();
                
                p.x += p.xs;
                if (p.x - p.r > this.w) p.x = -p.r;
            }
        }

        this.animationId = requestAnimationFrame(() => this.animate());
    }
}