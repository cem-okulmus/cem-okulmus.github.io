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
                    window.publicationFilterInstance?.reveal(targetElement);

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

// Publication "More Info" toggle. The cards are rendered into the page by
// build.mjs; one delegated listener handles all of them.
document.addEventListener('click', (e) => {
    const toggle = e.target.closest('.publication-tldr-toggle');
    if (!toggle) return;
    const panel = document.getElementById(toggle.getAttribute('aria-controls'));
    if (!panel) return;

    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!isOpen));
    panel.classList.toggle('is-open', !isOpen);
});

// Search text is compared after folding: lowercase, accents dropped and
// compatibility forms unified (so "el" also finds "ℰℒ"). Folding is done per
// character and keeps where each folded character came from, so matches can be
// mapped back onto the original text for highlighting.
function foldWithMap(text) {
    let folded = '';
    const starts = [];
    const ends = [];
    let offset = 0;
    for (const ch of text) {
        const f = ch.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
        for (let k = 0; k < f.length; k++) {
            starts.push(offset);
            ends.push(offset + ch.length);
        }
        folded += f;
        offset += ch.length;
    }
    return { folded, starts, ends };
}

function foldText(text) {
    return foldWithMap(text).folded;
}

// Search, tag filter and sorting for the publication list. The list itself is
// prerendered by build.mjs (year headings, each followed by its cards); this
// only adds the controls and shows, hides and reorders what is already there,
// so the section still reads fine without JavaScript.
class PublicationFilter {
    constructor(container) {
        this.container = container;
        this.query = '';
        this.selectedTags = new Set();
        this.sort = 'newest';
        this.init();
    }

    init() {
        const cards = [...this.container.querySelectorAll(':scope > .publication-card')];
        if (cards.length === 0) return;

        this.headings = [...this.container.querySelectorAll(':scope > h2')];

        this.items = cards.map((card, index) => {
            const title = card.querySelector('.publication-title');
            const tagButtons = [...card.querySelectorAll('.tag-topic')];
            const tldr = card.querySelector('.publication-tldr-content');
            const searchFields = [title, ...tagButtons, tldr].filter(Boolean);
            return {
                card,
                index,
                year: card.dataset.year,
                title: title ? title.textContent.trim() : '',
                tagKeys: new Set(tagButtons.map(b => this.tagKey(b.dataset.tag))),
                tagButtons,
                searchFields,
                haystack: searchFields.map(el => foldText(el.textContent)).join('\n'),
                tldrHaystack: tldr ? foldText(tldr.textContent) : '',
                tldrToggle: card.querySelector('.publication-tldr-toggle'),
            };
        });

        // Tags differing only in case count as one; the first spelling seen
        // labels it in the tag list.
        this.tags = new Map();
        this.items.forEach(item => item.tagButtons.forEach(button => {
            const key = this.tagKey(button.dataset.tag);
            const entry = this.tags.get(key) || { label: button.dataset.tag, count: 0 };
            entry.count++;
            this.tags.set(key, entry);
        }));

        this.buildControls();

        this.list = document.createElement('div');
        this.list.className = 'publication-list';
        this.controls.after(this.list);
        this.list.append(...this.container.querySelectorAll(':scope > h2, :scope > .publication-card'));

        this.empty = document.createElement('p');
        this.empty.className = 'publication-empty';
        this.empty.hidden = true;
        this.empty.innerHTML = 'No publications match. <button type="button" class="publication-reset-inline">Clear filters</button>';
        this.list.after(this.empty);

        this.container.classList.add('publication-filter-ready');
        this.bindEvents();
        this.update();
    }

    tagKey(tag) {
        return tag.trim().toLowerCase();
    }

