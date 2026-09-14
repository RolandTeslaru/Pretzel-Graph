-- Skills: named markdown instructions kept in the library next to workflows.

create table skills (
    id           uuid default gen_random_uuid() not null,
    folder_id    uuid not null,
    name         text not null,
    description  text default ''::text not null,
    content      text default ''::text not null,
    content_hash text not null,
    icon         text,
    accent       text,
    created_at   timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at   timestamp with time zone default timezone('utc'::text, now()) not null,
    created_by   uuid,

    constraint skills_name_format        check (name ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(name) <= 64),
    constraint skills_description_length check (char_length(description) <= 1024)
);

alter table only skills add constraint skills_pkey     primary key (id);
alter table only skills add constraint skills_name_key unique (name);

alter table only skills
    add constraint skills_folder_id_fkey foreign key (folder_id) references folders(id) on delete cascade;

alter table only skills
    add constraint skills_created_by_fkey foreign key (created_by) references users(id) on update cascade on delete set null;

create trigger skills_set_updated_at before update on skills for each row execute function set_updated_at();

-- The hash covers everything the model reads; field order is fixed by json_build_array.
create function set_skill_content_hash() returns trigger
    language plpgsql
    as $$
begin
    new.content_hash := encode(sha256(convert_to(json_build_array(new.name, new.description, new.content)::text, 'UTF8')), 'hex');
    return new;
end;
$$;

create trigger skills_set_content_hash
    before insert or update of name, description, content on skills
    for each row execute function set_skill_content_hash();
