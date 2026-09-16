# Screenshot scanning — what happens to the image

Written to be true, and checkable against the code rather than taken on trust.
Every claim below names the file that makes it true.

## Who receives the image

A screenshot you attach is sent to **DARA's own Worker**, and from there to
**one** transcription provider:

| Provider | Model | Reached at | When |
|---|---|---|---|
| OpenRouter | `google/gemma-4-31b-it` | `openrouter.ai` | first, always |
| OpenRouter | `anthropic/claude-haiku-4.5` | `openrouter.ai` | only if the first times out, errors, or returns nothing |

Both go through OpenRouter, which routes to the model's upstream provider.
So the image reaches: your device → Cloudflare → OpenRouter → Google (Gemma)
or Anthropic (Haiku). In the ordinary case that is one hop to one model; the
second provider is touched only when the first fails.

**The paid route is used, never the free tier.** `google/gemma-4-31b-it` at
$0.09/M input is the paid id — `worker/ocr/gemma.ts` hard-codes it and a test
pins it. OpenRouter's free (`:free`) variants carry different data terms and
are not used here.

## What is stored

**The image is never written anywhere.** It exists as a base64 string in the
Worker's memory for the length of one request and is then gone. Specifically:

- It is not written to D1. The `reports` table stores
  `source, category, verdict, confidence, impersonated_entity, channel,
  message_text, is_test, threat_type, description, relevant_authority,
  anonymous, contact` (`worker/index.ts`) — no image column exists.
- It is not logged. Nothing in `worker/` passes image bytes to `console.*`,
  and the engine's error paths deliberately avoid logging response bodies
  because those can echo the message.
- There is no object storage bound to this Worker. `wrangler.jsonc` binds D1
  and a rate limiter, nothing else.
- It is not cached. The transcription is returned to your device in the
  response and held only by that browser tab.

What *is* stored, and only if you then choose to file a report, is the report
you submit — which contains the text, not the picture.

## What you must set, and it is not in this repo

**Data collection and model training must be OFF in the OpenRouter account
settings.** That is an account-level setting on openrouter.ai; nothing in this
codebase can set it or verify it, so this document cannot claim it is off.
Abdelrahman sets it and confirms it. Until then, treat the routing above as the
only privacy guarantee this repo can make.

## What the app tells the user

The in-app privacy line stays true under all of the above: the app does not ask
for a name or a phone number, report numbers live on the device, and a report
goes to the DARA' platform and no authority. Nothing here adds a claim about
encryption, and nothing claims the image is "never sent anywhere" — it is sent
to one provider to be read, which is the entire point of attaching it.

## Not yet true

- The account-level training opt-out above is unverified from here.
- The request travels over HTTPS end to end. That is transport security, not
  encryption at rest, and the app says nothing more than that.
