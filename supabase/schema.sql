-- Focus Hub schema derived from the current application queries.
-- Run this file once in a NEW Supabase project's SQL Editor.
-- It intentionally excludes unused tables/columns such as profiles,
-- goal_milestones, and events.all_day.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  thumbnail text,
  status text not null default 'planning'
    check (status in ('planning', 'active', 'paused', 'completed')),
  progress smallint not null default 0
    check (progress between 0 and 100),
  start_date date,
  due_date date,
  github_url text,
  deploy_url text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  category text not null default '개인',
  due_date date not null,
  due_time time,
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null default '개인',
  progress smallint not null default 0
    check (progress between 0 and 100),
  target_date date,
  status text not null default 'active'
    check (status in ('active', 'paused', 'completed')),
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  goal_date date not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  icon text,
  frequency text not null default 'daily'
    check (frequency in ('daily', 'weekly')),
  target_count integer not null default 1
    check (target_count >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.habit_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  date date not null,
  completed boolean not null default true,
  unique (habit_id, date)
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null default '',
  tags text[] not null default '{}',
  category text not null default '메모',
  updated_at timestamptz not null default now()
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  mood text,
  events text not null default '',
  wins text not null default '',
  regrets text not null default '',
  tomorrow text not null default '',
  unique (user_id, entry_date)
);

create table if not exists public.cs_study_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null default '기타',
  study_date date not null,
  key_points text not null default '',
  code text not null default '',
  reflection text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  url text not null,
  description text not null default '',
  category text not null default '기타',
  tags text[] not null default '{}',
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_task_id uuid unique references public.tasks(id) on delete cascade,
  title text not null,
  description text not null default '',
  event_date date not null,
  start_time time,
  end_time time,
  category text not null default '일정',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  daily_quote text not null default '오늘의 꾸준함이, 내일의 실력이 된다.',
  weather_location text not null default '충주시',
  timezone text not null default 'Asia/Seoul'
);

-- updated_at is required only by tables that the application orders or displays
-- by updated_at. The trigger does not exist on tables that do not have that column.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'projects',
    'goals',
    'habits',
    'notes',
    'cs_study_logs',
    'resources',
    'events'
  ]
  loop
    execute format(
      'drop trigger if exists set_%I_updated_at on public.%I',
      table_name,
      table_name
    );
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end
$$;

-- Indexes mirror the filters and ordering used by the application.
create index if not exists tasks_user_due_idx
  on public.tasks (user_id, due_date, due_time);
create index if not exists tasks_user_project_created_idx
  on public.tasks (user_id, project_id, created_at desc);
create index if not exists projects_user_status_updated_idx
  on public.projects (user_id, status, updated_at desc);
create index if not exists goals_user_status_updated_idx
  on public.goals (user_id, status, updated_at desc);
create index if not exists daily_goals_user_date_created_idx
  on public.daily_goals (user_id, goal_date, created_at);
create index if not exists habits_user_active_created_idx
  on public.habits (user_id, active, created_at);
create index if not exists habit_records_user_date_idx
  on public.habit_records (user_id, date);
create index if not exists notes_user_updated_idx
  on public.notes (user_id, updated_at desc);
create index if not exists events_user_date_idx
  on public.events (user_id, event_date);
create index if not exists cs_study_logs_user_updated_idx
  on public.cs_study_logs (user_id, updated_at desc);
create index if not exists resources_user_updated_idx
  on public.resources (user_id, updated_at desc);

-- The browser and server clients both use the authenticated role.
grant usage on schema public to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'projects',
    'tasks',
    'goals',
    'daily_goals',
    'habits',
    'habit_records',
    'notes',
    'journal_entries',
    'cs_study_logs',
    'resources',
    'events',
    'settings'
  ]
  loop
    execute format('revoke all on table public.%I from anon', table_name);
    execute format(
      'grant select, insert, update, delete on table public.%I to authenticated',
      table_name
    );
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists owner_all on public.%I', table_name);
  end loop;
end
$$;

