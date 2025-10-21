/* --- HIGHLIGHT, THEME, WEATHER, SETTINGS, FAVICON, SIDE MENU --- */

/* --- HIGHLIGHT LOGIC (structure-aware) --- */
function highlightCurrent() {
    const date = new Date();
    let dayOfWeek = date.getDay(); // 0=Sun, 1=Mon...
    if (dayOfWeek === 0) dayOfWeek = 7; // treat Sunday as 7
    const currentHour = date.getHours();

    // clear old highlights
    document
        .querySelectorAll(".current-day, .current-hour, .current-cell")
        .forEach((el) => el.classList.remove("current-day", "current-hour", "current-cell"));

    const table = document.getElementById("timetable");
    if (!table) return;

    // Highlight day header (assumes first thead row contains day names; first column is time)
    const headerRow = table.querySelector("thead tr");
    if (headerRow) {
        const headerCells = [...headerRow.children];
        const dayIndex = dayOfWeek - 1; // Monday -> 0
        if (dayIndex >= 0 && dayIndex < headerCells.length - 1) {
            const dayCell = headerCells[dayIndex + 1]; // +1 because first cell is time
            dayCell && dayCell.classList.add("current-day");
        }
    }

    // Try to find a row that matches current hour like "14:00", match first cell text
    const hourStr = String(currentHour).padStart(2, "0") + ":00";
    const allRows = [...table.querySelectorAll("tr")];
    // skip first header row (day names); search the subsequent rows for the time in the first cell
    for (let i = 1; i < allRows.length; i++) {
        const row = allRows[i];
        const firstCell = row.children[0];
        if (!firstCell) continue;
        if (firstCell.textContent.trim().startsWith(hourStr)) {
            firstCell.classList.add("current-hour");
            // highlight the intersection cell for today's column (first column is time)
            const dayColIndex = dayOfWeek; // 1..5 maps to children index
            const targetCell = row.children[dayColIndex];
            targetCell && targetCell.classList.add("current-cell");
            break;
        }
    }

    // update time and date display
    const hourOfTheDay = document.getElementById("hourOfTheDay");
    if (hourOfTheDay) {
        const mins = date.getMinutes().toString().padStart(2, "0");
        hourOfTheDay.textContent = `${date.getHours()}:${mins}`;
        let dateDisplay = document.getElementById("dateOfTheDay");
        if (!dateDisplay) {
            dateDisplay = document.createElement("div");
            dateDisplay.id = "dateOfTheDay";
            hourOfTheDay.after(dateDisplay);
        }
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        dateDisplay.textContent = `${day}.${month}.${year}`;
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
            cell.onclick = () => {
                const marked = cell.getAttribute("data-marked") === "true";
                if (!marked) {
                    cell.innerHTML = "<mark>" + cell.innerHTML + "</mark>";
                    cell.setAttribute("data-marked", "true");
                } else {
                    cell.innerHTML = cell.innerHTML.replace(/<\/?mark>/g, "");
                    cell.setAttribute("data-marked", "false");
                }
            };
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

// --- THEME & COLOR PICKER ---
const themeToggle = document.getElementById("switchTheme");
const themeIcon = document.getElementById("themeIcon");
let isDarkTheme = false;

function changeTheme() {
    isDarkTheme = !isDarkTheme;
    if (isDarkTheme) {
        document.body.setAttribute("data-theme", "dark");
        themeIcon.classList.remove("fa-sun");
        themeIcon.classList.add("fa-moon");
        localStorage.setItem("theme", "dark");
    } else {
        document.body.removeAttribute("data-theme");
        themeIcon.classList.remove("fa-moon");
        themeIcon.classList.add("fa-sun");
        localStorage.setItem("theme", "light");
    }
}

// Guard usage: elements exist in DOM (script is at end of body)
themeToggle && themeToggle.addEventListener("click", changeTheme);

// On page load, apply saved theme
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
    document.body.setAttribute("data-theme", "dark");
    themeIcon && themeIcon.classList.remove("fa-sun");
    themeIcon && themeIcon.classList.add("fa-moon");
    isDarkTheme = true;
} else {
    document.body.removeAttribute("data-theme");
    themeIcon && themeIcon.classList.remove("fa-moon");
    themeIcon && themeIcon.classList.add("fa-sun");
    isDarkTheme = false;
}

const colorPicker = document.getElementById("accentColorPicker");
colorPicker &&
    colorPicker.addEventListener("input", (event) => {
        const newColor = event.target.value;
        document.documentElement.style.setProperty("--accent-color", newColor);
    });
colorPicker &&
    colorPicker.addEventListener("change", (event) => {
        const newColor = event.target.value;
        localStorage.setItem("accentColor", newColor);
    });
const savedColor = localStorage.getItem("accentColor");
if (savedColor) {
    document.documentElement.style.setProperty("--accent-color", savedColor);
    if (colorPicker) colorPicker.value = savedColor;
}

// --- WEATHER ---
function getWeather() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(fetchWeatherData, handleLocationError);
    } else {
        const desc = document.getElementById("weather-desc");
        if (desc) desc.textContent = "Geolocation is not supported by this browser.";
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
            document.getElementById("weather-emoji").textContent = emoji;
            document.getElementById("weather-temp").textContent = temp;
            document.getElementById("weather-desc").textContent = getWeatherDescription(
                weather.weathercode
            );
            document.getElementById("sunrise").textContent = sunrise;
            document.getElementById("sunset").textContent = sunset;
            fetchLocationName(lat, lon);
        })
        .catch(() => {
            const desc = document.getElementById("weather-desc");
            if (desc) desc.textContent = "Failed to fetch weather data.";
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
            const el = document.getElementById("weather-location");
            if (el)
                el.innerHTML = `<i id="location-dot" class="fa-solid fa-location-dot"></i> ${location}`;
        })
        .catch(() => {
            const el = document.getElementById("weather-location");
            if (el)
                el.innerHTML = `<i id="location-dot" class="fa-solid fa-location-dot"></i> Unknown location`;
        });
}
function handleLocationError() {
    const desc = document.getElementById("weather-desc");
    if (desc) desc.textContent = "Error obtaining geolocation";
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
getWeather();
setInterval(getWeather, 300000);

// --- SETTINGS MENU LOGIC ---
const settingsButton = document.getElementById("settingsButton");
const settingsMenu = document.getElementById("settingsMenu");
const settingsIcon = settingsButton && settingsButton.querySelector("i");

function rotateSettingsIcon(direction) {
    if (!settingsIcon) return;
    settingsIcon.classList.remove("rotate-once-right", "rotate-once-left");
    void settingsIcon.offsetWidth; // Force reflow to restart animation
    if (direction === "right") {
        settingsIcon.classList.add("rotate-once-right");
    } else {
        settingsIcon.classList.add("rotate-once-left");
    }
}

settingsButton &&
    settingsButton.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpening = !settingsMenu.classList.contains("open");
        settingsMenu.classList.toggle("open");
        rotateSettingsIcon(isOpening ? "right" : "left");
    });

