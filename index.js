/* --- HIGHLIGHT, FAVICON, SIDE MENU --- */

/* --- HIGHLIGHT LOGIC (structure-aware) --- */
function highlightCurrent() {
    const date = new Date();
    const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday...
    const currentHour = date.getHours();

    // Clear previous highlights
    document.querySelectorAll(".current-day, .current-hour, .current-cell").forEach((el) => {
        el.classList.remove("current-day", "current-hour", "current-cell");
    });

    // Only highlight on weekdays (Mon-Fri = 1-5)
    if (dayOfWeek < 1 || dayOfWeek > 5) return;

    const table = document.getElementById("timetable");
    if (!table) return;

    // Highlight day header (dayOfWeek matches column index)
    const headerRow = table.querySelector("thead tr");
    if (headerRow) {
        const headerCells = headerRow.querySelectorAll("th");
        if (headerCells[dayOfWeek]) {
            headerCells[dayOfWeek].classList.add("current-day");
        }
    }

    // Find and highlight current hour row and cell
    const rows = table.querySelectorAll("tbody tr, thead tr:not(:first-child)");
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const timeCell = row.cells[0];
        if (!timeCell) continue;

        // Extract hour from "HH:00" format
        const cellText = timeCell.textContent.trim();
        const cellHour = parseInt(cellText.split(":")[0]);

        if (cellHour === currentHour) {
            // Highlight time cell
            timeCell.classList.add("current-hour");

            // Highlight today's subject cell
            const subjectCell = row.cells[dayOfWeek];
            if (subjectCell) {
                subjectCell.classList.add("current-cell");
            }
            break;
        }
    }
}
/* Ensure subject cells (TD or TH) receive .subject and click behavior */
function setupSubjectHighlight() {
    const table = document.getElementById("timetable");
    if (!table) return;
    const rows = [...table.querySelectorAll("tr")];
    // skip header day-names row (first) but include rows that use TH for subjects
    rows.slice(1).forEach((row) => {
        const cells = [...row.children];
        // skip time column (first)
        cells.slice(1).forEach((cell) => {
            cell.classList.add("subject");
            // Don't add click handler here - the keyboard navigation handles highlighting
        });
    });
}

function startHighlightLoop() {
    highlightCurrent();
    setInterval(highlightCurrent, 2000);
}

// initialize
setupSubjectHighlight();
startHighlightLoop();

// SIDE MENU toggles (script at end of body; elements exist)
const sideMenu = document.getElementById("sideMenu");
const menuToggle = document.getElementById("menuToggle");
const menuIcon = document.getElementById("menuIcon");
const overlay = document.getElementById("overlay");

// Info overlay controls
const infoBtn = document.getElementById("infoBtn");
const infoOverlay = document.getElementById("infoOverlay");
const closeInfoOverlay = document.getElementById("closeInfoOverlay");

if (infoBtn) {
    infoBtn.addEventListener("click", () => {
        // close side menu if open for clarity
        if (sideMenu && sideMenu.classList.contains("open")) {
            sideMenu.classList.remove("open");
            menuIcon.classList.remove("fa-arrow-left");
            menuIcon.classList.add("fa-arrow-right");
        }
        if (manualsPopup && manualsPopup.classList.contains("active")) {
            // prefer to close manuals popup first if it's open
            manualsPopup.classList.remove("active");
        }
        if (infoOverlay) infoOverlay.classList.add("active");
        if (overlay) overlay.classList.add("active");
        document.body.style.overflow = "hidden";
    });
}

if (closeInfoOverlay) {
    closeInfoOverlay.addEventListener("click", () => {
        if (infoOverlay) infoOverlay.classList.remove("active");
        if (overlay) overlay.classList.remove("active");
        document.body.style.overflow = "";
        // update overlay state in case other elements need it
        try {
            updateOverlay();
        } catch (e) {}
    });
}

/* --- ALL MANUALS POPUP --- */
const allManualsBtn = document.getElementById("allManualsBtn");
const manualsPopup = document.getElementById("manualsPopup");
const closeManualsPopup = document.getElementById("closeManualsPopup");
const manualsPopupContent = document.getElementById("manualsPopupContent");

/* clonează manualele din secțiunea originală */
if (manualsPopupContent) {
    const manualsOriginal = document.getElementById("manuals");
    if (manualsOriginal) {
        manualsPopupContent.innerHTML = manualsOriginal.innerHTML;
    }
}

allManualsBtn &&
    allManualsBtn.addEventListener("click", () => {
        manualsPopup.classList.add("active");
        overlay.classList.add("active");
    });

closeManualsPopup &&
    closeManualsPopup.addEventListener("click", () => {
        manualsPopup.classList.remove("active");
        overlay.classList.remove("active");
    });

// --- RECOMMENDED MANUAL (reworked) ---
function normalizeText(s = "") {
    // remove HTML tags, remove emojis / non-letters (keep letters and spaces), remove diacritics, lowercase
    const stripped = s.replace(/<[^>]*>/g, "");
    // keep letters and spaces (Unicode letters), remove other symbols/emojis
    const lettersOnly = stripped.replace(/[^\p{L}\s]/gu, " ");
    // remove diacritics
    const noDiacritics = lettersOnly.normalize("NFD").replace(/\p{Diacritic}/gu, "");
    return noDiacritics.toLowerCase().replace(/\s+/g, " ").trim();
}

function findBestManualForSubject(subjectText) {
    const subjectNorm = normalizeText(subjectText);
    // search in several possible locations (popup content, a global #manuals list, fallback)
    const containers = [
        ...document.querySelectorAll("#manualsPopupContent .container"),
        ...document.querySelectorAll("#manuals .container"),
        ...document.querySelectorAll(".manuals-popup .container"),
    ];

    let best = null;
    let bestScore = 0;

    containers.forEach((cont) => {
        const titleEl = cont.querySelector("h2");
        const aEl = cont.querySelector("a");
        if (!titleEl) return;
        const titleNorm = normalizeText(titleEl.textContent || "");
        // quick checks
        if (!titleNorm) return;
        // scoring: shared tokens
        const titleTokens = titleNorm.split(" ").filter(Boolean);
        const subjTokens = subjectNorm.split(" ").filter(Boolean);
        let score = 0;
        titleTokens.forEach((t) => {
            if (subjTokens.includes(t)) score += 2;
            else if (subjectNorm.includes(t)) score += 1;
        });
        // also boost if title contains most of subject or vice-versa
        if (titleNorm === subjectNorm) score += 5;
        if (subjectNorm.includes(titleNorm) || titleNorm.includes(subjectNorm)) score += 3;

        if (score > bestScore) {
            bestScore = score;
            best = {
                container: cont,
                title: titleEl.textContent || "",
                link: aEl ? aEl.href : null,
                img: cont.querySelector("img"),
            };
        }
    });

    return best;
}

