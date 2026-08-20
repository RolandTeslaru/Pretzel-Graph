-- 001_initial — the application schema.
--
-- Living document until the first release: schema changes are edits to this file,
-- not new numbered migrations. Keep `db/index.ts` and the shared domain in step,
-- and test-apply against an ephemeral Postgres before calling an edit done.
--
-- `created_by` is attribution, not authority: nullable, `on delete set null`.
-- `api_keys.user_id` cascades — a key authenticates as that member.
--
-- `gen_random_uuid()` is core Postgres since 13; no pgcrypto needed.

create table users (
    id           uuid not null,
    email        text not null,
    username     text not null,
    display_name text not null,
    avatar_url   text,
    created_at   timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at   timestamp with time zone default timezone('utc'::text, now()) not null
);

create table members (
    user_id    uuid not null,
    role       text not null,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null,

    constraint members_role_check check (role in ('owner', 'admin', 'member'))
);

-- One row, seeded below. Records that this deployment has an owner, so clearing
-- `members` cannot hand ownership to the next caller.
create table deployment (
    id         boolean default true not null,
    claimed_by uuid,
    claimed_at timestamp with time zone,

    constraint deployment_singleton check (id)
);

create table folders (
    id               uuid default gen_random_uuid() not null,
    display_name     text not null,
    description      text,
    parent_folder_id uuid,
    created_at       timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at       timestamp with time zone default timezone('utc'::text, now()) not null,
    created_by       uuid,

    -- Only the seeded root folder has no parent.
    constraint folders_root_check check ((parent_folder_id is not null) or (id = '00000000-0000-4000-8000-000000000001'))
);

create table workflows (
    id           uuid default gen_random_uuid() not null,
    display_name text not null,
    description  text default ''::text,
    locked       boolean default false,
    mcp_enabled  boolean default false,
    data         jsonb default '{}'::jsonb not null,
    created_at   timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at   timestamp with time zone default timezone('utc'::text, now()) not null,
    folder_id    uuid not null,
    created_by   uuid,
    icon         text,
    accent       text,
    icon_color   text
);

create table version_control (
    workflow_id   uuid not null,
    published_at  timestamp with time zone default now() not null,
    created_by    uuid,
    workflow_data jsonb not null,
    is_active     boolean default true not null,
    version       smallint default '1'::smallint not null,
    name          text not null,
    description   text,
    id            uuid default gen_random_uuid() not null
);

create table executions (
    id          uuid default gen_random_uuid() not null,
    created_at  timestamp with time zone default now() not null,
    updated_at  timestamp with time zone default now() not null,
    workflow_id uuid not null,
    igniter     jsonb not null,
    status      character varying not null,
    duration    real,

    -- Null when a machine triggered the run; `igniter` records what did.
    created_by  uuid,
    session     jsonb,
    error       jsonb,
    chat_id     uuid,
    recording   jsonb
);

create table chats (
    created_at  timestamp with time zone default now() not null,
    name        text,
    updated_at  timestamp with time zone default now() not null,
    attachments jsonb,
    id          uuid default gen_random_uuid() not null,
    created_by  uuid,
    workflow_id uuid
);

create table chat_messages (
    id          uuid default gen_random_uuid() not null,
    created_at  timestamp with time zone default now() not null,
    chat_id     uuid not null,
    content     text not null,
    role        text not null,
    data        jsonb,
    attachments jsonb,
    updated_at  timestamp with time zone default now() not null
);

create table credential_instance (
    id          uuid default gen_random_uuid() not null,
    created_at  timestamp with time zone default now() not null,
    updated_at  timestamp with time zone default now() not null,
    template_id text not null,
    name        text not null,
    blob        text not null,

    created_by  uuid
);

comment on table credential_instance is 'Holds user credentials';

create table api_keys (
    id           uuid default gen_random_uuid() not null,
    created_at   timestamp with time zone default now() not null,
    user_id      uuid not null,
    name         text not null,
    last_used_at timestamp with time zone,
    expires_at   timestamp with time zone,
    revoked_at   timestamp with time zone,
    key_hash     text not null,
    prefix       text not null
);


-- ── Primary keys and unique constraints ──────────────────────────────────────

alter table only users               add constraint users_pkey               primary key (id);
alter table only members             add constraint members_pkey             primary key (user_id);
alter table only deployment          add constraint deployment_pkey          primary key (id);
alter table only folders             add constraint folders_pkey             primary key (id);
alter table only workflows           add constraint workflows_pkey           primary key (id);
alter table only version_control     add constraint version_control_pkey     primary key (id);
alter table only executions          add constraint executions_pkey          primary key (id);
alter table only chats               add constraint chats_pkey               primary key (id);
alter table only chat_messages       add constraint chat_messages_pkey       primary key (id);
alter table only credential_instance add constraint credential_instance_pkey primary key (id);
alter table only api_keys            add constraint api_keys_pkey            primary key (id);

