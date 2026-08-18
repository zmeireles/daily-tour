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

| Timestamp            | Env  | Commit  | Actor                      | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------- | ---- | ------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-13 09:34 UTC | qual | fd9d0b0 | github-actions (deploy-qa) | First clean automated deploy of qual (srv911943) — `deploy-qa.yml` from wiped postgres/rabbitmq volumes; full guest-journey smoke + `--qual` readiness gate green. Validates Plan-007 reproducibility. osrm deferred (no lightweight Azores PBF). Steady-state deploys + rollbacks log to the gitignored `.deploy-history.md` on the box.                                                                                                                                                                                                                                                                                                   |
| 2026-08-18 08:42 UTC | qual | 9f34ac6 | github-actions (deploy-qa) | Dispatched redeploy — unblocks the deploy `s734` could not run: `publish-images` on `9f34ac6` had failed twice on a `codeload.github.com` 429/503 during the 08-17 GitHub partial outage. Reran the failed job once Actions was healthy; all 11 images green, all 11 verified present in GHCR at the tag before dispatch. `image_tag` is `main`-minus-`bca61be`/`3e8aebc` (CI-config + docs only, no runtime effect, and `publish-images` does not fire on them). Smoke + `--qual` readiness gate green. Carries the #407 and #412 fixes: re-measured on the deployed build at 32/32 tap targets (was 16/32) and 5 wrapping cells (was 11). |
