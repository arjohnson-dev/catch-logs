/*
 * File:        supabase/migrations/20260307090000_add_stats_rpc_functions.sql
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
create or replace function public.get_stats_overview()
returns jsonb
language sql
stable
set search_path = public
as $$
with base_entries as (
  select
    e.id,
    e.fish_type,
    e.length,
    e.weight,
    e.lure,
    e.bait,
    e.date_time,
    e.pin_id
  from public.journal_entries e
  where e.user_id = auth.uid()
),
total_catches as (
  select count(*)::int as total
  from base_entries
),
personal_best as (
  select
    e.fish_type,
    e.weight,
    e.length,
    e.date_time
  from base_entries e
  order by coalesce(e.weight, 0) desc, coalesce(e.length, 0) desc, e.date_time desc
  limit 1
),
best_location as (
  select
    p.id,
    p.name,
    p.latitude,
    p.longitude,
    count(*)::int as catches
  from base_entries e
  join public.fishing_pins p on p.id = e.pin_id
  group by p.id, p.name, p.latitude, p.longitude
  order by catches desc, p.name asc
  limit 1
),
species_breakdown as (
  select
    e.fish_type as species,
    count(*)::int as count
  from base_entries e
  group by e.fish_type
  order by count desc, species asc
),
top_lures as (
  select
    e.lure as name,
    count(*)::int as count
  from base_entries e
  where nullif(trim(e.lure), '') is not null
  group by e.lure
  order by count desc, e.lure asc
),
top_baits as (
  select
    e.bait as name,
    count(*)::int as count
  from base_entries e
  where nullif(trim(e.bait), '') is not null
  group by e.bait
  order by count desc, e.bait asc
)
select jsonb_build_object(
  'totalCaught',
  coalesce((select t.total from total_catches t), 0),
  'personalBest',
  (
    select
      case
        when exists(select 1 from personal_best) then (
          select jsonb_build_object(
            'species', p.fish_type,
            'weight', p.weight,
            'length', p.length,
            'dateTime', p.date_time
          )
          from personal_best p
        )
        else null
      end
  ),
  'bestLocation',
  (
    select
      case
        when exists(select 1 from best_location) then (
          select jsonb_build_object(
            'id', b.id,
            'name', b.name,
            'latitude', b.latitude,
            'longitude', b.longitude,
            'catches', b.catches
          )
          from best_location b
        )
        else null
      end
  ),
  'speciesBreakdown',
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'species', s.species,
          'count', s.count
        )
        order by s.count desc, s.species asc
      )
      from species_breakdown s
    ),
    '[]'::jsonb
  ),
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
          'name', b.name,
          'count', b.count
        )
        order by b.count desc, b.name asc
      )
      from top_baits b
    ),
    '[]'::jsonb
  )
);
$$;

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
    e.date_time
  from public.journal_entries e
  join target_species s on e.fish_type = s.species
  where e.user_id = auth.uid()
),
total as (
  select count(*)::int as catches
  from filtered
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
points as (
  select
    extract(hour from f.date_time)::int as hour,
    f.length,
    f.weight,
    to_char(f.date_time, 'Mon DD') as label
  from filtered f
  where f.length is not null or f.weight is not null
)
select jsonb_build_object(
  'species',
  (select s.species from target_species s),
  'totalCatches',
  coalesce((select t.catches from total t), 0),
  'topLures',
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'name', tl.name,
          'count', tl.count
        )
        order by tl.count desc, tl.name asc
      )
      from top_lures tl
    ),
    '[]'::jsonb
  ),
  'topBaits',
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'name', tb.name,
          'count', tb.count
        )
        order by tb.count desc, tb.name asc
      )
      from top_baits tb
    ),
    '[]'::jsonb
  ),
  'conditions',
  (
    select
      case
        when exists(select 1 from weather_rows) then jsonb_build_object(
          'avgTemp', wa.avg_temp,
          'avgWind', wa.avg_wind,
          'commonCondition',
          (select c.weather_condition from common_condition c)
        )
        else null
      end
    from weather_aggregate wa
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
  'points',
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'hour', p.hour,
          'length', p.length,
          'weight', p.weight,
          'label', p.label
        )
        order by p.hour asc
      )
      from points p
    ),
    '[]'::jsonb
  )
);
$$;
