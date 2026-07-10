# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SKKJ Autopart — Thai steering-rack (แร็คพวงมาลัย) e-commerce site. Live at skkjthailand.github.io/skkj-autopart/.

Tech stack: single HTML file, React 18 + Babel standalone (no build tool, no npm), Supabase backend, GitHub Pages hosting.

Thai is the main language. English is secondary.

---

## File Rules

- The main file is skkj-version-2.html
- index.html must always be an exact copy of skkj-version-2.html
- Third file is skkj-version-2-phone-preview.html
- Always deliver all 3 files together after any change
- All images live in assets/, next to the HTML files

---

## Code Rules

- Do not redesign the site unless asked
- Do not remove existing features
- Logo sizes stay separate per location (brand grid, hero, product detail, mobile) — never one global size
- Always confirm the file compiles before shipping
- Be surgical — it is a 7,500-line file, change only what is needed
- When making a change, do not break existing features

---

## Design DNA (applies to every visual change)

Every page must match the SKKJ product picture design:
cream card background, dark red frame, red STEERING RACK tag,
black footer bar. Site translation of that picture:

- Cream #F5F1E6 family is the base surface (about 60% of any page)
- Charcoal #161616 is structure: text, primary buttons, dark bands,
  footer (about 30%)
- Blood red #9B0018 means money and urgency only: discounts,
  discounted prices, low stock, thin accent lines, one strongest
  CTA per page. Regular prices are charcoal (cream in dark mode).
  Red is only for discounted prices and discount badges - so
  discounts always stand out.
- Gold #C8A83E means quality and trust only: warranty, quality
  marks, stats, star ratings, kicker labels - badges and text only,
  never shapes or large backgrounds
- No triangles, diagonals, or decorative shapes anywhere
- Product photos always sit on light cream surfaces in light mode;
  in dark mode the photo boxes use the dark surface equivalents
  (#2E2E30 range) - this is the accepted dark translation
- Black bands and the footer echo the black bar in the product
  photos, always with a thin red line
- On dark surfaces, red text brightens toward #E24B5A-#FF8A8A range
  and gold text brightens toward #D4AF4E; solid red fills stay
  #9B0018 with cream text

If a change would not look like it belongs next to the SKKJ product
card image, do not make it.

---

## Language Rules

- Thai first, English second everywhere on the site
- When Craig asks in English, reply in English
- Use easy English, no jargon

---

## Working Style Rules

- Ask before guessing if something is unclear
- Show the plan before changing code
- Craig is not a developer — explain simply
- Be a brutally honest advisor — no flattery, challenge weak reasoning, point out blind spots
- After every coding session: confirm index.html matches skkj-version-2.html, then (1) give clickable links to all 3 HTML files, (2) navigate preview to /_downloads.html and give Craig the link http://localhost:5500/_downloads.html for actual downloads, (3) give a short list of what to test — do all 3 every time, never skip any
- If a new image is added to the site, provide that image file so Craig can upload it to assets/ on GitHub — never reference an image that does not already exist in assets/

---

## Security Rules (already applied, do not undo)

- No real admin passwords in the code (login through Supabase only)
- CDN versions pinned: react 18.3.1, react-dom 18.3.1, babel 7.26.4
- No CSP meta tag — it breaks Babel and white-screens the site
- Never put the Supabase service_role key, database password, or any API key in the website or on GitHub
- Frontend uses only the Supabase publishable (anon) key
- Secrets live only in Supabase Edge Function environment variables

---

## Writing Style Rules (for any text or content on the site)

- Clear, simple, short sentences, active voice
- No em dashes, no semicolons, no markdown, no asterisks, no hashtags
- No filler words, no setup language like "in conclusion"
- Bullet points for social posts

---

## Architecture Notes

Single-file React app compiled at runtime by Babel standalone. All state lives in React useState and useRef. Persistence via localStorage and optional Supabase. No bundler, no node_modules.

Key state: brands (products + stock), orders, customers, basket, analytics, searchLog, cartAbandonLog, activityLog, isDark.

Dark mode uses CSS [data-dark="1"] selector with !important — this overrides React inline styles because !important in a style block beats non-!important inline styles.

---

## Features Already Built (do not re-implement)

1. Lazy loading
2. Back-to-top button
3. Open Graph tags
4. Alt text on all images
5. Schema.org markup
6. Recently viewed products
7. Related products
8. Skeleton loading
9. Breadcrumbs
10. Search logging (logs terms and zero-result searches to searchLog state)
11. Product compare
12. Cart abandonment detection (cartAbandonLog state)
13. Error boundary (friendly crash message instead of white screen)
14. Dark mode toggle (moon/sun in nav, isDark state)
15. Today admin overview tab (default landing tab in admin)
16. Revenue trend chart (7/30-day bar chart in Revenue tab)
17. Search terms report and cart abandonment report in Analytics tab
18. CSV export on orders

---

## Database Setup (Supabase)

Run SQL files in this order in the Supabase SQL Editor:

1. supabase/migrations/001_skkj_secure_schema.sql
2. supabase/migrations/002_skkj_business_tables.sql
3. supabase/migrations/003_skkj_online_memory_tables.sql

Edge Functions: supabase/functions/customer-order, admin-action, chat-message, _shared/security.ts

---

## GitHub Upload Rules

Upload: index.html, skkj-version-2.html, skkj-version-2-phone-preview.html, assets/, README.md, supabase/, .gitignore, .env.example

Never upload: .env, service role key, OpenAI API key, any real secrets.

If GitHub browser UI hides dotfiles, use GITIGNORE-UPLOAD.txt and ENV-EXAMPLE-UPLOAD.txt as visible substitutes.
