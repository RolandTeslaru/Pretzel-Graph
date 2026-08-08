-- Slice 1 of SPECS/delegated-execution-principal.md — two independent changes.
-- NOT YET APPLIED.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. publish_workflow(5-arg) → SECURITY INVOKER   [finding F1]
-- ─────────────────────────────────────────────────────────────────────────────
-- There are two overloads. The 3-arg one is already INVOKER. The 5-arg one —
-- the one the backend calls, selected by named-arg notation in
-- version-control.database.ts — is SECURITY DEFINER and performs no ownership
-- check of its own:
--
--     UPDATE version_control SET is_active = false
--      WHERE workflow_id = p_workflow_id AND is_active = true;   -- no owner filter
--     INSERT INTO version_control (workflow_id, user_id, ...) ...
--
-- Running as the owner, that UPDATE reaches every user's rows. Any authenticated
-- caller could therefore deactivate another user's live publication and insert
-- their own workflow_data as the new active version. getActivePublishedWorkflowData
-- filters on workflow_id + is_active only, so an injected graph would then be
-- executed under the victim's identity.
--
-- version_control already carries the policies this needs:
--     UPDATE  USING (user_id = auth.uid())
--     INSERT  WITH CHECK (user_id = auth.uid())
-- so under INVOKER the deactivation scopes to the caller's own publications and
-- the insert is pinned to the caller. No policy changes required.
--
-- The application-side assertWorkflow added in version-control.service.ts covers
-- this today; the conversion is what makes it hold if that assert is ever lost.

alter function public.publish_workflow(uuid, uuid, text, jsonb, text) security invoker;

-- Verify: both overloads should now report prosecdef = false.
--
--   select p.proname,
--          p.prosecdef,
--          pg_get_function_identity_arguments(p.oid) as args
--     from pg_proc p
--     join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname = 'publish_workflow';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Missing UPDATE policy on executions
-- ─────────────────────────────────────────────────────────────────────────────
-- executions has policies for SELECT, INSERT and DELETE but none for UPDATE, so
-- RLS denies every update to `authenticated`. Nothing noticed because all
-- execution updates currently run through DB.asService as `postgres`, which
-- bypasses RLS entirely.
--
-- This is inert on its own. It is a prerequisite for routing execution progress
-- writes through asDelegate (slice 2), which would otherwise fail closed.
--
-- The (select auth.uid()) form matches the existing SELECT/INSERT/DELETE
-- policies on this table — the subquery is evaluated once as an InitPlan rather
-- than per row.

create policy "Users can update their own executions"
    on public.executions
    for update
    using       ((select auth.uid()) = user_id)
    with check  ((select auth.uid()) = user_id);

-- Verify: expect four rows — SELECT, INSERT, UPDATE, DELETE.
--
--   select cmd, policyname, qual, with_check
--     from pg_policies
--    where schemaname = 'public' and tablename = 'executions'
--    order by cmd;
