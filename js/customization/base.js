/* ========================================
   BASE TAB — base.js

   ╔══════════════════════════════════════════╗
   ║  TWO JOBS:                               ║
   ║                                          ║
   ║  1. COMPONENT SHOWCASE                   ║
   ║     Renders the dev-mode Base tab with   ║
   ║     a live demo of every cb- component.  ║
   ║                                          ║
   ║  2. GLOBAL AUTO-INIT                     ║
   ║     Exposes window.CBComponents.init()   ║
   ║     and a MutationObserver so any cb-    ║
   ║     HTML dropped anywhere on the page    ║
   ║     becomes interactive automatically.  ║
   ║                                          ║
   ║  3. SELECT REPLACEMENT                   ║
   ║     All <select> elements on the page    ║
   ║     are swapped for cb-dropdown. The     ║
   ║     native element is kept hidden and    ║
   ║     stays in sync so existing JS works.  ║
   ╚══════════════════════════════════════════╝
   ======================================== */

(function () {
    "use strict";

    let section = null;

    /* ════════════════════════════════════════
       SECTION HTML
       ════════════════════════════════════════ */

    function buildHTML() {
        return `
        <div class="base-section-header">
            <i class="fa-solid fa-paintbrush"></i>
            <h3>Base Components</h3>
        </div>
        <div class="base-inputs-grid">

            <!-- 1. Color Picker (Pickr) -->
            <div class="base-input-group">
                <h4>Color Picker</h4>
                <div class="custom-color-picker-container">
                    <div class="pickr-container" id="base-colorPicker"></div>
                    <div id="base-colorValue" style="font-size:var(--font-size-sm);color:var(--text-muted);">#6196FF</div>
                </div>
            </div>

            <!-- 2. Toggle Switch -->
            <div class="base-input-group">
                <h4>Toggle Switch</h4>
                <div class="toggle-row">
                    <span class="toggle-label-text">Enable feature</span>
                    <label class="cb-toggle">
                        <input type="checkbox" checked>
                        <span class="cb-toggle-track"></span>
                        <span class="cb-toggle-thumb"></span>
                    </label>
                </div>
            </div>

            <!-- 3. Range Slider -->
            <div class="base-input-group">
                <h4>Range Slider</h4>
                <div class="cb-range-wrap">
                    <div class="cb-range-header">
                        <span class="toggle-label-text">Intensity</span>
                        <span class="cb-range-value" data-range="base-range">50</span>
                    </div>
                    <input type="range" class="cb-range" id="base-range" min="0" max="100" value="50">
                </div>
            </div>

            <!-- 4. Dual Range -->
            <div class="base-input-group">
                <h4>Dual Range Slider</h4>
                <div class="cb-range-wrap">
                    <div class="cb-range-header">
                        <span class="toggle-label-text">Range</span>
                    </div>
                    <div class="cb-dual-range" id="base-dualRange">
                        <div class="cb-dual-range-track"></div>
                        <div class="cb-dual-range-fill"></div>
                        <input type="range" min="0" max="100" value="25" data-thumb="min">
                        <input type="range" min="0" max="100" value="75" data-thumb="max">
                    </div>
                    <div class="cb-dual-labels">
                        <span class="cb-range-value" data-dual="min">25</span>
                        <span class="cb-range-value" data-dual="max">75</span>
                    </div>
                </div>
            </div>

            <!-- 5. Segmented Control -->
            <div class="base-input-group">
                <h4>Segmented Control</h4>
                <div class="cb-segmented" id="base-seg" data-segmented>
                    <button class="cb-segmented-btn active" data-value="s">S</button>
                    <button class="cb-segmented-btn" data-value="m">M</button>
                    <button class="cb-segmented-btn" data-value="l">L</button>
                    <button class="cb-segmented-btn" data-value="xl">XL</button>
                </div>
            </div>

            <!-- 6. Button Group -->
            <div class="base-input-group">
                <h4>Button Group</h4>
                <div class="cb-btn-group" id="base-btnGroup" data-btn-group>
                    <button class="cb-btn-group-item active"><i class="fa-solid fa-align-left"></i></button>
                    <button class="cb-btn-group-item"><i class="fa-solid fa-align-center"></i></button>
                    <button class="cb-btn-group-item"><i class="fa-solid fa-align-right"></i></button>
                    <button class="cb-btn-group-item"><i class="fa-solid fa-align-justify"></i></button>
                </div>
            </div>

            <!-- 7. Icon Selector -->
            <div class="base-input-group">
                <h4>Icon Selector</h4>
                <div class="cb-icon-grid" id="base-iconSel" data-icon-selector>
                    <button class="cb-icon-btn selected"><i class="fa-solid fa-sun"></i></button>
                    <button class="cb-icon-btn"><i class="fa-solid fa-moon"></i></button>
                    <button class="cb-icon-btn"><i class="fa-solid fa-star"></i></button>
                    <button class="cb-icon-btn"><i class="fa-solid fa-heart"></i></button>
                    <button class="cb-icon-btn"><i class="fa-solid fa-bolt"></i></button>
                    <button class="cb-icon-btn"><i class="fa-solid fa-gem"></i></button>
                    <button class="cb-icon-btn"><i class="fa-solid fa-fire"></i></button>
                    <button class="cb-icon-btn"><i class="fa-solid fa-leaf"></i></button>
                    <button class="cb-icon-btn"><i class="fa-solid fa-snowflake"></i></button>
                    <button class="cb-icon-btn"><i class="fa-solid fa-palette"></i></button>
                </div>
            </div>

            <!-- 8. Dropdown -->
            <div class="base-input-group">
                <h4>Dropdown</h4>
                <div class="cb-dropdown" id="base-dropdown">
                    <button class="cb-dropdown-trigger" type="button">
                        <span>Select option...</span>
                        <i class="fa-solid fa-chevron-down"></i>
                    </button>
                    <div class="cb-dropdown-menu">
                        <div class="cb-dropdown-item" data-value="modern">Modern</div>
                        <div class="cb-dropdown-item" data-value="classic">Classic</div>
                        <div class="cb-dropdown-item" data-value="minimal">Minimal</div>
                        <div class="cb-dropdown-item" data-value="brutalist">Brutalist</div>
                    </div>
                </div>
            </div>

            <!-- 9. Text Input -->
            <div class="base-input-group">
                <h4>Text Input</h4>
                <div class="cb-text-field">
                    <input type="text" id="base-textField" placeholder=" ">
                    <label for="base-textField">Enter value</label>
                </div>
            </div>

            <!-- 10. Search Input -->
            <div class="base-input-group">
                <h4>Search Input</h4>
                <div class="cb-search-wrap">
                    <i class="fa-solid fa-magnifying-glass cb-search-icon"></i>
                    <input type="text" class="cb-search-input" placeholder="Search...">
                    <button class="cb-search-clear"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>

            <!-- 11. Textarea -->
            <div class="base-input-group">
                <h4>Textarea</h4>
                <textarea class="cb-textarea" id="base-textarea" placeholder="Write something..." maxlength="500"></textarea>
                <div class="cb-textarea-counter"><span class="cb-textarea-count" data-textarea="base-textarea">0</span> / 500</div>
            </div>

            <!-- 12. Tag Input -->
            <div class="base-input-group">
                <h4>Tag Input</h4>
                <div class="cb-tags-container" id="base-tags">
                    <span class="cb-tag">Design <button class="cb-tag-remove">&times;</button></span>
                    <span class="cb-tag">Layout <button class="cb-tag-remove">&times;</button></span>
                    <input type="text" class="cb-tag-input" placeholder="Add tag...">
                </div>
            </div>

            <!-- 13. Number Stepper -->
            <div class="base-input-group">
                <h4>Number Stepper</h4>
                <div class="cb-stepper" data-stepper data-min="0" data-max="20">
                    <button class="cb-stepper-btn" data-action="dec">−</button>
                    <span class="cb-stepper-value">5</span>
                    <button class="cb-stepper-btn" data-action="inc">+</button>
                </div>
            </div>

            <!-- 14. Radio Group -->
            <div class="base-input-group">
                <h4>Radio Group</h4>
                <div class="cb-radio-group">
                    <label class="cb-radio">
                        <input type="radio" name="base-radio" checked>
                        <span class="cb-radio-mark"></span>
                        <span>Option Alpha</span>
                    </label>
                    <label class="cb-radio">
                        <input type="radio" name="base-radio">
                        <span class="cb-radio-mark"></span>
                        <span>Option Beta</span>
                    </label>
                    <label class="cb-radio">
                        <input type="radio" name="base-radio">
                        <span class="cb-radio-mark"></span>
                        <span>Option Gamma</span>
                    </label>
                </div>
            </div>

            <!-- 15. Checkbox Group -->
            <div class="base-input-group">
                <h4>Checkbox Group</h4>
                <div class="cb-checkbox-group">
                    <label class="cb-checkbox">
                        <input type="checkbox" checked>
                        <span class="cb-checkbox-mark"></span>
                        <span>Animations</span>
                    </label>
                    <label class="cb-checkbox">
                        <input type="checkbox" checked>
                        <span class="cb-checkbox-mark"></span>
                        <span>Blur effects</span>
                    </label>
                    <label class="cb-checkbox">
                        <input type="checkbox">
                        <span class="cb-checkbox-mark"></span>
                        <span>Reduced motion</span>
                    </label>
                </div>
            </div>

            <!-- 16. Switch Group -->
            <div class="base-input-group">
                <h4>Switch Group</h4>
                <div class="cb-switch-group">
                    <div class="cb-switch-row">
                        <span class="cb-switch-label">Notifications</span>
                        <label class="cb-mini-toggle">
                            <input type="checkbox" checked>
                            <span class="cb-mini-toggle-track"></span>
                            <span class="cb-mini-toggle-thumb"></span>
                        </label>
                    </div>
                    <div class="cb-switch-row">
                        <span class="cb-switch-label">Auto-save</span>
                        <label class="cb-mini-toggle">
                            <input type="checkbox" checked>
                            <span class="cb-mini-toggle-track"></span>
                            <span class="cb-mini-toggle-thumb"></span>
                        </label>
                    </div>
                    <div class="cb-switch-row">
                        <span class="cb-switch-label">Dark mode</span>
                        <label class="cb-mini-toggle">
                            <input type="checkbox">
                            <span class="cb-mini-toggle-track"></span>
                            <span class="cb-mini-toggle-thumb"></span>
                        </label>
                    </div>
                </div>
            </div>

            <!-- 17. Knob / Dial -->
            <div class="base-input-group">
                <h4>Knob / Dial</h4>
                <div class="cb-knob-wrap">
                    <div class="cb-knob" data-knob data-value="65" data-min="0" data-max="100">
                        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                            <circle class="cb-knob-track" cx="50" cy="50" r="40"
                                fill="none" stroke-linecap="round"></circle>
                            <circle class="cb-knob-fill" cx="50" cy="50" r="40"
                                fill="none" stroke-linecap="round"></circle>
                        </svg>
                        <span class="cb-knob-center">65</span>
                    </div>
                </div>
            </div>

            <!-- 18. Accordion -->
            <div class="base-input-group">
                <h4>Accordion</h4>
                <div class="cb-accordion" data-accordion>
                    <div class="cb-accordion-item open">
                        <button class="cb-accordion-header">
                            <span>General Settings</span>
                            <i class="fa-solid fa-chevron-down"></i>
                        </button>
                        <div class="cb-accordion-body">
                            <div class="cb-accordion-content">Configure general application preferences.</div>
                        </div>
                    </div>
                    <div class="cb-accordion-item">
                        <button class="cb-accordion-header">
                            <span>Advanced Options</span>
                            <i class="fa-solid fa-chevron-down"></i>
                        </button>
                        <div class="cb-accordion-body">
                            <div class="cb-accordion-content">Fine-tune advanced behavior and experimental features.</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 19. Breadcrumb -->
            <div class="base-input-group">
                <h4>Breadcrumb Nav</h4>
                <div class="cb-breadcrumb" data-breadcrumb>
                    <button class="cb-breadcrumb-item">Home</button>
                    <span class="cb-breadcrumb-sep"><i class="fa-solid fa-chevron-right"></i></span>
                    <button class="cb-breadcrumb-item">Settings</button>
                    <span class="cb-breadcrumb-sep"><i class="fa-solid fa-chevron-right"></i></span>
                    <button class="cb-breadcrumb-item active">Appearance</button>
                </div>
            </div>

            <!-- 20. Color Palette -->
            <div class="base-input-group">
                <h4>Color Palette</h4>
                <div class="cb-palette-row" data-palette>
                    <div class="cb-palette-swatch selected" style="background:#6196ff;" data-color="#6196ff"></div>
                    <div class="cb-palette-swatch" style="background:#ef4444;" data-color="#ef4444"></div>
                    <div class="cb-palette-swatch" style="background:#f59e0b;" data-color="#f59e0b"></div>
                    <div class="cb-palette-swatch" style="background:#10b981;" data-color="#10b981"></div>
                    <div class="cb-palette-swatch" style="background:#8b5cf6;" data-color="#8b5cf6"></div>
                    <div class="cb-palette-swatch" style="background:#ec4899;" data-color="#ec4899"></div>
                </div>
            </div>

            <!-- 21. Gradient Picker -->
            <div class="base-input-group">
                <h4>Gradient Picker</h4>
                <div class="cb-gradient-bar" id="base-gradient"
                    style="background: linear-gradient(90deg, #6196ff, #a855f7);"></div>
                <div class="cb-gradient-stops">
                    <div class="cb-gradient-swatch" style="background:#6196ff;" data-stop="start"></div>
                    <span class="cb-gradient-arrow"><i class="fa-solid fa-arrow-right"></i></span>
                    <div class="cb-gradient-swatch" style="background:#a855f7;" data-stop="end"></div>
                </div>
            </div>

            <!-- 22. Border Radius -->
            <div class="base-input-group">
                <h4>Border Radius</h4>
                <div class="cb-radius-control" data-radius>
                    <div class="cb-radius-preview" style="border-radius:16px;"></div>
                    <div class="cb-radius-inputs">
                        <div class="cb-radius-input">
                            <label>Top-L</label>
                            <input type="number" value="16" min="0" max="50" data-corner="tl">
                        </div>
                        <div class="cb-radius-input">
                            <label>Top-R</label>
                            <input type="number" value="16" min="0" max="50" data-corner="tr">
                        </div>
                        <div class="cb-radius-input">
                            <label>Bot-L</label>
                            <input type="number" value="16" min="0" max="50" data-corner="bl">
                        </div>
                        <div class="cb-radius-input">
                            <label>Bot-R</label>
                            <input type="number" value="16" min="0" max="50" data-corner="br">
                        </div>
                    </div>
                </div>
            </div>

            <!-- 23. Spacing Control -->
            <div class="base-input-group">
                <h4>Spacing Control</h4>
                <div class="cb-spacing-box">
                    <span class="cb-spacing-label top">16</span>
                    <span class="cb-spacing-label bottom">16</span>
                    <span class="cb-spacing-label left">24</span>
                    <span class="cb-spacing-label right">24</span>
                    <div class="cb-spacing-inner"></div>
                </div>
            </div>

            <!-- 24. Shadow Control -->
            <div class="base-input-group">
                <h4>Shadow Control</h4>
                <div class="cb-shadow-preview-box" data-shadow-preview
                    style="box-shadow: 4px 4px 12px rgba(0,0,0,0.15);"></div>
                <div class="cb-shadow-sliders" data-shadow-sliders>
                    <div class="cb-shadow-slider-row">
                        <label>X</label>
                        <input type="range" min="-20" max="20" value="4" data-shadow="x">
                    </div>
                    <div class="cb-shadow-slider-row">
                        <label>Y</label>
                        <input type="range" min="-20" max="20" value="4" data-shadow="y">
                    </div>
                    <div class="cb-shadow-slider-row">
                        <label>Blur</label>
                        <input type="range" min="0" max="40" value="12" data-shadow="blur">
                    </div>
                    <div class="cb-shadow-slider-row">
                        <label>Spread</label>
                        <input type="range" min="-10" max="20" value="0" data-shadow="spread">
                    </div>
                </div>
            </div>

            <!-- 25. Font Size -->
            <div class="base-input-group">
                <h4>Font Size</h4>
                <div class="cb-range-wrap">
                    <div class="cb-range-header">
                        <span class="toggle-label-text">Size</span>
                        <span class="cb-range-value" data-range="base-fontSize">16px</span>
                    </div>
                    <input type="range" class="cb-range" id="base-fontSize" min="10" max="32" value="16"
                        data-unit="px" data-preview="base-fontSizePreview">
                </div>
                <div class="cb-fontsize-preview" id="base-fontSizePreview" style="font-size:16px;">Preview Text Aa</div>
            </div>

            <!-- 26. Font Weight -->
            <div class="base-input-group">
                <h4>Font Weight</h4>
                <div class="cb-weight-selector" data-weight-selector>
                    <button class="cb-weight-btn" data-weight="100">Thin</button>
                    <button class="cb-weight-btn" data-weight="300">Light</button>
                    <button class="cb-weight-btn active" data-weight="400">Regular</button>
                    <button class="cb-weight-btn" data-weight="600">Semi</button>
                    <button class="cb-weight-btn" data-weight="700">Bold</button>
                    <button class="cb-weight-btn" data-weight="900">Black</button>
                </div>
                <div class="cb-weight-preview" style="font-weight:400;">The quick brown fox</div>
            </div>

            <!-- 27. Letter Spacing -->
            <div class="base-input-group">
                <h4>Letter Spacing</h4>
                <div class="cb-range-wrap">
                    <div class="cb-range-header">
                        <span class="toggle-label-text">Tracking</span>
                        <span class="cb-range-value" data-range="base-letterSpacing">0px</span>
                    </div>
                    <input type="range" class="cb-range" id="base-letterSpacing" min="-2" max="10" value="0"
                        data-unit="px" data-preview="base-letterSpacingPreview">
                </div>
                <div class="cb-letterspacing-preview" id="base-letterSpacingPreview"
                    style="letter-spacing:0px;">Letter Spacing</div>
            </div>

            <!-- 28. Line Height -->
            <div class="base-input-group">
                <h4>Line Height</h4>
                <div class="cb-range-wrap">
                    <div class="cb-range-header">
                        <span class="toggle-label-text">Leading</span>
                        <span class="cb-range-value" data-range="base-lineHeight">1.5</span>
                    </div>
                    <input type="range" class="cb-range" id="base-lineHeight" min="10" max="30" value="15"
                        data-unit="lh" data-preview="base-lineHeightPreview">
                </div>
                <div class="cb-lineheight-preview" id="base-lineHeightPreview" style="line-height:1.5;">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor.
                </div>
            </div>

            <!-- 29. Date Picker -->
            <div class="base-input-group">
                <h4>Date Picker</h4>
                <div class="cb-datepicker" data-datepicker>
                    <div class="cb-datepicker-header">
                        <button class="cb-datepicker-nav" data-dp-nav="prev">
                            <i class="fa-solid fa-chevron-left"></i>
                        </button>
                        <span class="cb-datepicker-title">Loading...</span>
                        <button class="cb-datepicker-nav" data-dp-nav="next">
                            <i class="fa-solid fa-chevron-right"></i>
                        </button>
                    </div>
                    <div class="cb-datepicker-days"></div>
                </div>
            </div>

            <!-- 30. Time Picker -->
            <div class="base-input-group">
                <h4>Time Picker</h4>
                <div class="cb-timepicker" data-timepicker>
                    <div class="cb-time-col">
                        <button class="cb-time-spin" data-time="h-up"><i class="fa-solid fa-chevron-up"></i></button>
                        <span class="cb-time-display" data-time-display="h">09</span>
                        <button class="cb-time-spin" data-time="h-down"><i class="fa-solid fa-chevron-down"></i></button>
                    </div>
                    <span class="cb-time-sep">:</span>
                    <div class="cb-time-col">
                        <button class="cb-time-spin" data-time="m-up"><i class="fa-solid fa-chevron-up"></i></button>
                        <span class="cb-time-display" data-time-display="m">30</span>
                        <button class="cb-time-spin" data-time="m-down"><i class="fa-solid fa-chevron-down"></i></button>
                    </div>
                    <div class="cb-time-period">
                        <button class="cb-time-period-btn active" data-period="AM">AM</button>
                        <button class="cb-time-period-btn" data-period="PM">PM</button>
                    </div>
                </div>
            </div>

            <!-- 31. Alignment Picker -->
            <div class="base-input-group">
                <h4>Alignment Picker</h4>
                <div class="cb-align-grid" data-align-grid>
                    <button class="cb-align-btn" data-align="tl"><i class="fa-solid fa-arrow-up-left"></i></button>
                    <button class="cb-align-btn" data-align="tc"><i class="fa-solid fa-arrow-up"></i></button>
                    <button class="cb-align-btn" data-align="tr"><i class="fa-solid fa-arrow-up-right"></i></button>
                    <button class="cb-align-btn" data-align="ml"><i class="fa-solid fa-arrow-left"></i></button>
                    <button class="cb-align-btn selected" data-align="mc"><i class="fa-solid fa-compress"></i></button>
                    <button class="cb-align-btn" data-align="mr"><i class="fa-solid fa-arrow-right"></i></button>
                    <button class="cb-align-btn" data-align="bl"><i class="fa-solid fa-arrow-down-left"></i></button>
                    <button class="cb-align-btn" data-align="bc"><i class="fa-solid fa-arrow-down"></i></button>
                    <button class="cb-align-btn" data-align="br"><i class="fa-solid fa-arrow-down-right"></i></button>
                </div>
            </div>

        </div>`;
    }

    /* ════════════════════════════════════════
       CREATE SECTION
       ════════════════════════════════════════ */

    function createSection() {
        const content = document.querySelector(".custom-content");
        if (!content) return;

        section = document.createElement("div");
        section.className = "custom-section";
        section.id = "baseSection";
        section.innerHTML = buildHTML();

        content.appendChild(section);

        const tabBtn = document.querySelector('.sidebar-item[data-section="base"]');
        if (tabBtn && tabBtn.classList.contains("active")) {
            section.classList.add("active");
        }
    }

    /* ════════════════════════════════════════
       COMPONENT INITIALIZERS
       Each can be called with any root el.
       ════════════════════════════════════════ */

    function initRanges(root) {
        root.querySelectorAll(".cb-range:not([data-cb-init])").forEach(range => {
            range.dataset.cbInit = "1";
            const id = range.id;
            const badge = id ? root.querySelector(`[data-range="${id}"]`) || document.querySelector(`[data-range="${id}"]`) : null;
            const previewId = range.dataset.preview;
            const preview = previewId ? document.getElementById(previewId) : null;
            const unit = range.dataset.unit || "";

            function fmt(v) {
                if (unit === "lh") return (v / 10).toFixed(1);
                if (unit === "px") return v + "px";
                return v;
            }

            function update() {
                const v = range.value;
                if (badge) badge.textContent = fmt(v);
                if (preview) {
                    if (unit === "px" && preview.classList.contains("cb-fontsize-preview"))
                        preview.style.fontSize = v + "px";
                    if (unit === "px" && preview.classList.contains("cb-letterspacing-preview"))
                        preview.style.letterSpacing = v + "px";
                    if (unit === "lh")
                        preview.style.lineHeight = (v / 10).toFixed(1);
                }
            }
            range.addEventListener("input", update);
            update();
        });
    }

    function initDualRanges(root) {
        root.querySelectorAll(".cb-dual-range:not([data-cb-init])").forEach(wrap => {
            wrap.dataset.cbInit = "1";
            const inputs = wrap.querySelectorAll('input[type="range"]');
            const fill = wrap.querySelector(".cb-dual-range-fill");
            const parent = wrap.closest(".cb-range-wrap") || wrap.parentElement;
            const minLabel = parent.querySelector('[data-dual="min"]');
            const maxLabel = parent.querySelector('[data-dual="max"]');

            function update() {
                let minVal = parseInt(inputs[0].value);
                let maxVal = parseInt(inputs[1].value);
                if (minVal > maxVal) {
                    [inputs[0].value, inputs[1].value] = [maxVal, minVal];
                    [minVal, maxVal] = [maxVal, parseInt(inputs[1].value)];
                }
                if (fill) { fill.style.left = minVal + "%"; fill.style.width = (maxVal - minVal) + "%"; }
                if (minLabel) minLabel.textContent = minVal;
                if (maxLabel) maxLabel.textContent = maxVal;
            }
            inputs.forEach(i => i.addEventListener("input", update));
            update();
        });
    }

    function initSegmented(root) {
        root.querySelectorAll("[data-segmented]:not([data-cb-init])").forEach(seg => {
            seg.dataset.cbInit = "1";
            seg.querySelectorAll(".cb-segmented-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    seg.querySelectorAll(".cb-segmented-btn").forEach(b => b.classList.remove("active"));
                    btn.classList.add("active");
                });
            });
        });
    }

    function initBtnGroups(root) {
        root.querySelectorAll("[data-btn-group]:not([data-cb-init])").forEach(group => {
            group.dataset.cbInit = "1";
            group.querySelectorAll(".cb-btn-group-item").forEach(btn => {
                btn.addEventListener("click", () => {
                    group.querySelectorAll(".cb-btn-group-item").forEach(b => b.classList.remove("active"));
                    btn.classList.add("active");
                });
            });
        });
    }

    function initIconSelectors(root) {
        root.querySelectorAll("[data-icon-selector]:not([data-cb-init])").forEach(grid => {
            grid.dataset.cbInit = "1";
            grid.querySelectorAll(".cb-icon-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    grid.querySelectorAll(".cb-icon-btn").forEach(b => b.classList.remove("selected"));
                    btn.classList.add("selected");
                });
            });
        });
    }

    function initDropdowns(root) {
        root.querySelectorAll(".cb-dropdown:not([data-cb-init])").forEach(dd => {
            dd.dataset.cbInit = "1";
            const trigger = dd.querySelector(".cb-dropdown-trigger");
            const items = dd.querySelectorAll(".cb-dropdown-item");
            if (!trigger) return;
            trigger.addEventListener("click", e => {
                e.stopPropagation();
                // Close all other open dropdowns first
                document.querySelectorAll(".cb-dropdown.open").forEach(o => {
                    if (o !== dd) o.classList.remove("open");
                });
                dd.classList.toggle("open");
            });
            items.forEach(item => {
                item.addEventListener("click", () => {
                    items.forEach(i => i.classList.remove("selected"));
                    item.classList.add("selected");
                    trigger.querySelector("span").textContent = item.textContent;
                    dd.classList.remove("open");
                    // Fire change event on linked native select if any
                    const selId = dd.dataset.forSelect;
                    if (selId) {
                        const sel = document.getElementById(selId);
                        if (sel) {
                            sel.value = item.dataset.value;
                            sel.dispatchEvent(new Event("change", { bubbles: true }));
                        }
                    }
                });
            });
        });
        // Global close on outside click (attach once)
        if (!document._cbDropdownOutsideInit) {
            document._cbDropdownOutsideInit = true;
            document.addEventListener("click", () => {
                document.querySelectorAll(".cb-dropdown.open").forEach(dd => dd.classList.remove("open"));
            });
        }
    }

    function initSteppers(root) {
        root.querySelectorAll("[data-stepper]:not([data-cb-init])").forEach(stepper => {
            stepper.dataset.cbInit = "1";
            const min = parseInt(stepper.dataset.min ?? 0);
            const max = parseInt(stepper.dataset.max ?? 100);
            const valueEl = stepper.querySelector(".cb-stepper-value");
            let val = parseInt(valueEl?.textContent ?? 0);
            stepper.querySelectorAll(".cb-stepper-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    val = btn.dataset.action === "inc" ? Math.min(max, val + 1) : Math.max(min, val - 1);
                    if (valueEl) valueEl.textContent = val;
                });
            });
        });
    }

    function initTagInputs(root) {
        root.querySelectorAll(".cb-tags-container:not([data-cb-init])").forEach(container => {
            container.dataset.cbInit = "1";
            const input = container.querySelector(".cb-tag-input");
            if (!input) return;

            function addTag(val) {
                if (!val.trim()) return;
                const tag = document.createElement("span");
                tag.className = "cb-tag";
                tag.innerHTML = `${val.trim()} <button class="cb-tag-remove">&times;</button>`;
                tag.querySelector(".cb-tag-remove").addEventListener("click", () => tag.remove());
                container.insertBefore(tag, input);
                input.value = "";
            }

            input.addEventListener("keydown", e => {
                if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag(input.value.replace(",", ""));
                } else if (e.key === "Backspace" && !input.value) {
                    const tags = container.querySelectorAll(".cb-tag");
                    if (tags.length) tags[tags.length - 1].remove();
                }
            });

            container.querySelectorAll(".cb-tag-remove").forEach(btn => {
                btn.addEventListener("click", () => btn.closest(".cb-tag").remove());
            });
        });
    }

    function initSearchInputs(root) {
        root.querySelectorAll(".cb-search-wrap:not([data-cb-init])").forEach(wrap => {
            wrap.dataset.cbInit = "1";
            const input = wrap.querySelector(".cb-search-input");
            const clear = wrap.querySelector(".cb-search-clear");
            if (clear && input) {
                clear.addEventListener("click", () => { input.value = ""; input.focus(); });
            }
        });
    }

    function initTextareas(root) {
        root.querySelectorAll(".cb-textarea:not([data-cb-init])").forEach(ta => {
            ta.dataset.cbInit = "1";
            const id = ta.id;
            const counter = id ? root.querySelector(`[data-textarea="${id}"]`) || document.querySelector(`[data-textarea="${id}"]`) : null;
            const max = parseInt(ta.getAttribute("maxlength")) || 500;
            if (counter) {
                ta.addEventListener("input", () => { counter.textContent = ta.value.length; });
            }
        });
    }

    function initRadiusControls(root) {
        root.querySelectorAll("[data-radius]:not([data-cb-init])").forEach(wrap => {
            wrap.dataset.cbInit = "1";
            const preview = wrap.querySelector(".cb-radius-preview");
            const inputs = wrap.querySelectorAll(".cb-radius-input input");
            if (!preview || !inputs.length) return;
            function update() {
                const vals = Array.from(inputs).map(i => (i.value || 0) + "px");
                preview.style.borderRadius = vals.join(" ");
            }
            inputs.forEach(i => i.addEventListener("input", update));
            update();
        });
    }

    function initShadowControls(root) {
        root.querySelectorAll("[data-shadow-sliders]:not([data-cb-init])").forEach(sliders => {
            sliders.dataset.cbInit = "1";
            // Find sibling preview
            const parent = sliders.closest(".base-input-group") || sliders.parentElement;
            const preview = parent ? parent.querySelector("[data-shadow-preview]") : null;

            function update() {
                const x      = sliders.querySelector('[data-shadow="x"]')?.value ?? 4;
                const y      = sliders.querySelector('[data-shadow="y"]')?.value ?? 4;
                const blur   = sliders.querySelector('[data-shadow="blur"]')?.value ?? 12;
                const spread = sliders.querySelector('[data-shadow="spread"]')?.value ?? 0;
                if (preview) preview.style.boxShadow = `${x}px ${y}px ${blur}px ${spread}px rgba(0,0,0,0.2)`;
            }
            sliders.querySelectorAll('input[type="range"]').forEach(i => i.addEventListener("input", update));
            update();
        });
    }

    function initWeightSelectors(root) {
        root.querySelectorAll("[data-weight-selector]:not([data-cb-init])").forEach(wrap => {
            wrap.dataset.cbInit = "1";
            const preview = wrap.querySelector(".cb-weight-preview");
            wrap.querySelectorAll(".cb-weight-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    wrap.querySelectorAll(".cb-weight-btn").forEach(b => b.classList.remove("active"));
                    btn.classList.add("active");
                    if (preview) preview.style.fontWeight = btn.dataset.weight;
                });
            });
        });
    }

    function initAlignGrids(root) {
        root.querySelectorAll("[data-align-grid]:not([data-cb-init])").forEach(grid => {
            grid.dataset.cbInit = "1";
            grid.querySelectorAll(".cb-align-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    grid.querySelectorAll(".cb-align-btn").forEach(b => b.classList.remove("active", "selected"));
                    btn.classList.add("selected");
                });
            });
        });
    }

    function initPalettes(root) {
        root.querySelectorAll("[data-palette]:not([data-cb-init])").forEach(palette => {
            palette.dataset.cbInit = "1";
            palette.querySelectorAll(".cb-palette-swatch").forEach(swatch => {
                swatch.addEventListener("click", () => {
                    palette.querySelectorAll(".cb-palette-swatch").forEach(s => s.classList.remove("selected"));
                    swatch.classList.add("selected");
                });
            });
        });
    }

    function initAccordions(root) {
        root.querySelectorAll("[data-accordion]:not([data-cb-init])").forEach(acc => {
            acc.dataset.cbInit = "1";
            acc.querySelectorAll(".cb-accordion-header").forEach(header => {
                header.addEventListener("click", () => {
                    const item = header.parentElement;
                    const wasOpen = item.classList.contains("open");
                    acc.querySelectorAll(".cb-accordion-item").forEach(i => i.classList.remove("open"));
                    if (!wasOpen) item.classList.add("open");
                });
            });
        });
    }

    function initBreadcrumbs(root) {
        root.querySelectorAll("[data-breadcrumb]:not([data-cb-init])").forEach(wrap => {
            wrap.dataset.cbInit = "1";
            wrap.querySelectorAll(".cb-breadcrumb-item").forEach(btn => {
                btn.addEventListener("click", () => {
                    wrap.querySelectorAll(".cb-breadcrumb-item").forEach(b => b.classList.remove("active"));
                    btn.classList.add("active");
                });
            });
        });
    }

    function initDatePickers(root) {
        root.querySelectorAll("[data-datepicker]:not([data-cb-init])").forEach(dp => {
            dp.dataset.cbInit = "1";
            const grid  = dp.querySelector(".cb-datepicker-days");
            const title = dp.querySelector(".cb-datepicker-title");
            if (!grid) return;

            let year = new Date().getFullYear();
            let month = new Date().getMonth();
            let selected = null;

            const DAYS = ["Mo","Tu","We","Th","Fr","Sa","Su"];

            function render() {
                if (title) title.textContent = new Date(year, month, 1)
                    .toLocaleString("default", { month: "long", year: "numeric" });
                grid.innerHTML = DAYS.map(d => `<span class="cb-datepicker-day-header">${d}</span>`).join("");

                // Monday-first offset
                let startOffset = new Date(year, month, 1).getDay();
                startOffset = (startOffset + 6) % 7; // 0=Mon

                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const today = new Date();

                for (let i = 0; i < startOffset; i++) {
                    grid.insertAdjacentHTML("beforeend", `<button class="cb-datepicker-day muted" disabled></button>`);
                }
                for (let d = 1; d <= daysInMonth; d++) {
                    const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                    const isSel  = d === selected;
                    grid.insertAdjacentHTML("beforeend",
                        `<button class="cb-datepicker-day${isToday ? " today" : ""}${isSel ? " selected" : ""}" data-day="${d}">${d}</button>`);
                }
                // Fill trailing cells
                const total = startOffset + daysInMonth;
                const trailing = (7 - (total % 7)) % 7;
                for (let i = 1; i <= trailing; i++) {
                    grid.insertAdjacentHTML("beforeend", `<button class="cb-datepicker-day muted" disabled>${i}</button>`);
                }

                grid.querySelectorAll("[data-day]").forEach(btn => {
                    btn.addEventListener("click", () => { selected = parseInt(btn.dataset.day); render(); });
                });
            }

            dp.querySelector('[data-dp-nav="prev"]')?.addEventListener("click", () => {
                month--; if (month < 0) { month = 11; year--; } render();
            });
            dp.querySelector('[data-dp-nav="next"]')?.addEventListener("click", () => {
                month++; if (month > 11) { month = 0; year++; } render();
            });
            render();
        });
    }

    function initTimePickers(root) {
        root.querySelectorAll("[data-timepicker]:not([data-cb-init])").forEach(wrap => {
            wrap.dataset.cbInit = "1";
            let h = 9, m = 30;
            const hDisp = wrap.querySelector('[data-time-display="h"]');
            const mDisp = wrap.querySelector('[data-time-display="m"]');
            const pad = n => String(n).padStart(2, "0");
            const update = () => { if (hDisp) hDisp.textContent = pad(h); if (mDisp) mDisp.textContent = pad(m); };

            wrap.querySelectorAll("[data-time]").forEach(btn => {
                btn.addEventListener("click", () => {
                    const a = btn.dataset.time;
                    if (a === "h-up")   h = (h % 12) + 1;
                    if (a === "h-down") h = h <= 1 ? 12 : h - 1;
                    if (a === "m-up")   m = (m + 1) % 60;
                    if (a === "m-down") m = m <= 0 ? 59 : m - 1;
                    update();
                });
            });
            wrap.querySelectorAll("[data-period]").forEach(btn => {
                btn.addEventListener("click", () => {
                    wrap.querySelectorAll("[data-period]").forEach(b => b.classList.remove("active"));
                    btn.classList.add("active");
                });
            });
            update();
        });
    }

    /* ── Fixed Knob ─────────────────────────── */
    function initKnobs(root) {
        root.querySelectorAll("[data-knob]:not([data-cb-init])").forEach(knob => {
            knob.dataset.cbInit = "1";
            const fill   = knob.querySelector(".cb-knob-fill");
            const track  = knob.querySelector(".cb-knob-track");
            const center = knob.querySelector(".cb-knob-center");
            if (!fill || !track) return;

            const R           = 40;
            const circumf     = 2 * Math.PI * R;      // 251.33
            const arcFrac     = 0.75;                  // 270° arc
            const arc         = circumf * arcFrac;     // 188.5
            const min         = parseFloat(knob.dataset.min ?? 0);
            const max         = parseFloat(knob.dataset.max ?? 100);
            let   value       = parseFloat(knob.dataset.value ?? 0);
            let   dragging    = false;

            // Set static track arc (270° of circle)
            track.setAttribute("stroke-dasharray",  `${arc} ${circumf}`);
            track.setAttribute("stroke-dashoffset", `${circumf * (1 - arcFrac) / 2}`);

            function setKnobValue(v) {
                value = Math.max(min, Math.min(max, v));
                knob.dataset.value = value;
                const pct    = (value - min) / (max - min);
                const offset = arc * (1 - pct);
                fill.setAttribute("stroke-dasharray",  `${arc} ${circumf}`);
                fill.setAttribute("stroke-dashoffset", `${arc * (1 - pct) + circumf * (1 - arcFrac) / 2}`);
                if (center) center.textContent = Math.round(value);
            }

            function angleFromEvent(clientX, clientY) {
                const rect = knob.getBoundingClientRect();
                const cx = rect.left + rect.width  / 2;
                const cy = rect.top  + rect.height / 2;
                let angle = Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
                // 0° = top, clockwise. Arc starts at -225° (bottom-left) and goes 270°.
                angle = (angle + 225 + 360) % 360;
                return angle;
            }

            function valueFromAngle(angle) {
                const pct = Math.min(1, Math.max(0, angle / 270));
                return min + pct * (max - min);
            }

            knob.addEventListener("mousedown", e => {
                e.preventDefault();
                dragging = true;
                setKnobValue(valueFromAngle(angleFromEvent(e.clientX, e.clientY)));
            });
            document.addEventListener("mousemove", e => {
                if (!dragging) return;
                setKnobValue(valueFromAngle(angleFromEvent(e.clientX, e.clientY)));
            });
            document.addEventListener("mouseup", () => { dragging = false; });

            knob.addEventListener("touchstart", e => {
                dragging = true;
                const t = e.touches[0];
                setKnobValue(valueFromAngle(angleFromEvent(t.clientX, t.clientY)));
            }, { passive: true });
            document.addEventListener("touchmove", e => {
                if (!dragging) return;
                const t = e.touches[0];
                setKnobValue(valueFromAngle(angleFromEvent(t.clientX, t.clientY)));
            }, { passive: true });
            document.addEventListener("touchend", () => { dragging = false; });

            // Scroll wheel support
            knob.addEventListener("wheel", e => {
                e.preventDefault();
                setKnobValue(value + (e.deltaY < 0 ? 1 : -1));
            }, { passive: false });

            setKnobValue(value);
        });
    }

    /* ── Demo Pickr (base tab only) ─────────── */
    function initBasePickr() {
        const container = section ? section.querySelector("#base-colorPicker") : null;
        if (!container || !window.Pickr) return;
        const valueEl = section.querySelector("#base-colorValue");
        Pickr.create({
            el: container,
            theme: "classic",
            default: "#6196ff",
            components: { preview: true, hue: true, interaction: { hex: true, input: true, save: true } }
        }).on("save", (color, inst) => {
            if (!color) return;
            let hex = color.toHEXA().toString();
            if (hex.length > 7) hex = hex.slice(0, 7);
            if (valueEl) valueEl.textContent = hex.toUpperCase();
            inst.hide();
        });
    }

    /* ════════════════════════════════════════
       MASTER INIT — call this on any container
       ════════════════════════════════════════ */

    function initContainer(root) {
        if (!root || root.nodeType !== 1) return;
        initRanges(root);
        initDualRanges(root);
        initSegmented(root);
        initBtnGroups(root);
        initIconSelectors(root);
        initDropdowns(root);
        initSteppers(root);
        initTagInputs(root);
        initSearchInputs(root);
        initTextareas(root);
        initRadiusControls(root);
        initShadowControls(root);
        initWeightSelectors(root);
        initAlignGrids(root);
        initPalettes(root);
        initAccordions(root);
        initBreadcrumbs(root);
        initDatePickers(root);
        initTimePickers(root);
        initKnobs(root);
    }

    /* ════════════════════════════════════════
       GLOBAL SELECT REPLACEMENT
       Keeps native <select> hidden + synced.
       ════════════════════════════════════════ */

    function buildDropdownFromSelect(sel) {
        if (sel.dataset.cbReplaced) return;
        sel.dataset.cbReplaced = "1";

        const id = sel.id || ("sel-" + Math.random().toString(36).slice(2));
        sel.id = id;

        const dd = document.createElement("div");
        dd.className = "cb-dropdown";
        dd.dataset.forSelect = id;

        const selectedOpt = sel.options[sel.selectedIndex];
        const selectedText = selectedOpt ? selectedOpt.text : "Select...";

        dd.innerHTML = `
            <button class="cb-dropdown-trigger" type="button">
                <span>${selectedText}</span>
                <i class="fa-solid fa-chevron-down"></i>
            </button>
            <div class="cb-dropdown-menu">
                ${Array.from(sel.options).map(o =>
                    `<div class="cb-dropdown-item${sel.value === o.value ? " selected" : ""}"
                        data-value="${o.value}">${o.text}</div>`
                ).join("")}
            </div>`;

        sel.insertAdjacentElement("beforebegin", dd);
        initDropdowns(dd.parentElement);

        // Sync native → dropdown when changed by JS
        const syncFromNative = () => {
            const opt = sel.options[sel.selectedIndex];
            if (!opt) return;
            dd.querySelector(".cb-dropdown-trigger span").textContent = opt.text;
            dd.querySelectorAll(".cb-dropdown-item").forEach(item => {
                item.classList.toggle("selected", item.dataset.value === sel.value);
            });
        };

        // Watch for native value changes (e.g. todo.js sets .value directly)
        const observer = new MutationObserver(syncFromNative);
        observer.observe(sel, { attributes: true, attributeFilter: ["value"] });

        // Also intercept .value assignments via a property descriptor
        const proto = Object.getPrototypeOf(sel);
        const desc  = Object.getOwnPropertyDescriptor(proto, "value");
        if (desc) {
            Object.defineProperty(sel, "value", {
                get() { return desc.get.call(this); },
                set(v) {
                    desc.set.call(this, v);
                    syncFromNative();
                },
                configurable: true
            });
        }
    }

    function replaceAllSelects(root) {
        root.querySelectorAll("select:not([data-cb-replaced])").forEach(buildDropdownFromSelect);
    }

    /* ════════════════════════════════════════
       MUTATION OBSERVER
       Watches for new cb- elements or selects
       added anywhere on the page.
       ════════════════════════════════════════ */

    function startObserver() {
        const observer = new MutationObserver(mutations => {
            for (const m of mutations) {
                m.addedNodes.forEach(node => {
                    if (node.nodeType !== 1) return;
                    // Auto-init cb- components
                    initContainer(node);
                    // Replace any new selects
                    if (node.tagName === "SELECT") {
                        buildDropdownFromSelect(node);
                    } else {
                        replaceAllSelects(node);
                    }
                });
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    /* ════════════════════════════════════════
       PUBLIC API
       ════════════════════════════════════════ */

    window.CBComponents = {
        /**
         * Init all cb- components inside a container.
         * Call this after dynamically inserting cb- HTML.
         * @param {Element} container - root element to scan
         */
        init: initContainer,

        /**
         * Replace all <select> elements inside a container.
         * @param {Element} [container=document] - root to scan
         */
        replaceSelects: (container = document) => replaceAllSelects(container),
    };

    /* ════════════════════════════════════════
       BOOT
       ════════════════════════════════════════ */

    function boot() {
        createSection();
        initContainer(document.body);
        initBasePickr();
        replaceAllSelects(document);
        startObserver();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }

})();
