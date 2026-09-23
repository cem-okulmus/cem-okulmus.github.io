// Theme management
class ThemeManager {
    constructor() {
        var theme = '';
        var event = window.matchMedia('(prefers-color-scheme: dark)');
        if (event.matches) {
            console.log("Color scheme changed: Dark mode activated.");
            theme = 'dark';
        } else {
            console.log("Color scheme changed: Light mode activated.");
            theme = 'light';
        }
        this.theme = theme;
        this.init();
    }

    init() {
        // Set initial theme
        this.setTheme(this.theme);
        
        // Add event listener to theme toggle button
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
    }

    setTheme(theme) {
        this.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Update theme toggle button aria-label
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.setAttribute('aria-label', 
                theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
            );
            // Update icon visibility explicitly to avoid any flash
            const sun = themeToggle.querySelector('.sun-icon');
            const moon = themeToggle.querySelector('.moon-icon');
            if (sun && moon) {
                if (theme === 'dark') {
                    sun.style.display = 'block';
                    moon.style.display = 'none';
                } else {
                    sun.style.display = 'none';
                    moon.style.display = 'block';
                }
            }
        }
    }

    toggleTheme() {
        const newTheme = this.theme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }
}

// Mobile navigation management
class MobileNavigation {
    constructor() {
        this.menuOpen = false;
        this.init();
    }

    init() {
        const mobileButton = document.getElementById('toggle-navigation-menu');
        const header = document.getElementById('main-header');
        
        if (mobileButton && header) {
            mobileButton.addEventListener('click', () => {
                this.toggleMenu(header, mobileButton);
            });
        }

        // Close menu when clicking on navigation links (mobile)
        const navLinks = document.querySelectorAll('#navigation-menu a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (this.menuOpen && header && mobileButton) {
                    this.toggleMenu(header, mobileButton);
                }
            });
        });

        // Close menu when clicking outside (mobile)
        document.addEventListener('click', (e) => {
            if (this.menuOpen && 
                !e.target.closest('#main-header') && 
                header && mobileButton) {
                this.toggleMenu(header, mobileButton);
            }
        });

        // Handle touch events for better mobile interaction
        document.addEventListener('touchstart', (e) => {
            if (this.menuOpen && 
                !e.target.closest('#main-header') && 
                header && mobileButton) {
                this.toggleMenu(header, mobileButton);
            }
        }, { passive: true });

        // Handle escape key to close menu
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.menuOpen && header && mobileButton) {
                this.toggleMenu(header, mobileButton);
            }
        });
    }

    toggleMenu(header, button) {
        this.menuOpen = !this.menuOpen;
        
        if (this.menuOpen) {
            header.classList.add('menu-open');
            document.body.classList.add('menu-open');
            // Prevent background scrolling on mobile
            document.body.style.overflow = 'hidden';
        } else {
            header.classList.remove('menu-open');
            document.body.classList.remove('menu-open');
            // Restore background scrolling
            document.body.style.overflow = '';
        }
        
        button.setAttribute('aria-expanded', this.menuOpen.toString());
    }
}

// Smooth scrolling for navigation links
class SmoothScroll {
    constructor() {
        this.init();
    }

    init() {
        // Handle navigation link clicks
        const navLinks = document.querySelectorAll('a[href^="#"]');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    // Compute dynamic offset based on actual header height
                    const header = document.getElementById('main-header');
                    const headerHeight = header ? Math.ceil(header.getBoundingClientRect().height) : 0;
                    const extraMargin = 8; // small breathing room below the header
                    const targetRect = targetElement.getBoundingClientRect();
                    const targetPosition = window.pageYOffset + targetRect.top - (headerHeight + extraMargin);
                    
                    // Immediately update active state for better UX
                    const sectionId = targetId.substring(1);
                    const navigationHighlight = window.navigationHighlightInstance;
                    if (navigationHighlight) {
                        navigationHighlight.highlightNavLink(sectionId);
                    }
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                    
                    // Update URL without triggering scroll
                    history.pushState(null, null, targetId);
                }
            });
        });
    }
}

