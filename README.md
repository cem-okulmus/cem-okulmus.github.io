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

then open `_site/index.html` in a browser.
