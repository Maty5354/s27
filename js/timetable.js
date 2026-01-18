/* ========================================
   TIMETABLE LOGIC: Highlighting & Interaction
   ======================================== */

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

    // Highlight day header
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

        const cellText = timeCell.textContent.trim();
        const cellHour = parseInt(cellText.split(":")[0]);

        if (cellHour === currentHour) {
            timeCell.classList.add("current-hour");
            const subjectCell = row.cells[dayOfWeek];
            if (subjectCell) {
                subjectCell.classList.add("current-cell");
            }
            break;
        }
    }
}

function setupSubjectHighlight() {
    const table = document.getElementById("timetable");
    if (!table) return;
    const rows = [...table.querySelectorAll("tr")];
    // skip header day-names row (first)
    rows.slice(1).forEach((row) => {
        const cells = [...row.children];
        // skip time column (first)
        cells.slice(1).forEach((cell) => {
            cell.classList.add("subject");
        });
    });
}

function startHighlightLoop() {
    highlightCurrent();
    setInterval(highlightCurrent, 2000);
}

// Initialize highlighting
setupSubjectHighlight();
startHighlightLoop();


/* --- CELL INTERACTION (Click & Keyboard) --- */
(function () {
    const table = document.getElementById("timetable");
    if (!table) return;

    // Mapping of subjects -> manual URLs
    const manualMap = {
        "arte plastice": "https://manuale.edu.ro/manuale/Clasa%20a%20VIII-a/Educatie%20plastica/Uy5DLiBMaXRlcmEgRWR1/",
        biologie: "https://manuale.edu.ro/manuale/Clasa%20a%20VIII-a/Biologie/Q29yaW50IExvZ2lzdGlj/",
        chimie: "https://manuale.edu.ro/manuale/Clasa%20a%20VIII-a/Chimie/QXJ0IEtsZXR0IFMuUi5M/#book/0-help",
        civică: "https://manuale.edu.ro/manuale/Clasa%20a%20VIII-a/Educatie%20sociala/Q0QgUHJlc3MgUy5SLkwu/book.html?book#0",
        engleză: "https://manuale.edu.ro/manuale/Clasa%20a%20VIII-a/Limba%20moderna%201-limba%20engleza/QXJ0IEtsZXR0IFMuUi5M/#book/0-help",
        franceză: "https://manuale.edu.ro/manuale/Clasa%20a%20VIII-a/Limba%20moderna%202%20franceza/Uy5DLiBCb29rbGV0IFMu/",
        fizică: "https://manuale.edu.ro/manuale/Clasa%20a%20VIII-a/Fizica/QXJ0IEtsZXR0IFMuUi5M/",
        geografie: "https://manuale.edu.ro/manuale/Clasa%20a%20VIII-a/Geografie/QXJ0IEtsZXR0IFMuUi5M/#book/0-help",
        informatică: "https://manuale.edu.ro/manuale/Clasa%20a%20VIII-a/Informatica%20si%20TIC/Uy5DLiBMaXRlcmEgRWR1/",
        istorie: "https://manuale.edu.ro/manuale/Clasa%20a%20VIII-a/Istorie/QWthZGVtb3MgQXJ0IFMu/interior.html",
        mate: "https://app.asq.ro/",
        muzică: "https://manuale.edu.ro/manuale/Clasa%20a%20VIII-a/Educatie%20muzicala/QXJ0IEtsZXR0IFMuUi5M/",
        română: "https://manuale.edu.ro/manuale/Clasa%20a%20VIII-a/Limba%20si%20literatura%20romana/QXJ0IEtsZXR0IFMuUi5M/A1948.pdf",
        religie: "https://manuale.edu.ro/manuale/Clasa%20a%20VIII-a/Religie%20Cultul%20Ortodox/QWthZGVtb3MgQXJ0IFMu/front-cover.html",
        sport: "#",
        tehnologică: "https://manuale.edu.ro/manuale/Clasa%20a%20VIII-a/Educatie%20tehnologica%20si%20aplicatii%20practice/Q0QgUHJlc3MgUy5SLkwu/book.html?book#0",
    };

    function normalizeSubject(text) {
        if (!text) return "";
        const withoutEmojis = text.replace(
            /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\uFE0F]/gu, ""
        );
        return withoutEmojis.replace(/[^0-9\p{L}\s\-]+/gu, "").trim().toLowerCase();
    }

    function openManual(url) {
        if (!url) return;
        window.open(url, "_blank");
    }

    const allRows = Array.from(table.querySelectorAll("tr"));
    const selectableRows = allRows.slice(1);
    const matrix = selectableRows.map((row) => {
        return Array.from(row.querySelectorAll("th,td")).slice(1);
    });
    const rowCount = matrix.length;
    const colCount = matrix[0] ? matrix[0].length : 0;
    let selected = { r: -1, c: -1 };

    function getCell(r, c) {
        if (r < 0 || c < 0 || r >= matrix.length || c >= matrix[r].length) return null;
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

    // Click: open textbook
    table.addEventListener("click", function (ev) {
        const cell = ev.target.closest("th, td");
        if (!cell || !table.contains(cell)) return;
        const tr = cell.parentElement;
        const rowIndex = allRows.indexOf(tr);
        if (rowIndex <= 0) return;
        const cellIndex = Array.from(tr.children).indexOf(cell);
        if (cellIndex === 0) return;

        const dataManual = cell.dataset.manual;
        if (dataManual) {
            openManual(dataManual);
            return;
        }
        const subjText = cell.innerText || cell.textContent;
        const subject = normalizeSubject(subjText);
        if (!subject) return;
        const found = manualMap[subject];
        if (found) {
            openManual(found);
            return;
        }
        openManual("https://manuale.edu.ro/?s=" + encodeURIComponent(subject));
    }, true);

    // Keyboard navigation
    document.addEventListener("keydown", function (ev) {
        if ((ev.key.startsWith("Arrow")) && selected.r === -1) {
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
                const isMarked = activeCell.getAttribute("data-marked") === "true";
                if (!isMarked) {
                    activeCell.innerHTML = "<mark>" + activeCell.innerHTML + "</mark>";
                    activeCell.setAttribute("data-marked", "true");
                } else {
                    activeCell.innerHTML = activeCell.innerHTML.replace(/<\/?mark>/g, "");
                    activeCell.setAttribute("data-marked", "false");
                }
                break;
        }
    });

    matrix.flat().forEach((cell) => {
        cell.tabIndex = -1;
    });
})();