/* ========================================
   THEME CREATE / EDIT MODAL — tcreate-modal.js

   ╔══════════════════════════════════════════╗
   ║  INPUT COMPONENTS CONTRACT               ║
   ║                                          ║
   ║  Every interactive control in this file  ║
   ║  MUST replicate the EXACT HTML structure ║
   ║  and behaviour from the Base tab:        ║
   ║                                          ║
   ║  • .cb-toggle  — dark-mode switch        ║
   ║  • .cb-tags-container / .cb-tag /        ║
   ║    .cb-tag-input — tags field            ║
   ║  • .cb-text-field — title / description  ║
   ║  • .cb-segmented — variant selector      ║
   ║  • .cb-range  — (reserved for future     ║
   ║    color-blend sliders)                  ║
   ║                                          ║
   ║  New controls (tcm-color-item, accent    ║
   ║  chip list) follow the same cb- naming   ║
   ║  convention. Only IDs are renamed with   ║
   ║  a "tcm-" prefix to avoid collisions.   ║
   ║                                          ║
   ║  Any future addition MUST be documented  ║
   ║  here and follow the same pattern.       ║
   ╚══════════════════════════════════════════╝
   ======================================== */

(function () {
    "use strict";

    /* ════════════════════════════════════════
       CONSTANTS
       ════════════════════════════════════════ */
    const KEY_CUSTOM  = "customization-custom-themes";
    const KEY_ACCENT  = "customization-accent-color";
    const KEY_THEME   = "customization-active-theme";

    const STEPS = [
        { id: "info",   label: "Info",   icon: "fa-id-card" },
        { id: "colors", label: "Colors", icon: "fa-palette" },
        { id: "meta",   label: "Meta",   icon: "fa-tags"    }
    ];

    /* The 5 hand-picked editable colors */
    const BASE_COLOR_DEFS = [
        { key: "--bg-color",      label: "Background",    hint: "Page background",              required: true  },
        { key: "--card-bg",       label: "Card / Surface",hint: "Cards, modals, overlays",      required: true  },
        { key: "--surface-color", label: "Surface",       hint: "Elevated panels & drawers",    required: true  },
        { key: "--accent-color",  label: "Accent",        hint: "Buttons, links, focus rings",  required: true  },
        { key: "--border-color",  label: "Border",        hint: "Lines, dividers, outlines",    required: false }
    ];

    /* Emoji palette for the icon picker */
    const EMOJI_PALETTE = [
        "🌙","☀️","🌤️","🌈","🌊","🌿","🔥","❄️","⚡","🌸",
        "🎨","🎭","🎪","🎯","🪐","💎","🦋","🌺","🍃","🎆",
        "🖤","🤍","💜","💙","💚","🧡","❤️","🩵","🩶","🤎"
    ];

    /* Suggested tag pills */
    const PRESET_TAGS = ["dark","light","minimal","colorful","dynamic","custom","warm","cool","monochrome","vibrant","pastel","neon","soft","bold","seasonal"];

    /* ════════════════════════════════════════
       STATE
       ════════════════════════════════════════ */
    let currentStep    = 0;
    let isEditMode     = false;
    let editThemeId    = null;

    /* The working draft — mutated by every form interaction */
    let draft = createDraft();

    function createDraft(base) {
        return {
            id:                     base?.id                     || null,
            name:                   base?.name                   || "",
            description:            base?.description            || "",
            icon:                   base?.icon                   || "🎨",
            isDarkThemed:           base?.isDarkThemed           ?? false,
            tags:                   [...(base?.tags              || [])],
            recommendedAccentColors:[...(base?.recommendedAccentColors || ["#6196ff"])],
            /* Base colors (the 5 editable ones) */
            baseColors: {
                "--bg-color":       base?.colors?.["--bg-color"]      || "#f9f9f9",
                "--card-bg":        base?.colors?.["--card-bg"]       || "#ffffff",
                "--surface-color":  base?.colors?.["--surface-color"] || "#ffffff",
                "--accent-color":   base?.colors?.["--accent-color"]  || (localStorage.getItem(KEY_ACCENT) || "#6196ff"),
                "--border-color":   base?.colors?.["--border-color"]  || "#e0e0e0"
            },
            /* Full generated color map (populated by generateColors) */
            colors: {}
        };
    }

    /* ════════════════════════════════════════
       PUBLIC API — hooked into themes.js
       ════════════════════════════════════════ */
    window.themeCreator = {
        open:     openModal,
        openEdit: openEdit,
        close:    closeModal
    };

    /* ════════════════════════════════════════
       COLOR GENERATION ENGINE
       ════════════════════════════════════════ */

    /**
     * Parse any CSS hex color into {r,g,b}.
     */
    function hexToRGB(hex) {
        let h = hex.replace("#", "");
        if (h.length === 3) h = h.split("").map(c => c + c).join("");
        const n = parseInt(h, 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function rgbToHex(r, g, b) {
        return "#" + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v)))
            .toString(16).padStart(2, "0")).join("");
    }

    /** Lighten (+) or darken (−) a hex color by an amount (0–255) */
    function shiftLightness(hex, amount) {
        const { r, g, b } = hexToRGB(hex);
        return rgbToHex(r + amount, g + amount, b + amount);
    }

    /** Mix two hex colours */
    function mix(hexA, hexB, t = 0.5) {
        const a = hexToRGB(hexA), b = hexToRGB(hexB);
        return rgbToHex(
            a.r + (b.r - a.r) * t,
            a.g + (b.g - a.g) * t,
            a.b + (b.b - a.b) * t
        );
    }

    /** Perceived luminance (0–1) */
    function luminance(hex) {
        const { r, g, b } = hexToRGB(hex);
        const l = [r, g, b].map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
    }

    /**
     * Given the 5 base colors + isDark, derive every other CSS variable.
     * Returns the full colors map (same shape as themes.json colors object).
     */
    function generateColors(base, isDark) {
        const bg      = base["--bg-color"]      || (isDark ? "#121212" : "#f9f9f9");
        const card    = base["--card-bg"]        || (isDark ? "#1e1e1e" : "#ffffff");
        const surface = base["--surface-color"]  || card;
        const accent  = base["--accent-color"]   || "#6196ff";
        const border  = base["--border-color"]   || (isDark ? "#333333" : "#e0e0e0");
        const shift   = isDark ? 18 : -18;

        /* Text color — high-contrast against bg */
        const bgLum    = luminance(bg);
        const textBase = bgLum > 0.35 ? "#1a1a1a" : "#f0f0f0";
        const textMut  = bgLum > 0.35 ? "#666666" : "#a0a0a0";

        /* Surfaces */
        const surfaceAlt = shiftLightness(surface, isDark ? 8 : -6);
        const inputBg    = mix(bg, card, 0.5);
        const highlight  = shiftLightness(card, isDark ? 12 : -8);
        const divider    = shiftLightness(border, isDark ? 8 : -5);

        /* Semantics */
        const dangerColor  = isDark ? "#f87171" : "#ef4444";
        const dangerHover  = isDark ? "#ef4444" : "#dc2626";
        const dangerBg     = isDark ? "#7f1d1d" : "#fecaca";
        const successColor = "#10b981";
        const successBg    = isDark ? "#064e3b" : "#d1fae5";
        const warnBg       = isDark ? "#7f1d1d" : "#fee2e2";
        const warnBorder   = isDark ? "#dc2626" : "#ef4444";
        const warnText     = isDark ? "#fecaca" : "#991b1b";

        /* Shadows */
        const shadowA  = isDark ? 0.4 : 0.1;
        const shadowB  = isDark ? 0.4 : 0.15;
        const shadowM  = isDark ? 0.6 : 0.5;

        /* Text-on-accent: pick white or black based on accent luminance */
        const aLum      = luminance(accent);
        const textOnAcc = aLum > 0.35 ? "#1a1a1a" : "#ffffff";

        return {
            "--text-color":           textBase,
            "--text-muted":           textMut,
            "--bg-color":             bg,
            "--surface-color":        surface,
            "--surface-alt":          surfaceAlt,
            "--card-bg":              card,
            "--input-bg":             inputBg,
            "--highlight-color":      highlight,
            "--danger-color":         dangerColor,
            "--danger-hover":         dangerHover,
            "--danger-bg":            dangerBg,
            "--success-color":        successColor,
            "--success-bg":           successBg,
            "--warning-bg":           warnBg,
            "--warning-border":       warnBorder,
            "--warning-text":         warnText,
            "--warning-text-dark":    "#fecaca",
            "--border-color":         border,
            "--divider-color":        divider,
            "--shadow-color":         `rgba(0,0,0,${shadowA})`,
            "--shadow-color-strong":  `rgba(0,0,0,${shadowB})`,
            "--shadow-color-modal":   `rgba(0,0,0,${shadowM})`,
            "--overlay-bg":           isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.5)",
            "--overlay-bg-strong":    isDark ? "rgba(0,0,0,0.9)" : "rgba(0,0,0,0.85)",
            "--accent-color":         accent,
            "--text-on-accent":       textOnAcc,
            "--text-on-danger":       "white"
        };
    }

    /** Human-readable labels for the generated color matrix */
    const GEN_COLOR_LABELS = [
        { key: "--text-color",        name: "Text" },
        { key: "--text-muted",        name: "Muted text" },
        { key: "--surface-alt",       name: "Surface alt" },
        { key: "--input-bg",          name: "Input bg" },
        { key: "--highlight-color",   name: "Highlight" },
        { key: "--divider-color",     name: "Divider" },
        { key: "--success-color",     name: "Success" },
        { key: "--danger-color",      name: "Danger" },
        { key: "--shadow-color",      name: "Shadow" },
        { key: "--overlay-bg",        name: "Overlay" },
        { key: "--text-on-accent",    name: "On accent" },
        { key: "--warning-border",    name: "Warning" }
    ];

    /* ════════════════════════════════════════
       MODAL INJECTION
       ════════════════════════════════════════ */
    function injectModal() {
        if (document.getElementById("tcmOverlay")) return;

        const el = document.createElement("div");
        el.id        = "tcmOverlay";
        el.className = "tcm-overlay";
        el.setAttribute("role", "dialog");
        el.setAttribute("aria-modal", "true");
        el.setAttribute("aria-labelledby", "tcmTitle");

        el.innerHTML = buildShellHTML();
        document.body.appendChild(el);

        bindStaticEvents();
    }

    function buildShellHTML() {
        return `
        <div class="tcm-shell" id="tcmShell">

            <!-- Header -->
            <div class="tcm-header">
                <div class="tcm-header-left">
                    <div class="tcm-header-icon"><i class="fa-solid fa-palette"></i></div>
                    <div>
                        <h2 id="tcmTitle">Create Theme</h2>
                        <p class="tcm-header-subtitle" id="tcmSubtitle">Design a custom colour scheme</p>
                    </div>
                </div>
                <div class="tcm-header-actions">
                    <button class="tcm-close-btn" id="tcmCloseBtn" aria-label="Close modal">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </div>

            <!-- Steps -->
            <div class="tcm-steps" id="tcmSteps">
                ${STEPS.map((s, i) => `
                    <button class="tcm-step${i === 0 ? " active" : ""}" data-step="${i}">
                        <span class="tcm-step-num">${i + 1}</span>
                        ${s.label}
                    </button>
                `).join("")}
            </div>

            <!-- Body -->
            <div class="tcm-body">

                <!-- ── Panel 0: Info ── -->
                <div class="tcm-panel active" data-panel="0" id="tcmPanelInfo">

                    <!-- Emoji / Icon -->
                    <div class="tcm-field">
                        <span class="tcm-label"><i class="fa-solid fa-face-smile"></i> Icon</span>
                        <div class="tcm-emoji-row">
                            <button class="tcm-emoji-preview" id="tcmEmojiPreview" aria-label="Selected icon" title="Click to randomise">
                                🎨
                            </button>
                            <div class="tcm-emoji-grid" id="tcmEmojiGrid">
                                ${EMOJI_PALETTE.map(e => `
                                    <button class="tcm-emoji-btn${e === "🎨" ? " selected" : ""}" data-emoji="${e}" aria-label="${e}">${e}</button>
                                `).join("")}
                            </div>
                        </div>
                        <span class="tcm-hint">Click the large emoji to pick a random one, or choose from the grid.</span>
                    </div>

                    <div class="tcm-divider"></div>

                    <!-- Title (mirrors cb-text-field, item 7) -->
                    <div class="tcm-field" id="tcmFieldTitle">
                        <label class="tcm-label" for="tcmInputTitle">
                            <i class="fa-solid fa-heading"></i> Name <span style="color:var(--danger-color)">*</span>
                        </label>
                        <div class="cb-text-field">
                            <input
                                type="text"
                                id="tcmInputTitle"
                                placeholder=" "
                                maxlength="48"
                                autocomplete="off"
                            />
                            <label for="tcmInputTitle">Theme name</label>
                        </div>
                        <span class="tcm-hint">Keep it short and descriptive — max 48 characters.</span>
                    </div>

                    <!-- Description -->
                    <div class="tcm-field">
                        <label class="tcm-label" for="tcmInputDesc">
                            <i class="fa-solid fa-align-left"></i> Description
                        </label>
                        <textarea
                            class="tcm-textarea"
                            id="tcmInputDesc"
                            placeholder="A short description of the mood / style…"
                            maxlength="140"
                            rows="3"
                        ></textarea>
                        <span class="tcm-hint">Max 140 characters.</span>
                    </div>

                </div>

                <!-- ── Panel 1: Colors ── -->
                <div class="tcm-panel" data-panel="1" id="tcmPanelColors">

                    <!-- Dark mode toggle (mirrors cb-toggle, item 2) -->
                    <div class="tcm-mode-toggle-wrap" id="tcmModeWrap">
                        <div class="tcm-mode-info">
                            <div class="tcm-mode-emoji" id="tcmModeEmoji">☀️</div>
                            <div class="tcm-mode-text">
                                <strong id="tcmModeLabel">Light Theme</strong>
                                <span id="tcmModeDesc">Bright backgrounds, dark text</span>
                            </div>
                        </div>
                        <!-- EXACT cb-toggle structure from base tab item 2 — id prefixed tcm- -->
                        <label class="cb-toggle" id="tcmDarkToggleLabel" aria-label="Toggle dark mode">
                            <input type="checkbox" id="tcmDarkToggle" />
                            <span class="cb-toggle-track"></span>
                            <span class="cb-toggle-thumb"></span>
                        </label>
                    </div>

                    <!-- 5 editable colors -->
                    <div class="tcm-field">
                        <span class="tcm-label"><i class="fa-solid fa-swatchbook"></i> Base Colors</span>
                        <div class="tcm-colors-grid" id="tcmColorsGrid">
                            <!-- populated by renderColorPickers() -->
                        </div>
                    </div>

                    <div class="tcm-divider"></div>

                    <!-- Generated color preview -->
                    <div class="tcm-field">
                        <span class="tcm-label">
                            <i class="fa-solid fa-wand-magic-sparkles"></i>
                            Auto-generated Colors
                            <span class="tcm-gen-badge"><i class="fa-solid fa-bolt"></i> auto</span>
                        </span>
                        <span class="tcm-hint" style="margin-bottom:0.5rem;">
                            These are computed from your base colors and dark/light mode. You cannot edit them directly.
                        </span>
                        <div class="tcm-generated-strip" id="tcmGeneratedStrip">
                            <!-- populated by updateGeneratedPreview() -->
                        </div>
                    </div>

                </div>

                <!-- ── Panel 2: Meta ── -->
                <div class="tcm-panel" data-panel="2" id="tcmPanelMeta">

                    <!-- Recommended accent colors -->
                    <div class="tcm-field">
                        <span class="tcm-label"><i class="fa-solid fa-droplet"></i> Recommended Accents</span>
                        <span class="tcm-hint">
                            Accent swatches shown on the theme card so users can quickly try complementary colours.
                        </span>
                        <div class="tcm-accents-list" id="tcmAccentsList">
                            <!-- populated by renderAccentsList() -->
                        </div>
                        <div class="tcm-add-accent-row" style="margin-top:0.5rem;">
                            <input type="color" class="tcm-add-accent-color" id="tcmAccentColorPick" value="#6196ff" />
                            <button class="tcm-add-accent-btn" id="tcmAccentAddBtn">
                                <i class="fa-solid fa-plus"></i> Add accent
                            </button>
                        </div>
                    </div>

                    <div class="tcm-divider"></div>

                    <!-- Tags (mirrors cb-tags-container, item 13) -->
                    <div class="tcm-field">
                        <span class="tcm-label"><i class="fa-solid fa-tags"></i> Tags</span>
                        <span class="tcm-hint" style="margin-bottom:0.4rem;">
                            Press <kbd style="font-size:0.65rem;padding:1px 5px;border:1px solid var(--border-color);border-radius:3px;">Enter</kbd>
                            or comma to add. Click a preset to toggle.
                        </span>
                        <!-- EXACT cb-tags-container structure from base tab item 13 — id prefixed tcm- -->
                        <div class="cb-tags-container" id="tcmTagsContainer">
                            <input type="text" class="cb-tag-input" id="tcmTagInput" placeholder="Add tag…" maxlength="24" />
                        </div>
                        <div class="tcm-preset-tags" id="tcmPresetTags" style="margin-top:0.5rem;">
                            ${PRESET_TAGS.map(t => `<button class="tcm-preset-tag" data-ptag="${t}">${t}</button>`).join("")}
                        </div>
                    </div>

                    <div class="tcm-divider"></div>

                    <!-- Variant: does the theme have a dark/light sibling? -->
                    <div class="tcm-field">
                        <span class="tcm-label"><i class="fa-solid fa-circle-half-stroke"></i> Variant</span>
                        <span class="tcm-hint" style="margin-bottom:0.4rem;">Declare whether this theme is light, dark, or adaptive.</span>
                        <!-- mirrors cb-segmented, item 5 — id prefixed tcm- -->
                        <div class="cb-segmented" id="tcmVariantSeg" data-segmented>
                            <button class="cb-segmented-btn active" data-variant="light">Light</button>
                            <button class="cb-segmented-btn" data-variant="dark">Dark</button>
                            <button class="cb-segmented-btn" data-variant="auto">Auto</button>
                        </div>
                    </div>

                </div>

                <!-- ── Live Preview Sidebar ── -->
                <aside class="tcm-preview-sidebar" id="tcmPreviewSidebar">
                    <p class="tcm-preview-title">Live Preview</p>

                    <!-- Mockup -->
                    <div class="tcm-live-mockup" id="tcmLiveMockup">
                        <div class="tcm-mockup-bar" id="tcmMockupBar">
                            <div class="tcm-mockup-dot"></div>
                            <div class="tcm-mockup-dot"></div>
                            <div class="tcm-mockup-strip" id="tcmMockupStrip"></div>
                        </div>
                        <div class="tcm-mockup-body" id="tcmMockupBody">
                            <div class="tcm-mockup-aside" id="tcmMockupAside">
                                <div class="tcm-mockup-dot-accent" id="tcmMockupAccentDot"></div>
                                <div class="tcm-mockup-line" id="tcmMockupLine1"></div>
                                <div class="tcm-mockup-line" id="tcmMockupLine2" style="width:60%;opacity:0.5;"></div>
                            </div>
                            <div class="tcm-mockup-main" id="tcmMockupMain">
                                <div class="tcm-mockup-card" id="tcmMockupCard">
                                    <div class="tcm-mockup-line" id="tcmMockupCardLine1"></div>
                                    <div class="tcm-mockup-line" id="tcmMockupCardLine2" style="width:55%;opacity:0.4;"></div>
                                    <div class="tcm-mockup-btn" id="tcmMockupBtn"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Auto-gen matrix -->
                    <p class="tcm-preview-title" style="margin-top:0.25rem;">Generated</p>
                    <div class="tcm-gen-matrix" id="tcmGenMatrix">
                        <!-- populated by updateLivePreview() -->
                    </div>
                </aside>

            </div>

            <!-- Footer -->
            <div class="tcm-footer">
                <div class="tcm-footer-left">
                    <i class="fa-solid fa-circle-info" style="color:var(--text-muted);font-size:0.8rem;"></i>
                    <span id="tcmFooterHint">Fill in a name to continue.</span>
                </div>
                <div class="tcm-footer-right">
                    <button class="tcm-btn tcm-btn-secondary" id="tcmBtnBack">
                        <i class="fa-solid fa-chevron-left"></i> Back
                    </button>
                    <button class="tcm-btn tcm-btn-secondary" id="tcmBtnCancel">Cancel</button>
                    <button class="tcm-btn tcm-btn-primary" id="tcmBtnNext">
                        Next <i class="fa-solid fa-chevron-right"></i>
                    </button>
                </div>
            </div>

        </div>
        `;
    }

    /* ════════════════════════════════════════
       OPEN / CLOSE
       ════════════════════════════════════════ */
    function openModal(preload) {
        injectModal();

        isEditMode  = false;
        editThemeId = null;
        draft       = createDraft(preload || null);
        currentStep = 0;

        document.getElementById("tcmTitle").textContent    = "Create Theme";
        document.getElementById("tcmSubtitle").textContent = "Design a custom colour scheme";

        populateForms();
        goToStep(0);
        show();
    }

    function openEdit(theme) {
        injectModal();

        isEditMode  = true;
        editThemeId = theme.id;
        draft       = createDraft(theme);
        currentStep = 0;

        document.getElementById("tcmTitle").textContent    = "Edit Theme";
        document.getElementById("tcmSubtitle").textContent = `Editing: ${theme.name}`;

        populateForms();
        goToStep(0);
        show();
    }

    function show() {
        const el = document.getElementById("tcmOverlay");
        if (!el) return;
        el.classList.add("active");
        document.body.style.overflow = "hidden";
        // Focus the first input after transition
        setTimeout(() => document.getElementById("tcmInputTitle")?.focus(), 350);
    }

    function closeModal(force) {
        const el = document.getElementById("tcmOverlay");
        if (!el) return;

        if (!force && draftIsDirty()) {
            showTcmConfirm({
                title:   "Discard changes?",
                body:    "You have unsaved changes in the theme editor. Discard them?",
                confirm: "Discard",
                variant: "danger",
                onOk:    () => doClose()
            });
            return;
        }
        doClose();
    }

    function doClose() {
        const el = document.getElementById("tcmOverlay");
        if (el) el.classList.remove("active");
        document.body.style.overflow = "";
    }

    function draftIsDirty() {
        return draft.name.trim() !== "" || draft.tags.length > 0;
    }

    /* ════════════════════════════════════════
       STEP NAVIGATION
       ════════════════════════════════════════ */
    function goToStep(n) {
        currentStep = Math.max(0, Math.min(STEPS.length - 1, n));

        /* Update step indicators */
        document.querySelectorAll(".tcm-step").forEach((btn, i) => {
            btn.classList.toggle("active", i === currentStep);
            btn.classList.toggle("done",   i  < currentStep);
        });

        /* Show correct panel */
        document.querySelectorAll(".tcm-panel").forEach((panel, i) => {
            panel.classList.toggle("active", i === currentStep);
        });

        /* Footer buttons */
        const backBtn = document.getElementById("tcmBtnBack");
        const nextBtn = document.getElementById("tcmBtnNext");

        backBtn.style.display = currentStep === 0 ? "none" : "";

        if (currentStep === STEPS.length - 1) {
            nextBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save Theme`;
        } else {
            nextBtn.innerHTML = `Next <i class="fa-solid fa-chevron-right"></i>`;
        }

        updateFooterHint();
    }

    function tryAdvance() {
        if (!validateStep(currentStep)) return;
        if (currentStep < STEPS.length - 1) {
            goToStep(currentStep + 1);
        } else {
            saveTheme();
        }
    }

    function validateStep(n) {
        clearValidationErrors();

        if (n === 0) {
            if (!draft.name.trim()) {
                showFieldError("tcmFieldTitle", "Name is required.");
                return false;
            }
        }

        if (n === 1) {
            for (const def of BASE_COLOR_DEFS) {
                if (def.required && !draft.baseColors[def.key]) {
                    showTcmToast(`Color "${def.label}" is required.`, "danger");
                    return false;
                }
            }
        }

        return true;
    }

    function clearValidationErrors() {
        document.querySelectorAll(".tcm-field.has-error").forEach(f => f.classList.remove("has-error"));
        document.querySelectorAll(".tcm-error").forEach(e => e.remove());
    }

    function showFieldError(fieldId, msg) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        field.classList.add("has-error");
        const span = document.createElement("span");
        span.className = "tcm-error";
        span.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${msg}`;
        field.appendChild(span);
    }

    function updateFooterHint() {
        const hint = document.getElementById("tcmFooterHint");
        if (!hint) return;
        const msgs = [
            "Fill in a name to continue.",
            "Choose your base colours — the rest is auto-generated.",
            "Add tags and recommended accents, then save."
        ];
        hint.textContent = msgs[currentStep] || "";
    }

    /* ════════════════════════════════════════
       FORM POPULATION
       ════════════════════════════════════════ */
    function populateForms() {
        /* Panel 0 */
        const titleInput = document.getElementById("tcmInputTitle");
        const descInput  = document.getElementById("tcmInputDesc");
        if (titleInput) titleInput.value = draft.name;
        if (descInput)  descInput.value  = draft.description;
        setEmojiSelected(draft.icon);

        /* Panel 1 */
        const darkToggle = document.getElementById("tcmDarkToggle");
        if (darkToggle) {
            darkToggle.checked = !!draft.isDarkThemed;
            updateModeUI(draft.isDarkThemed);
        }
        renderColorPickers();
        regenAndPreview();

        /* Panel 2 */
        renderTagsFromDraft();
        renderAccentsList();
        updatePresetTagBtns();

        /* Variant segmented */
        const seg = document.getElementById("tcmVariantSeg");
        if (seg) {
            const variant = draft.isDarkThemed === true ? "dark"
                          : draft.isDarkThemed === false ? "light"
                          : "auto";
            seg.querySelectorAll(".cb-segmented-btn").forEach(btn => {
                btn.classList.toggle("active", btn.dataset.variant === variant);
            });
        }
    }

    /* ════════════════════════════════════════
       COLOR PICKERS
       (New tcm-color-item — no base-tab equiv.)
       ════════════════════════════════════════ */
    function renderColorPickers() {
        const grid = document.getElementById("tcmColorsGrid");
        if (!grid) return;

        grid.innerHTML = BASE_COLOR_DEFS.map(def => `
            <div class="tcm-color-item" data-key="${def.key}">
                <div class="tcm-color-item-label">
                    ${def.label}
                    ${def.required ? `<span class="tcm-color-required">required</span>` : ""}
                </div>
                <div class="tcm-color-row" id="tcmColorRow_${sanitizeId(def.key)}" tabindex="0" role="group" aria-label="${def.label} color">
                    <input
                        type="color"
                        class="tcm-color-native"
                        id="tcmColorNative_${sanitizeId(def.key)}"
                        value="${draft.baseColors[def.key] || "#ffffff"}"
                        aria-label="${def.label} colour swatch"
                    />
                    <input
                        type="text"
                        class="tcm-hex-input"
                        id="tcmHex_${sanitizeId(def.key)}"
                        value="${(draft.baseColors[def.key] || "#ffffff").toUpperCase()}"
                        placeholder="#------"
                        maxlength="7"
                        spellcheck="false"
                        aria-label="${def.label} hex value"
                    />
                </div>
                <span class="tcm-hint" style="margin-top:0;">${def.hint}</span>
            </div>
        `).join("");

        /* Bind color ↔ hex sync */
        BASE_COLOR_DEFS.forEach(def => {
            const safeKey  = sanitizeId(def.key);
            const native   = document.getElementById(`tcmColorNative_${safeKey}`);
            const hexInput = document.getElementById(`tcmHex_${safeKey}`);

            if (!native || !hexInput) return;

            /* native color → update hex + draft */
            native.addEventListener("input", () => {
                const v = native.value;
                hexInput.value = v.toUpperCase();
                draft.baseColors[def.key] = v;
                regenAndPreview();
            });

            /* hex text → update native + draft (validate on blur) */
            hexInput.addEventListener("input", () => {
                const raw = hexInput.value.trim();
                if (/^#?[0-9a-fA-F]{6}$/.test(raw)) {
                    const hex = raw.startsWith("#") ? raw : "#" + raw;
                    native.value = hex;
                    draft.baseColors[def.key] = hex;
                    regenAndPreview();
                }
            });

            hexInput.addEventListener("blur", () => {
                /* Normalize */
                hexInput.value = (draft.baseColors[def.key] || "#ffffff").toUpperCase();
            });

            /* Click row → open native picker */
            const row = document.getElementById(`tcmColorRow_${safeKey}`);
            row?.addEventListener("click", e => {
                if (e.target !== native && e.target !== hexInput) native.click();
            });
        });
    }

    function sanitizeId(str) {
        return str.replace(/[^a-zA-Z0-9]/g, "_");
    }

    /* ════════════════════════════════════════
       LIVE PREVIEW UPDATE
       ════════════════════════════════════════ */
    function regenAndPreview() {
        draft.colors = generateColors(draft.baseColors, draft.isDarkThemed);
        updateGeneratedStrip();
        updateLivePreview();
    }

    function updateGeneratedStrip() {
        const strip = document.getElementById("tcmGeneratedStrip");
        if (!strip) return;

        strip.innerHTML = GEN_COLOR_LABELS.map(item => {
            const val = draft.colors[item.key];
            const swatchStyle = val && val.startsWith("rgba") ? `background:${val};`
                : val ? `background:${val};` : "background:var(--border-color);";

            return `
                <div class="tcm-gen-preview-item">
                    <div class="tcm-gen-preview-swatch" style="${swatchStyle}" title="${val || "n/a"}"></div>
                    <span class="tcm-gen-preview-name">${item.name}</span>
                </div>
            `;
        }).join("");
    }

    function updateLivePreview() {
        const c = draft.colors;
        const b = draft.baseColors;
        if (!c || !Object.keys(c).length) return;

        const bg     = b["--bg-color"]     || "#f9f9f9";
        const card   = b["--card-bg"]      || "#ffffff";
        const accent = b["--accent-color"] || "#6196ff";
        const border = b["--border-color"] || "#e0e0e0";
        const text   = c["--text-color"]   || "#333333";
        const textMt = c["--text-muted"]   || "#888";
        const aside  = c["--highlight-color"] || card;

        /* Mockup bar */
        el("tcmMockupBar",        `background:${card};border-bottom:1px solid ${border};`);
        el("tcmMockupStrip",      `background:${accent};`);
        /* Mockup body */
        el("tcmMockupBody",       `background:${bg};`);
        el("tcmMockupAside",      `background:${aside};border-color:${border};`);
        el("tcmMockupAccentDot",  `background:${accent};`);
        el("tcmMockupLine1",      `background:${textMt};`);
        el("tcmMockupLine2",      `background:${textMt};`);
        el("tcmMockupMain",       `background:${bg};`);
        el("tcmMockupCard",       `background:${card};border-color:${border};`);
        el("tcmMockupCardLine1",  `background:${text};`);
        el("tcmMockupCardLine2",  `background:${textMt};`);
        el("tcmMockupBtn",        `background:${accent};`);

        /* Gen matrix in sidebar */
        const matrix = document.getElementById("tcmGenMatrix");
        if (matrix) {
            matrix.innerHTML = GEN_COLOR_LABELS.slice(0, 8).map(item => {
                const val = c[item.key];
                const isShadow = val && val.startsWith("rgba");
                return `
                    <div class="tcm-gen-row">
                        <div class="tcm-gen-swatch" style="${isShadow ? `background:rgba(0,0,0,0.15);border:1px solid var(--border-color);` : `background:${val};`}" title="${val || ""}"></div>
                        <span class="tcm-gen-label">${item.name}</span>
                    </div>
                `;
            }).join("");
        }
    }

    /** Helper: set inline style on element by id */
    function el(id, style) {
        const node = document.getElementById(id);
        if (node) node.style.cssText = style;
    }

    /* ════════════════════════════════════════
       DARK MODE TOGGLE
       ════════════════════════════════════════ */
    function updateModeUI(isDark) {
        draft.isDarkThemed = isDark;

        const wrap  = document.getElementById("tcmModeWrap");
        const emoji = document.getElementById("tcmModeEmoji");
        const label = document.getElementById("tcmModeLabel");
        const desc  = document.getElementById("tcmModeDesc");

        if (wrap)  wrap.classList.toggle("is-dark", isDark);
        if (emoji) emoji.textContent = isDark ? "🌙" : "☀️";
        if (label) label.textContent = isDark ? "Dark Theme"  : "Light Theme";
        if (desc)  desc.textContent  = isDark ? "Dark backgrounds, light text" : "Bright backgrounds, dark text";

        /* Apply smart default base colors if user hasn't touched them yet */
        if (isDark) {
            if (draft.baseColors["--bg-color"]      === "#f9f9f9") draft.baseColors["--bg-color"]      = "#121212";
            if (draft.baseColors["--card-bg"]        === "#ffffff") draft.baseColors["--card-bg"]        = "#1e1e1e";
            if (draft.baseColors["--surface-color"]  === "#ffffff") draft.baseColors["--surface-color"]  = "#1e1e1e";
            if (draft.baseColors["--border-color"]   === "#e0e0e0") draft.baseColors["--border-color"]   = "#333333";
        } else {
            if (draft.baseColors["--bg-color"]      === "#121212") draft.baseColors["--bg-color"]      = "#f9f9f9";
            if (draft.baseColors["--card-bg"]        === "#1e1e1e") draft.baseColors["--card-bg"]        = "#ffffff";
            if (draft.baseColors["--surface-color"]  === "#1e1e1e") draft.baseColors["--surface-color"]  = "#ffffff";
            if (draft.baseColors["--border-color"]   === "#333333") draft.baseColors["--border-color"]   = "#e0e0e0";
        }

        /* Sync variant segmented if it exists */
        const seg = document.getElementById("tcmVariantSeg");
        if (seg) {
            const variant = isDark ? "dark" : "light";
            seg.querySelectorAll(".cb-segmented-btn").forEach(btn => {
                btn.classList.toggle("active", btn.dataset.variant === variant);
            });
        }

        /* Re-render color pickers to show updated defaults */
        renderColorPickers();
        regenAndPreview();
    }

    /* ════════════════════════════════════════
       EMOJI PICKER
       ════════════════════════════════════════ */
    function setEmojiSelected(emoji) {
        draft.icon = emoji;
        const preview = document.getElementById("tcmEmojiPreview");
        if (preview) preview.textContent = emoji;

        document.querySelectorAll(".tcm-emoji-btn").forEach(btn => {
            btn.classList.toggle("selected", btn.dataset.emoji === emoji);
        });
    }

    /* ════════════════════════════════════════
       TAGS (mirrors cb-tags pattern exactly)
       ════════════════════════════════════════ */
    function renderTagsFromDraft() {
        const container = document.getElementById("tcmTagsContainer");
        if (!container) return;

        /* Remove existing tags (keep input) */
        container.querySelectorAll(".cb-tag").forEach(t => t.remove());

        draft.tags.forEach(tag => addTagChip(tag));
    }

    function addTagChip(tag) {
        const container = document.getElementById("tcmTagsContainer");
        const input     = document.getElementById("tcmTagInput");
        if (!container || !input) return;

        if (draft.tags.includes(tag)) return; /* No dupes */
        draft.tags.push(tag);

        /* Exact cb-tag markup from base tab */
        const chip = document.createElement("span");
        chip.className = "cb-tag";
        chip.innerHTML = `${tag} <button class="cb-tag-remove" aria-label="Remove ${tag}">&times;</button>`;
        chip.querySelector(".cb-tag-remove").addEventListener("click", () => {
            chip.remove();
            draft.tags = draft.tags.filter(t => t !== tag);
            updatePresetTagBtns();
        });

        container.insertBefore(chip, input);
        updatePresetTagBtns();
    }

    function updatePresetTagBtns() {
        document.querySelectorAll(".tcm-preset-tag").forEach(btn => {
            btn.classList.toggle("added", draft.tags.includes(btn.dataset.ptag));
        });
    }

    /* ════════════════════════════════════════
       ACCENT COLORS
       ════════════════════════════════════════ */
    function renderAccentsList() {
        const list = document.getElementById("tcmAccentsList");
        if (!list) return;

        list.innerHTML = draft.recommendedAccentColors.map((color, i) => `
            <div class="tcm-accent-chip" data-idx="${i}">
                <div class="tcm-accent-chip-dot" style="background:${color};"></div>
                <span class="tcm-accent-chip-val">${color.toUpperCase()}</span>
                <button class="tcm-accent-chip-rm" data-rm="${i}" aria-label="Remove ${color}">&times;</button>
            </div>
        `).join("");

        list.querySelectorAll(".tcm-accent-chip-rm").forEach(btn => {
            btn.addEventListener("click", () => {
                const idx = parseInt(btn.dataset.rm);
                draft.recommendedAccentColors.splice(idx, 1);
                renderAccentsList();
            });
        });
    }

    /* ════════════════════════════════════════
       SAVE
       ════════════════════════════════════════ */
    function saveTheme() {
        if (!validateStep(0) || !validateStep(1)) {
            goToStep(draft.name.trim() ? 1 : 0);
            return;
        }

        draft.colors = generateColors(draft.baseColors, draft.isDarkThemed);

        const saved = {
            id:                      draft.id || ("custom-" + Date.now()),
            name:                    draft.name.trim(),
            description:             draft.description.trim(),
            icon:                    draft.icon,
            isDarkThemed:            draft.isDarkThemed,
            isSystemCreated:         false,
            tags:                    [...new Set([...draft.tags, "custom"])],
            recommendedAccentColors: [...draft.recommendedAccentColors],
            colors:                  { ...draft.baseColors, ...draft.colors }
        };

        /* Persist */
        let customs = [];
        try { customs = JSON.parse(localStorage.getItem(KEY_CUSTOM) || "[]"); } catch {}
        const idx = customs.findIndex(t => t.id === saved.id);
        if (idx >= 0) customs[idx] = saved;
        else          customs.push(saved);
        localStorage.setItem(KEY_CUSTOM, JSON.stringify(customs));

        doClose();

        /* Notify themes tab */
        window.dispatchEvent(new CustomEvent("tcm:themeSaved", { detail: saved }));

        showTcmToast(
            `<i class="fa-solid fa-check-circle"></i> Theme "<strong>${saved.name}</strong>" saved!`,
            "success"
        );
    }

    /* ════════════════════════════════════════
       STATIC EVENT BINDINGS
       (wired once after injectModal())
       ════════════════════════════════════════ */
    function bindStaticEvents() {

        /* Close */
        document.getElementById("tcmCloseBtn")?.addEventListener("click", () => closeModal(false));
        document.getElementById("tcmBtnCancel")?.addEventListener("click", () => closeModal(false));

        /* Backdrop close */
        document.getElementById("tcmOverlay")?.addEventListener("click", e => {
            if (e.target.id === "tcmOverlay") closeModal(false);
        });

        /* Escape */
        document.addEventListener("keydown", e => {
            if (e.key === "Escape" && document.getElementById("tcmOverlay")?.classList.contains("active")) {
                closeModal(false);
            }
        });

        /* Step buttons */
        document.querySelectorAll(".tcm-step").forEach((btn, i) => {
            btn.addEventListener("click", () => {
                if (i > currentStep && !validateStep(currentStep)) return;
                goToStep(i);
            });
        });

        /* Next / Save */
        document.getElementById("tcmBtnNext")?.addEventListener("click", tryAdvance);

        /* Back */
        document.getElementById("tcmBtnBack")?.addEventListener("click", () => {
            if (currentStep > 0) goToStep(currentStep - 1);
        });

        /* Title input */
        document.getElementById("tcmInputTitle")?.addEventListener("input", e => {
            draft.name = e.target.value;
        });

        /* Description */
        document.getElementById("tcmInputDesc")?.addEventListener("input", e => {
            draft.description = e.target.value;
        });

        /* Dark toggle — EXACT cb-toggle behavior from base tab item 2 */
        document.getElementById("tcmDarkToggle")?.addEventListener("change", e => {
            updateModeUI(e.target.checked);
        });

        /* Emoji grid */
        document.getElementById("tcmEmojiGrid")?.addEventListener("click", e => {
            const btn = e.target.closest(".tcm-emoji-btn");
            if (btn) setEmojiSelected(btn.dataset.emoji);
        });

        /* Emoji preview: random pick */
        document.getElementById("tcmEmojiPreview")?.addEventListener("click", () => {
            const pool = EMOJI_PALETTE.filter(e => e !== draft.icon);
            setEmojiSelected(pool[Math.floor(Math.random() * pool.length)]);
        });

        /* Accent add button */
        document.getElementById("tcmAccentAddBtn")?.addEventListener("click", () => {
            const pick = document.getElementById("tcmAccentColorPick");
            if (!pick) return;
            const hex = pick.value;
            if (!draft.recommendedAccentColors.includes(hex)) {
                draft.recommendedAccentColors.push(hex);
                renderAccentsList();
            }
        });

        /* Tags input — EXACT cb-tag-input behavior from base tab item 13 */
        const tagInput = document.getElementById("tcmTagInput");
        tagInput?.addEventListener("keydown", e => {
            const val = tagInput.value.replace(",", "").trim().toLowerCase();
            if ((e.key === "Enter" || e.key === ",") && val) {
                e.preventDefault();
                addTagChip(val);
                tagInput.value = "";
            } else if (e.key === "Backspace" && !tagInput.value && draft.tags.length) {
                const last = draft.tags[draft.tags.length - 1];
                const chip = document.querySelector(`.cb-tag`);
                /* Find last chip */
                const chips = document.querySelectorAll("#tcmTagsContainer .cb-tag");
                if (chips.length) chips[chips.length - 1].remove();
                draft.tags.pop();
                updatePresetTagBtns();
            }
        });

        /* Preset tag buttons */
        document.getElementById("tcmPresetTags")?.addEventListener("click", e => {
            const btn = e.target.closest(".tcm-preset-tag");
            if (!btn) return;
            const tag = btn.dataset.ptag;
            if (draft.tags.includes(tag)) {
                draft.tags = draft.tags.filter(t => t !== tag);
                document.querySelectorAll(`#tcmTagsContainer .cb-tag`).forEach(chip => {
                    if (chip.textContent.trim().startsWith(tag)) chip.remove();
                });
                updatePresetTagBtns();
            } else {
                addTagChip(tag);
            }
        });

        /* Variant segmented — EXACT cb-segmented behavior from base tab item 5 */
        document.getElementById("tcmVariantSeg")?.addEventListener("click", e => {
            const btn = e.target.closest(".cb-segmented-btn");
            if (!btn) return;

            document.querySelectorAll("#tcmVariantSeg .cb-segmented-btn").forEach(b =>
                b.classList.remove("active")
            );
            btn.classList.add("active");

            const v = btn.dataset.variant;
            const darkToggle = document.getElementById("tcmDarkToggle");

            if (v === "dark") {
                if (darkToggle) darkToggle.checked = true;
                updateModeUI(true);
            } else if (v === "light") {
                if (darkToggle) darkToggle.checked = false;
                updateModeUI(false);
            } else {
                /* auto — keep current */
                draft.isDarkThemed = null;
            }
        });

    }

    /* ════════════════════════════════════════
       MINI TOAST (local, independent of themes.js toasts)
       ════════════════════════════════════════ */
    function showTcmToast(message, type = "info", duration = 3500) {
        const fn = window.themeTabShowToast;
        if (typeof fn === "function") {
            fn(message, type, duration);
            return;
        }

        /* Fallback: inject own minimal toast */
        const container = document.getElementById("themesToastContainer")
            || (() => {
                const c = document.createElement("div");
                c.id = "themesToastContainer";
                c.className = "themes-toast-container";
                document.body.appendChild(c);
                return c;
            })();

        const id    = "tcmt-" + Date.now();
        const toast = document.createElement("div");
        toast.id        = id;
        toast.className = `themes-toast themes-toast-${type}`;
        toast.innerHTML = `<span class="toast-message">${message}</span><button class="toast-close"><i class="fa-solid fa-xmark"></i></button>`;
        container.appendChild(toast);

        requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add("visible")));

        toast.querySelector(".toast-close").addEventListener("click", () => dismissTcmToast(id));
        if (duration > 0) setTimeout(() => dismissTcmToast(id), duration);
    }

    function dismissTcmToast(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove("visible");
        el.classList.add("hiding");
        setTimeout(() => el.remove(), 320);
    }

    /* ════════════════════════════════════════
       LOCAL CONFIRM MODAL
       ════════════════════════════════════════ */
    function showTcmConfirm({ title, body, confirm, variant, onOk }) {
        let el = document.getElementById("tcmLocalConfirm");
        if (!el) {
            el     = document.createElement("div");
            el.id  = "tcmLocalConfirm";
            el.className = "themes-confirm-overlay";
            el.innerHTML = `
                <div class="themes-confirm-modal">
                    <div class="themes-confirm-header">
                        <h3 id="tcmLCTitle"></h3>
                        <p  id="tcmLCBody"></p>
                    </div>
                    <div class="themes-confirm-actions">
                        <button class="modal-btn secondary" id="tcmLCCancel">Cancel</button>
                        <button class="modal-btn primary"   id="tcmLCOk"></button>
                    </div>
                </div>
            `;
            document.body.appendChild(el);
            el.addEventListener("click", e => { if (e.target === el) el.classList.remove("active"); });
        }

        el.querySelector("#tcmLCTitle").textContent = title;
        el.querySelector("#tcmLCBody").textContent  = body;

        const okBtn = el.querySelector("#tcmLCOk");
        const clBtn = el.querySelector("#tcmLCCancel");

        const okNew = okBtn.cloneNode(true);
        const clNew = clBtn.cloneNode(true);
        okBtn.replaceWith(okNew);
        clBtn.replaceWith(clNew);

        okNew.textContent = confirm || "OK";
        okNew.className = `modal-btn primary${variant === "danger" ? " danger" : ""}`;

        okNew.addEventListener("click", () => { el.classList.remove("active"); onOk && onOk(); });
        clNew.addEventListener("click", () => el.classList.remove("active"));

        el.classList.add("active");
        okNew.focus();
    }

    /* ════════════════════════════════════════
       BOOT
       ════════════════════════════════════════ */

    /*
     * ╔══════════════════════════════════════════╗
     * ║  INPUT COMPONENTS REMINDER               ║
     * ║                                          ║
     * ║  All future additions to this modal      ║
     * ║  (e.g. a border-radius slider, a         ║
     * ║  shadow preview, a font picker) MUST     ║
     * ║  use base-tab component structures:      ║
     * ║                                          ║
     * ║  Slider   → .cb-range + .cb-range-wrap   ║
     * ║  Dropdown → .cb-dropdown                 ║
     * ║  Toggle   → .cb-toggle                   ║
     * ║  Checkbox → .cb-checkbox                 ║
     * ║  Radio    → .cb-radio-group              ║
     * ║  Tags     → .cb-tags-container           ║
     * ║  Search   → .cb-search-wrap              ║
     * ║  Text     → .cb-text-field               ║
     * ║                                          ║
     * ║  New types use tcm- prefix and must be   ║
     * ║  documented in this header block.        ║
     * ╚══════════════════════════════════════════╝
     */

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", injectModal);
    } else {
        injectModal();
    }

    /* ── Top-level event listeners (always registered regardless of inject timing) ── */
    window.addEventListener("tcm:openCreate", e => {
        openModal(e.detail || null);
    });

    window.addEventListener("tcm:openEdit", e => {
        if (e.detail) openEdit(e.detail);
    });

})();
