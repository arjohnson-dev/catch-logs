/*
 * File:        supabase/migrations/20260211173000_ensure_tackle_column.sql
 * Description: <brief description of the purpose of this file>
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
-- Ensure journal_entries uses a non-null tackle column across environments.
-- Handles older schemas that still use `lure` and mixed states safely.

do $$
begin
  -- If legacy column exists and tackle is missing, rename it.
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'journal_entries'
      and column_name = 'lure'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'journal_entries'
      and column_name = 'tackle'
  ) then
    execute 'alter table public.journal_entries rename column lure to tackle';
  end if;

  -- If both columns somehow exist, backfill tackle from lure where needed.
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'journal_entries'
      and column_name = 'lure'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'journal_entries'
      and column_name = 'tackle'
  ) then
    execute $sql$
      update public.journal_entries
      set tackle = coalesce(tackle, lure, 'Unknown')
      where tackle is null
    $sql$;
  end if;

  -- Create tackle if missing entirely.
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'journal_entries'
      and column_name = 'tackle'
  ) then
    execute $sql$
      alter table public.journal_entries
      add column tackle text
    $sql$;
  end if;

  -- Normalize nulls and enforce not null.
  update public.journal_entries
  set tackle = 'Unknown'
  where tackle is null;

  alter table public.journal_entries
    alter column tackle set not null;
end $$;
