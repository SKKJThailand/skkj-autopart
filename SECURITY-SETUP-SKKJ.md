# SKKJ Secure Setup Guide

This is the safer setup for the real online shop version.

## What Is Safe To Upload To GitHub

Upload these:

- `index.html`
- `skkj-version-2.html`
- `skkj-version-2-phone-preview.html`
- `assets/`
- `.gitignore`
- `.env.example`
- `README.md`
- `SECURITY-SETUP-SKKJ.md`
- `SECURITY-CHECKLIST.md`
- `supabase/`

Do not upload:

- `.env`
- real OpenAI API keys
- Supabase service role key
- webhook secrets
- admin secrets

## Supabase Setup

1. Open Supabase.
2. Go to SQL Editor.
3. Open `supabase/migrations/001_skkj_secure_schema.sql`.
4. Run the SQL.
5. Go to Authentication and create your owner account.
6. In SQL Editor, set your user role to owner:

```sql
update public.profiles
set role = 'owner'
where id = 'YOUR_AUTH_USER_ID';
```

## Serverless Function Setup

The folder `supabase/functions/` contains first-version protected backend functions.

Deploy them later with Supabase CLI:

```bash
supabase functions deploy customer-order
supabase functions deploy admin-action
supabase functions deploy chat-message
```

Set secrets in Supabase, not in GitHub:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key
supabase secrets set OPENAI_API_KEY=your_key
supabase secrets set ADMIN_WEBHOOK_SECRET=your_secret
```

## Important Rule

The browser website may use only:

- Supabase URL
- Supabase publishable key

The browser website must never contain:

- Supabase service role key
- OpenAI API key
- admin secret
- webhook secret

## Customer Error Message

If something fails, customers should see:

ระบบมีปัญหาชั่วคราว กรุณาลองใหม่อีกครั้งหรือติดต่อทีมงานทาง LINE

Admins can see more detail, but never API keys, database passwords, private tokens, or stack traces with secrets.
