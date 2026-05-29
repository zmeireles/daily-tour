# L021 — tasks-prod MCP can show tool schemas while the SSH tunnel is down

**Source**: session 2026-05-28/29 (twice — initial resume + mid-session drop)
**Date**: 2026-05-28

## The rule

When `mcp__tasks-prod__*` tools fail with `connect ECONNREFUSED 127.0.0.1:15432` or `read ECONNRESET`, **the MCP server is up but the underlying SSH tunnel to the VPS Postgres on port 15432 is down**. The MCP schema registration is independent of the Postgres connection. Verify the tunnel before assuming the MCP is broken.

```bash
ss -tlnp | grep 15432
# If LISTEN → tunnel is up
# If empty → tunnel is down; user must re-establish
```

Claude cannot start the SSH tunnel — it needs credentials the user has. Surface the diagnosis and wait.

## Why it matters

This session hit the failure mode twice:

1. **Initial resume**: tool schemas registered after `/mcp reconnect tasks-prod`, first `list_tasks` call returned `connect ECONNREFUSED 127.0.0.1:15432`. Burned a minute looking for an MCP bug; the answer was `ss -tlnp | grep 15432` showed no listener.
2. **Mid-session**: tunnel dropped silently. Next `get_task` returned `read ECONNRESET`. Same diagnosis cycle.

Without L021, the natural reaction is to blame the MCP server / call format / auth — none of which are the cause.

## What happened

Reference doc at `~/.claude/projects/-media-jmeireles-ssd3-my-projects-codecomedy-platform/memory/reference_tasks_mcp.md` already documents:

> **Prerequisites:** SSH tunnel to VPS PostgreSQL must be active on port 15432 (`ss -tlnp | grep 15432`).

But the failure mode (schemas register, tunnel doesn't) wasn't obvious from the connection error message alone. The lesson is the **diagnosis order**: tunnel first, then MCP.

## How to apply

When any `mcp__tasks-prod__*` tool errors with a connection-shaped message:

1. `ss -tlnp | grep 15432` — checks the tunnel listener.
2. If down: tell the user explicitly that the SSH tunnel needs to be re-established; don't reattempt MCP calls.
3. If up: the failure is something else (auth, schema, payload) — investigate normally.

Same pattern likely applies to MinIO on :19000 (image-attachment downloads failed mid-session 2026-05-29 with the same shape — `connect ECONNREFUSED 127.0.0.1:19000`).

## Related

- L020 — Same session, different infra fragility. Vite SIGTERM ≠ SSH tunnel drop ≠ Node version mismatch, but all three needed independent diagnosis.
