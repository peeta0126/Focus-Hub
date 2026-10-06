alter table public.events
  add column if not exists source_task_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_source_task_id_fkey'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_source_task_id_fkey
      foreign key (source_task_id)
      references public.tasks(id)
      on delete cascade;
  end if;
end
$$;

create unique index if not exists events_source_task_id_key
  on public.events (source_task_id);

revoke all on table public.events from anon;
grant select, insert, update, delete on table public.events to authenticated;
alter table public.events enable row level security;

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
