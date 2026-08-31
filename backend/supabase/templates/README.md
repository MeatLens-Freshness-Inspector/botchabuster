# MeatLens Supabase Auth Email Templates

This folder contains branded MeatLens templates for Supabase authentication emails:

- `confirmation.html` - email verification after sign-up
- `recovery.html` - password reset
- `magic_link.html` - passwordless login
- `invite.html` - invitation email
- `email_change.html` - email change verification
- `reauthentication.html` - one-time code for sensitive actions

## Local Supabase CLI usage

These templates are already wired in:

- `backend/supabase/config.toml`

To apply them locally, restart Supabase services:

```bash
supabase stop
supabase start
```

## Hosted Supabase usage

In Supabase Dashboard:

1. Go to `Authentication -> Email Templates`.
2. Open each auth template type.
3. Copy-paste the matching HTML file from this folder.
4. Set subject lines to match your preferred wording (or use the ones in `config.toml`).

## Notes

- The recovery template uses `{{ .ConfirmationURL }}` as its only action. Other templates may use Supabase variables like `{{ .Token }}`, `{{ .Email }}`, and `{{ .NewEmail }}` where their email flow intentionally includes a code or address detail.
- Design tokens mirror MeatLens app UI: dark charcoal surfaces, green primary action, amber security accent, and mono uppercase headings.
