-- Dataset ZIPs are persisted server-side so the browser never has to buffer the archive.
-- The backend service role owns this table and the private storage bucket; no client
-- policy is intentionally granted because download access is mediated by signed URLs.
create table if not exists public.developer_dataset_exports (
  export_id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('ready', 'expired', 'failed')),
  filename text,
  storage_path text,
  size_bytes bigint,
  record_count integer,
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  ready_at timestamptz,
  expires_at timestamptz not null,
  download_count bigint not null default 0,
  last_downloaded_at timestamptz,
  failure_message text,
  constraint developer_dataset_exports_ready_fields check (
    status <> 'ready'
    or (filename is not null and storage_path is not null and size_bytes is not null and record_count is not null and ready_at is not null)
  ),
  constraint developer_dataset_exports_nonnegative_values check (
    (size_bytes is null or size_bytes >= 0)
    and (record_count is null or record_count >= 0)
    and download_count >= 0
  )
);

create index if not exists developer_dataset_exports_owner_created_idx
  on public.developer_dataset_exports (owner_id, created_at desc);

create index if not exists developer_dataset_exports_expiry_idx
  on public.developer_dataset_exports (status, expires_at);

alter table public.developer_dataset_exports enable row level security;

insert into storage.buckets (id, name, public)
values ('developer-dataset-exports', 'developer-dataset-exports', false)
on conflict (id) do update set public = excluded.public;
