import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData, StravaTokens, parseWho } from "@/lib/session";

export const dynamic = "force-dynamic";

async function refreshTokenIfNeeded(
  tokens: StravaTokens,
  session: SessionData & { save: () => Promise<void> },
  who: "mine" | "owen"
) {
  const now = Math.floor(Date.now() / 1000);
  if (tokens.expiresAt && tokens.expiresAt > now + 60) return tokens;

  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
    }),
  });
  if (!res.ok) throw new Error("refresh_failed");
  const data = await res.json();
  const updated: StravaTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
  };
  session[who] = updated;
  await session.save();
  return updated;
}

export async function GET(req: NextRequest) {
  const who = parseWho(req.nextUrl.searchParams.get("who"));
  const cookieStore = cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  const tokens = session[who];
  if (!tokens?.accessToken) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  let activeTokens: StravaTokens;
  try {
    activeTokens = await refreshTokenIfNeeded(tokens, session, who);
  } catch {
    return NextResponse.json({ error: "refresh_failed" }, { status: 401 });
  }

  // Plan starts 24 Aug 2026 — pull everything from a few days before that.
  const after = Math.floor(new Date("2026-08-20T00:00:00Z").getTime() / 1000);

  let all: any[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100&page=${page}`,
      { headers: { Authorization: `Bearer ${activeTokens.accessToken}` } }
    );
    if (!res.ok) {
      return NextResponse.json({ error: "strava_fetch_failed" }, { status: 502 });
    }
    const batch = await res.json();
    all = all.concat(batch);
    if (batch.length < 100) break;
    page++;
  }

  return NextResponse.json({ activities: all });
}
