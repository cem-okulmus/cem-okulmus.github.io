// First-page previews for the publication cards: build.mjs calls
// preparePreview() for every entry in publications.md, which renders page 1
// of the paper's PDF to PNGs in docs/assets/previews/ (with pdftoppm, from
// poppler-utils, then reduced to a few colours with ImageMagick, which keeps
// a page of text sharp at a fraction of the size). The images are committed, so a build only downloads and
// renders a PDF when its preview is missing, and the deploy workflow never has
// to.
//
// The PDF is taken from the first of these that yields one: "preview:" (a URL
// or a path relative to docs/, for a paper whose "pdf:" link can't be
// downloaded), "pdf:", and the arXiv version named by "arxiv:". Some
// publishers (ACM, Springer) answer scripts with a bot check instead of the
// PDF, so the arXiv version stands in for those where there is one.
//
// The same source is what the in-page PDF viewer (script.js) shows, if it
// can: a PDF on this site, or one whose host allows it to be shown in a frame
// on another site.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';

const SRC = 'docs';
const DIR = join(SRC, 'assets', 'previews');
const MANIFEST = join(DIR, 'previews.json');
// The card shows the smallest that is sharp enough (see "sizes" in
// build.mjs); the viewer enlarges the largest to fill the window.
export const PREVIEW_WIDTHS = [400, 800, 1600];

const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
const used = new Set();

function arxivPdf(url) {
    const match = (url || '').match(/(?:arxiv\.org\/(?:abs|pdf)\/|10\.48550\/arXiv\.)([\w.\/-]+?)(?:v\d+)?$/i);
    return match ? `https://arxiv.org/pdf/${match[1]}` : null;
}

function sources(fields) {
    const list = [fields.preview, fields.pdf, arxivPdf(fields.arxiv)]
        .map(source => (source || '').trim())
        .filter(Boolean);
    return [...new Set(list)];
}

// Hosts that show browsers a bot check (which can't be framed) instead of the
// PDF, even when they hand it to the build without one, so the headers seen
// here say nothing about what a visitor gets.
const UNFRAMABLE_HOSTS = ['dl.acm.org', 'link.springer.com'];

const framableHost = url => !/^https?:/.test(url)
    || !UNFRAMABLE_HOSTS.includes(new URL(url).hostname);

// The PDF's bytes, and whether the viewer can show it from where it is.
async function load(source) {
    if (/^https?:\/\//.test(source)) {
        const response = await fetch(source, { signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const bytes = Buffer.from(await response.arrayBuffer());
        const csp = response.headers.get('content-security-policy') || '';
        const framable = !response.headers.has('x-frame-options') && !/frame-ancestors/i.test(csp);
        return { bytes, viewer: framable ? source : null };
    }
    const path = resolve(SRC, source);
    const published = !relative(resolve(SRC), path).startsWith('..');
    return { bytes: readFileSync(path), viewer: published ? source : null };
}

// Width and height from a PNG's header.
function pngSize(bytes) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function render(pdfBytes, key) {
    const tmp = mkdtempSync(join(tmpdir(), 'preview-'));
    try {
        const pdf = join(tmp, 'paper.pdf');
        writeFileSync(pdf, pdfBytes);
        for (const width of PREVIEW_WIDTHS) {
            const page = join(tmp, `page-${width}`);
            execFileSync('pdftoppm', [
                '-f', '1', '-l', '1', '-singlefile', '-png',
                '-scale-to-x', String(width), '-scale-to-y', '-1',
                pdf, page,
            ], { stdio: ['ignore', 'ignore', 'ignore'] });
            execFileSync('magick', [
                `${page}.png`, '-strip', '-colors', '32',
                '-define', 'png:compression-level=9', join(DIR, `${key}-${width}.png`),
            ]);
        }
    } finally {
        rmSync(tmp, { recursive: true, force: true });
    }
    return pngSize(readFileSync(join(DIR, `${key}-${PREVIEW_WIDTHS.at(-1)}.png`)));
}

const files = key => PREVIEW_WIDTHS.map(width => join(DIR, `${key}-${width}.png`));

// { src(width), width, height, viewer, source } for the entry, or null (with a
// warning) if none of its sources gave a PDF.
export async function preparePreview(fields) {
    const list = sources(fields);
    if (!list.length) return null;
    // Named after the sources, so changing them renders a new preview.
    const key = createHash('sha256').update(list.join('\n')).digest('hex').slice(0, 12);

    if (!manifest[key] || !files(key).every(existsSync)) {
        mkdirSync(DIR, { recursive: true });
        const failures = [];
        for (const source of list) {
            try {
                const { bytes, viewer } = await load(source);
                if (bytes.subarray(0, 5).toString() !== '%PDF-') throw new Error('not a PDF');
                manifest[key] = { source, viewer, ...render(bytes, key) };
                console.log(`Rendered preview of ${source}`);
                break;
            } catch (error) {
                failures.push(`${source} (${error.message})`);
            }
        }
        if (!manifest[key]) {
            console.warn(`No preview for "${fields.title}": ${failures.join('; ')}`);
            return null;
        }
    }

    used.add(key);
    const entry = manifest[key];
    return {
        ...entry,
        viewer: entry.viewer && framableHost(entry.viewer) ? entry.viewer : null,
        src: width => relative(SRC, join(DIR, `${key}-${width}.png`)),
    };
}

// After every entry has been prepared: drop the previews of entries that
// are gone or whose sources changed, and save the manifest.
export function finishPreviews() {
    for (const key of Object.keys(manifest)) {
        if (!used.has(key)) delete manifest[key];
    }
    if (existsSync(DIR)) {
        for (const file of readdirSync(DIR)) {
            const key = file.match(/^([0-9a-f]{12})-\d+\.(?:png|jpg)$/)?.[1];
            if (key && !used.has(key)) rmSync(join(DIR, file));
        }
        const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
        writeFileSync(MANIFEST, `${JSON.stringify(sorted, null, 2)}\n`);
    }
}
