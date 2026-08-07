-- Login role for the Kysely `rlsDb` pool (DATABASE_URL_APP).
-- APPLIED 2026-08-08 to project ugkmtcqtzfmcbhkqvdbz; verified below.
--
-- WHY
-- The whole safety property of src/db/index.ts is that forgetting `asUser()`
-- runs with auth.uid() null, so policies match only rows they grant
-- unconditionally — never another user's. That only holds if the pool's
-- LOGIN role cannot bypass RLS:
--
--   * not the owner of any table in public  (owners are exempt from RLS)
--   * no BYPASSRLS attribute
--   * no SUPERUSER
--
-- If the pool logs in as `postgres`, `set_config('role','authenticated',...)`
-- inside asUser() still scopes the queries — but any query that skips the
-- wrapper runs as superuser with RLS off. That is the failure mode this avoids.
--
-- Supabase already ships a role with exactly the right privileges:
-- `authenticated`, which every existing policy is written against. So rather
-- than granting tables individually, make the login role a member of it and
-- inherit. Policies with `TO authenticated` apply to members (Postgres checks
-- role membership, not identity).

-- INHERIT is the default, stated explicitly because it is load-bearing:
-- membership in `authenticated` must confer its privileges without an explicit
-- SET ROLE, or an un-scoped query has no table access at all.
create role pretzel_app with
    login
    inherit
    password 'REPLACE_BEFORE_RUNNING'
    in role authenticated;

-- Postgres does not let a non-superuser create a role with BYPASSRLS, so the
-- absence is the default. Assert it anyway before trusting the pool:
--
--   select rolname, rolsuper, rolbypassrls, rolinherit
--   from pg_roles where rolname = 'pretzel_app';
--   -- expect: rolsuper = f, rolbypassrls = f, rolinherit = t
--
-- And confirm it owns nothing in public:
--
--   select tablename, tableowner from pg_tables
--   where schemaname = 'public' and tableowner = 'pretzel_app';
--   -- expect: 0 rows

-- VERIFICATION (run as pretzel_app, outside any asUser scope)
--   select * from workflows;
--   -- expect: only rows a policy grants with auth.uid() null. The workflows
--   -- policy is `user_id = auth.uid() OR is_public`, so that is the public
--   -- workflows and nothing else. NOT zero rows — the fail-closed property is
--   -- "no private row of any user", not "no row at all", and it is the policy
--   -- that decides which. A table whose policies are all auth.uid()-based does
--   -- return zero. If you see a private row here, the role is over-privileged.
--   -- Measured 2026-08-08: 2 rows, both is_public, out of 36.
--
-- Then inside a transaction, mimicking asUser():
--   begin;
--   select set_config('role','authenticated',true),
--          set_config('request.jwt.claims','{"sub":"<a real user uuid>"}',true);
--   select current_setting('role'), auth.uid();
--   select count(*) from workflows;   -- expect: that user's workflows + public
--   commit;
--   select current_setting('request.jwt.claims', true), auth.uid();
--   -- expect: claims = '' (empty string, NOT null — Postgres keeps the GUC
--   -- defined once set and blanks it on unwind) and auth.uid() = null. Check
--   -- auth.uid(), not the raw claims: null there is what proves the identity
--   -- did not survive onto the next request on a pooled connection.
