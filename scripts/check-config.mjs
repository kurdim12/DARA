#!/usr/bin/env node
/**
 * Fails the build early, with a readable message, when wrangler.jsonc holds a
 * value the deploy will reject. Cloudflare's own error for this arrives after
 * a full build and asset upload, and says only
 * "binding DB of type d1 must have a valid `database_id` specified".
 */
import { readFile } from "node:fs/promises";

const CONFIG = new URL("../wrangler.jsonc", import.meta.url);
const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const text = await readFile(CONFIG, "utf8");
const match = /"database_id":\s*"([^"]*)"/.exec(text);

function fail(problem, remedy) {
  console.error(`\nwrangler.jsonc: ${problem}\n\n${remedy}\n`);
  process.exit(1);
}

if (!match) {
  fail(
    "no database_id found in the DB binding.",
    "Add it under d1_databases. See DEPLOY.md step A2.",
  );
}

const value = match[1];

if (value === "REPLACE_WITH_DATABASE_ID" || value === "") {
  fail(
    "database_id is still the placeholder.",
    "Create the D1 database named `dara` in the dashboard, copy its Database ID,\n" +
      "and put it here. See DEPLOY.md step A1.",
  );
}

if (!UUID.test(value)) {
  const embedded = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/.exec(value);
  fail(
    `database_id is not a UUID.\n  got: ${value.length > 70 ? `${value.slice(0, 70)}…` : value}`,
    embedded
      ? `That looks like the dashboard URL. The id is the part inside it:\n\n  "database_id": "${embedded[0]}"`
      : "It must be the Database ID from the D1 page: 8-4-4-4-12 hex characters\n" +
        "with dashes. The account id, which has no dashes, is a different thing.",
  );
}

console.log(`wrangler.jsonc ok — D1 database_id ${value}`);
