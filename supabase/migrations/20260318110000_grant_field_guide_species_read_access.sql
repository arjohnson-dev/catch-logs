/*
 * File:        supabase/migrations/20260318110000_grant_field_guide_species_read_access.sql
 * Description: Grant read access for active field guide species to app clients.
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
grant usage on schema "field-guide" to anon, authenticated;
grant select on table "field-guide".species to anon, authenticated;

alter table "field-guide".species enable row level security;

drop policy if exists "field_guide_species_read_active" on "field-guide".species;
create policy "field_guide_species_read_active"
on "field-guide".species
for select
to anon, authenticated
using (is_active = true);