function parseTimeCellToDate(timeStr, referenceDate) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const date = new Date(referenceDate);
    date.setHours(hours, minutes || 0, 0, 0);
    return date;
}

function updateRecommendedManual() {
    const now = new Date();
    let day = now.getDay(); // 0..6 (0=Sun)
    // our table columns are Mon..Fri at indices 1..5; if weekend -> no recommended manual
    if (day === 0 || day === 6) {
        // show none
        const rec = document.querySelector("#recommendedManual .manual-card");
        if (rec) rec.innerHTML = "<p>No textbook available</p>";
        return;
    }
    // find timetable rows
    const timetable = document.getElementById("timetable");
    if (!timetable) return;
    const rows = [...timetable.querySelectorAll("tr")].slice(1); // skip header row
    const colIndex = day; // 1..5 -> matches children index in row

    // find any class whose window contains "now"
    let matchedSubject = null;
    for (const row of rows) {
        const timeCell = row.children[0];
        if (!timeCell) continue;
        const classStart = parseTimeCellToDate(timeCell.textContent || "", now);
        if (!classStart) continue;
        // window: start -10min .. start + 50min
        const windowStart = new Date(classStart.getTime() - 10 * 60 * 1000);
        const windowEnd = new Date(classStart.getTime() + 50 * 60 * 1000);
        if (now >= windowStart && now < windowEnd) {
            const subjectCell = row.children[colIndex];
            if (subjectCell) {
                matchedSubject = subjectCell.textContent || subjectCell.innerText || "";
                break;
            }
        }
    }

    const recManualEl = document.querySelector("#recommendedManual .manual-card");
    if (!recManualEl) return;

    // Clear previous
    recManualEl.innerHTML = "";
    recManualEl.onclick = null;

    if (!matchedSubject) {
        recManualEl.innerHTML = "<p>No textbook available</p>";
        return;
    }

    // find best manual
    const best = findBestManualForSubject(matchedSubject);
    if (!best) {
        // fallback: show subject text
        const p = document.createElement("p");
        p.textContent = matchedSubject.trim() || "No textbook available";
        recManualEl.appendChild(p);
        return;
    }

    // populate recManualEl with image + title and click opens manual
    if (best.img) {
        const cloned = best.img.cloneNode(true);
        cloned.style.width = "100%";
        cloned.style.borderRadius = "0.5rem";
        recManualEl.appendChild(cloned);
    }
    const p = document.createElement("p");
    p.textContent = best.title;
    recManualEl.appendChild(p);

    if (best.link) {
        recManualEl.style.cursor = "pointer";
        recManualEl.onclick = () => window.open(best.link, "_blank");
    } else {
        recManualEl.onclick = null;
    }
}

// run immediately and more often (every 15s) to catch the -10min window precisely
updateRecommendedManual();
setInterval(updateRecommendedManual, 15000);

// All manuals popup
allManualsBtn &&
    allManualsBtn.addEventListener("click", () => {
        manualsPopup.classList.add("active");
        overlay.classList.add("active");
        document.body.style.overflow = "hidden";

        // Închide meniul lateral dacă e deschis
        if (sideMenu.classList.contains("open")) {
            sideMenu.classList.remove("open");
            menuIcon.classList.remove("fa-arrow-left");
            menuIcon.classList.add("fa-arrow-right");
        }
    });

closeManualsPopup &&
    closeManualsPopup.addEventListener("click", () => {
        manualsPopup.classList.remove("active");
        overlay.classList.remove("active");
        document.body.style.overflow = "";
    });

// Search bar logic
const manualSearch = document.getElementById("manualSearch");
manualSearch &&
    manualSearch.addEventListener("input", () => {
        const term = manualSearch.value.toLowerCase();
        const manuals = manualsPopupContent.querySelectorAll(".container");
        manuals.forEach((container) => {
            const title = container.querySelector("h2").textContent.toLowerCase();
            if (title.includes(term)) {
                container.style.display = "";
            } else {
                container.style.display = "none";
            }
        });
    });

function updateOverlay() {
    const isSideOpen = sideMenu && sideMenu.classList.contains("open");
    const isManualsOpen = manualsPopup && manualsPopup.classList.contains("active");
    const isInfoOpen = infoOverlay && infoOverlay.classList.contains("active");
    const isWeatherOpen = weatherOverlay && weatherOverlay.classList.contains("active");

    if (isSideOpen || isManualsOpen || isInfoOpen || isWeatherOpen) overlay.classList.add("active");
    else overlay.classList.remove("active");
}

// MENU TOGGLE (folosește updateOverlay în loc de toggle direct)
if (menuToggle) {
    menuToggle.addEventListener("click", () => {
        // Prevent opening the side menu while the manuals popup is open
        if (manualsPopup && manualsPopup.classList.contains("active")) return;

        const isOpen = sideMenu.classList.toggle("open");
        // AsigurÃ„Æ’m overlay-ul cÃƒÂ¢nd se deschide meniul; la ÃƒÂ®nchidere, updateOverlay decide
        updateOverlay();

        if (isOpen) {
            menuIcon.classList.remove("fa-arrow-right");
            menuIcon.classList.add("fa-arrow-left");
        } else {
            menuIcon.classList.remove("fa-arrow-left");
            menuIcon.classList.add("fa-arrow-right");
        }
    });
}

// OVERLAY click: close top-most (info -> manuals -> side menu)
if (overlay) {
    overlay.addEventListener("click", () => {
        // Close weather overlay first if open
        if (weatherOverlay && weatherOverlay.classList.contains("active")) {
            weatherOverlay.classList.remove("active");
            document.body.style.overflow = "";
        }
        // Close info overlay
        else if (infoOverlay && infoOverlay.classList.contains("active")) {
            infoOverlay.classList.remove("active");
            document.body.style.overflow = "";
        }
        // Then manuals popup
        else if (manualsPopup && manualsPopup.classList.contains("active")) {
            manualsPopup.classList.remove("active");
            document.body.style.overflow = "";
        }
        // Then side menu
        else if (sideMenu && sideMenu.classList.contains("open")) {
            sideMenu.classList.remove("open");
            menuIcon.classList.remove("fa-arrow-left");
            menuIcon.classList.add("fa-arrow-right");
        }
        // Update overlay state
        updateOverlay();
    });
}

// --- CLOCK OVERLAY ---
const clockBtn = document.getElementById("clockBtn");
const timeOverlay = document.getElementById("timeOverlay");
const closeOverlay = document.getElementById("closeOverlay");
const timeEl = document.getElementById("time");
const dateEl = document.getElementById("date");

function updateClock() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    const options = { weekday: "long", month: "long", day: "numeric", year: "numeric" };
    const dateStr = now.toLocaleDateString(undefined, options);
    timeEl.textContent = `${hours}:${minutes}:${seconds}`;
    dateEl.textContent = dateStr;
}

