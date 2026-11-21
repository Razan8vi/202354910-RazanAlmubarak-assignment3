/* =========================================================
   Razan Almubarak – Portfolio script (Assignment 3)

   Contents
   1. Settings and storage keys
   2. Storage helpers (localStorage / sessionStorage)
   3. Small utilities
   4. Theme (light / dark mode)
   5. Visitor name and greeting
   6. Show / hide sections
   7. Projects: filter, level and sort
   8. GitHub repositories (external API)
   9. Contact form validation
   10. Time-on-site timer
   11. Start the app
   ========================================================= */

"use strict";

/* =========================================================
   1. SETTINGS AND STORAGE KEYS
   ========================================================= */
const GITHUB_USERNAME = "Razan8vi";
const GITHUB_CACHE_MINUTES = 10;

// One place for every key the site saves, so names never get mixed up
const STORAGE_KEYS = {
    theme: "portfolio.theme",
    visitorName: "portfolio.visitorName",
    visitCount: "portfolio.visitCount",
    hiddenSections: "portfolio.hiddenSections",
    projectFilters: "portfolio.projectFilters",
    githubCache: "portfolio.githubCache",
    sessionStart: "portfolio.sessionStart"
};

/* =========================================================
   2. STORAGE HELPERS
   Storage can be blocked (private mode, strict privacy
   settings), so every read and write is wrapped in try/catch.
   The site keeps working; it just does not remember things.
   ========================================================= */
function readStorage(storage, key, fallback) {
    try {
        const raw = storage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
    } catch (error) {
        return fallback;
    }
}

function writeStorage(storage, key, value) {
    try {
        storage.setItem(key, JSON.stringify(value));
    } catch (error) {
        // Storage is full or blocked: ignore, the value just won't be remembered
    }
}

function removeStorage(storage, key) {
    try {
        storage.removeItem(key);
    } catch (error) {
        // Nothing to do if storage is blocked
    }
}

/* =========================================================
   3. SMALL UTILITIES
   ========================================================= */

// Escape text before putting it inside innerHTML (protects against
// HTML injection, e.g. from text that comes back from the API)
function escapeHTML(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// Wait until the user stops typing before running a function
function debounce(callback, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => callback.apply(this, args), delay);
    };
}

/* =========================================================
   4. THEME (LIGHT / DARK MODE)
   A small script in <head> applies the saved theme before the
   page is drawn. This part keeps the button in sync and saves
   every change.
   ========================================================= */
const themeToggle = document.getElementById("theme-toggle");

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;

    // The button shows the theme you will switch TO
    const isDark = theme === "dark";
    themeToggle.textContent = isDark ? "☀ Light mode" : "☾ Dark mode";
    themeToggle.setAttribute("aria-pressed", String(!isDark));
}

function initTheme() {
    applyTheme(document.documentElement.dataset.theme || "dark");

    themeToggle.addEventListener("click", () => {
        const current = document.documentElement.dataset.theme;
        const next = current === "dark" ? "light" : "dark";
        applyTheme(next);
        writeStorage(localStorage, STORAGE_KEYS.theme, next);
    });
}

/* =========================================================
   5. VISITOR NAME AND GREETING
   The greeting combines three things: the time of day
   (from Assignment 1), the saved visitor name, and how many
   times this browser has visited the site.
   ========================================================= */
const greetingElement = document.getElementById("greeting");
const visitorForm = document.getElementById("visitor-form");
const visitorInput = document.getElementById("visitor-name");
const visitorError = document.getElementById("visitor-error");
const changeNameButton = document.getElementById("change-name");

