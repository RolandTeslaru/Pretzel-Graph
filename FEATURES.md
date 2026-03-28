# Feature Ideas

> Raw ideas and backlog. No structure required — just dump thoughts here.
> When ready to spec out a feature, say "let's spec out [feature name]" and a detailed spec will be created in `SPECS/`.

---

## 💡 Ideas

- **ReAct workflow template** — canonical Accumulator + Merge(OR) + Router pattern as a starting template users can load
- **Cycle visualization** — loop badge or indicator on edges that form a cycle so the graph stays readable
- **Checkpoint / partial resume** — after a failure mid-workflow, resume from the last successful node instead of restarting from scratch. `node_outputs` are already stored in session.
- **Execution history / replay** — store completed runs so users can review past executions, inspect per-node outputs, and debug failures
- **Worker horizontal scaling** — move beyond a single worker process; design queue partitioning or multi-instance workers
- **Branch-isolated error scope** — when a node fails, only kill its downstream branch instead of the entire workflow
- **Node retry UI** — expose the retry/backoff config (from hardening tasks) as per-node settings in the canvas
- **Workflow versioning** — track changes to a workflow over time, allow rollback to a previous version
- **Subgraph / reusable components** — let users package a set of nodes as a reusable component they can drop into other workflows
- **Live variable inspector** — during execution, show current port values flowing through edges in real time

---

## 🗃️ Parked / Uncertain

> Ideas that need more thought before speccing out.

- Multi-user collaboration on a workflow (realtime cursors, conflict resolution)
- Workflow marketplace / sharing