clockBtn.addEventListener("click", () => {
    timeOverlay.classList.add("active");
    document.body.classList.add("no-scroll");
    updateClock();
});

closeOverlay.addEventListener("click", () => {
    timeOverlay.classList.remove("active");
    document.body.classList.remove("no-scroll");
});

setInterval(updateClock, 1000);

// Prevent zoom on double tap (iOS)
let lastTouchEnd = 0;
document.addEventListener(
    "touchend",
    (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    },
    { passive: false }
);

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
        localStorage.setItem(STORAGE_KEYS.SAVED_PRESETS, JSON.stringify(savedPresets));
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
        loadSavedCustomFonts(); // NEW
        checkColorContrast(); // NEW
        setupEmojiIconListeners(); // Set up event listeners
        initializeEmojiIconUI(); // Initialize UI state
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
        } else if (theme === "demonic-red") {
            document.body.setAttribute("data-theme", "demonic-red");
            const root = document.documentElement;
            root.style.setProperty("--text-color", "#ffe5e5");
            root.style.setProperty("--bg-color", "#330000");
            root.style.setProperty("--card-bg", "#4d0000");
            root.style.setProperty("--border-color", "#660000");
            root.style.setProperty("--shadow-color", "rgba(0, 0, 0, 0.4)");
            root.style.setProperty("--highlight-color", "#800000");
            root.style.setProperty("--current-hour-color", "#b30000");
            root.style.setProperty("--current-day-color", "#b30000");
        } else if (theme === "sandy-shores") {
            document.body.setAttribute("data-theme", "sandy-shores");
            const root = document.documentElement;
            root.style.setProperty("--text-color", "#403000");
            root.style.setProperty("--bg-color", "#fff8e1");
            root.style.setProperty("--card-bg", "#ffecb3");
            root.style.setProperty("--border-color", "#ffe082");
            root.style.setProperty("--shadow-color", "rgba(255, 193, 7, 0.15)");
            root.style.setProperty("--highlight-color", "#ffda65");
            root.style.setProperty("--current-hour-color", "#ffca28");
            root.style.setProperty("--current-day-color", "#ffca28");
        } else if (theme === "burnt-charcoal") {
            document.body.setAttribute("data-theme", "burnt-charcoal");
            const root = document.documentElement;
            root.style.setProperty("--text-color", "#ffffff");
            root.style.setProperty("--bg-color", "#2c2c2c");
            root.style.setProperty("--card-bg", "#3d3d3d");
            root.style.setProperty("--border-color", "#333333");
            root.style.setProperty("--shadow-color", "rgba(0, 0, 0, 0.3)");
            root.style.setProperty("--highlight-color", "#444444");
            root.style.setProperty("--current-hour-color", "#555555");
            root.style.setProperty("--current-day-color", "#555555");
        }

        localStorage.setItem(STORAGE_KEYS.THEME, currentTheme);
        updateFavicon(currentAccentColor);
        checkColorContrast(); // NEW: Check contrast after theme change
    }

    // ============ NEW: Color contrast warning system ============
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

        // NEW: Update button text color based on background
        updateButtonTextColors();
        checkColorContrast(); // NEW: Check contrast
    }

    // NEW: Update text colors for better contrast
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
            const itemLightness = getColorLightness(color);
            const deleteBtn = item.querySelector(".preset-delete");
            if (deleteBtn && itemLightness > 60) {
                deleteBtn.style.color = "#000000";
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
            // NEW: Set text color based on background lightness
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

    // Initialize when DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();

// ============ NEW: Custom Google Font Addition ============
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

// ============ UPDATE: Add these to setupEventListeners ============
// Add after font select listener:
const addFontBtn = document.getElementById("addCustomFont");
if (addFontBtn) {
    addFontBtn.addEventListener("click", addCustomGoogleFont);
}

// ============ UPDATE: Call in init function ============
// Add to init() function:
function init() {
    loadSettings();
    applySettings();
    setupEventListeners();
    renderColorPresets();
    renderSavedPresets();
    setupGoogleFonts();
    loadSavedCustomFonts(); // NEW
    checkColorContrast(); // NEW
}

// ============ UPDATE: renderColorPresets for text color fix ============
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
        // NEW: Set text color based on background lightness
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

// Collapsible Release Notes: wrap details into .release-body and toggle open/close.
// Single-open behavior: opening one closes others. Adds keyboard support (Enter/Space).
(function initReleaseNotesCollapsible() {
    const notes = document.querySelectorAll(".release-note");
    if (!notes || notes.length === 0) return;

    notes.forEach((note) => {
        const header = note.querySelector(".release-header");
        if (!header) return;

        // If not already created, move everything after header into .release-body
        if (!note.querySelector(".release-body")) {
            const body = document.createElement("div");
            body.className = "release-body";

            // Move subsequent siblings into body
            let sibling = header.nextElementSibling;
            while (sibling) {
                const next = sibling.nextElementSibling;
                body.appendChild(sibling);
                sibling = next;
            }
            note.appendChild(body);
        }

        // Accessibility: make header focusable
        header.setAttribute("tabindex", "0");
        header.setAttribute("role", "button");
        header.setAttribute("aria-expanded", note.classList.contains("open") ? "true" : "false");

        function closeOtherNotes() {
            document.querySelectorAll(".release-note.open").forEach((n) => {
                if (n !== note) {
                    n.classList.remove("open");
                    const h = n.querySelector(".release-header");
                    if (h) h.setAttribute("aria-expanded", "false");
                }
            });
        }

        function toggleNote() {
            const isOpen = note.classList.contains("open");
            if (isOpen) {
                note.classList.remove("open");
                header.setAttribute("aria-expanded", "false");
            } else {
                closeOtherNotes();
                note.classList.add("open");
                header.setAttribute("aria-expanded", "true");
            }
        }

        header.addEventListener("click", (e) => {
            // avoid toggling when clicking action buttons inside header (if any)
            if (e.target.closest(".preset-card-actions, .preset-card-btn, .close-btn, .fa-trash"))
                return;
            toggleNote();
        });

        header.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleNote();
            } else if (e.key === "Escape") {
                note.classList.remove("open");
                header.setAttribute("aria-expanded", "false");
            }
        });
    });
})();

