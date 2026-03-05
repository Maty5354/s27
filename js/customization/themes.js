/* ========================================
   THEMES TAB — themes.js
   
   ╔══════════════════════════════════════╗
   ║  INPUT COMPONENTS RULES              ║
   ║                                      ║
   ║  ALL inputs used in this module MUST ║
   ║  replicate the EXACT HTML structure  ║
   ║  and JS behavior from the Base tab.  ║
   ║                                      ║
   ║  • .cb-toggle → toggle switches      ║
   ║  • .cb-dropdown → dropdown selects   ║
   ║  • .cb-range → range sliders         ║
   ║  • .cb-search-wrap → search inputs   ║
   ║  • .cb-segmented → segmented ctrl    ║
   ║  • .cb-radio-group → radio groups    ║
   ║                                      ║
   ║  Only IDs are changed to avoid       ║
   ║  conflicts with the base tab.        ║
   ║                                      ║
   ║  New inputs may be added if no base  ║
   ║  equivalent exists, following the    ║
   ║  same cb- naming convention.         ║
   ╚══════════════════════════════════════╝
   ======================================== */

(function () {
    "use strict";

    /* ════════════════════════════════════════
       CONSTANTS & STATE
       ════════════════════════════════════════ */
    const KEY_THEME      = "customization-active-theme";
    const KEY_ACCENT     = "customization-accent-color";
    const KEY_CUSTOM     = "customization-custom-themes";
    const KEY_PENDING    = "customization-pending-theme";   // preview-only, not applied yet

    let themes        = [];          // all themes (system + custom)
    let customThemes  = [];          // user-created themes
    let allTags       = ["all"];     // computed from theme data
    let activeThemeId = null;        // committed/saved theme
    let pendingChange = false;       // has preview-only change not yet saved?

    // Filter / sort state
    let searchQuery = "";
    let activeTag   = "all";
    let sortMode    = "default";

    // Toast state
    let toastQueue    = [];          // [{id, timerId}]
    let unsavedToastId = null;

    // DOM refs (populated after section injection)
    let section     = null;
    let tagNavEl    = null;
    let gridEl      = null;
    let searchInput = null;


    /* ════════════════════════════════════════
       INLINE FALLBACK DATA  (mirrors themes.json)
       Used when fetch() is unavailable.
       ════════════════════════════════════════ */
   


    /* ════════════════════════════════════════
       BOOT
       ════════════════════════════════════════ */
    function boot() {
        createSection();
        loadState();
        fetchThemes();
        bindGlobalInteractions();
    }

    /* ════════════════════════════════════════
       SECTION INJECTION
       ════════════════════════════════════════ */
    function createSection() {
        const content = document.querySelector(".custom-content");
        if (!content) return;

        section = document.createElement("div");
        section.className = "custom-section";
        section.id = "themesSection";

        /*
         * The .cb-search-wrap below replicates EXACTLY the
         * base tab search input structure (item 35), with
         * a unique id prefix "themes-" to avoid conflicts.
         *
         * The .cb-dropdown below replicates EXACTLY the
         * base tab dropdown structure (item 6) with a
         * unique id "themesSortDropdown".
         */
        section.innerHTML = `
            <div class="themes-header">

                <!-- ── Top row ── -->
                <div class="themes-header-top">

                    <div class="themes-header-info">
                        <h3><i class="fa-solid fa-palette"></i> Themes</h3>
                        <p class="themes-tab-desc">
                            Choose a visual theme, fork a built-in one, or craft your own palette from scratch.
                        </p>
                    </div>

                    <div class="themes-header-actions">

                        <!-- SEARCH — mirrors base item 35: .cb-search-wrap -->
                        <div class="themes-search-wrap cb-search-wrap" id="themesSearchWrap">
                            <i class="fa-solid fa-magnifying-glass cb-search-icon"></i>
                            <input
                                type="text"
                                class="cb-search-input"
                                id="themesSearchInput"
                                placeholder="Search themes…"
                                autocomplete="off"
                            />
                            <button class="cb-search-clear" id="themesSearchClear" aria-label="Clear search">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        <!-- SORT — mirrors base item 6: .cb-dropdown -->
                        <div class="cb-dropdown themes-sort-dropdown" id="themesSortDropdown">
                            <button class="cb-dropdown-trigger" type="button" id="themesSortTrigger">
                                <i class="fa-solid fa-arrow-up-wide-short"></i>
                                <span>Sort</span>
                                <i class="fa-solid fa-chevron-down"></i>
                            </button>
                            <div class="cb-dropdown-menu" id="themesSortMenu">
                                <div class="cb-dropdown-item selected" data-sort="default">Default</div>
                                <div class="cb-dropdown-item" data-sort="az">A → Z</div>
                                <div class="cb-dropdown-item" data-sort="za">Z → A</div>
                                <div class="cb-dropdown-item" data-sort="light-first">Light first</div>
                                <div class="cb-dropdown-item" data-sort="dark-first">Dark first</div>
                            </div>
                        </div>

                        <!-- SAVE BUTTON -->
                        <button class="themes-save-btn" id="themesSaveBtn" aria-label="Save theme preference">
                            <i class="fa-solid fa-floppy-disk"></i>
                            <span>Save</span>
                        </button>

                    </div>
                </div>

                <!-- ── Tag navbar ── -->
                <nav class="themes-tag-nav" id="themesTagNav" aria-label="Filter by tag"></nav>

            </div>

            <!-- ── Grid ── -->
            <div class="themes-grid" id="themesGrid"></div>
        `;

        // Insert before baseSection (or just prepend)
        const base = document.getElementById("baseSection");
        base ? content.insertBefore(section, base) : content.prepend(section);

        // Mark active if themes tab is the default open tab
        const tabBtn = document.querySelector('.sidebar-item[data-section="themes"]');
        if (tabBtn && tabBtn.classList.contains("active")) {
            section.classList.add("active");
        }

        // Cache live refs
        tagNavEl    = section.querySelector("#themesTagNav");
        gridEl      = section.querySelector("#themesGrid");
        searchInput = section.querySelector("#themesSearchInput");
    }


    /* ════════════════════════════════════════
       STATE PERSISTENCE
       ════════════════════════════════════════ */
    function loadState() {
        activeThemeId = localStorage.getItem(KEY_THEME) || "light";
        try {
            customThemes = JSON.parse(localStorage.getItem(KEY_CUSTOM) || "[]");
        } catch { customThemes = []; }
    }

    function saveState() {
        localStorage.setItem(KEY_THEME, activeThemeId);
        localStorage.setItem(KEY_CUSTOM, JSON.stringify(customThemes));
    }


    /* ════════════════════════════════════════
       DATA LOADING
       ════════════════════════════════════════ */
    function fetchThemes() {
        const path = (window.DATA_PATH || "../data/") + "themes.json";

        fetch(path)
            .then(r => { if (!r.ok) throw new Error("fetch failed"); return r.json(); })
            .then(data => {
                themes = [
                    ...(data.themes      || []),
                    ...(data.DevPresets  || []),
                    ...(data.CommunityPresets || [])
                ];
                mergeCustomThemes();
                computeTags();
                renderAll();
            })
            .catch(() => {
                themes = [...FALLBACK.themes];
                mergeCustomThemes();
                computeTags();
                renderAll();
            });
    }

    function mergeCustomThemes() {
        // Append custom themes that don't clash with system IDs
        const sysIds = new Set(themes.map(t => t.id));
        customThemes.forEach(ct => { if (!sysIds.has(ct.id)) themes.push(ct); });
    }

    function computeTags() {
        const set = new Set();
        themes.forEach(t => (t.tags || []).forEach(tag => set.add(tag)));
        allTags = ["all", ...Array.from(set).sort()];
    }


    /* ════════════════════════════════════════
       RENDER — TOP LEVEL
       ════════════════════════════════════════ */
    function renderAll() {
        renderTagNav();
        renderGrid();
    }


    /* ── Tag Nav ─────────────────────────── */
    function renderTagNav() {
        if (!tagNavEl) return;

        tagNavEl.innerHTML = allTags.map(tag => {
            const label = tag === "all" ? "All" : capitalize(tag);
            const count = tag === "all"
                ? themes.length
                : themes.filter(t => (t.tags || []).includes(tag)).length;

            return `
                <button
                    class="themes-tag-btn${tag === activeTag ? " active" : ""}"
                    data-tag="${tag}"
                    aria-pressed="${tag === activeTag}"
                >
                    ${label}
                    <span style="opacity:0.55;font-size:0.58rem;margin-left:3px;">${count}</span>
                </button>
            `;
        }).join("");

        tagNavEl.querySelectorAll(".themes-tag-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                activeTag = btn.dataset.tag;
                renderTagNav();
                renderGrid();
            });
        });
    }


    /* ── Theme Grid ──────────────────────── */
    function renderGrid() {
        if (!gridEl) return;

        const filtered = getFilteredThemes();

        const emptyHTML = filtered.length === 0
            ? `<div class="themes-empty"><i class="fa-solid fa-ghost"></i><p>No themes match your search.</p></div>`
            : "";

        gridEl.innerHTML =
            buildCreateCard() +
            filtered.map(t => buildThemeCard(t)).join("") +
            emptyHTML;

        bindCardEvents();
    }

    function getFilteredThemes() {
        let list = [...themes];

        // Tag filter
        if (activeTag !== "all") {
            list = list.filter(t => (t.tags || []).includes(activeTag));
        }

        // Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(t =>
                t.name.toLowerCase().includes(q) ||
                (t.description || "").toLowerCase().includes(q) ||
                (t.tags || []).some(tag => tag.toLowerCase().includes(q))
            );
        }

        // Sort
        switch (sortMode) {
            case "az":          list.sort((a, b) => a.name.localeCompare(b.name)); break;
            case "za":          list.sort((a, b) => b.name.localeCompare(a.name)); break;
            case "light-first": list.sort(a => a.isDarkThemed === false ? -1 : 1);  break;
            case "dark-first":  list.sort(a => a.isDarkThemed === true  ? -1 : 1);  break;
        }

        return list;
    }


    /* ── Card Builders ───────────────────── */
    function buildCreateCard() {
        return `
            <div
                class="theme-card theme-card-create"
                id="themeCreateBtn"
                role="button"
                tabindex="0"
                aria-label="Create new theme"
            >
                <div class="theme-card-create-inner">
                    <div class="theme-create-icon">
                        <i class="fa-solid fa-plus"></i>
                    </div>
                    <span class="theme-create-label">New Theme</span>
                    <span class="theme-create-hint">Start from scratch or fork a built-in theme</span>
                </div>
            </div>
        `;
    }

    function buildThemeCard(theme) {
        const isActive  = theme.id === activeThemeId;
        const isSystem  = !!theme.isSystemCreated;
        const preview   = getPreviewColors(theme);
        const isAuto    = theme.id === "auto";

        /* preview custom properties for CSS to consume */
        const previewVars = isAuto ? "" : `
            style="
                --preview-bg:     ${preview.bg};
                --preview-card:   ${preview.card};
                --preview-accent: ${preview.accent};
                --preview-text:   ${preview.text};
                --preview-muted:  ${preview.muted};
                --preview-border: ${preview.border};
            "
        `;

        return `
            <div
                class="theme-card${isActive ? " active" : ""}"
                data-theme-id="${theme.id}"
                role="button"
                tabindex="0"
                aria-pressed="${isActive}"
                aria-label="Theme: ${escHtml(theme.name)}"
            >
                ${isActive ? `<div class="theme-card-badge"><i class="fa-solid fa-check"></i> Active</div>` : ""}

                <!-- ── Mini Preview ── -->
                <div
                    class="theme-card-preview${isAuto ? " preview-auto" : ""}"
                    ${previewVars}
                    aria-hidden="true"
                >
                    ${isAuto ? buildAutoPreview() : buildPreviewInner()}
                </div>

                <!-- ── Info ── -->
                <div class="theme-card-body">
                    <div class="theme-card-title-row">
                        <span class="theme-card-icon" aria-hidden="true">${theme.icon || "🎨"}</span>
                        <span class="theme-card-name">${escHtml(theme.name)}</span>
                    </div>
                    <p class="theme-card-desc">${escHtml(theme.description || "")}</p>

                    <div class="theme-card-tags">
                        ${(theme.tags || []).map(t =>
                            `<span class="theme-tag-badge">${escHtml(t)}</span>`
                        ).join("")}
                        <span class="theme-tag-badge ${isSystem ? "system" : "custom"}">
                            ${isSystem ? "built-in" : "custom"}
                        </span>
                    </div>

                    ${(theme.recommendedAccentColors || []).length ? `
                        <div class="theme-card-accents" aria-label="Recommended accent colors">
                            ${theme.recommendedAccentColors.slice(0, 5).map(c => `
                                <button
                                    class="theme-accent-dot"
                                    style="background:${c};"
                                    data-accent="${c}"
                                    aria-label="Set accent ${c}"
                                    title="${c}"
                                ></button>
                            `).join("")}
                        </div>
                    ` : ""}
                </div>

                <!-- ── Actions ── -->
                <div class="theme-card-actions">
                    <button
                        class="theme-action-btn apply-btn${isActive ? " applied" : ""}"
                        data-action="apply"
                        data-theme-id="${theme.id}"
                    >
                        ${isActive
                            ? `<i class="fa-solid fa-check"></i> Applied`
                            : `<i class="fa-solid fa-paintbrush"></i> Apply`}
                    </button>

                    ${isSystem ? `
                        <button
                            class="theme-action-btn fork-btn"
                            data-action="fork"
                            data-theme-id="${theme.id}"
                            title="Fork this theme"
                            aria-label="Fork ${escHtml(theme.name)}"
                        >
                            <i class="fa-solid fa-code-branch"></i> Fork
                        </button>
                    ` : `
                        <button
                            class="theme-action-btn edit-btn"
                            data-action="edit"
                            data-theme-id="${theme.id}"
                            title="Edit theme"
                            aria-label="Edit ${escHtml(theme.name)}"
                        >
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button
                            class="theme-action-btn delete-btn"
                            data-action="delete"
                            data-theme-id="${theme.id}"
                            title="Delete theme"
                            aria-label="Delete ${escHtml(theme.name)}"
                        >
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    `}
                </div>
            </div>
        `;
    }

    function buildPreviewInner() {
        return `
            <div class="preview-sidebar">
                <div class="preview-sidebar-dot"></div>
                <div class="preview-sidebar-line"></div>
                <div class="preview-sidebar-line short"></div>
                <div class="preview-sidebar-line short" style="opacity:0.15;width:40%;margin-top:4px;"></div>
            </div>
            <div class="preview-body">
                <div class="preview-topbar">
                    <div class="preview-accent-strip"></div>
                </div>
                <div class="preview-body-content">
                    <div class="preview-mini-card">
                        <div class="preview-text-line"></div>
                        <div class="preview-text-line short"></div>
                        <div class="preview-mini-btn"></div>
                    </div>
                </div>
            </div>
        `;
    }

    function buildAutoPreview() {
        /* Split: left=light, right=dark */
        return `
            <div class="preview-sidebar" style="--preview-card:#fff;--preview-muted:#bbb;">
                <div class="preview-sidebar-dot" style="background:#6196ff;"></div>
                <div class="preview-sidebar-line"></div>
                <div class="preview-sidebar-line short"></div>
            </div>
            <div class="preview-body">
                <div class="preview-topbar" style="--preview-card:#fff;--preview-border:#e0e0e0;">
                    <div class="preview-accent-strip" style="background:#6196ff;"></div>
                </div>
                <div class="preview-body-content">
                    <div class="preview-mini-card" style="--preview-card:#fff;--preview-border:#e0e0e0;">
                        <div class="preview-text-line" style="--preview-text:#333;"></div>
                        <div class="preview-text-line short" style="--preview-text:#999;"></div>
                        <div class="preview-mini-btn" style="background:#6196ff;"></div>
                    </div>
                </div>
            </div>
        `;
    }

    function getPreviewColors(theme) {
        const c  = theme.colors || {};
        const dk = theme.isDarkThemed;
        return {
            bg:     c["--bg-color"]     || (dk ? "#121212" : "#f9f9f9"),
            card:   c["--card-bg"]      || (dk ? "#1e1e1e" : "#ffffff"),
            accent: localStorage.getItem(KEY_ACCENT) || "#6196ff",
            text:   c["--text-color"]   || (dk ? "#f0f0f0" : "#2d2d2d"),
            muted:  c["--text-muted"]   || (dk ? "#888"    : "#aaa"),
            border: c["--border-color"] || (dk ? "#333333" : "#e0e0e0")
        };
    }


    /* ════════════════════════════════════════
       CARD EVENT BINDING
       (called after every renderGrid())
       ════════════════════════════════════════ */
    function bindCardEvents() {
        if (!gridEl) return;

        /* Create-new button */
        const createBtn = gridEl.querySelector("#themeCreateBtn");
        if (createBtn) {
            createBtn.addEventListener("click", handleCreateNew);
            createBtn.addEventListener("keydown", e => e.key === "Enter" && handleCreateNew());
        }

        /* Action buttons (Apply / Fork / Edit / Delete) */
        gridEl.querySelectorAll("[data-action]").forEach(btn => {
            btn.addEventListener("click", e => {
                e.stopPropagation();
                const { action, themeId } = btn.dataset;
                if (action === "apply")  applyTheme(themeId);
                if (action === "fork")   forkTheme(themeId);
                if (action === "edit")   handleEditTheme(themeId);
                if (action === "delete") handleDeleteTheme(themeId);
            });
        });

        /* Accent quick-apply dots */
        gridEl.querySelectorAll(".theme-accent-dot").forEach(dot => {
            dot.addEventListener("click", e => {
                e.stopPropagation();
                const color = dot.dataset.accent;
                document.documentElement.style.setProperty("--accent-color", color);
                localStorage.setItem(KEY_ACCENT, color);
                markUnsaved();
                showToast(`<i class="fa-solid fa-droplet"></i> Accent → ${color}`, "info", 2200);
            });
        });

        /* Click anywhere on card (except buttons) = apply */
        gridEl.querySelectorAll(".theme-card:not(.theme-card-create)").forEach(card => {
            card.addEventListener("click", e => {
                if (e.target.closest("[data-action]") || e.target.closest(".theme-accent-dot")) return;
                applyTheme(card.dataset.themeId);
            });
            card.addEventListener("keydown", e => {
                if (e.key === "Enter") applyTheme(card.dataset.themeId);
            });
        });
    }


    /* ════════════════════════════════════════
       THEME ACTIONS
       ════════════════════════════════════════ */

    /* Apply a theme immediately and persist */
    function applyTheme(id) {
        const theme = themes.find(t => t.id === id);
        if (!theme) return;

        const root    = document.documentElement;
        const wasAuto = activeThemeId === "auto";

        /* Apply all CSS variable overrides */
        Object.entries(theme.colors || {}).forEach(([k, v]) => root.style.setProperty(k, v));

        /* Set data-theme for any CSS selectors that target it */
        root.setAttribute("data-theme", id);

        /* Handle "auto" theme — watch system preference */
        if (id === "auto") {
            syncAutoTheme();
            window
                .matchMedia("(prefers-color-scheme: dark)")
                .addEventListener("change", syncAutoTheme);
        } else if (wasAuto) {
            window
                .matchMedia("(prefers-color-scheme: dark)")
                .removeEventListener("change", syncAutoTheme);
        }

        /* Suggest first recommended accent if current accent isn't in list */
        const recs    = theme.recommendedAccentColors || [];
        const current = localStorage.getItem(KEY_ACCENT) || "#6196ff";
        if (recs.length && !recs.includes(current)) {
            root.style.setProperty("--accent-color", recs[0]);
            localStorage.setItem(KEY_ACCENT, recs[0]);
        }

        activeThemeId = id;
        pendingChange = false;
        saveState();
        dismissUnsavedToast();

        showToast(
            `<i class="fa-solid fa-check-circle"></i> <strong>${escHtml(theme.name)}</strong> applied`,
            "success"
        );

        renderGrid();
    }

    /* For "auto" theme: mirror system dark mode */
    function syncAutoTheme() {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const source      = FALLBACK.themes.find(t => t.id === prefersDark ? "dark" : "light");
        if (!source) return;
        const root = document.documentElement;
        Object.entries(source.colors || {}).forEach(([k, v]) => root.style.setProperty(k, v));
    }

    /* Fork a system theme into a custom editable copy */
    function forkTheme(id) {
        const src = themes.find(t => t.id === id);
        if (!src) return;

        const forked = {
            ...JSON.parse(JSON.stringify(src)),
            id:              "custom-" + Date.now(),
            name:            src.name + " (Copy)",
            isSystemCreated: false,
            tags:            [...(src.tags || []).filter(t => t !== "built-in"), "custom"]
        };

        customThemes.push(forked);
        themes.push(forked);
        saveState();
        renderGrid();

        showToast(
            `<i class="fa-solid fa-code-branch"></i> Forked "<strong>${escHtml(src.name)}</strong>"`,
            "warning",
            3500
        );
    }

    /* Edit custom theme — opens tcreate-modal in edit mode */
    function handleEditTheme(id) {
        const theme = themes.find(t => t.id === id);
        if (!theme) return;
        window.dispatchEvent(new CustomEvent("tcm:openEdit", { detail: theme }));
    }

    /* Delete custom theme with confirmation */
    function handleDeleteTheme(id) {
        const theme = themes.find(t => t.id === id);
        if (!theme) return;

        showConfirmModal({
            title:   `Delete "${escHtml(theme.name)}"?`,
            body:    "This theme will be permanently removed. Any pages using it will revert to the light theme.",
            confirm: "Delete",
            variant: "danger",
            onOk() {
                themes       = themes.filter(t => t.id !== id);
                customThemes = customThemes.filter(t => t.id !== id);
                saveState();

                if (activeThemeId === id) applyTheme("light");

                renderGrid();
                showToast(`<i class="fa-solid fa-trash"></i> Theme deleted`, "danger", 2500);
            }
        });
    }

    /* Create new theme — opens tcreate-modal */
    function handleCreateNew() {
        window.dispatchEvent(new CustomEvent("tcm:openCreate"));
    }

    /* Mark that something changed but isn't saved */
    function markUnsaved() {
        pendingChange = true;
        showUnsavedToast();
    }


    /* ════════════════════════════════════════
       GLOBAL INTERACTIONS
       (search, sort, save btn, tab-switch guard)
       ════════════════════════════════════════ */
    function bindGlobalInteractions() {

        /* We must wait for the section to exist */
        const ready = () => {

            /* ── Search (mirrors base item 35) ── */
            if (searchInput) {
                const wrap     = section.querySelector("#themesSearchWrap");
                const clearBtn = section.querySelector("#themesSearchClear");

                searchInput.addEventListener("input", () => {
                    searchQuery = searchInput.value;
                    clearBtn && (clearBtn.style.opacity = searchQuery ? "1" : "");
                    renderGrid();
                });

                /* Mobile: expand on click, not just hover */
                wrap?.addEventListener("click", () => {
                    wrap.classList.add("is-expanded");
                    searchInput.focus();
                });

                searchInput.addEventListener("blur", () => {
                    if (!searchInput.value) {
                        section.querySelector("#themesSearchWrap")?.classList.remove("is-expanded");
                    }
                });

                clearBtn?.addEventListener("click", () => {
                    searchInput.value = "";
                    searchQuery       = "";
                    clearBtn.style.opacity = "";
                    section.querySelector("#themesSearchWrap")?.classList.remove("is-expanded");
                    renderGrid();
                    searchInput.focus();
                });
            }

            /* ── Sort Dropdown (mirrors base item 6) ── */
            const sortDd      = section.querySelector("#themesSortDropdown");
            const sortTrigger = section.querySelector("#themesSortTrigger");
            const sortItems   = section.querySelectorAll("#themesSortMenu .cb-dropdown-item");

            sortTrigger?.addEventListener("click", e => {
                e.stopPropagation();
                sortDd.classList.toggle("open");
            });

            sortItems.forEach(item => {
                item.addEventListener("click", () => {
                    sortItems.forEach(i => i.classList.remove("selected"));
                    item.classList.add("selected");
                    sortMode = item.dataset.sort;

                    const labelEl = sortTrigger?.querySelector("span");
                    if (labelEl) labelEl.textContent = item.textContent.trim();

                    sortDd.classList.remove("open");
                    renderGrid();
                });
            });

            /* Close sort dropdown when clicking elsewhere */
            document.addEventListener("click", () => sortDd?.classList.remove("open"));

            /* ── Save Button ── */
            const saveBtn = section.querySelector("#themesSaveBtn");
            saveBtn?.addEventListener("click", () => {
                saveState();
                pendingChange = false;
                dismissUnsavedToast();

                saveBtn.classList.add("saved");
                setTimeout(() => saveBtn.classList.remove("saved"), 1800);

                showToast(
                    `<i class="fa-solid fa-floppy-disk"></i> Preferences saved`,
                    "success"
                );
            });
        };

        /* Run immediately if section already exists, else after DOMContentLoaded */
        if (section) {
            ready();
        } else {
            document.addEventListener("DOMContentLoaded", () => {
                if (section) ready();
            });
        }

        /* ── Intercept sidebar tab switches ──
         * If there are unsaved changes, show a subtle (non-blocking) unsaved toast.
         * A blocking modal only appears when closing the whole overlay.
         */
        document.addEventListener("click", e => {
            const item = e.target.closest(".sidebar-item[data-section]");
            if (item && pendingChange) {
                showUnsavedToast();
            }
        });

        /* ── Intercept closing the customization overlay ── */
        const closeCustomBtn = document.getElementById("closeCustomization");
        if (closeCustomBtn) {
            closeCustomBtn.addEventListener("click", handleOverlayClose, { capture: true });
        }
    }

    function handleOverlayClose(e) {
        if (!pendingChange) return;

        e.stopImmediatePropagation();
        e.preventDefault();

        showConfirmModal({
            title:   "Unsaved changes",
            body:    "You have unsaved theme preferences. Save them before closing?",
            confirm: "Save & Close",
            variant: "accent",
            onOk() {
                saveState();
                pendingChange = false;
                dismissUnsavedToast();
                if (window.overlayManager) window.overlayManager.close("customizationOverlay");
            },
            onCancel() {
                pendingChange = false;
                dismissUnsavedToast();
                if (window.overlayManager) window.overlayManager.close("customizationOverlay");
            },
            cancelLabel: "Discard & Close"
        });
    }


    /* ════════════════════════════════════════
       TOAST SYSTEM
       ════════════════════════════════════════ */
    function ensureToastContainer() {
        let c = document.getElementById("themesToastContainer");
        if (!c) {
            c = document.createElement("div");
            c.id        = "themesToastContainer";
            c.className = "themes-toast-container";
            document.body.appendChild(c);
        }
        return c;
    }

    /**
     * Show a toast notification.
     * @param {string} message  HTML message (keep short)
     * @param {"success"|"info"|"warning"|"danger"} type
     * @param {number}  duration  ms; 0 = persistent
     * @returns {string}  toast element id
     */
    function showToast(message, type = "info", duration = 3500) {
        const container = ensureToastContainer();

        /* Enforce max 3 transient toasts */
        const transient = [...container.querySelectorAll(
            ".themes-toast:not(.themes-toast-permanent)"
        )];
        if (transient.length >= 3) dismissToast(transient[0].id);

        const id    = "tst-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
        const toast = document.createElement("div");
        toast.id        = id;
        toast.className = `themes-toast themes-toast-${type}`;
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");
        toast.innerHTML = `
            <span class="toast-message">${message}</span>
            <button class="toast-close" aria-label="Dismiss"><i class="fa-solid fa-xmark"></i></button>
        `;

        container.appendChild(toast);
        toastQueue.push({ id, timerId: null });

        /* Animate in (double rAF ensures transition fires) */
        requestAnimationFrame(() =>
            requestAnimationFrame(() => toast.classList.add("visible"))
        );

        toast.querySelector(".toast-close").addEventListener("click", () => dismissToast(id));

        if (duration > 0) {
            const timerId = setTimeout(() => dismissToast(id), duration);
            const entry   = toastQueue.find(e => e.id === id);
            if (entry) entry.timerId = timerId;
        }

        return id;
    }

    function dismissToast(id) {
        const toast = document.getElementById(id);
        if (!toast) return;

        toast.classList.remove("visible");
        toast.classList.add("hiding");
        setTimeout(() => {
            toast.remove();
            toastQueue = toastQueue.filter(e => e.id !== id);
        }, 320);
    }

    function showUnsavedToast() {
        /* Only one unsaved toast at a time */
        if (unsavedToastId && document.getElementById(unsavedToastId)) return;

        const container = ensureToastContainer();
        const id        = "tst-unsaved";
        unsavedToastId  = id;

        const toast = document.createElement("div");
        toast.id        = id;
        toast.className = "themes-toast themes-toast-warning themes-toast-permanent";
        toast.setAttribute("role", "alert");
        toast.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span class="toast-message">Unsaved changes</span>
            <button class="toast-action-btn" id="toastQuickSave">Save</button>
            <button class="toast-close" aria-label="Dismiss"><i class="fa-solid fa-xmark"></i></button>
        `;

        container.appendChild(toast);

        requestAnimationFrame(() =>
            requestAnimationFrame(() => toast.classList.add("visible"))
        );

        toast.querySelector("#toastQuickSave").addEventListener("click", () => {
            saveState();
            pendingChange = false;
            dismissUnsavedToast();
            showToast(`<i class="fa-solid fa-check-circle"></i> Saved!`, "success", 2000);
        });

        toast.querySelector(".toast-close").addEventListener("click", () => {
            pendingChange = false;
            dismissUnsavedToast();
        });
    }

    function dismissUnsavedToast() {
        if (!unsavedToastId) return;
        dismissToast(unsavedToastId);
        unsavedToastId = null;
    }


    /* ════════════════════════════════════════
       CONFIRM MODAL
       ════════════════════════════════════════ */
    /**
     * @param {object} opts
     * @param {string} opts.title
     * @param {string} opts.body
     * @param {string} opts.confirm       label for OK button
     * @param {"danger"|"accent"} opts.variant
     * @param {function} opts.onOk
     * @param {function} [opts.onCancel]
     * @param {string}   [opts.cancelLabel]
     */
    function showConfirmModal(opts) {
        let modal = document.getElementById("themesConfirmModal");

        if (!modal) {
            modal     = document.createElement("div");
            modal.id  = "themesConfirmModal";
            modal.className = "themes-confirm-overlay";
            modal.innerHTML = `
                <div class="themes-confirm-modal" role="dialog" aria-modal="true">
                    <div class="themes-confirm-header">
                        <h3 id="tcmTitle"></h3>
                        <p id="tcmBody"></p>
                    </div>
                    <div class="themes-confirm-actions">
                        <button class="modal-btn secondary" id="tcmCancel"></button>
                        <button class="modal-btn primary"   id="tcmOk"></button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            /* Close on backdrop click */
            modal.addEventListener("click", e => {
                if (e.target === modal) closeConfirmModal();
            });

            /* Close on Escape */
            document.addEventListener("keydown", e => {
                if (e.key === "Escape" && modal.classList.contains("active"))
                    closeConfirmModal();
            });
        }

        modal.querySelector("#tcmTitle").textContent  = opts.title  || "Are you sure?";
        modal.querySelector("#tcmBody").textContent   = opts.body   || "";

        const okBtn     = modal.querySelector("#tcmOk");
        const cancelBtn = modal.querySelector("#tcmCancel");

        /* Re-clone to wipe previous listeners */
        const okNew     = okBtn.cloneNode(true);
        const cancelNew = cancelBtn.cloneNode(true);
        okBtn.replaceWith(okNew);
        cancelBtn.replaceWith(cancelNew);

        okNew.textContent     = opts.confirm     || "OK";
        cancelNew.textContent = opts.cancelLabel || "Cancel";

        okNew.className = `modal-btn primary${opts.variant === "danger" ? " danger" : ""}`;

        okNew.addEventListener("click", () => {
            closeConfirmModal();
            opts.onOk && opts.onOk();
        });

        cancelNew.addEventListener("click", () => {
            closeConfirmModal();
            opts.onCancel && opts.onCancel();
        });

        modal.classList.add("active");
        okNew.focus();
    }

    function closeConfirmModal() {
        document.getElementById("themesConfirmModal")?.classList.remove("active");
    }


    /* ════════════════════════════════════════
       UTILITIES
       ════════════════════════════════════════ */
    function capitalize(s) {
        return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
    }

    function escHtml(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }


    /* ════════════════════════════════════════
       BOOT — deferred to ensure DOM is ready
       ════════════════════════════════════════ */

    /*
     * ╔══════════════════════════════════════╗
     * ║  INPUT COMPONENTS REMINDER           ║
     * ║                                      ║
     * ║  Any interactive control added in    ║
     * ║  future (e.g. in a "create theme"    ║
     * ║  modal) MUST use the base-tab        ║
     * ║  component patterns:                 ║
     * ║                                      ║
     * ║  Toggle:    .cb-toggle               ║
     * ║  Range:     .cb-range (+ .cb-range-  ║
     * ║             wrap / header / value)   ║
     * ║  Dropdown:  .cb-dropdown             ║
     * ║  Text:      .cb-text-field           ║
     * ║  Checkbox:  .cb-checkbox             ║
     * ║  Segmented: .cb-segmented            ║
     * ║  Color:     Pickr (.pickr-container) ║
     * ║                                      ║
     * ║  New inputs MUST follow the cb-      ║
     * ║  prefix convention and replicate     ║
     * ║  the exact HTML skeleton from the    ║
     * ║  base tab — only IDs are renamed.    ║
     * ╚══════════════════════════════════════╝
     */
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }

    /* Expose toast fn for tcreate-modal.js to reuse */
    window.themeTabShowToast = showToast;

    /* Reload grid when tcreate-modal saves or edits a theme */
    window.addEventListener("tcm:themeSaved", e => {
        const saved = e.detail;
        if (!saved) return;

        const idx = themes.findIndex(t => t.id === saved.id);
        if (idx >= 0) themes[idx] = saved;
        else          themes.push(saved);

        const ci = customThemes.findIndex(t => t.id === saved.id);
        if (ci >= 0) customThemes[ci] = saved;
        else         customThemes.push(saved);

        computeTags();
        renderAll();
    });

})();
