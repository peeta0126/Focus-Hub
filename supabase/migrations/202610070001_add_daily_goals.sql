create table if not exists public.daily_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  goal_date date not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists daily_goals_user_date_created_idx
  on public.daily_goals (user_id, goal_date, created_at);

revoke all on table public.daily_goals from anon;
grant select, insert, update, delete on table public.daily_goals to authenticated;
alter table public.daily_goals enable row level security;

drop policy if exists owner_select on public.daily_goals;
drop policy if exists owner_insert on public.daily_goals;
drop policy if exists owner_update on public.daily_goals;
drop policy if exists owner_delete on public.daily_goals;

create policy owner_select
on public.daily_goals for select to authenticated
using ((select auth.uid()) = user_id);

create policy owner_insert
on public.daily_goals for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy owner_update
on public.daily_goals for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy owner_delete
on public.daily_goals for delete to authenticated
using ((select auth.uid()) = user_id);
