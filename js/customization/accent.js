/* ============================================================
   ACCENT COLOR TAB  —  accent.js
   Companion: accent.css
   Requires: Pickr (global), themes.json accessible, CSS vars set
   ============================================================ */

(() => {
'use strict';

/* ── Config / constants ─────────────────────────────────── */
const PRESET_COUNT    = 10;
const STORAGE_KEY     = 'accent-presets-v1';
const GRADIENT_KEY    = 'accent-gradient-v1';
const HISTORY_KEY     = 'accent-history-v1';
const INTENSITY_KEY   = 'accent-intensity-v1';
const GRADIENT_EN_KEY = 'accent-gradient-enabled-v1';
const HISTORY_MAX     = 20;

/* Simulated colour name lookup (simple hue bands) */
function guessColorName(hex) {
    const [r,g,b] = hexToRgb(hex);
    const h = rgbToHsl(r,g,b)[0];
    const s = rgbToHsl(r,g,b)[1];
    const l = rgbToHsl(r,g,b)[2];
    if (s < 12) { if (l > 88) return 'White'; if (l < 12) return 'Black'; return 'Gray'; }
    if (h < 15 || h >= 345) return 'Red';
    if (h < 35)  return 'Orange';
    if (h < 65)  return 'Yellow';
    if (h < 150) return 'Green';
    if (h < 185) return 'Cyan';
    if (h < 255) return 'Blue';
    if (h < 285) return 'Indigo';
    if (h < 315) return 'Purple';
    return 'Pink';
}

/* ── State ──────────────────────────────────────────────── */
const STATE = {
    currentHex:     getCssVar('--accent-color') || '#6366f1',
    presets:        loadJson(STORAGE_KEY,  Array(PRESET_COUNT).fill(null)),
    history:        loadJson(HISTORY_KEY,  []),
    intensity:      parseFloat(localStorage.getItem(INTENSITY_KEY) || '1'),
    gradientEnabled:localStorage.getItem(GRADIENT_EN_KEY) === 'true',
    gradient: loadJson(GRADIENT_KEY, {
        type:   'linear',
        angle:  135,
        stop1:  null,     // null = use currentHex
        stop2:  null,     // null = computed complement
    }),
    recommended: [],     // filled from themes.json
    pickrInstance: null,
    gradientPickr1: null,
    gradientPickr2: null,
    openMenuId: null,    // which split btn menu is open
};

/* Normalise presets array length */
while (STATE.presets.length < PRESET_COUNT) STATE.presets.push(null);
STATE.presets = STATE.presets.slice(0, PRESET_COUNT);

/* ── Colour helpers ─────────────────────────────────────── */
function hexToRgb(hex) {
    hex = hex.replace('#','');
    if (hex.length === 3) hex = hex.split('').map(c=>c+c).join('');
    return [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16)];
}
function rgbToHex(r,g,b) {
    return '#' + [r,g,b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
}
function rgbToHsl(r,g,b) {
    r/=255; g/=255; b/=255;
    const mx=Math.max(r,g,b), mn=Math.min(r,g,b);
    let h,s,l=(mx+mn)/2;
    if (mx===mn) { h=s=0; } else {
        const d=mx-mn; s=l>.5?d/(2-mx-mn):d/(mx+mn);
        switch(mx){
            case r: h=((g-b)/d+(g<b?6:0))/6; break;
            case g: h=((b-r)/d+2)/6; break;
            default:h=((r-g)/d+4)/6;
        }
        h*=360;
    }
    return [Math.round(h), Math.round(s*100), Math.round(l*100)];
}
function hslToRgb(h,s,l) {
    h/=360; s/=100; l/=100;
    const q=l<.5?l*(1+s):l+s-l*s, p=2*l-q;
    const hue2rgb=(p,q,t)=>{
        if(t<0)t+=1; if(t>1)t-=1;
        if(t<1/6) return p+(q-p)*6*t;
        if(t<1/2) return q;
        if(t<2/3) return p+(q-p)*(2/3-t)*6;
        return p;
    };
    return s===0 ? [Math.round(l*255),Math.round(l*255),Math.round(l*255)]
                 : [hue2rgb(p,q,h+1/3),hue2rgb(p,q,h),hue2rgb(p,q,h-1/3)].map(v=>Math.round(v*255));
}

function shiftHue(hex, deg) {
    const [r,g,b] = hexToRgb(hex);
    let [h,s,l] = rgbToHsl(r,g,b);
    h = ((h + deg) % 360 + 360) % 360;
    const [nr,ng,nb] = hslToRgb(h,s,l);
    return rgbToHex(nr,ng,nb);
}
function adjustLightness(hex, delta) {
    const [r,g,b] = hexToRgb(hex);
    let [h,s,l] = rgbToHsl(r,g,b);
    l = Math.max(0, Math.min(100, l + delta));
    return rgbToHex(...hslToRgb(h,s,l));
}
function adjustSaturation(hex, delta) {
    const [r,g,b] = hexToRgb(hex);
    let [h,s,l] = rgbToHsl(r,g,b);
    s = Math.max(0, Math.min(100, s + delta));
    return rgbToHex(...hslToRgb(h,s,l));
}

function randomHex() {
    const h = Math.floor(Math.random()*360);
    const s = 55 + Math.floor(Math.random()*30);
    const l = 45 + Math.floor(Math.random()*20);
    return rgbToHex(...hslToRgb(h,s,l));
}

function contrastRatio(hex1, hex2) {
    const lum = hex => {
        const [r,g,b] = hexToRgb(hex).map(v => {
            v /= 255;
            return v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4);
        });
        return .2126*r + .7152*g + .0722*b;
    };
    const l1 = lum(hex1), l2 = lum(hex2);
    const [bright, dark] = l1 > l2 ? [l1,l2] : [l2,l1];
    return (bright + .05)/(dark + .05);
}

/* Colour-blindness simulation */
const CB_MATRICES = {
    Protanopia:   [[.567,.433,0],   [.558,.442,0],   [0,.242,.758]],
    Deuteranopia: [[.625,.375,0],   [.7,.3,0],        [0,.3,.7]],
    Tritanopia:   [[.95,.05,0],     [0,.433,.567],    [0,.475,.525]],
};
function simulateCB(hex, type) {
    const m = CB_MATRICES[type]; if (!m) return hex;
    const [r,g,b] = hexToRgb(hex).map(v=>v/255);
    const nr = m[0][0]*r + m[0][1]*g + m[0][2]*b;
    const ng = m[1][0]*r + m[1][1]*g + m[1][2]*b;
    const nb = m[2][0]*r + m[2][1]*g + m[2][2]*b;
    return rgbToHex(...[nr,ng,nb].map(v=>Math.round(Math.max(0,Math.min(1,v))*255)));
}

/* Harmonies */
function getHarmonies(hex) {
    return [
        { name: 'Complement',     colors: [hex, shiftHue(hex,180)] },
        { name: 'Split-comp.',    colors: [hex, shiftHue(hex,150), shiftHue(hex,210)] },
        { name: 'Analogous',      colors: [shiftHue(hex,-30), hex, shiftHue(hex,30)] },
        { name: 'Triadic',        colors: [hex, shiftHue(hex,120), shiftHue(hex,240)] },
        { name: 'Tetradic',       colors: [hex, shiftHue(hex,90), shiftHue(hex,180), shiftHue(hex,270)] },
        { name: 'Tints',          colors: [adjustLightness(hex,10), adjustLightness(hex,20), adjustLightness(hex,30)] },
        { name: 'Shades',         colors: [adjustLightness(hex,-10),adjustLightness(hex,-20),adjustLightness(hex,-30)] },
        { name: 'Sat. variants',  colors: [adjustSaturation(hex,-20), hex, adjustSaturation(hex,20)] },
    ];
}

/* Gradient CSS string */
function buildGradientCSS(hex) {
    const g = STATE.gradient;
    const stop1 = g.stop1 || hex;
    const stop2 = g.stop2 || shiftHue(hex, 50);
    if (g.type === 'radial') return `radial-gradient(circle, ${stop1}, ${stop2})`;
    if (g.type === 'conic')  return `conic-gradient(from ${g.angle}deg, ${stop1}, ${stop2}, ${stop1})`;
    return `linear-gradient(${g.angle}deg, ${stop1}, ${stop2})`;
}

/* ── Storage helpers ────────────────────────────────────── */
function loadJson(key, def) { try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; } }
function saveJson(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

function getCssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function setCssVar(name, val) {
    document.documentElement.style.setProperty(name, val);
}

/* ── Push to history ────────────────────────────────────── */
function pushHistory(hex) {
    STATE.history = [hex, ...STATE.history.filter(h=>h!==hex)].slice(0, HISTORY_MAX);
    saveJson(HISTORY_KEY, STATE.history);
}

/* ── Apply colour globally ──────────────────────────────── */
function applyAccent(hex, { flash = true } = {}) {
    hex = hex.toLowerCase();
    STATE.currentHex = hex;
    setCssVar('--accent-color', hex);

    // Apply intensity
    const alpha = STATE.intensity;
    if (alpha < 1) {
        const [r,g,b] = hexToRgb(hex);
        setCssVar('--accent-color-alpha', `rgba(${r},${g},${b},${alpha})`);
    } else {
        setCssVar('--accent-color-alpha', hex);
    }

    // Apply gradient if enabled
    if (STATE.gradientEnabled) {
        const grad = buildGradientCSS(hex);
        setCssVar('--accent-gradient', grad);
    }

    pushHistory(hex);
    updateAllUI(hex);
    if (flash) flashSection();
    saveCurrentToStorage(hex);
}

function saveCurrentToStorage(hex) {
    try { localStorage.setItem('accent-color', hex); } catch {}
}

/* ── Toast ──────────────────────────────────────────────── */
let toastTimer;
function toast(msg, icon='fa-check-circle') {
    let el = document.getElementById('accent-toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'accent-toast';
        el.className = 'accent-toast';
        document.body.appendChild(el);
    }
    el.innerHTML = `<i class="fa fa-${icon}"></i> ${msg}`;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

/* Flash outline on accent section */
function flashSection() {
    const el = document.getElementById('accentSection');
    if (!el) return;
    el.classList.remove('accent-flash');
    void el.offsetWidth;
    el.classList.add('accent-flash');
    setTimeout(() => el.classList.remove('accent-flash'), 600);
}

/* ── Update all UI elements ─────────────────────────────── */
function updateAllUI(hex) {
    // Pill
    const dot = document.getElementById('accent-live-dot');
    const hexEl = document.getElementById('accent-live-hex');
    const nameEl = document.getElementById('accent-live-name');
    if (dot)   dot.style.background = hex;
    if (hexEl) hexEl.textContent = hex.toUpperCase();
    if (nameEl) nameEl.textContent = guessColorName(hex);

    // Hex input
    const hexInput = document.getElementById('accent-hex-input');
    if (hexInput) hexInput.value = hex.toUpperCase();

    // Pickr
    if (STATE.pickrInstance) {
        try { STATE.pickrInstance.setColor(hex, true); } catch {}
    }

    // Intensity fill
    const intensityFill = document.getElementById('accent-intensity-fill');
    if (intensityFill) intensityFill.style.opacity = STATE.intensity;

    // Gradient preview
    updateGradientPreview(hex);

    // Harmonies
    renderHarmonies(hex);

    // Contrast
    updateContrast(hex);

    // Color-blindness sims
    updateCBSims(hex);

    // Swatch active states
    document.querySelectorAll('.accent-swatch[data-hex]').forEach(sw => {
        sw.classList.toggle('active', sw.dataset.hex === hex);
    });

    // History row
    renderHistory();

    // CSS var box
    const cssVarEl = document.getElementById('accent-css-var-val');
    if (cssVarEl) cssVarEl.textContent = `--accent-color: ${hex};`;
}

/* ── Load recommended from themes.json ─────────────────── */
async function loadRecommended() {
    try {
        const r = await fetch('./themes.json');
        const data = await r.json();
        const seen = new Set();
        const colors = [];
        (Array.isArray(data) ? data : data.themes || []).forEach(theme => {
            const c = theme.colors?.['--accent-color'] || theme['--accent-color'] || theme.accent;
            if (c && c.startsWith('#') && !seen.has(c)) {
                seen.add(c);
                colors.push({ hex: c, source: theme.name || theme.id || 'Theme' });
            }
        });
        STATE.recommended = colors;
    } catch {
        // Fallback palette — curated set of great accent colours
        STATE.recommended = [
            '#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316','#f59e0b',
            '#10b981','#06b6d4','#3b82f6','#a78bfa','#f43f5e','#84cc16',
            '#14b8a6','#e879f9','#fb923c','#4ade80','#60a5fa','#f472b6',
            '#c084fc','#fbbf24','#34d399','#38bdf8','#818cf8','#fb7185',
        ].map(hex => ({ hex, source: 'Curated' }));
    }
    renderRecommendedGrid();
}

/* ── Build HTML ─────────────────────────────────────────── */
function buildHTML() {
    const target = document.getElementById('accentSection');
    if (!target) return;

    target.innerHTML = `
    <!-- HEADER -->
    <div class="accent-header">
      ${buildHeaderSVG()}
      <div class="accent-header-content">
        <div class="accent-header-left">
          <div class="accent-hdr-icon-wrap">
            ${buildIconSVG()}
            <div class="accent-hdr-icon-face">🎨</div>
          </div>
          <div>
            <h3 class="accent-hdr-title">Accent Color</h3>
            <p class="accent-hdr-sub">Personalize the interface with your signature color</p>
          </div>
        </div>
        <div class="accent-live-pill" title="Current accent" id="accent-live-pill">
          <div class="accent-live-dot" id="accent-live-dot"></div>
          <div>
            <div class="accent-live-hex" id="accent-live-hex">#000000</div>
            <div class="accent-live-name" id="accent-live-name"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- LIVE PREVIEW -->
    <div class="accent-preview-bar">
      <div class="accent-preview-topbar">
        <div class="accent-preview-label"><div class="preview-livebead"></div> Live Preview</div>
        <div style="font-size:.6rem;color:var(--text-muted)">Updates in real time</div>
      </div>
      <div class="accent-preview-grid">
        <div class="pv-item"><div class="pv-btn">Button</div><div class="pv-item-label">Button</div></div>
        <div class="pv-item"><div class="pv-badge">Badge</div><div class="pv-item-label">Badge</div></div>
        <div class="pv-item"><a class="pv-link">Link text</a><div class="pv-item-label">Link</div></div>
        <div class="pv-item"><div class="pv-toggle"><div class="pv-toggle-thumb"></div></div><div class="pv-item-label">Toggle</div></div>
        <div class="pv-item"><div class="pv-progress"><div class="pv-progress-fill"></div></div><div class="pv-item-label">Progress</div></div>
        <div class="pv-item"><div class="pv-border"></div><div class="pv-item-label">Border</div></div>
        <div class="pv-item"><div class="pv-dot"></div><div class="pv-item-label">Dot</div></div>
      </div>
    </div>

    <!-- PICKER -->
    <div class="accent-block">
      <div class="accent-block-hdr">
        <div class="accent-block-title"><i class="fa fa-eyedropper"></i> Color Picker</div>
      </div>
      <div class="accent-picker-row">
        <div id="accent-pickr-mount"></div>
        <div class="accent-picker-info">
          <div class="accent-hex-row">
            <input type="text" id="accent-hex-input" class="accent-hex-input" maxlength="7" spellcheck="false" placeholder="#000000">
            <button class="accent-copy-btn" id="accent-copy-btn" title="Copy hex"><i class="fa fa-copy"></i></button>
          </div>
          <div class="accent-picker-btns">
            <button class="accent-act-btn primary" id="accent-save-preset-btn"><i class="fa fa-bookmark"></i> Save as preset</button>
            <button class="accent-act-btn" id="accent-apply-btn"><i class="fa fa-check"></i> Apply</button>
          </div>
          <!-- hue nudge -->
          <div class="accent-hue-row">
            <span class="accent-hue-lbl">Hue shift</span>
            <button class="accent-hue-btn" data-hue="-30">-30°</button>
            <button class="accent-hue-btn" data-hue="-15">-15°</button>
            <button class="accent-hue-btn" data-hue="+15">+15°</button>
            <button class="accent-hue-btn" data-hue="+30">+30°</button>
          </div>
        </div>
      </div>
    </div>

    <!-- RANDOMIZE SPLIT BUTTONS -->
    <div class="accent-rand-row">
      ${buildSplitBtn('rand-spectrum','fa-shuffle','Random Color','From full spectrum',[
            {icon:'fa-palette', label:'Any hue', sub:''},
            {icon:'fa-adjust', label:'High saturation only'},
            {icon:'fa-sun', label:'Light tones only'},
            {icon:'fa-moon', label:'Dark tones only'},
      ])}
      ${buildSplitBtn('rand-presets','fa-star','My Presets','Pick from saved presets',[
            {icon:'fa-random', label:'Truly random from presets'},
            {icon:'fa-sort-amount-up', label:'Newest preset'},
            {icon:'fa-sort-amount-down', label:'Oldest preset'},
      ])}
      ${buildSplitBtn('rand-recommended','fa-fire','Recommended','From curated colors',[
            {icon:'fa-random', label:'Truly random'},
            {icon:'fa-heart', label:'Most popular theme color'},
      ])}
    </div>

    <!-- USER PRESETS -->
    <div class="accent-block">
      <div class="accent-block-hdr">
        <div class="accent-block-title"><i class="fa fa-star"></i> My Presets <span style="color:var(--text-muted);font-weight:400;text-transform:none;letter-spacing:0;font-size:.7rem;">(${PRESET_COUNT} slots)</span></div>
        <div class="accent-block-actions">
          <button class="accent-micro-btn" id="preset-clear-btn"><i class="fa fa-trash"></i> Clear all</button>
        </div>
      </div>
      <div class="accent-color-grid" id="accent-preset-grid"></div>
    </div>

    <!-- RECOMMENDED -->
    <div class="accent-block">
      <div class="accent-block-hdr">
        <div class="accent-block-title"><i class="fa fa-fire"></i> Recommended</div>
        <button class="accent-micro-btn" id="recommended-reload-btn"><i class="fa fa-sync"></i> Refresh</button>
      </div>
      <div class="accent-color-grid" id="accent-recommended-grid">
        <div style="grid-column:1/-1;text-align:center;padding:1rem;color:var(--text-muted);font-size:.75rem;">Loading…</div>
      </div>
    </div>

    <!-- HARMONIES -->
    <div class="accent-block">
      <div class="accent-block-hdr">
        <div class="accent-block-title"><i class="fa fa-project-diagram"></i> Color Harmonies</div>
      </div>
      <div class="accent-harmony-list" id="accent-harmony-list"></div>
    </div>

    <!-- RECENT HISTORY -->
    <div class="accent-block">
      <div class="accent-block-hdr">
        <div class="accent-block-title"><i class="fa fa-history"></i> Recent</div>
        <span class="accent-history-clear" id="history-clear">Clear</span>
      </div>
      <div class="accent-history-row" id="accent-history-row"></div>
    </div>

    <!-- CSS VAR DISPLAY -->
    <div class="accent-css-var-box" style="margin-bottom:1.25rem;">
      <i class="fa fa-code" style="color:var(--accent-color);font-size:.75rem;"></i>
      <code id="accent-css-var-val">--accent-color: #000000;</code>
      <button class="accent-copy-btn" id="accent-copy-css" title="Copy CSS variable" style="width:26px;height:26px;border-radius:4px;"><i class="fa fa-copy"></i></button>
    </div>

    <!-- ADVANCED TOGGLE -->
    <button class="accent-adv-toggle" id="accent-adv-toggle">
      <div class="accent-adv-toggle-left">
        <i class="fa fa-sliders-h"></i>
        Advanced Options
      </div>
      <i class="fa fa-chevron-down adv-chev"></i>
    </button>
    <div class="accent-adv-body" id="accent-adv-body">

      <!-- GRADIENT MODE -->
      <div class="accent-adv-section">
        <div class="accent-adv-hdr">
          <div class="accent-adv-title"><i class="fa fa-th-large"></i> Gradient Accent <span class="beta-badge">BETA</span></div>
          <label class="cb-toggle" style="flex-shrink:0;">
            <input type="checkbox" id="gradient-enable-chk">
            <div class="cb-toggle-track"><div class="cb-toggle-thumb"></div></div>
          </label>
        </div>
        <div id="gradient-preview" class="gradient-preview"></div>
        <div class="gradient-row">
          <div class="gradient-field">
            <div class="gradient-field-lbl">Type</div>
            <div class="gradient-type-btns">
              <button class="gradient-type-btn" data-type="linear"><i class="fa fa-arrows-alt-h"></i> Linear</button>
              <button class="gradient-type-btn" data-type="radial"><i class="fa fa-circle"></i> Radial</button>
              <button class="gradient-type-btn" data-type="conic"><i class="fa fa-rotate"></i> Conic</button>
            </div>
          </div>
          <div class="gradient-field">
            <div class="gradient-field-lbl">Direction</div>
            <div class="gradient-dir-knob" id="gradient-dir-knob">
              ${buildDirKnobSVG()}
            </div>
          </div>
        </div>
        <div class="gradient-stop-row">
          <div class="gradient-field-lbl">Stop 1</div>
          <div id="gradient-stop1-mount" style="display:flex;"></div>
          <div class="gradient-field-lbl" style="margin-left:8px;">Stop 2</div>
          <div id="gradient-stop2-mount" style="display:flex;"></div>
          <button class="accent-micro-btn" id="gradient-swap-btn"><i class="fa fa-exchange-alt"></i></button>
        </div>
      </div>

      <!-- INTENSITY -->
      <div class="accent-adv-section">
        <div class="accent-adv-hdr">
          <div class="accent-adv-title"><i class="fa fa-adjust"></i> Intensity</div>
          <span id="intensity-label" class="intensity-val">100%</span>
        </div>
        <div class="intensity-row">
          <div class="intensity-strip"><div class="intensity-fill" id="accent-intensity-fill"></div></div>
        </div>
        <div class="accent-slider-wrap">
          <input type="range" id="accent-intensity-slider" min="20" max="100" step="1">
        </div>
      </div>

      <!-- QUICK ADJUST -->
      <div class="accent-adv-section">
        <div class="accent-adv-hdr">
          <div class="accent-adv-title"><i class="fa fa-magic"></i> Quick Adjust</div>
        </div>
        <div class="accent-quick-row">
          <button class="accent-quick-btn" data-adjust="lighten-10"><i class="fa fa-sun"></i>Lighten</button>
          <button class="accent-quick-btn" data-adjust="darken-10"><i class="fa fa-moon"></i>Darken</button>
          <button class="accent-quick-btn" data-adjust="saturate-15"><i class="fa fa-tint"></i>Vivid</button>
          <button class="accent-quick-btn" data-adjust="desaturate-15"><i class="fa fa-tint-slash"></i>Muted</button>
          <button class="accent-quick-btn" data-adjust="complement"><i class="fa fa-exchange-alt"></i>Flip</button>
          <button class="accent-quick-btn" data-adjust="triadic-2"><i class="fa fa-code-branch"></i>Triadic</button>
          <button class="accent-quick-btn" data-adjust="split-1"><i class="fa fa-arrows-alt"></i>Split</button>
          <button class="accent-quick-btn" data-adjust="warmer"><i class="fa fa-thermometer-full"></i>Warmer</button>
          <button class="accent-quick-btn" data-adjust="cooler"><i class="fa fa-snowflake"></i>Cooler</button>
        </div>
      </div>

      <!-- CONTRAST CHECKER -->
      <div class="accent-adv-section">
        <div class="accent-adv-hdr">
          <div class="accent-adv-title"><i class="fa fa-eye"></i> Contrast Checker (WCAG)</div>
        </div>
        <div class="contrast-grid">
          <div class="contrast-item" id="contrast-on-light">
            <div class="contrast-lbl">On Light BG</div>
            <div class="contrast-ratio" id="contrast-ratio-light">—</div>
            <div class="contrast-badges" id="contrast-badges-light"></div>
          </div>
          <div class="contrast-item" id="contrast-on-dark">
            <div class="contrast-lbl">On Dark BG</div>
            <div class="contrast-ratio" id="contrast-ratio-dark">—</div>
            <div class="contrast-badges" id="contrast-badges-dark"></div>
          </div>
        </div>
      </div>

      <!-- COLOR BLINDNESS SIMULATOR -->
      <div class="accent-adv-section">
        <div class="accent-adv-hdr">
          <div class="accent-adv-title"><i class="fa fa-eye-slash"></i> Color Blindness Preview</div>
        </div>
        <div class="cb-sim-row" id="cb-sim-row">
          ${Object.keys(CB_MATRICES).map(type=>`
          <div class="cb-sim-item">
            <div class="cb-sim-swatch" id="cb-sim-${type}"></div>
            <div class="cb-sim-label">${type}</div>
          </div>`).join('')}
        </div>
      </div>

      <!-- EXPORT / IMPORT -->
      <div class="accent-adv-section">
        <div class="accent-adv-hdr">
          <div class="accent-adv-title"><i class="fa fa-download"></i> Export / Import</div>
        </div>
        <div class="accent-export-row">
          <button class="accent-act-btn" id="export-presets-btn"><i class="fa fa-file-export"></i> Export presets</button>
          <button class="accent-act-btn" id="import-presets-btn"><i class="fa fa-file-import"></i> Import JSON</button>
          <input type="file" id="import-file-input" accept=".json" style="display:none">
          <button class="accent-act-btn" id="copy-css-all-btn"><i class="fa fa-code"></i> Copy CSS vars</button>
        </div>
      </div>

    </div><!-- /.accent-adv-body -->
    `;
}

/* ── Builder helpers ────────────────────────────────────── */
function buildSplitBtn(id, icon, title, sub, menuItems) {
    const menuHTML = menuItems.map((item,i) => `
      <button class="split-menu-item" data-menu-action="${id}-${i}">
        <div class="split-menu-item-left"><i class="fa ${item.icon}"></i> ${item.label}</div>
      </button>
    `).join('');
    return `
    <div class="accent-split-btn" id="${id}">
      <button class="accent-split-main" data-action="${id}">
        <div class="split-icon"><i class="fa ${icon}"></i></div>
        <div class="split-label">
          <span class="split-title">${title}</span>
          <span class="split-sub">${sub}</span>
        </div>
      </button>
      <button class="accent-split-arrow" data-menu="${id}"><i class="fa fa-chevron-down"></i></button>
      <div class="accent-split-menu" id="${id}-menu">
        ${menuHTML}
      </div>
    </div>`;
}

function buildHeaderSVG() {
    return `<svg class="accent-header-svg" viewBox="0 0 900 100" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="ahBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stop-color="var(--highlight-color)"/>
        <stop offset="100%" stop-color="var(--card-bg)"/>
      </linearGradient>
      <linearGradient id="ahSpectrum" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"    stop-color="#ff6b6b" stop-opacity=".25"/>
        <stop offset="16.6%" stop-color="#ffd166" stop-opacity=".25"/>
        <stop offset="33.3%" stop-color="#06d6a0" stop-opacity=".25"/>
        <stop offset="50%"   stop-color="#118ab2" stop-opacity=".25"/>
        <stop offset="66.6%" stop-color="#7b2d8b" stop-opacity=".25"/>
        <stop offset="83.3%" stop-color="#ef476f" stop-opacity=".25"/>
        <stop offset="100%"  stop-color="#ff6b6b" stop-opacity=".25"/>
      </linearGradient>
      <radialGradient id="ahOrb1g" cx="70%" cy="40%">
        <stop offset="0%"   stop-color="var(--accent-color)" stop-opacity=".35"/>
        <stop offset="100%" stop-color="var(--accent-color)" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="ahOrb2g" cx="20%" cy="60%">
        <stop offset="0%"   stop-color="#f59e0b" stop-opacity=".25"/>
        <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="ahOrb3g" cx="50%" cy="80%">
        <stop offset="0%"   stop-color="#10b981" stop-opacity=".2"/>
        <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="900" height="100" fill="url(#ahBg)"/>
    <!-- spectrum band -->
    <rect class="ah-spectrum" width="900" height="100" fill="url(#ahSpectrum)"/>
    <!-- orbs -->
    <circle class="ah-orb1" cx="630" cy="40" r="80"  fill="url(#ahOrb1g)"/>
    <circle class="ah-orb2" cx="180" cy="60" r="65"  fill="url(#ahOrb2g)"/>
    <circle class="ah-orb3" cx="450" cy="90" r="50"  fill="url(#ahOrb3g)"/>
    <!-- wave overlay -->
    <path class="ah-wave1" d="M0 70 Q225 45 450 70 Q675 95 900 70 L900 100 L0 100 Z" fill="var(--card-bg)" opacity=".18"/>
    <path class="ah-wave2" d="M0 80 Q300 60 600 80 Q750 90 900 70 L900 100 L0 100 Z" fill="var(--card-bg)" opacity=".10"/>
    <!-- floating dots -->
    <circle class="ah-dot" style="--dur:4s;--del:0s"  cx="800" cy="20" r="3" fill="var(--accent-color)" opacity=".5"/>
    <circle class="ah-dot" style="--dur:6s;--del:1s"  cx="720" cy="55" r="2" fill="#f59e0b" opacity=".4"/>
    <circle class="ah-dot" style="--dur:5s;--del:2s"  cx="100" cy="25" r="2" fill="#10b981" opacity=".4"/>
    <circle class="ah-dot" style="--dur:7s;--del:.5s" cx="350" cy="15" r="3" fill="#ef4444" opacity=".3"/>
    <circle class="ah-dot" style="--dur:5.5s;--del:3s" cx="580" cy="70" r="2" fill="var(--accent-color)" opacity=".35"/>
  </svg>`;
}

function buildIconSVG() {
    return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="iconRing" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stop-color="#ff6b6b"/>
        <stop offset="25%"  stop-color="#ffd166"/>
        <stop offset="50%"  stop-color="#06d6a0"/>
        <stop offset="75%"  stop-color="#118ab2"/>
        <stop offset="100%" stop-color="#7b2d8b"/>
      </linearGradient>
    </defs>
    <circle cx="25" cy="25" r="24" fill="url(#iconRing)" class="ah-conic-ring"/>
    <circle cx="25" cy="25" r="19" fill="var(--card-bg)"/>
  </svg>`;
}

function buildDirKnobSVG() {
    return `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <circle cx="30" cy="30" r="26" class="dir-track"/>
    <circle cx="30" cy="30" r="5"  class="dir-center"/>
    <line id="dir-line" x1="30" y1="30" x2="30" y2="8" class="dir-indicator"/>
  </svg>`;
}

/* ── Grids ──────────────────────────────────────────────── */
function renderPresetGrid() {
    const grid = document.getElementById('accent-preset-grid');
    if (!grid) return;
    grid.innerHTML = '';
    STATE.presets.forEach((hex, i) => {
        if (hex) {
            const div = document.createElement('div');
            div.className = 'accent-swatch accent-swatch-preset';
            div.dataset.hex = hex;
            div.dataset.presetIdx = i;
            div.style.background = hex;
            div.style.animationDelay = (i * .025 + .02) + 's';
            div.title = hex;
            div.innerHTML = `<div class="preset-del-overlay"><i class="fa fa-times"></i></div>`;
            div.addEventListener('click', e => {
                if (e.target.closest('.preset-del-overlay')) {
                    deletePreset(i);
                } else {
                    ripple(div);
                    applyAccent(hex);
                }
            });
            grid.appendChild(div);
        } else {
            const div = document.createElement('div');
            div.className = 'accent-swatch-empty';
            div.dataset.emptyIdx = i;
            div.innerHTML = `<i class="fa fa-plus"></i>`;
            div.title = 'Save current color here';
            div.style.animationDelay = (i * .025 + .02) + 's';
            div.addEventListener('click', () => saveToPresetSlot(i));
            grid.appendChild(div);
        }
    });
    updateSwatchActiveStates();
}

function renderRecommendedGrid() {
    const grid = document.getElementById('accent-recommended-grid');
    if (!grid) return;
    grid.innerHTML = '';
    if (!STATE.recommended.length) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:1rem;color:var(--text-muted);font-size:.75rem;">No recommended colors found</div>`;
        return;
    }
    STATE.recommended.forEach(({ hex, source }, i) => {
        const div = document.createElement('div');
        div.className = 'accent-swatch';
        div.dataset.hex = hex;
        div.style.background = hex;
        div.style.animationDelay = (i * .018 + .02) + 's';
        div.title = `${hex}  —  ${source}`;
        div.setAttribute('data-hex', hex);
        div.addEventListener('click', () => { ripple(div); applyAccent(hex); });
        grid.appendChild(div);
    });
    updateSwatchActiveStates();
}

function renderHistory() {
    const row = document.getElementById('accent-history-row');
    if (!row) return;
    row.innerHTML = '';
    if (!STATE.history.length) {
        row.innerHTML = `<span style="font-size:.7rem;color:var(--text-muted)">No history yet</span>`;
        return;
    }
    STATE.history.forEach((hex, i) => {
        const div = document.createElement('div');
        div.className = 'accent-history-item';
        div.style.background = hex;
        div.style.animationDelay = (i*.03)+'s';
        div.dataset.hex = hex;
        div.addEventListener('click', () => { ripple(div); applyAccent(hex); });
        row.appendChild(div);
    });
}

function renderHarmonies(hex) {
    const list = document.getElementById('accent-harmony-list');
    if (!list) return;
    list.innerHTML = '';
    getHarmonies(hex).forEach(({ name, colors }, idx) => {
        const row = document.createElement('div');
        row.className = 'accent-harmony-row';
        row.style.animationDelay = (idx * .04)+'s';
        const swatchesHTML = colors.map(c => `
          <div class="harmony-sw" style="background:${c}" data-hex="${c}" title="${c}"></div>
        `).join('');
        row.innerHTML = `
          <div class="harmony-name">${name}</div>
          <div class="harmony-swatches">${swatchesHTML}</div>
        `;
        row.querySelectorAll('.harmony-sw').forEach(sw => {
            sw.addEventListener('click', () => { ripple(sw); applyAccent(sw.dataset.hex); });
        });
        list.appendChild(row);
    });
}

/* ── Preset ops ─────────────────────────────────────────── */
function saveToPresetSlot(idx) {
    STATE.presets[idx] = STATE.currentHex;
    saveJson(STORAGE_KEY, STATE.presets);
    renderPresetGrid();
    toast('Saved to preset slot ' + (idx+1), 'bookmark');
}

function savePreset() {
    const emptyIdx = STATE.presets.findIndex(p => p === null);
    if (emptyIdx === -1) {
        toast('All preset slots full! Remove one first.', 'exclamation-circle');
        return;
    }
    saveToPresetSlot(emptyIdx);
}

function deletePreset(idx) {
    STATE.presets[idx] = null;
    saveJson(STORAGE_KEY, STATE.presets);
    renderPresetGrid();
    toast('Preset removed', 'trash');
}

function clearPresets() {
    STATE.presets = Array(PRESET_COUNT).fill(null);
    saveJson(STORAGE_KEY, STATE.presets);
    renderPresetGrid();
    toast('All presets cleared', 'trash');
}

/* ── Randomize ops ──────────────────────────────────────── */
function randomizeSpectrum(mode = 'any') {
    let hex;
    if (mode === 'light') {
        hex = rgbToHex(...hslToRgb(Math.floor(Math.random()*360), 50+Math.floor(Math.random()*30), 70+Math.floor(Math.random()*15)));
    } else if (mode === 'dark') {
        hex = rgbToHex(...hslToRgb(Math.floor(Math.random()*360), 50+Math.floor(Math.random()*30), 25+Math.floor(Math.random()*15)));
    } else if (mode === 'vivid') {
        hex = rgbToHex(...hslToRgb(Math.floor(Math.random()*360), 85+Math.floor(Math.random()*15), 50+Math.floor(Math.random()*10)));
    } else {
        hex = randomHex();
    }
    return hex;
}

function randomizeFromPresets(mode='random') {
    const filled = STATE.presets.filter(Boolean);
    if (!filled.length) { toast('No presets saved yet!', 'exclamation-circle'); return null; }
    if (mode === 'newest') return filled[filled.length-1];
    if (mode === 'oldest') return filled[0];
    return filled[Math.floor(Math.random()*filled.length)];
}

function randomizeFromRecommended(mode='random') {
    if (!STATE.recommended.length) { toast('No recommended colors loaded!', 'exclamation-circle'); return null; }
    const hex = STATE.recommended[Math.floor(Math.random()*STATE.recommended.length)]?.hex;
    return hex || null;
}

function animateRandBtn(id) {
    const btn = document.querySelector(`#${id} .accent-split-main`);
    if (!btn) return;
    btn.classList.remove('spinning');
    void btn.offsetWidth;
    btn.classList.add('spinning');
    setTimeout(() => btn.classList.remove('spinning'), 600);
}

/* ── Contrast checker ───────────────────────────────────── */
function updateContrast(hex) {
    const lightBg = '#ffffff', darkBg = '#111111';
    const ratioLight = contrastRatio(hex, lightBg);
    const ratioDark  = contrastRatio(hex, darkBg);

    const makeRatioColor = r => r >= 7 ? '#10b981' : r >= 4.5 ? '#f59e0b' : '#ef4444';
    const makeBadges = r => {
        const aa = r >= 4.5, aaa = r >= 7, aaLarge = r >= 3;
        return [
            `<span class="wcag-badge ${aaLarge?'wcag-pass':'wcag-fail'}">AA Large</span>`,
            `<span class="wcag-badge ${aa?'wcag-pass':'wcag-fail'}">AA</span>`,
            `<span class="wcag-badge ${aaa?'wcag-pass':'wcag-fail'}">AAA</span>`,
        ].join('');
    };

    const rl = document.getElementById('contrast-ratio-light');
    const rd = document.getElementById('contrast-ratio-dark');
    const bl = document.getElementById('contrast-badges-light');
    const bd = document.getElementById('contrast-badges-dark');
    if (rl) { rl.textContent = ratioLight.toFixed(2) + ':1'; rl.style.color = makeRatioColor(ratioLight); }
    if (rd) { rd.textContent = ratioDark.toFixed(2) + ':1';  rd.style.color = makeRatioColor(ratioDark); }
    if (bl) bl.innerHTML = makeBadges(ratioLight);
    if (bd) bd.innerHTML = makeBadges(ratioDark);
}

/* ── Color blindness preview ────────────────────────────── */
function updateCBSims(hex) {
    Object.keys(CB_MATRICES).forEach(type => {
        const el = document.getElementById(`cb-sim-${type}`);
        if (el) el.style.background = simulateCB(hex, type);
    });
}

/* ── Gradient ───────────────────────────────────────────── */
function updateGradientPreview(hex) {
    const el = document.getElementById('gradient-preview');
    if (!el) return;
    el.style.background = buildGradientCSS(hex);
}

function setGradientType(type) {
    STATE.gradient.type = type;
    document.querySelectorAll('.gradient-type-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.type === type)
    );
    saveJson(GRADIENT_KEY, STATE.gradient);
    updateGradientPreview(STATE.currentHex);
    if (STATE.gradientEnabled) setCssVar('--accent-gradient', buildGradientCSS(STATE.currentHex));
}

/* Direction knob */
function initDirKnob() {
    const knob = document.getElementById('gradient-dir-knob');
    const line = document.getElementById('dir-line');
    if (!knob || !line) return;

    let dragging = false;
    const getAngle = e => {
        const r = knob.getBoundingClientRect();
        const cx = r.left + r.width/2, cy = r.top + r.height/2;
        const touch = e.touches?.[0] || e;
        const dx = touch.clientX - cx, dy = touch.clientY - cy;
        let angle = Math.round(Math.atan2(dx, -dy) * 180 / Math.PI);
        return ((angle % 360) + 360) % 360;
    };
    const updateKnobFromAngle = angle => {
        STATE.gradient.angle = angle;
        const rad = (angle - 90) * Math.PI / 180;
        const x2 = 30 + 22 * Math.cos(rad);
        const y2 = 30 + 22 * Math.sin(rad);
        line.setAttribute('x2', x2.toFixed(1));
        line.setAttribute('y2', y2.toFixed(1));
        saveJson(GRADIENT_KEY, STATE.gradient);
        updateGradientPreview(STATE.currentHex);
        if (STATE.gradientEnabled) setCssVar('--accent-gradient', buildGradientCSS(STATE.currentHex));
    };

    // Restore saved angle
    updateKnobFromAngle(STATE.gradient.angle);

    knob.addEventListener('mousedown',  e => { dragging = true; updateKnobFromAngle(getAngle(e)); });
    knob.addEventListener('touchstart', e => { dragging = true; updateKnobFromAngle(getAngle(e)); }, {passive:true});
    window.addEventListener('mousemove',  e => { if (dragging) updateKnobFromAngle(getAngle(e)); });
    window.addEventListener('touchmove',  e => { if (dragging) updateKnobFromAngle(getAngle(e)); }, {passive:true});
    window.addEventListener('mouseup',   () => { dragging = false; });
    window.addEventListener('touchend',  () => { dragging = false; });
}

/* ── Pickr for main picker ──────────────────────────────── */
function initMainPickr() {
    const mount = document.getElementById('accent-pickr-mount');
    if (!mount) return;
    if (typeof Pickr === 'undefined') return;

    STATE.pickrInstance = Pickr.create({
        el: mount,
        container: mount,
        theme: 'monolith',
        default: STATE.currentHex,
        components: {
            preview: true, opacity: false, hue: true,
            interaction: { hex: true, rgba: true, input: true }
        }
    });

    STATE.pickrInstance.on('change', color => {
        const hex = color.toHEXA().toString().substring(0,7).toLowerCase();
        STATE.currentHex = hex;
        const hexInput = document.getElementById('accent-hex-input');
        if (hexInput) hexInput.value = hex.toUpperCase();
        updateAllUI(hex);
        // Do NOT apply to page yet — wait for Apply or live mode
    }).on('save', color => {
        const hex = color.toHEXA().toString().substring(0,7).toLowerCase();
        applyAccent(hex);
    });
}

/* ── Intensity slider ───────────────────────────────────── */
function initIntensitySlider() {
    const slider = document.getElementById('accent-intensity-slider');
    const label  = document.getElementById('intensity-label');
    const fill   = document.getElementById('accent-intensity-fill');
    if (!slider) return;

    slider.value = Math.round(STATE.intensity * 100);

    const update = () => {
        const val = parseInt(slider.value);
        STATE.intensity = val / 100;
        if (label) label.textContent = val + '%';
        if (fill)  fill.style.opacity = STATE.intensity;
        localStorage.setItem(INTENSITY_KEY, STATE.intensity);
        applyAccent(STATE.currentHex, { flash: false });
    };

    slider.addEventListener('input', update);
    update();
}

/* ── Hex input ──────────────────────────────────────────── */
function initHexInput() {
    const input = document.getElementById('accent-hex-input');
    if (!input) return;
    input.value = STATE.currentHex.toUpperCase();
    input.addEventListener('input', () => {
        let v = input.value.trim();
        if (!v.startsWith('#')) v = '#' + v;
        if (/^#[0-9a-fA-F]{6}$/.test(v)) {
            STATE.currentHex = v.toLowerCase();
            updateAllUI(STATE.currentHex);
        }
    });
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') applyAccent(STATE.currentHex);
    });
}