// Active navigation link highlighting
class NavigationHighlight {
    constructor() {
        this.sections = [];
        this.navLinks = [];
        this.init();
    }

    init() {
        // Get all sections and navigation links
        this.sections = document.querySelectorAll('section[id]');
        this.navLinks = document.querySelectorAll('#navigation-menu a[href^="#"]');
        
        if (this.sections.length > 0 && this.navLinks.length > 0) {
            // Set initial active state based on URL hash only
            this.setInitialActiveState();
            
            // Handle hash changes (but no scroll-based highlighting)
            window.addEventListener('hashchange', () => {
                this.handleHashChange();
            });
        }
    }

    setInitialActiveState() {
        const hash = window.location.hash;
        if (hash && hash !== '#') {
            const targetId = hash.substring(1);
            this.highlightNavLink(targetId);
        }
        // No default active state - only highlight when there's a hash in URL
    }

    handleHashChange() {
        const hash = window.location.hash;
        if (hash && hash !== '#') {
            const targetId = hash.substring(1);
            this.highlightNavLink(targetId);
        } else {
            // Clear all active states when there's no hash
            this.clearAllActiveStates();
        }
    }

    highlightNavLink(activeId) {
        // Remove active class from all links
        this.navLinks.forEach(link => {
            link.classList.remove('active');
            link.removeAttribute('aria-current');
        });

        // Add active class to current link
        const activeLink = document.querySelector(`#navigation-menu a[href="#${activeId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
            activeLink.setAttribute('aria-current', 'page');
        }
    }

    // Method to clear all active states (useful for debugging)
    clearAllActiveStates() {
        this.navLinks.forEach(link => {
            link.classList.remove('active');
            link.removeAttribute('aria-current');
        });
    }
}

// Performance optimization: Lazy load images if any are added
class LazyImageLoader {
    constructor() {
        this.init();
    }

    init() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        observer.unobserve(img);
                    }
                });
            });

            const lazyImages = document.querySelectorAll('img[data-src]');
            lazyImages.forEach(img => imageObserver.observe(img));
        }
    }
}

// Publications use a compact per-entry format (see publications.md) instead
// of hand-written HTML cards, so new papers can be added as a few fields
// rather than by copying the full <div> markup. This turns that format into
// the same publication-card HTML that styles.css targets, before the result
// is handed to marked() like any other section.
function renderPublicationTitle(rawTitle) {
    const linkMatch = rawTitle.match(/^\[(.+)\]\((.+)\)$/);
    if (linkMatch) {
        return `<a href="${linkMatch[2]}" class="publication-link">${marked.parseInline(linkMatch[1])}</a>`;
    }
    return marked.parseInline(rawTitle);
}

// A field's value is its "key:" line plus any following indented lines (blank
// lines in between allowed), with their common indentation removed, so a value
// can hold several paragraphs or a nested list.
function parsePublicationBlock(blockLines) {
    const fields = { title: blockLines[0].replace(/^###\s*/, '').trim() };
    let key = null;
    let continuation = [];

    const finishField = () => {
        if (!key) return;
        const indents = continuation
            .filter(line => line.trim())
            .map(line => line.match(/^\s*/)[0].length);
        const common = indents.length ? Math.min(...indents) : 0;
        const rest = continuation.map(line => line.slice(common)).join('\n');
        fields[key] = `${fields[key]}\n${rest}`.trim();
        key = null;
        continuation = [];
    };

    for (const line of blockLines.slice(1)) {
        const match = line.match(/^([a-zA-Z]+):\s*(.*)$/);
        if (match) {
            finishField();
            key = match[1].toLowerCase();
            // Not trimmed here: trailing spaces before a continuation line are
            // a Markdown hard line break. finishField() trims the whole value.
            fields[key] = match[2];
        } else if (key && (line.trim() === '' || /^\s/.test(line))) {
            continuation.push(line);
        } else {
            finishField();
        }
    }
    finishField();
    return fields;
}

function renderPublicationCard(fields, year, tldrId) {
    // Built as an array and joined, rather than interpolated with blank
    // lines for absent fields: a whitespace-only line here would read to
    // marked() as a paragraph break, splitting this raw HTML in two and
    // causing everything after it to render as escaped text instead of
    // markup.
    const tagsInner = [
        `<span class="tag tag-safety">${fields.tags || ''}</span>`,
        fields.arxiv && `<a href="${fields.arxiv}" class="tag tag-arxiv">arXiv</a>`,
        fields.code && `<a href="${fields.code}" class="tag tag-code">Source Code</a>`,
        fields.slides && `<a href="${fields.slides}" class="tag tag-workshop">Talk Slides</a>`,
        fields.tldr && `<button class="publication-tldr-toggle" type="button" aria-expanded="false" aria-controls="${tldrId}">More Info</button>`,
    ].filter(Boolean).join('\n                ');

    const descriptionHtml = fields.description
        ? `<div class="publication-description">${marked.parseInline(fields.description)}</div>\n            `
        : '';

    // Line breaks in the rendered HTML are encoded as &#10; so it all sits on
    // one line: a blank line inside it (e.g. from a code block) would end this
    // raw HTML block when the page source goes through marked() again.
    const panelHtml = fields.tldr
        ? `
    <div class="publication-tldr-panel" id="${tldrId}">
        <div class="publication-tldr-inner">
            <div class="publication-tldr-content">${marked.parse(fields.tldr).trim().replace(/\n/g, '&#10;')}</div>
        </div>
    </div>`
        : '';

    const idAttr = fields.id ? ` id="${fields.id}"` : '';

    return `<div class="publication-card"${idAttr}>
    <div class="publication-main">
        <div class="publication-image">
            <img src="${fields.image}">
        </div>
        <div class="publication-content">
            <h3 class="publication-title">${renderPublicationTitle(fields.title)}</h3>
            <div class="publication-venue">${marked.parseInline(fields.venue || '')}</div>
            <div class="publication-authors">${marked.parseInline(fields.authors || '')}</div>
            ${descriptionHtml}<div class="publication-year">${year}</div>
            <div class="publication-tags">
                ${tagsInner}
            </div>
        </div>
    </div>${panelHtml}
</div>`;
}

function transformPublicationsSource(source) {
    const lines = source.split('\n');
    const output = [];
    let currentYear = '';
    let block = null;
    let cardIndex = 0;

    const flush = () => {
        if (block) {
            output.push(renderPublicationCard(parsePublicationBlock(block), currentYear, `pub-tldr-${cardIndex++}`));
            block = null;
        }
    };

    for (const line of lines) {
        const yearMatch = line.match(/^##\s+(.+)$/);
        const titleMatch = line.match(/^###\s+/);

        if (yearMatch) {
            flush();
            currentYear = yearMatch[1].trim();
            output.push(line);
        } else if (titleMatch) {
            flush();
            block = [line];
        } else if (block) {
            block.push(line);
        } else {
            output.push(line);
        }
    }
    flush();

    return output.join('\n\n');
}

// Markdown content loader
class MarkdownLoader {
    constructor() {
        this.sections = ['about', 'news', 'publications', 'resources', 'resume', 'teaching', 'scienza','etc'];
        this.init();
    }

    init() {
        // Load all markdown sections
        this.sections.forEach(section => {
            this.loadMarkdown(section);
        });
    }

    async loadMarkdown(section) {
        const contentElement = document.getElementById(`${section}-content`);
        if (!contentElement) return;

        // Try multiple path strategies for better compatibility
        const pathsToTry = [
            `./${section}.md`,           // Relative to current directory
            `${section}.md`,             // Direct relative path
            `/${section}.md`             // Absolute from root (for some GitHub Pages setups)
        ];

        let lastError = null;
        
        for (const fullPath of pathsToTry) {
            try {
                console.log(`Trying to fetch: ${fullPath}`);
                const response = await fetch(fullPath);
                if (response.ok) {
                    const markdown = await response.text();
                    const source = section === 'publications'
                        ? transformPublicationsSource(markdown)
                        : markdown;
                    const html = marked.parse(source);
                    contentElement.innerHTML = html;
                    contentElement.querySelectorAll('a[href]').forEach(a => {
                        if (!a.getAttribute('href').startsWith('#')) {
                            a.setAttribute('target', '_blank');
                            a.setAttribute('rel', 'noopener noreferrer');
                        }
                    });
                    // Apply hover effect to new content
                    if (typeof window.applyBHoverEffect === 'function') {
                        window.applyBHoverEffect(contentElement);
                    }
                    console.log(`Successfully loaded ${section} from: ${fullPath}`);
                    return; // Success, exit early
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            } catch (error) {
                console.warn(`Failed to load ${section} from ${fullPath}:`, error.message);
                lastError = error;
                // Continue to next path
            }
        }

        // If we get here, all paths failed
        console.error(`Error loading ${section} content - all paths failed:`, lastError);
        console.log(`Current location: ${window.location.href}`);
        contentElement.innerHTML = `
            <div class="error-message">
                <p>Sorry, unable to load ${section} content at this time.</p>
                <p><small>Last error: ${lastError?.message || 'Unknown error'}</small></p>
                <p><small>Tried paths: ${pathsToTry.join(', ')}</small></p>
            </div>
        `;
        // Apply hover effect to error content
        if (typeof window.applyBHoverEffect === 'function') {
            window.applyBHoverEffect(contentElement);
        }
    }

}

// Publication "More Info" toggle. Uses event delegation since the
// publication cards are injected into the DOM later by MarkdownLoader.
document.addEventListener('click', (e) => {
    const toggle = e.target.closest('.publication-tldr-toggle');
    if (!toggle) return;
    const panel = document.getElementById(toggle.getAttribute('aria-controls'));
    if (!panel) return;

    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!isOpen));
    panel.classList.toggle('is-open', !isOpen);
});

// Configure marked to open external links in a new tab
marked.use({
    renderer: {
        link({ href, title, text }) {
            const isExternal = href && !href.startsWith('#');
            const titleAttr = title ? ` title="${title}"` : '';
            const targetAttr = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
            return `<a href="${href}"${titleAttr}${targetAttr}>${text}</a>`;
        }
    }
});

// Initialize all functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all components
    new ThemeManager();
    new MobileNavigation();
    new SmoothScroll();
    
    // Make NavigationHighlight available globally for smooth scroll integration
    window.navigationHighlightInstance = new NavigationHighlight();
    
    new LazyImageLoader();
    new MarkdownLoader();

    
    // Add loading state management
    document.body.classList.add('loaded');
});

// Handle page visibility changes (pause animations when not visible)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        document.body.classList.add('paused');
    } else {
        document.body.classList.remove('paused');
    }
});

// Add keyboard navigation support
document.addEventListener('keydown', (e) => {
    // Handle keyboard navigation for theme toggle
    if (e.key === 't' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.click();
        }
    }
});

// Add reduced motion support
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (prefersReducedMotion.matches) {
    document.documentElement.style.setProperty('scroll-behavior', 'auto');
}

// Listen for changes in motion preference
prefersReducedMotion.addEventListener('change', () => {
    if (prefersReducedMotion.matches) {
        document.documentElement.style.setProperty('scroll-behavior', 'auto');
    } else {
        document.documentElement.style.setProperty('scroll-behavior', 'smooth');
    }
});



// Handle changes in the color scheme
const handleColorSchemeChange = (event) => {
    if (event.matches) {
        console.log("Color scheme changed: Dark mode activated.");
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        console.log("Color scheme changed: Light mode activated.");
        document.documentElement.setAttribute('data-theme', 'light');
    }
};

// change system theme trigger this function
// Add event listener for changes in the color scheme
if (window.matchMedia) {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeMediaQuery.addEventListener('change', handleColorSchemeChange);
} else {
    console.warn("window.matchMedia is not supported on this browser.");
}



