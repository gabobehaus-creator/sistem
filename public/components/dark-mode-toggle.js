class DarkModeToggle extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        this.shadow.innerHTML = `
            <style>
                button {
                    background-color: var(--primary-color, #0056b3);
                    color: var(--menu-text-color, white);
                    border: none;
                    padding: 8px 15px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.9em;
                    transition: background-color 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                button:hover {
                    background-color: var(--menu-hover-bg, #004494);
                }
                .icon {
                    font-size: 1.1em;
                }
            </style>
            <button id="darkModeToggle">
                <span class="icon" id="toggleIcon"></span>
                <span id="toggleText"></span>
            </button>
        `;
    }

    connectedCallback() {
        this.button = this.shadow.getElementById('darkModeToggle');
        this.toggleIcon = this.shadow.getElementById('toggleIcon');
        this.toggleText = this.shadow.getElementById('toggleText');

        this.button.addEventListener('click', () => this.toggleDarkMode());

        // Apply initial state from localStorage
        this.applyInitialState();

        // Listen for system theme changes and update if no explicit user preference is set
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
            if (localStorage.getItem('dark-mode') === null) {
                this.updateThemeBasedOnSystem(event.matches);
            }
        });
    }

    applyInitialState() {
        const isDarkModeStored = localStorage.getItem('dark-mode');

        if (isDarkModeStored === null) {
            // No preference stored, use system preference
            const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.updateThemeBasedOnSystem(prefersDarkScheme);
        } else {
            // Use stored preference
            this.updateThemeBasedOnPreference(isDarkModeStored === 'true');
        }
    }

    updateThemeBasedOnSystem(prefersDark) {
        if (prefersDark) {
            document.documentElement.classList.add('dark-mode');
            this.updateButtonText(true);
        } else {
            document.documentElement.classList.remove('dark-mode');
            this.updateButtonText(false);
        }
    }

    updateThemeBasedOnPreference(isDarkMode) {
        if (isDarkMode) {
            document.documentElement.classList.add('dark-mode');
            this.updateButtonText(true);
        } else {
            document.documentElement.classList.remove('dark-mode');
            this.updateButtonText(false);
        }
    }

    toggleDarkMode() {
        const isCurrentlyDarkMode = document.documentElement.classList.contains('dark-mode');
        if (isCurrentlyDarkMode) {
            document.documentElement.classList.remove('dark-mode');
            localStorage.setItem('dark-mode', 'false');
            this.updateButtonText(false);
        } else {
            document.documentElement.classList.add('dark-mode');
            localStorage.setItem('dark-mode', 'true');
            this.updateButtonText(true);
        }
    }

    updateButtonText(isDarkMode) {
        if (isDarkMode) {
            this.toggleIcon.textContent = '🌙'; // Luna
            this.toggleText.textContent = 'Modo Claro';
        } else {
            this.toggleIcon.textContent = '☀️'; // Sol
            this.toggleText.textContent = 'Modo Oscuro';
        }
    }
}

customElements.define('dark-mode-toggle', DarkModeToggle);
