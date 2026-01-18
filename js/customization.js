/* ========================================
   CUSTOMIZATION OVERLAY SYSTEM
   ======================================== */

(function () {
    "use strict";

    // Storage keys
    const STORAGE_KEYS = {
        THEME: "customization-theme",
        ACCENT_COLOR: "customization-accent-color",
        FONT: "customization-font",
        COLOR_PRESETS: "customization-color-presets",
        SAVED_PRESETS: "customization-saved-presets",
        EMOJI_SETTINGS: "customization-emoji-settings",
        ICON_STYLE: "customization-icon-style",
        EMOJI_SIZE: "customization-emoji-size",
    };

    // Default color presets
    const DEFAULT_COLOR_PRESETS = ["#6196ff", "#ff6b6b", "#f59e0b", "#51d88a", "#a855f7"];

    // State
    let currentTheme = "light";
    let currentAccentColor = "#6196ff";
    let currentFont = "'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif";
    let colorPresets = [...DEFAULT_COLOR_PRESETS];
    let savedPresets = [];

    // Add example presets if there are no saved presets
    if (savedPresets.length === 0) {
        savedPresets = [
            {
                name: "Ocean Breeze",
                theme: "ocean",
                accentColor: "#4CB8FF",
                font: "'Poppins', sans-serif",
                timestamp: Date.now(),
            },
            {
                name: "Modern Dark",
                theme: "space",
                accentColor: "#A855F7",
                font: "'Inter', sans-serif",
                timestamp: Date.now(),
            },
            {
                name: "Forest Calm",
                theme: "forest",
                accentColor: "#4ADE80",
                font: "'DM Sans', sans-serif",
                timestamp: Date.now(),
            },
            {
                name: "Sunset Vibes",
                theme: "sunset",
                accentColor: "#FF8C65",
                font: "'Quicksand', sans-serif",
                timestamp: Date.now(),
            },
            {
                name: "Lavender Dreams",
                theme: "lavender",
                accentColor: "#9D85FF",
                font: "'Raleway', sans-serif",
                timestamp: Date.now(),
            },
            {
                name: "Midnight Code",
                theme: "midnight",
                accentColor: "#3B82F6",
                font: "'JetBrains Mono', monospace",
                timestamp: Date.now(),
            },
            {
                name: "Classic Light",
                theme: "light",
                accentColor: "#6196FF",
                font: "'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif",
                timestamp: Date.now(),
            },
            {
                name: "Roseo",
                theme: "rose",
                accentColor: "#C486FE",
                font: "'Space Grotesk', sans-serif",
                timestamp: Date.now(),
            },
        ];
    }

    // Google Fonts link element
    let googleFontsLink = null;

    // Initialize
    function init() {
        loadSettings();
        applySettings();
        setupEventListeners();
        renderColorPresets();
        renderSavedPresets();
        setupGoogleFonts();
        loadSavedCustomFonts();
        checkColorContrast();
    }

    // Load settings from localStorage
    function loadSettings() {
        currentTheme = localStorage.getItem(STORAGE_KEYS.THEME) || "light";
        currentAccentColor = localStorage.getItem(STORAGE_KEYS.ACCENT_COLOR) || "#6196ff";
        currentFont =
            localStorage.getItem(STORAGE_KEYS.FONT) ||
            "'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif";

        const savedColorPresets = localStorage.getItem(STORAGE_KEYS.COLOR_PRESETS);
        if (savedColorPresets) {
            try {
                colorPresets = JSON.parse(savedColorPresets);
            } catch (e) {
                colorPresets = [...DEFAULT_COLOR_PRESETS];
            }
        }

        const savedPresetsData = localStorage.getItem(STORAGE_KEYS.SAVED_PRESETS);
        if (savedPresetsData) {
            try {
                savedPresets = JSON.parse(savedPresetsData);
            } catch (e) {
                savedPresets = [];
            }
        }
    }

    // Apply settings
    function applySettings() {
        applyTheme(currentTheme);
        applyAccentColor(currentAccentColor);
        applyFont(currentFont);
        updateUISelections();
    }

    // Apply theme
    function applyTheme(theme) {
        currentTheme = theme;

        if (theme === "auto") {
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            theme = prefersDark ? "dark" : "light";
        }

        // Remove all theme attributes first
        document.body.removeAttribute("data-theme");

        if (theme === "space") {
            document.body.setAttribute("data-theme", "space");
            const root = document.documentElement;
            root.style.setProperty("--text-color", "#f0f0f0");
            root.style.setProperty("--bg-color", "#000000");
            root.style.setProperty("--card-bg", "#0a0a0a");
            root.style.setProperty("--border-color", "#1a1a1a");
            root.style.setProperty("--shadow-color", "rgba(0, 0, 0, 0.5)");
            root.style.setProperty("--highlight-color", "#1a1a1a");
            root.style.setProperty("--current-hour-color", "#1a3a5a");
            root.style.setProperty("--current-day-color", "#1a3a5a");
        } else if (theme === "midnight") {
            document.body.setAttribute("data-theme", "midnight");
            const root = document.documentElement;
            root.style.setProperty("--text-color", "#e8eaf0");
            root.style.setProperty("--bg-color", "#0f1419");
            root.style.setProperty("--card-bg", "#1a1f2e");
            root.style.setProperty("--border-color", "#2a2f3e");
            root.style.setProperty("--shadow-color", "rgba(0, 0, 0, 0.4)");
            root.style.setProperty("--highlight-color", "#252a3a");
            root.style.setProperty("--current-hour-color", "#2a4a6a");
            root.style.setProperty("--current-day-color", "#2a4a6a");
        } else if (theme === "sunset") {
            document.body.setAttribute("data-theme", "sunset");
            const root = document.documentElement;
            root.style.setProperty("--text-color", "#2d2d2d");
            root.style.setProperty("--bg-color", "#fff5f0");
            root.style.setProperty("--card-bg", "#ffe8dc");
            root.style.setProperty("--border-color", "#ffd4c0");
            root.style.setProperty("--shadow-color", "rgba(255, 140, 100, 0.15)");
            root.style.setProperty("--highlight-color", "#ffdcc8");
            root.style.setProperty("--current-hour-color", "#ffb89d");
            root.style.setProperty("--current-day-color", "#ffb89d");
        } else if (theme === "forest") {
            document.body.setAttribute("data-theme", "forest");
            const root = document.documentElement;
            root.style.setProperty("--text-color", "#e8f5e8");
            root.style.setProperty("--bg-color", "#0d1f12");
            root.style.setProperty("--card-bg", "#162820");
            root.style.setProperty("--border-color", "#1f3628");
            root.style.setProperty("--shadow-color", "rgba(0, 0, 0, 0.4)");
            root.style.setProperty("--highlight-color", "#1f3628");
            root.style.setProperty("--current-hour-color", "#2d5a3d");
            root.style.setProperty("--current-day-color", "#2d5a3d");
        } else if (theme === "ocean") {
            document.body.setAttribute("data-theme", "ocean");
            const root = document.documentElement;
            root.style.setProperty("--text-color", "#e8f4f8");
            root.style.setProperty("--bg-color", "#0a1929");
            root.style.setProperty("--card-bg", "#132f4c");
            root.style.setProperty("--border-color", "#1e4976");
            root.style.setProperty("--shadow-color", "rgba(0, 0, 0, 0.4)");
            root.style.setProperty("--highlight-color", "#1a3a5a");
            root.style.setProperty("--current-hour-color", "#2a5a8a");
            root.style.setProperty("--current-day-color", "#2a5a8a");
        } else if (theme === "lavender") {
            document.body.setAttribute("data-theme", "lavender");
            const root = document.documentElement;
            root.style.setProperty("--text-color", "#2d2d2d");
            root.style.setProperty("--bg-color", "#f8f5ff");
            root.style.setProperty("--card-bg", "#f0e8ff");
            root.style.setProperty("--border-color", "#e0d4ff");
            root.style.setProperty("--shadow-color", "rgba(160, 120, 255, 0.15)");
            root.style.setProperty("--highlight-color", "#e8dcff");
            root.style.setProperty("--current-hour-color", "#c8b0ff");
            root.style.setProperty("--current-day-color", "#c8b0ff");
        } else if (theme === "dark") {
            document.body.setAttribute("data-theme", "dark");
            const root = document.documentElement;
            root.style.setProperty("--text-color", "#f0f0f0");
            root.style.setProperty("--bg-color", "#1a1a1a");
            root.style.setProperty("--card-bg", "#2d2d2d");
            root.style.setProperty("--border-color", "#3d3d3d");
            root.style.setProperty("--shadow-color", "rgba(0, 0, 0, 0.3)");
            root.style.setProperty("--highlight-color", "#424242");
            root.style.setProperty("--current-hour-color", "#2a527a");
            root.style.setProperty("--current-day-color", "#2a527a");
        } else if (theme === "light") {
            document.body.setAttribute("data-theme", "light");
            const root = document.documentElement;
            root.style.setProperty("--text-color", "#2d2d2d");
            root.style.setProperty("--bg-color", "#ffffff");
            root.style.setProperty("--card-bg", "#f5f5f5");
            root.style.setProperty("--border-color", "#e0e0e0");
            root.style.setProperty("--shadow-color", "rgba(0, 0, 0, 0.1)");
            root.style.setProperty("--highlight-color", "#e0e0e0");
            root.style.setProperty("--current-hour-color", "#a0c4ff");
            root.style.setProperty("--current-day-color", "#a0c4ff");
        } else if (theme === "rose") {
            document.body.setAttribute("data-theme", "rose");
            const root = document.documentElement;
            root.style.setProperty("--text-color", "#f8d3e8");
            root.style.setProperty("--bg-color", "#3f0f1f");
            root.style.setProperty("--card-bg", "#5c2a3e");
            root.style.setProperty("--border-color", "#7a4b5f");
            root.style.setProperty("--shadow-color", "rgba(0, 0, 0, 0.4)");
            root.style.setProperty("--highlight-color", "#9c6b8f");
            root.style.setProperty("--current-hour-color", "#b58caa");
            root.style.setProperty("--current-day-color", "#b58caa");
        }

        localStorage.setItem(STORAGE_KEYS.THEME, currentTheme);
        updateFavicon(currentAccentColor);
        checkColorContrast();
    }

    // Color contrast warning system
    function checkColorContrast() {
        const warningEl = document.getElementById("contrastWarning");
        if (!warningEl) return;

        const lightness = getColorLightness(currentAccentColor);
        const isLightTheme =
            ["light", "sunset", "lavender"].includes(currentTheme) ||
            (currentTheme === "auto" && !window.matchMedia("(prefers-color-scheme: dark)").matches);
        const isDarkTheme =
            ["dark", "space", "midnight", "forest", "ocean"].includes(currentTheme) ||
            (currentTheme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);

        let showWarning = false;
        let warningMessage = "";

        if (isLightTheme && lightness > 85) {
            showWarning = true;
            warningMessage =
                '<i class="fa-solid fa-triangle-exclamation"></i> This accent color may be too light for Light theme. Consider a darker shade for better visibility.';
        } else if (isDarkTheme && lightness < 25) {
            showWarning = true;
            warningMessage =
                '<i class="fa-solid fa-triangle-exclamation"></i> This accent color may be too dark for Dark theme. Consider a lighter shade for better visibility.';
        }

        if (showWarning) {
            warningEl.innerHTML = warningMessage;
            warningEl.style.display = "block";
        } else {
            warningEl.style.display = "none";
        }
    }

    function getColorLightness(hex) {
        // Convert hex to RGB
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);

        // Calculate relative luminance
        const [rs, gs, bs] = [r, g, b].map((c) => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });

        const luminance = 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
        return luminance * 100;
    }

    // Apply accent color
    function applyAccentColor(color) {
        currentAccentColor = color;
        document.documentElement.style.setProperty("--accent-color", color);
        localStorage.setItem(STORAGE_KEYS.ACCENT_COLOR, color);
        updateFavicon(color);

        const colorPicker = document.getElementById("customColorPicker");
        const hexInput = document.getElementById("colorHexInput");
        if (colorPicker) colorPicker.value = color;
        if (hexInput) hexInput.value = color.toUpperCase();

        const oldColorPicker = document.getElementById("accentColorPicker");
        if (oldColorPicker) oldColorPicker.value = color;

        // Update button text color based on background
        updateButtonTextColors();
        checkColorContrast();
    }

    // Update text colors for better contrast
    function updateButtonTextColors() {
        const lightness = getColorLightness(currentAccentColor);
        const addPresetBtn = document.getElementById("addColorPreset");

        if (addPresetBtn) {
            if (lightness > 60) {
                addPresetBtn.style.color = "#000000";
            } else {
                addPresetBtn.style.color = "#ffffff";
            }
        }

        const randomColorBtn = document.getElementById("randomColorBtn");
        if (randomColorBtn) {
            if (lightness > 60) {
                randomColorBtn.style.color = "#000000";
            } else {
                randomColorBtn.style.color = "#ffffff";
            }
        }

        // Update all preset items
        document.querySelectorAll(".preset-item").forEach((item) => {
            const color = item.dataset.color;
            const deleteBtn = item.querySelector(".preset-delete");
            if (deleteBtn) {
                const itemLightness = getColorLightness(color);
                deleteBtn.style.color = itemLightness > 60 ? "#000000" : "#ffffff";
            }
        });
    }

    // Apply font
    function applyFont(font) {
        currentFont = font;
        document.documentElement.style.setProperty("--font-family", font);
        document.body.style.fontFamily = font;
        localStorage.setItem(STORAGE_KEYS.FONT, font);

        // Update preview
        const preview = document.getElementById("fontPreview");
        if (preview) preview.style.fontFamily = font;

        // Load Google Font if needed
        loadGoogleFont(font);
    }

    // Update UI selections
    function updateUISelections() {
        // Theme cards
        document.querySelectorAll(".theme-card").forEach((card) => {
            card.classList.toggle("active", card.dataset.theme === currentTheme);
        });

        // Font select
        const fontSelect = document.getElementById("fontSelect");
        if (fontSelect) fontSelect.value = currentFont;

        // Color presets
        document.querySelectorAll(".preset-item").forEach((item) => {
            item.classList.toggle("active", item.dataset.color === currentAccentColor);
        });
    }

    // Setup Google Fonts
    function setupGoogleFonts() {
        if (!googleFontsLink) {
            googleFontsLink = document.createElement("link");
            googleFontsLink.rel = "stylesheet";
            googleFontsLink.href =
                "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Roboto:wght@400;500;700&family=Open+Sans:wght@400;600;700&family=Lato:wght@400;700&family=Montserrat:wght@400;600;700&family=Poppins:wght@400;600;700&family=Raleway:wght@400;600;700&family=Ubuntu:wght@400;500;700&family=Nunito:wght@400;600;700&family=Quicksand:wght@400;600;700&family=Outfit:wght@400;600;700&family=DM+Sans:wght@400;500;700&family=Space+Grotesk:wght@400;600;700&family=Merriweather:wght@400;700&family=Playfair+Display:wght@400;700&family=JetBrains+Mono:wght@400;600&family=Fira+Code:wght@400;600&display=swap";
            document.head.appendChild(googleFontsLink);
        }
    }

    // Load specific Google Font
    function loadGoogleFont(fontFamily) {
        // Extract font name
        const match = fontFamily.match(/'([^']+)'/);
        if (!match) return;

        const fontName = match[1];
        const googleFonts = [
            "Inter",
            "Roboto",
            "Open Sans",
            "Lato",
            "Montserrat",
            "Poppins",
            "Raleway",
            "Ubuntu",
            "Nunito",
            "Quicksand",
            "Outfit",
            "DM Sans",
            "Space Grotesk",
            "Merriweather",
            "Playfair Display",
            "JetBrains Mono",
            "Fira Code",
        ];

        if (googleFonts.includes(fontName)) {
            // Font is already loaded via setupGoogleFonts
            return;
        }
    }

    // Render color presets
    function renderColorPresets() {
        const grid = document.getElementById("colorPresetsGrid");
        if (!grid) return;

        grid.innerHTML = "";
        colorPresets.forEach((color) => {
            const item = document.createElement("div");
            item.className = "preset-item";
            item.dataset.color = color;
            item.style.background = color;
            if (color === currentAccentColor) item.classList.add("active");

            const lightness = getColorLightness(color);
            const deleteBtn = document.createElement("button");
            deleteBtn.className = "preset-delete";
            deleteBtn.dataset.color = color;
            deleteBtn.textContent = "✖️";
            deleteBtn.style.color = lightness > 60 ? "#000000" : "#ffffff";
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteColorPreset(color);
            };

            item.appendChild(deleteBtn);
            item.onclick = () => applyAccentColor(color);

            grid.appendChild(item);
        });

        localStorage.setItem(STORAGE_KEYS.COLOR_PRESETS, JSON.stringify(colorPresets));
    }

    // Add color preset
    function addColorPreset(color) {
        if (!color || !/^#[0-9A-F]{6}$/i.test(color)) {
            alert("Please enter a valid hex color (e.g., #6196FF)");
            return;
        }

        if (colorPresets.includes(color.toLowerCase())) {
            alert("This color is already in your presets!");
            return;
        }

        colorPresets.push(color.toLowerCase());
        renderColorPresets();
    }

    // Delete color preset
    function deleteColorPreset(color) {
        if (colorPresets.length <= 1) {
            alert("You must keep at least one color preset!");
            return;
        }

        if (confirm("Delete this color preset?")) {
            colorPresets = colorPresets.filter((c) => c !== color);
            renderColorPresets();
        }
    }

    // Render saved presets
    function renderSavedPresets() {
        const grid = document.getElementById("savedPresetsGrid");
        if (!grid) return;

        if (savedPresets.length === 0) {
            grid.innerHTML =
                '<p style="text-align: center; opacity: 0.6; padding: 2rem;">No saved presets yet. Click "Save Current" to create one!</p>';
            return;
        }

        grid.innerHTML = "";
        savedPresets.forEach((preset, index) => {
            const card = document.createElement("div");
            card.className = "preset-card";

            const isActive =
                preset.theme === currentTheme &&
                preset.accentColor === currentAccentColor &&
                preset.font === currentFont;
            if (isActive) card.classList.add("active");

            card.innerHTML = `
                <div class="preset-card-header">
                    <div class="preset-card-name">${preset.name}</div>
                    <div class="preset-card-actions">
                        <button class="preset-card-btn delete" onclick="deletePreset(${index})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="preset-card-details">
                    <div class="preset-detail">
                        <span class="preset-color-dot" style="background: ${
                            preset.accentColor
                        };"></span>
                        <span>${getThemeLabel(preset.theme)}</span>
                    </div>
                    <div class="preset-detail">
                        <i class="fa-solid fa-font" style="width: 16px; color: var(--accent-color);"></i>
                        <span>${getFontLabel(preset.font)}</span>
                    </div>
                </div>
            `;

            card.onclick = () => applyPreset(preset);
            grid.appendChild(card);
        });

        localStorage.setItem(STORAGE_KEYS.SAVED_PRESETS, JSON.stringify(savedPresets));
    }

    // Get theme label
    function getThemeLabel(theme) {
        const labels = {
            light: "☀️ Light",
            dark: "🌙 Dark",
            auto: "🌤️ Auto",
            space: "🌌 Space",
            midnight: "🌃 Midnight",
            sunset: "🌇 Sunset",
            forest: "🌳 Forest",
            ocean: "🌊 Ocean",
            lavender: "🌸 Lavender",
            rose: "🌹 Rose",
            amber: "🌅 Amber",
            demonic_red: "🔥 Demonic Red",
            cyberpunk: "🤖 Cyberpunk",
        };
        return labels[theme] || theme;
    }

    // Get font label
    function getFontLabel(font) {
        const match = font.match(/'([^']+)'/);
        return match ? match[1] : "Default";
    }

    // Save current preset
    function saveCurrentPreset() {
        const name = prompt("Enter a name for this preset:");
        if (!name) return;

        const preset = {
            name: name.trim(),
            theme: currentTheme,
            accentColor: currentAccentColor,
            font: currentFont,
            timestamp: Date.now(),
        };

        savedPresets.push(preset);
        renderSavedPresets();
    }

    // Apply preset
    function applyPreset(preset) {
        applyTheme(preset.theme);
        applyAccentColor(preset.accentColor);
        applyFont(preset.font);
        updateUISelections();
    }

    // Delete preset
    window.deletePreset = function (index) {
        if (confirm("Delete this preset?")) {
            savedPresets.splice(index, 1);
            renderSavedPresets();
        }
    };

    // Export presets
    function exportPresets() {
        const data = {
            theme: currentTheme,
            accentColor: currentAccentColor,
            font: currentFont,
            colorPresets: colorPresets,
            savedPresets: savedPresets,
            exportDate: new Date().toISOString(),
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `orar-customization-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Import presets
    function importPresets(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                if (data.theme) applyTheme(data.theme);
                if (data.accentColor) applyAccentColor(data.accentColor);
                if (data.font) applyFont(data.font);
                if (data.colorPresets) {
                    colorPresets = data.colorPresets;
                    renderColorPresets();
                }
                if (data.savedPresets) {
                    savedPresets = data.savedPresets;
                    renderSavedPresets();
                }

                updateUISelections();
                alert("Settings imported successfully!");
            } catch (err) {
                alert("Error importing settings. Please check the file format.");
            }
        };
        reader.readAsText(file);
    }

    // Setup event listeners
    function setupEventListeners() {
        // Overlay controls
        const customBtn = document.getElementById("customizationBtn");
        const overlay = document.getElementById("customizationOverlay");
        const closeBtn = document.getElementById("closeCustomization");

        if (customBtn) {
            customBtn.addEventListener("click", () => {
                overlay.classList.add("active");
                document.body.classList.add("no-scroll-custom");
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener("click", () => {
                overlay.classList.remove("active");
                document.body.classList.remove("no-scroll-custom");
            });
        }

        // Click outside to close
        if (overlay) {
            overlay.addEventListener("click", (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove("active");
                    document.body.classList.remove("no-scroll-custom");
                }
            });
        }

        // Sidebar navigation
        document.querySelectorAll(".sidebar-item").forEach((item) => {
            item.addEventListener("click", () => {
                const section = item.dataset.section;

                // Update active states
                document
                    .querySelectorAll(".sidebar-item")
                    .forEach((i) => i.classList.remove("active"));
                item.classList.add("active");

                document
                    .querySelectorAll(".custom-section")
                    .forEach((s) => s.classList.remove("active"));
                const targetSection = document.getElementById(section + "Section");
                if (targetSection) targetSection.classList.add("active");
            });
        });

        // Theme cards
        document.querySelectorAll(".theme-card").forEach((card) => {
            card.addEventListener("click", () => {
                const theme = card.dataset.theme;
                applyTheme(theme);
                updateUISelections();
            });
        });

        // Color picker
        const colorPicker = document.getElementById("customColorPicker");
        if (colorPicker) {
            colorPicker.addEventListener("input", (e) => {
                applyAccentColor(e.target.value);
            });
        }

        // Add randomize button listener
        const randomizeBtn = document.getElementById("randomColorBtn");
        if (randomizeBtn) {
            randomizeBtn.addEventListener("click", () => {
                const randomColor =
                    "#" +
                    Math.floor(Math.random() * 16777215)
                        .toString(16)
                        .padStart(6, "0");
                applyAccentColor(randomColor);
            });
        }

        // Hex input
        const hexInput = document.getElementById("colorHexInput");
        if (hexInput) {
            hexInput.addEventListener("change", (e) => {
                let color = e.target.value.trim();
                if (!color.startsWith("#")) color = "#" + color;
                if (/^#[0-9A-F]{6}$/i.test(color)) {
                    applyAccentColor(color);
                } else {
                    alert("Please enter a valid hex color");
                    e.target.value = currentAccentColor;
                }
            });
        }

        // Add preset button
        const addPresetBtn = document.getElementById("addColorPreset");
        if (addPresetBtn) {
            addPresetBtn.addEventListener("click", () => {
                addColorPreset(currentAccentColor);
            });
        }

        // Font select
        const fontSelect = document.getElementById("fontSelect");
        if (fontSelect) {
            fontSelect.addEventListener("change", (e) => {
                applyFont(e.target.value);
            });
        }

        // Preset actions
        const savePresetBtn = document.getElementById("savePresetBtn");
        if (savePresetBtn) {
            savePresetBtn.addEventListener("click", saveCurrentPreset);
        }

        const exportPresetBtn = document.getElementById("exportPresetBtn");
        if (exportPresetBtn) {
            exportPresetBtn.addEventListener("click", exportPresets);
        }

        const importPresetBtn = document.getElementById("importPresetBtn");
        const importPresetFile = document.getElementById("importPresetFile");
        if (importPresetBtn && importPresetFile) {
            importPresetBtn.addEventListener("click", () => {
                importPresetFile.click();
            });
            importPresetFile.addEventListener("change", (e) => {
                if (e.target.files[0]) {
                    importPresets(e.target.files[0]);
                    e.target.value = "";
                }
            });
        }

        // Auto theme listener
        window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
            if (currentTheme === "auto") {
                applyTheme("auto");
            }
        });
    }

    // Helper function for favicon
    function updateFavicon(accentColor) {
        const size = 16;
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
        ctx.fillStyle = accentColor;
        ctx.fill();
        const link = document.querySelector("link[rel~='icon']") || document.createElement("link");
        link.rel = "icon";
        link.type = "image/png";
        link.href = canvas.toDataURL("image/png");
        document.head.appendChild(link);
    }

    // Initialize when DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();

// ============ CUSTOM GOOGLE FONT ADDITION ============
function addCustomGoogleFont() {
    const fontName = prompt('Enter the Google Font name (e.g., "Oswald", "Bebas Neue"):');
    if (!fontName) return;

    const cleanName = fontName.trim();
    if (!cleanName) return;

    // Check if already exists
    const fontSelect = document.getElementById("fontSelect");
    const fontValue = `'${cleanName}', sans-serif`;

    const exists = Array.from(fontSelect.options).some((opt) => opt.value === fontValue);
    if (exists) {
        alert("This font is already in the list!");
        return;
    }

    // Load the font
    loadCustomGoogleFont(cleanName);

    // Add to select
    const option = document.createElement("option");
    option.value = fontValue;
    option.textContent = `${cleanName} (Custom)`;
    fontSelect.appendChild(option);

    // Apply it
    applyFont(fontValue);
    fontSelect.value = fontValue;

    // Save custom fonts
    const customFonts = JSON.parse(localStorage.getItem("custom-fonts") || "[]");
    if (!customFonts.includes(cleanName)) {
        customFonts.push(cleanName);
        localStorage.setItem("custom-fonts", JSON.stringify(customFonts));
    }
}

function loadCustomGoogleFont(fontName) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(
        / /g,
        "+"
    )}:wght@400;600;700&display=swap`;
    document.head.appendChild(link);
}

function loadSavedCustomFonts() {
    const customFonts = JSON.parse(localStorage.getItem("custom-fonts") || "[]");
    const fontSelect = document.getElementById("fontSelect");

    customFonts.forEach((fontName) => {
        loadCustomGoogleFont(fontName);
        const option = document.createElement("option");
        option.value = `'${fontName}', sans-serif`;
        option.textContent = `${fontName} (Custom)`;
        fontSelect.appendChild(option);
    });
}

// Add event listeners for custom font button
const addFontBtn = document.getElementById("addCustomFont");
if (addFontBtn) {
    addFontBtn.addEventListener("click", addCustomGoogleFont);
}

// Helper function for applyFont (exposed outside IIFE)
window.applyFont = function (font) {
    const fontSelect = document.getElementById("fontSelect");
    if (fontSelect) {
        fontSelect.value = font;
        fontSelect.dispatchEvent(new Event("change"));
    }
};