document.addEventListener("click", (e) => {
    if (
        settingsMenu &&
        settingsButton &&
        !settingsMenu.contains(e.target) &&
        !settingsButton.contains(e.target)
    ) {
        if (settingsMenu.classList.contains("open")) {
            settingsMenu.classList.remove("open");
            rotateSettingsIcon("left");
        }
    }
});

// Fancy horizontal scroll indicator
const scrollIndicator = document.getElementById("scroll-indicator");
window.addEventListener("scroll", () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const scrolled = window.scrollY;
    const percent = scrollable > 0 ? (scrolled / scrollable) * 100 : 0;
    if (scrollIndicator) scrollIndicator.style.width = percent + "%";
});

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

// Update when accent color changes
const accentColorPicker = document.getElementById("accentColorPicker");
if (accentColorPicker) {
    accentColorPicker.addEventListener("input", (e) => {
        updateFavicon(e.target.value);
    });
}

// SIDE MENU toggles (script at end of body; elements exist)
const sideMenu = document.getElementById("sideMenu");
const menuToggle = document.getElementById("menuToggle");
const menuIcon = document.getElementById("menuIcon");
const overlay = document.getElementById("overlay");

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

function parseTimeCellToDate(timeText, baseDate) {
    // expects formats like "14:00" or "14:00 " etc.
    const m = timeText.trim().match(/(\d{1,2}):(\d{2})/);
    if (!m) return null;
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const d = new Date(
        baseDate.getFullYear(),
        baseDate.getMonth(),
        baseDate.getDate(),
        h,
        min,
        0,
        0
    );
    return d;
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

        // închide meniul lateral dacă e deschis
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
// --- Overlay manager: păstrează overlay activ dacă meniul sau popup-ul de manuale sunt deschise ---
function updateOverlay() {
    const isSideOpen = sideMenu && sideMenu.classList.contains("open");
    const isManualsOpen = manualsPopup && manualsPopup.classList.contains("active");
    if (isSideOpen || isManualsOpen) overlay.classList.add("active");
    else overlay.classList.remove("active");
}

// MENU TOGGLE (folosește updateOverlay în loc de toggle direct)
if (menuToggle) {
    menuToggle.addEventListener("click", () => {
        // Prevent opening the side menu while the manuals popup is open
        if (manualsPopup && manualsPopup.classList.contains("active")) return;

        const isOpen = sideMenu.classList.toggle("open");
        // Asigurăm overlay-ul când se deschide meniul; la închidere, updateOverlay decide
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

// OVERLAY click: închide top-most element (popup manuale prioritar), altfel meniul
if (overlay) {
    overlay.addEventListener("click", () => {
        // Dacă popup manuale e deschis -> închidem întâi popup-ul (comportament tipic)
        if (manualsPopup && manualsPopup.classList.contains("active")) {
            manualsPopup.classList.remove("active");
            document.body.style.overflow = ""; // readucem scrollul
        } else if (sideMenu && sideMenu.classList.contains("open")) {
            // Altfel închidem meniul lateral
            sideMenu.classList.remove("open");
            menuIcon.classList.remove("fa-arrow-left");
            menuIcon.classList.add("fa-arrow-right");
        }
        // Actualizăm starea overlay-ului după modificări
        updateOverlay();
    });
}

// ALL MANUALS button: deschide popup și folosește updateOverlay
if (allManualsBtn) {
    allManualsBtn.addEventListener("click", () => {
        // deschidem popup-ul
        manualsPopup.classList.add("active");
        document.body.style.overflow = "hidden"; // blocăm scroll-ul în fundal

        // dacă meniul lateral era deschis, îl închidem pentru claritate
        if (sideMenu && sideMenu.classList.contains("open")) {
            sideMenu.classList.remove("open");
            menuIcon.classList.remove("fa-arrow-left");
            menuIcon.classList.add("fa-arrow-right");
        }

        updateOverlay();
    });
}

// Close button din popup: închide popup și actualizează overlay
if (closeManualsPopup) {
    closeManualsPopup.addEventListener("click", () => {
        manualsPopup.classList.remove("active");
        document.body.style.overflow = "";
        updateOverlay();
    });
}
// Preseturi de culoare
const colorPresets = document.querySelectorAll("#colorPresets .preset");
colorPresets.forEach((preset) => {
    preset.addEventListener("click", () => {
        const newColor = preset.getAttribute("data-color");
        document.documentElement.style.setProperty("--accent-color", newColor);
        localStorage.setItem("accentColor", newColor);

        // update și favicon-ul
        updateFavicon(newColor);

        // actualizează și inputul de tip color
        if (colorPicker) colorPicker.value = newColor;
    });
});

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

// Advanced To-Do List System
(function () {
    const STORAGE_KEY = "advanced-todo-tasks";
    const CATEGORIES_KEY = "todo-categories";
    const NOTIFIED_KEY = "notified-tasks";

    let tasks = [];
    let categories = [];
    let notifiedTasks = new Set();
    let currentFilter = "all";
    let currentSort = "priority";
    let editingTaskId = null;
    let currentPriority = "medium";

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

    // Sort tasks
    function sortTasks(tasksToSort) {
        const sorted = [...tasksToSort];

        switch (currentSort) {
            case "priority":
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                sorted.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
                break;
            case "name":
                sorted.sort((a, b) => a.text.localeCompare(b.text));
                break;
            case "created":
                sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case "deadline":
                sorted.sort((a, b) => {
                    if (!a.dueDate && !b.dueDate) return 0;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                });
                break;
            case "category":
                sorted.sort((a, b) => (a.category || "").localeCompare(b.category || ""));
                break;
        }

        return sorted;
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
        } else if (["high", "medium", "low"].includes(currentFilter)) {
            filteredTasks = tasks.filter((t) => t.priority === currentFilter);
        }

        // Sort tasks
        filteredTasks = sortTasks(filteredTasks);

        if (filteredTasks.length === 0) {
            container.innerHTML =
                '<div class="no-todos">No tasks found. Try a different filter! 🔍</div>';
            return;
        }

        container.innerHTML = filteredTasks
            .map((task) => {
                const dueText = task.dueDate
                    ? `📅 ${new Date(task.dueDate).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                      })}`
                    : "";

                const isOverdue =
                    task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;

                return `
                        <div class="todo-item-new priority-${task.priority} ${
                    task.completed ? "completed" : ""
                }" 
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
                                    <span class="todo-priority-badge ${
                                        task.priority
                                    }">${task.priority.toUpperCase()}</span>
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
                                            ? '<span style="color: #ef4444; font-weight: bold;">⚠️ OVERDUE</span>'
                                            : ""
                                    }
                                </div>
                            </div>
                            <div class="todo-actions">
                                <button class="todo-action-btn todo-edit-btn" title="Edit">✏️</button>
                                <button class="todo-action-btn todo-delete-btn" title="Delete">🗑️</button>
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
        document.getElementById("modalTitle").textContent = "➕ Create New Task";
        document.getElementById("taskTitle").value = "";
        document.getElementById("taskDescription").value = "";
        document.getElementById("taskCategory").value = "";
        document.getElementById("taskDeadline").value = "";

        document.querySelectorAll(".priority-btn").forEach((btn) => btn.classList.remove("active"));
        document.querySelector(".priority-btn.medium").classList.add("active");
        currentPriority = "medium";

        updateCategoryDropdown();
        document.getElementById("taskModal").classList.add("active");
    }

    // Open edit modal
    function openEditModal(task) {
        editingTaskId = task.id;
        document.getElementById("modalTitle").textContent = "✏️ Edit Task";
        document.getElementById("taskTitle").value = task.text;
        document.getElementById("taskDescription").value = task.description || "";
        document.getElementById("taskCategory").value = task.category || "";
        document.getElementById("taskDeadline").value = task.dueDate || "";

        document.querySelectorAll(".priority-btn").forEach((btn) => btn.classList.remove("active"));
        document.querySelector(`.priority-btn.${task.priority}`).classList.add("active");
        currentPriority = task.priority;

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
                        <button data-category="${cat}">✖</button>
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
                new Notification("📝 Task Due Soon!", {
                    body: `"${task.text}" is due in ${minutesDiff} minutes`,
                    icon: "📝",
                    tag: task.id,
                });
                notifiedTasks.add(task.id);
                saveData();
            }
            // Notify when overdue
            else if (timeDiff < 0 && Math.abs(minutesDiff) < 5) {
                new Notification("⚠️ Task Overdue!", {
                    body: `"${task.text}" is now overdue!`,
                    icon: "⚠️",
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

    // Sort options
    document.querySelectorAll(".sort-option").forEach((option) => {
        option.addEventListener("click", () => {
            document.querySelectorAll(".sort-option").forEach((o) => o.classList.remove("active"));
            option.classList.add("active");
            currentSort = option.dataset.sort;
            renderTasks();
        });
    });

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

    document.getElementById("sortBtn").addEventListener("click", () => {
        const panel = document.getElementById("sortPanel");
        panel.classList.toggle("active");
    });

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

    // Check notifications every minute (desktop only)
    if (window.innerWidth > 768) {
        setInterval(checkNotifications, 60000);
        checkNotifications();
    }
})();

// Touch gesture for menu swipe
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener("touchend", (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    const swipeThreshold = 100;
    const swipeDistance = touchEndX - touchStartX;

    // Swipe right to open (from left edge)
    if (swipeDistance > swipeThreshold && touchStartX < 50) {
        if (!sideMenu.classList.contains("open")) {
            sideMenu.classList.add("open");
            updateOverlay();
        }
    }

    // Swipe left to close
    if (swipeDistance < -swipeThreshold && sideMenu.classList.contains("open")) {
        sideMenu.classList.remove("open");
        updateOverlay();
    }
}

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

// Better viewport height for mobile browsers
function setViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
}

setViewportHeight();
window.addEventListener("resize", setViewportHeight);
window.addEventListener("orientationchange", setViewportHeight);
