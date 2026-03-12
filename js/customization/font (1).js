/* ========================================
   FONT TAB — font.js

   ╔══════════════════════════════════════╗
   ║  INPUT COMPONENTS RULES              ║
   ║  All controls use base-tab patterns: ║
   ║  .cb-toggle, .cb-range, .cb-dropdown ║
   ║  .cb-stepper, .cb-segmented          ║
   ║  Only IDs are changed.               ║
   ╚══════════════════════════════════════╝
   ======================================== */

(function () {
    "use strict";

    /* ════════════════════════════════════════
       CONSTANTS & STATE
       ════════════════════════════════════════ */
    const KEY_FONT    = "customization-font-settings";
    const KEY_ACCENT  = "customization-accent-color";

    // Built-in font catalogue
    const BUILTIN_FONTS = [
        { name: "Inter",           category: "sans",  stack: "'Inter', sans-serif",           sample: "Ag" },
        { name: "System Default",  category: "system",stack: "system-ui, sans-serif",          sample: "Ag" },
        { name: "Georgia",         category: "serif", stack: "Georgia, serif",                 sample: "Ag" },
        { name: "Palatino",        category: "serif", stack: "'Palatino Linotype', serif",     sample: "Ag" },
        { name: "Courier New",     category: "mono",  stack: "'Courier New', monospace",       sample: "Ag" },
        { name: "Consolas",        category: "mono",  stack: "Consolas, monospace",            sample: "Ag" },
        { name: "Verdana",         category: "sans",  stack: "Verdana, sans-serif",            sample: "Ag" },
        { name: "Trebuchet MS",    category: "sans",  stack: "'Trebuchet MS', sans-serif",     sample: "Ag" },
        { name: "Arial",           category: "sans",  stack: "Arial, sans-serif",              sample: "Ag" },
        { name: "Tahoma",          category: "sans",  stack: "Tahoma, sans-serif",             sample: "Ag" },
    ];

    // Character support definitions per font category
    const CHAR_SUPPORT = {
        sans:   { latin: "full", digits: "full", diacritics: "full",  cyrillic: "partial", arabic: "none",    cjk: "none" },
        serif:  { latin: "full", digits: "full", diacritics: "full",  cyrillic: "partial", arabic: "none",    cjk: "none" },
        mono:   { latin: "full", digits: "full", diacritics: "partial", cyrillic: "none",  arabic: "none",    cjk: "none" },
        system: { latin: "full", digits: "full", diacritics: "full",  cyrillic: "full",    arabic: "partial", cjk: "partial" },
        custom: { latin: "full", digits: "full", diacritics: "partial", cyrillic: "partial", arabic: "none", cjk: "none" },
    };

    const CHAR_LABELS = {
        latin:      { label: "A–Z",      sample: "Abc" },
        digits:     { label: "0–9",      sample: "123" },
        diacritics: { label: "Diacr.",   sample: "âăî" },
        cyrillic:   { label: "Cyrillic", sample: "Кир" },
        arabic:     { label: "Arabic",   sample: "عرب" },
        cjk:        { label: "CJK",      sample: "中文" },
    };

    // Default settings
    const DEFAULTS = {
        fontName:       "Inter",
        fontStack:      "'Inter', sans-serif",
        fontCategory:   "sans",
        syncDevice:     false,
        fontSize:       16,
        lineHeight:     15,    // stored as x10: 1.5
        letterSpacing:  0,
        wordSpacing:    0,
        fontWeight:     "400",
        italic:         false,
        underline:      false,
        strikethrough:  false,
        textTransform:  "none",
        textAlign:      "left",
        fontSmoothing:  true,
        hyphens:        false,
        opentype:       false,
        fontVariant:    "normal",
        capSize:        false,
        textIndent:     0,
        tabSize:        4,
        bodyFontSize:   16,
        headingScale:   1.25,
        paragraphGap:   1.0,
        codeFont:       "Consolas",
        fontRendering:  "auto",
        subpixel:       true,
        colorScheme:    "inherit",
    };

    let settings    = { ...DEFAULTS };
    let allFonts    = [...BUILTIN_FONTS];
    let importedFonts = [];
    let searchQuery = "";
    let filterCat   = "all";
    let section     = null;
    let pendingChange = false;
    let unsavedToastId = null;
    let toastQueue  = [];

    /* ════════════════════════════════════════
       BOOT
       ════════════════════════════════════════ */
    function boot() {
        loadState();
        createSection();
        bindGlobalInteractions();
        applyToDOM();
    }

    /* ════════════════════════════════════════
       STATE
       ════════════════════════════════════════ */
    function loadState() {
        try {
            const saved = JSON.parse(localStorage.getItem(KEY_FONT) || "{}");
            settings = { ...DEFAULTS, ...saved };
            importedFonts = saved._importedFonts || [];
            // Merge imported fonts into allFonts
            importedFonts.forEach(f => {
                if (!allFonts.find(x => x.name === f.name)) allFonts.push(f);
            });
        } catch { settings = { ...DEFAULTS }; }
    }

    function saveState() {
        const toSave = { ...settings, _importedFonts: importedFonts };
        localStorage.setItem(KEY_FONT, JSON.stringify(toSave));
    }

    function applyToDOM() {
        const root = document.documentElement;

        if (settings.syncDevice) {
            root.style.removeProperty("--font-family");
            root.style.removeProperty("--root-font-size");
        } else {
            root.style.setProperty("--font-family", settings.fontStack);
            root.style.setProperty("--root-font-size", settings.fontSize + "px");
        }

        root.style.setProperty("--line-height",     (settings.lineHeight / 10).toFixed(1));
        root.style.setProperty("--letter-spacing",  settings.letterSpacing + "px");
        root.style.setProperty("--font-weight-normal", settings.fontWeight);
    }

    /* ════════════════════════════════════════
       SECTION CREATION
       ════════════════════════════════════════ */
    function createSection() {
        const content = document.querySelector(".custom-content");
        if (!content) return;

        section = document.createElement("div");
        section.className = "custom-section";
        section.id = "fontSection";

        section.innerHTML = buildHTML();

        const base = document.getElementById("baseSection");
        base ? content.insertBefore(section, base) : content.prepend(section);

        const tabBtn = document.querySelector('.sidebar-item[data-section="font"]');
        if (tabBtn && tabBtn.classList.contains("active")) {
            section.classList.add("active");
        }

        initControls();
    }

    /* ════════════════════════════════════════
       HTML BUILDER
       ════════════════════════════════════════ */
    function buildHTML() {
        return `
        <!-- ── HEADER ── -->
        <div class="font-header">
            <div class="font-header-top">
                <div class="font-header-info">
                    <h3><i class="fa-solid fa-font"></i> Typography</h3>
                    <p class="font-tab-desc">
                        Customize fonts, text rendering, and all typographic details.
                    </p>
                </div>
                <div class="font-header-actions">
                    <button class="font-reset-btn" id="fontResetBtn" title="Reset to defaults">
                        <i class="fa-solid fa-rotate-left"></i>
                        <span>Reset</span>
                    </button>
                    <button class="font-save-btn" id="fontSaveBtn">
                        <i class="fa-solid fa-floppy-disk"></i>
                        <span>Save</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- ── BODY ── -->
        <div class="font-body">

            <!-- ════ TOP: FONT SELECTOR ════ -->
            <div>
                <p class="font-section-title"><i class="fa-solid fa-text-height"></i> Font Family</p>
                <div class="font-selector-card">

                    <!-- Preview Band -->
                    <div class="font-preview-band" id="fontPreviewBand">
                        <div class="font-preview-display" id="fontPreviewDisplay">
                            The quick brown fox jumps
                        </div>
                        <div class="font-preview-sub" id="fontPreviewSub">
                            over the lazy dog. 0123456789 !@#$%
                        </div>
                        <div class="font-preview-chars" id="fontPreviewChars">
                            â ă î ș ț Â Ă Î Ș Ț — Romanian diacritics
                        </div>
                    </div>

                    <!-- Search + Category Filter -->
                    <div class="font-controls-row">
                        <div class="font-search-wrap">
                            <i class="fa-solid fa-magnifying-glass font-search-icon"></i>
                            <input
                                type="text"
                                class="font-search-input"
                                id="fontSearchInput"
                                placeholder="Search fonts…"
                                autocomplete="off"
                            />
                            <button class="font-search-clear" id="fontSearchClear">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        <!-- Segmented (mirrors base item 5) -->
                        <div class="font-category-seg" id="fontCategorySeg">
                            <button class="font-cat-btn active" data-cat="all">All</button>
                            <button class="font-cat-btn" data-cat="sans">Sans</button>
                            <button class="font-cat-btn" data-cat="serif">Serif</button>
                            <button class="font-cat-btn" data-cat="mono">Mono</button>
                        </div>
                    </div>

                    <!-- Font List -->
                    <div class="font-list-wrap">
                        <div class="font-list" id="fontList"></div>
                    </div>
                </div>
            </div>

            <!-- ════ GOOGLE FONTS IMPORT (accordion) ════ -->
            <div>
                <p class="font-section-title"><i class="fa-brands fa-google"></i> Import from Google Fonts</p>
                <div class="font-import-card" id="fontImportCard">
                    <button class="font-import-header" id="fontImportToggle" type="button">
                        <div class="font-import-header-left">
                            <i class="fa-solid fa-download"></i>
                            <span>Import a Google Font</span>
                        </div>
                        <i class="fa-solid fa-chevron-down font-import-chevron"></i>
                    </button>
                    <div class="font-import-body">
                        <div class="font-import-content">
                            <p class="font-import-desc">
                                Enter a font name from <strong>fonts.google.com</strong>. It will be loaded
                                via the Google Fonts API and added to your font list.
                            </p>
                            <div class="font-import-input-row">
                                <input
                                    type="text"
                                    class="font-import-input"
                                    id="fontImportInput"
                                    placeholder="e.g. Nunito, Lato, Poppins…"
                                />
                                <button class="font-import-btn" id="fontImportBtn" type="button">
                                    <i class="fa-solid fa-plus"></i> Load
                                </button>
                            </div>
                            <div class="font-import-status" id="fontImportStatus"></div>
                            <div class="font-imported-list" id="fontImportedList"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ════ DEVICE SYNC + CHARACTER SUPPORT ════ -->
            <div class="font-meta-row">

                <!-- Device Sync — toggle (mirrors base item 2) -->
                <div class="font-meta-card">
                    <p class="font-section-title" style="margin:0;"><i class="fa-solid fa-mobile-screen-button"></i> Device Sync</p>
                    <div style="display:flex;flex-direction:column;gap:0.65rem;">
                        <div class="toggle-row">
                            <span class="toggle-label-text">Use device system font</span>
                            <label class="cb-toggle">
                                <input type="checkbox" id="fontSyncDeviceToggle" ${settings.syncDevice ? "checked" : ""}>
                                <span class="cb-toggle-track"></span>
                                <span class="cb-toggle-thumb"></span>
                            </label>
                        </div>
                        <p style="font-size:var(--font-size-xs);color:var(--text-muted);margin:0;line-height:1.5;">
                            When enabled, the app respects your OS font setting (e.g. San Francisco on
                            macOS/iOS, Roboto on Android).
                        </p>
                    </div>
                </div>

                <!-- Character Support -->
                <div class="font-meta-card">
                    <p class="font-section-title" style="margin:0;"><i class="fa-solid fa-language"></i> Character Support</p>
                    <div class="font-char-grid" id="fontCharGrid">
                        <!-- Populated by JS -->
                    </div>
                </div>
            </div>

            <!-- ════ TYPOGRAPHY OPTIONS ════ -->
            <div class="font-options-section">
                <p class="font-section-title"><i class="fa-solid fa-sliders"></i> Typography Options</p>

                <!-- Asymmetric 3-column grid -->
                <div class="font-options-grid" id="fontOptionsGrid">

                    <!-- 1. Font Size [1×1] -->
                    <div class="font-opt-card font-opt-col1">
                        <div class="font-opt-label"><i class="fa-solid fa-text-height"></i> Size</div>
                        <div class="cb-range-wrap">
                            <div class="cb-range-header">
                                <span class="toggle-label-text" style="font-size:0.7rem;">Base (px)</span>
                                <span class="cb-range-value" data-range="fontSizeRange">${settings.fontSize}px</span>
                            </div>
                            <input type="range" class="cb-range" id="fontSizeRange" min="10" max="24" value="${settings.fontSize}">
                        </div>
                        <div class="font-opt-preview" id="fontSizePreview">The quick fox</div>
                    </div>

                    <!-- 2. Line Height [1×1] -->
                    <div class="font-opt-card font-opt-col1">
                        <div class="font-opt-label"><i class="fa-solid fa-arrows-up-down"></i> Leading</div>
                        <div class="cb-range-wrap">
                            <div class="cb-range-header">
                                <span class="toggle-label-text" style="font-size:0.7rem;">Line height</span>
                                <span class="cb-range-value" data-range="fontLineHeightRange">${(settings.lineHeight/10).toFixed(1)}</span>
                            </div>
                            <input type="range" class="cb-range" id="fontLineHeightRange" min="10" max="30" value="${settings.lineHeight}">
                        </div>
                    </div>

                    <!-- 3. Letter Spacing [1×1] -->
                    <div class="font-opt-card font-opt-col1">
                        <div class="font-opt-label"><i class="fa-solid fa-left-right"></i> Tracking</div>
                        <div class="cb-range-wrap">
                            <div class="cb-range-header">
                                <span class="toggle-label-text" style="font-size:0.7rem;">Letter spacing</span>
                                <span class="cb-range-value" data-range="fontLetterSpacingRange">${settings.letterSpacing}px</span>
                            </div>
                            <input type="range" class="cb-range" id="fontLetterSpacingRange" min="-2" max="10" value="${settings.letterSpacing}">
                        </div>
                    </div>

                    <!-- 4. Font Weight [2×1] -->
                    <div class="font-opt-card font-opt-col2">
                        <div class="font-opt-label"><i class="fa-solid fa-bold"></i> Font Weight</div>
                        <div class="font-style-btns" id="fontWeightBtns">
                            ${["100","200","300","400","500","600","700","800","900"].map(w =>
                                `<button class="font-style-btn${settings.fontWeight===w?" active":""}" data-weight="${w}" style="font-weight:${w};">${w}</button>`
                            ).join("")}
                        </div>
                    </div>

                    <!-- 5. Style Toggles [1×1] (Bold/Italic/Underline/Strike) -->
                    <div class="font-opt-card font-opt-col1">
                        <div class="font-opt-label"><i class="fa-solid fa-italic"></i> Styles</div>
                        <div class="font-style-btns">
                            <button class="font-style-btn${settings.italic?" active":""}" id="fontItalicBtn" title="Italic"><i class="fa-solid fa-italic"></i></button>
                            <button class="font-style-btn${settings.underline?" active":""}" id="fontUnderlineBtn" title="Underline" style="text-decoration:underline;">U</button>
                            <button class="font-style-btn${settings.strikethrough?" active":""}" id="fontStrikeBtn" title="Strikethrough" style="text-decoration:line-through;">S</button>
                        </div>
                    </div>

                    <!-- 6. Text Transform [2×1] -->
                    <div class="font-opt-card font-opt-col2">
                        <div class="font-opt-label"><i class="fa-solid fa-text-width"></i> Transform</div>
                        <div class="font-transform-btns" id="fontTransformBtns">
                            ${[
                                { v:"none",       l:"Normal" },
                                { v:"uppercase",  l:"UPPER" },
                                { v:"lowercase",  l:"lower" },
                                { v:"capitalize", l:"Title" },
                            ].map(t =>
                                `<button class="font-transform-btn${settings.textTransform===t.v?" active":""}" data-transform="${t.v}">${t.l}</button>`
                            ).join("")}
                        </div>
                    </div>

                    <!-- 7. Text Align [1×1] -->
                    <div class="font-opt-card font-opt-col1">
                        <div class="font-opt-label"><i class="fa-solid fa-align-left"></i> Align</div>
                        <div class="font-style-btns" id="fontAlignBtns">
                            ${[
                                { v:"left",    i:"fa-align-left" },
                                { v:"center",  i:"fa-align-center" },
                                { v:"right",   i:"fa-align-right" },
                                { v:"justify", i:"fa-align-justify" },
                            ].map(a =>
                                `<button class="font-style-btn${settings.textAlign===a.v?" active":""}" data-align="${a.v}"><i class="fa-solid ${a.i}"></i></button>`
                            ).join("")}
                        </div>
                    </div>

                    <!-- 8. Word Spacing [2×1] -->
                    <div class="font-opt-card font-opt-col2">
                        <div class="font-opt-label"><i class="fa-solid fa-text-slash"></i> Word Spacing</div>
                        <div class="cb-range-wrap">
                            <div class="cb-range-header">
                                <span class="toggle-label-text" style="font-size:0.7rem;">px</span>
                                <span class="cb-range-value" data-range="fontWordSpacingRange">${settings.wordSpacing}px</span>
                            </div>
                            <input type="range" class="cb-range" id="fontWordSpacingRange" min="-5" max="20" value="${settings.wordSpacing}">
                        </div>
                        <div class="font-opt-preview" id="fontWordSpacingPreview">Word spacing test</div>
                    </div>

                    <!-- 9. Font Smoothing [1×1] -->
                    <div class="font-opt-card font-opt-col1">
                        <div class="font-opt-label"><i class="fa-solid fa-wand-magic-sparkles"></i> Smoothing</div>
                        <div class="font-opt-toggle-row">
                            <span class="font-opt-toggle-label">Antialiased rendering</span>
                            <label class="cb-mini-toggle">
                                <input type="checkbox" id="fontSmoothingToggle" ${settings.fontSmoothing?"checked":""}>
                                <span class="cb-mini-toggle-track"></span>
                                <span class="cb-mini-toggle-thumb"></span>
                            </label>
                        </div>
                    </div>

                    <!-- 10. Subpixel Rendering [1×1] -->
                    <div class="font-opt-card font-opt-col1">
                        <div class="font-opt-label"><i class="fa-solid fa-eye"></i> Subpixel</div>
                        <div class="font-opt-toggle-row">
                            <span class="font-opt-toggle-label">Subpixel AA</span>
                            <label class="cb-mini-toggle">
                                <input type="checkbox" id="fontSubpixelToggle" ${settings.subpixel?"checked":""}>
                                <span class="cb-mini-toggle-track"></span>
                                <span class="cb-mini-toggle-thumb"></span>
                            </label>
                        </div>
                    </div>

                    <!-- 11. Hyphens [1×1] -->
                    <div class="font-opt-card font-opt-col1">
                        <div class="font-opt-label"><i class="fa-solid fa-minus"></i> Hyphens</div>
                        <div class="font-opt-toggle-row">
                            <span class="font-opt-toggle-label">Auto-hyphenate text</span>
                            <label class="cb-mini-toggle">
                                <input type="checkbox" id="fontHyphensToggle" ${settings.hyphens?"checked":""}>
                                <span class="cb-mini-toggle-track"></span>
                                <span class="cb-mini-toggle-thumb"></span>
                            </label>
                        </div>
                    </div>

                    <!-- 12. Font Variant [2×1] -->
                    <div class="font-opt-card font-opt-col2">
                        <div class="font-opt-label"><i class="fa-solid fa-star-half-stroke"></i> Variant</div>
                        <div class="font-style-btns" id="fontVariantBtns">
                            ${[
                                { v:"normal",     l:"Normal" },
                                { v:"small-caps", l:"Small Caps", style:"font-variant:small-caps;" },
                                { v:"all-small-caps", l:"All Sm Caps", style:"font-variant:all-small-caps;" },
                            ].map(fv =>
                                `<button class="font-style-btn${settings.fontVariant===fv.v?" active":""}" data-variant="${fv.v}" style="${fv.style||""}">${fv.l}</button>`
                            ).join("")}
                        </div>
                    </div>

                    <!-- 13. Paragraph Gap [1×1] -->
                    <div class="font-opt-card font-opt-col1">
                        <div class="font-opt-label"><i class="fa-solid fa-paragraph"></i> Para Gap</div>
                        <div class="cb-range-wrap">
                            <div class="cb-range-header">
                                <span class="toggle-label-text" style="font-size:0.7rem;">em</span>
                                <span class="cb-range-value" data-range="fontParaGapRange">${settings.paragraphGap.toFixed(1)}</span>
                            </div>
                            <input type="range" class="cb-range" id="fontParaGapRange" min="5" max="30" value="${Math.round(settings.paragraphGap*10)}">
                        </div>
                    </div>

                    <!-- 14. Heading Scale [2×1] -->
                    <div class="font-opt-card font-opt-col2">
                        <div class="font-opt-label"><i class="fa-solid fa-heading"></i> Heading Scale</div>
                        <div class="cb-range-wrap">
                            <div class="cb-range-header">
                                <span class="toggle-label-text" style="font-size:0.7rem;">Ratio per level</span>
                                <span class="cb-range-value" data-range="fontHeadingScaleRange">${settings.headingScale.toFixed(2)}</span>
                            </div>
                            <input type="range" class="cb-range" id="fontHeadingScaleRange" min="110" max="200" value="${Math.round(settings.headingScale*100)}">
                        </div>
                        <div class="font-opt-preview" id="fontHeadingPreview" style="font-weight:700;">H1 · H2 · H3</div>
                    </div>

                    <!-- 15. Text Indent [1×1] -->
                    <div class="font-opt-card font-opt-col1">
                        <div class="font-opt-label"><i class="fa-solid fa-indent"></i> Indent</div>
                        <!-- Stepper (mirrors base item 8) -->
                        <div class="cb-stepper" data-stepper data-min="0" data-max="48" id="fontIndentStepper">
                            <button class="cb-stepper-btn" data-action="dec">−</button>
                            <span class="cb-stepper-value">${settings.textIndent}</span>
                            <button class="cb-stepper-btn" data-action="inc">+</button>
                        </div>
                        <span style="font-size:0.65rem;color:var(--text-muted);">px first line</span>
                    </div>

                    <!-- 16. OpenType Features [1×1] -->
                    <div class="font-opt-card font-opt-col1">
                        <div class="font-opt-label"><i class="fa-solid fa-gears"></i> OpenType</div>
                        <div class="font-opt-toggle-row">
                            <span class="font-opt-toggle-label">Advanced ligatures</span>
                            <label class="cb-mini-toggle">
                                <input type="checkbox" id="fontOpenTypeToggle" ${settings.opentype?"checked":""}>
                                <span class="cb-mini-toggle-track"></span>
                                <span class="cb-mini-toggle-thumb"></span>
                            </label>
                        </div>
                    </div>

                    <!-- 17. Font Rendering Engine [1×1] -->
                    <div class="font-opt-card font-opt-col1">
                        <div class="font-opt-label"><i class="fa-solid fa-microchip"></i> Rendering</div>
                        <!-- Dropdown (mirrors base item 6) -->
                        <div class="cb-dropdown" id="fontRenderingDropdown">
                            <button class="cb-dropdown-trigger" type="button">
                                <span>${settings.fontRendering}</span>
                                <i class="fa-solid fa-chevron-down"></i>
                            </button>
                            <div class="cb-dropdown-menu">
                                <div class="cb-dropdown-item${settings.fontRendering==="auto"?" selected":""}" data-render="auto">Auto</div>
                                <div class="cb-dropdown-item${settings.fontRendering==="optimizeSpeed"?" selected":""}" data-render="optimizeSpeed">Speed</div>
                                <div class="cb-dropdown-item${settings.fontRendering==="optimizeLegibility"?" selected":""}" data-render="optimizeLegibility">Legibility</div>
                                <div class="cb-dropdown-item${settings.fontRendering==="geometricPrecision"?" selected":""}" data-render="geometricPrecision">Geometric</div>
                            </div>
                        </div>
                    </div>

                    <!-- 18. Tab Size [1×1] -->
                    <div class="font-opt-card font-opt-col1">
                        <div class="font-opt-label"><i class="fa-solid fa-table-columns"></i> Tab Size</div>
                        <div class="cb-stepper" data-stepper data-min="2" data-max="8" id="fontTabSizeStepper">
                            <button class="cb-stepper-btn" data-action="dec">−</button>
                            <span class="cb-stepper-value">${settings.tabSize}</span>
                            <button class="cb-stepper-btn" data-action="inc">+</button>
                        </div>
                        <span style="font-size:0.65rem;color:var(--text-muted);">spaces per tab</span>
                    </div>

                    <!-- 19. Code Font [2×1] -->
                    <div class="font-opt-card font-opt-col2">
                        <div class="font-opt-label"><i class="fa-solid fa-code"></i> Code Font</div>
                        <!-- Dropdown (mirrors base item 6) -->
                        <div class="cb-dropdown" id="fontCodeDropdown">
                            <button class="cb-dropdown-trigger" type="button">
                                <span>${settings.codeFont}</span>
                                <i class="fa-solid fa-chevron-down"></i>
                            </button>
                            <div class="cb-dropdown-menu">
                                ${["Consolas","Courier New","Fira Code","JetBrains Mono","Source Code Pro","Cascadia Code"].map(f =>
                                    `<div class="cb-dropdown-item${settings.codeFont===f?" selected":""}" data-code-font="${f}" style="font-family:'${f}',monospace;">${f}</div>`
                                ).join("")}
                            </div>
                        </div>
                        <div class="font-opt-preview" id="fontCodePreview" style="font-family:'${settings.codeFont}',monospace;">const x = 42;</div>
                    </div>

                    <!-- 20. Orphans/Widow Prevention [1×1] -->
                    <div class="font-opt-card font-opt-col1">
                        <div class="font-opt-label"><i class="fa-solid fa-file-lines"></i> Widows</div>
                        <div class="font-opt-toggle-row">
                            <span class="font-opt-toggle-label">Prevent orphan words</span>
                            <label class="cb-mini-toggle">
                                <input type="checkbox" id="fontOrphansToggle">
                                <span class="cb-mini-toggle-track"></span>
                                <span class="cb-mini-toggle-thumb"></span>
                            </label>
                        </div>
                    </div>

                    <!-- 21. Full preview strip [3×1] -->
                    <div class="font-opt-card font-opt-col3" id="fontLivePreviewCard">
                        <div class="font-opt-label"><i class="fa-solid fa-eye"></i> Live Preview</div>
                        <div id="fontLivePreview" style="
                            font-size: ${settings.fontSize}px;
                            line-height: ${(settings.lineHeight/10).toFixed(1)};
                            letter-spacing: ${settings.letterSpacing}px;
                            font-weight: ${settings.fontWeight};
                            font-style: ${settings.italic?'italic':'normal'};
                            text-transform: ${settings.textTransform};
                            transition: all 0.3s ease;
                            color: var(--text-color);
                            background: var(--card-bg);
                            padding: 0.75rem 1rem;
                            border-radius: var(--border-radius-xs);
                            border: 1px solid var(--border-color);
                        ">
                            Portocala, îngheţată şi fructul râzând — Romanian sample text with diacritics.
                            <br><span style="font-size:0.85em;opacity:0.6;">â ă î ș ț · ABCDE · 0123456789 · The quick brown fox.</span>
                        </div>
                    </div>

                </div>
            </div>

        </div><!-- /.font-body -->
        `;
    }

    /* ════════════════════════════════════════
       INIT CONTROLS
       ════════════════════════════════════════ */
    function initControls() {
        renderFontList();
        renderCharSupport();
        renderImportedTags();
        initRanges();
        initToggles();
        initButtons();
        initDropdowns();
        initSteppers();
        initImport();
        initSearch();
    }

    /* ── Font List ─────────────────────────── */
    function renderFontList() {
        const list = section.querySelector("#fontList");
        if (!list) return;

        let fonts = allFonts;
        if (filterCat !== "all") fonts = fonts.filter(f => f.category === filterCat);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            fonts = fonts.filter(f => f.name.toLowerCase().includes(q));
        }

        if (!fonts.length) {
            list.innerHTML = `<div class="font-list-empty"><i class="fa-solid fa-ghost"></i><p>No fonts found</p></div>`;
            return;
        }

        list.innerHTML = fonts.map(f => `
            <button class="font-list-item${settings.fontName === f.name ? " selected" : ""}"
                data-font-name="${f.name}" type="button">
                <span class="font-list-item-name" style="font-family:${f.stack};">${f.name}</span>
                <span class="font-list-item-preview" style="font-family:${f.stack};">${f.sample || "Ag"}</span>
                <span class="font-list-item-badge">${f.category || "custom"}</span>
            </button>
        `).join("");

        list.querySelectorAll(".font-list-item").forEach(btn => {
            btn.addEventListener("click", () => {
                const name = btn.dataset.fontName;
                const font = allFonts.find(f => f.name === name);
                if (!font) return;
                settings.fontName     = font.name;
                settings.fontStack    = font.stack;
                settings.fontCategory = font.category;
                markPending();
                renderFontList();
                updatePreview();
                renderCharSupport();
                showToast(`<i class="fa-solid fa-font"></i> Font → <strong>${font.name}</strong>`, "info", 2200);
            });
        });
    }

    function updatePreview() {
        const band = section.querySelector("#fontPreviewBand");
        const display = section.querySelector("#fontPreviewDisplay");
        const sub = section.querySelector("#fontPreviewSub");
        const chars = section.querySelector("#fontPreviewChars");
        if (!band) return;

        if (settings.syncDevice) {
            band.style.fontFamily = "system-ui, sans-serif";
        } else {
            band.style.fontFamily = settings.fontStack;
        }

        // Live preview card
        const live = section.querySelector("#fontLivePreview");
        if (live) {
            live.style.fontFamily   = settings.syncDevice ? "system-ui" : settings.fontStack;
            live.style.fontSize     = settings.fontSize + "px";
            live.style.lineHeight   = (settings.lineHeight / 10).toFixed(1);
            live.style.letterSpacing = settings.letterSpacing + "px";
            live.style.fontWeight   = settings.fontWeight;
            live.style.fontStyle    = settings.italic ? "italic" : "normal";
            live.style.textTransform = settings.textTransform;
        }
    }

    /* ── Character Support ─────────────────── */
    function renderCharSupport() {
        const grid = section.querySelector("#fontCharGrid");
        if (!grid) return;

        const cat = settings.fontCategory in CHAR_SUPPORT ? settings.fontCategory : "sans";
        const support = CHAR_SUPPORT[cat];

        grid.innerHTML = Object.entries(CHAR_LABELS).map(([key, info]) => {
            const status = support[key] || "none";
            const icon = status === "full" ? "fa-check" : status === "partial" ? "fa-minus" : "fa-xmark";
            return `
                <div class="font-char-badge ${status}">
                    <i class="fa-solid ${icon} font-char-icon"></i>
                    <span class="font-char-sample">${info.sample}</span>
                    <span class="font-char-label">${info.label}</span>
                </div>
            `;
        }).join("");
    }

    /* ── Range Sliders ─────────────────────── */
    function initRanges() {
        const rangeMap = [
            { id: "fontSizeRange",        key: "fontSize",      fmt: v => v + "px",   cb: v => {
                section.querySelector("#fontSizePreview").style.fontSize = v + "px";
                updatePreview();
            }},
            { id: "fontLineHeightRange",  key: "lineHeight",    fmt: v => (v/10).toFixed(1), cb: () => updatePreview() },
            { id: "fontLetterSpacingRange", key: "letterSpacing", fmt: v => v + "px", cb: () => updatePreview() },
            { id: "fontWordSpacingRange", key: "wordSpacing",   fmt: v => v + "px",   cb: v => {
                section.querySelector("#fontWordSpacingPreview").style.wordSpacing = v + "px";
            }},
            { id: "fontParaGapRange",     key: "paragraphGap",  fmt: v => (v/10).toFixed(1), cb: v => {
                settings.paragraphGap = v / 10;
            }},
            { id: "fontHeadingScaleRange",key: "headingScale",  fmt: v => (v/100).toFixed(2), cb: v => {
                const scale = (v / 100).toFixed(2);
                settings.headingScale = parseFloat(scale);
                const prev = section.querySelector("#fontHeadingPreview");
                if (prev) prev.textContent = `H1: ${(settings.fontSize * scale * scale).toFixed(0)}px · H2: ${(settings.fontSize * scale).toFixed(0)}px · H3: ${settings.fontSize}px`;
            }},
        ];

        rangeMap.forEach(({ id, key, fmt, cb }) => {
            const el = section.querySelector(`#${id}`);
            const badge = section.querySelector(`[data-range="${id}"]`);
            if (!el) return;

            el.addEventListener("input", () => {
                const v = parseInt(el.value);
                if (badge) badge.textContent = fmt(v);
                settings[key] = v;
                markPending();
                if (cb) cb(v);
                applyToDOM();
            });
        });
    }

    /* ── Toggles ──────────────────────────── */
    function initToggles() {
        const toggles = [
            { id: "fontSyncDeviceToggle", key: "syncDevice", cb: () => {
                updatePreview();
                showToast(
                    settings.syncDevice
                        ? `<i class="fa-solid fa-mobile-screen"></i> Syncing system font`
                        : `<i class="fa-solid fa-font"></i> Using custom font`,
                    "info", 2000
                );
                applyToDOM();
            }},
            { id: "fontSmoothingToggle",  key: "fontSmoothing", cb: v => {
                document.documentElement.style.webkitFontSmoothing = v ? "antialiased" : "auto";
            }},
            { id: "fontSubpixelToggle",   key: "subpixel" },
            { id: "fontHyphensToggle",    key: "hyphens", cb: v => {
                document.documentElement.style.hyphens = v ? "auto" : "none";
            }},
            { id: "fontOpenTypeToggle",   key: "opentype", cb: v => {
                document.documentElement.style.fontFeatureSettings = v ? '"liga" 1, "calt" 1' : "normal";
            }},
            { id: "fontItalicBtn",   key: "italic",         isStyle: true, cb: () => updatePreview() },
            { id: "fontUnderlineBtn",key: "underline",      isStyle: true },
            { id: "fontStrikeBtn",   key: "strikethrough",  isStyle: true },
            { id: "fontOrphansToggle", key: "orphans" },
        ];

        toggles.forEach(({ id, key, cb, isStyle }) => {
            const el = section.querySelector(`#${id}`);
            if (!el) return;

            if (isStyle) {
                // These are buttons not checkboxes
                el.addEventListener("click", () => {
                    settings[key] = !settings[key];
                    el.classList.toggle("active", settings[key]);
                    markPending();
                    if (cb) cb(settings[key]);
                });
            } else {
                el.addEventListener("change", () => {
                    settings[key] = el.checked;
                    markPending();
                    if (cb) cb(settings[key]);
                });
            }
        });
    }

    /* ── Button Groups ────────────────────── */
    function initButtons() {
        // Font Weight
        section.querySelectorAll("#fontWeightBtns .font-style-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                section.querySelectorAll("#fontWeightBtns .font-style-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                settings.fontWeight = btn.dataset.weight;
                markPending();
                updatePreview();
            });
        });

        // Text Transform
        section.querySelectorAll("#fontTransformBtns .font-transform-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                section.querySelectorAll("#fontTransformBtns .font-transform-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                settings.textTransform = btn.dataset.transform;
                markPending();
                updatePreview();
            });
        });

        // Text Align
        section.querySelectorAll("#fontAlignBtns .font-style-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                section.querySelectorAll("#fontAlignBtns .font-style-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                settings.textAlign = btn.dataset.align;
                markPending();
            });
        });

        // Font Variant
        section.querySelectorAll("#fontVariantBtns .font-style-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                section.querySelectorAll("#fontVariantBtns .font-style-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                settings.fontVariant = btn.dataset.variant;
                document.documentElement.style.fontVariant = settings.fontVariant;
                markPending();
            });
        });

        // Category filter
        section.querySelectorAll(".font-cat-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                section.querySelectorAll(".font-cat-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                filterCat = btn.dataset.cat;
                renderFontList();
            });
        });

        // Save
        section.querySelector("#fontSaveBtn")?.addEventListener("click", () => {
            saveState();
            pendingChange = false;
            dismissUnsavedToast();
            showToast(`<i class="fa-solid fa-floppy-disk"></i> Font settings saved`, "success");
        });

        // Reset
        section.querySelector("#fontResetBtn")?.addEventListener("click", () => {
            showConfirmModal({
                title: "Reset typography?",
                body:  "All font settings will revert to their defaults.",
                confirm: "Reset",
                variant: "danger",
                onOk() {
                    settings = { ...DEFAULTS };
                    pendingChange = false;
                    saveState();
                    applyToDOM();
                    // Rebuild section
                    section.innerHTML = buildHTML();
                    initControls();
                    showToast(`<i class="fa-solid fa-rotate-left"></i> Typography reset`, "warning", 2500);
                }
            });
        });
    }

    /* ── Dropdowns (mirrors base item 6) ───── */
    function initDropdowns() {
        [
            { id: "fontRenderingDropdown", attr: "data-render",    key: "fontRendering" },
            { id: "fontCodeDropdown",      attr: "data-code-font", key: "codeFont", cb: v => {
                const prev = section.querySelector("#fontCodePreview");
                if (prev) prev.style.fontFamily = `'${v}', monospace`;
            }},
        ].forEach(({ id, attr, key, cb }) => {
            const dd = section.querySelector(`#${id}`);
            if (!dd) return;
            const trigger = dd.querySelector(".cb-dropdown-trigger");
            const items   = dd.querySelectorAll(".cb-dropdown-item");

            trigger.addEventListener("click", e => {
                e.stopPropagation();
                dd.classList.toggle("open");
            });

            items.forEach(item => {
                item.addEventListener("click", () => {
                    items.forEach(i => i.classList.remove("selected"));
                    item.classList.add("selected");
                    const val = item.getAttribute(attr);
                    trigger.querySelector("span").textContent = val;
                    settings[key] = val;
                    dd.classList.remove("open");
                    markPending();
                    if (cb) cb(val);
                });
            });

            document.addEventListener("click", () => dd.classList.remove("open"));
        });
    }

    /* ── Steppers (mirrors base item 8) ────── */
    function initSteppers() {
        [
            { id: "fontIndentStepper",  key: "textIndent" },
            { id: "fontTabSizeStepper", key: "tabSize" },
        ].forEach(({ id, key }) => {
            const stepper = section.querySelector(`#${id}`);
            if (!stepper) return;
            const min = parseInt(stepper.dataset.min ?? 0);
            const max = parseInt(stepper.dataset.max ?? 100);
            const valEl = stepper.querySelector(".cb-stepper-value");
            let val = parseInt(valEl?.textContent ?? 0);

            stepper.querySelectorAll(".cb-stepper-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    if (btn.dataset.action === "inc") val = Math.min(max, val + 1);
                    else val = Math.max(min, val - 1);
                    if (valEl) valEl.textContent = val;
                    settings[key] = val;
                    markPending();
                });
            });
        });
    }

    /* ── Search ─────────────────────────────── */
    function initSearch() {
        const input = section.querySelector("#fontSearchInput");
        const clear = section.querySelector("#fontSearchClear");

        input?.addEventListener("input", () => {
            searchQuery = input.value;
            renderFontList();
        });

        clear?.addEventListener("click", () => {
            if (input) input.value = "";
            searchQuery = "";
            renderFontList();
            input?.focus();
        });
    }

    /* ── Google Fonts Import ─────────────────── */
    function initImport() {
        const card   = section.querySelector("#fontImportCard");
        const toggle = section.querySelector("#fontImportToggle");
        const btn    = section.querySelector("#fontImportBtn");
        const input  = section.querySelector("#fontImportInput");
        const status = section.querySelector("#fontImportStatus");

        toggle?.addEventListener("click", () => card.classList.toggle("open"));

        btn?.addEventListener("click", async () => {
            const name = input?.value.trim();
            if (!name) return;

            status.textContent = "Loading…";
            status.className   = "font-import-status";
            btn.disabled       = true;

            const familyParam = name.replace(/\s+/g, "+");
            const url = `https://fonts.googleapis.com/css2?family=${familyParam}&display=swap`;

            try {
                const link = document.createElement("link");
                link.rel  = "stylesheet";
                link.href = url;
                link.onload = () => {
                    const font = {
                        name,
                        category: "custom",
                        stack:    `'${name}', sans-serif`,
                        sample:   "Ag",
                        imported: true,
                    };
                    if (!allFonts.find(f => f.name === name)) {
                        allFonts.push(font);
                        importedFonts.push(font);
                    }
                    input.value = "";
                    status.textContent = `✓ "${name}" loaded successfully`;
                    status.className   = "font-import-status success";
                    btn.disabled       = false;
                    renderFontList();
                    renderImportedTags();
                    markPending();
                    showToast(`<i class="fa-solid fa-check"></i> Imported <strong>${name}</strong>`, "success", 2500);
                };
                link.onerror = () => {
                    status.textContent = `✗ Could not load "${name}". Check the name.`;
                    status.className   = "font-import-status error";
                    btn.disabled       = false;
                };
                document.head.appendChild(link);
            } catch {
                status.textContent = "✗ Import failed";
                status.className   = "font-import-status error";
                btn.disabled       = false;
            }
        });

        input?.addEventListener("keydown", e => {
            if (e.key === "Enter") btn?.click();
        });
    }

    function renderImportedTags() {
        const container = section.querySelector("#fontImportedList");
        if (!container) return;
        container.innerHTML = importedFonts.map(f => `
            <div class="font-imported-tag">
                ${f.name}
                <button class="font-imported-tag-remove" data-remove="${f.name}">&times;</button>
            </div>
        `).join("");

        container.querySelectorAll(".font-imported-tag-remove").forEach(btn => {
            btn.addEventListener("click", () => {
                const name = btn.dataset.remove;
                importedFonts = importedFonts.filter(f => f.name !== name);
                allFonts = allFonts.filter(f => f.name !== name || !f.imported);
                if (settings.fontName === name) {
                    settings.fontName   = DEFAULTS.fontName;
                    settings.fontStack  = DEFAULTS.fontStack;
                    settings.fontCategory = DEFAULTS.fontCategory;
                }
                renderImportedTags();
                renderFontList();
                markPending();
            });
        });
    }

    /* ════════════════════════════════════════
       PENDING CHANGE
       ════════════════════════════════════════ */
    function markPending() {
        pendingChange = true;
        showUnsavedToast();
    }

    /* ════════════════════════════════════════
       TOAST SYSTEM (reuses themes approach)
       ════════════════════════════════════════ */
    function ensureToastContainer() {
        // Reuse themes toast container if available
        let c = document.getElementById("themesToastContainer");
        if (!c) {
            c = document.createElement("div");
            c.id = "themesToastContainer";
            c.className = "themes-toast-container";
            document.body.appendChild(c);
        }
        return c;
    }

    function showToast(message, type = "info", duration = 3500) {
        // Delegate to themes toast if available
        if (window.themeTabShowToast) return window.themeTabShowToast(message, type, duration);

        const container = ensureToastContainer();
        const id    = "fnt-tst-" + Date.now();
        const toast = document.createElement("div");
        toast.id        = id;
        toast.className = `themes-toast themes-toast-${type}`;
        toast.setAttribute("role", "status");
        toast.innerHTML = `
            <span class="toast-message">${message}</span>
            <button class="toast-close" aria-label="Dismiss"><i class="fa-solid fa-xmark"></i></button>
        `;
        container.appendChild(toast);
        toastQueue.push({ id });

        requestAnimationFrame(() =>
            requestAnimationFrame(() => toast.classList.add("visible"))
        );

        toast.querySelector(".toast-close").addEventListener("click", () => dismissToast(id));
        if (duration > 0) setTimeout(() => dismissToast(id), duration);
        return id;
    }

    function dismissToast(id) {
        const toast = document.getElementById(id);
        if (!toast) return;
        toast.classList.remove("visible");
        toast.classList.add("hiding");
        setTimeout(() => { toast.remove(); }, 320);
    }

    function showUnsavedToast() {
        if (unsavedToastId && document.getElementById(unsavedToastId)) return;

        const container = ensureToastContainer();
        const id = "fnt-unsaved";
        unsavedToastId = id;

        const toast = document.createElement("div");
        toast.id = id;
        toast.className = "themes-toast themes-toast-warning themes-toast-permanent";
        toast.setAttribute("role", "alert");
        toast.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span class="toast-message">Font changes unsaved</span>
            <button class="toast-action-btn" id="fontToastQuickSave">Save</button>
            <button class="toast-close" aria-label="Dismiss"><i class="fa-solid fa-xmark"></i></button>
        `;
        container.appendChild(toast);
        requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add("visible")));

        toast.querySelector("#fontToastQuickSave").addEventListener("click", () => {
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
       CONFIRM MODAL (reuses themes approach)
       ════════════════════════════════════════ */
    function showConfirmModal(opts) {
        let modal = document.getElementById("themesConfirmModal");

        if (!modal) {
            modal = document.createElement("div");
            modal.id = "themesConfirmModal";
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
            modal.addEventListener("click", e => { if (e.target === modal) modal.classList.remove("active"); });
        }

        modal.querySelector("#tcmTitle").textContent = opts.title || "Are you sure?";
        modal.querySelector("#tcmBody").textContent  = opts.body  || "";

        const okBtn     = modal.querySelector("#tcmOk").cloneNode(true);
        const cancelBtn = modal.querySelector("#tcmCancel").cloneNode(true);
        modal.querySelector("#tcmOk").replaceWith(okBtn);
        modal.querySelector("#tcmCancel").replaceWith(cancelBtn);

        okBtn.textContent     = opts.confirm     || "OK";
        cancelBtn.textContent = opts.cancelLabel || "Cancel";
        okBtn.className = `modal-btn primary${opts.variant === "danger" ? " danger" : ""}`;

        okBtn.addEventListener("click",     () => { modal.classList.remove("active"); opts.onOk?.();     });
        cancelBtn.addEventListener("click", () => { modal.classList.remove("active"); opts.onCancel?.(); });

        modal.classList.add("active");
        okBtn.focus();
    }

    /* ════════════════════════════════════════
       BOOT
       ════════════════════════════════════════ */
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }

})();
