/* ========================================
   WEATHER PARTICLE ENGINE v2
   Rain (interactive), Snow (accumulating),
   Fog, Thunderstorm, Stars, Clouds, Sun Rays
   ======================================== */

class WeatherParticleEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');

        this.particles   = [];
        this.snowPiles   = [];     // accumulation data per x column
        this.w = this.h  = 0;
        this.animId      = null;
        this.condCode    = -1;
        this.isDay       = 1;
        this.mouseX      = null;
        this.mouseY      = null;
        this.flashOpacity= 0;
        this.flashTimer  = 0;
        this.nextFlash   = this._randRange(3000, 8000);
        this.elapsed     = 0;
        this.lastTs      = 0;
        this.snowDepth   = 0;      // 0-1, grows with heavy snow
        this.snowDepthMax= 0;      // target max depth based on code
        this.fogBlur     = 0;
        this.fogTarget   = 0;

        // DOM refs for non-canvas effects
        this.fogLayer       = document.querySelector('.weather-fog-layer');
        this.fogVisionBlur  = document.querySelector('.fog-vision-blur');
        this.thunderFlash   = document.querySelector('.thunder-flash');
        this.lightningOverlay = document.querySelector('.lightning-bolt-overlay');

        this._resize();
        window.addEventListener('resize', () => this._resize());

        // Interactive mouse for rain direction
        const overlay = document.getElementById('weatherOverlay');
        if (overlay) {
            overlay.addEventListener('mousemove', (e) => {
                const r = this.canvas.getBoundingClientRect();
                this.mouseX = e.clientX - r.left;
                this.mouseY = e.clientY - r.top;
            });
            overlay.addEventListener('mouseleave', () => {
                this.mouseX = null;
                this.mouseY = null;
            });
            overlay.addEventListener('touchmove', (e) => {
                const t = e.touches[0];
                const r = this.canvas.getBoundingClientRect();
                this.mouseX = t.clientX - r.left;
                this.mouseY = t.clientY - r.top;
            }, { passive: true });
        }
    }

    _resize() {
        if (!this.canvas) return;
        this.w = this.canvas.width  = window.innerWidth;
        this.h = this.canvas.height = window.innerHeight;
        this._initSnowPiles();
    }

    _randRange(min, max) { return min + Math.random() * (max - min); }

    /* ── Main setCondition ───────────────────────── */
    setCondition(code, isDay = 1) {
        if (this.condCode === code && this.isDay === isDay) return;
        this.condCode = code;
        this.isDay    = isDay;
        this.particles = [];
        this._initSnowPiles();
        this._updateOverlayClass(code, isDay);
        this._updateFogTarget(code);
        this._buildParticles(code, isDay);
    }

    /* ── Overlay CSS class management ────────────── */
    _updateOverlayClass(code, isDay) {
        const ov = document.getElementById('weatherOverlay');
        if (!ov) return;
        ov.className = ov.className
            .replace(/\bcond-\S+\b/g, '')
            .replace(/\bis-day\b|\bis-night\b/g, '')
            .trim();

        ov.classList.add(isDay ? 'is-day' : 'is-night');
        let condCls = '';
        if ([0,1].includes(code))            condCls = isDay ? 'cond-clear-day'    : 'cond-clear-night';
        else if ([2,3].includes(code))       condCls = isDay ? 'cond-cloudy-day'   : 'cond-cloudy-night';
        else if ([45,48].includes(code))     condCls = 'cond-fog';
        else if (code >= 51 && code <= 82)   condCls = 'cond-rain';
        else if ([71,73,75,77,85,86].includes(code)) condCls = 'cond-snow';
        else if ([95,96,99].includes(code))  condCls = 'cond-storm';
        if (condCls) ov.classList.add(condCls);

        // Hero icon glow
        const hero = document.querySelector('.weather-hero-icon');
        if (hero) {
            hero.className = hero.className
                .replace(/\bglow-\S+\b/g, '').trim();
            if ([0,1].includes(code) && isDay)    hero.classList.add('glow-sun');
            if ([0,1].includes(code) && !isDay)   hero.classList.add('glow-moon');
            if ([95,96,99].includes(code))         hero.classList.add('glow-storm');
            if ([71,73,75,77,85,86].includes(code)) hero.classList.add('glow-snow');
        }
    }

    /* ── Fog blur update ──────────────────────────── */
    _updateFogTarget(code) {
        if ([45,48].includes(code)) {
            this.fogTarget = 0.08;
            if (this.fogVisionBlur) {
                this.fogVisionBlur.style.setProperty('--fog-blur',     '8px');
                this.fogVisionBlur.style.setProperty('--fog-opacity',  '0.1');
            }
        } else {
            this.fogTarget = 0;
            if (this.fogVisionBlur) {
                this.fogVisionBlur.style.setProperty('--fog-blur',    '0px');
                this.fogVisionBlur.style.setProperty('--fog-opacity', '0');
            }
        }
    }

    /* ── Snow pile initialisation ────────────────── */
    _initSnowPiles() {
        const cols = Math.ceil(this.w / 3);
        this.snowPiles = new Float32Array(cols).fill(0);
        // target max depth
        if ([75,86].includes(this.condCode))      this.snowDepthMax = 0.18; // heavy
        else if ([73,85].includes(this.condCode)) this.snowDepthMax = 0.10;
        else if ([71,77].includes(this.condCode)) this.snowDepthMax = 0.05;
        else                                      this.snowDepthMax = 0;
    }

    /* ── Build particles for condition ───────────── */
    _buildParticles(code, isDay) {
        const dense = this.w < 600 ? 0.6 : 1;
        this.snowDepthMax = 0;

        // ── STARS (clear night) ──
        if (isDay === 0 && [0,1,2].includes(code)) {
            const n = Math.floor(120 * dense);
            for (let i = 0; i < n; i++) {
                this.particles.push({
                    type: 'star',
                    x: Math.random() * this.w,
                    y: Math.random() * this.h * 0.7,
                    r: this._randRange(0.5, 2.2),
                    maxA: this._randRange(0.4, 1.0),
                    phase: Math.random() * Math.PI * 2,
                    speed: this._randRange(0.005, 0.025),
                    isShootingSeed: Math.random() < 0.003
                });
            }
        }

        // ── SUN RAYS (clear day) ──
        if (isDay === 1 && [0,1].includes(code)) {
            for (let i = 0; i < 10; i++) {
                this.particles.push({
                    type: 'sunray',
                    angle: (i / 10) * Math.PI * 2,
                    len: this._randRange(200, 500),
                    alpha: this._randRange(0.02, 0.06),
                    speed: this._randRange(0.0002, 0.0006),
                });
            }
        }

        // ── CLOUDS (cloudy) ──
        if ([2,3].includes(code)) {
            const n = code === 3 ? 8 : 4;
            for (let i = 0; i < n; i++) this._addCloud();
        }

        // ── RAIN ──
        const isRain = (code >= 51 && code <= 82) || [95,96,99].includes(code);
        if (isRain) {
            let intensity = 1;
            if ([65,67,82].includes(code))      intensity = 3;
            else if ([63,66,81].includes(code)) intensity = 2;
            else if ([95,96,99].includes(code)) intensity = 3.5;
            const n = Math.floor(140 * intensity * dense);
            for (let i = 0; i < n; i++) {
                this.particles.push(this._newRainDrop());
            }
        }

        // ── SNOW ──
        const isSnow = [71,73,75,77,85,86].includes(code);
        if (isSnow) {
            let intensity = 1;
            if ([75,86].includes(code))      { intensity = 3;   this.snowDepthMax = 0.18; }
            else if ([73,85].includes(code)) { intensity = 1.8; this.snowDepthMax = 0.10; }
            else                             {                   this.snowDepthMax = 0.05; }
            const n = Math.floor(80 * intensity * dense);
            for (let i = 0; i < n; i++) {
                this.particles.push(this._newSnowflake());
            }
        }

        // ── FOG WISPS ──
        if ([45,48].includes(code)) {
            for (let i = 0; i < 18; i++) {
                this.particles.push({
                    type: 'fog',
                    x: Math.random() * this.w,
                    y: this._randRange(0, this.h),
                    rx: this._randRange(80, 280),
                    ry: this._randRange(40, 120),
                    alpha: this._randRange(0.03, 0.1),
                    vx: this._randRange(-0.15, 0.15),
                    vy: this._randRange(-0.05, 0.05),
                    phase: Math.random() * Math.PI * 2,
                    pSpeed: this._randRange(0.003, 0.008),
                });
            }
        }

        // ── STORM: extra clouds + heavy rain already added ──
        if ([95,96,99].includes(code)) {
            this.nextFlash = this._randRange(1500, 5000);
        }
    }

    _addCloud() {
        this.particles.push({
            type: 'cloud',
            x: -this._randRange(100, 300),
            y: this._randRange(0, this.h * 0.5),
            rx: this._randRange(80, 200),
            ry: this._randRange(40, 100),
            vx: this._randRange(0.1, 0.5),
            alpha: this._randRange(0.06, 0.15),
        });
    }

    _newRainDrop() {
        const heavy = [65,67,82,95,96,99].includes(this.condCode);
        return {
            type: 'rain',
            x: Math.random() * (this.w + 100) - 50,
            y: Math.random() * this.h,
            len: heavy ? this._randRange(18, 30) : this._randRange(10, 20),
            speed: heavy ? this._randRange(14, 22) : this._randRange(8, 16),
            xs: -2 + Math.random() * 1.5,  // slight sideways; mouse can modify
            alpha: this._randRange(0.35, 0.65),
            w: heavy ? 1.8 : 1.2,
        };
    }

    _newSnowflake() {
        return {
            type: 'snow',
            x: Math.random() * this.w,
            y: -10 - Math.random() * 20,
            r: this._randRange(1.5, 4.5),
            vy: this._randRange(0.6, 2.2),
            vx: this._randRange(-0.5, 0.5),
            swing: this._randRange(0.3, 1.2),
            swingSpeed: this._randRange(0.01, 0.04),
            swingPhase: Math.random() * Math.PI * 2,
            alpha: this._randRange(0.6, 0.95),
            settled: false,
        };
    }

    /* ── Main start/stop ─────────────────────────── */
    start() {
        if (this.animId) return;
        this.lastTs = performance.now();
        this._frame(this.lastTs);
    }
    stop() {
        if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null; }
    }

    /* ── Main animation loop ─────────────────────── */
    _frame(ts) {
        const dt = Math.min(ts - this.lastTs, 50); // cap at 50ms
        this.lastTs  = ts;
        this.elapsed += dt;

        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.w, this.h);

        // ── Thunder / Lightning ──
        if ([95,96,99].includes(this.condCode)) {
            this.flashTimer += dt;
            if (this.flashTimer >= this.nextFlash) {
                this.flashTimer  = 0;
                this.nextFlash   = this._randRange(2000, 8000);
                this._triggerLightning();
            }
        }

        // ── Snow accumulation ──
        if (this.snowDepthMax > 0 && this.snowDepth < this.snowDepthMax) {
            this.snowDepth += (this.snowDepthMax - this.snowDepth) * 0.00002 * dt;
        }

        // ── Draw & update particles ──
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            switch (p.type) {
                case 'star':    this._drawStar(p, dt);    break;
                case 'sunray':  this._drawSunray(p, dt);  break;
                case 'cloud':   this._drawCloud(p, dt);   break;
                case 'rain':    this._drawRain(p, dt);    break;
                case 'snow':    this._drawSnow(p, dt);    break;
                case 'fog':     this._drawFog(p, dt);     break;
            }
        }

        // ── Draw snow accumulation ──
        if (this.snowDepth > 0.001) {
            this._drawSnowAccumulation();
        }

        this.animId = requestAnimationFrame((t) => this._frame(t));
    }

    /* ── STAR ─────────────────────────────────────── */
    _drawStar(p, dt) {
        p.phase += p.speed * dt * 0.05;
        const a = p.maxA * (0.5 + 0.5 * Math.sin(p.phase));
        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    /* ── SUN RAY ──────────────────────────────────── */
    _drawSunray(p, dt) {
        p.angle += p.speed * dt;
        const ctx = this.ctx;
        const cx = this.w * 0.65, cy = 0;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.strokeStyle = 'rgba(255,220,100,0.8)';
        ctx.lineWidth = 60;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(
            cx + Math.cos(p.angle) * p.len,
            cy + Math.sin(p.angle) * p.len
        );
        ctx.stroke();
        ctx.restore();
    }

    /* ── CLOUD ────────────────────────────────────── */
    _drawCloud(p, dt) {
        p.x += p.vx * dt * 0.05;
        if (p.x > this.w + 300) {
            p.x = -250;
            p.y = this._randRange(0, this.h * 0.5);
        }
        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.rx);
        grd.addColorStop(0, 'rgba(255,255,255,0.7)');
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grd;
        ctx.scale(1, p.ry / p.rx);
        ctx.beginPath();
        ctx.arc(p.x * (p.rx / p.rx), p.y * (p.rx / p.ry), p.rx, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    /* ── RAIN ─────────────────────────────────────── */
    _drawRain(p, dt) {
        const speed = p.speed * dt * 0.06;
        let xs = p.xs;
        // Interactive: wind toward mouse
        if (this.mouseX !== null) {
            const dx = (this.mouseX - p.x) / this.w;
            xs += dx * 0.8;
        }
        p.x += xs;
        p.y += speed;

        if (p.y > this.h + 20) {
            // Splash effect
            if (p.y - speed <= this.h) {
                this._spawnSplash(p.x, this.h);
            }
            Object.assign(p, this._newRainDrop());
            p.y = -20;
        }
        if (p.x > this.w + 50) p.x = -50;
        if (p.x < -50)         p.x = this.w + 50;

        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha  = p.alpha;
        ctx.strokeStyle  = 'rgba(180,215,255,0.8)';
        ctx.lineWidth    = p.w;
        ctx.lineCap      = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + xs * (p.len / speed), p.y - p.len);
        ctx.stroke();
        ctx.restore();
    }

    /* ── RAIN SPLASH ──────────────────────────────── */
    _spawnSplash(x, y) {
        if (Math.random() > 0.15) return;
        const el = document.createElement('div');
        el.className = 'rain-splash';
        el.style.cssText = `left:${x}px;top:${y - 4}px;position:fixed;z-index:2;`;
        document.getElementById('weatherOverlay')?.appendChild(el);
        setTimeout(() => el.remove(), 600);
    }

    /* ── SNOW ─────────────────────────────────────── */
    _drawSnow(p, dt) {
        if (p.settled) return;
        p.swingPhase += p.swingSpeed * dt * 0.05;
        p.x += p.vx + Math.sin(p.swingPhase) * p.swing * 0.3;
        p.y += p.vy * dt * 0.05;

        // Check if landed
        const col  = Math.floor(p.x / 3);
        const pile = this.snowPiles[col] || 0;
        const ground = this.h - pile;
        if (p.y + p.r >= ground) {
            // Accumulate
            if (col >= 0 && col < this.snowPiles.length) {
                const maxPile = this.h * this.snowDepthMax * 0.85;
                this.snowPiles[col] = Math.min(maxPile, pile + p.r * 0.3);
            }
            Object.assign(p, this._newSnowflake());
            return;
        }

        // Wrap
        if (p.x > this.w + 10) p.x = -10;
        if (p.x < -10)         p.x = this.w + 10;

        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = 'rgba(240,248,255,0.9)';
        ctx.shadowColor = 'rgba(200,230,255,0.5)';
        ctx.shadowBlur  = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    /* ── SNOW ACCUMULATION ────────────────────────── */
    _drawSnowAccumulation() {
        const ctx = this.ctx;
        ctx.save();
        ctx.fillStyle = 'rgba(230,242,250,0.75)';
        ctx.beginPath();
        ctx.moveTo(0, this.h);
        for (let i = 0; i < this.snowPiles.length; i++) {
            const x = i * 3;
            const y = this.h - (this.snowPiles[i] || 0);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.lineTo(this.w, this.h);
        ctx.closePath();
        ctx.fill();

        // Top highlight
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < this.snowPiles.length; i++) {
            const x = i * 3;
            const y = this.h - (this.snowPiles[i] || 0);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
    }

    /* ── FOG ──────────────────────────────────────── */
    _drawFog(p, dt) {
        p.phase += p.pSpeed * dt * 0.05;
        p.x += p.vx * dt * 0.05;
        p.y += p.vy * dt * 0.05;
        if (p.x > this.w + p.rx)  p.x = -p.rx;
        if (p.x < -p.rx)          p.x = this.w + p.rx;
        if (p.y > this.h + p.ry)  p.y = -p.ry;
        if (p.y < -p.ry)          p.y = this.h + p.ry;

        const a = p.alpha * (0.6 + 0.4 * Math.sin(p.phase));
        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.scale(1, p.ry / p.rx);
        const grd = ctx.createRadialGradient(
            p.x, p.y * (p.rx / p.ry), 0,
            p.x, p.y * (p.rx / p.ry), p.rx
        );
        grd.addColorStop(0, 'rgba(190,205,210,0.8)');
        grd.addColorStop(1, 'rgba(190,205,210,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y * (p.rx / p.ry), p.rx, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    /* ── LIGHTNING ────────────────────────────────── */
    _triggerLightning() {
        // Canvas flash
        this.flashOpacity = 0.85;

        // DOM flash element
        if (this.thunderFlash) {
            this.thunderFlash.classList.remove('active');
            void this.thunderFlash.offsetWidth;
            this.thunderFlash.classList.add('active');
            setTimeout(() => this.thunderFlash?.classList.remove('active'), 700);
        }

        // Draw lightning bolt on canvas briefly
        this._drawLightningBolt();

        // Schedule thunder sound hint (visual only)
        // Fade out flash
        const fadeFlash = () => {
            this.flashOpacity -= 0.06;
            if (this.flashOpacity > 0) requestAnimationFrame(fadeFlash);
            else this.flashOpacity = 0;
        };
        setTimeout(fadeFlash, 80);
    }

    _drawLightningBolt() {
        const ctx = this.ctx;
        const x0 = this._randRange(this.w * 0.2, this.w * 0.8);
        let x = x0, y = 0;
        const segments = [];
        while (y < this.h * 0.8) {
            const nx = x + this._randRange(-60, 60);
            const ny = y + this._randRange(40, 100);
            segments.push([x, y, nx, ny]);
            x = nx; y = ny;
        }
        ctx.save();
        ctx.strokeStyle = 'rgba(200,230,255,0.95)';
        ctx.shadowColor  = 'rgba(150,200,255,1)';
        ctx.shadowBlur   = 20;
        ctx.lineWidth    = 2;
        ctx.lineCap      = 'round';
        ctx.globalAlpha  = 0.9;
        ctx.beginPath();
        ctx.moveTo(x0, 0);
        segments.forEach(([, , nx, ny]) => ctx.lineTo(nx, ny));
        ctx.stroke();
        // Bright inner bolt
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth   = 1;
        ctx.shadowBlur  = 5;
        ctx.beginPath();
        ctx.moveTo(x0, 0);
        segments.forEach(([, , nx, ny]) => ctx.lineTo(nx, ny));
        ctx.stroke();
        ctx.restore();
    }
}
