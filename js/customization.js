/* ========================================
   CUSTOMIZATION — ENTRY POINT
   Dynamically loads all tab modules from ./js/customization/
   ======================================== */

// ── Module Loader ──────────────────────────
(function loadCustomizationModules() {
    "use strict";

    const MODULES = [
        "themes",
        "accent",
        // Future tabs go here: "appearance", "layout", "fonts", etc.
    ];

    // Resolve base path relative to this script's location
    const BASE_PATH = (function () {
        const scripts = document.querySelectorAll("script[src]");
        for (const s of scripts) {
            if (s.src && s.src.includes("customization.js")) {
                return s.src.replace("customization.js", "customization/");
            }
        }
        return "./js/customization/";
    })();

    function loadModule(name) {
        // Load CSS first
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = BASE_PATH + name + ".css";
        document.head.appendChild(link);

        // Then load JS
        const script = document.createElement("script");
        script.src = BASE_PATH + name + ".js";
        script.async = false; // Preserve order
        document.head.appendChild(script);
    }

    MODULES.forEach(loadModule);
})();


/* ========================================
   CUSTOMIZATION OVERLAY — CORE CONTROLS
   All Base Input Components Demo
   ======================================== */

(function () {
    "use strict";

    const STORAGE_KEYS = {
        ACCENT_COLOR: "customization-accent-color",
    };

    let currentAccentColor = localStorage.getItem(STORAGE_KEYS.ACCENT_COLOR) || "#6196ff";
    let pickrInstance = null;

    // ── Bootstrap ──────────────────────────
    function init() {
        setupOverlay();
        initializeBaseControls();
        applyAccentColor(currentAccentColor);
    }

    // ── Overlay open/close + sidebar nav ──
    function setupOverlay() {
        const customBtn = document.getElementById("customizationBtn");
        const sheetBtn = document.getElementById("sheetCustomizationBtn");
        const closeBtn = document.getElementById("closeCustomization");

        const openFn = () => {
            if (window.overlayManager) {
                window.overlayManager.close("sideMenu");
                window.overlayManager.open("customizationOverlay");
            }
        };

        if (customBtn) customBtn.addEventListener("click", openFn);
        if (sheetBtn) sheetBtn.addEventListener("click", openFn);
        if (closeBtn)
            closeBtn.addEventListener("click", () =>
                window.overlayManager.close("customizationOverlay")
            );

        // Sidebar tab switching (generic — modules inject their own items)
        document.addEventListener("click", (e) => {
            const item = e.target.closest(".sidebar-item[data-section]");
            if (!item) return;
            document
                .querySelectorAll(".sidebar-item")
                .forEach((i) => i.classList.remove("active"));
            item.classList.add("active");
            document
                .querySelectorAll(".custom-section")
                .forEach((s) => s.classList.remove("active"));
            const section = document.getElementById(
                item.dataset.section + "Section"
            );
            if (section) section.classList.add("active");
        });

        if (window.overlayManager) window.overlayManager.register("customizationOverlay");
    }

    // ── Apply Accent Color ─────────────────
    function applyAccentColor(color) {
        currentAccentColor = color;
        document.documentElement.style.setProperty("--accent-color", color);
        localStorage.setItem(STORAGE_KEYS.ACCENT_COLOR, color);
        const demoColorValue = document.getElementById("demoColorValue");
        if (demoColorValue) demoColorValue.textContent = color.toUpperCase();
    }

    // ══════════════════════════════════════
    //  INITIALIZE ALL BASE CONTROLS
    // ══════════════════════════════════════
    function initializeBaseControls() {
        initPickr();
        initRangeSliders();
        initDualRange();
        initSegmented();
        initDropdowns();
        initSteppers();
        initIconSelector();
        initBtnGroup();
        initTagInput();
        initOpacitySlider();
        initRadiusControl();
        initFontSizeSlider();
        initWeightSelector();
        initLetterSpacing();
        initLineHeight();
        initShadowControl();
        initPalette();
        initImageSelector();
        initAlignGrid();
        initDatePicker();
        initTimePicker();
        initStarRating();
        initEmojiRating();
        initKnob();
        initBreadcrumb();
        initAccordion();
        initSearchInput();
        initTextarea();
    }

    // ── 1. Pickr Color Picker ─────────────
    function initPickr() {
        if (!document.querySelector(".pickr-container")) return;
        const demoColorValue = document.getElementById("demoColorValue");
        pickrInstance = Pickr.create({
            el: ".pickr-container",
            theme: "classic",
            default: currentAccentColor,
            components: {
                preview: true,
                hue: true,
                interaction: { hex: true, input: true, save: true },
            },
        });
        pickrInstance.on("save", (color, instance) => {
            if (!color) return;
            let hex = color.toHEXA().toString(0);
            if (hex.length > 7) hex = hex.substring(0, 7);
            applyAccentColor(hex);
            if (demoColorValue) demoColorValue.textContent = hex.toUpperCase();
            instance.hide();
        });
    }

    // ── 3. Range Sliders ──────────────────
    function initRangeSliders() {
        document.querySelectorAll(".cb-range").forEach((range) => {
            const id = range.id;
            const badge = document.querySelector(`[data-range="${id}"]`);
            const update = () => {
                const val = range.value;
                if (!badge) return;
                if (id === "demoOpacity") badge.textContent = val + "%";
                else if (id === "demoFontSize") badge.textContent = val + "px";
                else if (id === "demoLetterSpacing")
                    badge.textContent = val + "px";
                else if (id === "demoLineHeight")
                    badge.textContent = (val / 10).toFixed(1);
                else badge.textContent = val;
            };
            range.addEventListener("input", update);
            update();
        });
    }

    // ── 4. Dual Range Slider ──────────────
    function initDualRange() {
        const wrap = document.getElementById("demoDualRange");
        if (!wrap) return;
        const inputs = wrap.querySelectorAll('input[type="range"]');
        const fill = wrap.querySelector(".cb-dual-range-fill");
        const minLabel = document.querySelector('[data-dual="min"]');
        const maxLabel = document.querySelector('[data-dual="max"]');

        const update = () => {
            let minVal = parseInt(inputs[0].value);
            let maxVal = parseInt(inputs[1].value);
            if (minVal > maxVal) {
                [inputs[0].value, inputs[1].value] = [maxVal, minVal];
                minVal = maxVal;
                maxVal = parseInt(inputs[1].value);
            }
            fill.style.left = minVal + "%";
            fill.style.width = maxVal - minVal + "%";
            if (minLabel) minLabel.textContent = minVal;
            if (maxLabel) maxLabel.textContent = maxVal;
        };
        inputs.forEach((i) => i.addEventListener("input", update));
        update();
    }

    // ── 5. Segmented Controls ─────────────
    function initSegmented() {
        document.querySelectorAll("[data-segmented]").forEach((seg) => {
            seg.querySelectorAll(".cb-segmented-btn").forEach((btn) => {
                btn.addEventListener("click", () => {
                    seg.querySelectorAll(".cb-segmented-btn").forEach((b) =>
                        b.classList.remove("active")
                    );
                    btn.classList.add("active");
                });
            });
        });
    }

    // ── 6. Dropdowns ──────────────────────
    function initDropdowns() {
        document.querySelectorAll(".cb-dropdown").forEach((dd) => {
            const trigger = dd.querySelector(".cb-dropdown-trigger");
            const items = dd.querySelectorAll(".cb-dropdown-item");
            trigger.addEventListener("click", (e) => {
                e.stopPropagation();
                dd.classList.toggle("open");
            });
            items.forEach((item) => {
                item.addEventListener("click", () => {
                    items.forEach((i) => i.classList.remove("selected"));
                    item.classList.add("selected");
                    trigger.querySelector("span").textContent = item.textContent;
                    dd.classList.remove("open");
                });
            });
            document.addEventListener("click", () =>
                dd.classList.remove("open")
            );
        });
    }

    // ── 8. Number Steppers ────────────────
    function initSteppers() {
        document.querySelectorAll("[data-stepper]").forEach((stepper) => {
            const min = parseInt(stepper.dataset.min ?? 0);
            const max = parseInt(stepper.dataset.max ?? 100);
            const valueEl = stepper.querySelector(".cb-stepper-value");
            let val = parseInt(valueEl?.textContent ?? 5);

            stepper.querySelectorAll(".cb-stepper-btn").forEach((btn) => {
                btn.addEventListener("click", () => {
                    if (btn.dataset.action === "inc") val = Math.min(max, val + 1);
                    else val = Math.max(min, val - 1);
                    if (valueEl) valueEl.textContent = val;
                });
            });
        });
    }

    // ── 11. Icon Selector ─────────────────
    function initIconSelector() {
        document.querySelectorAll("[data-icon-selector]").forEach((grid) => {
            grid.querySelectorAll(".cb-icon-btn").forEach((btn) => {
                btn.addEventListener("click", () => {
                    grid.querySelectorAll(".cb-icon-btn").forEach((b) =>
                        b.classList.remove("selected")
                    );
                    btn.classList.add("selected");
                });
            });
        });
    }

    // ── 12. Button Group ──────────────────
    function initBtnGroup() {
        document.querySelectorAll("[data-btn-group]").forEach((group) => {
            group.querySelectorAll(".cb-btn-group-item").forEach((btn) => {
                btn.addEventListener("click", () => {
                    group.querySelectorAll(".cb-btn-group-item").forEach((b) =>
                        b.classList.remove("active")
                    );
                    btn.classList.add("active");
                });
            });
        });
    }

    // ── 13. Tag Input ─────────────────────
    function initTagInput() {
        document.querySelectorAll(".cb-tags-container").forEach((container) => {
            const input = container.querySelector(".cb-tag-input");
            if (!input) return;

            const addTag = (val) => {
                if (!val.trim()) return;
                const tag = document.createElement("span");
                tag.className = "cb-tag";
                tag.innerHTML = `${val.trim()} <button class="cb-tag-remove">&times;</button>`;
                container.insertBefore(tag, input);
                tag.querySelector(".cb-tag-remove").addEventListener("click", () =>
                    tag.remove()
                );
                input.value = "";
            };

            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag(input.value.replace(",", ""));
                } else if (
                    e.key === "Backspace" &&
                    !input.value &&
                    container.querySelectorAll(".cb-tag").length
                ) {
                    container
                        .querySelectorAll(".cb-tag")
                        [
                            container.querySelectorAll(".cb-tag").length - 1
                        ].remove();
                }
            });

            container.querySelectorAll(".cb-tag-remove").forEach((btn) => {
                btn.addEventListener("click", () => btn.closest(".cb-tag").remove());
            });
        });
    }

    // ── 15. Opacity Slider ────────────────
    function initOpacitySlider() {
        const range = document.getElementById("demoOpacity");
        const preview = document.querySelector(".cb-opacity-preview");
        if (!range || !preview) return;
        const update = () => {
            preview.style.opacity = range.value / 100;
        };
        range.addEventListener("input", update);
        update();
    }

    // ── 16. Border Radius Control ─────────
    function initRadiusControl() {
        const preview = document.getElementById("demoRadiusPreview");
        if (!preview) return;
        const inputs = document.querySelectorAll(".cb-radius-input");
        inputs.forEach((input) => {
            input.addEventListener("input", () => {
                const vals = Array.from(inputs).map((i) => i.value + "px");
                preview.style.borderRadius = vals.join(" ");
            });
        });
    }

    // ── 18. Font Size Slider ──────────────
    function initFontSizeSlider() {
        const range = document.getElementById("demoFontSize");
        const preview = document.querySelector(".cb-font-preview");
        if (!range || !preview) return;
        range.addEventListener("input", () => {
            preview.style.fontSize = range.value + "px";
        });
    }

    // ── 19. Font Weight Selector ──────────
    function initWeightSelector() {
        document.querySelectorAll("[data-weight-selector]").forEach((wrap) => {
            const preview = wrap.querySelector(".cb-weight-preview");
            wrap.querySelectorAll(".cb-weight-btn").forEach((btn) => {
                btn.addEventListener("click", () => {
                    wrap.querySelectorAll(".cb-weight-btn").forEach((b) =>
                        b.classList.remove("active")
                    );
                    btn.classList.add("active");
                    if (preview) preview.style.fontWeight = btn.dataset.weight;
                });
            });
        });
    }

    // ── 20. Letter Spacing ────────────────
    function initLetterSpacing() {
        const range = document.getElementById("demoLetterSpacing");
        const preview = document.querySelector(".cb-spacing-preview");
        if (!range || !preview) return;
        range.addEventListener("input", () => {
            preview.style.letterSpacing = range.value + "px";
        });
    }

    // ── 21. Line Height ───────────────────
    function initLineHeight() {
        const range = document.getElementById("demoLineHeight");
        const preview = document.querySelector(".cb-line-height-preview");
        if (!range || !preview) return;
        range.addEventListener("input", () => {
            preview.style.lineHeight = range.value / 10;
        });
    }

    // ── 23. Shadow Control ────────────────
    function initShadowControl() {
        const wrap = document.getElementById("demoShadow");
        const preview = document.querySelector(".cb-shadow-preview");
        if (!wrap || !preview) return;

        const update = () => {
            const x = wrap.querySelector('[data-shadow="x"]')?.value ?? 0;
            const y = wrap.querySelector('[data-shadow="y"]')?.value ?? 4;
            const blur = wrap.querySelector('[data-shadow="blur"]')?.value ?? 10;
            const spread = wrap.querySelector('[data-shadow="spread"]')?.value ?? 0;
            preview.style.boxShadow = `${x}px ${y}px ${blur}px ${spread}px rgba(0,0,0,0.2)`;
        };

        wrap.querySelectorAll('input[type="range"]').forEach((i) =>
            i.addEventListener("input", update)
        );
        update();
    }

    // ── 24. Color Palette ─────────────────
    function initPalette() {
        document.querySelectorAll("[data-palette]").forEach((palette) => {
            palette.querySelectorAll(".cb-palette-swatch").forEach((swatch) => {
                swatch.addEventListener("click", () => {
                    palette.querySelectorAll(".cb-palette-swatch").forEach((s) =>
                        s.classList.remove("selected")
                    );
                    swatch.classList.add("selected");
                });
            });
        });
    }

    // ── 25. Image Selector ────────────────
    function initImageSelector() {
        document
            .querySelectorAll(".cb-image-option")
            .forEach((opt) => {
                opt.addEventListener("click", () => {
                    opt.closest(".cb-image-selector")
                        ?.querySelectorAll(".cb-image-option")
                        .forEach((o) => o.classList.remove("selected"));
                    opt.classList.add("selected");
                });
            });
    }

    // ── 26. Align Grid ────────────────────
    function initAlignGrid() {
        document.querySelectorAll("[data-align-grid]").forEach((grid) => {
            grid.querySelectorAll(".cb-align-btn").forEach((btn) => {
                btn.addEventListener("click", () => {
                    grid.querySelectorAll(".cb-align-btn").forEach((b) =>
                        b.classList.remove("active")
                    );
                    btn.classList.add("active");
                });
            });
        });
    }

    // ── 27. Date Picker ───────────────────
    function initDatePicker() {
        const dp = document.getElementById("demoDatePicker");
        if (!dp) return;
        const grid = dp.querySelector(".cb-datepicker-grid");
        const monthEl = dp.querySelector(".cb-datepicker-month");
        if (!grid) return;

        let year = new Date().getFullYear();
        let month = new Date().getMonth();
        let selected = null;

        function render() {
            if (monthEl)
                monthEl.textContent = new Date(year, month, 1).toLocaleString(
                    "default",
                    { month: "long", year: "numeric" }
                );
            grid.innerHTML = "";
            const startOffset = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            for (let i = 0; i < startOffset; i++) {
                const btn = document.createElement("button");
                btn.className = "cb-datepicker-day muted";
                grid.appendChild(btn);
            }

            for (let d = 1; d <= daysInMonth; d++) {
                const btn = document.createElement("button");
                btn.className =
                    "cb-datepicker-day" +
                    (d === selected ? " selected" : "") +
                    (d === new Date().getDate() &&
                    month === new Date().getMonth() &&
                    year === new Date().getFullYear()
                        ? " today"
                        : "");
                btn.textContent = d;
                btn.addEventListener("click", () => {
                    selected = d;
                    render();
                });
                grid.appendChild(btn);
            }

            const totalCells = startOffset + daysInMonth;
            const remaining = ((7 - (totalCells % 7)) % 7);
            for (let i = 1; i <= remaining; i++) {
                const btn = document.createElement("button");
                btn.className = "cb-datepicker-day muted";
                btn.textContent = i;
                grid.appendChild(btn);
            }
        }

        document
            .querySelector('[data-dp-nav="prev"]')
            ?.addEventListener("click", () => {
                month--;
                if (month < 0) {
                    month = 11;
                    year--;
                }
                render();
            });
        document
            .querySelector('[data-dp-nav="next"]')
            ?.addEventListener("click", () => {
                month++;
                if (month > 11) {
                    month = 0;
                    year++;
                }
                render();
            });
        render();
    }

    // ── 28. Time Picker ───────────────────
    function initTimePicker() {
        const wrap = document.getElementById("demoTimePicker");
        if (!wrap) return;
        let h = 9,
            m = 30;
        const hDisp = wrap.querySelector('[data-time-display="h"]');
        const mDisp = wrap.querySelector('[data-time-display="m"]');
        const pad = (n) => String(n).padStart(2, "0");

        const update = () => {
            if (hDisp) hDisp.textContent = pad(h);
            if (mDisp) mDisp.textContent = pad(m);
        };

        wrap.querySelectorAll("[data-time]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const a = btn.dataset.time;
                if (a === "h-up") h = (h % 12) + 1;
                if (a === "h-down") h = h <= 1 ? 12 : h - 1;
                if (a === "m-up") m = (m + 1) % 60;
                if (a === "m-down") m = m <= 0 ? 59 : m - 1;
                update();
            });
        });

        wrap.querySelectorAll("[data-period]").forEach((btn) => {
            btn.addEventListener("click", () => {
                wrap.querySelectorAll("[data-period]").forEach((b) =>
                    b.classList.remove("active")
                );
                btn.classList.add("active");
            });
        });
    }

    // ── 30. Star Rating ───────────────────
    function initStarRating() {
        document.querySelectorAll("[data-star-rating]").forEach((wrap) => {
            const stars = wrap.querySelectorAll(".cb-star");
            const valueEl = wrap.querySelector(".cb-star-value");

            stars.forEach((star) => {
                star.addEventListener("mouseenter", () => {
                    const v = parseInt(star.dataset.star);
                    stars.forEach((s) =>
                        s.classList.toggle(
                            "hovered",
                            parseInt(s.dataset.star) <= v
                        )
                    );
                });
                star.addEventListener("mouseleave", () => {
                    stars.forEach((s) => s.classList.remove("hovered"));
                });
                star.addEventListener("click", () => {
                    const v = parseInt(star.dataset.star);
                    stars.forEach((s) =>
                        s.classList.toggle("active", parseInt(s.dataset.star) <= v)
                    );
                    if (valueEl) valueEl.textContent = v + "/5";
                });
            });
        });
    }

    // ── 31. Emoji Rating ──────────────────
    function initEmojiRating() {
        document.querySelectorAll("[data-emoji-rating]").forEach((wrap) => {
            wrap.querySelectorAll(".cb-emoji-btn").forEach((btn) => {
                btn.addEventListener("click", () => {
                    wrap.querySelectorAll(".cb-emoji-btn").forEach((b) =>
                        b.classList.remove("selected")
                    );
                    btn.classList.add("selected");
                });
            });
        });
    }

    // ── 32. Knob / Dial ───────────────────
    function initKnob() {
        const knob = document.getElementById("demoKnob");
        if (!knob) return;
        const fill = knob.querySelector(".cb-knob-fill");
        const center = knob.querySelector(".cb-knob-center");
        const circumference = 2 * Math.PI * 40;
        const arc = circumference * 0.75;

        let value = parseInt(knob.dataset.value) || 0;
        let dragging = false;

        function setKnobValue(v) {
            value = Math.max(0, Math.min(100, v));
            knob.dataset.value = value;
            const offset = arc - (arc * value) / 100;
            fill.setAttribute("stroke-dasharray", arc);
            fill.setAttribute("stroke-dashoffset", offset);
            center.textContent = Math.round(value);
        }

        const track = knob.querySelector(".cb-knob-track");
        track.setAttribute("stroke-dasharray", arc);
        track.setAttribute("stroke-dashoffset", 0);
        setKnobValue(value);

        knob.addEventListener("mousedown", () => { dragging = true; });
        document.addEventListener("mouseup", () => { dragging = false; });
        document.addEventListener("mousemove", (e) => {
            if (!dragging) return;
            const rect = knob.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            let angle =
                Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
            angle = (angle + 225) % 360;
            const pct = Math.min(100, Math.max(0, (angle / 270) * 100));
            setKnobValue(pct);
        });

        knob.addEventListener("touchstart", () => { dragging = true; }, { passive: true });
        document.addEventListener("touchend", () => { dragging = false; });
        document.addEventListener("touchmove", (e) => {
            if (!dragging) return;
            const touch = e.touches[0];
            const rect = knob.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            let angle =
                Math.atan2(touch.clientY - cy, touch.clientX - cx) *
                (180 / Math.PI);
            angle = (angle + 225) % 360;
            const pct = Math.min(100, Math.max(0, (angle / 270) * 100));
            setKnobValue(pct);
        }, { passive: true });
    }

    // ── 33. Breadcrumb ────────────────────
    function initBreadcrumb() {
        document.querySelectorAll("[data-breadcrumb]").forEach((wrap) => {
            wrap.querySelectorAll(".cb-breadcrumb-item").forEach((btn) => {
                btn.addEventListener("click", () => {
                    wrap.querySelectorAll(".cb-breadcrumb-item").forEach((b) =>
                        b.classList.remove("active")
                    );
                    btn.classList.add("active");
                });
            });
        });
    }

    // ── 34. Accordion ─────────────────────
    function initAccordion() {
        document.querySelectorAll("[data-accordion]").forEach((acc) => {
            acc.querySelectorAll(".cb-accordion-header").forEach((header) => {
                header.addEventListener("click", () => {
                    const item = header.parentElement;
                    const wasOpen = item.classList.contains("open");
                    acc.querySelectorAll(".cb-accordion-item").forEach((i) =>
                        i.classList.remove("open")
                    );
                    if (!wasOpen) item.classList.add("open");
                });
            });
        });
    }

    // ── 35. Search Input ──────────────────
    function initSearchInput() {
        document.querySelectorAll(".cb-search-clear").forEach((btn) => {
            btn.addEventListener("click", () => {
                const input = btn.parentElement.querySelector(".cb-search-input");
                if (input) {
                    input.value = "";
                    input.focus();
                }
            });
        });
    }

    // ── 36. Textarea counter ──────────────
    function initTextarea() {
        const textarea = document.querySelector(".cb-textarea");
        const counter = document.getElementById("demoTextareaCount");
        if (!textarea || !counter) return;
        textarea.addEventListener("input", () => {
            counter.textContent = textarea.value.length;
        });
    }

    // ── Start ─────────────────────────────
    if (document.readyState === "loading")
        document.addEventListener("DOMContentLoaded", init);
    else init();
})();