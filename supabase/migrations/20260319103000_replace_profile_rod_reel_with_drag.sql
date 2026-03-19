/*
 * File:        supabase/migrations/20260319103000_replace_profile_rod_reel_with_drag.sql
 * Description: Replace profile rod/reel defaults with a drag slider value.
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
  add column if not exists tackle_drag numeric(3,2) not null default 0.5;

alter table public.profiles
  drop column if exists tackle_rod,
  drop column if exists tackle_reel;