// Letters from any language (so Arabic names work), spaces, - and '
const NAME_PATTERN = /^[\p{L}][\p{L}\s'-]*$/u;

// Holds the current visitor state while the page is open
const visitorState = {
    name: readStorage(localStorage, STORAGE_KEYS.visitorName, ""),
    visits: 0
};

function getTimeOfDay() {
    const hour = new Date().getHours();

    if (hour < 12) {
        return "Good morning";
    } else if (hour < 18) {
        return "Good afternoon";
    }
    return "Good evening";
}

// Returns an error message, or an empty string when the name is fine
function validateVisitorName(name) {
    if (name === "") {
        return "Please type a name first.";
    }
    if (name.length < 2 || name.length > 30) {
        return "Your name should be 2 to 30 characters.";
    }
    if (!NAME_PATTERN.test(name)) {
        return "Please use letters only.";
    }
    return "";
}

// Count one visit per browser session (reloading does not add a visit)
function countVisit() {
    const savedCount = readStorage(localStorage, STORAGE_KEYS.visitCount, 0);
    const alreadyCounted = readStorage(sessionStorage, STORAGE_KEYS.visitCount, false);

    if (alreadyCounted) {
        return savedCount;
    }

    const newCount = savedCount + 1;
    writeStorage(localStorage, STORAGE_KEYS.visitCount, newCount);
    writeStorage(sessionStorage, STORAGE_KEYS.visitCount, true);
    return newCount;
}

function renderGreeting() {
    const { name, visits } = visitorState;
    const timeOfDay = getTimeOfDay();

    if (name && visits > 1) {
        greetingElement.textContent = `${timeOfDay}, ${name}! Welcome back. This is visit number ${visits}.`;
    } else if (name) {
        greetingElement.textContent = `${timeOfDay}, ${name}! Thanks for visiting my portfolio.`;
    } else {
        greetingElement.textContent = `${timeOfDay}! Thanks for visiting my portfolio.`;
    }

    // Show the form only when no name is saved
    visitorForm.hidden = Boolean(name);
    changeNameButton.hidden = !name;
}

function initVisitor() {
    visitorState.visits = countVisit();
    renderGreeting();

    visitorForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const name = visitorInput.value.trim();
        const errorText = validateVisitorName(name);

        if (errorText) {
            visitorError.textContent = errorText;
            visitorInput.classList.add("input-error");
            return;
        }

        visitorError.textContent = "";
        visitorInput.classList.remove("input-error");
        visitorState.name = name;
        writeStorage(localStorage, STORAGE_KEYS.visitorName, name);
        renderGreeting();
        document.dispatchEvent(new CustomEvent("visitor:changed", { detail: { name } }));
    });

    changeNameButton.addEventListener("click", () => {
        visitorState.name = "";
        removeStorage(localStorage, STORAGE_KEYS.visitorName);
        visitorInput.value = "";
        renderGreeting();
        visitorInput.focus();
    });
}

/* =========================================================
   6. SHOW / HIDE SECTIONS
   Every button with data-toggle-section="<id>" hides or shows
   the body of that section. The list of hidden sections is
   saved, so the page looks the same on the next visit.
   ========================================================= */
const sectionToggleButtons = document.querySelectorAll("[data-toggle-section]");

function setSectionVisibility(button, isVisible) {
    const body = document.getElementById(button.getAttribute("aria-controls"));
    const sectionName = button.dataset.label;

    body.hidden = !isVisible;
    button.setAttribute("aria-expanded", String(isVisible));
    button.textContent = isVisible ? "Hide" : "Show";
    button.setAttribute("aria-label", `${isVisible ? "Hide" : "Show"} ${sectionName}`);
}

function initSectionToggles() {
    const hiddenSections = new Set(readStorage(localStorage, STORAGE_KEYS.hiddenSections, []));

    sectionToggleButtons.forEach((button) => {
        const sectionId = button.dataset.toggleSection;
        setSectionVisibility(button, !hiddenSections.has(sectionId));

        button.addEventListener("click", () => {
            const willShow = button.getAttribute("aria-expanded") === "false";
            setSectionVisibility(button, willShow);

            if (willShow) {
                hiddenSections.delete(sectionId);
            } else {
                hiddenSections.add(sectionId);
            }
            writeStorage(localStorage, STORAGE_KEYS.hiddenSections, [...hiddenSections]);
        });
    });
}

/* =========================================================
   7. PROJECTS: FILTER, LEVEL AND SORT
   The projects are stored as data and drawn by JavaScript.
   Every change runs the same pipeline:
   category filter -> level filter -> search -> sort -> render
   ========================================================= */
const PROJECTS = [
    {
        title: "BYTO – Book Your Truck Online",
        description: "A front-end project from my training at Tuwaiq Academy: a truck-booking app that supports Arabic and English. It gave me more experience in building structured screens and applying core development concepts to a practical use case.",
        category: "mobile",
        level: "intermediate",
        date: "2025-08",
        tags: ["Front-end", "Arabic / English", "Tuwaiq Academy"],
        image: { src: "assets/images/byto-app.webp", alt: "BYTO app language selection screen", width: 640, height: 480 }
    },
    {
        title: "Personal Portfolio Website",
        description: "My first portfolio website (Assignment 1), built with HTML, CSS, and JavaScript. It includes an About Me section, project cards, a contact form, and a time-of-day greeting.",
        category: "web",
        level: "beginner",
        date: "2026-09",
        tags: ["HTML", "CSS", "JavaScript"],
        image: { src: "assets/images/portfolio-a1.webp", alt: "Screenshot of my Assignment 1 portfolio website", width: 800, height: 450 },
        link: "https://github.com/Razan8vi/202354910-razan-almubarak-assignment1"
    },
    {
        title: "Interactive Portfolio",
        description: "Assignment 2 made the portfolio interactive: a live project search, contact form validation with clear error messages, and animated feedback.",
        category: "web",
        level: "intermediate",
        date: "2026-10",
        tags: ["DOM events", "Form validation", "CSS animation"],
        link: "https://github.com/Razan8vi/202354910-RazanAlmubarak-assignment2"
    },
    {
        title: "Advanced Portfolio (this site)",
        description: "Assignment 3 connects the portfolio to the GitHub REST API and adds project filtering and sorting, a saved light/dark theme, a remembered visitor name, and a time-on-site timer.",
        category: "web",
        level: "advanced",
        date: "2026-11",
        tags: ["REST API", "async / await", "localStorage"],
        link: "https://github.com/Razan8vi/202354910-RazanAlmubarak-assignment3"
    },
    {
        title: "KFUPM PeerLearn",
        description: "A team software engineering project for a peer-tutoring platform for KFUPM students. We gathered and analyzed the requirements, then modeled them with UML use case diagrams and low-fidelity GUI mockups.",
        category: "software-engineering",
        level: "advanced",
        date: "2026-04",
        tags: ["Requirements", "UML", "Team project"]
    }
];

