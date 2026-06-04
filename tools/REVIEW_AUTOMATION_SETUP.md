# Review aggregateRating auto-update — setup

## What this does

Once a week (Sunday 9am PT), GitHub Actions runs `tools/update-reviews.mjs`,
which:

1. Calls the Google Business Profile API for current avg rating + review count
2. Rewrites the `aggregateRating` block in all 16 hub/spoke HTML files
3. Commits + pushes if anything changed (silent if nothing changed)

This keeps the JSON-LD in sync with reality so Google keeps showing the gold
stars in search results — without manual edits.

## Files involved

- `tools/update-reviews.mjs` — the script
- `tools/package.json` — declares `google-auth-library` dependency
- `.github/workflows/update-reviews.yml` — weekly cron trigger
- `tools/.last-review-update.json` — written each run (handy for debugging)

## One-time setup (you + me, tomorrow)

### Step 1 — Create a Google Cloud service account

1. Go to https://console.cloud.google.com/
2. Pick (or create) a project — e.g. "MAN Review Sync"
3. APIs & Services → Library → enable **My Business Business Information API**
   AND **My Business Account Management API** (Google has split the API
   surface; both may be needed depending on which endpoint we end up using)
4. IAM & Admin → Service Accounts → Create service account
   - Name: `review-sync-bot`
   - Role: leave empty (we'll grant location-level access in step 2)
5. On the new service account → Keys → Add key → JSON → download
6. Save the JSON file somewhere safe — we will paste its contents into a
   GitHub Secret in step 3.

### Step 2 — Grant the service account access to your GBP location

1. Go to https://business.google.com/
2. Pick your business location ("Mobile American Notary & Apostilles")
3. Users / Managers → Add user
4. Enter the service account email
   (looks like `review-sync-bot@<project>.iam.gserviceaccount.com`)
5. Role: **Manager** (read-only "Site manager" would also work but Manager
   is safest for API access)

### Step 3 — Find your GBP location resource name

This is a string like `accounts/123456789/locations/987654321`.

Easiest way: run this one-liner locally after activating gcloud with the
service account, or call the API directly from `curl`:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://mybusinessaccountmanagement.googleapis.com/v1/accounts
# → returns the account id

curl -H "Authorization: Bearer $TOKEN" \
  "https://mybusinessbusinessinformation.googleapis.com/v1/accounts/<ACCT>/locations?readMask=name"
# → returns the location id
```

Combine into: `accounts/<ACCT>/locations/<LOC>`

### Step 4 — Add GitHub Secrets

Repo → Settings → Secrets and variables → Actions → New repository secret

| Name | Value |
|---|---|
| `GBP_SERVICE_ACCOUNT_JSON` | full contents of the JSON file from step 1 |
| `GBP_LOCATION_NAME` | `accounts/.../locations/...` from step 3 |

### Step 5 — Test it

Repo → Actions → "Update LocalBusiness aggregateRating" → Run workflow
(leave inputs blank to use live GBP, or fill `rating` + `count` to test
with hard values first).

If it succeeds, the run log will show:
```
[update-reviews] source=gbp-api  rating=5.0  count=161
[update-reviews] result counts: { changed: 16 }
```

And you'll see a new commit on `main` authored by `review-bot`.

## Local testing (no secrets needed)

```bash
cd tools
npm install
node update-reviews.mjs --rating 5.0 --count 161 --dry-run
```

Shows what *would* change without writing.

## Schedule

Currently weekly Sunday 9am PT (16:00 UTC). To change cadence, edit the
`cron:` line in `.github/workflows/update-reviews.yml`. Monthly is also
fine if reviews come in slowly — Google does not require real-time
accuracy.

## Failure handling

The workflow fails loudly (red X in Actions tab) if:

- API auth breaks (service account revoked, key expired, etc.)
- GBP location resource name is wrong
- Google migrates the API endpoint (`mybusiness.googleapis.com/v4/`
  has been deprecated multiple times — if the endpoint moves we'll need
  to update the URL in `update-reviews.mjs`)

When that happens, manually edit `index.html` to a fresh value as a
fallback, then debug the workflow.
