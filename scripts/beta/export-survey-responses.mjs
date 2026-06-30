#!/usr/bin/env node
// Export Daily Tour beta post-stay survey responses (all languages) to CSV.
//
// Pulls every execution from the four n8n "DT Beta — Post-Stay Survey" form
// workflows (EN/PT/FR/ES) on qual and prints a single consolidated CSV to
// stdout. A tabular view without touching the workflows or adding a DB sink.
//
//   make survey-export > responses.csv
//   node scripts/beta/export-survey-responses.mjs
//
// Auth: reads the n8n owner creds from temp/n8n-qual-owner.creds (gitignored).
// Override with N8N_URL / N8N_CREDS env vars. No secrets are embedded here.
import fs from "node:fs";
import path from "node:path";

const N8N = process.env.N8N_URL || "https://n8n.qual.stay.portugalodyssey.pt";
const credsPath = process.env.N8N_CREDS || path.join(process.cwd(), "temp/n8n-qual-owner.creds");

const creds = fs.readFileSync(credsPath, "utf8");
const email = (creds.match(/^email:\s*(.+)$/im) || [])[1]?.trim();
const password = (creds.match(/^password:\s*(.+)$/im) || [])[1]?.trim();
if (!email || !password) {
  console.error(`Could not read email/password from ${credsPath}`);
  process.exit(1);
}

// n8n persists execution data with the `flatted` codec: a JSON array registry
// where string values are indices into the array and numbers/booleans/null are
// literal. This decodes it (handles cycles via the seen-map).
function unflatten(arr) {
  const seen = new Map();
  const deref = (v) => (typeof v === "string" ? resolve(parseInt(v, 10)) : v);
  function resolve(i) {
    if (seen.has(i)) return seen.get(i);
    const node = arr[i];
    if (Array.isArray(node)) {
      const out = [];
      seen.set(i, out);
      for (const e of node) out.push(deref(e));
      return out;
    }
    if (node && typeof node === "object") {
      const out = {};
      seen.set(i, out);
      for (const k of Object.keys(node)) out[k] = deref(node[k]);
      return out;
    }
    seen.set(i, node);
    return node;
  }
  return resolve(0);
}

let cookie = "";
async function api(method, p, body) {
  const res = await fetch(N8N + p, {
    method,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const sc = res.headers.get("set-cookie");
  if (sc) cookie = sc.split(";")[0];
  const txt = await res.text();
  return { status: res.status, json: txt ? JSON.parse(txt) : {} };
}

const cell = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;

async function main() {
  let r = await api("POST", "/rest/login", { emailOrLdapLoginId: email, password });
  if (r.status !== 200) {
    console.error("n8n login failed:", r.status);
    process.exit(1);
  }

  r = await api("GET", "/rest/workflows");
  const workflows = (r.json.data || r.json).filter((w) => /Post-Stay Survey/i.test(w.name));
  if (!workflows.length) {
    console.error("No survey workflows found.");
    process.exit(1);
  }

  const rows = [];
  for (const w of workflows) {
    const lang = (w.name.match(/\(([^)]+)\)/) || [])[1] || "EN";
    const filter = encodeURIComponent(JSON.stringify({ workflowId: w.id }));
    const ex = await api("GET", `/rest/executions?filter=${filter}`);
    const list = ex.json.data?.results || ex.json.data || [];
    for (const e of list) {
      const d = await api("GET", `/rest/executions/${e.id}?includeData=true`);
      let answers = {};
      try {
        const data = unflatten(JSON.parse(d.json.data.data));
        answers = data.resultData.runData.Survey[0].data.main[0][0].json || {};
      } catch {
        // unparseable / non-form execution — skip but keep the timestamp row
      }
      const vals = Object.values(answers).filter((v) => typeof v !== "object");
      rows.push({ lang, when: e.startedAt || e.createdAt || "", vals });
    }
  }

  rows.sort((a, b) => String(a.when).localeCompare(String(b.when)));

  const header = [
    "lang",
    "submitted_at",
    "q1_useful",
    "q2_used_plan",
    "q3_hardest",
    "q4_recommend",
    "q5_other",
    "q6_followup",
  ];
  const lines = [header.map(cell).join(",")];
  for (const row of rows) {
    lines.push(
      [
        cell(row.lang),
        cell(row.when),
        ...Array.from({ length: 6 }, (_, i) => cell(row.vals[i])),
      ].join(","),
    );
  }
  process.stdout.write(lines.join("\n") + "\n");
  console.error(`\n${rows.length} response(s) across ${workflows.length} survey form(s).`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
