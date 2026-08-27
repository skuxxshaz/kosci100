import { NextRequest, NextResponse } from "next/server";
import { defaultTicks } from "@/lib/bingo";

export const dynamic = "force-dynamic";

const KEY = "kosci100-bingo-state";

interface BingoState {
  mine: boolean[];
  owen: boolean[];
}

function defaultState(): BingoState {
  return { mine: defaultTicks(), owen: defaultTicks() };
}

async function redisGet(key: string): Promise<string | null> {
  const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("redis_get_failed");
  const data = await res.json();
  return data.result ?? null;
}

async function redisSet(key: string, value: string): Promise<void> {
  const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/${key}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
    body: value,
  });
  if (!res.ok) throw new Error("redis_set_failed");
}

export async function GET() {
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    // No shared store configured — fall back to a fresh default state.
    // Ticks won't be shared between you and Owen until Upstash is set up.
    return NextResponse.json({ state: defaultState(), shared: false });
  }
  try {
    const raw = await redisGet(KEY);
    const state = raw ? (JSON.parse(raw) as BingoState) : defaultState();
    return NextResponse.json({ state, shared: true });
  } catch {
    return NextResponse.json({ state: defaultState(), shared: false, error: "store_unreachable" });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { player, index, value } = body as { player: "mine" | "owen"; index: number; value: boolean };

  if (!process.env.UPSTASH_REDIS_REST_URL) {
    return NextResponse.json({ error: "no_shared_store" }, { status: 503 });
  }
  if (player !== "mine" && player !== "owen") {
    return NextResponse.json({ error: "invalid_player" }, { status: 400 });
  }
  if (index < 0 || index > 24) {
    return NextResponse.json({ error: "invalid_index" }, { status: 400 });
  }

  try {
    const raw = await redisGet(KEY);
    const state = raw ? (JSON.parse(raw) as BingoState) : defaultState();
    state[player][index] = value;
    await redisSet(KEY, JSON.stringify(state));
    return NextResponse.json({ state, shared: true });
  } catch {
    return NextResponse.json({ error: "store_unreachable" }, { status: 502 });
  }
}
