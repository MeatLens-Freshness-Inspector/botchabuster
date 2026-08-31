# Password Recovery Email Design

## Goal

Make the password-recovery email present one supported recovery mechanism: the secure Supabase confirmation link.

## Scope

- Remove the unused `{{ .Token }}` recovery-code block from `backend/supabase/templates/recovery.html`.
- Remove the recovery-code claim from `backend/supabase/templates/README.md`.
- Keep both recovery links based on `{{ .ConfirmationURL }}` so Supabase supplies the signed, expiring verification URL.
- Leave OTP/token fields in unrelated Supabase templates unchanged because those templates represent separate email flows.

## Verification

Add a regression test that reads the recovery template and verifies it contains `{{ .ConfirmationURL }}` while containing neither the recovery-code label nor `{{ .Token }}`. Run that test and the relevant backend test suite.