    buildControls() {
        this.controls = document.createElement('div');
        this.controls.className = 'publication-controls';
        this.controls.setAttribute('role', 'search');
        this.controls.innerHTML = `
            <div class="publication-controls-row">
                <label class="publication-search">
                    <span class="sr-only">Search publications</span>
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"></circle><path d="M13 13l4.5 4.5" stroke-linecap="round"></path></svg>
                    <input type="search" placeholder="Search titles, tags and details…" autocomplete="off" spellcheck="false">
                </label>
                <label class="publication-sort">
                    <span>Sort</span>
                    <select>
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                        <option value="title">Title (A–Z)</option>
                    </select>
                </label>
            </div>
            <div class="publication-controls-row publication-status-row">
                <button type="button" class="publication-tag-toggle" aria-expanded="false" aria-controls="publication-tag-list">Filter by tag</button>
                <div class="publication-active-tags"></div>
                <span class="publication-count" aria-live="polite"></span>
                <button type="button" class="publication-reset" hidden>Clear filters</button>
            </div>
            <div class="publication-tag-list" id="publication-tag-list" hidden></div>`;

        const tagList = this.controls.querySelector('.publication-tag-list');
        [...this.tags.entries()]
            .sort((a, b) => a[1].label.localeCompare(b[1].label, undefined, { sensitivity: 'base' }))
            .forEach(([key, { label, count }]) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'tag tag-topic';
                button.dataset.tag = label;
                button.setAttribute('aria-pressed', 'false');
                button.textContent = label;
                const countEl = document.createElement('span');
                countEl.className = 'tag-count';
                countEl.textContent = count;
                button.append(countEl);
                tagList.append(button);
            });

        const sectionTitle = this.container.querySelector(':scope > h1');
        if (sectionTitle) {
            sectionTitle.after(this.controls);
        } else {
            this.container.prepend(this.controls);
        }

