
-- 1. Create the table
create table public.jobs (
  id uuid not null primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  workflow_id text not null,
  status text not null check (status in ('pending', 'running', 'paused', 'completed', 'failed', 'terminated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  duration numeric not null default 0
);
-- 2. Enable Row Level Security (RLS)
alter table public.jobs enable row level security;
-- 3. Create Policy: Users can see only their own jobs
create policy "Users can view their own jobs"
on public.jobs for select
using (auth.uid() = user_id);
-- 4. Create Policy: Users can insert their own jobs
create policy "Users can insert their own jobs"
on public.jobs for insert
with check (auth.uid() = user_id);
-- 5. Create Policy: Users can update their own jobs (e.g. for cancellation or status updates if done via frontend)
create policy "Users can update their own jobs"
on public.jobs for update
using (auth.uid() = user_id);