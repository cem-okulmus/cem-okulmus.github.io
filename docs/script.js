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

// In-page PDF viewer for the publication cards. Clicking a card's first page
// (rendered by previews.mjs, a link to the PDF) grows that page from the card
// until it fills the window, then shows the PDF itself over it, in the
// browser's own PDF viewer in a frame. Where that can't work (the browser
// can't show a PDF inside a page, as on most phones, or the PDF's host
// forbids it), the enlarged first page stays, with a button to open the PDF.
// Modified clicks (e.g. Ctrl+click for a new tab), and visitors without
// JavaScript, just follow the link.
class PdfViewer {
    constructor() {
        this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        // pdfViewerEnabled is also true on iPhones and iPads, which show just
        // the first page of a PDF in a frame, so this also asks for a mouse.
        this.canFrame = navigator.pdfViewerEnabled === true
            && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        this.build();

        document.addEventListener('click', event => {
            const link = event.target.closest('a.publication-preview');
            if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            this.open(link);
        });
        window.addEventListener('resize', () => {
            if (this.dialog.open) this.layout();
        });
    }

    build() {
        this.dialog = document.createElement('dialog');
        this.dialog.className = 'pdf-viewer';
        this.dialog.innerHTML = `
            <div class="pdf-viewer-shade"></div>
            <div class="pdf-viewer-bar">
                <div class="pdf-viewer-heading">
                    <span class="pdf-viewer-title"></span>
                    <span class="pdf-viewer-note"></span>
                </div>
                <a class="pdf-viewer-open" target="_blank" rel="noopener noreferrer">Open PDF</a>
                <button type="button" class="pdf-viewer-close" aria-label="Close" autofocus>&times;</button>
            </div>
            <div class="pdf-viewer-stage">
                <img class="pdf-viewer-page" alt="">
            </div>`;
        const part = name => this.dialog.querySelector(`.pdf-viewer-${name}`);
        this.shade = part('shade');
        this.bar = part('bar');
        this.title = part('title');
        this.note = part('note');
        this.openLink = part('open');
        this.stage = part('stage');
        this.page = part('page');

        part('close').addEventListener('click', () => this.close());
        // Escape
        this.dialog.addEventListener('cancel', event => {
            event.preventDefault();
            this.close();
        });
        // A click beside the page closes it, as in an image lightbox.
        this.stage.addEventListener('click', event => {
            if (event.target === this.stage) this.close();
        });
        document.body.append(this.dialog);
    }

    open(link) {
        if (this.dialog.open) return;
        this.card = link.closest('.publication-card');
        // The viewer takes the mouse off the card, which would undo its hover
        // effects (and move it) while the page grows out of it.
        this.card.classList.toggle('is-previewing', this.card.matches(':hover'));
        const heading = this.card.querySelector('.publication-title').cloneNode(true);
        heading.querySelectorAll('.publication-status').forEach(status => status.remove());
        const title = heading.textContent.trim();

        this.link = link;
        this.thumb = link.querySelector('img');
        this.ratio = this.thumb.getAttribute('width') / this.thumb.getAttribute('height');
        this.title.textContent = title;
        this.dialog.setAttribute('aria-label', title);
        this.note.textContent = link.dataset.note || '';
        this.openLink.href = link.href;

        // Starts as the image the card already shows, so there is something to
        // grow straight away; the largest one replaces it once loaded.
        this.page.src = this.thumb.currentSrc || this.thumb.src;
        const full = new Image();
        full.src = link.dataset.full;
        full.decode().then(() => {
            if (this.link === link) this.page.src = full.src;
        }, () => {});

        const from = this.thumb.getBoundingClientRect();
        this.dialog.showModal();
        document.documentElement.classList.add('has-pdf-viewer');
        this.layout();
        // The page leaves the card while it is enlarged.
        this.thumb.style.visibility = 'hidden';
        const grown = this.animate(from, false);

        if (this.canFrame && link.dataset.viewer) {
            const frame = document.createElement('iframe');
            frame.className = 'pdf-viewer-frame';
            frame.title = title;
            const loaded = new Promise(resolve => frame.addEventListener('load', resolve, { once: true }));
            frame.src = link.dataset.viewer;
            this.stage.append(frame);
            this.frame = frame;
            Promise.all([grown, loaded]).then(() => frame.classList.add('is-loaded'));
        }
    }

