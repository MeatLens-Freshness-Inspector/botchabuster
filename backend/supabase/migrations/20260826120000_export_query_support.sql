create index if not exists inspections_manual_classification_created_id_idx
  on public.inspections (manual_classification, created_at desc, id desc);

create index if not exists inspections_meat_type_created_id_idx
  on public.inspections (meat_type, created_at desc, id desc);

create index if not exists inspections_image_created_id_idx
  on public.inspections (created_at desc, id desc)
  where image_url is not null;
