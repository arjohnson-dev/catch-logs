/*
 * File:        supabase/migrations/20260318233000_split_tackle_into_lure_and_bait.sql
 * Description: Split journal_entries.tackle into optional lure and bait columns.
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
  add column if not exists lure text,
  add column if not exists bait text;

update public.journal_entries
set lure = nullif(trim(tackle), '')
where coalesce(nullif(trim(tackle), ''), '') <> '';

alter table public.journal_entries
  drop column if exists tackle;
