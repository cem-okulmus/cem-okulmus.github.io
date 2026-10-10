// Prerenders the site: copies docs/ to _site/ and fills each
// <!-- build:NAME --> placeholder in index.html with the rendered contents of
// docs/NAME.md, so the published page needs no JavaScript to show its content.
//
// Run with `npm run build`. The GitHub Actions workflow in
// .github/workflows/pages.yml runs this on every push and deploys _site/.
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { marked } from 'marked';
import { PREVIEW_WIDTHS, finishPreviews, preparePreview } from './previews.mjs';
import { PERSON, structuredDataScript } from './structured-data.mjs';

const SRC = 'docs';
const OUT = '_site';

// Every parsed publication entry, collected while rendering for the JSON-LD
// metadata (see structured-data.mjs).
const publications = [];

// Open external links in a new tab
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

// The renderer above only sees Markdown links; this also covers <a> tags
// written as raw HTML in the section files (and the publication cards).
function openExternalLinksInNewTab(html) {
    const setAttr = (tag, name, value) => {
        const existing = new RegExp(`\\s${name}=("[^"]*"|'[^']*')`);
        return existing.test(tag)
            ? tag.replace(existing, ` ${name}="${value}"`)
            : tag.replace(/>$/, ` ${name}="${value}">`);
    };
    return html.replace(/<a\s[^>]*>/g, tag => {
        const href = tag.match(/\shref=("([^"]*)"|'([^']*)')/);
        if (!href) return tag;
        const url = href[2] ?? href[3];
        if (url.startsWith('#')) return tag;
        return setAttr(setAttr(tag, 'target', '_blank'), 'rel', 'noopener noreferrer');
    });
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

// "accepted: true" marks a paper that is accepted but not yet presented or
// published. Absent (or anything other than true/yes) means false.
function isAccepted(fields) {
    return /^(true|yes)$/i.test((fields.accepted || '').trim());
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// "tags: A, B, C" becomes one chip per tag. They are buttons because script.js
// uses them to filter the list by that tag.
function renderTopicTags(tags) {
    return (tags || '')
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean)
        .map(tag => `<button type="button" class="tag tag-topic" data-tag="${escapeHtml(tag)}" aria-pressed="false">${escapeHtml(tag)}</button>`);
}

// "type: Journal" (or Conference, Workshop, ...; several comma-separated for
// papers that are both) becomes venue tags. They work like topic tags for
// filtering (data-kind tells script.js to list them in their own group) but
// are styled differently.
function renderVenueTags(type) {
    return (type || '')
        .split(',')
        .map(label => label.trim())
        .filter(Boolean)
        .map(label => `<button type="button" class="tag tag-topic tag-venue" data-tag="${escapeHtml(label)}" data-kind="venue" aria-pressed="false">${escapeHtml(label)}</button>`);
}

// "A, B, C" and "A, B and C" both render as "A, B and C", so every list has
// "and" before the last author however it was written. Each co-author's name
// becomes a button that script.js uses to filter by that co-author (styled to
// look like plain text). The site owner's own name stays plain text: they are
// on every paper, so filtering by them would select everything.
function renderAuthors(authors) {
    const names = (authors || '')
        .split(/,\s*|\s+and\s+/)
        .map(name => name.trim())
        .filter(Boolean)
        .map(name => {
            const plain = name.replace(/<[^>]+>|[*_]/g, '');
            if (plain === PERSON.name) {
                return `<span class="publication-author">${marked.parseInline(name)}</span>`;
            }
            return `<button type="button" class="publication-author" data-author="${escapeHtml(plain)}" aria-pressed="false">${marked.parseInline(name)}</button>`;
        });
    return names.length > 1
        ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
        : names.join('');
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];

// "2026-03-24" becomes { day: 24, month: 'March', year: 2026 }.
function parseDate(text) {
    const match = (text || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) throw new Error(`Expected a YYYY-MM-DD date, got "${text}"`);
    return { day: Number(match[3]), month: MONTHS[Number(match[2]) - 1], year: Number(match[1]) };
}

// "2026-11-07 to 2026-11-11" becomes "7–11 November 2026", leaving out the
// month and year of the start where the end repeats them. A single date is
// printed on its own.
function formatDateRange(text) {
    const [start, end] = text.split(/\s+to\s+/).map(parseDate);
    if (!end) return `${start.day} ${start.month} ${start.year}`;
    const endText = `${end.day} ${end.month} ${end.year}`;
    if (start.year !== end.year) return `${start.day} ${start.month} ${start.year} – ${endText}`;
    if (start.month !== end.month) return `${start.day} ${start.month} – ${endText}`;
    return `${start.day}–${endText}`;
}

// The line between the authors and the tags: where and when a conference or
// workshop paper was presented ("location:" and "dates:"), and when a journal
// article was published ("published:"; for a preprint, when its first
// version went online). A paper that is both gets both sentences. A one-off
// entry like the thesis can instead give the whole line as "dateline:".
// Entries with none of these show their year instead, which matters when the
// list is sorted by title and the year headings are hidden.
function renderPublicationDate(fields, year) {
    if (fields.dateline) return marked.parseInline(fields.dateline);
    const sentences = [];
    if (fields.location || fields.dates) {
        const accepted = isAccepted(fields);
        const where = !fields.location ? ''
            : /^online$/i.test(fields.location.trim()) ? ' online'
            : ` in ${escapeHtml(fields.location.trim())}`;
        const when = fields.dates ? ` on ${formatDateRange(fields.dates)}` : '';
        const verb = accepted ? 'Will be presented' : 'Presented';
        sentences.push(`${verb}${where}${where && when ? ',' : ''}${when}.`);
    }
    if (fields.published) {
        const preprint = /\bPreprint\b/i.test(fields.type || '');
        const verb = preprint ? 'First published online on' : 'Published on';
        sentences.push(`${verb} ${formatDateRange(fields.published)}.`);
    }
    return sentences.length ? sentences.join(' ') : escapeHtml(year);
}

// The date a card is sorted by within its year section: the earliest of the
// first day it was presented, its publication date and "sortdate:" (for
// entries like the thesis, whose "dateline:" is free text). As YYYY-MM-DD,
// these compare correctly as strings. Entries with none give '', which sorts
// them last.
function publicationSortDate(fields) {
    const dates = [fields.dates, fields.published, fields.sortdate]
        .filter(Boolean)
        .map(text => text.split(/\s+to\s+/)[0].trim());
    dates.forEach(parseDate);
    return dates.sort()[0] || '';
}

// The first page of the paper (see previews.mjs), linking to its PDF. With
// JavaScript, clicking it opens the in-page viewer instead (script.js), which
// reads what to show from the data attributes: the PDF to show in a frame, if
// it can be, the largest image, and a note when the viewer's PDF is not the
// one the card links to (e.g. the arXiv version of an ACM paper).
function renderPreview(fields, preview) {
    const href = fields.pdf || preview?.source;
    if (!preview) {
        const label = href ? `<a href="${href}" class="publication-preview-missing">PDF</a>` : '';
        return `<div class="publication-image publication-image-missing">${label}</div>`;
    }
    const srcset = PREVIEW_WIDTHS.map(width => `${preview.src(width)} ${width}w`).join(', ');
    const largest = preview.src(PREVIEW_WIDTHS.at(-1));
    const viewerAttr = preview.viewer ? ` data-viewer="${preview.viewer}"` : '';
    const note = preview.viewer && preview.viewer !== fields.pdf
        ? (/arxiv\.org/.test(preview.viewer) ? 'arXiv version'
            : /^https?:/.test(preview.viewer) ? `Version from ${new URL(preview.viewer).hostname}`
            : 'Copy on this site')
        : '';
    const noteAttr = note ? ` data-note="${escapeHtml(note)}"` : '';
    return `<div class="publication-image">
            <a href="${href}" class="publication-preview"${viewerAttr} data-full="${largest}"${noteAttr} aria-label="Preview the PDF">
                <img src="${preview.src(PREVIEW_WIDTHS[0])}" srcset="${srcset}" sizes="130px" width="${preview.width}" height="${preview.height}" alt="First page of the paper" loading="lazy" decoding="async">
            </a>
        </div>`;
}

function renderPublicationCard(fields, year, tldrId, preview) {
    // Built as an array and joined, rather than interpolated with blank
    // lines for absent fields: a whitespace-only line here would read to
    // marked() as a paragraph break, splitting this raw HTML in two and
    // causing everything after it to render as escaped text instead of
    // markup.
    // Topic tags and the links/actions (arXiv, code, slides, "More Info") go in
    // separate rows, so the links aren't mistaken for more topics.
    const topicTags = [...renderVenueTags(fields.type), ...renderTopicTags(fields.tags)];
    const links = [
        fields.pdf && `<a href="${fields.pdf}" class="tag tag-pdf">PDF</a>`,
        fields.arxiv && `<a href="${fields.arxiv}" class="tag tag-arxiv">arXiv</a>`,
        fields.code && `<a href="${fields.code}" class="tag tag-code">Source Code</a>`,
        fields.slides && `<a href="${fields.slides}" class="tag tag-workshop">Talk Slides</a>`,
        fields.tldr && `<button class="publication-tldr-toggle" type="button" aria-expanded="false" aria-controls="${tldrId}">More Info</button>`,
    ].filter(Boolean);

    const tagsHtml = topicTags.length
        ? `<div class="publication-tags">\n                ${topicTags.join('\n                ')}\n            </div>`
        : '';
    const linksHtml = links.length
        ? `<div class="publication-links">\n                ${links.join('\n                ')}\n            </div>`
        : '';
    // Each row brings its own leading line break, so a card with neither row
    // leaves no whitespace-only line behind (see the comment above).
    const rowsHtml = [tagsHtml, linksHtml].filter(Boolean).map(row => `\n            ${row}`).join('');

    // A paper that appeared in two places (e.g. a PODS paper also published
    // in PACMMOD) lists each on its own indented line under "venue:"; each
    // line gets its own badge.
    const accepted = isAccepted(fields);
    const venueLines = (fields.venue || '').split('\n').map(line => line.trim()).filter(Boolean);
    const venueHtml = (line, index) => {
        const prefix = accepted && index === 0 ? '<strong>To be presented at the</strong> ' : '';
        return `<div class="publication-venue">${prefix}${marked.parseInline(line)}</div>`;
    };
    const venuesHtml = venueLines.length > 1
        ? `<div class="publication-venues">${venueLines.map(venueHtml).join('')}</div>`
        : venueHtml(venueLines[0] || '', 0);
    const statusHtml = accepted ? ' <span class="publication-status">Accepted</span>' : '';

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

    return `<div class="publication-card"${idAttr} data-year="${escapeHtml(year)}">
    <div class="publication-main">
        ${renderPreview(fields, preview)}
        <div class="publication-content">
            <h3 class="publication-title">${renderPublicationTitle(fields.title)}${statusHtml}</h3>
            ${venuesHtml}
            <div class="publication-authors">${renderAuthors(fields.authors)}</div>
            ${descriptionHtml}<div class="publication-year">${renderPublicationDate(fields, year)}</div>${rowsHtml}
        </div>
    </div>${panelHtml}
</div>`;
}

async function transformPublicationsSource(source) {
    // Split into the lines outside entries and the entries of each year
    // section, then render, since the previews have to be awaited.
    const parts = [];
    let section = null;
    let block = null;
    let currentYear = '';

    const flush = () => {
        if (block) {
            section.push({ fields: parsePublicationBlock(block), year: currentYear });
            block = null;
        }
    };

    for (const line of source.split('\n')) {
        const yearMatch = line.match(/^##\s+(.+)$/);
        const titleMatch = line.match(/^###\s+/);

        if (yearMatch) {
            flush();
            currentYear = yearMatch[1].trim();
            parts.push(line);
            section = [];
            parts.push(section);
        } else if (titleMatch) {
            flush();
            block = [line];
        } else if (block) {
            block.push(line);
        } else {
            parts.push(line);
        }
    }
    flush();

    const output = [];
    let cardIndex = 0;
    for (const part of parts) {
        if (typeof part === 'string') {
            output.push(part);
            continue;
        }
        // Each year section's cards are output newest first, whatever their
        // order in publications.md. (The page's "oldest first" sort just
        // reverses this order.) Array.sort is stable, so cards with the same
        // date keep their order.
        const cards = [];
        for (const { fields, year } of part) {
            publications.push({ fields, year });
            const preview = await preparePreview(fields);
            cards.push({
                date: publicationSortDate(fields),
                html: renderPublicationCard(fields, year, `pub-tldr-${cardIndex++}`, preview),
            });
        }
        cards.sort((a, b) => (a.date < b.date) - (a.date > b.date));
        output.push(...cards.map(card => card.html));
    }
    finishPreviews();

    return output.join('\n\n');
}

// Previews are rendered into docs/ before it is copied to _site/.
const publicationsSource = await transformPublicationsSource(
    readFileSync(join(SRC, 'publications.md'), 'utf8'));

function renderSection(section) {
    const source = section === 'publications'
        ? publicationsSource
        : readFileSync(join(SRC, `${section}.md`), 'utf8');
    return openExternalLinksInNewTab(marked.parse(source));
}

rmSync(OUT, { recursive: true, force: true });
cpSync(SRC, OUT, {
    recursive: true,
    // The top-level section files are rendered into index.html, so they are
    // not published on their own. Markdown under assets/ is kept.
    filter: src => {
        const rel = relative(SRC, src);
        return !(dirname(rel) === '.' && rel.endsWith('.md'))
            && rel !== join('assets', 'previews', 'previews.json');
    },
});

const rendered = [];
const index = readFileSync(join(SRC, 'index.html'), 'utf8')
    .replace(/<!--\s*build:([\w-]+)\s*-->/g, (_, section) => {
        rendered.push(section);
        return renderSection(section);
    })
    .replace('</head>', () => `    ${structuredDataScript(publications, marked)}\n</head>`);
writeFileSync(join(OUT, 'index.html'), index);

console.log(`Built ${OUT}/ with sections: ${rendered.join(', ')}`);
