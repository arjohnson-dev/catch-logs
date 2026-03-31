/*
 * One-shot journal weather backfill.
 *
 * This script:
 * 1. Ensures the needed weather columns exist on public.journal_entries.
 * 2. Enables the Supabase/Postgres HTTP extension.
 * 3. Calls Open-Meteo directly from Postgres for each entry that is missing weather.
 * 4. Updates only missing values, leaving any existing stored values untouched.
 *
 * Notes:
 * - Historical rows use the Open-Meteo archive API.
 * - Current-day/future rows use the forecast API.
 * - Matching is done against the nearest UTC hour to the stored journal timestamp.
 *
 * If your project does not allow CREATE EXTENSION in SQL Editor, enable `http`
 * first from Supabase Dashboard > Database > Extensions, then rerun this file.
 */

begin;

create schema if not exists util;
create schema if not exists extensions;

create extension if not exists http with schema extensions;

alter table public.journal_entries
add column if not exists pressure_msl numeric(8,2),
add column if not exists precipitation_probability numeric(5,2);

alter table public.journal_entries
drop constraint if exists journal_entries_pressure_msl_positive,
add constraint journal_entries_pressure_msl_positive
  check (pressure_msl is null or pressure_msl >= 0),
drop constraint if exists journal_entries_precipitation_probability_range,
add constraint journal_entries_precipitation_probability_range
  check (
    precipitation_probability is null
    or precipitation_probability between 0 and 100
  );

create or replace function util.weather_code_description(code integer)
returns text
language sql
immutable
as $$
  select case code
    when 0 then 'Clear sky'
    when 1 then 'Mainly clear'
    when 2 then 'Partly cloudy'
    when 3 then 'Overcast'
    when 45 then 'Fog'
    when 48 then 'Depositing rime fog'
    when 51 then 'Light drizzle'
    when 53 then 'Moderate drizzle'
    when 55 then 'Dense drizzle'
    when 56 then 'Light freezing drizzle'
    when 57 then 'Dense freezing drizzle'
    when 61 then 'Slight rain'
    when 63 then 'Moderate rain'
    when 65 then 'Heavy rain'
    when 66 then 'Light freezing rain'
    when 67 then 'Heavy freezing rain'
    when 71 then 'Slight snow fall'
    when 73 then 'Moderate snow fall'
    when 75 then 'Heavy snow fall'
    when 77 then 'Snow grains'
    when 80 then 'Slight rain showers'
    when 81 then 'Moderate rain showers'
    when 82 then 'Violent rain showers'
    when 85 then 'Slight snow showers'
    when 86 then 'Heavy snow showers'
    when 95 then 'Thunderstorm'
    when 96 then 'Thunderstorm with slight hail'
    when 99 then 'Thunderstorm with heavy hail'
    else null
  end;
$$;