const CATEGORY_LABELS = {
    all: "All",
    web: "Web",
    mobile: "Mobile",
    "software-engineering": "Software Engineering"
};

const LEVEL_LABELS = {
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced"
};

// A different message for each level the visitor chooses
const LEVEL_MESSAGES = {
    all: "Pick a level to see projects that match what you are looking for.",
    beginner: "Beginner projects: my first steps with HTML, CSS, and JavaScript.",
    intermediate: "Intermediate projects: interactive features, validation, and real use cases.",
    advanced: "Advanced projects: APIs, saved state, and team-based software engineering."
};

const DEFAULT_FILTERS = { category: "all", level: "all", sort: "newest" };

const projectsList = document.getElementById("projects-list");
const projectSearch = document.getElementById("project-search");
const categoryButtons = document.querySelectorAll("[data-category]");
const levelSelect = document.getElementById("level-select");
const sortSelect = document.getElementById("sort-select");
const resetFiltersButton = document.getElementById("reset-filters");
const levelMessage = document.getElementById("level-message");
const resultsCount = document.getElementById("results-count");
const noProjectsMessage = document.getElementById("no-projects");

// Saved choices + the search text (the search is not saved on purpose)
const projectState = {
    ...DEFAULT_FILTERS,
    ...readStorage(localStorage, STORAGE_KEYS.projectFilters, {}),
    search: ""
};

// "2026-10" -> "Oct 2026"
function formatMonth(yearMonth) {
    const [year, month] = yearMonth.split("-").map(Number);
    return new Date(year, month - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// Step 1–3: keep only the projects that pass every rule
function filterProjects(projects, { category, level, search }) {
    const searchText = search.toLowerCase();

    return projects.filter((project) => {
        const matchesCategory = category === "all" || project.category === category;
        const matchesLevel = level === "all" || project.level === level;
        const searchableText = [project.title, project.description, ...project.tags].join(" ").toLowerCase();
        const matchesSearch = searchText === "" || searchableText.includes(searchText);

        return matchesCategory && matchesLevel && matchesSearch;
    });
}

// Step 4: sort a copy (never change the original array)
function sortProjects(projects, sortBy) {
    const sorted = [...projects];

    if (sortBy === "newest") {
        sorted.sort((a, b) => b.date.localeCompare(a.date));
    } else if (sortBy === "oldest") {
        sorted.sort((a, b) => a.date.localeCompare(b.date));
    } else if (sortBy === "title") {
        sorted.sort((a, b) => a.title.localeCompare(b.title));
    }
    return sorted;
}

function createProjectCard(project) {
    const image = project.image
        ? `<img src="${project.image.src}" alt="${escapeHTML(project.image.alt)}" class="project-img"
                width="${project.image.width}" height="${project.image.height}" loading="lazy">`
        : `<div class="project-img project-img-placeholder" aria-hidden="true">${escapeHTML(project.title.charAt(0))}</div>`;

    const tags = project.tags.map((tag) => `<li>${escapeHTML(tag)}</li>`).join("");

    const link = project.link
        ? `<a class="project-link" href="${project.link}" target="_blank" rel="noopener">View code on GitHub<span class="visually-hidden"> (opens in a new tab)</span></a>`
        : "";

    return `
        <li class="project-card">
            ${image}
            <div class="project-meta">
                <span class="badge badge-${project.level}">${LEVEL_LABELS[project.level]}</span>
                <span>${CATEGORY_LABELS[project.category]}</span>
                <span aria-hidden="true">•</span>
                <time datetime="${project.date}">${formatMonth(project.date)}</time>
            </div>
            <h3>${escapeHTML(project.title)}</h3>
            <p>${escapeHTML(project.description)}</p>
            <ul class="tag-list" aria-label="Technologies">${tags}</ul>
            ${link}
        </li>`;
}

// Builds a specific hint, e.g. "No advanced mobile projects match "abc"."
function getEmptyMessage({ category, level, search }) {
    const levelText = level === "all" ? "" : `${LEVEL_LABELS[level].toLowerCase()} `;
    const categoryText = category === "all" ? "" : `${CATEGORY_LABELS[category]} `;
    const searchText = search ? ` matching "${search}"` : "";

    return `No ${levelText}${categoryText}projects${searchText} yet. Try another level or category, or reset the filters.`;
}

function renderProjects() {
    const visibleProjects = sortProjects(filterProjects(PROJECTS, projectState), projectState.sort);

    projectsList.innerHTML = visibleProjects.map(createProjectCard).join("");
    resultsCount.textContent = `Showing ${visibleProjects.length} of ${PROJECTS.length} projects`;
    levelMessage.textContent = LEVEL_MESSAGES[projectState.level];

    noProjectsMessage.hidden = visibleProjects.length > 0;
    noProjectsMessage.textContent = getEmptyMessage(projectState);

    // Keep the controls in sync with the state
    categoryButtons.forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.category === projectState.category));
    });
    levelSelect.value = projectState.level;
    sortSelect.value = projectState.sort;

    // The reset button only appears when something is different from the default
    const isDefault = projectState.category === DEFAULT_FILTERS.category
        && projectState.level === DEFAULT_FILTERS.level
        && projectState.sort === DEFAULT_FILTERS.sort
        && projectState.search === "";
    resetFiltersButton.hidden = isDefault;
}

