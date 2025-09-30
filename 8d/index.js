/* --- HIGHLIGHT, THEME, WEATHER, TODO, SETTINGS, FAVICON, SIDE MENU --- */

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

// --- TO-DO LIST WITH DRAG & DROP AND EDIT ---
(function initTodo() {
    const taskList = document.querySelector(".todo-list");
    if (!taskList) return; // guard

    const addTaskInput = document.querySelector(".add-task input[type='text']");
    const addTaskButton = document.querySelector(".add-task button");
    const TODO_KEY = "todo-tasks";

    function addTask(text, checked = false) {
        const li = document.createElement("li");
        li.className = "todo-item";
        li.draggable = true;
        li.innerHTML = `
                <input type="checkbox" ${checked ? "checked" : ""}>
                <label>${text}</label>
                <button class="delete-btn" title="Delete"><i class="fa fa-trash" aria-hidden="true"></i></button>
            `;
        taskList.appendChild(li);
        saveTasks();
    }

    function saveTasks() {
        const tasks = [];
        document.querySelectorAll(".todo-item").forEach((item) => {
            const label = item.querySelector("label").textContent;
            const checked = !!item.querySelector('input[type="checkbox"]').checked;
            tasks.push({ text: label, checked });
        });
        localStorage.setItem(TODO_KEY, JSON.stringify(tasks));
    }

    function loadTasks() {
        taskList.innerHTML = "";
        const data = JSON.parse(localStorage.getItem(TODO_KEY)) || [];
        data.forEach((task) => addTask(task.text, task.checked));
    }

    // Add task on button click
    addTaskButton &&
        addTaskButton.addEventListener("click", () => {
            const taskText = addTaskInput.value.trim();
            if (taskText) {
                addTask(taskText);
                addTaskInput.value = "";
                addTaskInput.focus();
            }
        });

    // Add task on Enter key
    addTaskInput &&
        addTaskInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                addTaskButton && addTaskButton.click();
            }
        });

    // Task actions: delete, checkbox
    taskList.addEventListener("click", (e) => {
        const target = e.target;
        // Delete (handle clicks on icon or button)
        if (target.classList.contains("delete-btn") || target.closest(".delete-btn")) {
            const li = target.closest ? target.closest("li") : null;
            if (li) {
                li.remove();
                saveTasks();
            }
            return;
        }
        // Checkbox toggled
        if (target.type === "checkbox") {
            saveTasks();
        }
    });

    // Double click to edit label
    taskList.addEventListener("dblclick", (e) => {
        const label = e.target.closest("label");
        if (!label) return;
        const li = label.closest("li");
        const oldText = label.textContent;
        const input = document.createElement("input");
        input.type = "text";
        input.value = oldText;
        input.className = "edit-task-input";
        label.replaceWith(input);
        input.focus();

        function saveEdit() {
            const newText = input.value.trim() || oldText;
            const newLabel = document.createElement("label");
            newLabel.textContent = newText;
            input.replaceWith(newLabel);
            saveTasks();
        }
        input.addEventListener("blur", saveEdit);
        input.addEventListener("keypress", (event) => {
            if (event.key === "Enter") input.blur();
        });
    });

    // Drag & drop
    let draggedItem = null;

    taskList.addEventListener("dragstart", (e) => {
        const target = e.target;
        if (target && target.classList && target.classList.contains("todo-item")) {
            draggedItem = target;
            target.classList.add("dragging");
        }
    });

    taskList.addEventListener("dragend", (e) => {
        const target = e.target;
        if (target && target.classList && target.classList.contains("todo-item")) {
            target.classList.remove("dragging");
            draggedItem = null;
            saveTasks();
        }
    });

    taskList.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (!draggedItem) return;
        const afterElement = getDragAfterElement(taskList, e.clientY);
        if (afterElement == null) {
            taskList.appendChild(draggedItem);
        } else {
            taskList.insertBefore(draggedItem, afterElement);
        }
    });

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll(".todo-item:not(.dragging)")];
        let closest = { offset: Number.NEGATIVE_INFINITY, element: null };
        draggableElements.forEach((child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                closest = { offset: offset, element: child };
            }
        });
        return closest.element;
    }

    // initial load
    loadTasks();
})();

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

menuToggle &&
    menuToggle.addEventListener("click", () => {
        const isOpen = sideMenu.classList.toggle("open");
        overlay.classList.toggle("active");

        if (isOpen) {
            menuIcon.classList.remove("fa-arrow-right");
            menuIcon.classList.add("fa-arrow-left");
        } else {
            menuIcon.classList.remove("fa-arrow-left");
            menuIcon.classList.add("fa-arrow-right");
        }
    });

overlay &&
    overlay.addEventListener("click", () => {
        sideMenu && sideMenu.classList.remove("open");
        overlay.classList.remove("active");
        menuIcon.classList.remove("fa-arrow-left");
        menuIcon.classList.add("fa-arrow-right");
    });
