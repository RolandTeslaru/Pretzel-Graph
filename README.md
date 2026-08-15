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
[PolyForm Noncommercial License 1.0.0](./LICENSE).

- ✅ Free for **noncommercial** use — personal projects, research, education,
  and use by nonprofit or government organizations.
- ✅ You may modify and share it, as long as it stays noncommercial and under
  the same license.
- ❌ **No commercial use** — including for-profit internal use, hosting it as a
  service for others, or selling it.

For commercial or enterprise use, a separate license is required. See
[COMMERCIAL-LICENSE.md](./COMMERCIAL-LICENSE.md).

## Contributing

Contributions are welcome under the [Contributor License Agreement](./CLA.md),
which lets the project maintain its dual-licensing model.
