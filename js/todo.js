/* ========================================
   ADVANCED TO-DO LIST SYSTEM
   ======================================== */
(function () {
    "use strict";
    
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

        const totalEl = document.getElementById("totalTasks");
        const complEl = document.getElementById("completedTasks");
        const pendEl = document.getElementById("pendingTasks");
        
        if (totalEl) totalEl.textContent = total;
        if (complEl) complEl.textContent = completed;
        if (pendEl) pendEl.textContent = pending;
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
        const items = document.querySelectorAll(".sort-criteria-item");
        items.forEach((item, index) => {
            if (index < currentSort.length) {
                const criteria = currentSort[index];
                const label = item.querySelector(".sort-field-label");
                const select = item.querySelector(".sort-field-select");
                const orderBtn = item.querySelector(".sort-order-btn");

                if (label) label.textContent = `Sort ${index + 1}:`;
                if (select) select.value = criteria.field;
                if (orderBtn) {
                    orderBtn.innerHTML =
                        criteria.order === "asc"
                            ? '<i class="fa-solid fa-arrow-up"></i>'
                            : '<i class="fa-solid fa-arrow-down"></i>';
                    orderBtn.dataset.order = criteria.order;
                }
                item.style.display = "flex";
            } else {
                item.style.display = "none";
            }
        });
    }

    // Render tasks
    function renderTasks() {
        const container = document.getElementById("todoListContainer");
        if (!container) return;
        
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
        const modalTitle = document.getElementById("modalTitle");
        const taskTitle = document.getElementById("taskTitle");
        const taskDesc = document.getElementById("taskDescription");
        const taskCat = document.getElementById("taskCategory");
        const taskDl = document.getElementById("taskDeadline");
        
        if (modalTitle) modalTitle.textContent = "✨ Create New Task";
        if (taskTitle) taskTitle.value = "";
        if (taskDesc) taskDesc.value = "";
        if (taskCat) taskCat.value = "";
        if (taskDl) taskDl.value = "";

        document.querySelectorAll(".priority-btn").forEach((btn) => btn.classList.remove("active"));
        const medBtn = document.querySelector(".priority-btn.medium");
        if (medBtn) medBtn.classList.add("active");
        currentPriority = "medium";

        document
            .querySelectorAll(".difficulty-btn")
            .forEach((btn) => btn.classList.remove("active"));
        const medDiffBtn = document.querySelector(".difficulty-btn.medium");
        if (medDiffBtn) medDiffBtn.classList.add("active");
        currentDifficulty = "medium";

        updateCategoryDropdown();
        const modal = document.getElementById("taskModal");
        if (modal) modal.classList.add("active");
    }

    // Open edit modal
    function openEditModal(task) {
        editingTaskId = task.id;
        const modalTitle = document.getElementById("modalTitle");
        const taskTitle = document.getElementById("taskTitle");
        const taskDesc = document.getElementById("taskDescription");
        const taskCat = document.getElementById("taskCategory");
        const taskDl = document.getElementById("taskDeadline");
        
        if (modalTitle) modalTitle.innerHTML = "<i class='fa-solid fa-pencil'></i> Edit Task";
        if (taskTitle) taskTitle.value = task.text;
        if (taskDesc) taskDesc.value = task.description || "";
        if (taskCat) taskCat.value = task.category || "";
        if (taskDl) taskDl.value = task.dueDate || "";

        document.querySelectorAll(".priority-btn").forEach((btn) => btn.classList.remove("active"));
        const priorityBtn = document.querySelector(`.priority-btn.${task.priority}`);
        if (priorityBtn) priorityBtn.classList.add("active");
        currentPriority = task.priority;

        document
            .querySelectorAll(".difficulty-btn")
            .forEach((btn) => btn.classList.remove("active"));
        const diffBtn = document.querySelector(
            `.difficulty-btn[data-difficulty="${task.difficulty || "medium"}"]`
        );
        if (diffBtn) diffBtn.classList.add("active");
        currentDifficulty = task.difficulty || "medium";

        updateCategoryDropdown();
        const modal = document.getElementById("taskModal");
        if (modal) modal.classList.add("active");
    }

    // Save task
    function saveTask() {
        const taskTitle = document.getElementById("taskTitle");
        const taskDesc = document.getElementById("taskDescription");
        const taskCat = document.getElementById("taskCategory");
        const taskDl = document.getElementById("taskDeadline");
        
        const title = taskTitle ? taskTitle.value.trim() : "";
        const description = taskDesc ? taskDesc.value.trim() : "";
        const category = taskCat ? taskCat.value : "";
        const deadline = taskDl ? taskDl.value : "";

        if (!title) {
            alert("Please enter a task title");
            return;
        }

        if (editingTaskId) {
            // Edit existing task
            const task = tasks.find((t) => t.id === editingTaskId);
            if (task) {
                task.text = title;
                task.description = description;
                task.priority = currentPriority;
                task.difficulty = currentDifficulty;
                task.category = category;
                task.dueDate = deadline || null;
            }
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
        const modal = document.getElementById("taskModal");
        if (modal) modal.classList.remove("active");
    }

    // Update category dropdown
    function updateCategoryDropdown() {
        const select = document.getElementById("taskCategory");
        if (!select) return;
        
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
        if (!container) return;
        
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
        const name = input ? input.value.trim() : "";

        if (!name) return;

        if (categories.includes(name)) {
            alert("This category already exists!");
            return;
        }

        categories.push(name);
        if (input) input.value = "";
        saveData();
        renderCategories();
        updateCategoryDropdown();
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
    if (toggleSortBtn && sortPanel) {
        toggleSortBtn.addEventListener("click", () => {
            sortPanel.classList.toggle("collapsed");
            const icon = toggleSortBtn.querySelector("i");
            if (sortPanel.classList.contains("collapsed")) {
                if (icon) {
                    icon.classList.remove("fa-chevron-up");
                    icon.classList.add("fa-chevron-down");
                }
            } else {
                if (icon) {
                    icon.classList.remove("fa-chevron-down");
                    icon.classList.add("fa-chevron-up");
                }
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
    const addTaskBtn = document.getElementById("addTaskBtn");
    if (addTaskBtn) addTaskBtn.addEventListener("click", openAddModal);

    const manageCatBtn = document.getElementById("manageCategoriesBtn");
    if (manageCatBtn) {
        manageCatBtn.addEventListener("click", () => {
            renderCategories();
            updateCategoryDropdown();
            const catModal = document.getElementById("categoryModal");
            if (catModal) catModal.classList.add("active");
        });
    }

    // Modal buttons
    const saveTaskBtn = document.getElementById("saveTaskBtn");
    if (saveTaskBtn) saveTaskBtn.addEventListener("click", saveTask);

    const cancelTaskBtn = document.getElementById("cancelTaskBtn");
    if (cancelTaskBtn) {
        cancelTaskBtn.addEventListener("click", () => {
            const taskModal = document.getElementById("taskModal");
            if (taskModal) taskModal.classList.remove("active");
        });
    }

    const closeCatModal = document.getElementById("closeCategoryModal");
    if (closeCatModal) {
        closeCatModal.addEventListener("click", () => {
            const catModal = document.getElementById("categoryModal");
            if (catModal) catModal.classList.remove("active");
        });
    }

    const addCatBtn = document.getElementById("addCategoryBtn");
    if (addCatBtn) addCatBtn.addEventListener("click", addCategory);

    const newCatInput = document.getElementById("newCategoryInput");
    if (newCatInput) {
        newCatInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") addCategory();
        });
    }

    // Overlay controls
    const todoBtn = document.getElementById("todoBtn");
    const todoOverlay = document.getElementById("todoOverlay");
    const closeTodoBtn = document.getElementById("closeTodoOverlay");

    if (todoBtn && todoOverlay) {
        todoBtn.addEventListener("click", () => {
            todoOverlay.classList.add("active");
            document.body.classList.add("no-scroll-todo");
            renderTasks();
        });
    }

    if (closeTodoBtn && todoOverlay) {
        closeTodoBtn.addEventListener("click", () => {
            todoOverlay.classList.remove("active");
            document.body.classList.remove("no-scroll-todo");
        });
    }

    // Close modals when clicking outside
    const taskModal = document.getElementById("taskModal");
    if (taskModal) {
        taskModal.addEventListener("click", (e) => {
            if (e.target.id === "taskModal") {
                taskModal.classList.remove("active");
            }
        });
    }

    const catModal = document.getElementById("categoryModal");
    if (catModal) {
        catModal.addEventListener("click", (e) => {
            if (e.target.id === "categoryModal") {
                catModal.classList.remove("active");
            }
        });
    }

    // Initialize
    function init() {
        loadData();
        renderTasks();
        updateSortDisplay();

        // Check notifications every minute (desktop only)
        if (window.innerWidth > 768) {
            setInterval(checkNotifications, 60000);
            checkNotifications();
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();