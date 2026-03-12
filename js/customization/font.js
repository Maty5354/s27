/* ========================================
   FONT / TYPOGRAPHY TAB — font.js

   ╔══════════════════════════════════════╗
   ║  INPUT COMPONENTS RULES              ║
   ║  All inputs use the exact cb- base   ║
   ║  tab structure from customization.js ║
   ║  Only IDs are renamed per-tab.       ║
   ║  Toast/confirm reuse themeTabShow-   ║
   ║  Toast from themes.js when possible. ║
   ╚══════════════════════════════════════╝
   ======================================== */

(function () {
    "use strict";

    /* ════════════════════════════════════════
       CONSTANTS & STATE
       ════════════════════════════════════════ */
    const KEY_FONT = "customization-font-settings";

    const DEFAULTS = {
        fontFamily: "Inter",
        googleFontUrl: "",
        syncDeviceFont: false,
        fontSize: 16,
        lineHeight: 15,        // stored ×10 for integer range input
        letterSpacing: 0,
        wordSpacing: 0,
        fontWeight: 400,
        fontStyle: "normal",
        textTransform: "none",
        textDecoration: "none",
        fontVariant: "normal",
        tabularNums: false,
        ligatures: true,
        fontSmoothing: true,
        paragraphSpacing: 15,  // stored ×10
        textIndent: 0,
        kerning: true,
        shadowX: 0,
        shadowY: 2,
        shadowBlur: 4,
        shadowOn: false,
        headingScale: 125,     // stored ×100 (1.25 → 125)
        maxWidth: 65,
        hyphens: false,
        textRendering: "auto",
        fontStretch: 100,
        overflowWrap: false,
    };

    /* Font catalogue — {name, category, diacritics, gfSlug?, system?} */
    const FONTS = [
        { name: "Inter",             category: "sans-serif",  diacritics: true,  gfSlug: "Inter:wght@300;400;500;600;700" },
        { name: "Roboto",            category: "sans-serif",  diacritics: true,  gfSlug: "Roboto:wght@300;400;500;700" },
        { name: "Nunito",            category: "sans-serif",  diacritics: true,  gfSlug: "Nunito:wght@300;400;600;700" },
        { name: "Lato",              category: "sans-serif",  diacritics: true,  gfSlug: "Lato:wght@300;400;700" },
        { name: "Open Sans",         category: "sans-serif",  diacritics: true,  gfSlug: "Open+Sans:wght@300;400;600;700" },
        { name: "Poppins",           category: "sans-serif",  diacritics: true,  gfSlug: "Poppins:wght@300;400;500;600;700" },
        { name: "Raleway",           category: "sans-serif",  diacritics: true,  gfSlug: "Raleway:wght@300;400;500;600;700" },
        { name: "DM Sans",           category: "sans-serif",  diacritics: true,  gfSlug: "DM+Sans:wght@300;400;500;600;700" },
        { name: "Plus Jakarta Sans", category: "sans-serif",  diacritics: true,  gfSlug: "Plus+Jakarta+Sans:wght@300;400;500;600;700" },
        { name: "Outfit",            category: "sans-serif",  diacritics: true,  gfSlug: "Outfit:wght@300;400;500;600;700" },
        { name: "Merriweather",      category: "serif",       diacritics: true,  gfSlug: "Merriweather:wght@300;400;700" },
        { name: "Playfair Display",  category: "serif",       diacritics: true,  gfSlug: "Playfair+Display:wght@400;500;600;700" },
        { name: "PT Serif",          category: "serif",       diacritics: true,  gfSlug: "PT+Serif:wght@400;700" },
        { name: "Lora",              category: "serif",       diacritics: true,  gfSlug: "Lora:wght@400;500;600;700" },
        { name: "JetBrains Mono",    category: "monospace",   diacritics: false, gfSlug: "JetBrains+Mono:wght@400;500;600" },
        { name: "Fira Code",         category: "monospace",   diacritics: false, gfSlug: "Fira+Code:wght@400;500;600" },
        { name: "Georgia",           category: "serif",       diacritics: true,  system: true },
        { name: "system-ui",         category: "system",      diacritics: true,  system: true },
    ];

    const CHAR_ROWS = [
        { label: "Latin",      sample: "A B C D E F G a b c d e f g",   test: "ABCabc" },
        { label: "Digits",     sample: "0 1 2 3 4 5 6 7 8 9",           test: "0123" },
        { label: "Diacritice", sample: "ă â î ș ț Ă Â Î Ș Ț",          test: "ăâîșț" },
        { label: "European",   sample: "à é ü ñ ç ö ß ø å ï",           test: "àéüñç" },
        { label: "Symbols",    sample: "! @ # $ % & * ( ) + = — …",      test: "!@#$" },
    ];

    let settings   = { ...DEFAULTS };
    let section    = null;
    let pending    = false;
    let loadedFonts = new Set(["Inter", "Georgia", "system-ui"]);
    let activeCategory = "all";


    /* ════════════════════════════════════════
       BOOT
       ════════════════════════════════════════ */
    function boot() {
        createSection();
        loadSettings();
        renderFontGrid();
        bindAll();
        applyAll(false);   // apply without marking pending
    }


    /* ════════════════════════════════════════
       SECTION INJECTION
       ════════════════════════════════════════ */
    function createSection() {
        const content = document.querySelector(".custom-content");
        if (!content) return;

        section = document.createElement("div");
        section.className = "custom-section";
        section.id        = "fontSection";

        section.innerHTML = `
        <!-- ══ HEADER ══════════════════════════════════════ -->
        <div class="font-header">
            <div class="font-header-top">
                <div class="font-header-info">
                    <h3><i class="fa-solid fa-font"></i> Typography</h3>
                    <p class="font-tab-desc">
                        Choose a typeface, import from Google Fonts, and fine-tune every typographic detail.
                    </p>
                </div>
                <div class="font-header-actions">
                    <div class="font-loading-indicator" id="fontLoadingIndicator">
                        <div class="font-loading-spinner"></div>
                        <span>Loading font…</span>
                    </div>
                    <button class="font-reset-btn" id="fontResetBtn" title="Reset to defaults">
                        <i class="fa-solid fa-arrow-rotate-left"></i>
                        <span>Reset</span>
                    </button>
                    <button class="font-save-btn" id="fontSaveBtn">
                        <i class="fa-solid fa-floppy-disk"></i>
                        <span>Save</span>
                    </button>
                </div>
            </div>
            <!-- Category filter tabs -->
            <nav class="font-category-nav" id="fontCategoryNav">
                <button class="font-cat-btn active" data-cat="all">All</button>
                <button class="font-cat-btn" data-cat="sans-serif">Sans-serif</button>
                <button class="font-cat-btn" data-cat="serif">Serif</button>
                <button class="font-cat-btn" data-cat="monospace">Monospace</button>
                <button class="font-cat-btn" data-cat="system">System</button>
                <button class="font-cat-btn" data-cat="custom">Custom</button>
            </nav>
        </div>

        <!-- ══ FONT SELECTOR ROW ════════════════════════════ -->
        <div class="font-selector-area">

            <!-- Font picker -->
            <div class="font-picker-card">
                <h4><i class="fa-solid fa-swatchbook"></i> Font Family</h4>
                <div class="font-grid" id="fontGrid">
                    <!-- Rendered by JS -->
                </div>
            </div>

            <!-- Google Fonts import -->
            <div class="font-import-card">
                <h4><i class="fa-brands fa-google"></i> Google Fonts Import</h4>
                <div class="font-import-input-row">
                    <!-- cb-text-field mirrors base tab item 7 -->
                    <div class="cb-text-field">
                        <input type="text" id="fontGFInput" placeholder=" " autocomplete="off" spellcheck="false">
                        <label for="fontGFInput">Font name (e.g. "Outfit")</label>
                    </div>
                    <button class="font-import-btn" id="fontImportBtn">
                        <i class="fa-solid fa-download"></i> Load
                    </button>
                </div>
                <p class="font-import-hint">
                    Loads any font from <strong>fonts.google.com</strong>.<br>
                    Enter the exact name: <code>Nunito</code>, <code>DM Sans</code>, <code>Bricolage Grotesque</code>…
                </p>
            </div>
        </div>

        <!-- ══ DEVICE SYNC + CHARACTER SUPPORT ════════════ -->
        <div class="font-meta-row">

            <!-- Device font sync toggle — mirrors base item 2 -->
            <div class="font-device-card">
                <h4><i class="fa-solid fa-mobile-screen"></i> Device Font Sync</h4>
                <div class="toggle-row">
                    <span class="toggle-label-text">Use system/device font</span>
                    <label class="cb-toggle">
                        <input type="checkbox" id="fontSyncToggle">
                        <span class="cb-toggle-track"></span>
                        <span class="cb-toggle-thumb"></span>
                    </label>
                </div>
                <p class="font-import-hint" style="margin-top:0.25rem;">
                    When enabled, the <code>system-ui</code> font stack is used — the native font of the visitor's device.
                    Overrides any selected font.
                </p>
            </div>

            <!-- Character support -->
            <div class="font-chars-card">
                <h4><i class="fa-solid fa-language"></i> Glyph Support</h4>
                <div class="font-chars-grid" id="fontCharsGrid">
                    ${CHAR_ROWS.map(r => `
                        <div class="font-chars-row" data-char-row="${r.label}">
                            <span class="font-chars-label">${r.label}</span>
                            <span class="font-chars-sample">${r.sample}</span>
                            <span class="font-chars-indicator" data-char-indicator="${r.label}"></span>
                        </div>
                    `).join("")}
                </div>
            </div>
        </div>

        <!-- ══ LIVE PREVIEW ═════════════════════════════════ -->
        <div class="font-live-preview" id="fontLivePreview">
            <div class="font-preview-heading" id="fPrevHead">Orar 8D — Săptămâna aceasta</div>
            <div class="font-preview-body" id="fPrevBody">Matematică · Engleză · Chimie · Informatică<br>The quick brown fox jumps over the lazy dog. 0 1 2 3 4 5 6 7 8 9</div>
            <div class="font-preview-diacritics" id="fPrevDiac">ă â î ș ț Ă Â Î Ș Ț — diacritice românești</div>
        </div>

        <!-- ══ DIVIDER ═══════════════════════════════════════ -->
        <div class="font-section-divider">
            <span><i class="fa-solid fa-sliders"></i> Typography Options</span>
        </div>

        <!-- ══ ASYMMETRIC OPTIONS GRID ══════════════════════ -->
        <div class="font-options-grid" id="fontOptionsGrid">

            <!-- 1 ▸ Base Font Size (2×1) -->
            <div class="font-option-card" data-cols="2">
                <h4>Base Font Size</h4>
                <div class="cb-range-wrap">
                    <div class="cb-range-header">
                        <span class="toggle-label-text">Body text size</span>
                        <span class="cb-range-value" data-range="fontSizeRange">16px</span>
                    </div>
                    <input type="range" class="cb-range" id="fontSizeRange" min="12" max="24" value="16" step="1">
                </div>
            </div>

            <!-- 2 ▸ Font Style / Italic (1×1) -->
            <div class="font-option-card" data-cols="1">
                <h4>Italic</h4>
                <div class="toggle-row">
                    <span class="font-toggle-label">
                        Enable italic
                        <span class="font-toggle-sub">Sets font-style: italic</span>
                    </span>
                    <label class="cb-toggle">
                        <input type="checkbox" id="fontItalicToggle">
                        <span class="cb-toggle-track"></span>
                        <span class="cb-toggle-thumb"></span>
                    </label>
                </div>
            </div>

            <!-- 3 ▸ Line Height (1×1) -->
            <div class="font-option-card" data-cols="1">
                <h4>Line Height</h4>
                <div class="cb-range-wrap">
                    <div class="cb-range-header">
                        <span class="toggle-label-text">Leading</span>
                        <span class="cb-range-value" data-range="fontLineHRange">1.5</span>
                    </div>
                    <input type="range" class="cb-range" id="fontLineHRange" min="10" max="30" value="15" step="1">
                </div>
            </div>

            <!-- 4 ▸ Letter Spacing (1×1) -->
            <div class="font-option-card" data-cols="1">
                <h4>Letter Spacing</h4>
                <div class="cb-range-wrap">
                    <div class="cb-range-header">
                        <span class="toggle-label-text">Tracking</span>
                        <span class="cb-range-value" data-range="fontLSRange">0px</span>
                    </div>
                    <input type="range" class="cb-range" id="fontLSRange" min="-2" max="8" value="0" step="0.5">
                </div>
            </div>

            <!-- 5 ▸ Word Spacing (1×1) -->
            <div class="font-option-card" data-cols="1">
                <h4>Word Spacing</h4>
                <div class="cb-range-wrap">
                    <div class="cb-range-header">
                        <span class="toggle-label-text">Space between words</span>
                        <span class="cb-range-value" data-range="fontWSRange">0px</span>
                    </div>
                    <input type="range" class="cb-range" id="fontWSRange" min="0" max="12" value="0" step="0.5">
                </div>
            </div>

            <!-- 6 ▸ Font Weight (3×1) — full row -->
            <div class="font-option-card" data-cols="3">
                <h4>Font Weight</h4>
                <div class="font-weight-visual" id="fontWeightVisual">
                    ${[
                        { w: 100, l: "100", s: "Thin" },
                        { w: 200, l: "200", s: "ExtraLight" },
                        { w: 300, l: "300", s: "Light" },
                        { w: 400, l: "400", s: "Regular" },
                        { w: 500, l: "500", s: "Medium" },
                        { w: 600, l: "600", s: "SemiBold" },
                        { w: 700, l: "700", s: "Bold" },
                        { w: 800, l: "800", s: "ExtraBold" },
                        { w: 900, l: "900", s: "Black" },
                    ].map(({ w, l, s }) => `
                        <button class="font-weight-btn${w === 400 ? " active" : ""}" data-weight="${w}">
                            <span style="font-weight:${w};">Aa</span>
                            ${s}
                        </button>
                    `).join("")}
                </div>
            </div>

            <!-- 7 ▸ Text Transform (2×1) -->
            <div class="font-option-card" data-cols="2">
                <h4>Text Transform</h4>
                <!-- mirrors base item 5: .cb-segmented -->
                <div class="cb-segmented" id="fontTransformSeg">
                    <button class="cb-segmented-btn active" data-val="none">None</button>
                    <button class="cb-segmented-btn" data-val="uppercase">UPPER</button>
                    <button class="cb-segmented-btn" data-val="lowercase">lower</button>
                    <button class="cb-segmented-btn" data-val="capitalize">Title</button>
                </div>
            </div>

            <!-- 8 ▸ Text Decoration (1×1) -->
            <div class="font-option-card" data-cols="1">
                <h4>Decoration</h4>
                <div class="font-decoration-row" id="fontDecoRow">
                    <button class="font-decoration-btn active" data-val="none" title="None">—</button>
                    <button class="font-decoration-btn" data-val="underline" title="Underline" style="text-decoration:underline;">U</button>
                    <button class="font-decoration-btn" data-val="line-through" title="Strikethrough" style="text-decoration:line-through;">S</button>
                    <button class="font-decoration-btn" data-val="overline" title="Overline" style="text-decoration:overline;">O</button>
                </div>
            </div>

            <!-- 9 ▸ Font Variant (1×1) -->
            <div class="font-option-card" data-cols="1">
                <h4>Small Caps</h4>
                <div class="toggle-row">
                    <span class="font-toggle-label">
                        Use small capitals
                        <span class="font-toggle-sub">font-variant: small-caps</span>
                    </span>
                    <label class="cb-toggle">
                        <input type="checkbox" id="fontVariantToggle">
                        <span class="cb-toggle-track"></span>
                        <span class="cb-toggle-thumb"></span>
                    </label>
                </div>
            </div>

            <!-- 10 ▸ Tabular Numbers (1×1) -->
            <div class="font-option-card" data-cols="1">
                <h4>Tabular Numbers</h4>
                <div class="toggle-row">
                    <span class="font-toggle-label">
                        Monospaced digits
                        <span class="font-toggle-sub">font-variant-numeric</span>
                    </span>
                    <label class="cb-toggle">
                        <input type="checkbox" id="fontTabNumToggle">
                        <span class="cb-toggle-track"></span>
                        <span class="cb-toggle-thumb"></span>
                    </label>
                </div>
            </div>

            <!-- 11 ▸ Ligatures (1×1) -->
            <div class="font-option-card" data-cols="1">
                <h4>Ligatures</h4>
                <div class="toggle-row">
                    <span class="font-toggle-label">
                        Common ligatures
                        <span class="font-toggle-sub">fi → fi, fl → fl</span>
                    </span>
                    <label class="cb-toggle">
                        <input type="checkbox" id="fontLigsToggle" checked>
                        <span class="cb-toggle-track"></span>
                        <span class="cb-toggle-thumb"></span>
                    </label>
                </div>
            </div>

            <!-- 12 ▸ Font Smoothing (1×1) -->
            <div class="font-option-card" data-cols="1">
                <h4>Antialiasing</h4>
                <div class="toggle-row">
                    <span class="font-toggle-label">
                        Subpixel smoothing
                        <span class="font-toggle-sub">-webkit-font-smoothing</span>
                    </span>
                    <label class="cb-toggle">
                        <input type="checkbox" id="fontSmoothToggle" checked>
                        <span class="cb-toggle-track"></span>
                        <span class="cb-toggle-thumb"></span>
                    </label>
                </div>
            </div>

            <!-- 13 ▸ Kerning (1×1) -->
            <div class="font-option-card" data-cols="1">
                <h4>Kerning</h4>
                <div class="toggle-row">
                    <span class="font-toggle-label">
                        Optical kerning
                        <span class="font-toggle-sub">font-kerning: auto</span>
                    </span>
                    <label class="cb-toggle">
                        <input type="checkbox" id="fontKerningToggle" checked>
                        <span class="cb-toggle-track"></span>
                        <span class="cb-toggle-thumb"></span>
                    </label>
                </div>
            </div>

            <!-- 14 ▸ Text Shadow (2×2) -->
            <div class="font-option-card" data-cols="2" data-rows="2">
                <h4>Text Shadow</h4>
                <div class="toggle-row" style="margin-bottom:0.25rem;">
                    <span class="toggle-label-text">Enable shadow</span>
                    <label class="cb-toggle">
                        <input type="checkbox" id="fontShadowToggle">
                        <span class="cb-toggle-track"></span>
                        <span class="cb-toggle-thumb"></span>
                    </label>
                </div>
                <div class="font-shadow-preview" id="fontShadowPreview">Abcd 123 ăîș</div>
                <div class="font-shadow-grid" id="fontShadowGrid">
                    <div class="font-shadow-row">
                        <label>X Offset</label>
                        <input type="range" class="cb-range" id="fontShadowX" min="-10" max="10" value="0" step="1">
                    </div>
                    <div class="font-shadow-row">
                        <label>Y Offset</label>
                        <input type="range" class="cb-range" id="fontShadowY" min="-10" max="10" value="2" step="1">
                    </div>
                    <div class="font-shadow-row">
                        <label>Blur</label>
                        <input type="range" class="cb-range" id="fontShadowBlur" min="0" max="20" value="4" step="1">
                    </div>
                    <div class="font-shadow-row">
                        <label>Opacity</label>
                        <input type="range" class="cb-range" id="fontShadowOpacity" min="0" max="100" value="30" step="5">
                    </div>
                </div>
            </div>

            <!-- 15 ▸ Text Rendering (1×2 — sits beside shadow) -->
            <div class="font-option-card" data-cols="1" data-rows="2">
                <h4>Text Rendering</h4>
                <div class="font-card-stack">
                    <!-- mirrors base item 9: cb-radio-group -->
                    <div class="cb-radio-group" id="fontRenderingGroup">
                        <label class="cb-radio">
                            <input type="radio" name="fontRendering" value="auto" checked>
                            <span class="cb-radio-mark"></span>
                            <span>Auto</span>
                        </label>
                        <label class="cb-radio">
                            <input type="radio" name="fontRendering" value="optimizeSpeed">
                            <span class="cb-radio-mark"></span>
                            <span>Speed</span>
                        </label>
                        <label class="cb-radio">
                            <input type="radio" name="fontRendering" value="optimizeLegibility">
                            <span class="cb-radio-mark"></span>
                            <span>Legibility</span>
                        </label>
                        <label class="cb-radio">
                            <input type="radio" name="fontRendering" value="geometricPrecision">
                            <span class="cb-radio-mark"></span>
                            <span>Geometric</span>
                        </label>
                    </div>
                </div>
            </div>

            <!-- 16 ▸ Paragraph Spacing (2×1) -->
            <div class="font-option-card" data-cols="2">
                <h4>Paragraph Spacing</h4>
                <div class="cb-range-wrap">
                    <div class="cb-range-header">
                        <span class="toggle-label-text">margin-bottom on paragraphs</span>
                        <span class="cb-range-value" data-range="fontParaSpRange">1.5em</span>
                    </div>
                    <input type="range" class="cb-range" id="fontParaSpRange" min="0" max="40" value="15" step="1">
                </div>
            </div>

            <!-- 17 ▸ Text Indent (1×1) -->
            <div class="font-option-card" data-cols="1">
                <h4>Text Indent</h4>
                <div class="cb-range-wrap">
                    <div class="cb-range-header">
                        <span class="toggle-label-text">First line</span>
                        <span class="cb-range-value" data-range="fontIndentRange">0px</span>
                    </div>
                    <input type="range" class="cb-range" id="fontIndentRange" min="0" max="48" value="0" step="4">
                </div>
            </div>

            <!-- 18 ▸ Overflow Wrap (1×1) -->
            <div class="font-option-card" data-cols="1">
                <h4>Overflow Wrap</h4>
                <div class="toggle-row">
                    <span class="font-toggle-label">
                        Break long words
                        <span class="font-toggle-sub">overflow-wrap: break-word</span>
                    </span>
                    <label class="cb-toggle">
                        <input type="checkbox" id="fontOWrapToggle">
                        <span class="cb-toggle-track"></span>
                        <span class="cb-toggle-thumb"></span>
                    </label>
                </div>
            </div>

            <!-- 19 ▸ Hyphens (1×1) -->
            <div class="font-option-card" data-cols="1">
                <h4>Hyphens</h4>
                <div class="toggle-row">
                    <span class="font-toggle-label">
                        Auto hyphenation
                        <span class="font-toggle-sub">hyphens: auto</span>
                    </span>
                    <label class="cb-toggle">
                        <input type="checkbox" id="fontHyphensToggle">
                        <span class="cb-toggle-track"></span>
                        <span class="cb-toggle-thumb"></span>
                    </label>
                </div>
            </div>

            <!-- 20 ▸ Font Stretch (1×1) -->
            <div class="font-option-card" data-cols="1">
                <h4>Font Stretch</h4>
                <div class="cb-range-wrap">
                    <div class="cb-range-header">
                        <span class="toggle-label-text">Width</span>
                        <span class="cb-range-value" data-range="fontStretchRange">100%</span>
                    </div>
                    <input type="range" class="cb-range" id="fontStretchRange" min="75" max="125" value="100" step="5">
                </div>
            </div>

            <!-- 21 ▸ Heading Scale (2×1) -->
            <div class="font-option-card" data-cols="2">
                <h4>Heading Scale Ratio</h4>
                <div class="cb-range-wrap">
                    <div class="cb-range-header">
                        <span class="toggle-label-text">Type scale multiplier per heading level</span>
                        <span class="cb-range-value" data-range="fontScaleRange">1.25×</span>
                    </div>
                    <input type="range" class="cb-range" id="fontScaleRange" min="110" max="167" value="125" step="1">
                </div>
                <div class="font-scale-visual" id="fontScaleVisual">
                    <div class="font-scale-bar"></div>
                    <div class="font-scale-bar"></div>
                    <div class="font-scale-bar"></div>
                    <div class="font-scale-bar"></div>
                </div>
            </div>

            <!-- 22 ▸ Max Line Width (1×1) -->
            <div class="font-option-card" data-cols="1">
                <h4>Max Line Width</h4>
                <div class="cb-range-wrap">
                    <div class="cb-range-header">
                        <span class="toggle-label-text">max-width in ch units</span>
                        <span class="cb-range-value" data-range="fontMaxWRange">65ch</span>
                    </div>
                    <input type="range" class="cb-range" id="fontMaxWRange" min="40" max="100" value="65" step="5">
                </div>
            </div>

        </div><!-- /font-options-grid -->
        `;

        // Insert before baseSection
        const base = document.getElementById("baseSection");
        base ? content.insertBefore(section, base) : content.prepend(section);

        // Activate if font tab is already selected
        const tabBtn = document.querySelector('.sidebar-item[data-section="font"]');
        if (tabBtn && tabBtn.classList.contains("active")) {
            section.classList.add("active");
        }
    }


    /* ════════════════════════════════════════
       PERSISTENCE
       ════════════════════════════════════════ */
    function loadSettings() {
        try {
            const saved = JSON.parse(localStorage.getItem(KEY_FONT) || "{}");
            settings = { ...DEFAULTS, ...saved };
        } catch { settings = { ...DEFAULTS }; }

        // Ensure font is loaded if it's a Google Font
        const f = FONTS.find(x => x.name === settings.fontFamily);
        if (f && f.gfSlug && !loadedFonts.has(f.name)) {
            loadGoogleFont(f.name, f.gfSlug, false);
        }
    }

    function saveSettings() {
        localStorage.setItem(KEY_FONT, JSON.stringify(settings));
        pending = false;
        dismissUnsavedToast();
    }

    function markPending() {
        pending = true;
        showUnsavedToast();
    }


    /* ════════════════════════════════════════
       FONT GRID RENDER
       ════════════════════════════════════════ */
    function renderFontGrid() {
        const grid = section?.querySelector("#fontGrid");
        if (!grid) return;

        const filtered = activeCategory === "all"
            ? FONTS
            : FONTS.filter(f => f.category === activeCategory);

        grid.innerHTML = filtered.map(f => {
            const isActive = f.name === settings.fontFamily;
            const badge    = f.system ? "sys" : "gf";
            const badgeLabel = f.system ? "System" : "GF";
            return `
                <div
                    class="font-option${isActive ? " active" : ""}"
                    data-font="${f.name}"
                    title="${f.name} · ${f.category}"
                >
                    <div
                        class="font-option-preview"
                        style="font-family: '${f.name}', ${f.category}, sans-serif;"
                    >Aa Bb 12</div>
                    <div class="font-option-name">${f.name}</div>
                    <span class="font-option-badge ${badge}">${badgeLabel}</span>
                </div>
            `;
        }).join("");

        // Bind clicks
        grid.querySelectorAll(".font-option").forEach(opt => {
            opt.addEventListener("click", () => selectFont(opt.dataset.font));
        });
    }


    /* ════════════════════════════════════════
       FONT SELECTION & LOADING
       ════════════════════════════════════════ */
    function selectFont(name) {
        const font = FONTS.find(f => f.name === name);
        if (!font) return;

        // If Google Font and not yet loaded — load it first
        if (font.gfSlug && !loadedFonts.has(name)) {
            loadGoogleFont(name, font.gfSlug, true);
        } else {
            applyFontFamily(name);
        }
    }

    function loadGoogleFont(name, slug, selectAfter) {
        const indicator = section?.querySelector("#fontLoadingIndicator");
        if (indicator) indicator.classList.add("visible");

        const id  = "gf-" + name.replace(/\s+/g, "-").toLowerCase();
        const url = `https://fonts.googleapis.com/css2?family=${slug}&display=swap`;

        if (!document.getElementById(id)) {
            const link = document.createElement("link");
            link.id   = id;
            link.rel  = "stylesheet";
            link.href = url;
            link.onload = () => {
                loadedFonts.add(name);
                if (indicator) indicator.classList.remove("visible");
                if (selectAfter) applyFontFamily(name);
                showToast(`<i class="fa-brands fa-google"></i> <strong>${name}</strong> loaded`, "success", 2500);
                updateCharSupport();
            };
            link.onerror = () => {
                if (indicator) indicator.classList.remove("visible");
                showToast(`<i class="fa-solid fa-triangle-exclamation"></i> Could not load <strong>${name}</strong>`, "danger", 3000);
            };
            document.head.appendChild(link);
        } else {
            loadedFonts.add(name);
            if (indicator) indicator.classList.remove("visible");
            if (selectAfter) applyFontFamily(name);
        }
    }

    function applyFontFamily(name) {
        settings.fontFamily = name;
        document.documentElement.style.setProperty("--font-family", `'${name}', sans-serif`);
        renderFontGrid();
        updatePreview();
        updateCharSupport();
        markPending();
        showToast(`<i class="fa-solid fa-font"></i> Font → <strong>${name}</strong>`, "info", 2000);
    }


    /* ════════════════════════════════════════
       CHARACTER SUPPORT DETECTION
       Uses Canvas API to compare glyph rendering
       ════════════════════════════════════════ */
    function checkGlyphSupport(fontName, char) {
        try {
            const canvas = document.createElement("canvas");
            canvas.width = 20; canvas.height = 20;
            const ctx = canvas.getContext("2d");

            // Render with the font in question
            ctx.font = `16px '${fontName}'`;
            ctx.fillStyle = "#000";
            ctx.clearRect(0, 0, 20, 20);
            ctx.fillText(char, 2, 16);
            const fontData = ctx.getImageData(0, 0, 20, 20).data;

            // Render with a guaranteed fallback (monospace)
            ctx.font = "16px monospace";
            ctx.clearRect(0, 0, 20, 20);
            ctx.fillText(char, 2, 16);
            const fallbackData = ctx.getImageData(0, 0, 20, 20).data;

            // If pixel data differs, the font has its own glyph
            for (let i = 0; i < fontData.length; i++) {
                if (fontData[i] !== fallbackData[i]) return "good";
            }
            return "miss";
        } catch {
            return "warn";
        }
    }

    function updateCharSupport() {
        const font = settings.syncDeviceFont ? "system-ui" : settings.fontFamily;
        CHAR_ROWS.forEach(row => {
            const indicator = section?.querySelector(`[data-char-indicator="${row.label}"]`);
            if (!indicator) return;
            // Sample the first char of the test string
            const result = checkGlyphSupport(font, row.test[0]);
            indicator.className = `font-chars-indicator ${result}`;
            indicator.title = result === "good" ? "Supported" : result === "warn" ? "Unknown" : "Missing";
        });

        // Update sample font in chars grid
        section?.querySelectorAll(".font-chars-sample").forEach(el => {
            el.style.fontFamily = `'${font}', sans-serif`;
        });
    }


    /* ════════════════════════════════════════
       LIVE PREVIEW UPDATE
       ════════════════════════════════════════ */
    function updatePreview() {
        const head = section?.querySelector("#fPrevHead");
        const body = section?.querySelector("#fPrevBody");
        const diac = section?.querySelector("#fPrevDiac");
        const container = section?.querySelector("#fontLivePreview");
        if (!container) return;

        const font = settings.syncDeviceFont ? "system-ui" : settings.fontFamily;
        const fs   = settings.fontSize + "px";
        const lh   = (settings.lineHeight / 10).toFixed(1);
        const ls   = settings.letterSpacing + "px";
        const fw   = settings.fontWeight;
        const fi   = settings.fontStyle;
        const tt   = settings.textTransform;
        const td   = settings.textDecoration;
        const fv   = settings.fontVariant;
        const fnOpt = [
            settings.tabularNums ? "tabular-nums" : "normal",
            settings.ligatures ? "common-ligatures" : "no-common-ligatures"
        ].join(" ");

        const shadow = settings.shadowOn
            ? `${settings.shadowX}px ${settings.shadowY}px ${settings.shadowBlur}px rgba(0,0,0,${(settings.shadowOpacity || 30) / 100})`
            : "none";

        const style = {
            fontFamily:   `'${font}', sans-serif`,
            fontSize:     fs,
            lineHeight:   lh,
            letterSpacing: ls,
            fontWeight:   fw,
            fontStyle:    fi,
            textTransform: tt,
            textDecoration: td,
            fontVariant:  fv,
            fontVariantNumeric: settings.tabularNums ? "tabular-nums" : "normal",
            fontFeatureSettings: settings.ligatures ? '"liga" 1' : '"liga" 0',
            fontStretch:  settings.fontStretch + "%",
            textShadow:   shadow,
            textRendering: settings.textRendering,
            fontKerning:  settings.kerning ? "auto" : "none",
            WebkitFontSmoothing: settings.fontSmoothing ? "antialiased" : "auto",
        };

        [head, body, diac].forEach(el => {
            if (!el) return;
            Object.assign(el.style, style);
        });

        // Update heading scale visual bars
        updateScaleVisual();
    }

    function updateScaleVisual() {
        const ratio = settings.headingScale / 100;
        const bars = section?.querySelectorAll(".font-scale-bar");
        if (!bars) return;
        // H1 → H4 reverse: H1 is largest
        bars.forEach((bar, i) => {
            const scale = Math.pow(ratio, 3 - i);
            bar.style.width = Math.min(100, scale * 55) + "%";
        });
    }

    function updateShadowPreview() {
        const preview = section?.querySelector("#fontShadowPreview");
        if (!preview) return;
        if (!settings.shadowOn) {
            preview.style.textShadow = "none";
            preview.style.opacity = "0.5";
            return;
        }
        preview.style.opacity = "1";
        const opacity = (settings.shadowOpacity || 30) / 100;
        preview.style.textShadow = `${settings.shadowX}px ${settings.shadowY}px ${settings.shadowBlur}px rgba(0,0,0,${opacity})`;
    }


    /* ════════════════════════════════════════
       APPLY ALL — Push settings to CSS vars
       ════════════════════════════════════════ */
    function applyAll(mark = true) {
        syncFormToSettings();
        const root = document.documentElement;
        const font = settings.syncDeviceFont ? "system-ui" : settings.fontFamily;

        root.style.setProperty("--font-family",   `'${font}', sans-serif`);
        root.style.setProperty("--root-font-size", settings.fontSize + "px");
        root.style.setProperty("--line-height",    (settings.lineHeight / 10).toFixed(1));

        // Also set on body for real-world effect
        document.body.style.fontFamily = `'${font}', sans-serif`;
        document.body.style.fontSize   = settings.fontSize + "px";

        updatePreview();
        updateCharSupport();
        if (mark) markPending();
    }

    /* Sync all form elements → settings object */
    function syncFormToSettings() {
        const s = section;
        if (!s) return;

        const v = id => s.querySelector("#" + id);
        const cv = id => { const el = v(id); return el ? (el.type === "checkbox" ? el.checked : parseFloat(el.value)) : null; };

        const sval = id => { const el = v(id); return el?.value ?? null; };

        settings.fontSize          = cv("fontSizeRange")   ?? settings.fontSize;
        settings.lineHeight        = cv("fontLineHRange")  ?? settings.lineHeight;
        settings.letterSpacing     = cv("fontLSRange")     ?? settings.letterSpacing;
        settings.wordSpacing       = cv("fontWSRange")     ?? settings.wordSpacing;
        settings.fontStyle         = cv("fontItalicToggle") ? "italic" : "normal";
        settings.fontVariant       = cv("fontVariantToggle") ? "small-caps" : "normal";
        settings.tabularNums       = cv("fontTabNumToggle") ?? false;
        settings.ligatures         = cv("fontLigsToggle")  ?? true;
        settings.fontSmoothing     = cv("fontSmoothToggle") ?? true;
        settings.kerning           = cv("fontKerningToggle") ?? true;
        settings.shadowOn          = cv("fontShadowToggle") ?? false;
        settings.shadowX           = cv("fontShadowX")     ?? 0;
        settings.shadowY           = cv("fontShadowY")     ?? 2;
        settings.shadowBlur        = cv("fontShadowBlur")  ?? 4;
        settings.shadowOpacity     = cv("fontShadowOpacity") ?? 30;
        settings.paragraphSpacing  = cv("fontParaSpRange") ?? settings.paragraphSpacing;
        settings.textIndent        = cv("fontIndentRange") ?? 0;
        settings.headingScale      = cv("fontScaleRange")  ?? settings.headingScale;
        settings.maxWidth          = cv("fontMaxWRange")   ?? 65;
        settings.fontStretch       = cv("fontStretchRange") ?? 100;
        settings.overflowWrap      = cv("fontOWrapToggle") ?? false;
        settings.hyphens           = cv("fontHyphensToggle") ?? false;
        settings.syncDeviceFont    = cv("fontSyncToggle")  ?? false;

        // Radio: text rendering
        const activeRadio = s.querySelector('input[name="fontRendering"]:checked');
        if (activeRadio) settings.textRendering = activeRadio.value;

        // Segmented: text transform
        const activeSeg = s.querySelector("#fontTransformSeg .cb-segmented-btn.active");
        if (activeSeg) settings.textTransform = activeSeg.dataset.val;

        // Decoration
        const activeDeco = s.querySelector("#fontDecoRow .font-decoration-btn.active");
        if (activeDeco) settings.textDecoration = activeDeco.dataset.val;

        // Weight
        const activeW = s.querySelector(".font-weight-btn.active");
        if (activeW) settings.fontWeight = parseInt(activeW.dataset.weight);
    }

    /* Sync settings → form elements (for load/reset) */
    function syncSettingsToForm() {
        const s = section;
        if (!s) return;

        const set = (id, val) => { const el = s.querySelector("#" + id); if (el) { el.type === "checkbox" ? (el.checked = val) : (el.value = val); } };

        set("fontSizeRange",    settings.fontSize);
        set("fontLineHRange",   settings.lineHeight);
        set("fontLSRange",      settings.letterSpacing);
        set("fontWSRange",      settings.wordSpacing);
        set("fontItalicToggle", settings.fontStyle === "italic");
        set("fontVariantToggle",settings.fontVariant === "small-caps");
        set("fontTabNumToggle", settings.tabularNums);
        set("fontLigsToggle",   settings.ligatures);
        set("fontSmoothToggle", settings.fontSmoothing);
        set("fontKerningToggle",settings.kerning);
        set("fontShadowToggle", settings.shadowOn);
        set("fontShadowX",      settings.shadowX);
        set("fontShadowY",      settings.shadowY);
        set("fontShadowBlur",   settings.shadowBlur);
        set("fontShadowOpacity",settings.shadowOpacity || 30);
        set("fontParaSpRange",  settings.paragraphSpacing);
        set("fontIndentRange",  settings.textIndent);
        set("fontScaleRange",   settings.headingScale);
        set("fontMaxWRange",    settings.maxWidth);
        set("fontStretchRange", settings.fontStretch);
        set("fontOWrapToggle",  settings.overflowWrap);
        set("fontHyphensToggle",settings.hyphens);
        set("fontSyncToggle",   settings.syncDeviceFont);

        // Radios
        const radio = s.querySelector(`input[name="fontRendering"][value="${settings.textRendering}"]`);
        if (radio) radio.checked = true;

        // Segmented
        s.querySelectorAll("#fontTransformSeg .cb-segmented-btn").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.val === settings.textTransform);
        });

        // Decoration
        s.querySelectorAll("#fontDecoRow .font-decoration-btn").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.val === settings.textDecoration);
        });

        // Weight
        s.querySelectorAll(".font-weight-btn").forEach(btn => {
            btn.classList.toggle("active", parseInt(btn.dataset.weight) === settings.fontWeight);
        });

        // Refresh all range badges
        s.querySelectorAll(".cb-range").forEach(range => updateRangeBadge(range));
    }


    /* ════════════════════════════════════════
       RANGE BADGE HELPER (mirrors base initRangeSliders)
       ════════════════════════════════════════ */
    function updateRangeBadge(range) {
        const badge = section?.querySelector(`[data-range="${range.id}"]`);
        if (!badge) return;
        const v = parseFloat(range.value);

        const fmt = {
            fontSizeRange:   v + "px",
            fontLineHRange:  (v / 10).toFixed(1),
            fontLSRange:     v + "px",
            fontWSRange:     v + "px",
            fontParaSpRange: (v / 10).toFixed(1) + "em",
            fontIndentRange: v + "px",
            fontScaleRange:  (v / 100).toFixed(2) + "×",
            fontMaxWRange:   v + "ch",
            fontStretchRange:v + "%",
        }[range.id] ?? String(v);

        badge.textContent = fmt;
    }


    /* ════════════════════════════════════════
       BIND ALL INTERACTIONS
       ════════════════════════════════════════ */
    function bindAll() {
        if (!section) return;

        // ── Category filter ──────────────
        section.querySelectorAll(".font-cat-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                section.querySelectorAll(".font-cat-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                activeCategory = btn.dataset.cat;
                renderFontGrid();
            });
        });

        // ── Range sliders (generic) ──────
        section.querySelectorAll(".cb-range").forEach(range => {
            range.addEventListener("input", () => {
                updateRangeBadge(range);
                applyAll();
            });
        });

        // ── All toggles ──────────────────
        section.querySelectorAll(".cb-toggle input, .cb-mini-toggle input").forEach(toggle => {
            toggle.addEventListener("change", () => applyAll());
        });

        // ── Font Weight buttons ───────────
        section.querySelectorAll(".font-weight-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                section.querySelectorAll(".font-weight-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                settings.fontWeight = parseInt(btn.dataset.weight);
                updatePreview();
                markPending();
            });
        });

        // ── Text Transform segmented ──────
        section.querySelectorAll("#fontTransformSeg .cb-segmented-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                section.querySelectorAll("#fontTransformSeg .cb-segmented-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                settings.textTransform = btn.dataset.val;
                updatePreview();
                markPending();
            });
        });

        // ── Text Decoration ───────────────
        section.querySelectorAll("#fontDecoRow .font-decoration-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                section.querySelectorAll("#fontDecoRow .font-decoration-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                settings.textDecoration = btn.dataset.val;
                updatePreview();
                markPending();
            });
        });

        // ── Text Rendering radios ─────────
        section.querySelectorAll('input[name="fontRendering"]').forEach(r => {
            r.addEventListener("change", () => {
                settings.textRendering = r.value;
                updatePreview();
                markPending();
            });
        });

        // ── Shadow sliders ────────────────
        ["fontShadowX","fontShadowY","fontShadowBlur","fontShadowOpacity"].forEach(id => {
            const el = section.querySelector("#" + id);
            el?.addEventListener("input", () => {
                syncFormToSettings();
                updateShadowPreview();
                updatePreview();
                markPending();
            });
        });

        section.querySelector("#fontShadowToggle")?.addEventListener("change", () => {
            syncFormToSettings();
            updateShadowPreview();
            updatePreview();
            markPending();
        });

        // ── Google Font Import ────────────
        const importBtn = section.querySelector("#fontImportBtn");
        const importInput = section.querySelector("#fontGFInput");

        importBtn?.addEventListener("click", () => handleGFImport());
        importInput?.addEventListener("keydown", e => {
            if (e.key === "Enter") handleGFImport();
        });

        // ── Device sync overrides family ──
        section.querySelector("#fontSyncToggle")?.addEventListener("change", e => {
            settings.syncDeviceFont = e.target.checked;
            renderFontGrid();
            updatePreview();
            updateCharSupport();
            markPending();
        });

        // ── Save button ───────────────────
        section.querySelector("#fontSaveBtn")?.addEventListener("click", () => {
            syncFormToSettings();
            saveSettings();
            applyAll(false);
            const btn = section.querySelector("#fontSaveBtn");
            btn.classList.add("saved");
            setTimeout(() => btn.classList.remove("saved"), 1800);
            showToast(`<i class="fa-solid fa-floppy-disk"></i> Typography saved`, "success");
        });

        // ── Reset button ──────────────────
        section.querySelector("#fontResetBtn")?.addEventListener("click", () => {
            showConfirmModal({
                title: "Reset typography?",
                body: "All font settings will return to their defaults.",
                confirm: "Reset",
                variant: "danger",
                onOk() {
                    settings = { ...DEFAULTS };
                    syncSettingsToForm();
                    renderFontGrid();
                    applyAll(false);
                    saveSettings();
                    showToast(`<i class="fa-solid fa-arrow-rotate-left"></i> Typography reset`, "warning", 2500);
                }
            });
        });
    }


    /* ════════════════════════════════════════
       GOOGLE FONT IMPORT HANDLER
       ════════════════════════════════════════ */
    function handleGFImport() {
        const input = section?.querySelector("#fontGFInput");
        const name  = input?.value.trim();
        if (!name) return;

        // Build slug: replace spaces with +, add weight axis
        const slug = name.replace(/\s+/g, "+") + ":wght@300;400;500;600;700";

        // Add to FONTS list if not already there
        const exists = FONTS.find(f => f.name.toLowerCase() === name.toLowerCase());
        if (!exists) {
            FONTS.push({ name, category: "custom", diacritics: null, gfSlug: slug });
            allTagsCache = null;
        }

        loadGoogleFont(exists?.name ?? name, exists?.gfSlug ?? slug, true);

        if (input) input.value = "";
    }

    // Small cache variable (module-level)
    let allTagsCache = null;


    /* ════════════════════════════════════════
       TOAST SYSTEM
       (delegates to themeTabShowToast if available,
        otherwise creates its own container)
       ════════════════════════════════════════ */
    let unsavedToastId = null;

    function showToast(message, type = "info", duration = 3500) {
        // Prefer the already-initialized toast system from themes.js
        if (typeof window.themeTabShowToast === "function") {
            return window.themeTabShowToast(message, type, duration);
        }
        // Fallback: create a minimal toast container
        return _localToast(message, type, duration);
    }

    function _localToast(message, type, duration) {
        let c = document.getElementById("themesToastContainer");
        if (!c) {
            c = document.createElement("div");
            c.id        = "themesToastContainer";
            c.className = "themes-toast-container";
            document.body.appendChild(c);
        }
        const id    = "fnt-tst-" + Date.now();
        const toast = document.createElement("div");
        toast.id        = id;
        toast.className = `themes-toast themes-toast-${type}`;
        toast.innerHTML = `<span class="toast-message">${message}</span><button class="toast-close"><i class="fa-solid fa-xmark"></i></button>`;
        c.appendChild(toast);
        requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add("visible")));
        toast.querySelector(".toast-close").addEventListener("click", () => _dismissToast(toast));
        if (duration > 0) setTimeout(() => _dismissToast(toast), duration);
        return id;
    }

    function _dismissToast(toast) {
        if (!toast) return;
        toast.classList.remove("visible");
        toast.classList.add("hiding");
        setTimeout(() => toast.remove(), 320);
    }

    function showUnsavedToast() {
        if (unsavedToastId && document.getElementById(unsavedToastId)) return;

        let c = document.getElementById("themesToastContainer");
        if (!c) {
            c = document.createElement("div");
            c.id        = "themesToastContainer";
            c.className = "themes-toast-container";
            document.body.appendChild(c);
        }

        const id = "fnt-unsaved";
        unsavedToastId = id;

        const toast = document.createElement("div");
        toast.id        = id;
        toast.className = "themes-toast themes-toast-warning themes-toast-permanent";
        toast.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span class="toast-message">Unsaved font changes</span>
            <button class="toast-action-btn" id="fntQuickSave">Save</button>
            <button class="toast-close"><i class="fa-solid fa-xmark"></i></button>
        `;
        c.appendChild(toast);
        requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add("visible")));

        toast.querySelector("#fntQuickSave").addEventListener("click", () => {
            syncFormToSettings();
            saveSettings();
            showToast(`<i class="fa-solid fa-check-circle"></i> Saved!`, "success", 2000);
        });
        toast.querySelector(".toast-close").addEventListener("click", () => {
            pending = false;
            dismissUnsavedToast();
        });
    }

    function dismissUnsavedToast() {
        if (!unsavedToastId) return;
        const toast = document.getElementById(unsavedToastId);
        if (toast) {
            toast.classList.remove("visible");
            toast.classList.add("hiding");
            setTimeout(() => toast.remove(), 320);
        }
        unsavedToastId = null;
    }


    /* ════════════════════════════════════════
       CONFIRM MODAL
       (delegates to themes.js confirm if possible,
        otherwise creates its own — same markup)
       ════════════════════════════════════════ */
    function showConfirmModal(opts) {
        // Reuse the modal already injected by themes.js if it exists
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
            modal.addEventListener("click", e => { if (e.target === modal) modal.classList.remove("active"); });
            document.addEventListener("keydown", e => {
                if (e.key === "Escape" && modal.classList.contains("active")) modal.classList.remove("active");
            });
        }

        modal.querySelector("#tcmTitle").textContent = opts.title || "Are you sure?";
        modal.querySelector("#tcmBody").textContent  = opts.body  || "";

        const okBtn     = modal.querySelector("#tcmOk");
        const cancelBtn = modal.querySelector("#tcmCancel");
        const okNew     = okBtn.cloneNode(true);
        const cancelNew = cancelBtn.cloneNode(true);
        okBtn.replaceWith(okNew);
        cancelBtn.replaceWith(cancelNew);

        okNew.textContent     = opts.confirm     || "OK";
        cancelNew.textContent = opts.cancelLabel || "Cancel";
        okNew.className       = `modal-btn primary${opts.variant === "danger" ? " danger" : ""}`;

        okNew.addEventListener("click",     () => { modal.classList.remove("active"); opts.onOk?.(); });
        cancelNew.addEventListener("click", () => { modal.classList.remove("active"); opts.onCancel?.(); });

        modal.classList.add("active");
        okNew.focus();
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
