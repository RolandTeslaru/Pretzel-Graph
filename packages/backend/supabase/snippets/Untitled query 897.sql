create table public.user_credentials (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    provider text not null, 
    vault_secret_id uuid references vault.secrets(id) on delete cascade not null,
    created_at timestamptz default now(),
    
    -- Enforce unique names per user
    constraint unique_credential_name_per_user unique (user_id, name)
);
-- 2. Enable RLS
alter table public.user_credentials enable row level security;
-- 3. Create RLS Policies
create policy "Users can view own credentials" 
on public.user_credentials for select 
using (auth.uid() = user_id);
create policy "Users can delete own credentials" 
on public.user_credentials for delete 
using (auth.uid() = user_id);
