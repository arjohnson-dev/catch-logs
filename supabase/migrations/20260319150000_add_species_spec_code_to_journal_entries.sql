/*
 * File:        supabase/migrations/20260319150000_add_species_spec_code_to_journal_entries.sql
 * Description: Track the field-guide species spec code for each journal entry, with an unidentified fallback.
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
alter table public.journal_entries
  add column if not exists fish_species_spec_code bigint;

update public.journal_entries as entry
set fish_species_spec_code = coalesce(
  (
    select species.spec_code
    from "field-guide".species as species
    where species.is_active = true
      and (
        lower(trim(coalesce(species.canonical_common_name, ''))) = lower(trim(entry.fish_type))
        or lower(trim(coalesce(species.scientific_name, ''))) = lower(trim(entry.fish_type))
        or exists (
          select 1
          from jsonb_array_elements_text(coalesce(species.alternate_common_names, '[]'::jsonb)) as alternate_name(value)
          where lower(trim(alternate_name.value)) = lower(trim(entry.fish_type))
        )
        or exists (
          select 1
          from jsonb_array_elements_text(coalesce(species.search_aliases, '[]'::jsonb)) as alias_name(value)
          where lower(trim(alias_name.value)) = lower(trim(entry.fish_type))
        )
      )
    order by
      case
        when lower(trim(coalesce(species.canonical_common_name, ''))) = lower(trim(entry.fish_type)) then 0
        when exists (
          select 1
          from jsonb_array_elements_text(coalesce(species.alternate_common_names, '[]'::jsonb)) as alternate_name(value)
          where lower(trim(alternate_name.value)) = lower(trim(entry.fish_type))
        ) then 1
        when exists (
          select 1
          from jsonb_array_elements_text(coalesce(species.search_aliases, '[]'::jsonb)) as alias_name(value)
          where lower(trim(alias_name.value)) = lower(trim(entry.fish_type))
        ) then 2
        when lower(trim(coalesce(species.scientific_name, ''))) = lower(trim(entry.fish_type)) then 3
        else 4
      end,
      species.spec_code
    limit 1
  ),
  1
)
where entry.fish_species_spec_code is null;

update public.journal_entries
set fish_species_spec_code = 1
where fish_species_spec_code is null;

alter table public.journal_entries
  alter column fish_species_spec_code set default 1,
  alter column fish_species_spec_code set not null;

create index if not exists idx_journal_entries_species_spec_code
  on public.journal_entries (fish_species_spec_code);
