-- Safely links the existing tasks table to projects without changing or
-- deleting any existing task. Existing tasks remain unlinked (NULL).
alter table public.tasks
  add column if not exists project_id uuid;

do $$
declare
  existing_constraint text;
  existing_delete_action "char";
begin
  select constraint_row.conname, constraint_row.confdeltype
    into existing_constraint, existing_delete_action
    from pg_constraint constraint_row
    join pg_attribute column_row
      on column_row.attrelid = constraint_row.conrelid
     and column_row.attnum = any (constraint_row.conkey)
    where constraint_row.conrelid = 'public.tasks'::regclass
      and constraint_row.contype = 'f'
      and column_row.attname = 'project_id'
      and constraint_row.confrelid = 'public.projects'::regclass
      and array_length(constraint_row.conkey, 1) = 1
    limit 1;

  -- Preserve tasks on project deletion even if an older deployment used CASCADE.
  if existing_constraint is not null and existing_delete_action <> 'n' then
    execute format('alter table public.tasks drop constraint %I', existing_constraint);
    existing_constraint := null;
  end if;

  if existing_constraint is null then
    alter table public.tasks
      add constraint tasks_project_id_fkey
      foreign key (project_id)
      references public.projects(id)
      on delete set null
      not valid;

    begin
      alter table public.tasks validate constraint tasks_project_id_fkey;
    exception
      when foreign_key_violation then
        raise warning 'Existing invalid tasks.project_id values were preserved; the FK still protects new writes.';
    end;
  end if;
end
$$;

create index if not exists tasks_user_project_created_idx
  on public.tasks (user_id, project_id, created_at desc);

revoke all on table public.tasks from anon;
grant select, insert, update, delete on table public.tasks to authenticated;
alter table public.tasks enable row level security;

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