/* ── Swatch active states ───────────────────────────────── */
function updateSwatchActiveStates() {
    document.querySelectorAll('.accent-swatch[data-hex]').forEach(sw => {
        sw.classList.toggle('active', sw.dataset.hex === STATE.currentHex);
    });
}

/* ── Ripple helper ──────────────────────────────────────── */
function ripple(el) {
    const r = document.createElement('div');
    r.className = 'swatch-ripple';
    el.appendChild(r);
    setTimeout(() => r.remove(), 550);
}

/* ── Export / Import ────────────────────────────────────── */
function exportPresets() {
    const data = JSON.stringify({ presets: STATE.presets, current: STATE.currentHex }, null, 2);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], {type:'application/json'}));
    a.download = 'accent-presets.json';
    a.click();
    toast('Presets exported!', 'check-circle');
}

function importPresets(file) {
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            if (Array.isArray(data.presets)) {
                STATE.presets = data.presets.slice(0, PRESET_COUNT);
                while (STATE.presets.length < PRESET_COUNT) STATE.presets.push(null);
                saveJson(STORAGE_KEY, STATE.presets);
                renderPresetGrid();
                toast('Presets imported!', 'file-import');
            }
        } catch { toast('Invalid JSON file', 'exclamation-circle'); }
    };
    reader.readAsText(file);
}

