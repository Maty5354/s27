/* ========================================
   WEATHER PARTICLE ENGINE (PHYSICS & FX)
   ======================================== */

class WeatherParticleEngine {
    constructor() {
        this.bgCanvas = document.getElementById('weatherCanvasBg');
        this.fxCanvas = document.getElementById('weatherCanvasFx');
        if (!this.bgCanvas || !this.fxCanvas) return;
        
        this.bgCtx = this.bgCanvas.getContext('2d');
        this.fxCtx = this.fxCanvas.getContext('2d');
        
        this.w = 0;
        this.h = 0;
        this.animId = null;
        
        // State
        this.code = 0;
        this.isDay = 1;
        this.scrollY = 0;
        
        // Physics Arrays
        this.clouds = [];
        this.particles = [];
        this.splashes = [];
        
        // Snow Accumulation (Array representing heights across the screen)
        this.snowResolution = 10;
        this.snowHeights = [];
        
        // Thunder
        this.isThunder = false;
        this.flashAlpha = 0;

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.w = window.innerWidth;
        this.h = window.innerHeight;
        this.bgCanvas.width = this.fxCanvas.width = this.w;
        this.bgCanvas.height = this.fxCanvas.height = this.h;
        
        // Reset snow array on resize
        this.snowHeights = new Float32Array(Math.ceil(this.w / this.snowResolution));
        this.initEntities();
    }

    setCondition(code, isDay) {
        if(this.code === code && this.isDay === isDay) return;
        this.code = code;
        this.isDay = isDay;
        this.isThunder = [95, 96, 99].includes(code);
        this.initEntities();
    }

    setScroll(y) {
        this.scrollY = y;
    }

    initEntities() {
        this.particles = [];
        this.clouds = [];
        this.splashes = [];
        const count = this.w < 600 ? 60 : 150;

        // Clouds (drawn on BG, fade on scroll)
        if ([2, 3, 45, 48].includes(this.code) || (this.code >= 51)) {
            const numClouds = this.code === 3 ? 15 : 8;
            for(let i=0; i<numClouds; i++) {
                this.clouds.push({
                    x: Math.random() * this.w,
                    y: Math.random() * (this.h * 0.4), // Top 40%
                    r: 80 + Math.random() * 100,
                    vx: 0.1 + Math.random() * 0.3
                });
            }
        }

        // Rain
        if ((this.code >= 51 && this.code <= 67) || (this.code >= 80 && this.code <= 82) || this.isThunder) {
            const numRain = this.code >= 65 ? count * 2 : count;
            for(let i=0; i<numRain; i++) {
                this.particles.push({
                    type: 'rain',
                    x: Math.random() * this.w,
                    y: Math.random() * this.h,
                    l: 15 + Math.random() * 20, // length
                    vx: -0.5 + Math.random(), // slight wind
                    vy: 15 + Math.random() * 10 // speed
                });
            }
        }

        // Snow
        if ([71, 73, 75, 77, 85, 86].includes(this.code)) {
            const numSnow = this.code >= 75 ? count * 1.5 : count;
            for(let i=0; i<numSnow; i++) {
                this.particles.push({
                    type: 'snow',
                    x: Math.random() * this.w,
                    y: Math.random() * this.h,
                    r: 1.5 + Math.random() * 3,
                    vx: -1 + Math.random() * 2,
                    vy: 1.5 + Math.random() * 2,
                    angle: Math.random() * Math.PI * 2
                });
            }
        }

        // Fog
        if ([45, 48].includes(this.code)) {
            for(let i=0; i<15; i++) {
                this.particles.push({
                    type: 'fog',
                    x: Math.random() * this.w,
                    y: Math.random() * this.h,
                    r: 150 + Math.random() * 200,
                    vx: (Math.random() - 0.5) * 0.5
                });
            }
        }
    }

    start() {
        if(!this.animId) this.animate();
    }

    stop() {
        if(this.animId) {
            cancelAnimationFrame(this.animId);
            this.animId = null;
        }
    }

