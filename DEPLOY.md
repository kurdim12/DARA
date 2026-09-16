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
| Deploy command | `npm run deploy:ci` |
| Root directory | `/` |

`deploy:ci` applies the migrations and then deploys. It is safe to run every
time — a migration already applied is skipped. A plain `npx wrangler deploy`
gives you a Worker that looks fine until the first report, which then fails
with a 500 because the `reports` table does not exist.

## A4. Add the API key

The engine reaches the model through **OpenRouter**, which speaks the Anthropic
Messages API at `https://openrouter.ai/api` — so the key below is an
**OpenRouter** key (`sk-or-...`), not an Anthropic one, and `ANTHROPIC_BASE_URL`
in `wrangler.jsonc` is what points at it. Clear that var and the same variable
takes an Anthropic key instead; nothing else changes.

**Workers & Pages → dara → Settings → Variables and Secrets → Add →
type `Secret` → name `OPENROUTER_API_KEY` → paste your OpenRouter key
(`sk-or-v1-…`) → Save.** Nothing is billed to Anthropic; every call goes to
OpenRouter and comes off that balance.

A secret only reaches a Worker on its next deploy. Push anything, or hit
**Retry build** on the last build, so the deploy re-runs.

Then open `/api/health` on a phone. `key_present` must be `true` and `api_host`
must be the gateway you meant — a key that is present but pointed at the wrong
host fails exactly like a missing one, and that is the only way to tell them
apart from outside.

## A5. Choose the model

`ANTHROPIC_MODEL` in `wrangler.jsonc` takes a gateway id such as
`anthropic/claude-sonnet-5` or `google/gemini-3.x`. Two hard requirements: the
model must support a **forced tool call** and **image input**, or it cannot
serve this app — every scan forces a named tool call, and a screenshot scan
sends an image. Run the **candidates** workflow (Actions → candidates → Run) to
list the models in OpenRouter's public catalogue that do both.

That narrows the field; it does not pick the winner. Put two or three ids in
`ANTHROPIC_MODEL_CANDIDATES`, deploy, and run the eval with `--compare`. What
decides it is not a benchmark but whether the model quotes the Arabic back
verbatim — a paraphrased quote fails post-validation, the red underlines
disappear, and the demo loses the one moment it is built around.

## A5. Check it took

Open `https://dara.<your-subdomain>.workers.dev/api/health` on the phone:

```json
{ "ok": true, "key_present": true, "db_ready": true, "model": "claude-sonnet-5" }
```

Both flags must be `true`.

- `key_present: false` — A4 has not reached a deploy yet.
- `db_ready: false` — the `reports` table does not exist. A deploy does not run
  migrations on its own, so this means A3's deploy command is missing the
  migration step. Fix it there and redeploy, or run `npm run db:migrate` once
  from a laptop that is logged in.

## Reading a failed build log

| What the log says | What it means |
|---|---|
| `Cannot find type definition file for './worker-configuration.d.ts'` | Old commit. Fixed — the build now generates it. Push again. |
| ``The `assets` property in your configuration is missing the required `directory` property`` | The build step did not run, so there is nothing to deploy. Set the build command in A3. |
| ``binding DB of type d1 must have a valid `database_id` specified [code: 10021]`` | `wrangler.jsonc` still says `REPLACE_WITH_DATABASE_ID`. Do A1 and A2. |
| `Couldn't find a D1 DB with the name or binding 'dara'` | The id in `wrangler.jsonc` does not match a database on this account. |
| Build fine, but `/api/health` says `db_ready: false` | The `reports` table does not exist — A3's deploy command is missing the migration step. Reports will fail with a 500. |
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
npm run brand:apply                                    # once dara-mark.png is in reference/brand/
npm run verify                                          # typecheck, tests, honesty grep, build
```

`npm run brand:apply` changes the paper colour and all three icons, so commit
and push (Path A) or run `npm run deploy` (Path B) afterwards.

# Local development

```bash
npm run dev                 # http://localhost:5173, Worker included
npm run db:migrate:local    # once, for a local database
```

Use `npm run dev` (Vite), **not** `wrangler dev`: a bare `wrangler dev` picks up
the generated `dist/dara/wrangler.json` and serves the last build instead of
your current source.
