# Backend Query Inventory

This inventory tracks the persistence shape required by each modular repository. It is updated with every repository migration.

| Access path | Current behavior | Target projection/bound | Supporting index or RPC |
| --- | --- | --- | --- |
| Inspection timeline | `select("*")`, user filter, created descending, offset range | Named inspection view columns; `(created_at,id)` cursor; hard page limit | `inspections_user_created_id_idx`, `inspections_created_id_idx` |
| Inspection by ID | Full row by ID and owner | Named detail columns; one row | Primary key plus owner predicate |
| Inspection idempotency | Full row by `client_submission_id` and owner | Named detail columns; one row | Existing unique client-submission index |
| Inspection classification stats | Loads every classification into Node | Grouped classification/count rows | `get_inspection_classification_stats` |
| Landing statistics | Two counts plus every classification row | One JSON aggregate | `get_landing_page_stats` |
| In-app model metrics | Loads up to 10,001 full rows | Grouped predicted/actual/meat-type counts | `get_in_app_model_metrics` |
| Active sessions | Separate user/expiry operations | Hash lookup, user+expiry pruning/count | `user_sessions_user_expires_idx` |
| Passkeys | Full passkey rows | Auth fields only for verification; display fields for list | `passkey_credentials_user_created_idx` |
| Audit list | Encrypted payload columns with bounded recent limit | Same required encrypted columns, bounded cursor | `audit_logs_created_id_idx` |
| Chat conversation | Participant OR query with fixed limit | Named message columns and deterministic cursor | `user_chat_messages_pair_created_id_idx` |
| Chat contacts | All roles/profiles plus recent messages | Contact summary rows plus bounded profile projection | `get_user_chat_contact_summary`, role/user indexes |

## Rules

- No new repository may use `select("*")` without documenting why a complete internal row is required.
- Every client-controlled page size is clamped before the Supabase call.
- Every timeline has deterministic ordering with a unique tie-breaker.
- Aggregate endpoints call fixed, service-role-only functions rather than transferring full tables to Node.
- Existing migrations are not edited. New index/function changes are appended as forward-only migrations.
