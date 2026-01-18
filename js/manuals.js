

/* ========================================
   MANUALS: Popup & Recommendation System
   ======================================== */

function initManualPopup() {
    const allManualsBtn = document.getElementById("allManualsBtn");
    const manualsPopup = document.getElementById("manualsPopup");
    const closeManualsPopup = document.getElementById("closeManualsPopup");
    const manualsPopupContent = document.getElementById("manualsPopupContent");
    const overlay = document.getElementById("overlay");

    // Clone manuals from original section
    if (manualsPopupContent) {
        const manualsOriginal = document.getElementById("manuals");
        if (manualsOriginal) {
            manualsPopupContent.innerHTML = manualsOriginal.innerHTML;
        }
    }

    // All manuals popup triggers
    if (allManualsBtn) {
        allManualsBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log("Manuals button clicked");
            
            if (manualsPopup) {
                manualsPopup.classList.add("active");
                manualsPopup.style.display = "block";
                console.log("Manuals popup opened, active class added");
            }
            if (overlay) {
                overlay.classList.add("active");
            }
            document.body.style.overflow = "hidden";

            // Close side menu if open
            const sideMenu = document.getElementById("sideMenu");
            const menuIcon = document.getElementById("menuIcon");
            if (sideMenu && sideMenu.classList.contains("open")) {
                sideMenu.classList.remove("open");
                if (menuIcon) {
                    menuIcon.classList.remove("fa-arrow-left");
                    menuIcon.classList.add("fa-arrow-right");
                }
            }

            // Call updateOverlay if available (from ui-core.js)
            if (typeof updateOverlay === "function") {
                updateOverlay();
            }
        });
    } else {
        console.warn("allManualsBtn not found");
    }

    if (closeManualsPopup) {
        closeManualsPopup.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (manualsPopup) {
                manualsPopup.classList.remove("active");
                manualsPopup.style.display = "none";
            }
            if (overlay) {
                overlay.classList.remove("active");
            }
            document.body.style.overflow = "";
            
            // Call updateOverlay if available (from ui-core.js)
            if (typeof updateOverlay === "function") {
                updateOverlay();
            }
        });
    } else {
        console.warn("closeManualsPopup not found");
    }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initManualPopup);
} else {
    initManualPopup();
}

// Search bar logic
function initSearchBar() {
    const manualSearch = document.getElementById("manualSearch");
    const manualsPopupContent = document.getElementById("manualsPopupContent");
    
    if (manualSearch && manualsPopupContent) {
        manualSearch.addEventListener("input", () => {
            const term = manualSearch.value.toLowerCase();
            const manuals = manualsPopupContent.querySelectorAll(".container");
            manuals.forEach((container) => {
                const titleEl = container.querySelector("h2");
                if (titleEl) {
                    const title = titleEl.textContent.toLowerCase();
                    if (title.includes(term)) {
                        container.style.display = "";
                    } else {
                        container.style.display = "none";
                    }
                }
            });
        });
    }
}

// Initialize search when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSearchBar);
} else {
    initSearchBar();
}

/* --- RECOMMENDED MANUAL LOGIC --- */

function normalizeText(s = "") {
    const stripped = s.replace(/<[^>]*>/g, "");
    const lettersOnly = stripped.replace(/[^\p{L}\s]/gu, " ");
    const noDiacritics = lettersOnly.normalize("NFD").replace(/\p{Diacritic}/gu, "");
    return noDiacritics.toLowerCase().replace(/\s+/g, " ").trim();
}

function findBestManualForSubject(subjectText) {
    const subjectNorm = normalizeText(subjectText);
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
        if (!titleNorm) return;
        
        const titleTokens = titleNorm.split(" ").filter(Boolean);
        const subjTokens = subjectNorm.split(" ").filter(Boolean);
        let score = 0;
        titleTokens.forEach((t) => {
            if (subjTokens.includes(t)) score += 2;
            else if (subjectNorm.includes(t)) score += 1;
        });
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
    let day = now.getDay();
    if (day === 0 || day === 6) {
        const rec = document.querySelector("#recommendedManual .manual-card");
        if (rec) rec.innerHTML = "<p>No textbook available</p>";
        return;
    }
    const timetable = document.getElementById("timetable");
    if (!timetable) return;
    const rows = [...timetable.querySelectorAll("tr")].slice(1);
    const colIndex = day;

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

    recManualEl.innerHTML = "";
    recManualEl.onclick = null;

    if (!matchedSubject) {
        recManualEl.innerHTML = "<p>No textbook available</p>";
        return;
    }

    const best = findBestManualForSubject(matchedSubject);
    if (!best) {
        const p = document.createElement("p");
        p.textContent = matchedSubject.trim() || "No textbook available";
        recManualEl.appendChild(p);
        return;
    }

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
    }
}

// Init recommendation when DOM is ready
function initRecommendation() {
    updateRecommendedManual();
    setInterval(updateRecommendedManual, 15000);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initRecommendation);
} else {
    initRecommendation();
}