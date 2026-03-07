/*
 * File:        supabase/migrations/20260306120000_sync_auth_display_name_to_first_name.sql
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
-- Backfill auth metadata so display name tracks first name for all existing users.
update auth.users
set raw_user_meta_data = jsonb_set(
  jsonb_set(
    jsonb_set(
      coalesce(raw_user_meta_data, '{}'::jsonb),
      '{display_name}',
      to_jsonb(
        coalesce(
          nullif(raw_user_meta_data->>'first_name', ''),
          nullif(raw_user_meta_data->>'firstName', ''),
          nullif(raw_user_meta_data->>'name', ''),
          ''
        )
      ),
      true
    ),
    '{username}',
    to_jsonb(
      coalesce(
        nullif(raw_user_meta_data->>'first_name', ''),
        nullif(raw_user_meta_data->>'firstName', ''),
        nullif(raw_user_meta_data->>'name', ''),
        ''
      )
    ),
    true
  ),
  '{name}',
  to_jsonb(
    coalesce(
      nullif(raw_user_meta_data->>'first_name', ''),
      nullif(raw_user_meta_data->>'firstName', ''),
      nullif(raw_user_meta_data->>'name', ''),
      ''
    )
  ),
  true
),
updated_at = now();
