# Kosci100 Dashboard — Strava-synced

A small Next.js app that reads your Strava activities and auto-ticks your
training plan against them. Deploys free on Vercel.

## What auto-detects vs what doesn't

Strava can reliably tell us about runs, rides, and swims — so those tick
themselves off automatically based on date, sport type, and duration/distance
thresholds. **Stairmaster sessions and the gym upper/lower split don't have a
reliable Strava category**, so those stay as manual tap-to-confirm checkboxes
(stored in your browser only).

## Setup (about 15–20 minutes)

### 1. Create a Strava API application
1. Go to https://www.strava.com/settings/api
2. Create an application (any name/website is fine for personal use)
3. Note your **Client ID** and **Client Secret**
4. Leave "Authorization Callback Domain" for now — you'll set it after step 3 below

### 2. Push this folder to GitHub
```bash
cd kosci-dashboard
git init
git add .
git commit -m "Kosci100 dashboard"
```
Create a new repo on GitHub, then:
```bash
git remote add origin https://github.com/<you>/kosci100-dashboard.git
git push -u origin main
```

### 3. Deploy on Vercel
1. Go to https://vercel.com, sign in with GitHub
2. "Add New Project" → import the repo you just pushed
3. Before clicking Deploy, add these Environment Variables:
   - `STRAVA_CLIENT_ID` — from step 1
   - `STRAVA_CLIENT_SECRET` — from step 1
   - `SESSION_SECRET` — any random 32+ character string (generate one with
     `openssl rand -base64 32` in a terminal)
   - `NEXT_PUBLIC_BASE_URL` — leave as `http://localhost:3000` for now, you'll
     fix this in step 4
4. Click Deploy. You'll get a URL like `https://kosci100-dashboard.vercel.app`

### 3.5 (Optional) Set up shared Bingo Card storage
The Bingo Card tab is a two-player UTMB 100km bingo game — both you and Owen
tick squares off, and it's meant to be shared between you. That needs a tiny
shared key-value store since Vercel's serverless functions don't have
persistent storage of their own:
1. Go to https://upstash.com, sign up free, create a Redis database
2. In its REST API tab, copy the URL and token
3. Add them to Vercel's environment variables as `UPSTASH_REDIS_REST_URL`
   and `UPSTASH_REDIS_REST_TOKEN`, then redeploy

Without this, the Bingo tab still works, but ticks only save on whichever
device made them instead of being visible to both of you.

### 4. Wire the URLs together
1. Copy your real Vercel URL
2. In Vercel: Project Settings → Environment Variables → update
   `NEXT_PUBLIC_BASE_URL` to your real URL (e.g.
   `https://kosci100-dashboard.vercel.app`, no trailing slash)
3. Redeploy (Vercel → Deployments → ⋯ → Redeploy) so the new env var takes effect
4. Back at https://www.strava.com/settings/api, set "Authorization Callback
   Domain" to your Vercel domain **without** `https://` — just
   `kosci100-dashboard.vercel.app`

### 5. Use it
Open your Vercel URL, click **Connect Strava** on the My Plan tab, authorize
with your own Strava account, and your plan starts ticking itself off.

Owen does the same thing on the **Owen's Plan** tab — same Strava app
(same Client ID/Secret), he just authorizes with his own Strava login when
he clicks Connect on his tab. Both of your tokens are stored independently,
so you can each be logged into Strava separately in the same app.


## Local development
```bash
npm install
cp .env.example .env.local   # fill in your keys, use http://localhost:3000
npm run dev
```
(For local dev, set the Strava app's Authorization Callback Domain to
`localhost`.)

## Updating the plan
All the training plan content lives in `lib/plan.ts` — dates, session types,
labels, and target distances/durations for matching. Edit that file and
redeploy (push to GitHub — Vercel auto-deploys on push) to update the plan.

## Notes
- This is built for single-user personal use — the Strava session is stored
  in an encrypted browser cookie, not a database.
- If you ever revoke access from Strava's side, just click **Connect Strava**
  again from the dashboard.
