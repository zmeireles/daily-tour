# Deploy Log

Append one row per **manual** deploy. Newest first. Keeps the project
traceable when images or artefacts are built outside CI.

Format:

```
| YYYY-MM-DD HH:MM UTC | env | commit     | actor           | notes                        |
```

- **env**: `prod` / `qual` / `staging` / `dev` / `npm` / whatever applies
- **commit**: short SHA at deploy time
- **actor**: human name or `github-actions` / `claude-code`
- **notes**: why, which service, or `restart only`

**Log entries here for:**

- Any `workflow_dispatch` run of a deploy workflow
- Any manual build/restart performed over SSH or locally
- Image rebuilds, rollbacks, hotfixes, manual `npm publish`, etc.

**You do NOT need to log:**

- Auto-deploys triggered by `push` / merged PRs — those are traceable
  via CI history and the resulting artefact's commit SHA.

---

## 2026

| Timestamp            | Env  | Commit  | Actor                      | Notes                                                                                                                                                                                                                                                                                                                                     |
| -------------------- | ---- | ------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-13 09:34 UTC | qual | fd9d0b0 | github-actions (deploy-qa) | First clean automated deploy of qual (srv911943) — `deploy-qa.yml` from wiped postgres/rabbitmq volumes; full guest-journey smoke + `--qual` readiness gate green. Validates Plan-007 reproducibility. osrm deferred (no lightweight Azores PBF). Steady-state deploys + rollbacks log to the gitignored `.deploy-history.md` on the box. |
