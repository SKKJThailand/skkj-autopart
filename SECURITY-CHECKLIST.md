# SKKJ Security Checklist

Status key:
- PASS = prepared in this workspace
- TODO = must be completed in Supabase/GitHub/server deployment

## GitHub Safety

- PASS: `.gitignore` blocks `.env`, `.env.*`, logs, and build folders.
- PASS: `.env.example` shows what secrets are needed without exposing real secrets.
- PASS: Frontend uses only the Supabase publishable key.
- TODO: Before every GitHub upload, confirm no `.env` file is selected.

## Supabase Safety

- PASS: Secure schema/RLS SQL is provided in `supabase/migrations/001_skkj_secure_schema.sql`.
- PASS: Product image and payment slip Storage policies are included.
- TODO: Run the migration SQL in Supabase SQL Editor.
- TODO: Test that customers cannot read other customers' orders or slips.
- TODO: Test that customers cannot edit products, stock, prices, order status, or admin logs.

## Backend/API Safety

- PASS: Supabase Edge Function templates are provided.
- PASS: Server-only comments warn against putting service-role or OpenAI keys in frontend.
- PASS: Admin actions are designed to require confirmation.
- PASS: High-risk admin actions are designed to require owner role.
- TODO: Deploy Edge Functions before using real OpenAI/admin automation.
- TODO: Store `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` only as Supabase function secrets.

## File Upload Safety

- PASS: SQL creates a public `product-images` bucket and private `payment-slips` bucket.
- PASS: Payment slips are separated by customer user folder.
- TODO: Enforce file size and MIME type in upload Edge Function before production.
- TODO: Do not allow `.exe`, `.js`, `.html`, or unsafe `.svg` uploads.

## Thai Support

- PASS: Schema uses UTF-8 text fields for Thai names, addresses, products, chat, and logs.
- PASS: Search fields include Thai and English keywords/aliases.
- TODO: Test Thai names and addresses after Supabase migration.

## Remaining Risk

- TODO: GitHub Pages is only static hosting. Real protected actions need Supabase RLS and Edge Functions.
- TODO: The old `skkj_site_state` single-row test table should not be trusted for a real shop.
