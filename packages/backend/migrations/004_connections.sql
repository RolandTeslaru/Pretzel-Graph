-- Connections: a user's saved gateway connection, created in the library from a definition.
-- One row is one live socket, so a credential backs at most one connection; definitions without secrets store none.

create table connections (
    id            uuid default gen_random_uuid() not null,
    folder_id     uuid not null,
    definition_id text not null,
    name          text not null,
    credential_id uuid,
    field_values  jsonb default '{}'::jsonb not null,
    status        text default 'pending' not null,
    error         text,
    created_at    timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at    timestamp with time zone default timezone('utc'::text, now()) not null,
    created_by    uuid,

    constraint connections_name_length check (char_length(name) <= 128),
    constraint connections_status_check check (status in ('pending', 'active', 'inactive', 'failed'))
);

alter table only connections add constraint connections_pkey primary key (id);

-- Two connections on one credential would open two sockets under the same identity,
-- and the provider would deliver every event twice.
alter table only connections add constraint connections_credential_id_key unique (credential_id);

alter table only connections
    add constraint connections_folder_id_fkey foreign key (folder_id) references folders(id) on delete restrict;

alter table only connections
    add constraint connections_credential_id_fkey foreign key (credential_id) references credential_instance(id) on delete restrict;

alter table only connections
    add constraint connections_created_by_fkey foreign key (created_by) references users(id) on update cascade on delete set null;

create trigger connections_set_updated_at before update on connections for each row execute function set_updated_at();
