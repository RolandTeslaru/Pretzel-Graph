-- A chat a gateway event belongs to, named by where it came from rather than by a generated id.
-- The key is scoped to the workflow: two workflows listening to one Discord channel keep separate
-- conversations. Chats created in the editor have no external origin and leave it null.

alter table chats add column external_key text;

alter table chats add constraint chats_external_key_length check (char_length(external_key) <= 256);

create unique index chats_workflow_external_key_key
    on chats (workflow_id, external_key)
    where external_key is not null;
