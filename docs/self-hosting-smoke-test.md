# Self-hosting smoke test

Run this on a machine that has never run the project. It is the standing check
that a fresh install works end to end.

Start from nothing:

```bash
docker compose --profile full down -v    # if anything is left over
git clone <repo> && cd PretzelGraph
cp .env.example .env
```

## Containers only

```bash
docker compose --profile full up -d
```

- [ ] all six services reach `running`: `docker compose --profile full ps`
- [ ] `http://localhost:8080` serves the app
- [ ] the auth screen offers **only** sign up — "Create the owner account"
- [ ] `curl localhost:8080/api/auth/status` → `{"claimed":false}`
- [ ] sign up; you land on the workflow list as **owner**
- [ ] `curl localhost:8080/api/auth/status` → `{"claimed":true}`
- [ ] a second account signing up is refused with 403
- [ ] create a credential, then reopen it — encrypt and decrypt both work
- [ ] create a project and a workflow
- [ ] open the workflow: the node shelf populates and the realtime socket connects
      (no `RealtimeSDK: Disconnected` in the console)
- [ ] run the workflow; it reaches `completed` and nodes update live
- [ ] copy the node's **test** webhook URL and POST to it; the payload arrives
- [ ] restart without deleting data: `docker compose --profile full restart`
      — you are still signed in, the workflow and its executions are still there

## From the repo

Stop the app containers first, or the ports collide.

```bash
docker compose --profile full down
docker compose up -d          # postgres, redis, auth only
npm install
npm run dev --workspace=packages/backend
npm run dev --workspace=packages/worker
npm run dev --workspace=packages/frontend
```

- [ ] the backend logs `[migrate] applied 001_initial` against an empty database
- [ ] `http://localhost:5173` behaves as above

## Known gaps

- Production webhook URLs (`/webhook/…`) do not fire yet; the test route does.
- Inbound webhooks are unauthenticated — there is no signature verification.

## If something fails

- `docker compose --profile full logs backend`
- a reset needs the browser too: `docker compose --profile full down -v`, then
  clear the site's local storage, or a token from the deleted database will
  still be presented
