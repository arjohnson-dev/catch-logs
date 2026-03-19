/*
 * File:        supabase/migrations/20260319020500_add_ai_summary_source_details.sql
 * Description: Add a separate field-guide species column for the actual AI summary sources used.
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
alter table "field-guide".species
add column if not exists ai_summary_source_details jsonb null;
