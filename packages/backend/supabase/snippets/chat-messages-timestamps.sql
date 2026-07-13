-- `chat_messages` owns its timestamps. Run once in the Supabase SQL editor.

alter table public.chat_messages
    add column if not exists created_at timestamptz,
    add column if not exists updated_at timestamptz;

update public.chat_messages
set
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, created_at, now())
where created_at is null or updated_at is null;

alter table public.chat_messages
    alter column created_at set default now(),
    alter column created_at set not null,
    alter column updated_at set default now(),
    alter column updated_at set not null;

create or replace function public.set_chat_message_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists chat_messages_set_updated_at on public.chat_messages;

create trigger chat_messages_set_updated_at
before update on public.chat_messages
for each row
execute function public.set_chat_message_updated_at();
