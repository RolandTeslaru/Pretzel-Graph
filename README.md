# PretzelGraph

A visual agent workflow editor. Build AI agent pipelines on a node-graph
canvas; the system compiles those graphs and executes them via a
signal-based execution engine.

## Running it

Requires Docker and Node.

The stateful services run in containers; the packages run on your machine.

```bash
docker compose up -d            # postgres, redis, auth
cp .env.example .env            # values already match the compose defaults
npm install
```

Then each package in its own terminal:

```bash
npm run dev --workspace=packages/backend     # http://localhost:3001
npm run dev --workspace=packages/worker
npm run dev --workspace=packages/frontend    # http://localhost:5173
```

Open http://localhost:5173 and sign up. **The first account to sign up becomes
the owner**; later ones are refused until an owner admits them.

You never create tables by hand — the backend migrates its database when it
starts. Data lives in Docker volumes, so it survives restarts. To start over:

```bash
docker compose down -v
```

Clear the browser's site data as well. Sessions are stored client-side, and a
token from the deleted database still verifies — the next page load will
recreate rows under the old account.

### Running the whole thing in containers

```bash
docker compose --profile full up -d     # http://localhost:8080
```

The frontend is served by nginx, which proxies the API and websocket, so the
backend is not published. Pass `--profile full` when stopping it too —
`docker compose down` on its own leaves those containers running, and the
network cannot be removed while they hold it:

```bash
docker compose --profile full down -v
```

Both modes share the same volumes, so switching between them does not switch
databases.

### Bringing your own Postgres

Point `DATABASE_URL` at it and skip the `postgres` container. The only
requirement is that the database itself exists (`createdb pretzel`) — the
backend creates everything inside it.

### Notes

- Nothing else may be listening on `5432`, `6379` or `9999`. A Redis running on
  your machine will shadow the container's and the two will not share state.
- `PRETZEL_ENCRYPTION_KEY` must be 64 hex characters, and the backend and worker
  must agree on it. Changing it makes existing stored credentials unreadable.

## License

PretzelGraph is **source-available**, not open source. It is licensed under the
[Elastic License 2.0](./LICENSE).

- ✅ Free to use, modify, and **self-host** — personal projects, research,
  education, and inside any company for its own operations.
- ❌ You may not offer it to others as a **hosted or managed service**.
- ❌ You may not circumvent license-key-gated functionality.

For hosting PretzelGraph as a service, embedding it in a commercial offering, or
enterprise features, a separate license is required. See
[COMMERCIAL-LICENSE.md](./COMMERCIAL-LICENSE.md).

## Contributing

External pull requests are not open yet — contribution terms are still being settled.
Issues and discussions are welcome.