-- Standard owner-only policies.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'projects',
    'goals',
    'daily_goals',
    'habits',
    'notes',
    'journal_entries',
    'cs_study_logs',
    'resources',
    'events',
    'settings'
  ]
  loop
    execute format('drop policy if exists owner_select on public.%I', table_name);
    execute format('drop policy if exists owner_insert on public.%I', table_name);
    execute format('drop policy if exists owner_update on public.%I', table_name);
    execute format('drop policy if exists owner_delete on public.%I', table_name);

    execute format(
      'create policy owner_select on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      table_name
    );
    execute format(
      'create policy owner_insert on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      table_name
    );
    execute format(
      'create policy owner_update on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      table_name
    );
    execute format(
      'create policy owner_delete on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      table_name
    );
  end loop;
end
$$;

-- Tasks must belong to the current user. If linked to a project, that project
-- must also belong to the current user.
drop policy if exists owner_select on public.tasks;
drop policy if exists owner_insert on public.tasks;
drop policy if exists owner_update on public.tasks;
drop policy if exists owner_delete on public.tasks;

create policy owner_select
on public.tasks for select to authenticated
using ((select auth.uid()) = user_id);

create policy owner_insert
on public.tasks for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    project_id is null
    or exists (
      select 1
      from public.projects
      where projects.id = tasks.project_id
        and projects.user_id = (select auth.uid())
    )
  )
);

create policy owner_update
on public.tasks for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    project_id is null
    or exists (
      select 1
      from public.projects
      where projects.id = tasks.project_id
        and projects.user_id = (select auth.uid())
    )
  )
);

create policy owner_delete
on public.tasks for delete to authenticated
using ((select auth.uid()) = user_id);

-- Events must belong to the current user. Task-backed events may only
-- reference one of that user's tasks.
drop policy if exists owner_select on public.events;
drop policy if exists owner_insert on public.events;
drop policy if exists owner_update on public.events;
drop policy if exists owner_delete on public.events;

create policy owner_select
on public.events for select to authenticated
using (
  (select auth.uid()) = user_id
  and (
    source_task_id is null
    or exists (
      select 1 from public.tasks
      where tasks.id = events.source_task_id
        and tasks.user_id = (select auth.uid())
    )
  )
);

create policy owner_insert
on public.events for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    source_task_id is null
    or exists (
      select 1 from public.tasks
      where tasks.id = events.source_task_id
        and tasks.user_id = (select auth.uid())
    )
  )
);

create policy owner_update
on public.events for update to authenticated
using (
  (select auth.uid()) = user_id
  and (
    source_task_id is null
    or exists (
      select 1 from public.tasks
      where tasks.id = events.source_task_id
        and tasks.user_id = (select auth.uid())
    )
  )
)
with check (
  (select auth.uid()) = user_id
  and (
    source_task_id is null
    or exists (
      select 1 from public.tasks
      where tasks.id = events.source_task_id
        and tasks.user_id = (select auth.uid())
    )
  )
);

create policy owner_delete
on public.events for delete to authenticated
using (
  (select auth.uid()) = user_id
  and (
    source_task_id is null
    or exists (
      select 1 from public.tasks
      where tasks.id = events.source_task_id
        and tasks.user_id = (select auth.uid())
    )
  )
);

-- Habit records must belong to the current user and may only reference one of
-- that user's habits.
drop policy if exists owner_select on public.habit_records;
drop policy if exists owner_insert on public.habit_records;
drop policy if exists owner_update on public.habit_records;
drop policy if exists owner_delete on public.habit_records;

create policy owner_select
on public.habit_records for select to authenticated
using ((select auth.uid()) = user_id);

create policy owner_insert
on public.habit_records for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.habits
    where habits.id = habit_records.habit_id
      and habits.user_id = (select auth.uid())
  )
);

create policy owner_update
on public.habit_records for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.habits
    where habits.id = habit_records.habit_id
      and habits.user_id = (select auth.uid())
  )
);

create policy owner_delete
on public.habit_records for delete to authenticated
using ((select auth.uid()) = user_id);
