
(function () {
    "use strict";
    const UI_KEY = "customization-ui-settings";
    const $ = (s) => document.querySelector(s),
        $$ = (s) => Array.from(document.querySelectorAll(s));
    const dom = {
        bottomNavbar: $("#bottomNavbar"),
        navToday: $("#navToday"),
        navFull: $("#navFull"),
        bottomMenuBtn: $("#bottomMenuBtn"),
        navShortcut1: $("#navShortcut1"),
        navShortcut2: $("#navShortcut2"),
        todayView: $("#todayView"),
        todayCards: $("#todayCards"),
        todayEmpty: $("#todayEmpty"),
        todayDate: $("#todayDate"),
        bottomSheet: $("#bottomSheet"),
        bottomSheetOverlay: $("#bottomSheetOverlay"),
        bottomSheetHandle: $(".bottom-sheet-handle-container"),
        timetableWrapper: $(".timetable-wrapper"),
        fullViewHeader: $("#fullViewHeader"),
        sheetCustomizationBtn: $("#sheetCustomizationBtn"),
        sheetManualsBtn: $("#sheetManualsBtn"),
        sheetClockBtn: $("#sheetClockBtn"),
        sheetTodoBtn: $("#sheetTodoBtn"),
        sheetInfoBtn: $("#sheetInfoBtn"),
        mobileHeaderTime: $("#mobileHeaderTime"),
        mobileHeaderDate: $("#mobileHeaderDate"),
    };
    const days = [
        { k: "monday", l: "Luni", s: "Lu" },
        { k: "tuesday", l: "Marti", s: "Ma" },
        { k: "wednesday", l: "Miercuri", s: "Mi" },
        { k: "thursday", l: "Joi", s: "Jo" },
        { k: "friday", l: "Vineri", s: "Vi" },
    ];
    const dayMap = {
        1: "monday",
        2: "tuesday",
        3: "wednesday",
        4: "thursday",
        5: "friday",
    };
    const shortcuts = {
        customization: ["fa-solid fa-sliders", "Custom"],
        textbooks: ["fa-solid fa-book", "Books"],
        clock: ["fa-solid fa-clock", "Clock"],
        tasks: ["fa-solid fa-list-check", "Tasks"],
        info: ["fa-solid fa-circle-info", "Info"],
    };
    let sched = null,
        manualMap = {},
        host = null,
        week = null,
        swipe = 0,
        tab = "monday",
        chips = "monday";
    
    // Bottom Sheet State
    let sheetState = "CLOSED"; // CLOSED, MIDDLE, FULL
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    let initialSheetHeight = 0;

    const modeClasses = [
        "layout-standard-landscape",
        "layout-cards-scroll",
        "layout-cards-swipe",
        "layout-accordion",
        "layout-tabs-text",
        "layout-tabs-pill",
        "layout-kanban-scroll",
        "layout-kanban-swipe",
        "layout-split-columns",
        "layout-timeline-stack",
        "layout-day-chips",
    ];

    function getUI() {
        try {
            return JSON.parse(localStorage.getItem(UI_KEY) || "{}");
        } catch {
            return {};
        }
    }
    function getAdv() {
        try {
            return JSON.parse(localStorage.getItem("advancedSettings") || "{}");
        } catch {
            return {};
        }
    }
    function mode() {
        return getUI().fullLayoutMode || "standard";
    }
    function isMobile() {
        return window.innerWidth <= 768;
    }
    function todayKey() {
        const devDayOverride = window.getDevDayOverride?.();
        const dayOfWeek = devDayOverride !== null ? devDayOverride : new Date().getDay();
        return dayMap[dayOfWeek] || null;
    }
    function nsub(t) {
        if (!t) return "";
        return t
            .replace(
                /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\uFE0F]/gu,
                "",
            )
            .replace(/[^0-9\p{L}\s\-]+/gu, "")
            .trim()
            .toLowerCase();
    }
    function now() {
        const devOverride = window.getDevTimeOverride?.();
        const devDayOverride = window.getDevDayOverride?.();
        const d = devOverride || new Date();
        const realDay = d.getDay();
        const day = devDayOverride !== null ? devDayOverride : realDay;
        return { h: d.getHours(), m: d.getMinutes(), day: day };
    }
    function stat(time, dayKey) {
        if (dayKey !== todayKey()) return "";
        const n = now(),
            cm = n.h * 60 + n.m;
        const [h, m] = time.split(":").map(Number);
        const classStartMinutes = h * 60 + (m || 0);
        const windowStart = classStartMinutes - 10;
        const windowEnd = classStartMinutes + 50;
        return cm >= windowStart && cm < windowEnd ? "current" : cm >= windowEnd ? "past" : "future";
    }
    function fDate(d) {
        const dd = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
        ];
        const mm = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
        ];
        return `${dd[d.getDay()]}, ${mm[d.getMonth()]} ${d.getDate()}`;
    }
    async function load() {
        const p = window.DATA_PATH || "../data/",
            id = window.CLASS_ID || "8a";
        try {
            const [a, b] = await Promise.all([
                fetch(`${p}${id}.json`),
                fetch(`${p}manuals.json`),
            ]);
            const j = await a.json();
            sched = j.schedule || [];
            const m = await b.json();
            m.forEach(
                (x) => x.subject && (manualMap[x.subject.toLowerCase()] = x.link),
            );
            week = null;
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }
    function ensureHost() {
        if (host) return host;
        const c = dom.timetableWrapper?.parentElement;
        if (!c) return null;
        host = document.createElement("section");
        host.id = "fullLayoutsHost";
        host.className = "full-layout-host";
        host.style.display = "none";
        c.insertBefore(host, dom.timetableWrapper.nextSibling);
        host.addEventListener("click", onHostClick);
        return host;
    }
    function buildWeek() {
        if (week) return week;
        const out = {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
        };
        (sched || []).forEach((r) =>
            days.forEach((d) => {
                const o = r[d.k];
                if (!o) return;
                let e = o.emoji || "";
                if (o.flag)
                    e = `<span class="${o.flag}" style="border-radius:var(--border-radius-sm);"></span>`;
                out[d.k].push({
                    time: r.time,
                    subject: o.name,
                    emoji: e,
                    dayKey: d.k,
                    status: stat(r.time, d.k),
                });
            }),
        );
        Object.keys(out).forEach(
            (k) => (out[k] = out[k].map((x, i) => ({ ...x, period: i + 1 }))),
        );
        week = out;
        return out;
    }
    function cards(entries, cls = "full-subject-card") {
        if (!entries.length) return '<div class="full-day-empty">No classes</div>';
        return entries
            .map(
                (e) =>
                    `<button type="button" class="${cls}${e.status ? ` ${e.status}` : ""}" data-subject-card="1" data-subject-name="${e.subject}"><div class="full-card-time"><div class="time">${e.time}</div><div class="period">Period ${e.period}</div></div><div class="full-card-emoji">${e.emoji}</div><div class="full-card-subject">${e.subject}</div></button>`,
            )
            .join("");
    }
    function panel(d, entries, c = "") {
        return `<section class="full-day-panel ${c}${todayKey() === d.k ? " is-today" : ""}"><header class="full-day-header"><h3>${d.l}</h3><span>${entries.length} classes</span></header><div class="full-day-cards">${cards(entries)}</div></section>`;
    }
    function renderCardsScroll(w) {
        return `<div class="layout-cards-scroll-wrap">${days.map((d) => panel(d, w[d.k] || [], "cards-scroll-day")).join("")}</div>`;
    }
    function renderAccordion(w) {
        return `<div class="layout-accordion-wrap">${days
            .map((d, i) => {
                const open =
                    d.k === todayKey() || (!todayKey() && i === 0) ? " open" : "";
                const en = w[d.k] || [];
                return `<details class="accordion-day"${open}><summary><span>${d.l}</span><span>${en.length} classes</span></summary><div class="accordion-content">${cards(en)}</div></details>`;
            })
            .join("")}</div>`;
    }
    function renderTabs(w, pill) {
        const a = (pill ? tab : tab) && w[tab] ? tab : todayKey() || "monday";
        tab = a;
        return `<div class="layout-tabs-wrap ${pill ? "tabs-pill" : "tabs-text"}"><div class="full-day-tabs">${days.map((d) => `<button type="button" class="full-day-tab ${d.k === a ? "active" : ""}" data-day-tab="${d.k}">${d.l}</button>`).join("")}</div><div class="full-day-tab-content">${panel(
            days.find((d) => d.k === a),
            w[a] || [],
            pill ? "tab-pill-day" : "tab-text-day",
        )}</div></div>`;
    }
    function renderKanbanScroll(w) {
        return `<div class="layout-kanban-scroll-wrap">${days
            .map((d) => {
                const en = w[d.k] || [];
                return `<section class="kanban-column"><header><h3>${d.l}</h3><span>${en.length}</span></header><div class="kanban-cards">${cards(en, "full-subject-card kanban-card")}</div></section>`;
            })
            .join("")}</div>`;
    }
    function renderSwipe(w, variant) {
        const d = days[swipe] || days[0],
            en = w[d.k] || [],
            kan = variant === "kanban-swipe";
        return `<div class="${kan ? "layout-kanban-swipe-wrap" : "layout-cards-swipe-wrap"}"><div class="swipe-head"><button type="button" class="swipe-nav" data-swipe-prev="1"><i class="fa-solid fa-chevron-left"></i></button><h3>${d.l}</h3><button type="button" class="swipe-nav" data-swipe-next="1"><i class="fa-solid fa-chevron-right"></i></button></div><div class="swipe-body" data-swipe-track="1">${kan ? `<section class="kanban-column swipe-kanban"><header><h3>${d.l}</h3><span>${en.length}</span></header><div class="kanban-cards">${cards(en, "full-subject-card kanban-card")}</div></section>` : panel(d, en, "swipe-day")}</div><div class="swipe-dots">${days.map((x, i) => `<button type="button" class="swipe-dot ${i === swipe ? "active" : ""}" data-swipe-dot="${i}"></button>`).join("")}</div></div>`;
    }
    function renderSplit(w) {
        const mk = (arr, t) =>
            `<div class="split-column"><h3>${t}</h3>${arr
                .map((k) =>
                    panel(
                        days.find((d) => d.k === k),
                        w[k] || [],
                        "split-day",
                    ),
                )
                .join("")}</div>`;
        return `<div class="layout-split-columns-wrap">${mk(["monday", "wednesday", "friday"], "Column A")}${mk(["tuesday", "thursday"], "Column B")}</div>`;
    }
    function renderTimeline(w) {
        return `<div class="layout-timeline-stack-wrap">${days
            .map((d) => {
                const en = w[d.k] || [];
                if (!en.length)
                    return `<section class="timeline-day"><header><h3>${d.l}</h3></header><div class="timeline-empty">No classes</div></section>`;
                return `<section class="timeline-day"><header><h3>${d.l}</h3></header><div class="timeline-list">${en.map((e) => `<button type="button" class="timeline-item ${e.status || ""}" data-subject-card="1" data-subject-name="${e.subject}"><div class="timeline-dot"></div><div class="timeline-main"><div class="timeline-time">${e.time}</div><div class="timeline-subject">${e.subject}</div></div><div class="timeline-emoji">${e.emoji}</div></button>`).join("")}</div></section>`;
            })
            .join("")}</div>`;
    }
    function renderChips(w) {
        const a = w[chips] ? chips : todayKey() || "monday";
        chips = a;
        return `<div class="layout-day-chips-wrap"><div class="day-chips-row">${days.map((d) => `<button type="button" class="day-chip ${d.k === a ? "active" : ""}" data-day-chip="${d.k}"><span>${d.s}</span></button>`).join("")}</div><div class="day-chips-content">${panel(
            days.find((d) => d.k === a),
            w[a] || [],
            "chips-day",
        )}</div></div>`;
    }
    function clearModeClass() {
        modeClasses.forEach((c) => document.body.classList.remove(c));
    }
    function setModeClass(m) {
        clearModeClass();
        const map = {
            "standard-landscape": "layout-standard-landscape",
            "cards-scroll": "layout-cards-scroll",
            "cards-swipe": "layout-cards-swipe",
            accordion: "layout-accordion",
            "tabs-text": "layout-tabs-text",
            "tabs-pill": "layout-tabs-pill",
            "kanban-scroll": "layout-kanban-scroll",
            "kanban-swipe": "layout-kanban-swipe",
            "split-columns": "layout-split-columns",
            "timeline-stack": "layout-timeline-stack",
            "day-chips": "layout-day-chips",
        };
        if (map[m]) document.body.classList.add(map[m]);
    }
    function effectiveMode() {
        const m = mode();
        if (isMobile()) {
            if (
                m === "standard-landscape" &&
                window.matchMedia("(orientation: portrait)").matches
            )
                return "standard";
            return m;
        }
        return m === "split-columns" ? m : "standard";
    }
    function setHeader(m) {
        const t = dom.fullViewHeader?.querySelector(".full-view-title");
        if (!t) return;
        const map = {
            standard: '<i class="fa-solid fa-table-cells"></i> Weekly Schedule',
            "standard-landscape":
                '<i class="fa-solid fa-mobile-screen"></i> Landscape Table',
            "cards-scroll": '<i class="fa-solid fa-id-card"></i> Weekly Cards',
            "cards-swipe": '<i class="fa-solid fa-left-right"></i> Swipe Cards',
            accordion: '<i class="fa-solid fa-list"></i> Accordion Days',
            "tabs-text": '<i class="fa-solid fa-table-list"></i> Text Tabs',
            "tabs-pill": '<i class="fa-solid fa-table-list"></i> Pill Tabs',
            "kanban-scroll": '<i class="fa-solid fa-columns"></i> Kanban Scroll',
            "kanban-swipe":
                '<i class="fa-solid fa-arrows-left-right"></i> Kanban Swipe',
            "split-columns":
                '<i class="fa-solid fa-table-columns"></i> Split Columns',
            "timeline-stack": '<i class="fa-solid fa-stream"></i> Timeline Stack',
            "day-chips": '<i class="fa-solid fa-calendar-week"></i> Day Chips',
        };
        t.innerHTML = map[m] || map.standard;
    }
    function attachSwipe(root) {
        const tr = root.querySelector('[data-swipe-track="1"]');
        if (!tr) return;
        let sx = 0,
            sy = 0;
        tr.addEventListener(
            "touchstart",
            (e) => {
                sx = e.touches[0].clientX;
                sy = e.touches[0].clientY;
            },
            { passive: true },
        );
        tr.addEventListener(
            "touchend",
            (e) => {
                const t = e.changedTouches?.[0];
                if (!t) return;
                const dx = t.clientX - sx,
                    dy = t.clientY - sy;
                if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return;
                swipe =
                    dx < 0
                        ? (swipe + 1) % days.length
                        : (swipe - 1 + days.length) % days.length;
                renderFull();
            },
            { passive: true },
        );
    }
    function renderFull() {
        if (!sched) return;
        const h = ensureHost();
        if (!h) return;
        const m = effectiveMode(),
            w = buildWeek();
        setModeClass(m);
        setHeader(m);
        const tableMode = m === "standard" || m === "standard-landscape";
        if (tableMode) {
            if (dom.timetableWrapper) dom.timetableWrapper.style.display = "";
            h.style.display = "none";
            h.innerHTML = "";
            return;
        }
        if (dom.timetableWrapper) dom.timetableWrapper.style.display = "none";
        h.style.display = "block";
        if (m === "cards-scroll") h.innerHTML = renderCardsScroll(w);
        else if (m === "cards-swipe") {
            h.innerHTML = renderSwipe(w, "cards-swipe");
            attachSwipe(h);
        } else if (m === "accordion") h.innerHTML = renderAccordion(w);
        else if (m === "tabs-text") h.innerHTML = renderTabs(w, false);
        else if (m === "tabs-pill") h.innerHTML = renderTabs(w, true);
        else if (m === "kanban-scroll") h.innerHTML = renderKanbanScroll(w);
        else if (m === "kanban-swipe") {
            h.innerHTML = renderSwipe(w, "kanban-swipe");
            attachSwipe(h);
        } else if (m === "split-columns") h.innerHTML = renderSplit(w);
        else if (m === "timeline-stack") h.innerHTML = renderTimeline(w);
        else if (m === "day-chips") h.innerHTML = renderChips(w);
        else {
            if (dom.timetableWrapper) dom.timetableWrapper.style.display = "";
            h.style.display = "none";
            h.innerHTML = "";
        }
    }
    function onHostClick(e) {
        const card = e.target.closest('[data-subject-card="1"]');
        if (card) {
            const m = getAdv().interactionMode || "link";
            if (m === "mark") {
                card.classList.toggle("marked-subject");
            } else {
                const s = nsub(card.getAttribute("data-subject-name") || "");
                const f = manualMap[s] || manualMap[s.split(" ")[0]];
                window.open(
                    f || `https://manuale.edu.ro/?s=${encodeURIComponent(s)}`,
                    "_blank",
                );
            }
            return;
        }
        const tb = e.target.closest("[data-day-tab]");
        if (tb) {
            tab = tb.getAttribute("data-day-tab") || "monday";
            renderFull();
            return;
        }
        const cb = e.target.closest("[data-day-chip]");
        if (cb) {
            chips = cb.getAttribute("data-day-chip") || "monday";
            renderFull();
            return;
        }
        const dt = e.target.closest("[data-swipe-dot]");
        if (dt) {
            const i = Number(dt.getAttribute("data-swipe-dot"));
            if (!Number.isNaN(i)) {
                swipe = Math.max(0, Math.min(days.length - 1, i));
                renderFull();
            }
            return;
        }
        if (e.target.closest('[data-swipe-prev="1"]')) {
            swipe = (swipe - 1 + days.length) % days.length;
            renderFull();
            return;
        }
        if (e.target.closest('[data-swipe-next="1"]')) {
            swipe = (swipe + 1) % days.length;
            renderFull();
        }
    }
    function fillToday() {
        if (!dom.todayCards || !dom.todayDate) return;
        const n = now();
        dom.todayDate.textContent = fDate(new Date());
        
        // Save marked cards before clearing
        const markedCards = new Set();
        dom.todayCards.querySelectorAll(".today-card.marked-subject").forEach((card) => {
            const periodEl = card.querySelector(".period");
            if (periodEl) {
                markedCards.add(periodEl.textContent.trim());
            }
        });
        
        dom.todayCards.innerHTML = "";
        if (!sched) {
            load().then((ok) => ok && fillToday());
            return;
        }
        const dk = dayMap[n.day];
        if (!dk) {
            dom.todayCards.style.display = "none";
            dom.todayEmpty?.classList.add("active");
            return;
        }
        const td = buildWeek()[dk] || [];
        if (!td.length) {
            dom.todayCards.style.display = "none";
            dom.todayEmpty?.classList.add("active");
            return;
        }
        dom.todayCards.style.display = "flex";
        dom.todayEmpty?.classList.remove("active");
        td.forEach((c, i) => {
            const el = document.createElement("div");
            const periodLabel = `Period ${c.period}`;
            el.className = `today-card ${c.status}${markedCards.has(periodLabel) ? " marked-subject" : ""}`;
            el.style.animationDelay = `${i * 0.05}s`;
            el.innerHTML = `<div class="today-card-time"><div class="time">${c.time}</div><div class="period">${periodLabel}</div></div><div class="today-card-emoji">${c.emoji}</div><div class="today-card-subject">${c.subject}</div>`;
            el.addEventListener("click", () => {
                const m = getAdv().interactionMode || "link";
                if (m === "mark") {
                    el.classList.toggle("marked-subject");
                } else {
                    const s = nsub(c.subject);
                    const f = manualMap[s] || manualMap[s.split(" ")[0]];
                    window.open(
                        f || `https://manuale.edu.ro/?s=${encodeURIComponent(s)}`,
                        "_blank",
                    );
                }
            });
            dom.todayCards.appendChild(el);
        });
    }
    function showToday() {
        if (!dom.todayView) return;
        dom.navToday?.classList.add("active");
        dom.navFull?.classList.remove("active");
        dom.todayView.classList.add("active");
        if (isMobile()) {
            dom.timetableWrapper && (dom.timetableWrapper.style.display = "none");
            ensureHost() && (ensureHost().style.display = "none");
        }
        fillToday();
    }
    function showFull() {
        if (!dom.todayView) return;
        dom.navFull?.classList.add("active");
        dom.navToday?.classList.remove("active");
        dom.todayView.classList.remove("active");
        renderFull();
    }

    // --- BOTTOM SHEET GESTURE LOGIC ---
    function openSheet() {
        if (!dom.bottomSheet || !dom.bottomSheetOverlay) return;
        sheetState = "MIDDLE";
        updateSheetState();
    }

    function closeSheet() {
        if (!dom.bottomSheet || !dom.bottomSheetOverlay) return;
        sheetState = "CLOSED";
        updateSheetState();
    }

    function updateSheetState() {
        if (!dom.bottomSheet || !dom.bottomSheetOverlay) return;
        
        // Ensure transitions are active for snapping
        dom.bottomSheet.style.transition = "transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), border-radius 0.3s ease";
        dom.bottomSheet.style.height = "100dvh"; // Always full height to avoid gaps when dragging up
        
        switch (sheetState) {
            case "CLOSED":
                dom.bottomSheet.classList.remove("active", "fullscreen");
                dom.bottomSheetOverlay.classList.remove("active");
                dom.bottomSheet.style.transform = "translateY(100%)";
                dom.bottomSheetOverlay.style.opacity = "0";
                document.body.style.overflow = "";
                break;
            case "MIDDLE":
                dom.bottomSheet.classList.add("active");
                dom.bottomSheet.classList.remove("fullscreen");
                dom.bottomSheetOverlay.classList.add("active");
                dom.bottomSheet.style.transform = "translateY(20dvh)";
                dom.bottomSheetOverlay.style.opacity = "1";
                document.body.style.overflow = "hidden";
                break;
            case "FULL":
                dom.bottomSheet.classList.add("active", "fullscreen");
                dom.bottomSheetOverlay.classList.add("active");
                dom.bottomSheet.style.transform = "translateY(0)";
                dom.bottomSheetOverlay.style.opacity = "1";
                document.body.style.overflow = "hidden";
                break;
        }
    }

    function initSheetGestures() {
        if (!dom.bottomSheet) return;

        dom.bottomSheet.addEventListener("touchstart", (e) => {
            const content = dom.bottomSheet.querySelector('.bottom-sheet-content');
            if (content && content.contains(e.target) && content.scrollTop > 0) return;

            isDragging = true;
            startY = e.touches[0].clientY;
            dom.bottomSheet.style.transition = "none";
        }, { passive: true });

        dom.bottomSheet.addEventListener("touchmove", (e) => {
            if (!isDragging) return;
            const y = e.touches[0].clientY;
            let deltaY = y - startY;
            currentY = deltaY;

            let baseOffset = 0;
            if (sheetState === "MIDDLE") baseOffset = window.innerHeight * 0.2;
            else if (sheetState === "FULL") baseOffset = 0;

            let finalTranslate = baseOffset + deltaY;
            
            // Limit top drag (resistance)
            if (finalTranslate < 0) finalTranslate = finalTranslate * 0.2;

            dom.bottomSheet.style.transform = `translateY(${finalTranslate}px)`;
            
            // Update overlay opacity if dragging down
            if (finalTranslate > baseOffset) {
                const progress = (finalTranslate - baseOffset) / (window.innerHeight - baseOffset);
                dom.bottomSheetOverlay.style.opacity = Math.max(0, 1 - progress);
            }
        }, { passive: true });

        dom.bottomSheet.addEventListener("touchend", (e) => {
            if (!isDragging) return;
            isDragging = false;
            
            const threshold = 100;
            const velocity = currentY; // Simple proxy for velocity

            if (sheetState === "MIDDLE") {
                if (currentY < -threshold) sheetState = "FULL";
                else if (currentY > threshold) sheetState = "CLOSED";
                else updateSheetState(); // Snap back
            } else if (sheetState === "FULL") {
                if (currentY > threshold) sheetState = "MIDDLE";
                else updateSheetState(); // Snap back
            }

            updateSheetState();
            currentY = 0;
        });
    }

    function trig(type) {
        // If clicking an action, usually close the sheet or just keep it open?
        // Prompt says "It can snap to 3 places... make bottom menu handle follow...".
        // It implies the menu is persistent. 
        // But clicking a button usually triggers an overlay (e.g. Customization).
        // If we open another overlay, we should probably hide the sheet or let OverlayManager handle stack.
        // OverlayManager puts new overlay on top. Sheet stays active underneath.
        
        // However, if we click 'Close' on sheet (top right), it should close.
        
        const map = {
            customization: "customizationBtn",
            textbooks: "allManualsBtn",
            clock: "clockBtn",
            tasks: "todoBtn",
            info: "infoBtn",
        };
        document.getElementById(map[type] || "")?.click();
    }
    
    function upShortcuts() {
        const s = getAdv(),
            a = s.shortcut1 || "customization",
            b = s.shortcut2 || "textbooks";
        if (dom.navShortcut1) {
            const [i, l] = shortcuts[a];
            dom.navShortcut1.querySelector("i").className = i;
            dom.navShortcut1.querySelector("span").textContent = l;
            dom.navShortcut1.dataset.shortcutType = a;
        }
        if (dom.navShortcut2) {
            const [i, l] = shortcuts[b];
            dom.navShortcut2.querySelector("i").className = i;
            dom.navShortcut2.querySelector("span").textContent = l;
            dom.navShortcut2.dataset.shortcutType = b;
        }
    }

    let last = 0;
    function onScroll() {
        if (!document.body.classList.contains("mobile-nav-scroll")) {
            dom.bottomNavbar && (dom.bottomNavbar.style.transform = "");
            return;
        }
        const st = window.pageYOffset || document.documentElement.scrollTop;
        if (st > last && st > 100) {
            dom.bottomNavbar &&
                (dom.bottomNavbar.style.transform = "translateY(100%)");
        } else {
            dom.bottomNavbar && (dom.bottomNavbar.style.transform = "translateY(0)");
        }
        last = st <= 0 ? 0 : st;
    }
    function onModeChange() {
        if (dom.todayView?.classList.contains("active") && isMobile()) return;
        renderFull();
    }
    function bind() {
        dom.navToday?.addEventListener("click", showToday);
        dom.navFull?.addEventListener("click", showFull);
        dom.bottomMenuBtn?.addEventListener("click", openSheet);
        dom.navShortcut1?.addEventListener("click", () =>
            trig(dom.navShortcut1.dataset.shortcutType || "customization"),
        );
        dom.navShortcut2?.addEventListener("click", () =>
            trig(dom.navShortcut2.dataset.shortcutType || "textbooks"),
        );
        dom.bottomSheetOverlay?.addEventListener("click", closeSheet);
        
        // Sheet Actions
        dom.sheetCustomizationBtn?.addEventListener("click", () => trig("customization"));
        dom.sheetManualsBtn?.addEventListener("click", () => trig("textbooks"));
        dom.sheetClockBtn?.addEventListener("click", () => trig("clock"));
        dom.sheetTodoBtn?.addEventListener("click", () => trig("tasks"));
        dom.sheetInfoBtn?.addEventListener("click", () => trig("info"));
        
        // Close Button in Sheet
        $(".bottom-sheet-close")?.addEventListener("click", closeSheet);

        initSheetGestures();

        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", () => {
            if (window.innerWidth > 768) showFull();
            else if (!dom.todayView?.classList.contains("active")) renderFull();
        });
        window.addEventListener("fullLayoutModeChanged", onModeChange);
        window.addEventListener("storage", (e) => {
            if (e.key === UI_KEY) onModeChange();
        });
    }
    function init() {
        const tk = todayKey(),
            i = days.findIndex((d) => d.k === tk);
        if (i >= 0) {
            swipe = i;
            tab = tk;
            chips = tk;
        }
        ensureHost();
        upShortcuts();
        if (isMobile()) showToday();
        else showFull();
        setInterval(() => {
            week = null;
            if (dom.todayView?.classList.contains("active")) fillToday();
            else renderFull();
        }, 30000);
    }
    bind();
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", async () => {
            await load();
            init();
        });
    } else {
        (async () => {
            await load();
            init();
        })();
    }
    window.mobileNav = {
        showTodayView: showToday,
        showFullView: showFull,
        openBottomSheet: openSheet,
        closeBottomSheet: closeSheet,
        updateShortcutButtons: upShortcuts,
        renderFullLayout: renderFull,
    };
})();
