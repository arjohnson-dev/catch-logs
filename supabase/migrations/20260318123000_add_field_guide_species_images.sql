/*
 * File:        supabase/migrations/20260318123000_add_field_guide_species_images.sql
 * Description: Add moderated species image storage and a safe primary-image view for the field guide.
 *
 * Author:      Andrew Johnson
 * Company:     CatchLogs LLC
 *
 * Copyright (c) 2026 CatchLogs LLC. All rights reserved.
 *
 * This source code and all associated files are the property of CatchLogs LLC.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without explicit written permission
 * from CatchLogs LLC.
 */
create table if not exists "field-guide".species_images (
  id uuid primary key default gen_random_uuid(),
  species_id bigint not null,
  source_name text,
  source_url text,
  external_url text,
  storage_path text,
  license_type text,
  copyright_holder text,
  attribution_text text,
  alt_text text,
  width_px integer,
  height_px integer,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  is_app_safe boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint species_images_dimensions_positive check (
    (width_px is null or width_px > 0)
    and (height_px is null or height_px > 0)
  )
);

create index if not exists idx_species_images_species_id
  on "field-guide".species_images (species_id);

create index if not exists idx_species_images_species_sort
  on "field-guide".species_images (species_id, is_primary desc, sort_order asc, created_at asc);

create unique index if not exists uq_species_images_primary_active
  on "field-guide".species_images (species_id)
  where is_primary = true and is_active = true;

create unique index if not exists uq_species_images_identity
  on "field-guide".species_images (
    species_id,
    coalesce(source_name, ''),
    coalesce(source_url, ''),
    coalesce(external_url, '')
  );

drop trigger if exists trg_species_images_set_updated_at on "field-guide".species_images;
create trigger trg_species_images_set_updated_at
before update on "field-guide".species_images
for each row
execute function public.set_updated_at();

alter table "field-guide".species_images enable row level security;

drop policy if exists "field_guide_species_images_read_safe" on "field-guide".species_images;
create policy "field_guide_species_images_read_safe"
on "field-guide".species_images
for select
to anon, authenticated
using (
  is_active = true
  and is_app_safe = true
  and status = 'approved'
);

create or replace view "field-guide".species_primary_images as
select image_rows.*
from (
  select
    si.*,
    row_number() over (
      partition by si.species_id
      order by
        si.is_primary desc,
        si.sort_order asc,
        si.created_at asc,
        si.id asc
    ) as row_number_in_species
  from "field-guide".species_images si
  where
    si.is_active = true
    and si.is_app_safe = true
    and si.status = 'approved'
) image_rows
where image_rows.row_number_in_species = 1;

grant select on table "field-guide".species_images to anon, authenticated;
grant select on table "field-guide".species_primary_images to anon, authenticated;