        this.searchInput = this.controls.querySelector('input[type="search"]');
        this.sortSelect = this.controls.querySelector('select');
        this.tagToggle = this.controls.querySelector('.publication-tag-toggle');
        this.tagList = tagList;
        this.activeTags = this.controls.querySelector('.publication-active-tags');
        this.count = this.controls.querySelector('.publication-count');
        this.resetButton = this.controls.querySelector('.publication-reset');
    }

    bindEvents() {
        this.searchInput.addEventListener('input', () => {
            this.query = this.searchInput.value;
            this.update();
        });

        this.sortSelect.addEventListener('change', () => {
            this.sort = this.sortSelect.value;
            this.reorder();
            this.update();
        });

        this.tagToggle.addEventListener('click', () => {
            const open = this.tagToggle.getAttribute('aria-expanded') !== 'true';
            this.tagToggle.setAttribute('aria-expanded', String(open));
            this.tagList.hidden = !open;
        });

        this.container.addEventListener('click', (e) => {
            if (e.target.closest('.publication-reset, .publication-reset-inline')) {
                this.reset();
                return;
            }
            const tagButton = e.target.closest('.tag-topic[data-tag]');
            if (!tagButton) return;
            this.toggleTag(this.tagKey(tagButton.dataset.tag));
            // Picking a tag from a card far down the list would otherwise
            // leave the controls (and what is now being filtered) off-screen.
            if (tagButton.closest('.publication-card')) this.scrollToControls();
        });
    }

    toggleTag(key) {
        if (this.selectedTags.has(key)) {
            this.selectedTags.delete(key);
        } else {
            this.selectedTags.add(key);
        }
        this.update();
    }

    reset() {
        this.query = '';
        this.searchInput.value = '';
        this.selectedTags.clear();
        this.update();
    }

    // Called before jumping to an in-page link: if the target card is
    // currently filtered out, clear the filters so it can be shown.
    reveal(target) {
        const card = target.closest('.publication-card');
        if (card && card.hidden) this.reset();
    }

    scrollToControls() {
        const header = document.getElementById('main-header');
        const offset = (header ? header.getBoundingClientRect().height : 0) + 8;
        const top = this.controls.getBoundingClientRect().top;
        if (top < offset) {
            const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            window.scrollTo({ top: window.scrollY + top - offset, behavior: reduceMotion ? 'auto' : 'smooth' });
        }
    }

    // Only a sort change moves nodes; filtering just hides them, so focus and
    // the open/closed state of each card are left alone.
    reorder() {
        const items = [...this.items];
        if (this.sort === 'oldest') {
            items.reverse();
        } else if (this.sort === 'title') {
            items.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true }));
        }

        const nodes = [];
        let year = null;
        items.forEach(item => {
            if (this.sort !== 'title' && item.year !== year) {
                year = item.year;
                const heading = this.headings.find(h => h.textContent.trim() === year);
                if (heading) nodes.push(heading);
            }
            nodes.push(item.card);
        });
        this.list.append(...nodes);
    }

    update() {
        const terms = foldText(this.query).split(/\s+/).filter(Boolean);
        const visibleYears = new Set();
        let shown = 0;

        this.items.forEach(item => {
            const matchesTags = this.selectedTags.size === 0
                || [...this.selectedTags].some(key => item.tagKeys.has(key));
            const matchesSearch = terms.every(term => item.haystack.includes(term));
            const visible = matchesTags && matchesSearch;

            item.card.hidden = !visible;
            if (visible) {
                shown++;
                visibleYears.add(item.year);
            }
            item.tagButtons.forEach(button => {
                button.setAttribute('aria-pressed', String(this.selectedTags.has(this.tagKey(button.dataset.tag))));
            });
            // A match inside the collapsed "More Info" text is otherwise
            // invisible, so point at the toggle.
            if (item.tldrToggle) {
                item.tldrToggle.classList.toggle('has-search-match',
                    visible && terms.some(term => item.tldrHaystack.includes(term)));
            }
        });

        this.headings.forEach(heading => {
            heading.hidden = this.sort === 'title' || !visibleYears.has(heading.textContent.trim());
        });

        this.tagList.querySelectorAll('.tag-topic').forEach(button => {
            button.setAttribute('aria-pressed', String(this.selectedTags.has(this.tagKey(button.dataset.tag))));
        });

        this.activeTags.replaceChildren(...[...this.selectedTags].map(key => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'tag tag-topic';
            button.dataset.tag = this.tags.get(key).label;
            button.setAttribute('aria-pressed', 'true');
            button.setAttribute('aria-label', `Remove tag filter ${this.tags.get(key).label}`);
            button.textContent = this.tags.get(key).label;
            return button;
        }));

        const filtered = terms.length > 0 || this.selectedTags.size > 0;
        const total = this.items.length;
        this.count.textContent = filtered
            ? `Showing ${shown} of ${total}`
            : `${total} publications`;
        this.tagToggle.textContent = this.selectedTags.size
            ? `Filter by tag (${this.selectedTags.size})`
            : 'Filter by tag';
        this.resetButton.hidden = !filtered;
        this.empty.hidden = shown > 0;

        this.highlight(terms);
    }

    // Marks the search terms in visible cards using the CSS Custom Highlight
    // API, which styles text ranges without changing the DOM. Browsers without
    // it simply get no highlighting.
    highlight(terms) {
        if (!(window.CSS && CSS.highlights && window.Highlight)) return;
        CSS.highlights.delete('publication-search');
        if (terms.length === 0) return;

        const ranges = [];
        this.items.forEach(item => {
            if (item.card.hidden) return;
            item.searchFields.forEach(field => {
                const walker = document.createTreeWalker(field, NodeFilter.SHOW_TEXT);
                let node;
                while ((node = walker.nextNode())) {
                    const { folded, starts, ends } = foldWithMap(node.data);
                    terms.forEach(term => {
                        let i = folded.indexOf(term);
                        while (i !== -1) {
                            const range = document.createRange();
                            range.setStart(node, starts[i]);
                            range.setEnd(node, ends[i + term.length - 1]);
                            ranges.push(range);
                            i = folded.indexOf(term, i + term.length);
                        }
                    });
                }
            });
        });
        CSS.highlights.set('publication-search', new Highlight(...ranges));
    }
}

// Initialize all functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all components
    new ThemeManager();
    new MobileNavigation();
    new SmoothScroll();
    
    // Make NavigationHighlight available globally for smooth scroll integration
    window.navigationHighlightInstance = new NavigationHighlight();
    
    new LazyImageLoader();

    const publications = document.getElementById('publications-content');
    if (publications) {
        window.publicationFilterInstance = new PublicationFilter(publications);
    }

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



