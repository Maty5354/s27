/* ========================================
   ACCENT COLOR TAB — accent.js

   ╔══════════════════════════════════════════╗
   ║  INPUT COMPONENTS CONTRACT               ║
   ║                                          ║
   ║  All interactive controls MUST mirror    ║
   ║  the EXACT HTML + behavior from the      ║
   ║  Base tab:                               ║
   ║                                          ║
   ║  • .cb-segmented  → format switcher      ║
   ║  • .cb-toggle     → experimental flags   ║
   ║  • .cb-range      → (reserved/future)    ║
   ║  • .cb-text-field → preset name input    ║
   ║                                          ║
   ║  New component: .accent-split-btn        ║
   ║  (split randomize button — not in base   ║
   ║   tab, but mirrors its styling tokens)   ║
   ║                                          ║
   ║  All IDs use "accent-" prefix to avoid   ║
   ║  collisions with base tab elements.      ║
   ╚══════════════════════════════════════════╝
   ======================================== */

(function () {
    "use strict";

    /* ════════════════════════════════════════
       CONSTANTS
       ════════════════════════════════════════ */
    const KEY_COLOR       = "customization-accent-color";
    const KEY_PRESETS     = "customization-accent-presets";
    const KEY_FORMAT      = "customization-accent-format";   // hex | rgb | hsl
    const KEY_EXP         = "customization-accent-experimental";

    /* Curated color palette organized by family */
    const RECOMMENDED_PALETTES = [
        {
            name: "Ocean",
            icon: "fa-water",
            colors: [
                { hex: "#6196ff", name: "Indigo" },
                { hex: "#3b82f6", name: "Blue" },
                { hex: "#0ea5e9", name: "Sky" },
                { hex: "#06b6d4", name: "Cyan" },
                { hex: "#0891b2", name: "Teal" },
                { hex: "#0284c7", name: "Azure" }
            ]
        },
        {
            name: "Bloom",
            icon: "fa-heart",
            colors: [
                { hex: "#ef4444", name: "Red" },
                { hex: "#f43f5e", name: "Rose" },
                { hex: "#e11d48", name: "Crimson" },
                { hex: "#ec4899", name: "Pink" },
                { hex: "#db2777", name: "Magenta" },
                { hex: "#fb7185", name: "Blush" }
            ]
        },
        {
            name: "Violet",
            icon: "fa-gem",
            colors: [
                { hex: "#8b5cf6", name: "Violet" },
                { hex: "#a855f7", name: "Purple" },
                { hex: "#d946ef", name: "Fuchsia" },
                { hex: "#7c3aed", name: "Amethyst" },
                { hex: "#9333ea", name: "Plum" },
                { hex: "#c026d3", name: "Orchid" }
            ]
        },
        {
            name: "Nature",
            icon: "fa-leaf",
            colors: [
                { hex: "#10b981", name: "Emerald" },
                { hex: "#22c55e", name: "Green" },
                { hex: "#84cc16", name: "Lime" },
                { hex: "#14b8a6", name: "Teal" },
                { hex: "#059669", name: "Forest" },
                { hex: "#16a34a", name: "Sage" }
            ]
        },
        {
            name: "Warmth",
            icon: "fa-fire",
            colors: [
                { hex: "#f59e0b", name: "Amber" },
                { hex: "#f97316", name: "Orange" },
                { hex: "#fb923c", name: "Peach" },
                { hex: "#fbbf24", name: "Gold" },
                { hex: "#d97706", name: "Honey" },
                { hex: "#ea580c", name: "Rust" }
            ]
        },
        {
            name: "Slate",
            icon: "fa-circle",
            colors: [
                { hex: "#6b7280", name: "Gray" },
                { hex: "#64748b", name: "Slate" },
                { hex: "#78716c", name: "Stone" },
                { hex: "#71717a", name: "Zinc" },
                { hex: "#52525b", name: "Charcoal" },
                { hex: "#475569", name: "Steel" }
            ]
        }
    ];

    /* Randomize modes for the split button dropdown */
    const RANDOMIZE_MODES = [
        { id: "any",    icon: "fa-shuffle",    label: "Any Color" },
        { id: "warm",   icon: "fa-fire",       label: "Warm Tones" },
        { id: "cool",   icon: "fa-snowflake",  label: "Cool Tones" },
        { id: "pastel", icon: "fa-cloud",      label: "Pastel" },
        { id: "neon",   icon: "fa-bolt",       label: "Neon" },
        { id: "earth",  icon: "fa-mountain",   label: "Earthy" }
    ];

    /* Harmony types for the harmony preview */
    const HARMONY_TYPES = [
        { id: "base",          label: "Base",          offset: 0   },
        { id: "complement",    label: "Comp",          offset: 180 },
        { id: "split-a",       label: "Split-A",       offset: 150 },
        { id: "split-b",       label: "Split-B",       offset: 210 },
        { id: "analogous-a",   label: "Ana-A",         offset: 30  },
        { id: "analogous-b",   label: "Ana-B",         offset: -30 },
        { id: "triadic-a",     label: "Tri-A",         offset: 120 },
        { id: "triadic-b",     label: "Tri-B",         offset: 240 }
    ];

    /* ════════════════════════════════════════
       STATE
       ════════════════════════════════════════ */
    let currentColor   = localStorage.getItem(KEY_COLOR) || "#6196ff";
    let displayFormat  = localStorage.getItem(KEY_FORMAT) || "hex";   // hex | rgb | hsl
    let presets        = [];
    let expFlags       = {};
    let pickrInstance  = null;
    let section        = null;
    let isSaveRowOpen  = false;
    let nameOverlay    = null;
    let pendingPresetColor = null;

    /* ════════════════════════════════════════
       SECTION INJECTION
       ════════════════════════════════════════ */
    function createSection() {
        const content = document.querySelector(".custom-content");
        if (!content) return;

        section = document.createElement("div");
        section.className = "custom-section";
        section.id        = "accentSection";

        section.innerHTML = buildSectionHTML();

        /* Insert before baseSection */
        const base = document.getElementById("baseSection");
        base ? content.insertBefore(section, base) : content.prepend(section);

        /* Mark active if it's the current tab */
        const tabBtn = document.querySelector('.sidebar-item[data-section="accent"]');
        if (tabBtn && tabBtn.classList.contains("active")) {
            section.classList.add("active");
        }
    }

    function buildSectionHTML() {
        return `
        <!-- ════ STICKY HEADER ════ -->
        <div class="accent-header" id="accentHeader">
            <div class="accent-header-top">

                <!-- Info -->
                <div class="accent-header-info">
                    <div class="accent-header-icon-wrap" id="accentHeaderIconWrap">
                        <i class="fa-solid fa-droplet"></i>
                    </div>
                    <div class="accent-header-text">
                        <h3>Accent Color</h3>
                        <p class="accent-tab-desc">
                            Choose the highlight color used across buttons, links &amp; interactive elements.
                        </p>
                    </div>
                </div>

                <!-- Actions -->
                <div class="accent-header-actions">

                    <!-- SPLIT RANDOMIZE BUTTON -->
                    <div class="accent-split-btn" id="accentSplitBtn">
                        <button class="accent-split-btn-main" id="accentRandomizeBtn" title="Randomize accent color">
                            <i class="fa-solid fa-shuffle"></i>
                            <span>Randomize</span>
                        </button>
                        <div class="accent-split-divider"></div>
                        <button class="accent-split-btn-arrow" id="accentRandomizeTrigger" aria-label="Randomize options">
                            <i class="fa-solid fa-chevron-down"></i>
                        </button>
                        <div class="accent-split-dropdown" id="accentRandomizeDropdown">
                            ${RANDOMIZE_MODES.map(m => `
                                <button class="accent-split-dropdown-item" data-rand-mode="${m.id}">
                                    <i class="fa-solid ${m.icon}"></i>
                                    ${m.label}
                                </button>
                            `).join("")}
                        </div>
                    </div>

                    <!-- FORMAT SWITCHER — mirrors cb-segmented (base item 5) -->
                    <div class="accent-format-wrap">
                        <span class="accent-format-label">Format</span>
                        <div class="cb-segmented" id="accentFormatSeg" data-segmented>
                            <button class="cb-segmented-btn${displayFormat === "hex" ? " active" : ""}" data-fmt="hex">HEX</button>
                            <button class="cb-segmented-btn${displayFormat === "rgb" ? " active" : ""}" data-fmt="rgb">RGB</button>
                            <button class="cb-segmented-btn${displayFormat === "hsl" ? " active" : ""}" data-fmt="hsl">HSL</button>
                        </div>
                    </div>

                    <!-- SCROLL TO TOP -->
                    <button class="accent-header-icon-btn" id="accentScrollTopBtn" title="Scroll to top" aria-label="Scroll to top">
                        <i class="fa-solid fa-arrow-up"></i>
                    </button>

                    <!-- RESET TO DEFAULT -->
                    <button class="accent-header-icon-btn danger" id="accentResetBtn" title="Reset to default accent" aria-label="Reset accent color">
                        <i class="fa-solid fa-rotate-left"></i>
                    </button>

                </div>
            </div>

            <!-- Live color strip -->
            <div class="accent-live-strip">
                <div class="accent-live-strip-fill" id="accentLiveStrip"></div>
            </div>
        </div>

        <!-- ════ MAIN GRID ════ -->
        <div class="accent-main-grid">

            <!-- ── LEFT: Picker + Recommended ── -->
            <div class="accent-picker-col">

                <!-- Color Picker Card -->
                <div class="accent-card">
                    <div class="accent-card-header">
                        <span class="accent-card-title">
                            <i class="fa-solid fa-palette"></i>
                            Color Picker
                        </span>
                    </div>
                    <div class="accent-card-body">
                        <div class="accent-picker-inner">
                            <!-- Pickr container -->
                            <div class="accent-pickr-wrap">
                                <div id="accentPickrContainer"></div>
                            </div>

                            <!-- Color info panel -->
                            <div class="accent-color-info-panel">
                                <!-- Big swatch preview -->
                                <div class="accent-preview-swatch" id="accentPreviewSwatch" title="Current accent color">
                                    <span class="accent-preview-swatch-label" id="accentSwatchLabel">Active</span>
                                </div>

                                <!-- Value display -->
                                <div class="accent-value-row">
                                    <input
                                        type="text"
                                        class="accent-value-input"
                                        id="accentValueInput"
                                        value=""
                                        spellcheck="false"
                                        autocomplete="off"
                                        aria-label="Color value"
                                    />
                                    <button class="accent-value-copy-btn" id="accentCopyBtn" title="Copy to clipboard" aria-label="Copy color value">
                                        <i class="fa-regular fa-copy"></i>
                                    </button>
                                </div>

                                <!-- Save as preset -->
                                <button class="accent-save-preset-btn" id="accentSavePresetBtn">
                                    <i class="fa-solid fa-bookmark"></i>
                                    Save as Preset
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recommended Colors Card -->
                <div class="accent-card accent-recommended-card">
                    <div class="accent-card-header">
                        <span class="accent-card-title">
                            <i class="fa-solid fa-swatchbook"></i>
                            Recommended Colors
                        </span>
                    </div>
                    <div class="accent-card-body">
                        <div class="accent-categories" id="accentCategories">
                            ${buildRecommendedHTML()}
                        </div>
                    </div>
                </div>

            </div>

            <!-- ── RIGHT: Presets ── -->
            <div class="accent-presets-col">
                <div class="accent-card accent-presets-card">
                    <div class="accent-card-header">
                        <span class="accent-card-title">
                            <i class="fa-solid fa-bookmark"></i>
                            My Presets
                        </span>
                        <span id="accentPresetsCount" style="font-size:0.7rem;color:var(--text-muted);">0 saved</span>
                    </div>
                    <div class="accent-card-body">
                        <div class="accent-presets-grid" id="accentPresetsGrid"></div>
                        <div class="accent-presets-empty" id="accentPresetsEmpty">
                            <i class="fa-solid fa-jar"></i>
                            <p>No presets yet</p>
                            <span>Save your favourite colors above</span>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        <!-- ════ EXPERIMENTAL ════ -->
        <div class="accent-experimental-section">
            <div class="accent-exp-header">
                <div>
                    <h4><i class="fa-solid fa-flask"></i> Experimental</h4>
                    <p class="accent-exp-desc">
                        Advanced accent color tools. These features may change in future updates.
                    </p>
                </div>
                <span class="accent-exp-badge">
                    <i class="fa-solid fa-triangle-exclamation"></i> Beta
                </span>
            </div>

            <div class="accent-exp-grid" id="accentExpGrid">

                <!-- 1. Contrast Checker -->
                <div class="accent-exp-card" id="expContrastCard">
                    <div class="accent-exp-card-header">
                        <div class="accent-exp-card-info">
                            <div class="accent-exp-card-title">
                                <i class="fa-solid fa-circle-half-stroke"></i>
                                Contrast Checker
                            </div>
                            <div class="accent-exp-card-desc">
                                WCAG AA/AAA compliance against page background.
                            </div>
                        </div>
                    </div>
                    <div class="accent-contrast-display" id="accentContrastDisplay">
                        <div class="accent-contrast-ratio" id="accentContrastRatio">—</div>
                        <div class="accent-contrast-badges" id="accentContrastBadges"></div>
                        <div class="accent-contrast-against" id="accentContrastAgainst">vs. background</div>
                    </div>
                </div>

                <!-- 2. Color Harmony -->
                <div class="accent-exp-card" id="expHarmonyCard">
                    <div class="accent-exp-card-header">
                        <div class="accent-exp-card-info">
                            <div class="accent-exp-card-title">
                                <i class="fa-solid fa-atom"></i>
                                Color Harmony
                            </div>
                            <div class="accent-exp-card-desc">
                                Harmonious colors derived from your accent. Click to apply.
                            </div>
                        </div>
                    </div>
                    <div class="accent-harmony-swatches" id="accentHarmonySwatches"></div>
                </div>

                <!-- 3. Tint & Shade Scale -->
                <div class="accent-exp-card" id="expTintCard">
                    <div class="accent-exp-card-header">
                        <div class="accent-exp-card-info">
                            <div class="accent-exp-card-title">
                                <i class="fa-solid fa-layer-group"></i>
                                Tint & Shade Scale
                            </div>
                            <div class="accent-exp-card-desc">
                                Auto-generated scale from light tint to deep shade. Click to apply.
                            </div>
                        </div>
                    </div>
                    <div class="accent-tint-strip" id="accentTintStrip"></div>
                    <div class="accent-tint-labels">
                        <span>Lighter</span>
                        <span>Darker</span>
                    </div>
                </div>

                <!-- 4. Gradient Accent Mode — mirrors cb-toggle (base item 2) -->
                <div class="accent-exp-card" id="expGradientCard">
                    <div class="accent-exp-card-header">
                        <div class="accent-exp-card-info">
                            <div class="accent-exp-card-title">
                                <i class="fa-solid fa-wand-sparkles"></i>
                                Gradient Accent
                            </div>
                            <div class="accent-exp-card-desc">
                                Blend the accent into a subtle two-stop gradient on key elements.
                            </div>
                        </div>
                        <!-- EXACT cb-toggle structure from base tab item 2 -->
                        <label class="cb-toggle" id="expGradientToggleLabel" aria-label="Toggle gradient accent">
                            <input type="checkbox" id="expGradientToggle" />
                            <span class="cb-toggle-track"></span>
                            <span class="cb-toggle-thumb"></span>
                        </label>
                    </div>
                    <div class="accent-gradient-preview" id="accentGradientPreview"></div>
                </div>

            </div>
        </div>

        <!-- Name preset overlay (rendered separately via JS) -->
        `;
    }

    function buildRecommendedHTML() {
        return RECOMMENDED_PALETTES.map(palette => `
            <div class="accent-category-row" data-palette="${palette.name}">
                <div class="accent-category-label">
                    ${palette.name}
                </div>
                <div class="accent-swatches">
                    ${palette.colors.map(c => `
                        <button
                            class="accent-swatch-btn"
                            style="background:${c.hex};"
                            data-color="${c.hex}"
                            title="${c.name} — ${c.hex}"
                            aria-label="${c.name}"
                        ></button>
                    `).join("")}
                </div>
            </div>
        `).join("");
    }

    /* ════════════════════════════════════════
       STATE PERSISTENCE
       ════════════════════════════════════════ */
    function loadState() {
        currentColor  = localStorage.getItem(KEY_COLOR) || "#6196ff";
        displayFormat = localStorage.getItem(KEY_FORMAT) || "hex";
        try { presets  = JSON.parse(localStorage.getItem(KEY_PRESETS) || "[]"); } catch { presets  = []; }
        try { expFlags = JSON.parse(localStorage.getItem(KEY_EXP)     || "{}"); } catch { expFlags = {}; }
    }

    function saveState() {
        localStorage.setItem(KEY_FORMAT,  displayFormat);
        localStorage.setItem(KEY_PRESETS, JSON.stringify(presets));
        localStorage.setItem(KEY_EXP,     JSON.stringify(expFlags));
    }

    /* ════════════════════════════════════════
       COLOR APPLICATION
       ════════════════════════════════════════ */
    /**
     * Apply a color: sets --accent-color, persists, refreshes UI.
     * Fires a custom event so other modules (themes.js) can react.
     */
    function applyColor(hex, source = "direct") {
        const prev = currentColor;
        currentColor = normalizeHex(hex);

        document.documentElement.style.setProperty("--accent-color", currentColor);
        localStorage.setItem(KEY_COLOR, currentColor);

        updateAllUI();

        if (prev !== currentColor) {
            const swatch = document.getElementById("accentPreviewSwatch");
            swatch?.classList.remove("just-changed");
            requestAnimationFrame(() => swatch?.classList.add("just-changed"));
            setTimeout(() => swatch?.classList.remove("just-changed"), 600);
        }

        // Notify other modules
        window.dispatchEvent(new CustomEvent("accent:colorChanged", {
            detail: { color: currentColor, source }
        }));

        // If Pickr exists and this wasn't triggered by Pickr itself, update it
        if (pickrInstance && source !== "pickr") {
            pickrInstance.setColor(currentColor, true);
        }
    }

    /* ════════════════════════════════════════
       PICKR INITIALIZATION
       ════════════════════════════════════════ */
    function initPickr() {
        const container = document.getElementById("accentPickrContainer");
        if (!container || !window.Pickr) return;

        // Destroy previous instance if it exists
        if (pickrInstance) {
            try { pickrInstance.destroy(); } catch {}
            pickrInstance = null;
        }

        pickrInstance = Pickr.create({
            el:      "#accentPickrContainer",
            theme:   "classic",
            default: currentColor,
            inline:  true,   // Render inline instead of popup
            components: {
                preview:  true,
                opacity:  false,
                hue:      true,
                interaction: {
                    hex:   true,
                    rgba:  true,
                    hsla:  true,
                    input: true,
                    save:  false,
                    clear: false
                }
            }
        });

        pickrInstance.on("change", (color) => {
            if (!color) return;
            let hex = color.toHEXA().toString(0);
            if (hex.length > 7) hex = hex.slice(0, 7);
            currentColor = normalizeHex(hex);
            updateAllUI();
            // Persist and fire event on change (debounced via the updateAllUI path)
            document.documentElement.style.setProperty("--accent-color", currentColor);
            localStorage.setItem(KEY_COLOR, currentColor);
            window.dispatchEvent(new CustomEvent("accent:colorChanged", {
                detail: { color: currentColor, source: "pickr" }
            }));
        });

        pickrInstance.on("save", (color) => {
            if (!color) return;
            let hex = color.toHEXA().toString(0);
            if (hex.length > 7) hex = hex.slice(0, 7);
            applyColor(hex, "pickr");
        });
    }

    /* ════════════════════════════════════════
       UI UPDATES
       ════════════════════════════════════════ */
    function updateAllUI() {
        updateLiveStrip();
        updateHeaderIcon();
        updateValueDisplay();
        updatePreviewSwatch();
        updateSwatchActiveStates();
        updatePresetsActiveState();
        updateContrastChecker();
        updateHarmonySwatches();
        updateTintStrip();
        updateGradientPreview();
        updatePickrBackground();
    }

    function updateLiveStrip() {
        const strip = document.getElementById("accentLiveStrip");
        if (strip) {
            strip.style.background = currentColor;
            strip.style.boxShadow = `0 0 12px ${currentColor}80`;
        }
    }

    function updateHeaderIcon() {
        const wrap = document.getElementById("accentHeaderIconWrap");
        if (wrap) {
            wrap.style.background = `color-mix(in srgb, ${currentColor} 15%, transparent)`;
            wrap.style.borderColor = `color-mix(in srgb, ${currentColor} 35%, transparent)`;
            wrap.style.color = currentColor;
        }
    }

    function updatePreviewSwatch() {
        const swatch = document.getElementById("accentPreviewSwatch");
        if (swatch) {
            swatch.style.background    = currentColor;
            swatch.style.boxShadow     = `0 4px 16px ${currentColor}60`;
        }
    }

    function updateValueDisplay() {
        const input = document.getElementById("accentValueInput");
        if (!input) return;
        input.value = formatColor(currentColor, displayFormat);
    }

    function updateSwatchActiveStates() {
        const btns = section?.querySelectorAll(".accent-swatch-btn");
        if (!btns) return;
        btns.forEach(btn => {
            const isMatch = normalizeHex(btn.dataset.color) === normalizeHex(currentColor);
            btn.classList.toggle("active", isMatch);
        });
    }

    function updatePresetsActiveState() {
        const items = section?.querySelectorAll(".accent-preset-item");
        if (!items) return;
        items.forEach(item => {
            const isMatch = normalizeHex(item.dataset.color) === normalizeHex(currentColor);
            item.classList.toggle("active", isMatch);
        });
    }

    function updatePickrBackground() {
        /* Keep Pickr's toggle button hidden in inline mode */
        const btn = section?.querySelector(".pcr-button");
        if (btn) btn.style.display = "none";
    }

    /* ════════════════════════════════════════
       COLOR FORMATTING
       ════════════════════════════════════════ */
    function formatColor(hex, fmt) {
        const { r, g, b } = hexToRGB(hex);
        switch (fmt) {
            case "rgb":
                return `rgb(${r}, ${g}, ${b})`;
            case "hsl": {
                const { h, s, l } = rgbToHSL(r, g, b);
                return `hsl(${h}, ${s}%, ${l}%)`;
            }
            default:
                return normalizeHex(hex).toUpperCase();
        }
    }

    /* ════════════════════════════════════════
       RECOMMENDED SWATCHES
       ════════════════════════════════════════ */
    function bindSwatchEvents() {
        section?.querySelectorAll(".accent-swatch-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                applyColor(btn.dataset.color, "swatch");
                showToast(
                    `<i class="fa-solid fa-droplet"></i> Applied <strong>${btn.title.split(" — ")[0]}</strong>`,
                    "success", 2200
                );
            });
        });
    }

    /* ════════════════════════════════════════
       PRESETS SYSTEM
       ════════════════════════════════════════ */
    function renderPresets() {
        const grid  = document.getElementById("accentPresetsGrid");
        const empty = document.getElementById("accentPresetsEmpty");
        const count = document.getElementById("accentPresetsCount");

        if (!grid || !empty) return;

        count && (count.textContent = `${presets.length} saved`);

        if (presets.length === 0) {
            grid.innerHTML = "";
            empty.style.display = "flex";
            return;
        }

        empty.style.display = "none";
        grid.innerHTML = presets.map((p, i) => `
            <div
                class="accent-preset-item${normalizeHex(p.color) === normalizeHex(currentColor) ? " active" : ""}"
                data-color="${p.color}"
                data-preset-idx="${i}"
                title="${escHtml(p.name)} — ${p.color}"
                role="button"
                tabindex="0"
            >
                <div class="accent-preset-swatch" style="background:${p.color};"></div>
                <span class="accent-preset-name">${escHtml(p.name)}</span>
                <button
                    class="accent-preset-delete"
                    data-del-idx="${i}"
                    aria-label="Delete preset ${escHtml(p.name)}"
                    title="Delete"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        `).join("");

        /* Bind preset click */
        grid.querySelectorAll(".accent-preset-item").forEach(item => {
            item.addEventListener("click", e => {
                if (e.target.closest(".accent-preset-delete")) return;
                applyColor(item.dataset.color, "preset");
                showToast(
                    `<i class="fa-solid fa-bookmark"></i> Preset <strong>${escHtml(presets[item.dataset.presetIdx]?.name || "")}</strong>`,
                    "success", 2200
                );
            });
            item.addEventListener("keydown", e => {
                if (e.key === "Enter") item.click();
            });
        });

        /* Bind delete buttons */
        grid.querySelectorAll(".accent-preset-delete").forEach(btn => {
            btn.addEventListener("click", e => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.delIdx);
                if (!Number.isNaN(idx)) deletePreset(idx);
            });
        });
    }

    function openSavePresetModal(colorToSave) {
        pendingPresetColor = colorToSave;

        // Build or reuse overlay
        if (!nameOverlay) {
            nameOverlay = document.createElement("div");
            nameOverlay.className = "accent-name-overlay";
            nameOverlay.id = "accentNameOverlay";
            nameOverlay.innerHTML = `
                <div class="accent-name-modal" role="dialog" aria-modal="true" aria-labelledby="accentNameTitle">
                    <h4 id="accentNameTitle"><i class="fa-solid fa-bookmark"></i> Save Preset</h4>
                    <div class="accent-name-swatch-row">
                        <div class="accent-name-swatch" id="accentNameSwatch"></div>
                        <div class="cb-text-field" style="flex:1;">
                            <input type="text" id="accentNameInput" placeholder=" " maxlength="24" autocomplete="off" />
                            <label for="accentNameInput">Preset name</label>
                        </div>
                    </div>
                    <div class="accent-name-actions">
                        <button class="accent-name-btn-cancel" id="accentNameCancel">Cancel</button>
                        <button class="accent-name-btn-save" id="accentNameSave">
                            <i class="fa-solid fa-check"></i> Save
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(nameOverlay);

            /* Static events */
            nameOverlay.addEventListener("click", e => {
                if (e.target === nameOverlay) closeNameModal();
            });
            document.getElementById("accentNameCancel")?.addEventListener("click", closeNameModal);
            document.getElementById("accentNameSave")?.addEventListener("click", confirmSavePreset);
            document.getElementById("accentNameInput")?.addEventListener("keydown", e => {
                if (e.key === "Enter") confirmSavePreset();
                if (e.key === "Escape") closeNameModal();
            });
        }

        /* Update swatch */
        const swatchEl = document.getElementById("accentNameSwatch");
        const nameInput = document.getElementById("accentNameInput");
        if (swatchEl) {
            swatchEl.style.background = pendingPresetColor;
            swatchEl.style.boxShadow  = `0 2px 8px ${pendingPresetColor}60`;
        }
        if (nameInput) {
            nameInput.value = "";
            // Suggest a name from palette
            const suggested = findColorName(pendingPresetColor);
            nameInput.placeholder = suggested || "My Color";
        }

        nameOverlay.classList.add("active");
        document.body.style.overflow = "hidden";
        setTimeout(() => document.getElementById("accentNameInput")?.focus(), 250);
    }

    function closeNameModal() {
        nameOverlay?.classList.remove("active");
        document.body.style.overflow = "";
        pendingPresetColor = null;
    }

    function confirmSavePreset() {
        const input  = document.getElementById("accentNameInput");
        const color  = pendingPresetColor || currentColor;
        const rawName = input?.value.trim();
        const name   = rawName || findColorName(color) || "My Color";

        // Avoid exact duplicates
        if (presets.some(p => normalizeHex(p.color) === normalizeHex(color))) {
            showToast(
                `<i class="fa-solid fa-triangle-exclamation"></i> That color is already saved`,
                "warning", 2500
            );
            closeNameModal();
            return;
        }

        presets.push({
            id:        "preset-" + Date.now(),
            name,
            color,
            createdAt: Date.now()
        });

        saveState();
        renderPresets();
        closeNameModal();

        showToast(
            `<i class="fa-solid fa-bookmark"></i> Saved <strong>${escHtml(name)}</strong>`,
            "success"
        );
    }

    function deletePreset(idx) {
        const removed = presets.splice(idx, 1)[0];
        saveState();
        renderPresets();
        showToast(
            `<i class="fa-solid fa-trash"></i> Preset "<strong>${escHtml(removed?.name || "")}</strong>" removed`,
            "danger", 2200
        );
    }

    function findColorName(hex) {
        const norm = normalizeHex(hex);
        for (const palette of RECOMMENDED_PALETTES) {
            for (const c of palette.colors) {
                if (normalizeHex(c.hex) === norm) return c.name;
            }
        }
        return null;
    }

    /* ════════════════════════════════════════
       RANDOMIZE
       ════════════════════════════════════════ */
    function randomizeColor(mode = "any") {
        let hex;
        switch (mode) {
            case "warm":   hex = randomInRange([0,  50], [70, 100], [40, 70]); break;
            case "cool":   hex = randomInRange([180, 260], [60, 100], [40, 70]); break;
            case "pastel": hex = randomInRange([0,  360], [40,  70], [75, 90]); break;
            case "neon":   hex = randomInRange([0,  360], [90, 100], [50, 65]); break;
            case "earth":  hex = randomInRange([10,  50], [20,  55], [30, 60]); break;
            default:       hex = randomInRange([0,  360], [60, 100], [40, 70]); break;
        }
        applyColor(hex, "randomize");
        showToast(
            `<i class="fa-solid fa-shuffle"></i> New accent: <strong>${hex.toUpperCase()}</strong>`,
            "info", 2000
        );
    }

    /** Generate a random hex from HSL ranges */
    function randomInRange([hMin, hMax], [sMin, sMax], [lMin, lMax]) {
        const h = Math.round(hMin + Math.random() * (hMax - hMin)) % 360;
        const s = Math.round(sMin + Math.random() * (sMax - sMin));
        const l = Math.round(lMin + Math.random() * (lMax - lMin));
        return hslToHex(h, s, l);
    }

    /* ════════════════════════════════════════
       FORMAT SWITCHER
       ════════════════════════════════════════ */
    function initFormatSwitcher() {
        const seg = section?.querySelector("#accentFormatSeg");
        if (!seg) return;

        seg.querySelectorAll(".cb-segmented-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                seg.querySelectorAll(".cb-segmented-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                displayFormat = btn.dataset.fmt;
                saveState();
                updateValueDisplay();
            });
        });
    }

    /* ════════════════════════════════════════
       COPY TO CLIPBOARD
       ════════════════════════════════════════ */
    function copyCurrentValue() {
        const val = formatColor(currentColor, displayFormat);
        navigator.clipboard?.writeText(val).then(() => {
            const btn = document.getElementById("accentCopyBtn");
            if (!btn) return;
            btn.classList.add("copied");
            btn.innerHTML = '<i class="fa-solid fa-check"></i>';
            showToast(`<i class="fa-solid fa-copy"></i> Copied <strong>${val}</strong>`, "success", 1800);
            setTimeout(() => {
                btn.classList.remove("copied");
                btn.innerHTML = '<i class="fa-regular fa-copy"></i>';
            }, 2000);
        });
    }

    /* ════════════════════════════════════════
       MANUAL VALUE INPUT
       ════════════════════════════════════════ */
    function initValueInput() {
        const input = document.getElementById("accentValueInput");
        if (!input) return;

        input.addEventListener("blur", () => {
            const val = input.value.trim();
            let hex = parseColorInput(val, displayFormat);
            if (hex) {
                applyColor(hex, "manual");
            } else {
                updateValueDisplay(); // Reset to valid value
                showToast(`<i class="fa-solid fa-triangle-exclamation"></i> Invalid color value`, "warning", 2500);
            }
        });

        input.addEventListener("keydown", e => {
            if (e.key === "Enter") input.blur();
            if (e.key === "Escape") updateValueDisplay();
        });
    }

    function parseColorInput(val, fmt) {
        try {
            if (fmt === "hex") {
                const clean = val.startsWith("#") ? val : "#" + val;
                if (/^#[0-9a-fA-F]{6}$/.test(clean)) return clean;
            } else if (fmt === "rgb") {
                const m = val.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
                if (m) return rgbToHex(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]));
            } else if (fmt === "hsl") {
                const m = val.match(/hsl\s*\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?\s*\)/i);
                if (m) return hslToHex(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]));
            }
        } catch {}
        return null;
    }

    /* ════════════════════════════════════════
       EXPERIMENTAL FEATURES
       ════════════════════════════════════════ */

    /* ── Contrast Checker ─────────────────── */
    function updateContrastChecker() {
        const ratioEl   = document.getElementById("accentContrastRatio");
        const badgesEl  = document.getElementById("accentContrastBadges");
        const againstEl = document.getElementById("accentContrastAgainst");
        if (!ratioEl) return;

        const bgColor = getComputedStyle(document.documentElement)
            .getPropertyValue("--bg-color").trim() || "#f9f9f9";

        const ratio = getContrastRatio(currentColor, bgColor);
        const ratioStr = ratio.toFixed(2);

        ratioEl.textContent = `${ratioStr} : 1`;

        // Color-code the ratio text
        ratioEl.style.color =
            ratio >= 7   ? "#10b981" :
            ratio >= 4.5 ? "#f59e0b" :
            ratio >= 3   ? "#f97316" :
                           "var(--danger-color)";

        // WCAG badges
        const aa      = ratio >= 4.5;
        const aaLarge = ratio >= 3;
        const aaa     = ratio >= 7;

        badgesEl.innerHTML = `
            <span class="accent-wcag-badge ${aaa      ? "pass" : "fail"}">
                <i class="fa-solid fa-${aaa      ? "check" : "xmark"}"></i> AAA
            </span>
            <span class="accent-wcag-badge ${aa       ? "pass" : "fail"}">
                <i class="fa-solid fa-${aa       ? "check" : "xmark"}"></i> AA Normal
            </span>
            <span class="accent-wcag-badge ${aaLarge  ? "pass" : "fail"}">
                <i class="fa-solid fa-${aaLarge  ? "check" : "xmark"}"></i> AA Large
            </span>
        `;

        againstEl.textContent = `vs. background (${bgColor.toUpperCase()})`;
    }

    /* ── Harmony Swatches ─────────────────── */
    function updateHarmonySwatches() {
        const container = document.getElementById("accentHarmonySwatches");
        if (!container) return;

        const { h, s, l } = rgbToHSL(...Object.values(hexToRGB(currentColor)));

        const harmonies = HARMONY_TYPES.slice(0, 6).map(type => {
            const newH = ((h + type.offset) % 360 + 360) % 360;
            return {
                label: type.label,
                hex:   hslToHex(Math.round(newH), s, l),
                isCurrent: type.offset === 0
            };
        });

        container.innerHTML = harmonies.map(h => `
            <div class="accent-harmony-item">
                <div
                    class="accent-harmony-dot"
                    style="background:${h.hex}; ${h.isCurrent ? "border:2px solid var(--text-color);" : ""}"
                    data-harmony-color="${h.hex}"
                    title="${h.hex.toUpperCase()}"
                    role="button"
                    tabindex="0"
                    aria-label="Apply ${h.label}"
                ></div>
                <span class="accent-harmony-label">${h.label}</span>
            </div>
        `).join("");

        container.querySelectorAll(".accent-harmony-dot").forEach(dot => {
            dot.addEventListener("click", () => {
                applyColor(dot.dataset.harmonyColor, "harmony");
                showToast(`<i class="fa-solid fa-atom"></i> Harmony color applied`, "info", 2000);
            });
            dot.addEventListener("keydown", e => { if (e.key === "Enter") dot.click(); });
        });
    }

    /* ── Tint / Shade Strip ───────────────── */
    function updateTintStrip() {
        const strip = document.getElementById("accentTintStrip");
        if (!strip) return;

        const { h, s } = rgbToHSL(...Object.values(hexToRGB(currentColor)));
        const steps = [95, 85, 75, 60, 50, 40, 30, 20];

        strip.innerHTML = steps.map(lVal => {
            const tintHex = hslToHex(h, s, lVal);
            const isCurrent = Math.abs(lVal - getRoundedL(currentColor)) < 6;
            return `
                <div
                    class="accent-tint-swatch${isCurrent ? " is-current" : ""}"
                    style="background:${tintHex};"
                    data-tint-color="${tintHex}"
                    title="${tintHex.toUpperCase()} (L: ${lVal}%)"
                    role="button"
                    tabindex="0"
                    aria-label="Apply L:${lVal}% variant"
                ></div>
            `;
        }).join("");

        strip.querySelectorAll(".accent-tint-swatch").forEach(swatch => {
            swatch.addEventListener("click", () => {
                applyColor(swatch.dataset.tintColor, "tint");
                showToast(`<i class="fa-solid fa-layer-group"></i> Shade applied`, "info", 1800);
            });
            swatch.addEventListener("keydown", e => { if (e.key === "Enter") swatch.click(); });
        });
    }

    function getRoundedL(hex) {
        const { r, g, b } = hexToRGB(hex);
        const { l } = rgbToHSL(r, g, b);
        return l;
    }

    /* ── Gradient Mode ────────────────────── */
    function initGradientToggle() {
        const toggle = document.getElementById("expGradientToggle");
        if (!toggle) return;

        // Restore saved state
        toggle.checked = !!expFlags.gradientMode;
        applyGradientMode(toggle.checked);

        toggle.addEventListener("change", () => {
            expFlags.gradientMode = toggle.checked;
            applyGradientMode(toggle.checked);
            saveState();
            showToast(
                toggle.checked
                    ? `<i class="fa-solid fa-wand-sparkles"></i> Gradient mode enabled`
                    : `<i class="fa-solid fa-droplet"></i> Solid accent restored`,
                "info", 2000
            );
        });
    }

    function applyGradientMode(enabled) {
        if (enabled) {
            const { h, s, l } = rgbToHSL(...Object.values(hexToRGB(currentColor)));
            const sec = hslToHex((h + 30) % 360, Math.max(40, s - 10), Math.min(75, l + 10));
            document.documentElement.style.setProperty(
                "--accent-secondary", sec
            );
        }
        updateGradientPreview();
    }

    function updateGradientPreview() {
        const preview = document.getElementById("accentGradientPreview");
        const toggle  = document.getElementById("expGradientToggle");
        if (!preview) return;

        if (toggle?.checked) {
            const { h, s, l } = rgbToHSL(...Object.values(hexToRGB(currentColor)));
            const sec = hslToHex((h + 30) % 360, Math.max(40, s - 10), Math.min(75, l + 10));
            preview.style.background = `linear-gradient(135deg, ${currentColor} 0%, ${sec} 100%)`;
            preview.classList.add("gradient-enabled");
        } else {
            preview.style.background = currentColor;
            preview.classList.remove("gradient-enabled");
        }
    }

    /* ════════════════════════════════════════
       MAIN EVENT BINDINGS
       ════════════════════════════════════════ */
    function bindEvents() {
        if (!section) return;

        /* Randomize main button */
        section.querySelector("#accentRandomizeBtn")?.addEventListener("click", () => randomizeColor("any"));

        /* Randomize dropdown trigger */
        const trigger  = section.querySelector("#accentRandomizeTrigger");
        const dropdown = section.querySelector("#accentRandomizeDropdown");
        trigger?.addEventListener("click", e => {
            e.stopPropagation();
            trigger.classList.toggle("open");
            dropdown?.classList.toggle("open");
        });
        document.addEventListener("click", () => {
            trigger?.classList.remove("open");
            dropdown?.classList.remove("open");
        });

        /* Randomize dropdown items */
        section.querySelectorAll(".accent-split-dropdown-item").forEach(item => {
            item.addEventListener("click", () => {
                randomizeColor(item.dataset.randMode);
                trigger?.classList.remove("open");
                dropdown?.classList.remove("open");
            });
        });

        /* Copy button */
        section.querySelector("#accentCopyBtn")?.addEventListener("click", copyCurrentValue);

        /* Save preset button */
        section.querySelector("#accentSavePresetBtn")?.addEventListener("click", () => {
            openSavePresetModal(currentColor);
        });

        /* Swatch events */
        bindSwatchEvents();

        /* Scroll to top */
        section.querySelector("#accentScrollTopBtn")?.addEventListener("click", () => {
            const content = document.querySelector(".custom-content");
            content?.scrollTo({ top: 0, behavior: "smooth" });
        });

        /* Reset to default */
        section.querySelector("#accentResetBtn")?.addEventListener("click", () => {
            const DEFAULT = "#6196ff";
            applyColor(DEFAULT, "reset");
            pickrInstance?.setColor(DEFAULT, true);
            showToast(
                `<i class="fa-solid fa-rotate-left"></i> Reset to default <strong>${DEFAULT}</strong>`,
                "warning", 2500
            );
        });
    }

    /* ════════════════════════════════════════
       TOAST (re-uses themes.js toast system)
       ════════════════════════════════════════ */
    function showToast(message, type = "info", duration = 3500) {
        if (typeof window.themeTabShowToast === "function") {
            window.themeTabShowToast(message, type, duration);
            return;
        }
        /* Fallback */
        let container = document.getElementById("themesToastContainer");
        if (!container) {
            container = document.createElement("div");
            container.id = "themesToastContainer";
            container.className = "themes-toast-container";
            document.body.appendChild(container);
        }
        const id    = "at-" + Date.now();
        const toast = document.createElement("div");
        toast.id        = id;
        toast.className = `themes-toast themes-toast-${type}`;
        toast.innerHTML = `<span class="toast-message">${message}</span><button class="toast-close" aria-label="Dismiss"><i class="fa-solid fa-xmark"></i></button>`;
        container.appendChild(toast);
        requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add("visible")));
        toast.querySelector(".toast-close").addEventListener("click", () => dismissToast(id));
        if (duration > 0) setTimeout(() => dismissToast(id), duration);
    }

    function dismissToast(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove("visible");
        el.classList.add("hiding");
        setTimeout(() => el.remove(), 320);
    }

    /* ════════════════════════════════════════
       COLOR UTILITY FUNCTIONS
       ════════════════════════════════════════ */
    function normalizeHex(hex) {
        if (!hex) return "#000000";
        let h = hex.trim().replace("#", "");
        if (h.length === 3) h = h.split("").map(c => c + c).join("");
        return "#" + h.toLowerCase().slice(0, 6);
    }

    function hexToRGB(hex) {
        const h = normalizeHex(hex).replace("#", "");
        const n = parseInt(h, 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function rgbToHex(r, g, b) {
        return "#" + [r, g, b]
            .map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
            .join("");
    }

    function rgbToHSL(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0;
        const l = (max + min) / 2;

        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
    }

    function hslToHex(h, s, l) {
        h = ((h % 360) + 360) % 360;
        s /= 100; l /= 100;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        let r = 0, g = 0, b = 0;

        if      (h < 60)  { r = c; g = x; }
        else if (h < 120) { r = x; g = c; }
        else if (h < 180) { g = c; b = x; }
        else if (h < 240) { g = x; b = c; }
        else if (h < 300) { r = x; b = c; }
        else              { r = c; b = x; }

        return rgbToHex(
            Math.round((r + m) * 255),
            Math.round((g + m) * 255),
            Math.round((b + m) * 255)
        );
    }

    function luminance(hex) {
        const { r, g, b } = hexToRGB(hex);
        return [r, g, b].reduce((acc, v) => {
            v /= 255;
            return acc + (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)) *
                [0.2126, 0.7152, 0.0722][acc === 0 ? 0 : acc > 0.2 ? 2 : 1];
        }, 0);
    }

    function getContrastRatio(hex1, hex2) {
        function lum(hex) {
            const { r, g, b } = hexToRGB(hex);
            const vals = [r, g, b].map(v => {
                v /= 255;
                return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
            });
            return 0.2126 * vals[0] + 0.7152 * vals[1] + 0.0722 * vals[2];
        }
        const l1 = lum(hex1), l2 = lum(hex2);
        const lighter = Math.max(l1, l2);
        const darker  = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
    }

    function escHtml(str) {
        return String(str || "")
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    /* ════════════════════════════════════════
       BOOT
       ════════════════════════════════════════ */
    function boot() {
        loadState();
        createSection();

        if (!section) return;

        initPickr();
        initFormatSwitcher();
        initValueInput();
        initGradientToggle();
        renderPresets();
        bindEvents();
        updateAllUI();

        /* Re-render when section becomes active (lazy init for Pickr) */
        document.addEventListener("click", e => {
            const item = e.target.closest('.sidebar-item[data-section="accent"]');
            if (!item) return;
            /* Re-initialize Pickr if needed */
            setTimeout(() => {
                if (!pickrInstance) initPickr();
                updateAllUI();
            }, 80);
        });

        /* React to external accent color changes (e.g. from themes tab accent dots) */
        window.addEventListener("storage", e => {
            if (e.key === KEY_COLOR && e.newValue && e.newValue !== currentColor) {
                currentColor = e.newValue;
                updateAllUI();
                if (pickrInstance) {
                    pickrInstance.setColor(currentColor, true);
                }
            }
        });
    }

    /*
     * ╔══════════════════════════════════════════╗
     * ║  INPUT COMPONENTS REMINDER               ║
     * ║                                          ║
     * ║  Future additions to this tab MUST use:  ║
     * ║                                          ║
     * ║  Toggle:    .cb-toggle                   ║
     * ║  Range:     .cb-range + .cb-range-wrap   ║
     * ║  Segmented: .cb-segmented                ║
     * ║  Text:      .cb-text-field               ║
     * ║  Dropdown:  .cb-dropdown                 ║
     * ║  Checkbox:  .cb-checkbox                 ║
     * ║                                          ║
     * ║  The .accent-split-btn is a LOCAL        ║
     * ║  component but uses the same CSS         ║
     * ║  tokens as the cb- system.               ║
     * ║                                          ║
     * ║  New inputs need "accent-" ID prefix.    ║
     * ╚══════════════════════════════════════════╝
     */

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }

})();