// Change part of the state, save the filters, and draw again
function updateProjects(changes) {
    Object.assign(projectState, changes);

    const { category, level, sort } = projectState;
    writeStorage(localStorage, STORAGE_KEYS.projectFilters, { category, level, sort });
    renderProjects();
}

function initProjects() {
    // Ignore saved values that are no longer valid (e.g. an old category)
    if (!(projectState.category in CATEGORY_LABELS)) {
        projectState.category = DEFAULT_FILTERS.category;
    }
    if (!(projectState.level in LEVEL_MESSAGES)) {
        projectState.level = DEFAULT_FILTERS.level;
    }
    if (!["newest", "oldest", "title"].includes(projectState.sort)) {
        projectState.sort = DEFAULT_FILTERS.sort;
    }

    categoryButtons.forEach((button) => {
        button.addEventListener("click", () => updateProjects({ category: button.dataset.category }));
    });

    levelSelect.addEventListener("change", () => updateProjects({ level: levelSelect.value }));
    sortSelect.addEventListener("change", () => updateProjects({ sort: sortSelect.value }));

    // Wait 200 ms after the last key press instead of redrawing on every key
    projectSearch.addEventListener("input", debounce(() => {
        updateProjects({ search: projectSearch.value.trim() });
    }, 200));

    resetFiltersButton.addEventListener("click", () => {
        projectSearch.value = "";
        updateProjects({ ...DEFAULT_FILTERS, search: "" });
    });

    renderProjects();
}

/* =========================================================
   Contact form (from Assignment 2)
   ========================================================= */
// ===== Contact form validation =====
const contactForm = document.getElementById("contact-form");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const messageInput = document.getElementById("message");
const formMessage = document.getElementById("form-message");

// Simple pattern: text@text.text
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function showError(input, errorId, message) {
    document.getElementById(errorId).textContent = message;
    input.classList.add("input-error");
}

function clearError(input, errorId) {
    document.getElementById(errorId).textContent = "";
    input.classList.remove("input-error");
}

contactForm.addEventListener("submit", function (event) {
    event.preventDefault(); // stop the page from reloading

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const message = messageInput.value.trim();
    let isValid = true;

    formMessage.textContent = "";
    formMessage.classList.remove("success");

    if (name === "") {
        showError(nameInput, "name-error", "Please enter your name.");
        isValid = false;
    } else {
        clearError(nameInput, "name-error");
    }

    if (email === "") {
        showError(emailInput, "email-error", "Please enter your email.");
        isValid = false;
    } else if (!emailPattern.test(email)) {
        showError(emailInput, "email-error", "Please enter a valid email, like name@example.com.");
        isValid = false;
    } else {
        clearError(emailInput, "email-error");
    }

    if (message === "") {
        showError(messageInput, "message-error", "Please write a message before sending.");
        isValid = false;
    } else {
        clearError(messageInput, "message-error");
    }

    if (isValid) {
        formMessage.textContent = "Thank you, " + name + "! Your message has been received.";
        formMessage.classList.add("success");
        contactForm.reset();
    }
});

/* =========================================================
   11. START THE APP
   The script is loaded with "defer", so the HTML is ready here.
   ========================================================= */
initTheme();
initVisitor();
initSectionToggles();
initProjects();