// Advanced To-Do List System
(function () {
    const STORAGE_KEY = "advanced-todo-tasks";
    const CATEGORIES_KEY = "todo-categories";
    const NOTIFIED_KEY = "notified-tasks";

    let tasks = [];
    let categories = [];
    let notifiedTasks = new Set();
    let currentFilter = "all";
    let currentSort = [
        { field: "priority", order: "asc" },
        { field: "difficulty", order: "asc" },
        { field: "created", order: "desc" },
    ];
    let editingTaskId = null;
    let currentPriority = "medium";
    let currentDifficulty = "medium";

    // Request notification permission on desktop
    if (
        "Notification" in window &&
        Notification.permission === "default" &&
        window.innerWidth > 768
    ) {
        Notification.requestPermission();
    }

    // Load data
    function loadData() {
        const storedTasks = localStorage.getItem(STORAGE_KEY);
        const storedCategories = localStorage.getItem(CATEGORIES_KEY);
        const storedNotified = localStorage.getItem(NOTIFIED_KEY);

        tasks = storedTasks ? JSON.parse(storedTasks) : [];
        categories = storedCategories
            ? JSON.parse(storedCategories)
            : ["Work", "Personal", "Shopping"];
        notifiedTasks = storedNotified ? new Set(JSON.parse(storedNotified)) : new Set();
    }

    // Save data
    function saveData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
        localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...notifiedTasks]));
    }

    // Generate ID
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Update statistics
    function updateStats() {
        const total = tasks.length;
        const completed = tasks.filter((t) => t.completed).length;
        const pending = total - completed;

        document.getElementById("totalTasks").textContent = total;
        document.getElementById("completedTasks").textContent = completed;
        document.getElementById("pendingTasks").textContent = pending;
    }

    // Sort tasks with multiple criteria
    function sortTasks(tasksToSort) {
        const sorted = [...tasksToSort];

        const priorityOrder = {
            "very-high": 0,
            high: 1,
            medium: 2,
            low: 3,
            "very-low": 4,
        };

        const difficultyOrder = {
            "very-easy": 0,
            easy: 1,
            medium: 2,
            hard: 3,
            "very-hard": 4,
        };

        sorted.sort((a, b) => {
            for (const sortCriteria of currentSort) {
                let comparison = 0;

                switch (sortCriteria.field) {
                    case "priority":
                        comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
                        break;
                    case "difficulty":
                        comparison =
                            difficultyOrder[a.difficulty || "medium"] -
                            difficultyOrder[b.difficulty || "medium"];
                        break;
                    case "name":
                        comparison = a.text.localeCompare(b.text);
                        break;
                    case "created":
                        comparison = new Date(b.createdAt) - new Date(a.createdAt);
                        break;
                    case "deadline":
                        if (!a.dueDate && !b.dueDate) comparison = 0;
                        else if (!a.dueDate) comparison = 1;
                        else if (!b.dueDate) comparison = -1;
                        else comparison = new Date(a.dueDate) - new Date(b.dueDate);
                        break;
                    case "category":
                        comparison = (a.category || "").localeCompare(b.category || "");
                        break;
                }

                if (sortCriteria.order === "desc") {
                    comparison = -comparison;
                }

                if (comparison !== 0) {
                    return comparison;
                }
            }
            return 0;
        });

        return sorted;
    }

    // Update sort display
    function updateSortDisplay() {
        document.querySelectorAll(".sort-criteria-item").forEach((item, index) => {
            if (index < currentSort.length) {
                const criteria = currentSort[index];
                const label = item.querySelector(".sort-field-label");
                const select = item.querySelector(".sort-field-select");
                const orderBtn = item.querySelector(".sort-order-btn");

                label.textContent = `Sort ${index + 1}:`;
                select.value = criteria.field;
                orderBtn.innerHTML =
                    criteria.order === "asc"
                        ? '<i class="fa-solid fa-arrow-up"></i>'
                        : '<i class="fa-solid fa-arrow-down"></i>';
                orderBtn.dataset.order = criteria.order;
                item.style.display = "flex";
            } else {
                item.style.display = "none";
            }
        });
    }

    // Render tasks
    function renderTasks() {
        const container = document.getElementById("todoListContainer");
        let filteredTasks = tasks;

        // Apply filters
        if (currentFilter === "pending") {
            filteredTasks = tasks.filter((t) => !t.completed);
        } else if (currentFilter === "completed") {
            filteredTasks = tasks.filter((t) => t.completed);
        } else if (["very-high", "high", "medium", "low", "very-low"].includes(currentFilter)) {
            filteredTasks = tasks.filter((t) => t.priority === currentFilter);
        }

        // Sort tasks
        filteredTasks = sortTasks(filteredTasks);

        if (filteredTasks.length === 0) {
            container.innerHTML =
                '<div class="no-todos">No tasks found. Try a different filter!</div>';
            return;
        }

        container.innerHTML = filteredTasks
            .map((task) => {
                const dueText = task.dueDate
                    ? `<i class="fas fa-calendar-alt"></i> ${new Date(task.dueDate).toLocaleString(
                          "en-US",
                          {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                          }
                      )}`
                    : "";

                const isOverdue =
                    task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;

                const difficultyLabel = task.difficulty || "medium";
                const difficultyIcon =
                    {
                        "very-easy": "🟢",
                        easy: "🟡",
                        medium: "🟠",
                        hard: "🔴",
                        "very-hard": "⚫",
                    }[difficultyLabel] || "🟠";

                return `
                    <div class="todo-item-new priority-${
                        task.priority
                    } difficulty-${difficultyLabel} ${task.completed ? "completed" : ""}" 
                         data-id="${task.id}">
                        <input type="checkbox" class="todo-checkbox" ${
                            task.completed ? "checked" : ""
                        }>
                        <div class="todo-content">
                            <div class="todo-text">${task.text}</div>
                            ${
                                task.description
                                    ? `<div class="todo-description">${task.description}</div>`
                                    : ""
                            }
                            <div class="todo-meta">
                                <span class="todo-priority-badge ${task.priority}">${task.priority
                    .toUpperCase()
                    .replace("-", " ")}</span>
                                <span class="todo-difficulty-badge ${difficultyLabel}">${difficultyIcon} ${difficultyLabel
                    .toUpperCase()
                    .replace("-", " ")}</span>
                                ${
                                    task.category
                                        ? `<span class="todo-category-badge">${task.category}</span>`
                                        : ""
                                }
                                ${
                                    dueText
                                        ? `<span style="color: ${
                                              isOverdue ? "#ef4444" : "inherit"
                                          }">${dueText}</span>`
                                        : ""
                                }
                                ${
                                    isOverdue
                                        ? '<span style="color: #ef4444; font-weight: bold;">⏰ OVERDUE</span>'
                                        : ""
                                }
                            </div>
                        </div>
                        <div class="todo-actions">
                            <button class="todo-action-btn todo-edit-btn" title="Edit"><i class="fas fa-pencil-alt"></i></button>
                            <button class="todo-action-btn todo-delete-btn" title="Delete"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `;
            })
            .join("");

        // Attach event listeners
        container.querySelectorAll(".todo-item-new").forEach((item) => {
            const id = item.dataset.id;
            const task = tasks.find((t) => t.id === id);

            // Checkbox toggle
            item.querySelector(".todo-checkbox").addEventListener("change", (e) => {
                e.stopPropagation();
                task.completed = e.target.checked;
                saveData();
                updateStats();
                renderTasks();
            });

            // Edit button
            item.querySelector(".todo-edit-btn").addEventListener("click", (e) => {
                e.stopPropagation();
                openEditModal(task);
            });

            // Delete button
            item.querySelector(".todo-delete-btn").addEventListener("click", (e) => {
                e.stopPropagation();
                if (confirm("Delete this task?")) {
                    tasks = tasks.filter((t) => t.id !== id);
                    notifiedTasks.delete(id);
                    saveData();
                    updateStats();
                    renderTasks();
                }
            });

            // Double click to edit
            item.addEventListener("dblclick", () => {
                openEditModal(task);
            });
        });

        updateStats();
    }

    // Open add task modal
    function openAddModal() {
        editingTaskId = null;
        document.getElementById("modalTitle").textContent = "✨ Create New Task";
        document.getElementById("taskTitle").value = "";
        document.getElementById("taskDescription").value = "";
        document.getElementById("taskCategory").value = "";
        document.getElementById("taskDeadline").value = "";

        document.querySelectorAll(".priority-btn").forEach((btn) => btn.classList.remove("active"));
        document.querySelector(".priority-btn.medium").classList.add("active");
        currentPriority = "medium";

        document
            .querySelectorAll(".difficulty-btn")
            .forEach((btn) => btn.classList.remove("active"));
        document.querySelector(".difficulty-btn.medium").classList.add("active");
        currentDifficulty = "medium";

        updateCategoryDropdown();
        document.getElementById("taskModal").classList.add("active");
    }

    // Open edit modal
    function openEditModal(task) {
        editingTaskId = task.id;
        document.getElementById("modalTitle").innerHTML =
            "<i class='fa-solid fa-pencil'></i> Edit Task";
        document.getElementById("taskTitle").value = task.text;
        document.getElementById("taskDescription").value = task.description || "";
        document.getElementById("taskCategory").value = task.category || "";
        document.getElementById("taskDeadline").value = task.dueDate || "";

        document.querySelectorAll(".priority-btn").forEach((btn) => btn.classList.remove("active"));
        document.querySelector(`.priority-btn.${task.priority}`).classList.add("active");
        currentPriority = task.priority;

        document
            .querySelectorAll(".difficulty-btn")
            .forEach((btn) => btn.classList.remove("active"));
        const difficultyBtn = document.querySelector(
            `.difficulty-btn[data-difficulty="${task.difficulty || "medium"}"]`
        );
        if (difficultyBtn) difficultyBtn.classList.add("active");
        currentDifficulty = task.difficulty || "medium";

        updateCategoryDropdown();
        document.getElementById("taskModal").classList.add("active");
    }

    // Save task
    function saveTask() {
        const title = document.getElementById("taskTitle").value.trim();
        const description = document.getElementById("taskDescription").value.trim();
        const category = document.getElementById("taskCategory").value;
        const deadline = document.getElementById("taskDeadline").value;

        if (!title) {
            alert("Please enter a task title");
            return;
        }

        if (editingTaskId) {
            // Edit existing task
            const task = tasks.find((t) => t.id === editingTaskId);
            task.text = title;
            task.description = description;
            task.priority = currentPriority;
            task.difficulty = currentDifficulty;
            task.category = category;
            task.dueDate = deadline || null;
        } else {
            // Create new task
            const task = {
                id: generateId(),
                text: title,
                description: description,
                completed: false,
                priority: currentPriority,
                difficulty: currentDifficulty,
                category: category || null,
                dueDate: deadline || null,
                createdAt: new Date().toISOString(),
            };
            tasks.unshift(task);
        }

        saveData();
        renderTasks();
        document.getElementById("taskModal").classList.remove("active");
    }

    // Update category dropdown
    function updateCategoryDropdown() {
        const select = document.getElementById("taskCategory");
        const currentValue = select.value;

        select.innerHTML = '<option value="">No Category</option>';
        categories.forEach((cat) => {
            const option = document.createElement("option");
            option.value = cat;
            option.textContent = cat;
            select.appendChild(option);
        });

        if (currentValue) select.value = currentValue;
    }

    // Render categories
    function renderCategories() {
        const container = document.getElementById("categoryList");
        container.innerHTML = categories
            .map(
                (cat) => `
                    <div class="category-tag">
                        <span>${cat}</span>
                        <button data-category="${cat}"><i class="fas fa-trash"></i></button>
                    </div>
                `
            )
            .join("");

        // Attach delete listeners
        container.querySelectorAll("button").forEach((btn) => {
            btn.addEventListener("click", () => {
                const cat = btn.dataset.category;
                if (confirm(`Delete category "${cat}"?`)) {
                    categories = categories.filter((c) => c !== cat);
                    // Remove category from tasks
                    tasks.forEach((task) => {
                        if (task.category === cat) task.category = null;
                    });
                    saveData();
                    renderCategories();
                    updateCategoryDropdown();
                }
            });
        });
    }

    // Add category
    function addCategory() {
        const input = document.getElementById("newCategoryInput");
        const name = input.value.trim();

        if (!name) return;

        if (categories.includes(name)) {
            alert("This category already exists!");
            return;
        }

        categories.push(name);
        input.value = "";
        saveData();
        renderCategories();
    }

    // Check notifications (desktop only)
    function checkNotifications() {
        if (
            !("Notification" in window) ||
            Notification.permission !== "granted" ||
            window.innerWidth <= 768
        )
            return;

        const now = new Date();
        tasks.forEach((task) => {
            if (task.completed || !task.dueDate || notifiedTasks.has(task.id)) return;

            const dueDate = new Date(task.dueDate);
            const timeDiff = dueDate - now;
            const minutesDiff = Math.floor(timeDiff / 60000);

            // Notify 15 minutes before
            if (minutesDiff <= 15 && minutesDiff > 0) {
                new Notification("⏰ Task Due Soon!", {
                    body: `"${task.text}" is due in ${minutesDiff} minutes`,
                    icon: "⏰",
                    tag: task.id,
                });
                notifiedTasks.add(task.id);
                saveData();
            }
            // Notify when overdue
            else if (timeDiff < 0 && Math.abs(minutesDiff) < 5) {
                new Notification("⏰ Task Overdue!", {
                    body: `"${task.text}" is now overdue!`,
                    icon: "⏰",
                    tag: task.id,
                });
                notifiedTasks.add(task.id);
                saveData();
            }
        });
    }

    // Priority selector in modal
    document.querySelectorAll(".priority-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".priority-btn").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            currentPriority = btn.dataset.priority;
        });
    });

    // Difficulty selector in modal
    document.querySelectorAll(".difficulty-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            document
                .querySelectorAll(".difficulty-btn")
                .forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            currentDifficulty = btn.dataset.difficulty;
        });
    });

    // Sort field changes
    document.querySelectorAll(".sort-field-select").forEach((select, index) => {
        select.addEventListener("change", (e) => {
            if (index < currentSort.length) {
                currentSort[index].field = e.target.value;
                renderTasks();
            }
        });
    });

    // Sort order toggles
    document.querySelectorAll(".sort-order-btn").forEach((btn, index) => {
        btn.addEventListener("click", () => {
            if (index < currentSort.length) {
                const newOrder = currentSort[index].order === "asc" ? "desc" : "asc";
                currentSort[index].order = newOrder;
                btn.dataset.order = newOrder;
                btn.innerHTML =
                    newOrder === "asc"
                        ? '<i class="fa-solid fa-arrow-up"></i>'
                        : '<i class="fa-solid fa-arrow-down"></i>';
                renderTasks();
            }
        });
    });

    // Toggle sort panel
    const toggleSortBtn = document.getElementById("toggleSortPanel");
    const sortPanel = document.getElementById("sortPanel");
    if (toggleSortBtn) {
        toggleSortBtn.addEventListener("click", () => {
            sortPanel.classList.toggle("collapsed");
            const icon = toggleSortBtn.querySelector("i");
            if (sortPanel.classList.contains("collapsed")) {
                icon.classList.remove("fa-chevron-up");
                icon.classList.add("fa-chevron-down");
            } else {
                icon.classList.remove("fa-chevron-down");
                icon.classList.add("fa-chevron-up");
            }
        });
    }

    // Filter buttons
    document.querySelectorAll(".filter-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });

    // Control buttons
    document.getElementById("addTaskBtn").addEventListener("click", openAddModal);

    document.getElementById("manageCategoriesBtn").addEventListener("click", () => {
        renderCategories();
        updateCategoryDropdown();
        document.getElementById("categoryModal").classList.add("active");
    });

    // Modal buttons
    document.getElementById("saveTaskBtn").addEventListener("click", saveTask);

    document.getElementById("cancelTaskBtn").addEventListener("click", () => {
        document.getElementById("taskModal").classList.remove("active");
    });

    document.getElementById("closeCategoryModal").addEventListener("click", () => {
        document.getElementById("categoryModal").classList.remove("active");
    });

    document.getElementById("addCategoryBtn").addEventListener("click", addCategory);

    document.getElementById("newCategoryInput").addEventListener("keypress", (e) => {
        if (e.key === "Enter") addCategory();
    });

    // Overlay controls
    const todoBtn = document.getElementById("todoBtn");
    const todoOverlay = document.getElementById("todoOverlay");
    const closeTodoBtn = document.getElementById("closeTodoOverlay");

    if (todoBtn) {
        todoBtn.addEventListener("click", () => {
            todoOverlay.classList.add("active");
            document.body.classList.add("no-scroll-todo");
            renderTasks();
        });
    }

    if (closeTodoBtn) {
        closeTodoBtn.addEventListener("click", () => {
            todoOverlay.classList.remove("active");
            document.body.classList.remove("no-scroll-todo");
        });
    }

    // Close modals when clicking outside
    document.getElementById("taskModal").addEventListener("click", (e) => {
        if (e.target.id === "taskModal") {
            document.getElementById("taskModal").classList.remove("active");
        }
    });

    document.getElementById("categoryModal").addEventListener("click", (e) => {
        if (e.target.id === "categoryModal") {
            document.getElementById("categoryModal").classList.remove("active");
        }
    });

    // Initialize
    loadData();
    renderTasks();
    updateSortDisplay();

    // Check notifications every minute (desktop only)
    if (window.innerWidth > 768) {
        setInterval(checkNotifications, 60000);
        checkNotifications();
    }
})();

let lastWeatherUpdate = null;

function getWeather() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(fetchWeatherData, handleLocationError);
    } else {
        updateWeatherError("Geolocation is not supported by this browser.");
    }
}

function fetchWeatherData(position) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=sunrise,sunset&timezone=auto`;

    fetch(url)
        .then((res) => res.json())
        .then((data) => {
            const weather = data.current_weather;
            const temp = `${weather.temperature}°C`;
            const sunrise = formatTime(data.daily.sunrise[0]);
            const sunset = formatTime(data.daily.sunset[0]);
            const now = new Date();
            const sunriseTime = new Date(data.daily.sunrise[0]);
            const sunsetTime = new Date(data.daily.sunset[0]);
            const isNight = now < sunriseTime || now > sunsetTime;
            const emoji = isNight ? "🌙" : getWeatherEmoji(weather.weathercode);
            const description = getWeatherDescription(weather.weathercode);

            // Update menu button
            document.getElementById("menuWeatherEmoji").textContent = emoji;
            document.getElementById("menuWeatherTemp").textContent = temp;

            // Update overlay
            document.getElementById("overlayWeatherEmoji").textContent = emoji;
            document.getElementById("overlayWeatherTemp").textContent = temp;
            document.getElementById("overlayWeatherDesc").textContent = description;
            document.getElementById("overlaySunrise").textContent = sunrise;
            document.getElementById("overlaySunset").textContent = sunset;

            // Update last update time
            lastWeatherUpdate = new Date();
            updateLastUpdateTime();

            fetchLocationName(lat, lon);
        })
        .catch(() => {
            updateWeatherError("Failed to fetch weather data.");
        });
}

