# DEPLOY.md

Two ways in. **Path A** is what is wired up now: Cloudflare Workers Builds, which
deploys on every push. **Path B** is the laptop route, useful when you want a
deploy without a commit.

Neither path ever puts the Anthropic key in a file. It is a Worker secret, set
in the dashboard, and nothing else.

---

# Path A — deploying from GitHub (current setup)

## A1. Create the database (dashboard, no CLI)

**Cloudflare dashboard → Storage & Databases → D1 SQL Database → Create →**
name it exactly **`dara`** → Create.

Open the new database and copy its **Database ID** (a UUID).

## A2. Put that ID in the repo

In `wrangler.jsonc`, replace `REPLACE_WITH_DATABASE_ID` with the UUID, then
commit and push. Until this is done every deploy fails: the Worker declares a
D1 binding to a database the account cannot find.

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "dara",
    "database_id": "paste-the-uuid-here",
    "migrations_dir": "./migrations"
  }
]
```

## A3. Set the build and deploy commands

**Workers & Pages → dara → Settings → Builds:**

| Field | Value |
|---|---|
| Build command | `npm run build` |
| Deploy command | `npx wrangler d1 migrations apply dara --remote && npx wrangler deploy` |
| Root directory | `/` |

The deploy command creates the `reports` table before deploying. It is safe to
run every time — a migration already applied is skipped. Leaving it out gives
you a Worker that looks fine until the first report, which then fails with a
500 because the table does not exist.

## A4. Add the API key

**Workers & Pages → dara → Settings → Variables and Secrets → Add →
type `Secret` → name `ANTHROPIC_API_KEY` → paste the key → Save.**

A secret only reaches a Worker on its next deploy. Push anything, or hit
**Retry build** on the last build, so the deploy re-runs.

## A5. Check it took

Open `https://dara.<your-subdomain>.workers.dev/api/health` on the phone:

```json
{ "ok": true, "key_present": true, "model": "claude-sonnet-5" }
```

`key_present: false` means A4 has not reached a deploy yet.

## Reading a failed build log

| What the log says | What it means |
|---|---|
| `Cannot find type definition file for './worker-configuration.d.ts'` | Old commit. Fixed — the build now generates it. Push again. |
| `Couldn't find a D1 DB with the name or binding 'dara'` | A1/A2 not done. |
| `no such table: reports` at runtime, not in the log | A3's deploy command is missing the migration step. |
| `binding ANALYZE_LIMITER ... ratelimits` | The rate-limit binding is not on this plan. Delete the whole `"ratelimits": [...]` block from `wrangler.jsonc`; the Worker falls back to its own limiter and nothing else changes. |
| Build succeeds, `/api/analyze` returns 503 | The key secret is missing — A4. |

---

# Path B — deploying from the laptop

```bash
npx wrangler login          # approve in the browser
npx wrangler d1 create dara # prints the database_id → paste into wrangler.jsonc
npm install
npm run db:migrate          # creates the reports table
npm run deploy              # builds and deploys, prints the URL
```

Then do A4 and A5 in the dashboard, and run `npm run deploy` once more so the
secret is picked up.

---

# After the first good deploy

```bash
npm run eval -- --target https://<your-url> --compare   # writes EVAL-REPORT.md
npm run cache-demo -- --target https://<your-url>       # fills the offline fallback
npm run brand:sample                                    # once dara-mark.png is in reference/brand/
npm run verify                                          # typecheck, tests, honesty grep, build
```

`npm run brand:sample` changes the paper colour and all three icons, so commit
and push (Path A) or run `npm run deploy` (Path B) afterwards.

# Local development

```bash
npm run dev                 # http://localhost:5173, Worker included
npm run db:migrate:local    # once, for a local database
```

Use `npm run dev` (Vite), **not** `wrangler dev`: a bare `wrangler dev` picks up
the generated `dist/dara/wrangler.json` and serves the last build instead of
your current source.
