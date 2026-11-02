-- Daily message limit for the AI tutor. Each signed-in learner may send a fixed
-- number of tutor messages per day; the counter lives here so the limit holds
-- across devices. Learners can read their own row but only change it through
-- tutor_use(), which counts one message and refuses once the limit is reached.

create table if not exists public.tutor_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default (now() at time zone 'Europe/Berlin')::date,
  count integer not null default 0,
  primary key (user_id, day)
);

alter table public.tutor_usage enable row level security;

create policy "Learners read their own tutor usage"
  on public.tutor_usage for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Counts one tutor message for the signed-in learner.
-- Returns the number of messages left today, or -1 when the limit is reached.
create or replace function public.tutor_use()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  daily_limit constant integer := 30;
  uid uuid := auth.uid();
  today date := (now() at time zone 'Europe/Berlin')::date;
  used integer;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;

  insert into public.tutor_usage (user_id, day, count)
  values (uid, today, 0)
  on conflict (user_id, day) do nothing;

  update public.tutor_usage
     set count = count + 1
   where user_id = uid and day = today and count < daily_limit
  returning count into used;

  if used is null then
    return -1;
  end if;
  return daily_limit - used;
end;
$$;

revoke execute on function public.tutor_use() from public, anon;
grant execute on function public.tutor_use() to authenticated;
