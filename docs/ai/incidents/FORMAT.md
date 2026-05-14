# Incident Documentation Format

All incidents use **sequential IDs** (`INC-001`, `INC-002`, ...) across both levels. The sequence is global — a single counter shared between user-level and project-level incidents to avoid collisions.

Two levels of incident documentation depending on severity.

## Level 1: Full Report (HIGH / CRITICAL)

**Location:** `~/.claude/incidents/INC-NNN-short-description.md`

Use for incidents involving data corruption, service outages, security breaches, or systemic risks that affect infrastructure across projects.

### Frontmatter

```yaml
---
id: INC-001
title: PostgreSQL TOAST corruption on n8n execution_data table
severity: high
status: resolved
project: codecomedy-platform
service: postgresql-prod (n8n database), authentik-server (root cause)
environment: production
vps: 185.166.39.210
detected: 2026-04-20T08:36:00Z
resolved: 2026-04-20T08:47:00Z
investigated: 2026-04-20T08:48:00-09:03:00Z
data_loss: none
related_services: [n8n-prod, authentik-server-qual]
---
```

### Required Sections

| Section | Purpose |
|---------|---------|
| Incident Summary | What happened, what was the impact |
| Root Cause Analysis | Evidence chain from symptom to cause, with hard data (logs, metrics, memory stats) |
| Impact Assessment | Table of impact areas with severity per area |
| Resolution | Step-by-step fix with commands/SQL used |
| Remediation Plan | P0 (immediate), P1 (short-term), P2 (long-term) actions with status tracking |
| Mitigation Procedures | Runbook: what to do if this happens again |
| Lessons Learned | Numbered takeaways — especially non-obvious cross-service findings |
| Timeline | Chronological table of events with UTC timestamps |

### Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| id | yes | string | Sequential ID: INC-001, INC-002, etc. |
| title | yes | string | Descriptive title |
| severity | yes | enum | critical, high, medium, low |
| status | yes | enum | open, resolved, monitoring |
| project | yes | string | Project name |
| service | yes | string | Affected service(s) + root cause service if different |
| environment | yes | enum | dev, qual, prod |
| vps | no | string | Server IP/hostname |
| detected | yes | ISO datetime | When first noticed |
| resolved | no | ISO datetime | When fix confirmed |
| investigated | no | string | Investigation time range |
| data_loss | yes | string | "none" or description |
| related_services | no | string[] | All services in the root cause chain |

---

## Level 2: Lightweight Record (MEDIUM / LOW)

**Location:** `docs/ai/incidents/INC-NNN-short-description.md`

Use for operational issues, agent failures, configuration problems, and other incidents that are project-scoped and don't require full remediation plans.

### Frontmatter

```yaml
---
id: INC-002
what: Agents reported completion but produced zero file changes
occurred_at: 2026-04-18T20:00:00Z
status: resolved
root_cause: Absolute paths in prompts caused writes to main repo instead of worktree
resolution: Added path rewriting in cs-agent launch
lesson_code: L010
tags: [phantom, cs-agent, worktree]
---
```

### Required Sections

- **Description** — Free-form markdown with context and details
- Optional: Affected components, root cause details, resolution steps

### Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| id | yes | string | Sequential ID: INC-NNN (continues from user-level sequence) |
| what | yes | string | One-line summary |
| occurred_at | yes | ISO datetime | When it happened |
| status | no | enum | open, resolved, led-to-lesson (default: open) |
| root_cause | no | string | Root cause analysis |
| resolution | no | string | How it was fixed |
| lesson_code | no | string | Related lesson (e.g., L010) |
| tags | no | string[] | Categorization tags |

---

## Severity Guide

| Severity | Criteria | Examples |
|----------|----------|---------|
| **CRITICAL** | Service down, active data loss, security breach | Database corruption with data loss, full outage |
| **HIGH** | Data integrity risk, backup failures, systemic/cascading risk | TOAST corruption, OOM kill patterns, silent backup failures |
| **MEDIUM** | Degraded service, non-critical feature broken | Agent failures, slow queries, intermittent errors |
| **LOW** | Cosmetic, single-user impact, warnings | UI glitches, non-critical log warnings |

## Key Principle

> Root causes often hide outside the affected service. Always trace the full chain. A PostgreSQL corruption may be caused by Authentik OOM kills. Document the *cause* service alongside the *symptom* service.
