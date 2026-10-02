-- Large exports are stored as multiple private objects under one prefix. A
-- short-lived hash-backed token lets a native browser download stream the ZIP
-- without exposing the Supabase service key or requiring transport headers.
alter table public.developer_dataset_exports
  add column if not exists download_token_hash text,
  add column if not exists download_token_expires_at timestamptz;

create index if not exists developer_dataset_exports_download_token_idx
  on public.developer_dataset_exports (export_id, download_token_hash)
  where download_token_hash is not null;