with candidates as (
  select
    je.id,
    je.date_time,
    fp.latitude,
    fp.longitude,
    (date_trunc('hour', (je.date_time at time zone 'UTC') + interval '30 minutes')) as target_hour_utc,
    ((je.date_time at time zone 'UTC')::date) as target_date_utc,
    case
      when (je.date_time at time zone 'UTC')::date < current_date
        then 'https://archive-api.open-meteo.com/v1/archive'
      else 'https://api.open-meteo.com/v1/forecast'
    end as endpoint
  from public.journal_entries je
  join public.fishing_pins fp
    on fp.id = je.pin_id
  where
    je.temperature is null
    or je.pressure_msl is null
    or je.precipitation_probability is null
    or je.wind_speed is null
    or je.wind_direction is null
    or je.cloud_coverage is null
    or je.visibility is null
    or je.weather_condition is null
    or je.weather_description is null
),
responses as (
  select
    c.*,
    http_response.status,
    http_response.content::jsonb as payload
  from candidates c
  cross join lateral extensions.http_get(
    c.endpoint
    || '?latitude=' || c.latitude::text
    || '&longitude=' || c.longitude::text
    || '&start_date=' || c.target_date_utc::text
    || '&end_date=' || c.target_date_utc::text
    || '&hourly=temperature_2m,pressure_msl,precipitation_probability,windspeed_10m,winddirection_10m,cloudcover,visibility,weathercode'
    || '&timezone=GMT'
  ) as http_response
  where http_response.status = 200
),
hourly_rows as (
  select
    r.id,
    r.target_hour_utc,
    replace(trim(both '"' from t.value::text), 'T', ' ')::timestamp as observed_hour_utc,
    case when temp.value::text = 'null' then null else (temp.value::text)::numeric end as temperature,
    case when pressure.value::text = 'null' then null else (pressure.value::text)::numeric end as pressure_msl,
    case when precip.value::text = 'null' then null else (precip.value::text)::numeric end as precipitation_probability,
    case when wind_speed.value::text = 'null' then null else (wind_speed.value::text)::numeric end as wind_speed,
    case when wind_direction.value::text = 'null' then null else (wind_direction.value::text)::numeric end as wind_direction,
    case when cloud_cover.value::text = 'null' then null else (cloud_cover.value::text)::numeric end as cloud_coverage,
    case when visibility.value::text = 'null' then null else (visibility.value::text)::numeric end as visibility,
    case when weather_code.value::text = 'null' then null else (weather_code.value::text)::integer end as weather_code
  from responses r
  cross join lateral jsonb_array_elements(coalesce(r.payload #> '{hourly,time}', '[]'::jsonb))
    with ordinality as t(value, ord)
  left join lateral (
    select value
    from jsonb_array_elements(coalesce(r.payload #> '{hourly,temperature_2m}', '[]'::jsonb))
      with ordinality as x(value, ord2)
    where ord2 = t.ord
  ) as temp on true
  left join lateral (
    select value
    from jsonb_array_elements(coalesce(r.payload #> '{hourly,pressure_msl}', '[]'::jsonb))
      with ordinality as x(value, ord2)
    where ord2 = t.ord
  ) as pressure on true
  left join lateral (
    select value
    from jsonb_array_elements(coalesce(r.payload #> '{hourly,precipitation_probability}', '[]'::jsonb))
      with ordinality as x(value, ord2)
    where ord2 = t.ord
  ) as precip on true
  left join lateral (
    select value
    from jsonb_array_elements(coalesce(r.payload #> '{hourly,windspeed_10m}', '[]'::jsonb))
      with ordinality as x(value, ord2)
    where ord2 = t.ord
  ) as wind_speed on true
  left join lateral (
    select value
    from jsonb_array_elements(coalesce(r.payload #> '{hourly,winddirection_10m}', '[]'::jsonb))
      with ordinality as x(value, ord2)
    where ord2 = t.ord
  ) as wind_direction on true
  left join lateral (
    select value
    from jsonb_array_elements(coalesce(r.payload #> '{hourly,cloudcover}', '[]'::jsonb))
      with ordinality as x(value, ord2)
    where ord2 = t.ord
  ) as cloud_cover on true
  left join lateral (
    select value
    from jsonb_array_elements(coalesce(r.payload #> '{hourly,visibility}', '[]'::jsonb))
      with ordinality as x(value, ord2)
    where ord2 = t.ord
  ) as visibility on true
  left join lateral (
    select value
    from jsonb_array_elements(coalesce(r.payload #> '{hourly,weathercode}', '[]'::jsonb))
      with ordinality as x(value, ord2)
    where ord2 = t.ord
  ) as weather_code on true
),
nearest_hour as (
  select
    hr.*,
    row_number() over (
      partition by hr.id
      order by abs(extract(epoch from (hr.observed_hour_utc - hr.target_hour_utc)))
    ) as row_num
  from hourly_rows hr
),
resolved as (
  select
    id,
    temperature,
    pressure_msl,
    precipitation_probability,
    wind_speed,
    wind_direction,
    cloud_coverage,
    visibility,
    lower(util.weather_code_description(weather_code)) as weather_condition,
    util.weather_code_description(weather_code) as weather_description
  from nearest_hour
  where row_num = 1
),
applied as (
  update public.journal_entries je
  set
    temperature = coalesce(je.temperature, r.temperature),
    pressure_msl = coalesce(je.pressure_msl, r.pressure_msl),
    precipitation_probability = coalesce(
      je.precipitation_probability,
      r.precipitation_probability
    ),
    wind_speed = coalesce(je.wind_speed, r.wind_speed),
    wind_direction = coalesce(je.wind_direction, r.wind_direction),
    cloud_coverage = coalesce(je.cloud_coverage, r.cloud_coverage),
    visibility = coalesce(je.visibility, r.visibility),
    weather_condition = coalesce(je.weather_condition, r.weather_condition),
    weather_description = coalesce(je.weather_description, r.weather_description)
  from resolved r
  where je.id = r.id
  returning je.id
)
select count(*) as updated_entries
from applied;

commit;

-- Optional verification:
-- select id, date_time, pressure_msl
-- from public.journal_entries
-- where pressure_msl is null
-- order by date_time asc;
