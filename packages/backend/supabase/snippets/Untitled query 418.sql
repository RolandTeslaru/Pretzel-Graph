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