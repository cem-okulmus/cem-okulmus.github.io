// Prerenders the site: copies docs/ to _site/ and fills each
// <!-- build:NAME --> placeholder in index.html with the rendered contents of
// docs/NAME.md, so the published page needs no JavaScript to show its content.
//
// Run with `npm run build`. The GitHub Actions workflow in
// .github/workflows/pages.yml runs this on every push and deploys _site/.
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { marked } from 'marked';
import { structuredDataScript } from './structured-data.mjs';

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

function renderPublicationCard(fields, year, tldrId) {
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
        <div class="publication-image">
            <img src="${fields.image}">
        </div>
        <div class="publication-content">
            <h3 class="publication-title">${renderPublicationTitle(fields.title)}${statusHtml}</h3>
            ${venuesHtml}
            <div class="publication-authors">${marked.parseInline(fields.authors || '')}</div>
            ${descriptionHtml}<div class="publication-year">${year}</div>${rowsHtml}
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
            const fields = parsePublicationBlock(block);
            publications.push({ fields, year: currentYear });
            output.push(renderPublicationCard(fields, currentYear, `pub-tldr-${cardIndex++}`));
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

function renderSection(section) {
    const markdown = readFileSync(join(SRC, `${section}.md`), 'utf8');
    const source = section === 'publications'
        ? transformPublicationsSource(markdown)
        : markdown;
    return openExternalLinksInNewTab(marked.parse(source));
}

rmSync(OUT, { recursive: true, force: true });
cpSync(SRC, OUT, {
    recursive: true,
    // The top-level section files are rendered into index.html, so they are
    // not published on their own. Markdown under assets/ is kept.
    filter: src => {
        const rel = relative(SRC, src);
        return !(dirname(rel) === '.' && rel.endsWith('.md'));
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
