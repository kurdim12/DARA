# DEPLOY.md — the six commands

Everything below runs on **Abdelrahman's machine**, because `wrangler login`
opens a browser and this build session has no Cloudflare credentials. Nothing
here asks for the Anthropic key: that is set in the dashboard and never leaves
it.

## 1. Log in

```bash
npx wrangler login
```

Approve in the browser that opens.

## 2. Create the database

```bash
npx wrangler d1 create dara
```

It prints a `database_id`. Open `wrangler.jsonc` and replace
`REPLACE_WITH_DATABASE_ID` with it.

## 3. Create the table

```bash
npm run db:migrate
```

## 4. Deploy

```bash
npm install
npm run deploy
```

This builds the app and deploys the Worker. It prints the URL, which looks like
`https://dara.<your-subdomain>.workers.dev`.

> If the deploy fails with an error mentioning `ratelimits`, that binding is not
> available on this account. Delete the whole `"ratelimits": [...]` block from
> `wrangler.jsonc` and run `npm run deploy` again — the Worker falls back to its
> own limiter automatically and nothing else changes.

## 5. Add the API key

In the Cloudflare dashboard:

**Workers & Pages → dara → Settings → Variables and Secrets → Add →
type Secret → name `ANTHROPIC_API_KEY` → paste the key → Save.**

Then redeploy so the Worker picks it up:

```bash
npm run deploy
```

Never paste the key into a chat, a file, or `wrangler.jsonc`.

## 6. Check it took

Open `https://<your-url>/api/health` on the phone. It must say:

```json
{ "ok": true, "key_present": true, "model": "claude-sonnet-5" }
```

`key_present: false` means step 5 has not landed yet.

---

## After that

```bash
npm run eval -- --target https://<your-url> --compare   # writes EVAL-REPORT.md
npm run cache-demo -- --target https://<your-url>       # fills the offline fallback
npm run brand:sample                                    # once dara-mark.png is in reference/brand/
npm run verify                                          # typecheck, tests, honesty grep, build
```

`npm run brand:sample` changes the paper colour and the icons, so run
`npm run deploy` again afterwards.

## Local development

```bash
npm run dev                 # http://localhost:5173, Worker included
npm run db:migrate:local    # once, for a local database
```

Use `npm run dev` (Vite), **not** `wrangler dev`: a bare `wrangler dev` picks up
the generated `dist/dara/wrangler.json` and serves the last build instead of
your current source.
