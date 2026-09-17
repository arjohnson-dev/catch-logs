/*
 * File:        supabase/migrations/20260917175711_remove_tackle_drag.sql
 * Description: Remove tackle drag fields from profiles and journal entries.
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
  drop column if exists tackle_drag;

alter table public.journal_entries
  drop column if exists tackle_drag;
