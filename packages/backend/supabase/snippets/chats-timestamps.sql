-- `chats` owns its timestamps. Run once in the Supabase SQL editor.

alter table public.chats
    add column if not exists created_at timestamptz,
    add column if not exists updated_at timestamptz;

update public.chats
set
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, created_at, now())
where created_at is null or updated_at is null;

alter table public.chats
    alter column created_at set default now(),
    alter column created_at set not null,
    alter column updated_at set default now(),
    alter column updated_at set not null;

create or replace function public.set_chat_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists chats_set_updated_at on public.chats;

create trigger chats_set_updated_at
before update on public.chats
for each row
execute function public.set_chat_updated_at();
