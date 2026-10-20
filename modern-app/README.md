# eCuisine modern app foundation

This directory contains the parallel React + TypeScript + Vite application with Tailwind CSS.

## Local development

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
```

The Vite output is configured for `../docs/modern` so the app can be hosted alongside the existing GitHub Pages website. The legacy storefront, affiliate portal, and owner dashboard remain the source of truth until each modern screen is tested and intentionally switched over.

## Current migration stage

- Owner sign-in uses the existing Supabase Auth project.
- Owner data is fetched through the existing `ecuisine-admin` Edge Function actions (`list`, `analytics`, and `affiliates`).
- Order and affiliate views are read-only in this first stage. Mutating controls remain on the existing owner dashboard until the modern UI can be validated end-to-end.
- Sales and cash-flow totals are derived from the records the current API returns; they are not a complete accounting ledger.

Never put a Supabase service-role key in this frontend. The publishable key is intended for browser use; server-side authorization must remain enforced by Supabase and the Edge Function.
