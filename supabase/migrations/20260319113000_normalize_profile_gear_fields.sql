/*
 * File:        supabase/migrations/20260319113000_normalize_profile_gear_fields.sql
 * Description: Normalize profile gear defaults into structured option fields.
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
alter table public.profiles
  add column if not exists tackle_rod_length text not null default '',
  add column if not exists tackle_rod_power text not null default '',
  add column if not exists tackle_rod_action text not null default '',
  add column if not exists tackle_line_type text not null default '',
  add column if not exists tackle_line_test text not null default '',
  add column if not exists tackle_leader_material text not null default '',
  add column if not exists tackle_leader_length text not null default '';

alter table public.profiles
  drop column if exists tackle_line_weight,
  drop column if exists tackle_leader,
  drop column if exists tackle_leader_weight;