function fetchLocationName(lat, lon) {
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
        .then((res) => res.json())
        .then((data) => {
            let location = "Unknown location";
            if (data.address) {
                if (data.address.city) location = data.address.city;
                else if (data.address.town) location = data.address.town;
                else if (data.address.village) location = data.address.village;
                else if (data.address.county) location = data.address.county;
                if (data.address.country_code)
                    location += ", " + data.address.country_code.toUpperCase();
            }
            document.getElementById("overlayWeatherLocation").textContent = location;
        })
        .catch(() => {
            document.getElementById("overlayWeatherLocation").textContent = "Unknown location";
        });
}

function handleLocationError() {
    updateWeatherError("Error obtaining geolocation");
}

function updateWeatherError(message) {
    document.getElementById("menuWeatherEmoji").textContent = "❌";
    document.getElementById("menuWeatherTemp").textContent = "Error";
    document.getElementById("overlayWeatherDesc").textContent = message;
}

function formatTime(iso) {
    const d = new Date(iso);
    return (
        d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0")
    );
}

function getWeatherEmoji(code) {
    if (code === 0) return "☀️";
    if ([1, 2].includes(code)) return "🌤️";
    if (code === 3) return "☁️";
    if ([45, 48].includes(code)) return "🌫️";
    if ([51, 53, 55, 56, 57].includes(code)) return "🌦️";
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "🌧️";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
    if ([95, 96, 99].includes(code)) return "⛈️";
    return "❓";
}