    async close() {
        if (!this.dialog.open || this.closing) return;
        this.closing = true;
        if (this.frame) {
            this.frame.remove();
            this.frame = null;
        }
        // Lets an unfinished opening jump to its end before shrinking back.
        this.dialog.getAnimations({ subtree: true }).forEach(animation => animation.finish());

        const to = this.thumb.getBoundingClientRect();
        const onScreen = to.width > 0 && to.bottom > 0 && to.top < window.innerHeight;
        await this.animate(onScreen ? to : null, true);

        this.thumb.style.visibility = '';
        this.card.classList.remove('is-previewing');
        this.dialog.close();
        document.documentElement.classList.remove('has-pdf-viewer');
        this.dialog.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
        this.page.removeAttribute('src');
        this.link = null;
        this.closing = false;
    }

    // Fits the page into the stage, with a margin around it.
    layout() {
        const stage = this.stage.getBoundingClientRect();
        const margin = Math.min(24, stage.width * 0.04);
        let width = stage.width - 2 * margin;
        let height = width / this.ratio;
        if (height > stage.height - 2 * margin) {
            height = stage.height - 2 * margin;
            width = height * this.ratio;
        }
        Object.assign(this.page.style, {
            left: `${(stage.width - width) / 2}px`,
            top: `${(stage.height - height) / 2}px`,
            width: `${width}px`,
            height: `${height}px`,
        });
    }