    drawBackground() {
        const ctx = this.bgCtx;
        ctx.clearRect(0, 0, this.w, this.h);

        // 1. Dynamic Gradient based on Weather & Time
        let grd = ctx.createLinearGradient(0, 0, 0, this.h);
        if ([0, 1].includes(this.code)) {
            if (this.isDay) { grd.addColorStop(0, "#2980b9"); grd.addColorStop(1, "#6dd5fa"); }
            else { grd.addColorStop(0, "#0f2027"); grd.addColorStop(1, "#203a43"); }
        } else if ([2, 3].includes(this.code)) {
            if (this.isDay) { grd.addColorStop(0, "#4b6cb7"); grd.addColorStop(1, "#182848"); }
            else { grd.addColorStop(0, "#232526"); grd.addColorStop(1, "#414345"); }
        } else if (this.isThunder) {
            grd.addColorStop(0, "#0f0c29"); grd.addColorStop(1, "#24243e");
        } else if (this.code >= 71 && this.code <= 86) {
            if (this.isDay) { grd.addColorStop(0, "#83a4d4"); grd.addColorStop(1, "#b6fbff"); }
            else { grd.addColorStop(0, "#000428"); grd.addColorStop(1, "#004e92"); }
        } else {
            if (this.isDay) { grd.addColorStop(0, "#3a6073"); grd.addColorStop(1, "#16222a"); }
            else { grd.addColorStop(0, "#000000"); grd.addColorStop(1, "#434343"); }
        }
        
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, this.w, this.h);

        // 2. Clouds (Fade out based on scroll to make panels "glassier")
        const cloudAlpha = Math.max(0, 1 - (this.scrollY / 400));
        
        if (cloudAlpha > 0) {
            this.clouds.forEach(c => {
                c.x += c.vx;
                if(c.x - c.r > this.w) c.x = -c.r;
                
                const cGrd = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
                cGrd.addColorStop(0, `rgba(255, 255, 255, ${0.3 * cloudAlpha})`);
                cGrd.addColorStop(1, `rgba(255, 255, 255, 0)`);
                ctx.fillStyle = cGrd;
                ctx.beginPath();
                ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    }

    drawFX() {
        const ctx = this.fxCtx;
        ctx.clearRect(0, 0, this.w, this.h);

        // Thunder Flash
        if (this.isThunder) {
            if (Math.random() < 0.005 && this.flashAlpha <= 0) this.flashAlpha = 1;
            if (this.flashAlpha > 0) {
                ctx.fillStyle = `rgba(255, 255, 255, ${this.flashAlpha})`;
                ctx.fillRect(0, 0, this.w, this.h);
                this.flashAlpha -= 0.05;
            }
        }

        // Particles
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];

            if (p.type === 'rain') {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + p.vx, p.y + p.l);
                ctx.stroke();

                p.x += p.vx;
                p.y += p.vy;

                // Hit bottom -> Splash
                if (p.y > this.h) {
                    for(let s=0; s<2; s++) {
                        this.splashes.push({
                            x: p.x, y: this.h,
                            vx: (Math.random() - 0.5) * 2,
                            vy: -Math.random() * 3,
                            life: 1
                        });
                    }
                    p.y = -p.l;
                    p.x = Math.random() * this.w;
                }
            } 
            else if (p.type === 'snow') {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
                ctx.fill();

                p.angle += 0.02;
                p.x += Math.sin(p.angle) + p.vx;
                p.y += p.vy;

                // Accumulate Snow at bottom
                const col = Math.floor(p.x / this.snowResolution);
                if (col >= 0 && col < this.snowHeights.length) {
                    const groundY = this.h - this.snowHeights[col];
                    if (p.y >= groundY) {
                        if (this.snowHeights[col] < 100) this.snowHeights[col] += 0.2; // Increase snow height
                        p.y = -10;
                        p.x = Math.random() * this.w;
                    }
                } else if (p.y > this.h) {
                    p.y = -10;
                    p.x = Math.random() * this.w;
                }
            }
            else if (p.type === 'fog') {
                const fGrd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
                fGrd.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
                fGrd.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = fGrd;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
                ctx.fill();

                p.x += p.vx;
                if(p.x - p.r > this.w) p.x = -p.r;
                if(p.x + p.r < 0) p.x = this.w + p.r;
            }
        }

        // Draw Splashes
        for (let i = this.splashes.length - 1; i >= 0; i--) {
            const s = this.splashes[i];
            ctx.fillStyle = `rgba(255, 255, 255, ${s.life})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, 1.5, 0, Math.PI*2);
            ctx.fill();
            
            s.x += s.vx;
            s.y += s.vy;
            s.vy += 0.2; // Gravity
            s.life -= 0.05;
            
            if(s.life <= 0) this.splashes.splice(i, 1);
        }

        // Draw Accumulated Snow Polygon
        if (this.code >= 71 && this.code <= 86) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.beginPath();
            ctx.moveTo(0, this.h);
            for(let i=0; i<this.snowHeights.length; i++) {
                ctx.lineTo(i * this.snowResolution, this.h - this.snowHeights[i]);
            }
            ctx.lineTo(this.w, this.h);
            ctx.closePath();
            ctx.fill();
        }
    }

    animate() {
        this.drawBackground();
        this.drawFX();
        this.animId = requestAnimationFrame(() => this.animate());
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.weatherParticleEngine = new WeatherParticleEngine();
});
