-- Support both user-triggered and service-triggered workflow executions.
-- 1) Make jobs.user_id optional.
-- 2) Add jobs.trigger metadata for auditability and ownership context.
-- 3) Update RLS to allow user-owned rows and service-role initiated rows.

begin;

alter table public.jobs
    alter column user_id drop not null;

alter table public.jobs
    add column if not exists trigger jsonb;

-- Backfill trigger metadata for existing rows.
update public.jobs
set trigger = jsonb_build_object('type', 'user', 'userId', user_id)
where trigger is null and user_id is not null;

update public.jobs
set trigger = jsonb_build_object('type', 'service', 'service', 'unknown')
where trigger is null and user_id is null;

alter table public.jobs
    alter column trigger set not null;

-- Replace legacy policies with trigger-aware versions.
drop policy if exists "Users can view their own jobs" on public.jobs;
drop policy if exists "Users can insert their own jobs" on public.jobs;
drop policy if exists "Users can update their own jobs" on public.jobs;

create policy "Users can view their own jobs"
on public.jobs for select
using (user_id is not null and auth.uid() = user_id);

create policy "Users and services can insert jobs"
on public.jobs for insert
with check (
    (auth.role() = 'service_role')
    or (user_id is not null and auth.uid() = user_id)
);

create policy "Users and services can update jobs"
on public.jobs for update
using (
    (auth.role() = 'service_role')
    or (user_id is not null and auth.uid() = user_id)
)
with check (
    (auth.role() = 'service_role')
    or (user_id is not null and auth.uid() = user_id)
);

commit;
