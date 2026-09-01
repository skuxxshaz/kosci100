import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData, parseWho } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const who = parseWho(req.nextUrl.searchParams.get("who"));
  const cookieStore = cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  delete session[who];
  await session.save();
  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/`);
}
