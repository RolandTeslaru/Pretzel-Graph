-- Restrict public.users SELECT to the caller's own row.
-- Applied 2026-07-29 to Supabase Cloud project ugkmtcqtzfmcbhkqvdbz.
--
-- WHY
-- The table previously carried the policy "Public users viewable" with
-- USING (true) granted to role `public`. That is the Supabase User Management
-- quickstart policy, which is written for a `profiles` table holding only
-- display fields. Our table is `users`, and handle_new_user() writes the
-- account's email into it on every signup:
--
--     insert into public.users (id, email, username)
--     values (new.id, new.email, new.raw_user_meta_data->>'username');
--
-- RLS is row-level, so USING (true) could not expose `username` while hiding
-- `email`/`is_admin` — every column of every row was readable by anyone
-- holding the anon key, which ships in the frontend bundle and is therefore
-- public. Harmless-ish while the stack was self-hosted behind Tailscale;
-- not harmless once it moved to a public Supabase Cloud endpoint.
--
-- SAFE BECAUSE
-- Only two callers read this table, and neither needs cross-user reads:
--   - services/Auth/auth.service.ts        getMe()          -> .eq('id', userId), runs as `authenticated`
--   - services/Permission/permission.service.ts assertUserAdmin() -> createServiceClient(), service_role bypasses RLS
-- The frontend never queries public.users. No PostgREST embedded joins target
-- it. handle_new_user() is SECURITY DEFINER, so signup inserts are unaffected.

ALTER POLICY "Public users viewable" ON public.users
  TO authenticated
  USING ((select auth.uid()) = id);

ALTER POLICY "Public users viewable" ON public.users
  RENAME TO "Users can view own profile";

-- Verification (expected results in comments):
--   anon via PostgREST                 -> 0 rows
--   authenticated user                 -> exactly 1 row, their own
--   service_role                       -> all rows
--   anon SELECT on workflows           -> unchanged (is_public sharing intact)
