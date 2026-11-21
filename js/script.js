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
   11. START THE APP
   The script is loaded with "defer", so the HTML is ready here.
   ========================================================= */
initTheme();
initVisitor();
initSectionToggles();

/* =========================================================
   Contact form and project search (from Assignment 2)
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

// ===== Project live search =====
const searchInput = document.getElementById("project-search");
const projectCards = document.querySelectorAll(".project-card");
const noProjectsMessage = document.getElementById("no-projects");

searchInput.addEventListener("input", function () {
    const searchText = searchInput.value.toLowerCase().trim();
    let visibleCount = 0;

    projectCards.forEach(function (card) {
        const cardText = card.textContent.toLowerCase();

        if (cardText.includes(searchText)) {
            card.style.display = "";
            visibleCount++;
        } else {
            card.style.display = "none";
        }
    });

    // Show the empty message only when no project matches
    noProjectsMessage.hidden = visibleCount > 0;
});