function getWeatherDescription(code) {
    if (code === 0) return "Clear";
    if ([1, 2].includes(code)) return "Partially Cloudy";
    if (code === 3) return "Cloudy";
    if ([45, 48].includes(code)) return "Fog";
    if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
    if ([95, 96, 99].includes(code)) return "Thunderstorm";
    return "Unknown";
}

function updateLastUpdateTime() {
    if (!lastWeatherUpdate) return;

    const now = new Date();
    const diff = Math.floor((now - lastWeatherUpdate) / 1000);

    let timeText;
    if (diff < 60) {
        timeText = "Just now";
    } else if (diff < 3600) {
        const mins = Math.floor(diff / 60);
        timeText = `${mins} minute${mins > 1 ? "s" : ""} ago`;
    } else {
        const hours = Math.floor(diff / 3600);
        timeText = `${hours} hour${hours > 1 ? "s" : ""} ago`;
    }

    const updateEl = document.getElementById("lastWeatherUpdate");
    if (updateEl) updateEl.textContent = timeText;
}

function updateOverlayTime() {
    const now = new Date();
    const timeStr =
        now.getHours().toString().padStart(2, "0") +
        ":" +
        now.getMinutes().toString().padStart(2, "0") +
        ":" +
        now.getSeconds().toString().padStart(2, "0");
    const dateStr =
        now.getDate().toString().padStart(2, "0") +
        "/" +
        (now.getMonth() + 1).toString().padStart(2, "0") +
        "/" +
        now.getFullYear();

    const timeEl = document.getElementById("overlayCurrentTime");
    const dateEl = document.getElementById("overlayCurrentDate");
    if (timeEl) timeEl.textContent = timeStr;
    if (dateEl) dateEl.textContent = dateStr;
}

