import { NextRequest, NextResponse } from "next/server";
import { parseWho } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const who = parseWho(req.nextUrl.searchParams.get("who"));
  const clientId = process.env.STRAVA_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const redirectUri = `${baseUrl}/api/auth/callback`;
  const scope = "read,activity:read_all";

  const authUrl =
    `https://www.strava.com/oauth/authorize` +
    `?client_id=${clientId}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&approval_prompt=auto` +
    `&scope=${scope}` +
    `&state=${who}`;

  return NextResponse.redirect(authUrl);
}
