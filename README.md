# cem-okulmus.github.io

The site source lives in `docs/`. Each section of the page is a Markdown file
(`about.md`, `publications.md`, ...) that `build.mjs` renders into the
matching `<!-- build:NAME -->` placeholder in `docs/index.html`, writing the
finished site to `_site/`.

On every push to `main`, the workflow in `.github/workflows/pages.yml` runs
the build and deploys `_site/` to GitHub Pages (Settings → Pages → Source must
be set to "GitHub Actions").

To preview locally:

    npm ci
    npm run build

then open `_site/index.html` in a browser. `npm run watch` instead rebuilds
whenever a file in `docs/` changes (reload the browser tab to see it).

## Publication previews

Each publication card shows the first page of the paper, rendered by
`previews.mjs` into `docs/assets/previews/` (see the comment at its top). The
build only renders previews that are missing, which needs `pdftoppm`
(poppler-utils) and ImageMagick's `magick`; commit the new images together
with the `publications.md` entry, so the deploy workflow never has to.

If a paper's `pdf:` link can't be downloaded (ACM serves scripts a bot check),
the arXiv version from `arxiv:` is used instead. Otherwise, download the PDF
yourself and point `preview:` at it (a path relative to `docs/`, or a URL).
