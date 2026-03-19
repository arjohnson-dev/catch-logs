/*
 * File:        supabase/migrations/20260319160000_include_field_guide_spec_code_in_species_stats.sql
 * Description: Include the saved field-guide species spec code in species stats responses.
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
create or replace function public.get_species_stats(p_species text)
returns jsonb
language sql
stable
set search_path = public
as $$
with target_species as (
  select coalesce(nullif(trim(p_species), ''), '') as species
),
filtered as (
  select
    e.lure,
    e.bait,
    e.length,
    e.weight,
    e.temperature,
    e.wind_speed,
    e.weather_condition,
    e.date_time,
    e.fish_species_spec_code
  from public.journal_entries e
  join target_species s on e.fish_type = s.species
  where e.user_id = auth.uid()
),
total as (
  select count(*)::int as catches
  from filtered
),
field_guide_species as (
  select min(f.fish_species_spec_code)::bigint as spec_code
  from filtered f
  where f.fish_species_spec_code is not null
    and f.fish_species_spec_code <> 1
),
top_lures as (
  select
    f.lure as name,
    count(*)::int as count
  from filtered f
  where nullif(trim(f.lure), '') is not null
  group by f.lure
  order by count desc, f.lure asc
),
top_baits as (
  select
    f.bait as name,
    count(*)::int as count
  from filtered f
  where nullif(trim(f.bait), '') is not null
  group by f.bait
  order by count desc, f.bait asc
),
weather_rows as (
  select
    f.temperature,
    f.wind_speed,
    f.weather_condition
  from filtered f
  where f.temperature is not null
    or f.wind_speed is not null
    or nullif(trim(coalesce(f.weather_condition, '')), '') is not null
),
weather_aggregate as (
  select
    avg(w.temperature)::numeric(10,2) as avg_temp,
    avg(w.wind_speed)::numeric(10,2) as avg_wind
  from weather_rows w
),
common_condition as (
  select
    w.weather_condition,
    count(*)::int as count
  from weather_rows w
  where nullif(trim(coalesce(w.weather_condition, '')), '') is not null
  group by w.weather_condition
  order by count desc, w.weather_condition asc
  limit 1
),
months as (
  select generate_series(1, 12) as month_index
),
monthly as (
  select
    m.month_index,
    to_char(make_date(2000, m.month_index, 1), 'Mon') as month,
    coalesce(mc.catches, 0)::int as catches
  from months m
  left join (
    select
      extract(month from f.date_time)::int as month_index,
      count(*)::int as catches
    from filtered f
    group by extract(month from f.date_time)
  ) mc on mc.month_index = m.month_index
  order by m.month_index
),
catch_times as (
  select
    h.hour,
    coalesce(c.catches, 0)::int as catches
  from generate_series(0, 23) as h(hour)
  left join (
    select
      extract(hour from f.date_time)::int as hour,
      count(*)::int as catches
    from filtered f
    group by extract(hour from f.date_time)
  ) c on c.hour = h.hour
  order by h.hour
)
select jsonb_build_object(
  'species', (select species from target_species),
  'totalCatches', coalesce((select catches from total), 0),
  'fieldGuideSpecCode', (select spec_code from field_guide_species),
  'topLures',
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'name', t.name,
          'count', t.count
        )
        order by t.count desc, t.name asc
      )
      from top_lures t
    ),
    '[]'::jsonb
  ),
  'topBaits',
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'name', t.name,
          'count', t.count
        )
        order by t.count desc, t.name asc
      )
      from top_baits t
    ),
    '[]'::jsonb
  ),
  'conditions',
  (
    select jsonb_build_object(
      'avgTemp', wa.avg_temp,
      'avgWind', wa.avg_wind,
      'commonCondition', cc.weather_condition
    )
    from weather_aggregate wa
    left join common_condition cc on true
  ),
  'monthly',
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'month', m.month,
          'monthIndex', m.month_index,
          'catches', m.catches
        )
        order by m.month_index
      )
      from monthly m
    ),
    '[]'::jsonb
  ),
  'catchTimes',
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'hour', c.hour,
          'catches', c.catches
        )
        order by c.hour
      )
      from catch_times c
    ),
    '[]'::jsonb
  )
);
$$;
