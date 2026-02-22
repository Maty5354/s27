/* ========================================
   CUSTOMIZATION — THEMES TAB
   Dynamically loaded by customization.js
   ======================================== */

(async function () {
    "use strict";

    // State
    window.customThemeState = {
        allThemes: [],
        currentFilter: "all",
        currentSort: "az",
        searchQuery: "",
        activeTags: new Set(),
        allTags: new Set()
    };

    // Element References
    const themesSection = document.getElementById("themesSection");
    const creatorSection = document.getElementById("themeCreatorSection");

    // Initialize the module
    async function initThemesTab() {
        console.log("Themes tab initialized");
        setupDropdownListeners();
        setupSearchListeners();
        
        await loadThemesData();
        renderTags();
        renderThemes();
        
        setupCreatorListeners();
    }
    
    // --- Data Loading & Rendering --- //
    
    async function loadThemesData() {
        try {
            // Include both static themes from json and user saved themes from localStorage
            const res = await fetch(window.DATA_PATH + 'themes.json');
            if(res.ok) {
                const data = await res.json();
                window.customThemeState.allThemes = data.themes || [];
            }
            
            // Inject localStorage user presets
            const savedUserThemes = JSON.parse(localStorage.getItem('custom-themes') || '[]');
            if(savedUserThemes.length > 0) {
                 window.customThemeState.allThemes = window.customThemeState.allThemes.concat(savedUserThemes);
            }
            
            // Extract all unique tags
            window.customThemeState.allTags.clear();
            window.customThemeState.allThemes.forEach(t => {
                if(t.tags) t.tags.forEach(tag => window.customThemeState.allTags.add(tag));
            });
            
        } catch (err) {
            console.error("Failed to load themes", err);
        }
    }
    
    function renderTags() {
        const container = document.getElementById("themeTagsContainer");
        if(!container) return;
        container.innerHTML = "";
        
        // Sort tags alphabetically
        const sortedTags = Array.from(window.customThemeState.allTags).sort();
        
        sortedTags.forEach(tag => {
            const btn = document.createElement("button");
            btn.className = "theme-tag";
            btn.textContent = "#" + tag;
            if(window.customThemeState.activeTags.has(tag)) {
                btn.classList.add("active");
            }
            btn.addEventListener("click", () => {
                if(window.customThemeState.activeTags.has(tag)) {
                    window.customThemeState.activeTags.delete(tag);
                    btn.classList.remove("active");
                } else {
                    window.customThemeState.activeTags.add(tag);
                    btn.classList.add("active");
                }
                renderThemes(); // Update grid on tag change
            });
            container.appendChild(btn);
        });
    }
    
    function getFilteredAndSortedThemes() {
        let list = [...window.customThemeState.allThemes];
        const state = window.customThemeState;
        
        // 1. Text Search
        if(state.searchQuery) {
            const q = state.searchQuery.toLowerCase();
            list = list.filter(t => 
                t.name.toLowerCase().includes(q) || 
                (t.description && t.description.toLowerCase().includes(q)) ||
                (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
            );
        }
        
        // 2. Tag Filter
        if(state.activeTags.size > 0) {
            list = list.filter(t => t.tags && [...state.activeTags].every(active => t.tags.includes(active)));
        }
        
        // 3. Dropdown Filter
        switch (state.currentFilter) {
            case "system":
                list = list.filter(t => t.isSystemCreated);
                break;
            case "user":
                list = list.filter(t => !t.isSystemCreated);
                break;
            case "light":
                list = list.filter(t => t.isDarkThemed === false || t.id === 'light');
                break;
            case "dark":
                list = list.filter(t => t.isDarkThemed === true || t.id === 'dark');
                break;
        }
        
        // 4. Sort
        list.sort((a, b) => {
            if(state.currentSort === "az") {
                return a.name.localeCompare(b.name);
            } else if (state.currentSort === "za") {
                return b.name.localeCompare(a.name);
            } else if (state.currentSort === "date-desc") {
                return (b.createdAt || 0) - (a.createdAt || 0); // User themes will have timestamp
            } else if (state.currentSort === "date-asc") {
                return (a.createdAt || 0) - (b.createdAt || 0);
            }
            return 0;
        });
        
        return list;
    }
    
    function renderThemes() {
        const customGrid = document.getElementById("customThemesGrid");
        const systemGrid = document.getElementById("systemThemesGrid");
        const customCategory = document.getElementById("customThemesCategory");
        const systemCategory = document.getElementById("systemThemesCategory");
        if(!customGrid || !systemGrid) return;
        
        const themes = getFilteredAndSortedThemes();
        customGrid.innerHTML = "";
        systemGrid.innerHTML = "";
        
        const customThemes = themes.filter(t => !t.isSystemCreated);
        const systemThemes = themes.filter(t => t.isSystemCreated);
        
        if (customThemes.length > 0) {
            customCategory.style.display = "block";
            customThemes.forEach(t => renderThemeCard(t, customGrid));
        } else {
            customCategory.style.display = "none";
        }
        
        if (systemThemes.length > 0) {
            systemCategory.style.display = "block";
            systemThemes.forEach(t => renderThemeCard(t, systemGrid));
        } else {
            systemCategory.style.display = "none";
        }
        
        if (themes.length === 0) {
            systemCategory.style.display = "block";
            systemGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;"><i class="fa-solid fa-ghost"></i> No themes found matching your criteria.</div>`;
        }
    }
    
    function renderThemeCard(theme, container) {
        const currentActiveThemeId = localStorage.getItem('app-theme-id') || 'auto';
        
        const card = document.createElement("div");
        card.className = "theme-card";
        if (theme.id === currentActiveThemeId) {
            card.style.borderColor = "var(--accent-color)";
            card.style.boxShadow = "var(--box-shadow-md)";
        }
        card.dataset.id = theme.id;
        
        // Set inline styles for live preview block
        if(theme.colors && Object.keys(theme.colors).length > 0) {
            card.style.setProperty("--theme-card-bg", theme.colors["--card-bg"] || theme.colors["--surface-color"]);
            card.style.setProperty("--theme-text-color", theme.colors["--text-color"]);
            card.style.setProperty("--theme-text-muted", theme.colors["--text-muted"]);
            card.style.boxShadow = card.style.borderColor === "var(--accent-color)" ? "0 0 0 2px var(--accent-color)" : `0 4px 12px ${theme.colors["--shadow-color-strong"] || 'rgba(0,0,0,0.1)'}`;
        } else if (theme.id === 'auto') {
            card.style.background = "linear-gradient(135deg, var(--surface-alt) 0%, var(--card-bg) 100%)";
        }
        
        let dotsHtml = "";
        let dotColors = [];
        if(theme.id === 'auto') {
           dotColors = [theme.recommendedAccentColors[0], 'var(--surface-color)', 'var(--text-color)'];
        } else if (theme.colors) {
           dotColors = [
               theme.colors["--bg-color"],
               theme.colors["--card-bg"],
               theme.colors["--text-color"],
           ].filter(Boolean);
        }
        
        dotsHtml = dotColors.map(c => `<div class="theme-color-dot" style="background: ${c}"></div>`).join("");
        
        card.innerHTML = `
            <div class="theme-card-header">
                <div class="theme-card-icon">${theme.icon || "🎨"}</div>
                <div class="theme-card-info">
                    <h4>${theme.name}</h4>
                    <p>${theme.description || ""}</p>
                </div>
            </div>
            <div class="theme-card-colors">
                ${dotsHtml}
                ${theme.recommendedAccentColors && theme.recommendedAccentColors[0] ? `<div class="theme-color-dot" style="background: ${theme.recommendedAccentColors[0]}; border-color: ${theme.recommendedAccentColors[0]}"></div>` : ''}
            </div>
            ${!theme.isSystemCreated ? `<button class="delete-theme-btn" data-id="${theme.id}" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: var(--danger-color); cursor: pointer; padding: 5px; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; z-index: 2;"><i class="fa-solid fa-trash"></i></button>` : ''}
        `;
        
        card.addEventListener("click", (e) => {
            if(e.target.closest('.delete-theme-btn')) {
                deleteUserTheme(theme.id);
                return;
            }
            applyThemeToApp(theme);
        });
        
        container.appendChild(card);
    }

    // --- Actions --- //
    
    function applyThemeToApp(theme) {
        console.log("Applying theme:", theme.name);
        if(theme.id === 'auto') {
            document.documentElement.removeAttribute("data-theme");
            document.documentElement.style = ""; // Clear inline vars
            localStorage.removeItem('app-theme-id');
        } else {
            document.documentElement.setAttribute("data-theme", theme.isDarkThemed ? "dark" : "light");
            
            // Apply variables specifically if it's a custom theme with colors defined
            if(theme.colors && Object.keys(theme.colors).length > 0) {
                // Clear any old dynamically set vars
                document.documentElement.style = "";
                Object.entries(theme.colors).forEach(([key, value]) => {
                   document.documentElement.style.setProperty(key, value); 
                });
            } else if (theme.id === 'dark' || theme.id === 'light') {
                document.documentElement.style = "";
                document.documentElement.setAttribute("data-theme", theme.id);
            }
            localStorage.setItem('app-theme-id', theme.id);
        }
        
        // Update selection UI
        document.querySelectorAll(".theme-card").forEach(c => {
            c.style.borderColor = "var(--border-color)";
            c.style.boxShadow = "none";
        });
        const card = document.querySelector(`.theme-card[data-id="${theme.id}"]`);
        if(card) {
            card.style.borderColor = "var(--accent-color)";
            card.style.boxShadow = "var(--box-shadow-md)";
        }
    }
    
    function deleteUserTheme(id) {
        if(!confirm("Are you sure you want to delete this custom theme?")) return;
        window.customThemeState.allThemes = window.customThemeState.allThemes.filter(t => t.id !== id);
        
        // Save to local storage
        const savedUserThemes = JSON.parse(localStorage.getItem('custom-themes') || '[]');
        localStorage.setItem('custom-themes', JSON.stringify(savedUserThemes.filter(t => t.id !== id)));
        
        const currentActive = localStorage.getItem('app-theme-id');
        if (currentActive === id) {
             applyThemeToApp({id: 'auto'}); // reset to auto if deleted active theme
        }
        
        // Recalculate tags to ensure orphaned tags are removed
        window.customThemeState.allTags.clear();
        window.customThemeState.allThemes.forEach(t => {
            if(t.tags) t.tags.forEach(tag => window.customThemeState.allTags.add(tag));
        });
        
        renderTags();
        renderThemes();
    }

    // --- Search & Filters --- //
    
    function setupDropdownListeners() {
        document.querySelectorAll("#themeFilterDropdown, #themeSortDropdown").forEach((dd) => {
            const trigger = dd.querySelector(".cb-dropdown-trigger");
            const items = dd.querySelectorAll(".cb-dropdown-item");
            if(trigger) {
                trigger.addEventListener("click", (e) => {
                    e.stopPropagation();
                    dd.classList.toggle("open");
                });
            }
            items.forEach((item) => {
                item.addEventListener("click", () => {
                    items.forEach((i) => i.classList.remove("selected"));
                    item.classList.add("selected");
                    if(trigger && trigger.querySelector("span")) {
                        trigger.querySelector("span").innerHTML = `<i class="fa-solid fa-${dd.id.includes('Filter') ? 'filter' : 'sort'}"></i> ${item.textContent}`;
                    }
                    dd.classList.remove("open");
                    
                    if(dd.id === "themeFilterDropdown") {
                        window.customThemeState.currentFilter = item.dataset.filter;
                    } else if (dd.id === "themeSortDropdown") {
                        window.customThemeState.currentSort = item.dataset.sort;
                    }
                    renderThemes();
                });
            });
        });
    }

    function setupSearchListeners() {
        const searchInput = document.getElementById("themeSearch");
        if(searchInput) {
            searchInput.addEventListener("input", (e) => {
                window.customThemeState.searchQuery = e.target.value;
                renderThemes();
            });
        }
    }
    
    // --- Creator --- //
    
    function setupCreatorListeners() {
        const btn = document.getElementById("createThemeFab");
        const backBtn = document.getElementById("backToThemesBtn");
        const cancel = document.getElementById("cancelThemeBtn");
        const save = document.getElementById("saveThemeBtn");
        
        if(!btn) return;
        
        btn.addEventListener("click", () => {
            if(themesSection) themesSection.classList.remove('active');
            if(creatorSection) creatorSection.classList.add('active');
            
            // Re-bind just the accordion locally for this dynamic dom piece
            const advancedAccordion = document.querySelector("#themeCreatorSection .cb-accordion-header");
            if (advancedAccordion) {
                // Ensure only one listener by cloning or simply remove prior (though it's recreated every time so it won't duplicate mostly)
                advancedAccordion.onclick = function() {
                    const item = advancedAccordion.parentElement;
                    const body = item.querySelector('.cb-accordion-body');
                    const wasOpen = body.style.display === 'block';
                    body.style.display = wasOpen ? 'none' : 'block';
                    item.classList.toggle('open', !wasOpen);
                };
            }
            
            requestAnimationFrame(() => setupPickrs());
        });
        
        const closeCreator = () => {
            if(themesSection) themesSection.classList.add('active');
            if(creatorSection) creatorSection.classList.remove('active');
            destroyPickrs();
        };

        if(backBtn) backBtn.addEventListener("click", closeCreator);
        if(cancel) cancel.addEventListener("click", closeCreator);
        if(save) save.addEventListener("click", saveNewTheme);
    }
    
    let activePickrs = [];
    
    function setupPickrs() {
        const grid = document.getElementById("themeCreatorColors");
        const advGrid = document.getElementById("themeCreatorAdvancedColors");
        grid.innerHTML = "";
        advGrid.innerHTML = "";
        
        const requiredColors = [
            { id: '--bg-color', label: 'Background Color', default: '#121212', adv: false },
            { id: '--card-bg', label: 'Card Background', default: '#1e1e1e', adv: false },
            { id: '--text-color', label: 'Main Text', default: '#f0f0f0', adv: false },
            { id: '--text-muted', label: 'Muted Text', default: '#a0a0a0', adv: false },
            { id: '--highlight-color', label: 'Highlight', default: '#333333', adv: false },
            { id: '--shadow-color', label: 'Shadow', default: 'rgba(0,0,0,0.5)', adv: false },
            { id: '--overlay-bg', label: 'Overlay Bg', default: 'rgba(0,0,0,0.7)', adv: false },
            
            // Advanced mapping
            { id: '--surface-color', label: 'Surface', default: '#1e1e1e', adv: true },
            { id: '--surface-alt', label: 'Alt Surface', default: '#252525', adv: true },
            { id: '--input-bg', label: 'Input Bg', default: '#2c2c2c', adv: true },
            { id: '--border-color', label: 'Border', default: '#333333', adv: true },
            { id: '--divider-color', label: 'Divider', default: '#3d3d3d', adv: true },
            { id: '--danger-color', label: 'Danger', default: '#ef4444', adv: true },
            { id: '--danger-bg', label: 'Danger Bg', default: '#7f1d1d', adv: true },
            { id: '--success-color', label: 'Success', default: '#10b981', adv: true },
            { id: '--success-bg', label: 'Success Bg', default: '#064e3b', adv: true }
        ];
        
        requiredColors.forEach((c, idx) => {
            const group = document.createElement("div");
            group.className = "color-picker-group";
            group.innerHTML = `
                <label style="display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 5px; display: flex; justify-content: space-between;">
                    <span>${c.label}</span>
                    ${c.adv ? '<span style="font-size: 0.65rem; opacity: 0.5;">Auto</span>' : ''}
                </label>
                <div class="custom-color-picker-container" style="display: flex; align-items: center; gap: 10px; background: var(--input-bg); padding: 5px 10px; border-radius: var(--border-radius-sm); border: 1px solid var(--border-color);">
                    <div class="pickr-instance-new-${idx}"></div>
                    <div class="pickr-value" id="val-new-${idx}" style="font-family: monospace; font-size: 0.8rem; flex: 1;">${c.default}</div>
                </div>
            `;
            
            if (c.adv) advGrid.appendChild(group);
            else grid.appendChild(group);
            
            // initialize Pickr for this component
            if(window.Pickr) {
                const p = Pickr.create({
                    el: `.pickr-instance-new-${idx}`,
                    theme: 'classic',
                    default: c.default,
                    components: {
                        preview: true,
                        opacity: true,
                        hue: true,
                        interaction: { hex: true, rgba: true, input: true, save: true }
                    }
                });
                
                p.on('save', (color, instance) => {
                    const rgbaObj = color.toRGBA();
                    let colorStr = color.toHEXA().toString();
                    if(rgbaObj[3] < 1) colorStr = color.toRGBA().toString(3); // use rgba
                    
                    document.getElementById(`val-new-${idx}`).textContent = colorStr;
                    instance.hide();
                });
                activePickrs.push({id: c.id, index: idx, instance: p});
            }
        });
    }
    
    function destroyPickrs() {
        activePickrs.forEach(p => {
             if (p.instance) {
                 try { p.instance.destroyAndRemove(); } catch(e) {}
             }
        });
        activePickrs = [];
    }
    
    function saveNewTheme() {
        const name = document.getElementById("newThemeName").value || "My Theme";
        const desc = document.getElementById("newThemeDesc").value || "User created theme";
        const icon = document.getElementById("newThemeIcon").value || "✨";
        const isDark = document.getElementById("newThemeIsDark").checked;
        
        let colors = {};
        activePickrs.forEach(p => {
             const val = document.getElementById(`val-new-${p.index}`).textContent;
             // For advanced colors, we might want to know if they were explicitly changed, 
             // but Pickr doesn't easily let us know if it's default or not. 
             // We'll calculate the base ones and optionally use the advanced ones.
             colors[p.id] = val;
        });
        
        // Auto Calculate missing ones based on inputs
        colors["--surface-color"] = colors["--card-bg"]; // usually same
        colors["--surface-alt"] = colors["--bg-color"]; // simple approximation
        colors["--input-bg"] = colors["--highlight-color"]; 
        colors["--border-color"] = isDark ? '#333333' : '#e0e0e0';
        colors["--divider-color"] = isDark ? '#3d3d3d' : '#e5e5e5';
        colors["--shadow-color-strong"] = colors["--shadow-color"];
        colors["--shadow-color-modal"] = colors["--overlay-bg"];
        colors["--overlay-bg-strong"] = isDark ? "rgba(0,0,0,0.9)" : "rgba(0,0,0,0.85)";
        
        // Let's set some default danger/success etc
        colors["--danger-color"] = "#ef4444";
        colors["--danger-hover"] = isDark ? "#f87171" : "#dc2626";
        colors["--danger-bg"] = isDark ? "#7f1d1d" : "#fecaca";
        colors["--success-color"] = "#10b981";
        colors["--success-bg"] = isDark ? "#064e3b" : "#d1fae5";
        
        const newTheme = {
            id: 'user-' + Date.now(),
            name,
            description: desc,
            icon,
            isDarkThemed: isDark,
            isSystemCreated: false,
            createdAt: Date.now(),
            tags: ["custom", isDark ? "dark" : "light"],
            colors,
            recommendedAccentColors: [] 
        };
        
        // Save
        const savedUserThemes = JSON.parse(localStorage.getItem('custom-themes') || '[]');
        savedUserThemes.push(newTheme);
        localStorage.setItem('custom-themes', JSON.stringify(savedUserThemes));
        
        window.customThemeState.allThemes.unshift(newTheme); // Add to top of local state
        window.customThemeState.allTags.add("custom");
        if(isDark) window.customThemeState.allTags.add("dark");
        else window.customThemeState.allTags.add("light");
        
        // Cleanup UI
        document.getElementById("newThemeName").value = '';
        document.getElementById("newThemeDesc").value = '';
        document.getElementById("newThemeIcon").value = '';
        if(themesSection) themesSection.classList.add('active');
        if(creatorSection) creatorSection.classList.remove('active');
        destroyPickrs();
        
        renderTags();
        renderThemes();
        applyThemeToApp(newTheme); // Apply newly created!
    }

    initThemesTab();

})();
