/*
 * File:        supabase/migrations/20260319153000_backfill_species_spec_code_for_existing_entries.sql
 * Description: Re-backfill journal entry species spec codes for rows still using the unidentified fallback.
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
update public.journal_entries as entry
set fish_species_spec_code = matched_species.spec_code
from lateral (
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
) as matched_species
where entry.fish_species_spec_code = 1
  and matched_species.spec_code is not null;
