# magic · site

Premium product landing page for the **magic** repository — published at
[sachncs.github.io/magic](https://sachncs.github.io/magic).

Built with [Astro](https://astro.build) + [Tailwind CSS](https://tailwindcss.com).
No runtime JavaScript ships by default; all motion is CSS- or intersection-observer-driven.

## Develop

```bash
cd site
npm install
npm run dev    # http://localhost:4321
```

## Build

```bash
npm run build  # static output → site/dist
npm run preview
```

## Layout

```
site/
├── public/         # static assets served at /
├── src/
│   ├── components/ # Astro components
│   │   ├── ui/     # small building blocks (Logo, etc.)
│   ├── layouts/    # Base layout
│   ├── pages/      # index.astro, 404.astro
│   └── styles/     # Tailwind + design tokens
├── astro.config.mjs
└── tailwind.config.cjs
```

## Deployment

Pushed to `main` → CI builds `site/` and publishes to GitHub Pages via
`.github/workflows/pages.yml`.