alter table only version_control
    add constraint version_control_workflow_id_version_key unique (workflow_id, version);


-- ── Foreign keys ─────────────────────────────────────────────────────────────

alter table only members
    add constraint members_user_id_fkey foreign key (user_id) references users(id) on delete cascade;

alter table only deployment
    add constraint deployment_claimed_by_fkey foreign key (claimed_by) references users(id) on delete set null;

-- Attribution FKs blank on delete; the rows outlive the user.
alter table only folders
    add constraint folders_created_by_fkey foreign key (created_by) references users(id) on update cascade on delete set null;

alter table only folders
    add constraint folders_parent_folder_id_fkey foreign key (parent_folder_id) references folders(id) on delete cascade;

alter table only workflows
    add constraint workflows_created_by_fkey foreign key (created_by) references users(id) on update cascade on delete set null;

alter table only workflows
    add constraint workflows_folder_id_fkey foreign key (folder_id) references folders(id) on delete cascade;

alter table only version_control
    add constraint version_control_created_by_fkey foreign key (created_by) references users(id) on update cascade on delete set null;

alter table only version_control
    add constraint version_control_workflow_id_fkey foreign key (workflow_id) references workflows(id) on update cascade on delete cascade;

alter table only executions
    add constraint executions_created_by_fkey foreign key (created_by) references users(id) on update cascade on delete set null;

alter table only executions
    add constraint executions_workflow_id_fkey foreign key (workflow_id) references workflows(id) on update cascade on delete cascade;

alter table only executions
    add constraint executions_chat_id_fkey foreign key (chat_id) references chats(id) on update cascade on delete set null;

alter table only chats
    add constraint chats_created_by_fkey foreign key (created_by) references users(id) on update cascade on delete set null;

alter table only chats
    add constraint chats_workflow_id_fkey foreign key (workflow_id) references workflows(id) on update cascade on delete cascade;

alter table only chat_messages
    add constraint chat_messages_chat_id_fkey foreign key (chat_id) references chats(id) on delete cascade;

alter table only credential_instance
    add constraint credential_instance_created_by_fkey foreign key (created_by) references users(id) on update cascade on delete set null;

alter table only api_keys
    add constraint api_keys_user_id_fkey foreign key (user_id) references users(id) on update cascade on delete cascade;


-- ── Indexes ──────────────────────────────────────────────────────────────────

create unique index users_username_lower_key on users using btree (lower(username));

create unique index one_active_per_workflow on version_control using btree (workflow_id) where (is_active = true);


-- ── Triggers ─────────────────────────────────────────────────────────────────

create function set_updated_at() returns trigger
    language plpgsql
    as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger members_set_updated_at             before update on members             for each row execute function set_updated_at();
create trigger folders_set_updated_at             before update on folders             for each row execute function set_updated_at();
create trigger workflows_set_updated_at           before update on workflows           for each row execute function set_updated_at();
create trigger executions_set_updated_at          before update on executions          for each row execute function set_updated_at();
create trigger chats_set_updated_at               before update on chats               for each row execute function set_updated_at();
create trigger chat_messages_set_updated_at       before update on chat_messages       for each row execute function set_updated_at();
create trigger credential_instance_set_updated_at before update on credential_instance for each row execute function set_updated_at();

create function prevent_api_key_immutable_changes() returns trigger
    language plpgsql
    as $$
begin
    if  new.id           is distinct from old.id
     or new.user_id      is distinct from old.user_id
     or new.prefix       is distinct from old.prefix
     or new.key_hash     is distinct from old.key_hash
     or new.expires_at   is distinct from old.expires_at
     or new.created_at   is distinct from old.created_at
     or new.last_used_at is distinct from old.last_used_at
    then
        raise exception 'api_keys: only name and revoked_at may be modified';
    end if;
    return new;
end;
$$;

create trigger api_keys_prevent_immutable before update on api_keys for each row execute function prevent_api_key_immutable_changes();

create function prevent_root_folder_delete() returns trigger
    language plpgsql
    as $$
begin
    raise exception 'folders: the root folder cannot be deleted';
end;
$$;

create trigger folders_prevent_root_delete before delete on folders for each row when (old.id = '00000000-0000-4000-8000-000000000001') execute function prevent_root_folder_delete();

insert into deployment (id) values (true);

insert into folders (id, display_name) values ('00000000-0000-4000-8000-000000000001', 'Home');
