/* ========================================
   CUSTOMIZATION — ENTRY POINT
   Dynamically loads all tab modules from ./js/customization/
   ======================================== */

// ── Module Loader ─────────────────────────
 (function loadCustomizationModules() {
    "use strict";

    const MODULES = [
        "base",          // must load first — other modules insertBefore(#baseSection)
        "themes",
        "tcreate-modal",
        "accent",
        "font",
    ];

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
        return new Promise((resolve, reject) => {
            // Load CSS
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = BASE_PATH + name + ".css";
            link.onerror = reject;
            document.head.appendChild(link);

            // Load JS
            const script = document.createElement("script");
            script.src = BASE_PATH + name + ".js";
            script.onload = () => {
                console.log(`✓ Loaded: ${name}.js`);
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Load modules sequentially
    async function loadAllModules() {
        try {
            for (const name of MODULES) {
                await loadModule(name);
            }
            console.log("✓ All customization modules loaded");
        } catch (error) {
            console.error("Error loading customization modules:", error);
        }
    }

    loadAllModules();
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
        setupCarouselNav();
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

    // ── Setup Carousel Navigation ───────────
    function setupCarouselNav() {
        const prevBtn = document.getElementById("sidebarPrev");
        const nextBtn = document.getElementById("sidebarNext");
        const sidebarNav = document.querySelector(".sidebar-nav");
        
        if (!prevBtn || !nextBtn || !sidebarNav) return;
        
        const scrollAmount = 200; // Pixels to scroll
        
        prevBtn.addEventListener("click", () => {
            sidebarNav.scrollBy({
                left: -scrollAmount,
                behavior: "smooth"
            });
        });
        
        nextBtn.addEventListener("click", () => {
            sidebarNav.scrollBy({
                left: scrollAmount,
                behavior: "smooth"
            });
        });
    }

    // ── Start ─────────────────────────────
    if (document.readyState === "loading")
        document.addEventListener("DOMContentLoaded", init);
    else init();
})();