    // Moves the page between the card (`card`, a rect) and its place in the
    // viewer while the rest fades in or out. Without a rect (the card is off
    // screen) or with reduced motion, everything just fades.
    animate(card, closing) {
        const timing = { duration: 380, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'both' };
        const order = frames => (closing ? [...frames].reverse() : frames);
        const fade = order([{ opacity: 0 }, { opacity: 1 }]);
        const animations = [this.shade.animate(fade, timing), this.bar.animate(fade, timing)];

        if (card && !this.reduceMotion.matches) {
            const page = this.page.getBoundingClientRect();
            const scale = card.width / page.width;
            animations.push(this.page.animate(order([
                { transform: `translate(${card.left - page.left}px, ${card.top - page.top}px) scale(${scale})` },
                { transform: 'none' },
            ]), timing));
        } else {
            animations.push(this.page.animate(fade, { ...timing, duration: 200 }));
        }
        return Promise.all(animations.map(animation => animation.finished)).catch(() => {});
    }
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
            // Tags and co-author names both work as filters (see keyFor).
            const tagButtons = [...card.querySelectorAll('.tag-topic, .publication-author[data-author]')];
            const authors = card.querySelector('.publication-authors');
            const tldr = card.querySelector('.publication-tldr-content');
            const searchFields = [title, authors, ...card.querySelectorAll('.tag-topic'), tldr].filter(Boolean);
            return {
                card,
                index,
                year: card.dataset.year,
                title: title ? title.textContent.trim() : '',
                tagKeys: new Set(tagButtons.map(b => this.keyFor(b))),
                tagButtons,
                searchFields,
                haystack: searchFields.map(el => foldText(el.textContent)).join('\n'),
                tldrHaystack: tldr ? foldText(tldr.textContent) : '',
                tldrToggle: card.querySelector('.publication-tldr-toggle'),
            };
        });

        // Every filter (tag or co-author), by key. Tags differing only in case
        // count as one; the first spelling seen labels it in the filter list.
        this.tags = new Map();
        this.items.forEach(item => item.tagButtons.forEach(button => {
            const key = this.keyFor(button);
            const entry = this.tags.get(key) || {
                label: button.dataset.tag || button.dataset.author,
                kind: button.dataset.author ? 'author' : (button.dataset.kind || 'topic'),
                count: 0,
            };
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

    // Co-author keys get a prefix so a name can never collide with a tag.
    keyFor(button) {
        if (button.dataset.key) return button.dataset.key;
        return button.dataset.author
            ? `author:${this.tagKey(button.dataset.author)}`
            : this.tagKey(button.dataset.tag);
    }

    // Co-authors are listed as plain text rather than tag boxes.
    tagClass(kind) {
        if (kind === 'author') return 'filter-author';
        return kind === 'venue' ? 'tag tag-topic tag-venue' : 'tag tag-topic';
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
                    <input type="search" placeholder="Search titles, authors, tags and details…" autocomplete="off" spellcheck="false">
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
                <button type="button" class="publication-tag-toggle" aria-expanded="false" aria-controls="publication-tag-list">Filter by tag and co-author</button>
                <div class="publication-active-tags"></div>
                <span class="publication-count" aria-live="polite"></span>
                <button type="button" class="publication-reset" hidden>Clear filters</button>
            </div>
            <div class="publication-tag-list" id="publication-tag-list" hidden></div>`;

        // Venue tags (Conference, Journal, ...), topic tags and co-authors are
        // listed in separate groups, each sorted by its total number of papers
        // (ties alphabetically). The order stays fixed while filtering.
        const tagList = this.controls.querySelector('.publication-tag-list');
        const byCount = (a, b) => b.count - a.count
            || a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
        const groups = [['venue', 'Type'], ['topic', 'Topic'], ['author', 'Co-authors']];
        groups.forEach(([kind, heading]) => {
            const entries = [...this.tags.entries()]
                .map(([key, entry]) => ({ key, ...entry }))
                .filter(entry => entry.kind === kind)
                .sort(byCount);
            if (entries.length === 0) return;

            const group = document.createElement('div');
            group.className = 'publication-tag-group';
            group.setAttribute('role', 'group');
            group.setAttribute('aria-label', heading);
            const label = document.createElement('span');
            label.className = 'publication-tag-group-label';
            label.textContent = heading;
            group.append(label);

            entries.forEach(({ key, label, count }) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = this.tagClass(kind);
                button.dataset.key = key;
                button.setAttribute('aria-pressed', 'false');
                button.textContent = label;
                const countEl = document.createElement('span');
                countEl.className = 'tag-count';
                countEl.textContent = count;
                button.append(countEl);
                group.append(button);
            });
            tagList.append(group);
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
            const tagButton = e.target.closest('.tag-topic[data-tag], .publication-author[data-author], [data-key]');
            if (!tagButton) return;
            this.toggleTag(this.keyFor(tagButton));
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
        const visibleItems = [];
        let shown = 0;

        this.items.forEach(item => {
            // A card must carry every selected tag, so each added tag narrows
            // the list further.
            const matchesTags = [...this.selectedTags].every(key => item.tagKeys.has(key));
            const matchesSearch = terms.every(term => item.haystack.includes(term));
            const visible = matchesTags && matchesSearch;

            item.card.hidden = !visible;
            if (visible) {
                shown++;
                visibleYears.add(item.year);
                visibleItems.push(item);
            }
            item.tagButtons.forEach(button => {
                button.setAttribute('aria-pressed', String(this.selectedTags.has(this.keyFor(button))));
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

        // Each tag's count is how many papers would remain if it were added to
        // the current filters (search included). Tags that would leave none
        // are disabled; selected tags always stay clickable so they can be
        // removed again.
        this.tagList.querySelectorAll('[data-key]').forEach(button => {
            const key = button.dataset.key;
            const selected = this.selectedTags.has(key);
            const count = selected
                ? shown
                : visibleItems.filter(item => item.tagKeys.has(key)).length;
            button.setAttribute('aria-pressed', String(selected));
            button.querySelector('.tag-count').textContent = count;
            button.disabled = !selected && count === 0;
        });

        this.activeTags.replaceChildren(...[...this.selectedTags].map(key => {
            const button = document.createElement('button');
            button.type = 'button';
            const { kind, label } = this.tags.get(key);
            button.className = this.tagClass(kind);
            button.dataset.key = key;
            button.setAttribute('aria-pressed', 'true');
            button.setAttribute('aria-label', `Remove ${kind === 'author' ? 'co-author' : 'tag'} filter ${label}`);
            button.textContent = label;
            return button;
        }));

        const filtered = terms.length > 0 || this.selectedTags.size > 0;
        const total = this.items.length;
        this.count.textContent = filtered
            ? `Showing ${shown} of ${total}`
            : `${total} publications`;
        this.tagToggle.textContent = this.selectedTags.size
            ? `Filter by tag and co-author (${this.selectedTags.size})`
            : 'Filter by tag and co-author';
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

    if (document.querySelector('.publication-preview') && 'showModal' in HTMLDialogElement.prototype) {
        new PdfViewer();
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



