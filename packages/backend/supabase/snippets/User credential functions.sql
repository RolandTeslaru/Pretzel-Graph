-- 1. Enable Vault (if not already)
create extension if not exists supabase_vault with schema vault;
-- 2. Create User Credentials Table
create table if not exists public.user_credentials (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users not null,
    name text not null,
    provider text not null,
    vault_secret_id uuid references vault.secrets(id) on delete cascade,
    created_at timestamptz default now()
);
-- 3. Enable RLS (Security)
alter table public.user_credentials enable row level security;
-- 4. Policy: Users can only see their own credentials
create policy "Users can view own credentials" 
on public.user_credentials for select 
using (auth.uid() = user_id);
create policy "Users can delete own credentials" 
on public.user_credentials for delete 
using (auth.uid() = user_id);

create policy "Users can update own credentials"
on public.user_credentials for update
using (auth.uid() = user_id);

-- 5. The Function (RPC)
create or replace function public.create_user_credential(
    p_name text,
    p_provider text,
    p_value text
) returns uuid as $$
declare
    secret_id uuid;
begin
    -- Write to Vault (returns the new ID)
    select vault.create_secret(p_value, p_name) into secret_id;
    
    -- Link to User
    insert into public.user_credentials (user_id, name, provider, vault_secret_id)
    values (auth.uid(), p_name, p_provider, secret_id);
    
    return secret_id;
end;
$$ language plpgsql security definer;



create or replace function public.update_user_credential_value(
   p_credential_id uuid,
   p_new_value text
) returns void as $$
declare
   old_secret_id uuid;
   new_secret_id uuid;
begin
   -- 1. Create new secret
   select vault.create_secret(p_new_value, 'updated user key') into new_secret_id;
   
   -- 2. Get old secret ID
   select vault_secret_id into old_secret_id 
   from user_credentials where id = p_credential_id and user_id = auth.uid();
   -- 3. Update pointer
   update user_credentials 
   set vault_secret_id = new_secret_id, created_at = now() -- Optional: update timestamp
   where id = p_credential_id;
   -- 4. Cleanup old secret (Optional but recommended)
   -- Note: Requires permission to delete secrets
   -- perform vault.delete_secret(old_secret_id); 
end;
$$ language plpgsql security definer;