// Initialize weather
getWeather();
setInterval(getWeather, 300000); // Update every 5 minutes
setInterval(updateLastUpdateTime, 30000); // Update "last updated" every 30 seconds
setInterval(updateOverlayTime, 1000); // Update time every second

// Weather overlay controls
const weatherBtn = document.getElementById("weatherBtn");
const weatherOverlay = document.getElementById("weatherOverlay");
const closeWeatherOverlay = document.getElementById("closeWeatherOverlay");
const refreshWeatherBtn = document.getElementById("refreshWeatherBtn");

if (weatherBtn) {
    weatherBtn.addEventListener("click", () => {
        weatherOverlay.classList.add("active");
        document.body.classList.add("no-scroll");
        updateOverlayTime();

        // Close side menu if open
        if (sideMenu && sideMenu.classList.contains("open")) {
            sideMenu.classList.remove("open");
            if (menuIcon) {
                menuIcon.classList.remove("fa-arrow-left");
                menuIcon.classList.add("fa-arrow-right");
            }
        }
        updateOverlay();
    });
}

if (closeWeatherOverlay) {
    closeWeatherOverlay.addEventListener("click", () => {
        weatherOverlay.classList.remove("active");
        document.body.classList.remove("no-scroll");
        updateOverlay();
    });
}

if (refreshWeatherBtn) {
    refreshWeatherBtn.addEventListener("click", () => {
        refreshWeatherBtn.innerHTML = '<i class="fa-solid fa-rotate fa-spin"></i> Refreshing...';
        refreshWeatherBtn.disabled = true;

        getWeather();

        setTimeout(() => {
            refreshWeatherBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> Refresh Weather';
            refreshWeatherBtn.disabled = false;
        }, 2000);
    });
}

// Update overlay function to include weather overlay
function updateOverlay() {
    const isSideOpen = sideMenu && sideMenu.classList.contains("open");
    const isManualsOpen = manualsPopup && manualsPopup.classList.contains("active");
    const isInfoOpen = infoOverlay && infoOverlay.classList.contains("active");
    const isWeatherOpen = weatherOverlay && weatherOverlay.classList.contains("active");

    if (isSideOpen || isManualsOpen || isInfoOpen || isWeatherOpen) {
        overlay.classList.add("active");
    } else {
        overlay.classList.remove("active");
    }
}

// Update OVERLAY click handler to include weather overlay
if (overlay) {
    overlay.addEventListener("click", () => {
        // Close weather overlay first if open
        if (weatherOverlay && weatherOverlay.classList.contains("active")) {
            weatherOverlay.classList.remove("active");
            document.body.style.overflow = "";
        }
        // Close info overlay
        else if (infoOverlay && infoOverlay.classList.contains("active")) {
            infoOverlay.classList.remove("active");
            document.body.style.overflow = "";
        }
        // Then manuals popup
        else if (manualsPopup && manualsPopup.classList.contains("active")) {
            manualsPopup.classList.remove("active");
            document.body.style.overflow = "";
        }
        // Then side menu
        else if (sideMenu && sideMenu.classList.contains("open")) {
            sideMenu.classList.remove("open");
            menuIcon.classList.remove("fa-arrow-left");
            menuIcon.classList.add("fa-arrow-right");
        }
        // Update overlay state
        updateOverlay();
    });
}

// --- TITLE TIME DISPLAY ---
function updateTitleTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    const timeEl = document.getElementById("titleTime");
    if (timeEl) {
        timeEl.textContent = `${hours}:${minutes}:${seconds}`;
    }
}

// Update every second
setInterval(updateTitleTime, 1000);
updateTitleTime();

// Favicon
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

// Initial set
updateFavicon(getComputedStyle(document.documentElement).getPropertyValue("--accent-color").trim());

const accentColorPicker = document.getElementById("accentColorPicker");
if (accentColorPicker) {
    accentColorPicker.addEventListener("input", (e) => {
        updateFavicon(e.target.value);
    });
}

// when the top time display is clicked, trigger the same action as the clock button
document.getElementById("titleTime")?.addEventListener("click", function () {
    const clockBtn = document.getElementById("clockBtn");
    if (clockBtn) clockBtn.click();
});

// Click on subject cells

