/* ========================================
   CUSTOMIZATION — THEMES TAB (REWORK)
   Loaded dynamically by customization.js
   ======================================== */

(async function ThemesTab() {
    "use strict";

    // ── State ───────────────────────────────
    const STATE = {
        themes: [],
        sort: "az",
        activeTags: new Set(),
        allTags: new Set(),
        query: "",
        activeThemeId: localStorage.getItem("app-theme-id") || "auto",
        creatorPickrs: [],  // active Pickr instances in creator
        editingId: null,    // null = new, string = editing existing user theme
    };

    // ── Color definitions for creator ───────
    const BASE_COLORS = [
        { var: "--bg-color",        label: "Background",    default: "#121212" },
        { var: "--card-bg",         label: "Card / Surface",default: "#1e1e1e" },
        { var: "--text-color",      label: "Main Text",     default: "#f0f0f0" },
        { var: "--text-muted",      label: "Muted Text",    default: "#a0a0a0" },
        { var: "--highlight-color", label: "Highlight",     default: "#333333" },
        { var: "--border-color",    label: "Border",        default: "#333333" },
        { var: "--shadow-color",    label: "Shadow",        default: "rgba(0,0,0,0.45)" },
        { var: "--overlay-bg",      label: "Overlay",       default: "rgba(0,0,0,0.7)" },
    ];

    const ADVANCED_COLORS = [
        { var: "--surface-color",        label: "Surface",       default: "#1e1e1e" },
        { var: "--surface-alt",          label: "Alt Surface",   default: "#252525" },
        { var: "--input-bg",             label: "Input Bg",      default: "#2c2c2c" },
        { var: "--divider-color",        label: "Divider",       default: "#3d3d3d" },
        { var: "--danger-color",         label: "Danger",        default: "#ef4444" },
        { var: "--danger-bg",            label: "Danger Bg",     default: "#7f1d1d" },
        { var: "--success-color",        label: "Success",       default: "#10b981" },
        { var: "--success-bg",           label: "Success Bg",    default: "#064e3b" },
        { var: "--warning-bg",           label: "Warning Bg",    default: "#7f1d1d" },
        { var: "--warning-border",       label: "Warning Border",default: "#dc2626" },
        { var: "--shadow-color-strong",  label: "Shadow (Strong)",default:"rgba(0,0,0,0.55)" },
        { var: "--overlay-bg-strong",    label: "Overlay (Strong)",default:"rgba(0,0,0,0.9)" },
    ];

    // ── DOM shortcuts ────────────────────────
    const $ = (s, ctx = document) => ctx.querySelector(s);
    const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

    // ── Init ─────────────────────────────────
    async function init() {
        await loadThemes();
        buildUI();
        renderAll();
    }

    // ── Load Data ────────────────────────────
    async function loadThemes() {
        try {
            const res = await fetch((window.DATA_PATH || "../data/") + "themes.json");
            if (res.ok) {
                const data = await res.json();
                STATE.themes = (data.themes || []).map(t => ({ ...t, isSystem: true }));
            }
        } catch (e) {
            console.warn("ThemesTab: themes.json not found", e);
            STATE.themes = [];
        }

        const userThemes = JSON.parse(localStorage.getItem("user-themes") || "[]");
        STATE.themes = [...STATE.themes, ...userThemes.map(t => ({ ...t, isSystem: false }))];

        rebuildTags();
    }

    function rebuildTags() {
        STATE.allTags.clear();
        STATE.themes.forEach(t => (t.tags || []).forEach(tag => STATE.allTags.add(tag)));
    }

    // ── Build HTML once ───────────────────────
    function buildUI() {
        const themesSection = document.getElementById("themesSection");
        if (!themesSection) return;

        themesSection.innerHTML = `
            <!-- Header -->
            <div class="themes-header">
                ${buildHeaderSVG()}
                <div class="themes-header-content">
                    <div class="themes-header-left">
                        <div class="themes-header-icon">🎨</div>
                        <div class="themes-header-text">
                            <h3>Themes</h3>
                            <p>Personalize every pixel of your experience</p>
                        </div>
                    </div>
                    <div class="themes-header-right">
                        <div class="themes-search-wrap">
                            <i class="fa-solid fa-magnifying-glass search-icon"></i>
                            <input type="text" id="themeSearch" placeholder="Search themes…" autocomplete="off">
                        </div>
                        <div class="themes-sort-dropdown" id="themesSortDd">
                            <button class="themes-sort-btn" type="button">
                                <i class="fa-solid fa-arrow-up-z-a"></i>
                                <span id="themesSortLabel">A → Z</span>
                                <i class="fa-solid fa-chevron-down chevron"></i>
                            </button>
                            <div class="themes-sort-menu" id="themesSortMenu">
                                ${buildSortItems()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tags -->
            <div class="themes-tags-bar" id="themeTagsBar"></div>

            <!-- Grid body -->
            <div id="themesGridBody">
                <div class="theme-category" id="userThemesCat" style="display:none">
                    <div class="themes-category-label">
                        <i class="fa-solid fa-user-pen"></i> My Themes
                    </div>
                    <div class="themes-grid" id="userThemesGrid"></div>
                </div>
                <div class="theme-category" id="systemThemesCat">
                    <div class="themes-category-label">
                        <i class="fa-solid fa-desktop"></i> System Presets
                    </div>
                    <div class="themes-grid" id="systemThemesGrid"></div>
                </div>
                <div class="themes-empty" id="themesEmpty">
                    <span class="themes-empty-icon">👻</span>
                    <h4>No themes found</h4>
                    <p>Try adjusting your filters or search query</p>
                </div>
            </div>

            <!-- FAB -->
            <button class="themes-fab" id="createThemeFab" title="Create theme">
                <i class="fa-solid fa-plus"></i>
            </button>
        `;

        // Creator section
        const creatorSection = document.getElementById("themeCreatorSection");
        if (creatorSection) {
            creatorSection.innerHTML = `
                <div class="themes-creator-wrap">
                    <div class="themes-creator-topbar">
                        <button class="creator-back-btn" id="creatorBackBtn" type="button">
                            <i class="fa-solid fa-arrow-left"></i>
                        </button>
                        <h3><i class="fa-solid fa-wand-magic-sparkles"></i> Theme Creator</h3>
                        <div class="creator-live-preview" id="creatorLivePreview" title="Live preview"></div>
                    </div>

                    <div class="creator-form" id="creatorForm">
                        <div class="creator-row">
                            <div class="creator-field">
                                <label class="creator-label">Theme Title *</label>
                                <input class="creator-input" id="creatorName" type="text" placeholder="e.g. Midnight Blue" maxlength="40">
                            </div>
                            <div class="creator-field">
                                <label class="creator-label">Icon (emoji)</label>
                                <input class="creator-input creator-emoji-input" id="creatorIcon" type="text" placeholder="✨" maxlength="2">
                            </div>
                        </div>
                        <div class="creator-field">
                            <label class="creator-label">Description</label>
                            <input class="creator-input" id="creatorDesc" type="text" placeholder="A short description of the theme" maxlength="80">
                        </div>
                        <div class="creator-toggle-row">
                            <span class="creator-toggle-label">
                                <i class="fa-solid fa-moon"></i> Dark themed?
                            </span>
                            <label class="cb-toggle">
                                <input type="checkbox" id="creatorIsDark" checked>
                                <span class="cb-toggle-track"></span>
                                <span class="cb-toggle-thumb"></span>
                            </label>
                        </div>

                        <!-- Base Colors -->
                        <div class="creator-colors-section">
                            <div class="creator-colors-header">
                                <span><i class="fa-solid fa-palette"></i> Base Colors</span>
                            </div>
                            <div class="creator-colors-body" id="creatorBaseColors"></div>
                        </div>

                        <!-- Advanced Colors -->
                        <button class="creator-advanced-toggle" id="creatorAdvToggle" type="button">
                            <span><i class="fa-solid fa-sliders"></i> Advanced Overrides <small style="opacity:0.6;font-weight:400">(auto-calculated if untouched)</small></span>
                            <i class="fa-solid fa-chevron-down toggle-chevron"></i>
                        </button>
                        <div class="creator-advanced-body" id="creatorAdvBody">
                            <div class="creator-advanced-note">
                                <i class="fa-solid fa-circle-info"></i>
                                These are calculated automatically from base colors unless overridden here.
                            </div>
                            <div class="creator-colors-body" id="creatorAdvColors"></div>
                        </div>
                    </div>

                    <div class="creator-footer">
                        <button class="creator-btn creator-btn-secondary" id="creatorCancelBtn" type="button">Cancel</button>
                        <button class="creator-btn creator-btn-primary" id="creatorSaveBtn" type="button">
                            <i class="fa-solid fa-floppy-disk"></i> Save Theme
                        </button>
                    </div>
                </div>
            `;
        }

        bindEvents();
    }

    function buildHeaderSVG() {
        return `
        <svg class="themes-header-svg" viewBox="0 0 600 120" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="thg1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="var(--accent-color)" stop-opacity="0.4"/>
                    <stop offset="100%" stop-color="var(--accent-color)" stop-opacity="0"/>
                </linearGradient>
            </defs>
            <!-- Orbs -->
            <circle class="orb" cx="520" cy="20" r="55" fill="url(#thg1)"/>
            <circle class="orb" cx="60"  cy="90" r="35" fill="var(--accent-color)" fill-opacity="0.08"/>
            <!-- Wave paths -->
            <path class="wave1" d="M0 60 Q150 30 300 60 Q450 90 600 60 L600 120 L0 120 Z"
                  fill="var(--accent-color)" fill-opacity="0.06"/>
            <path class="wave2" d="M0 80 Q120 50 250 75 Q380 100 600 70 L600 120 L0 120 Z"
                  fill="var(--accent-color)" fill-opacity="0.04"/>
            <!-- Decorative dots -->
            <circle cx="180" cy="25" r="2.5" fill="var(--accent-color)" fill-opacity="0.35"/>
            <circle cx="350" cy="95" r="2"   fill="var(--accent-color)" fill-opacity="0.25"/>
            <circle cx="460" cy="50" r="1.5" fill="var(--accent-color)" fill-opacity="0.3"/>
        </svg>`;
    }

    const SORT_OPTIONS = [
        { val: "az",        icon: "fa-arrow-down-a-z",  label: "A → Z" },
        { val: "za",        icon: "fa-arrow-up-z-a",    label: "Z → A" },
        { val: "date-desc", icon: "fa-clock-rotate-left",label: "Newest first" },
        { val: "date-asc",  icon: "fa-clock",            label: "Oldest first" },
    ];

    function buildSortItems() {
        return SORT_OPTIONS.map(o =>
            `<button class="themes-sort-item${STATE.sort === o.val ? " active" : ""}"
                type="button" data-sort="${o.val}">
                <i class="fa-solid ${o.icon}"></i> ${o.label}
            </button>`
        ).join("");
    }

    // ── Bind Events ──────────────────────────
    function bindEvents() {
        // Search
        const searchEl = document.getElementById("themeSearch");
        if (searchEl) {
            let debounce;
            searchEl.addEventListener("input", e => {
                clearTimeout(debounce);
                debounce = setTimeout(() => {
                    STATE.query = e.target.value.trim().toLowerCase();
                    renderAll();
                }, 180);
            });
        }

        // Sort dropdown
        const sortDd = document.getElementById("themesSortDd");
        const sortBtn = sortDd?.querySelector(".themes-sort-btn");
        const sortMenu = document.getElementById("themesSortMenu");
        if (sortBtn) {
            sortBtn.addEventListener("click", e => {
                e.stopPropagation();
                sortDd.classList.toggle("open");
            });
        }
        if (sortMenu) {
            sortMenu.addEventListener("click", e => {
                const item = e.target.closest(".themes-sort-item");
                if (!item) return;
                STATE.sort = item.dataset.sort;
                $$(".themes-sort-item", sortMenu).forEach(i => i.classList.remove("active"));
                item.classList.add("active");
                const found = SORT_OPTIONS.find(o => o.val === STATE.sort);
                if (found) {
                    const label = document.getElementById("themesSortLabel");
                    if (label) label.textContent = found.label;
                }
                sortDd.classList.remove("open");
                renderAll();
            });
        }
        document.addEventListener("click", () => sortDd?.classList.remove("open"));

        // FAB & Creator
        document.getElementById("createThemeFab")?.addEventListener("click", openCreator);
        document.getElementById("creatorBackBtn")?.addEventListener("click", closeCreator);
        document.getElementById("creatorCancelBtn")?.addEventListener("click", closeCreator);
        document.getElementById("creatorSaveBtn")?.addEventListener("click", saveTheme);

        // Advanced toggle
        document.getElementById("creatorAdvToggle")?.addEventListener("click", function () {
            const body = document.getElementById("creatorAdvBody");
            const isOpen = body?.classList.contains("open");
            body?.classList.toggle("open", !isOpen);
            this.classList.toggle("open", !isOpen);
        });

        // Live preview on isDark toggle
        document.getElementById("creatorIsDark")?.addEventListener("change", updateLivePreview);
    }

    // ── Render ────────────────────────────────
    function renderAll() {
        renderTags();
        renderGrids();
    }

    function renderTags() {
        const bar = document.getElementById("themeTagsBar");
        if (!bar) return;
        bar.innerHTML = "";
        const sorted = [...STATE.allTags].sort();
        sorted.forEach((tag, i) => {
            const btn = document.createElement("button");
            btn.className = "theme-tag-pill" + (STATE.activeTags.has(tag) ? " active" : "");
            btn.style.animationDelay = `${i * 0.04}s`;
            btn.innerHTML = `<span class="tag-dot"></span> #${tag}`;
            btn.addEventListener("click", () => {
                STATE.activeTags.has(tag) ? STATE.activeTags.delete(tag) : STATE.activeTags.add(tag);
                renderAll();
            });
            bar.appendChild(btn);
        });
    }

    function getFiltered() {
        let list = [...STATE.themes];

        // text search
        if (STATE.query) {
            list = list.filter(t =>
                t.name.toLowerCase().includes(STATE.query) ||
                (t.description || "").toLowerCase().includes(STATE.query) ||
                (t.tags || []).some(tag => tag.toLowerCase().includes(STATE.query))
            );
        }

        // tag filter
        if (STATE.activeTags.size > 0) {
            list = list.filter(t =>
                [...STATE.activeTags].every(at => (t.tags || []).includes(at))
            );
        }

        // sort
        list.sort((a, b) => {
            if (STATE.sort === "az")        return a.name.localeCompare(b.name);
            if (STATE.sort === "za")        return b.name.localeCompare(a.name);
            if (STATE.sort === "date-desc") return (b.createdAt || 0) - (a.createdAt || 0);
            if (STATE.sort === "date-asc")  return (a.createdAt || 0) - (b.createdAt || 0);
            return 0;
        });

        return list;
    }

    function renderGrids() {
        const userGrid   = document.getElementById("userThemesGrid");
        const systemGrid = document.getElementById("systemThemesGrid");
        const userCat    = document.getElementById("userThemesCat");
        const systemCat  = document.getElementById("systemThemesCat");
        const empty      = document.getElementById("themesEmpty");
        if (!userGrid || !systemGrid) return;

        const filtered = getFiltered();
        const userT   = filtered.filter(t => !t.isSystem);
        const systemT = filtered.filter(t =>  t.isSystem);

        userGrid.innerHTML   = "";
        systemGrid.innerHTML = "";

        if (userCat)   userCat.style.display   = userT.length   ? "" : "none";
        if (systemCat) systemCat.style.display  = systemT.length ? "" : "none";
        if (empty)     empty.classList.toggle("visible", filtered.length === 0);

        userT.forEach((t, i)   => userGrid.appendChild(buildCard(t, i)));
        systemT.forEach((t, i) => systemGrid.appendChild(buildCard(t, i)));
    }

    // ── Build Card ────────────────────────────
    function buildCard(theme, idx) {
        const c = theme.colors || {};
        const bg      = c["--bg-color"]         || c["--highlight-color"] || "var(--highlight-color)";
        const cardBg  = c["--card-bg"]           || "var(--card-bg)";
        const text    = c["--text-color"]        || "var(--text-color)";
        const muted   = c["--text-muted"]        || "var(--text-muted)";
        const accent  = (theme.recommendedAccentColors || [])[0] || "var(--accent-color)";
        const border  = c["--border-color"]      || "var(--border-color)";

        const isActive = theme.id === STATE.activeThemeId;

        const wrap = document.createElement("div");
        wrap.className = "theme-card" + (isActive ? " active-theme" : "");
        wrap.dataset.id = theme.id;
        wrap.style.setProperty("--tc-bg",     bg);
        wrap.style.setProperty("--tc-card",   cardBg);
        wrap.style.setProperty("--tc-text",   text);
        wrap.style.setProperty("--tc-muted",  muted);
        wrap.style.setProperty("--tc-accent", accent);
        wrap.style.setProperty("--tc-border", border);
        wrap.style.animationDelay = `${idx * 0.05}s`;
        wrap.tabIndex = 0;
        wrap.setAttribute("role", "button");
        wrap.setAttribute("aria-label", `Apply ${theme.name} theme`);

        const tags = (theme.tags || []).slice(0, 3)
            .map(t => `<span class="tc-tag">${t}</span>`).join("");

        const paletteDots = [bg, cardBg, text, accent]
            .filter(Boolean)
            .map(col => `<div class="palette-dot" style="background:${col}"></div>`)
            .join("");

        wrap.innerHTML = `
            <div class="theme-active-badge">Active</div>
            <div class="theme-card-inner">
                <div class="theme-card-header-row">
                    <div class="theme-card-emoji-wrap">${theme.icon || "🎨"}</div>
                    <div class="theme-card-meta">
                        <div class="theme-card-name">${theme.name}</div>
                        <div class="theme-card-desc">${theme.description || ""}</div>
                    </div>
                </div>

                <div class="theme-card-preview">
                    <div class="preview-topbar">
                        <span class="preview-dot preview-dot-r"></span>
                        <span class="preview-dot preview-dot-y"></span>
                        <span class="preview-dot preview-dot-g"></span>
                        <div class="preview-bar"></div>
                    </div>
                    <div class="preview-body">
                        <div class="preview-line"></div>
                        <div class="preview-line short"></div>
                        <div class="preview-line shorter"></div>
                        <div class="preview-accent-chip"></div>
                    </div>
                </div>

                <div class="theme-card-palette">
                    ${paletteDots}
                    <div class="theme-card-tags">${tags}</div>
                </div>
            </div>
            ${!theme.isSystem ? `<button class="theme-card-delete" title="Delete theme" aria-label="Delete ${theme.name}">
                <i class="fa-solid fa-trash-can"></i>
            </button>` : ""}
        `;

        // Click to apply
        wrap.addEventListener("click", e => {
            if (e.target.closest(".theme-card-delete")) {
                deleteTheme(theme.id);
                return;
            }
            applyTheme(theme);
        });

        wrap.addEventListener("keydown", e => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                applyTheme(theme);
            }
        });

        return wrap;
    }

    // ── Apply Theme ───────────────────────────
    function applyTheme(theme) {
        const root = document.documentElement;

        // Clear previous inline vars
        const allVars = [...BASE_COLORS, ...ADVANCED_COLORS].map(c => c.var);
        allVars.forEach(v => root.style.removeProperty(v));

        if (theme.id === "auto") {
            root.removeAttribute("data-theme");
            localStorage.removeItem("app-theme-id");
        } else {
            root.setAttribute("data-theme", theme.isDarkThemed ? "dark" : "light");
            const cols = theme.colors || {};
            Object.entries(cols).forEach(([k, v]) => root.style.setProperty(k, v));
            localStorage.setItem("app-theme-id", theme.id);
        }

        STATE.activeThemeId = theme.id || "auto";

        // Update cards visually
        $$(".theme-card").forEach(c => c.classList.remove("active-theme"));
        $$(".theme-active-badge").forEach(b => b.style.display = "none");
        const active = document.querySelector(`.theme-card[data-id="${theme.id}"]`);
        if (active) {
            active.classList.add("active-theme");
            const badge = active.querySelector(".theme-active-badge");
            if (badge) badge.style.display = "";
        }
    }

    // ── Delete Theme ──────────────────────────
    function deleteTheme(id) {
        if (!confirm("Delete this custom theme? This cannot be undone.")) return;
        STATE.themes = STATE.themes.filter(t => t.id !== id);
        const saved = JSON.parse(localStorage.getItem("user-themes") || "[]").filter(t => t.id !== id);
        localStorage.setItem("user-themes", JSON.stringify(saved));
        if (STATE.activeThemeId === id) applyTheme({ id: "auto" });
        rebuildTags();
        renderAll();
    }

    // ── Creator: Open / Close ─────────────────
    function openCreator() {
        const themesSection  = document.getElementById("themesSection");
        const creatorSection = document.getElementById("themeCreatorSection");
        if (!creatorSection) return;

        themesSection?.classList.remove("active");
        creatorSection.classList.add("active");

        // Switch sidebar item
        $$(".sidebar-item").forEach(i => i.classList.remove("active"));
        const creatorItem = document.querySelector('.sidebar-item[data-section="themeCreator"]');
        if (creatorItem) creatorItem.classList.add("active");

        // Reset form
        const nameEl = document.getElementById("creatorName");
        const iconEl = document.getElementById("creatorIcon");
        const descEl = document.getElementById("creatorDesc");
        const darkEl = document.getElementById("creatorIsDark");
        if (nameEl) nameEl.value = "";
        if (iconEl) iconEl.value = "";
        if (descEl) descEl.value = "";
        if (darkEl) darkEl.checked = true;

        // Collapse advanced
        document.getElementById("creatorAdvBody")?.classList.remove("open");
        document.getElementById("creatorAdvToggle")?.classList.remove("open");

        // Build pickrs
        buildCreatorPickrs();
        updateLivePreview();
    }

    function closeCreator() {
        destroyCreatorPickrs();

        const themesSection  = document.getElementById("themesSection");
        const creatorSection = document.getElementById("themeCreatorSection");
        creatorSection?.classList.remove("active");
        themesSection?.classList.add("active");

        // Switch sidebar back to themes
        $$(".sidebar-item").forEach(i => i.classList.remove("active"));
        const themesItem = document.querySelector('.sidebar-item[data-section="themes"]');
        if (themesItem) themesItem.classList.add("active");
    }

    // ── Creator: Pickrs ───────────────────────
    function buildCreatorPickrs() {
        destroyCreatorPickrs();
        if (!window.Pickr) { console.warn("Pickr not available"); return; }

        buildColorRows("creatorBaseColors",  BASE_COLORS,     false);
        buildColorRows("creatorAdvColors",   ADVANCED_COLORS, true);
    }

    function buildColorRows(containerId, defs, isAdv) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = "";

        defs.forEach((def, i) => {
            const uid = `cp-${containerId}-${i}`;
            const row = document.createElement("div");
            row.className = "creator-color-row";
            row.innerHTML = `
                <span class="creator-color-label" title="${def.var}">${def.label}</span>
                <div class="creator-pickr-wrap">
                    <div id="${uid}"></div>
                </div>
            `;
            container.appendChild(row);

            const p = Pickr.create({
                el: `#${uid}`,
                theme: "classic",
                default: def.default,
                components: {
                    preview: true,
                    opacity: true,
                    hue: true,
                    interaction: { hex: true, rgba: true, input: true, save: true }
                }
            });

            p._cssVar = def.var;
            p._uid = uid;

            p.on("save", (color, inst) => {
                if (!color) return;
                const rgba = color.toRGBA();
                const hex  = color.toHEXA().toString();
                const str  = rgba[3] < 1 ? `rgba(${Math.round(rgba[0])},${Math.round(rgba[1])},${Math.round(rgba[2])},${rgba[3].toFixed(2)})` : hex;
                inst.hide();
                updateLivePreview();
            });

            p.on("change", () => updateLivePreview());

            STATE.creatorPickrs.push(p);
        });
    }

    function destroyCreatorPickrs() {
        STATE.creatorPickrs.forEach(p => {
            try { p.destroyAndRemove(); } catch (_) {}
        });
        STATE.creatorPickrs = [];
    }

    function getPickrValue(cssVar) {
        const p = STATE.creatorPickrs.find(p => p._cssVar === cssVar);
        if (!p) return null;
        const color = p.getColor();
        if (!color) return null;
        const rgba = color.toRGBA();
        if (rgba[3] < 1)
            return `rgba(${Math.round(rgba[0])},${Math.round(rgba[1])},${Math.round(rgba[2])},${rgba[3].toFixed(2)})`;
        return color.toHEXA().toString();
    }

    function updateLivePreview() {
        const preview = document.getElementById("creatorLivePreview");
        if (!preview) return;
        const bg = getPickrValue("--bg-color") || (document.getElementById("creatorIsDark")?.checked ? "#1a1a1a" : "#f5f5f5");
        const accent = getPickrValue("--accent-color") || "var(--accent-color)";
        preview.style.background = bg;
        preview.style.borderColor = accent;
    }

    // ── Save Theme ────────────────────────────
    function saveTheme() {
        const name = (document.getElementById("creatorName")?.value || "").trim();
        if (!name) {
            const nameInput = document.getElementById("creatorName");
            if (nameInput) {
                nameInput.style.borderColor = "var(--danger-color)";
                nameInput.focus();
                setTimeout(() => nameInput.style.borderColor = "", 1800);
            }
            return;
        }

        const icon   = document.getElementById("creatorIcon")?.value.trim() || "✨";
        const desc   = document.getElementById("creatorDesc")?.value.trim() || "";
        const isDark = document.getElementById("creatorIsDark")?.checked ?? true;

        // Collect base colors
        const colors = {};
        [...BASE_COLORS, ...ADVANCED_COLORS].forEach(def => {
            const v = getPickrValue(def.var);
            if (v) colors[def.var] = v;
        });

        // Auto-calculate missing vars
        const bg      = colors["--bg-color"]    || (isDark ? "#121212" : "#f5f5f5");
        const card    = colors["--card-bg"]      || (isDark ? "#1e1e1e" : "#ffffff");
        const hl      = colors["--highlight-color"] || (isDark ? "#2a2a2a" : "#f0f0f0");
        const border  = colors["--border-color"] || (isDark ? "#333" : "#e0e0e0");

        if (!colors["--surface-color"])    colors["--surface-color"]    = card;
        if (!colors["--surface-alt"])      colors["--surface-alt"]      = isDark ? bg : hl;
        if (!colors["--input-bg"])         colors["--input-bg"]         = hl;
        if (!colors["--divider-color"])    colors["--divider-color"]    = border;
        if (!colors["--shadow-color"])     colors["--shadow-color"]     = isDark ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.1)";
        if (!colors["--shadow-color-strong"]) colors["--shadow-color-strong"] = isDark ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.15)";
        if (!colors["--overlay-bg"])       colors["--overlay-bg"]       = isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.5)";
        if (!colors["--overlay-bg-strong"]) colors["--overlay-bg-strong"] = isDark ? "rgba(0,0,0,0.9)" : "rgba(0,0,0,0.85)";
        if (!colors["--danger-color"])     colors["--danger-color"]     = "#ef4444";
        if (!colors["--danger-hover"])     colors["--danger-hover"]     = isDark ? "#f87171" : "#dc2626";
        if (!colors["--danger-bg"])        colors["--danger-bg"]        = isDark ? "#7f1d1d" : "#fecaca";
        if (!colors["--success-color"])    colors["--success-color"]    = "#10b981";
        if (!colors["--success-bg"])       colors["--success-bg"]       = isDark ? "#064e3b" : "#d1fae5";
        if (!colors["--warning-bg"])       colors["--warning-bg"]       = isDark ? "#7f1d1d" : "#fee2e2";
        if (!colors["--warning-border"])   colors["--warning-border"]   = "#ef4444";
        if (!colors["--warning-text"])     colors["--warning-text"]     = isDark ? "#fecaca" : "#991b1b";

        const newTheme = {
            id: "user-" + Date.now(),
            name,
            icon,
            description: desc,
            isDarkThemed: isDark,
            isSystem: false,
            createdAt: Date.now(),
            tags: ["custom", isDark ? "dark" : "light"],
            colors,
            recommendedAccentColors: []
        };

        // Persist
        const saved = JSON.parse(localStorage.getItem("user-themes") || "[]");
        saved.unshift(newTheme);
        localStorage.setItem("user-themes", JSON.stringify(saved));

        STATE.themes.unshift(newTheme);
        rebuildTags();

        closeCreator();
        applyTheme(newTheme);
        renderAll();
    }

    // ── Restore theme on page load ────────────
    function restoreActiveTheme() {
        const id = STATE.activeThemeId;
        if (!id || id === "auto") return;
        const theme = STATE.themes.find(t => t.id === id);
        if (theme) applyTheme(theme);
    }

    // ── Boot ──────────────────────────────────
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", async () => { await init(); restoreActiveTheme(); });
    } else {
        await init();
        restoreActiveTheme();
    }

})();
