/*
 * File:        supabase/migrations/20260319133000_add_gear_snapshot_to_journal_entries.sql
 * Description: Add gear snapshot fields to journal entries.
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
  add column if not exists tackle_drag numeric(3,2),
  add column if not exists tackle_rod_length text,
  add column if not exists tackle_rod_power text,
  add column if not exists tackle_rod_action text,
  add column if not exists tackle_line_type text,
  add column if not exists tackle_line_test text,
  add column if not exists tackle_bobber_float text,
  add column if not exists tackle_weight_oz text,
  add column if not exists tackle_leader_material text,
  add column if not exists tackle_leader_length text;