/* simple visible selection style */
(function () {
    const table = document.getElementById("timetable");
    if (!table) return;

    // mapping of subjects -> manual URLs (lowercase keys)
    const manualMap = {
        "arte plastice":
            "https://manuale.edu.ro/manuale/Clasa%20a%20VIII-a/Educatie%20plastica/Uy5DLiBMaXRlcmEgRWR1/",
        biologie:
            "https://manuale.edu.ro/manuale/Clasa%20a%20VIII-a/Biologie/Q29yaW50IExvZ2lzdGlj/",
        chimie: "https://manuale.edu.ro/manuale/Clasa%20a%20VIII-a/Chimie/QXJ0IEtsZXR0IFMuUi5M/#book/0-help",
        civică: "https://manuale.edu.ro/manuale/Clasa%20a%20VIII-a/Educatie%20sociala/Q0QgUHJlc3MgUy5SLkwu/book.html?book#0",
        engleză:
            "https://manuale.edu.ro/manuale/Clasa%20a%20VIII-a/Limba%20moderna%201-limba%20engleza/QXJ0IEtsZXR0IFMuUi5M/#book/0-help",
        franceză:
            "https://manuale.edu.ro/manuale/Clasa%20a%20VIII-a/Limba%20moderna%202%20franceza/Uy5DLiBCb29rbGV0IFMu/",
        fizică: "https://manuale.edu.ro/manuale/Clasa%20a%20VIII-a/Fizica/QXJ0IEtsZXR0IFMuUi5M/",
        geografie:
            "https://manuale.edu.ro/manuale/Clasa%20a%20VIII-a/Geografie/QXJ0IEtsZXR0IFMuUi5M/#book/0-help",
        informatică:
            "https://manuale.edu.ro/manuale/Clasa%20a%20VIII-a/Informatica%20si%20TIC/Uy5DLiBMaXRlcmEgRWR1/",
        istorie:
            "https://manuale.edu.ro/manuale/Clasa%20a%20VIII-a/Istorie/QWthZGVtb3MgQXJ0IFMu/interior.html",
        mate: "https://app.asq.ro/",
        muzică: "https://manuale.edu.ro/manuale/Clasa%20a%20VIII-a/Educatie%20muzicala/QXJ0IEtsZXR0IFMuUi5M/",
        română: "https://manuale.edu.ro/manuale/Clasa%20a%20VIII-a/Limba%20si%20literatura%20romana/QXJ0IEtsZXR0IFMuUi5M/A1948.pdf",
        religie: "#",
        sport: "#",
        tehnologică:
            "https://manuale.edu.ro/manuale/Clasa%20a%20VIII-a/Educatie%20tehnologica%20si%20aplicatii%20practice/Q0QgUHJlc3MgUy5SLkwu/book.html?book#0",
    };

    function normalizeSubject(text) {
        if (!text) return "";
        const withoutEmojis = text.replace(
            /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\uFE0F]/gu,
            ""
        );
        return withoutEmojis
            .replace(/[^0-9\p{L}\s\-]+/gu, "")
            .trim()
            .toLowerCase();
    }

    function openManual(url) {
        if (!url) return;
        window.open(url, "_blank");
    }

    // build matrix of selectable cells (exclude first header row and first column per row)
    const allRows = Array.from(table.querySelectorAll("tr"));
    const selectableRows = allRows.slice(1); // skip the top weekday header
    const matrix = selectableRows.map((row) => {
        const cells = Array.from(row.querySelectorAll("th,td")).slice(1); // skip time column
        return cells;
    });
    const rowCount = matrix.length;
    const colCount = matrix[0] ? matrix[0].length : 0;

    // utility to get currently selected indices
    let selected = { r: -1, c: -1 };

    function getCell(r, c) {
        if (r < 0 || c < 0) return null;
        if (r >= matrix.length) return null;
        if (c >= matrix[r].length) return null;
        return matrix[r][c];
    }

    function clearSelection() {
        table.querySelectorAll(".selected").forEach((el) => {
            el.classList.remove("selected");
            el.removeAttribute("aria-selected");
            el.tabIndex = -1;
        });
        selected = { r: -1, c: -1 };
    }

    function selectCell(cell) {
        if (!cell) return;
        // find indices
        for (let r = 0; r < matrix.length; r++) {
            const c = matrix[r].indexOf(cell);
            if (c !== -1) {
                clearSelection();
                selected = { r, c };
                cell.classList.add("selected");
                cell.setAttribute("aria-selected", "true");
                cell.tabIndex = 0;
                cell.focus({ preventScroll: true });
                return;
            }
        }
    }

    // click: open textbook immediately (no highlighting)
    table.addEventListener(
        "click",
        function (ev) {
            const cell = ev.target.closest("th, td");
            if (!cell || !table.contains(cell)) return;
            // skip first column and header row
            const tr = cell.parentElement;
            if (!tr) return;
            const rowIndex = allRows.indexOf(tr);
            if (rowIndex <= 0) return; // header row or above
            const cellIndex = Array.from(tr.children).indexOf(cell);
            if (cellIndex === 0) return; // time column

            // Don't highlight on click, just open the textbook
            // 1) data-manual attribute precedence
            const dataManual = cell.dataset.manual;
            if (dataManual) {
                openManual(dataManual);
                return;
            }
            // 2) lookup by subject text
            const subjText = cell.innerText || cell.textContent;
            const subject = normalizeSubject(subjText);
            if (!subject) return;
            const found = manualMap[subject];
            if (found) {
                openManual(found);
                return;
            }
            // 3) fallback search
            openManual("https://manuale.edu.ro/?s=" + encodeURIComponent(subject));
        },
        true
    ); // use capture phase to prevent click from bubbling

    // keyboard navigation + Enter to highlight only
    document.addEventListener("keydown", function (ev) {
        // Start selection if none and arrow pressed
        if (
            (ev.key === "ArrowRight" ||
                ev.key === "ArrowLeft" ||
                ev.key === "ArrowUp" ||
                ev.key === "ArrowDown") &&
            selected.r === -1
        ) {
            // pick first non-empty selectable cell (row 0 col 0)
            let start = null;
            outer: for (let r = 0; r < matrix.length; r++) {
                for (let c = 0; c < matrix[r].length; c++) {
                    start = { r, c };
                    break outer;
                }
            }
            if (start) selectCell(getCell(start.r, start.c));
        }

        if (selected.r === -1) return;

        switch (ev.key) {
            case "ArrowRight":
                ev.preventDefault();
                selected.c = (selected.c + 1) % colCount;
                selectCell(getCell(selected.r, selected.c));
                break;
            case "ArrowLeft":
                ev.preventDefault();
                selected.c = (selected.c - 1 + colCount) % colCount;
                selectCell(getCell(selected.r, selected.c));
                break;
            case "ArrowDown":
                ev.preventDefault();
                selected.r = (selected.r + 1) % rowCount;
                // clamp column if that row has fewer columns
                if (selected.c >= matrix[selected.r].length)
                    selected.c = matrix[selected.r].length - 1;
                selectCell(getCell(selected.r, selected.c));
                break;
            case "ArrowUp":
                ev.preventDefault();
                selected.r = (selected.r - 1 + rowCount) % rowCount;
                if (selected.c >= matrix[selected.r].length)
                    selected.c = matrix[selected.r].length - 1;
                selectCell(getCell(selected.r, selected.c));
                break;
            case "Enter":
                ev.preventDefault();
                const activeCell = getCell(selected.r, selected.c);
                if (!activeCell) return;

                // Toggle <mark> tag on the selected cell
                const isMarked = activeCell.getAttribute("data-marked") === "true";
                if (!isMarked) {
                    activeCell.innerHTML = "<mark>" + activeCell.innerHTML + "</mark>";
                    activeCell.setAttribute("data-marked", "true");
                } else {
                    activeCell.innerHTML = activeCell.innerHTML.replace(/<\/?mark>/g, "");
                    activeCell.setAttribute("data-marked", "false");
                }
                break;
            default:
                return;
        }
    });

    // make selectable cells tabbable but not focusable by default
    matrix.flat().forEach((cell) => {
        cell.tabIndex = -1;
    });
})();
