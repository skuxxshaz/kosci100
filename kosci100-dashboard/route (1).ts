import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData, parseWho } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const who = parseWho(req.nextUrl.searchParams.get("state"));
  const baseUrl = req.nextUrl.origin || (process.env.NEXT_PUBLIC_BASE_URL as string);

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/?error=no_code`);
  }

  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${baseUrl}/?error=token_exchange_failed`);
  }

  const tokenData = await tokenRes.json();

  const cookieStore = cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  session[who] = {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: tokenData.expires_at,
  };
  await session.save();

  return NextResponse.redirect(`${baseUrl}/`);
}
