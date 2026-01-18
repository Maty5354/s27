/* ========================================
   UI CORE: Side Menu, Overlays, Info
   ======================================== */

const sideMenu = document.getElementById("sideMenu");
const menuToggle = document.getElementById("menuToggle");
const menuIcon = document.getElementById("menuIcon");
const overlay = document.getElementById("overlay");

// Info overlay controls
const infoBtn = document.getElementById("infoBtn");
const infoOverlay = document.getElementById("infoOverlay");
const closeInfoOverlay = document.getElementById("closeInfoOverlay");

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

function updateOverlay() {
    const isSideOpen = sideMenu && sideMenu.classList.contains("open");
    const manualsPopup = document.getElementById("manualsPopup");
    const isManualsOpen = manualsPopup && manualsPopup.classList.contains("active");
    const isInfoOpen = infoOverlay && infoOverlay.classList.contains("active");
    const weatherOverlay = document.getElementById("weatherOverlay");
    const isWeatherOpen = weatherOverlay && weatherOverlay.classList.contains("active");

    if (isSideOpen || isManualsOpen || isInfoOpen || isWeatherOpen) {
        if(overlay) overlay.classList.add("active");
    } else {
        if(overlay) overlay.classList.remove("active");
    }
}

// MENU TOGGLE (folosește updateOverlay în loc de toggle direct)
if (menuToggle) {
    menuToggle.addEventListener("click", () => {
        // Prevent opening the side menu while the manuals popup is open
        if (document.getElementById("manualsPopup") && document.getElementById("manualsPopup").classList.contains("active")) return;

        const isOpen = sideMenu.classList.toggle("open");
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

// INFO OVERLAY
if (infoBtn) {
    infoBtn.addEventListener("click", () => {
        // close side menu if open for clarity
        if (sideMenu && sideMenu.classList.contains("open")) {
            sideMenu.classList.remove("open");
            menuIcon.classList.remove("fa-arrow-left");
            menuIcon.classList.add("fa-arrow-right");
        }
        if (document.getElementById("manualsPopup") && document.getElementById("manualsPopup").classList.contains("active")) {
            // prefer to close manuals popup first if it's open
            document.getElementById("manualsPopup").classList.remove("active");
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

// GLOBAL OVERLAY CLICK (Close top-most layer)
if (overlay) {
    overlay.addEventListener("click", () => {
        const weatherOverlay = document.getElementById("weatherOverlay");
        const manualsPopup = document.getElementById("manualsPopup");

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

/* --- COLLAPSIBLE RELEASE NOTES --- */
(function initReleaseNotesCollapsible() {
    const notes = document.querySelectorAll(".release-note");
    if (!notes || notes.length === 0) return;

    notes.forEach((note) => {
        const header = note.querySelector(".release-header");
        if (!header) return;

        if (!note.querySelector(".release-body")) {
            const body = document.createElement("div");
            body.className = "release-body";
            let sibling = header.nextElementSibling;
            while (sibling) {
                const next = sibling.nextElementSibling;
                body.appendChild(sibling);
                sibling = next;
            }
            note.appendChild(body);
        }

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