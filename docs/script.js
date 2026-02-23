class ThemeManager {
    constructor() {
        this.themes = ['auto', 'light', 'dark'];
        this.currentTheme = 'auto';
        this.init();
    }

    init() {
        this.loadTheme();
        this.addListeners();
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            this.currentTheme = savedTheme;
        } else {
            this.currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        this.applyTheme();
    }

    addListeners() {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (this.currentTheme === 'auto') {
                this.currentTheme = e.matches ? 'dark' : 'light';
                this.applyTheme();
            }
        });
    }

    cycleTheme() {
        let currentIndex = this.themes.indexOf(this.currentTheme);
        currentIndex = (currentIndex + 1) % this.themes.length;
        this.currentTheme = this.themes[currentIndex];
        this.saveTheme();
        this.applyTheme();
    }

    saveTheme() {
        localStorage.setItem('theme', this.currentTheme);
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        document.querySelector('button').setAttribute('aria-label', `Current theme: ${this.currentTheme}`);
    }
}

const themeManager = new ThemeManager();