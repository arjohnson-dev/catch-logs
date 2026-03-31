/*
 * File:        supabase/migrations/20260331183000_add_pressure_and_precip_to_journal_entries.sql
 * Description: Restore weather snapshot fields needed for the journal weather card.
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
add column if not exists pressure_msl numeric(8,2),
add column if not exists precipitation_probability numeric(5,2);

alter table public.journal_entries
drop constraint if exists journal_entries_pressure_msl_positive,
add constraint journal_entries_pressure_msl_positive
  check (pressure_msl is null or pressure_msl >= 0),
drop constraint if exists journal_entries_precipitation_probability_range,
add constraint journal_entries_precipitation_probability_range
  check (
    precipitation_probability is null
    or precipitation_probability between 0 and 100
  );
