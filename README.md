# East Asia Power Corporate Site

Multilingual enterprise website and built-in Payload CMS for `东亚电力 / East Asia Power / Ostasien Energie`.

## Stack

- Next.js App Router + TypeScript
- Payload CMS at `/admin`
- Postgres via `@payloadcms/db-postgres`
- Localized routes: `/en`, `/zh`, `/de`
- CMS collections: `Pages`, `Articles`, `Media`, `Users`
- CMS global: `SiteSettings`

## Local Development

1. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

2. Start Postgres. With Docker:

   ```bash
   docker compose up -d postgres
   ```

3. Install and run:

   ```bash
   npm install
   npm run dev
   ```

4. Seed demo CMS content and the first admin:

   ```bash
   npm run seed
   ```

   Default seeded admin:

   - Email: `admin@eastasiapower.example`
   - Password: `ChangeMe123!`

5. Open:

   - Website: `http://localhost:3000/en`
   - Chinese: `http://localhost:3000/zh`
   - German: `http://localhost:3000/de`
   - CMS Admin: `http://localhost:3000/admin`

## Content Model

- `Pages`: localized homepage/page content, hero copy, story cards, proof metrics, deployment highlights, CTA and SEO.
- `Articles`: localized title, excerpt, body, SEO, shared slug, category, cover image and publish date.
- `Media`: upload library with localized alt text.
- `SiteSettings`: localized company name, navigation, footer, contact details and default SEO.

## Useful Commands

```bash
npm run dev
npm run seed
npm run generate:types
npm run lint
npm run build
```

Generated visual assets live in `public/assets`. The approved concept reference is stored at `public/concepts/east-asia-power-homepage-concept.png`.