function copyCSSAll() {
    const text = [
        `--accent-color: ${STATE.currentHex};`,
        `--accent-color-alpha: ${STATE.currentHex};`,
        STATE.gradientEnabled ? `--accent-gradient: ${buildGradientCSS(STATE.currentHex)};` : '',
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text).then(() => toast('CSS copied!', 'code'));
}

/* ── Event listeners ────────────────────────────────────── */
function bindEvents() {
    /* Apply button */
    on('accent-apply-btn', 'click', () => applyAccent(STATE.currentHex));

    /* Save preset */
    on('accent-save-preset-btn', 'click', savePreset);

    /* Copy hex */
    on('accent-copy-btn', 'click', () => {
        navigator.clipboard.writeText(STATE.currentHex.toUpperCase()).then(() => {
            const btn = document.getElementById('accent-copy-btn');
            if (btn) {
                btn.classList.add('copied');
                btn.innerHTML = '<i class="fa fa-check"></i>';
                setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = '<i class="fa fa-copy"></i>'; }, 1500);
            }
            toast('Hex copied!', 'copy');
        });
    });

    /* Copy CSS var */
    on('accent-copy-css', 'click', () => {
        const el = document.getElementById('accent-css-var-val');
        if (el) navigator.clipboard.writeText(el.textContent).then(() => toast('CSS var copied!', 'code'));
    });

    /* Hue nudge */
    document.querySelectorAll('.accent-hue-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const deg = parseInt(btn.dataset.hue);
            const shifted = shiftHue(STATE.currentHex, deg);
            STATE.currentHex = shifted;
            updateAllUI(shifted);
        });
    });

    /* Preset clear */
    on('preset-clear-btn', 'click', () => {
        if (confirm('Clear all presets?')) clearPresets();
    });

    /* Reload recommended */
    on('recommended-reload-btn', 'click', () => {
        const grid = document.getElementById('accent-recommended-grid');
        if (grid) grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:1rem;color:var(--text-muted);font-size:.75rem;"><i class="fa fa-sync fa-spin"></i> Loading…</div>`;
        loadRecommended();
    });

    /* Advanced toggle */
    on('accent-adv-toggle', 'click', () => {
        const btn  = document.getElementById('accent-adv-toggle');
        const body = document.getElementById('accent-adv-body');
        if (!btn || !body) return;
        const open = body.classList.toggle('open');
        btn.classList.toggle('open', open);
    });

    /* Gradient enable toggle */
    on('gradient-enable-chk', 'change', e => {
        STATE.gradientEnabled = e.target.checked;
        localStorage.setItem(GRADIENT_EN_KEY, STATE.gradientEnabled);
        if (STATE.gradientEnabled) {
            setCssVar('--accent-gradient', buildGradientCSS(STATE.currentHex));
        } else {
            document.documentElement.style.removeProperty('--accent-gradient');
        }
        toast(STATE.gradientEnabled ? 'Gradient mode ON' : 'Gradient mode OFF',
              STATE.gradientEnabled ? 'check-circle' : 'times-circle');
    });

    // Restore gradient checkbox
    const chk = document.getElementById('gradient-enable-chk');
    if (chk) chk.checked = STATE.gradientEnabled;

    /* Gradient type buttons */
    document.querySelectorAll('.gradient-type-btn').forEach(btn => {
        btn.addEventListener('click', () => setGradientType(btn.dataset.type));
    });
    // Restore
    setGradientType(STATE.gradient.type);

    /* Gradient stop swap */
    on('gradient-swap-btn', 'click', () => {
        [STATE.gradient.stop1, STATE.gradient.stop2] = [STATE.gradient.stop2, STATE.gradient.stop1];
        saveJson(GRADIENT_KEY, STATE.gradient);
        updateGradientPreview(STATE.currentHex);
    });

    /* Split buttons — main action */
    document.querySelectorAll('.accent-split-main').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            let hex = null;
            if (action === 'rand-spectrum') hex = randomizeSpectrum('any');
            else if (action === 'rand-presets') hex = randomizeFromPresets('random');
            else if (action === 'rand-recommended') hex = randomizeFromRecommended('random');
            if (hex) { animateRandBtn(action); applyAccent(hex); }
        });
    });

    /* Split arrows — dropdown toggle */
    document.querySelectorAll('.accent-split-arrow').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const id = btn.dataset.menu;
            const container = document.getElementById(id);
            const isOpen = container?.classList.contains('menu-open');
            closeAllMenus();
            if (!isOpen && container) {
                container.classList.add('menu-open');
                STATE.openMenuId = id;
            }
        });
    });

    /* Dropdown menu items */
    document.querySelectorAll('.split-menu-item').forEach(item => {
        item.addEventListener('click', e => {
            e.stopPropagation();
            const action = item.dataset.menuAction;
            let hex = null;
            if (action === 'rand-spectrum-0') hex = randomizeSpectrum('any');
            else if (action === 'rand-spectrum-1') hex = randomizeSpectrum('vivid');
            else if (action === 'rand-spectrum-2') hex = randomizeSpectrum('light');
            else if (action === 'rand-spectrum-3') hex = randomizeSpectrum('dark');
            else if (action === 'rand-presets-0')  hex = randomizeFromPresets('random');
            else if (action === 'rand-presets-1')  hex = randomizeFromPresets('newest');
            else if (action === 'rand-presets-2')  hex = randomizeFromPresets('oldest');
            else if (action === 'rand-recommended-0') hex = randomizeFromRecommended('random');
            else if (action === 'rand-recommended-1') hex = randomizeFromRecommended('popular');

            if (hex) {
                const btnId = action.split('-').slice(0,2).join('-');
                animateRandBtn(btnId);
                applyAccent(hex);
            }
            closeAllMenus();
        });
    });

    /* Close menus on outside click */
    document.addEventListener('click', () => closeAllMenus());

    /* History clear */
    on('history-clear', 'click', () => {
        STATE.history = [];
        saveJson(HISTORY_KEY, STATE.history);
        renderHistory();
        toast('History cleared', 'trash');
    });

    /* Quick adjust buttons */
    document.querySelectorAll('.accent-quick-btn[data-adjust]').forEach(btn => {
        btn.addEventListener('click', () => {
            const a = btn.dataset.adjust;
            let hex = STATE.currentHex;
            if (a === 'lighten-10')    hex = adjustLightness(hex, 10);
            else if (a === 'darken-10')     hex = adjustLightness(hex, -10);
            else if (a === 'saturate-15')   hex = adjustSaturation(hex, 15);
            else if (a === 'desaturate-15') hex = adjustSaturation(hex, -15);
            else if (a === 'complement')    hex = shiftHue(hex, 180);
            else if (a === 'triadic-2')     hex = shiftHue(hex, 120);
            else if (a === 'split-1')       hex = shiftHue(hex, 150);
            else if (a === 'warmer')        hex = shiftHue(hex, -20);
            else if (a === 'cooler')        hex = shiftHue(hex, +20);
            applyAccent(hex);
        });
    });

    /* Export / Import */
    on('export-presets-btn', 'click', exportPresets);
    on('import-presets-btn', 'click', () => document.getElementById('import-file-input')?.click());
    const fileInput = document.getElementById('import-file-input');
    if (fileInput) fileInput.addEventListener('change', e => { if (e.target.files[0]) importPresets(e.target.files[0]); });
    on('copy-css-all-btn', 'click', copyCSSAll);

    /* Live pill click — scroll to picker */
    on('accent-live-pill', 'click', () => {
        const picker = document.getElementById('accent-pickr-mount');
        picker?.scrollIntoView({ behavior:'smooth', block:'center' });
    });
}

function on(id, event, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, fn);
}

function closeAllMenus() {
    document.querySelectorAll('.accent-split-btn.menu-open').forEach(b => b.classList.remove('menu-open'));
    STATE.openMenuId = null;
}

/* ── Init ───────────────────────────────────────────────── */
function init() {
    buildHTML();
    initMainPickr();
    initHexInput();
    initIntensitySlider();
    initDirKnob();
    renderPresetGrid();
    renderHistory();
    loadRecommended();
    bindEvents();
    updateAllUI(STATE.currentHex);

    // Restore gradient checkbox state
    const chk = document.getElementById('gradient-enable-chk');
    if (chk) chk.checked = STATE.gradientEnabled;

    console.log('[AccentTab] Initialized ✓');
}

/* Run once DOM is ready */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

})();
