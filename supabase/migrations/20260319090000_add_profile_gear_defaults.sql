/*
 * File:        supabase/migrations/20260319090000_add_profile_gear_defaults.sql
 * Description: Add persisted gear default fields to profiles.
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
  add column if not exists tackle_rod text not null default '',
  add column if not exists tackle_reel text not null default '',
  add column if not exists tackle_line_weight text not null default '',
  add column if not exists tackle_bobber_float text not null default '',
  add column if not exists tackle_weight text not null default '',
  add column if not exists tackle_leader text not null default '',
  add column if not exists tackle_leader_weight text not null default '';
