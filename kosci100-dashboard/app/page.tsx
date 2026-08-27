"use client";

import { useEffect, useMemo, useState } from "react";
import { PLAN, POINTS, PlanPhase, PlanSession } from "@/lib/plan";
import { OWEN_PLAN } from "@/lib/owen-plan";
import { matchSession, StravaActivity, MatchResult } from "@/lib/match";
import { BINGO_SQUARES, FREE_INDEX, countCompletedLines, defaultTicks } from "@/lib/bingo";

const TAG_COLORS: Record<string, string> = {
  run: "#b83a35", long: "#b8541f", bike: "#b83a35", stair: "#b8541f",
  swim: "#b83a35", gymL: "#b8541f", gymU: "#b8541f", rest: "#5c5c40",
  other: "#5c5c40", race: "#b83a35",
};

const MANUAL_KEY = "kosci100-manual-checks";

function ConfidenceRadar({
  data,
  color,
  size = 200,
}: {
  data: { axis: string; pct: number }[];
  color: string;
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 34;
  const n = data.length;

  function point(i: number, r: number) {
    const angle = (Math.PI / 180) * (i * (360 / n) - 90);
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }

  const rings = [0.2, 0.4, 0.6, 0.8, 1];
  const dataPoints = data.map((d, i) => point(i, (d.pct / 100) * maxR));
  const polygon = dataPoints.map((p) => p.join(",")).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size, display: "block", margin: "0 auto" }}>
      {rings.map((r, i) => {
        const ringPts = data.map((_, di) => point(di, r * maxR).join(",")).join(" ");
        return <polygon key={i} points={ringPts} fill="none" stroke="var(--line)" strokeWidth={1} />;
      })}
      {data.map((_, i) => {
        const [x, y] = point(i, maxR);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line)" strokeWidth={1} />;
      })}
      <polygon points={polygon} fill={color} fillOpacity={0.28} stroke={color} strokeWidth={2} />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={3} fill={color} />
      ))}
      {data.map((d, i) => {
        const [lx, ly] = point(i, maxR + 22);
        return (
          <text
            key={i}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={10}
            fontFamily="'JetBrains Mono', monospace"
            fill="var(--text-dim)"
          >
            {d.axis}
          </text>
        );
      })}
    </svg>
  );
}

function MetricTile({
  label,
  mineVal,
  minePct,
  owenVal,
  owenPct,
}: {
  label: string;
  mineVal: string;
  minePct: number;
  owenVal: string;
  owenPct: number;
}) {
  const mineLead = minePct >= owenPct;
  const owenLead = owenPct >= minePct;
  return (
    <div className="metric-tile">
      <div className="metric-tile-label">{label}</div>
      <div className={`metric-tile-row ${mineLead ? "lead" : ""}`}>
        <div className="metric-tile-name">Shannon</div>
        <div className="metric-bar-track"><div className="metric-bar-fill mine" style={{ width: `${minePct}%` }} /></div>
        <div className="metric-tile-val">{mineVal}</div>
      </div>
      <div className={`metric-tile-row ${owenLead ? "lead" : ""}`}>
        <div className="metric-tile-name">Owen</div>
        <div className="metric-bar-track"><div className="metric-bar-fill owen" style={{ width: `${owenPct}%` }} /></div>
        <div className="metric-tile-val">{owenVal}</div>
      </div>
    </div>
  );
}



function loadManual(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(MANUAL_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveManual(data: Record<string, boolean>) {
  localStorage.setItem(MANUAL_KEY, JSON.stringify(data));
}

function sid(who: string, date: string, idx: number) {
  return `${who}-${date}-${idx}`;
}

type AuthState = "loading" | "connected" | "disconnected" | "error";

function usePersonStrava(who: "mine" | "owen") {
  const [activities, setActivities] = useState<StravaActivity[] | null>(null);
  const [authState, setAuthState] = useState<AuthState>("loading");

  useEffect(() => {
    fetch(`/api/strava/activities?who=${who}`)
      .then(async (res) => {
        if (res.status === 401) {
          setAuthState("disconnected");
          return;
        }
        if (!res.ok) {
          setAuthState("error");
          return;
        }
        const data = await res.json();
        setActivities(data.activities || []);
        setAuthState("connected");
      })
      .catch(() => setAuthState("error"));
  }, [who]);

  return { activities, authState };
}

export default function Page() {
  const mine = usePersonStrava("mine");
  const owen = usePersonStrava("owen");

  const [manual, setManual] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"myplan" | "weekly" | "owen" | "bingo">("weekly");
  const [myActivePhase, setMyActivePhase] = useState(PLAN[0].id);
  const [owenActivePhase, setOwenActivePhase] = useState(OWEN_PLAN[0].id);

  const [bingo, setBingo] = useState<{ mine: boolean[]; owen: boolean[] } | null>(null);
  const [bingoShared, setBingoShared] = useState(true);
  const [whoAmI, setWhoAmI] = useState<"mine" | "owen">("mine");

  useEffect(() => {
    setManual(loadManual());
  }, []);

  function toggleManual(key: string) {
    const next = { ...manual, [key]: !manual[key] };
    setManual(next);
    saveManual(next);
  }

  function loadBingoState() {
    fetch("/api/bingo")
      .then((res) => res.json())
      .then((data) => {
        setBingo(data.state);
        setBingoShared(!!data.shared);
      })
      .catch(() => {
        setBingo({ mine: defaultTicks(), owen: defaultTicks() });
        setBingoShared(false);
      });
  }
  useEffect(() => {
    loadBingoState();
  }, []);

  async function toggleBingoCell(index: number) {
    if (index === FREE_INDEX || !bingo) return;
    const next = { ...bingo, [whoAmI]: [...bingo[whoAmI]] };
    next[whoAmI][index] = !next[whoAmI][index];
    setBingo(next);
    try {
      const res = await fetch("/api/bingo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player: whoAmI, index, value: next[whoAmI][index] }),
      });
      const data = await res.json();
      if (data.state) setBingo(data.state);
    } catch {
      // keep the optimistic local update even if the shared store is unreachable
    }
  }

  // ---- generic plan matching, reused for both plans ----
  function buildResults(
    plan: PlanPhase[],
    who: "mine" | "owen",
    activities: StravaActivity[] | null
  ) {
    const acts = activities || [];
    const flat: { session: PlanSession; weekId: string; match: MatchResult; key: string }[] = [];
    plan.forEach((phase) => {
      phase.weeks.forEach((week) => {
        week.sessions.forEach((session, idx) => {
          const match = matchSession(session, acts);
          const key = sid(who, session.date, idx);
          if (!match.autoDetectable && manual[key]) match.detected = true;
          flat.push({ session, weekId: week.id, match, key });
        });
      });
    });
    return flat;
  }

  const myResults = useMemo(() => buildResults(PLAN, "mine", mine.activities), [mine.activities, manual]);
  const owenResults = useMemo(() => buildResults(OWEN_PLAN, "owen", owen.activities), [owen.activities, manual]);

  function totalsFor(results: ReturnType<typeof buildResults>) {
    let total = 0, done = 0, totalPoints = 0, earnedPoints = 0;
    results.forEach(({ session, match }) => {
      total++;
      totalPoints += POINTS[session.type];
      if (match.detected) {
        done++;
        earnedPoints += POINTS[session.type];
      }
    });
    return { total, done, totalPoints, earnedPoints, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  const myTotals = useMemo(() => totalsFor(myResults), [myResults]);
  const owenTotals = useMemo(() => totalsFor(owenResults), [owenResults]);

  const RADAR_GROUPS: { axis: string; types: string[] }[] = [
    { axis: "Easy runs", types: ["run"] },
    { axis: "Long runs", types: ["long"] },
    { axis: "Vert/stairs", types: ["stair"] },
    { axis: "Strength", types: ["gymL", "gymU"] },
    { axis: "Cross-train", types: ["bike", "swim"] },
  ];

  function radarFor(results: ReturnType<typeof buildResults>) {
    return RADAR_GROUPS.map(({ axis, types }) => {
      let total = 0, done = 0;
      results.forEach(({ session, match }) => {
        if (types.includes(session.type)) {
          total++;
          if (match.detected) done++;
        }
      });
      return { axis, pct: total ? Math.round((done / total) * 100) : 0 };
    });
  }

  const myRadar = useMemo(() => radarFor(myResults), [myResults]);
  const owenRadar = useMemo(() => radarFor(owenResults), [owenResults]);
  const myConfidence = useMemo(() => Math.round(myRadar.reduce((s, a) => s + a.pct, 0) / myRadar.length), [myRadar]);
  const owenConfidence = useMemo(() => Math.round(owenRadar.reduce((s, a) => s + a.pct, 0) / owenRadar.length), [owenRadar]);

  function fitnessMetricsFor(activities: StravaActivity[] | null) {
    const acts = activities || [];
    const runs = acts.filter((a) => a.sport_type === "Run" || a.sport_type === "TrailRun");
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const last7 = runs.filter((a) => now - new Date(a.start_date_local).getTime() <= 7 * day);
    const last14 = runs.filter((a) => now - new Date(a.start_date_local).getTime() <= 14 * day);
    const weeklyKm = last7.reduce((s, a) => s + (a.distance || 0), 0) / 1000;
    const elevGain14 = last14.reduce((s, a) => s + (a.total_elevation_gain || 0), 0);
    const longestKm = runs.reduce((m, a) => Math.max(m, (a.distance || 0) / 1000), 0);
    const totalKm = runs.reduce((s, a) => s + (a.distance || 0), 0) / 1000;
    const totalMin = runs.reduce((s, a) => s + (a.moving_time || 0), 0) / 60;
    const avgPace = totalKm > 0 ? totalMin / totalKm : null;
    return { weeklyKm, elevGain14, longestKm, avgPace, hasData: runs.length > 0 };
  }

  const myFitness = useMemo(() => fitnessMetricsFor(mine.activities), [mine.activities]);
  const owenFitness = useMemo(() => fitnessMetricsFor(owen.activities), [owen.activities]);

  // Directional estimate only, not a scientific prediction — weighted blend of plan
  // adherence, category balance, and Strava-reported volume/vert/pace vs rough targets.
  function likelihoodFor(pct: number, confidence: number, fitness: ReturnType<typeof fitnessMetricsFor>) {
    const clamp = (n: number) => Math.max(0, Math.min(100, n));
    const volScore = clamp((fitness.weeklyKm / 55) * 100);
    const elevScore = clamp((fitness.elevGain14 / 1200) * 100);
    const longScore = clamp((fitness.longestKm / 35) * 100);
    const paceScore = fitness.avgPace ? clamp((7.5 / fitness.avgPace) * 100) : 50;
    const fitnessScore = fitness.hasData ? (volScore + elevScore + longScore + paceScore) / 4 : 50;
    return Math.round(pct * 0.4 + confidence * 0.2 + fitnessScore * 0.4);
  }

  const myLikelihood = useMemo(() => likelihoodFor(myTotals.pct, myConfidence, myFitness), [myTotals.pct, myConfidence, myFitness]);
  const owenLikelihood = useMemo(() => likelihoodFor(owenTotals.pct, owenConfidence, owenFitness), [owenTotals.pct, owenConfidence, owenFitness]);

  const daysToRace = useMemo(() => {
    const race = new Date("2026-11-27T00:00:00");
    const now = new Date();
    return Math.max(0, Math.ceil((race.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }, []);

  function weekTotalsFor(plan: PlanPhase[], results: ReturnType<typeof buildResults>) {
    const byWeek: Record<string, { label: string; dateRange: string; done: number; total: number; points: number }> = {};
    plan.forEach((phase) => {
      phase.weeks.forEach((week) => {
        byWeek[week.id] = { label: week.label, dateRange: week.dateRange, done: 0, total: 0, points: 0 };
      });
    });
    results.forEach(({ session, weekId, match }) => {
      byWeek[weekId].total++;
      if (match.detected) {
        byWeek[weekId].done++;
        byWeek[weekId].points += POINTS[session.type];
      }
    });
    return Object.values(byWeek);
  }

  const myWeekTotals = useMemo(() => weekTotalsFor(PLAN, myResults), [myResults]);
  const owenWeekTotals = useMemo(() => weekTotalsFor(OWEN_PLAN, owenResults), [owenResults]);

  const streak = useMemo(() => {
    let s = 0;
    for (const w of myWeekTotals) {
      if (w.total > 0 && w.done === w.total) s++;
      else break;
    }
    return s;
  }, [myWeekTotals]);
  const weeksDone = myWeekTotals.filter((w) => w.total > 0 && w.done === w.total).length;

  const owenStreak = useMemo(() => {
    let s = 0;
    for (const w of owenWeekTotals) {
      if (w.total > 0 && w.done === w.total) s++;
      else break;
    }
    return s;
  }, [owenWeekTotals]);
  const owenWeeksDone = owenWeekTotals.filter((w) => w.total > 0 && w.done === w.total).length;

  const badges = [
    { label: "Trailblazer 25%", min: 25 },
    { label: "Peak Bagger 50%", min: 50 },
    { label: "Summit Push 75%", min: 75 },
    { label: "Kosci Ready 100%", min: 100 },
  ];

  // ---- shared renderer for a plan tab (My Plan / Owen's Plan) ----
  function renderPlanBody(
    plan: PlanPhase[],
    who: "mine" | "owen",
    results: ReturnType<typeof buildResults>,
    activePhase: string,
    setActivePhase: (id: string) => void
  ) {
    return (
      <div>
        <nav className="phasenav">
          {plan.map((phase) => (
            <button
              key={phase.id}
              className={activePhase === phase.id ? "active" : ""}
              onClick={() => {
                setActivePhase(phase.id);
                document.getElementById(`${who}-${phase.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              {phase.name}
            </button>
          ))}
        </nav>

        {plan.map((phase) => (
          <div className="phase" id={`${who}-${phase.id}`} key={phase.id}>
            <div className="phase-head">
              <h2>{phase.name}</h2>
              <span className="range">{phase.range}</span>
            </div>
            <p className="phase-note">{phase.note}</p>

            {phase.weeks.map((week) => {
              const wResult = results.filter((r) => r.weekId === week.id);
              const wDone = wResult.filter((r) => r.match.detected).length;
              const wPct = wResult.length ? Math.round((wDone / wResult.length) * 100) : 0;
              return (
                <div className="week" key={week.id}>
                  <div className="week-head">
                    <div><span className="wk">{week.label}</span><span className="dates">{week.dateRange}</span></div>
                    <div className="week-head-right">
                      <div className="week-bar"><i style={{ width: `${wPct}%` }} /></div>
                      <div className="week-pct">{wPct}%</div>
                    </div>
                  </div>
                  {week.sessions.map((session, idx) => {
                    const key = sid(who, session.date, idx);
                    const found = results.find((r) => r.key === key);
                    const match = found?.match;
                    const isDone = match?.detected;
                    const manualToggle = !!match && !match.autoDetectable && session.type !== "rest";
                    return (
                      <div className={`row ${isDone ? "done" : ""}`} key={key}>
                        <div
                          className={`chk ${isDone ? "on" : ""} ${manualToggle ? "manual" : ""}`}
                          onClick={() => manualToggle && toggleManual(key)}
                        >
                          <svg viewBox="0 0 12 12"><polyline points="1,6 4.5,10 11,2" /></svg>
                        </div>
                        <div className="row-text">
                          <div className="day" style={{ ["--tag-color" as any]: TAG_COLORS[session.type] }}>
                            {new Date(session.date + "T00:00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}
                          </div>
                          <div className="sesh">
                            {session.label}
                            {match?.matched && <span className="source-tag strava">— from Strava: {match.matched.name}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  function connectBanner(who: "mine" | "owen", authState: AuthState, label: string) {
    if (authState === "disconnected") {
      return (
        <div className="connect-banner">
          <p>Connect {label}&apos;s Strava to auto-detect completed sessions against the plan.</p>
          <a className="btn" href={`/api/auth/login?who=${who}`}>Connect Strava</a>
        </div>
      );
    }
    if (authState === "error") {
      return (
        <div className="connect-banner">
          <p>Couldn&apos;t reach Strava just now for {label} — check API keys are set, or try reconnecting.</p>
          <a className="btn secondary" href={`/api/auth/login?who=${who}`}>Reconnect Strava</a>
        </div>
      );
    }
    if (authState === "connected") {
      return (
        <div className="connect-banner">
          <p>Connected to {label}&apos;s Strava. Stairmaster, gym upper/lower, and travel/cross-training days aren&apos;t reliably detectable — those stay tap-to-confirm.</p>
          <a className="btn secondary" href={`/api/auth/logout?who=${who}`}>Disconnect</a>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="wrap">
      <header>
        <div className="eyebrow">Ultra training / 24 Aug → 27 Nov 2026</div>
        <h1>Kosci100 Dashboard</h1>
        <div className="sub">Synced with Strava — auto-detected sessions tick themselves off.</div>
        <div className="stats">
          <div className="stat"><div className="n">{myTotals.pct}%</div><div className="l">Complete</div></div>
          <div className="stat"><div className="n">{myTotals.done}</div><div className="l">Sessions done</div></div>
          <div className="stat"><div className="n">{myTotals.total}</div><div className="l">Total sessions</div></div>
          <div className="stat"><div className="n">{daysToRace}</div><div className="l">Days to race</div></div>
        </div>
      </header>

      <div className="tabbar">
        <button className={activeTab === "weekly" ? "active" : ""} onClick={() => setActiveTab("weekly")}>Head to Head</button>
        <button className={activeTab === "myplan" ? "active" : ""} onClick={() => setActiveTab("myplan")}>Shannon&apos;s Plan</button>
        <button className={activeTab === "owen" ? "active" : ""} onClick={() => setActiveTab("owen")}>Owen&apos;s Plan</button>
        <button className={activeTab === "bingo" ? "active" : ""} onClick={() => setActiveTab("bingo")}>Bingo Card</button>
      </div>

      {activeTab === "myplan" && (
        <div>
          {connectBanner("mine", mine.authState, "Shannon")}

          <div className="stats" style={{ marginBottom: 18 }}>
            <div className="stat"><div className="n">{myTotals.pct}%</div><div className="l">Complete</div></div>
            <div className="stat"><div className="n">{myTotals.done}</div><div className="l">Sessions done</div></div>
            <div className="stat"><div className="n">Fri 27 Nov</div><div className="l">Race day</div></div>
          </div>

          <div className="radar-card">
            <div className="radar-head">
              <span className="radar-title">Confidence radar</span>
              <span className="radar-score">{myConfidence}%</span>
            </div>
            <ConfidenceRadar data={myRadar} color="var(--moss)" />
            <p className="radar-caption">Commitment to the plan by training category, based on Strava-synced + confirmed sessions.</p>
          </div>

          <div className="keynote" style={{ marginBottom: 20 }}>
            <b>Coach&apos;s read on Shannon&apos;s plan:</b> mild trochanteric bursitis, lateral glute med tendinopathy,
            and a slightly degenerate ligamentum teres at the femoral attachment — manageable, not acute. Gym work
            is built around avoiding the classic triggers (adduction past midline, deep hip flexion combined with
            internal rotation, direct trochanter compression), rotating hip-safe strength — trap bar deadlift, hip
            thrust, single-leg RDL, controlled step-ups — with anti-rotation core work on upper days. Running volume
            stays as planned; the two things that matter most for a sub-15h finish alongside Owen are the
            back-to-back long weekends from phase three, and treating the gym sessions as non-negotiable — the hip
            needs the strength work more than the legs need another easy run.
          </div>

          {renderPlanBody(PLAN, "mine", myResults, myActivePhase, setMyActivePhase)}
          <footer>
            <div><b>Note:</b> if a week feels flat or overly sore, drop the stairmaster or a gym session before the long run. Stairmaster and gym upper/lower are tap-to-confirm since Strava can&apos;t reliably tell them apart.</div>
          </footer>
        </div>
      )}

      {activeTab === "owen" && (
        <div>
          {connectBanner("owen", owen.authState, "Owen")}

          <div className="stats" style={{ marginBottom: 18 }}>
            <div className="stat"><div className="n">{owenTotals.pct}%</div><div className="l">Complete</div></div>
            <div className="stat"><div className="n">{owenTotals.done}</div><div className="l">Sessions done</div></div>
            <div className="stat"><div className="n">Fri 27 Nov</div><div className="l">Race day</div></div>
          </div>

          <div className="radar-card">
            <div className="radar-head">
              <span className="radar-title">Confidence radar</span>
              <span className="radar-score">{owenConfidence}%</span>
            </div>
            <ConfidenceRadar data={owenRadar} color="var(--amber)" />
            <p className="radar-caption">Commitment to the plan by training category, based on Strava-synced + confirmed sessions.</p>
          </div>

          <div className="keynote" style={{ marginBottom: 20 }}>
            <b>Coach&apos;s read on Owen&apos;s Strava data:</b> ~55–65km weeks with two solid trail long runs already
            (25km/898m, 23km/357m) plus a 32km/942m effort — a genuinely good base. Trail cadence sits around
            138–156spm against 168–172spm on the road, confirming a downhill efficiency gap. No back-to-back
            long days on tired legs yet, which matters more than one big run for a 100k finish. This plan adds:
            weekly downhill cadence work, back-to-back weekend long runs from Week 2, a dedicated vert/altitude
            block in Queenstown, a full-distance-adjacent long run (South Boundary Rd, ~43.8km) as the main
            fitness checkpoint, and a race simulation day in Peak Volume to rehearse sub-15 pacing directly.
          </div>

          {renderPlanBody(OWEN_PLAN, "owen", owenResults, owenActivePhase, setOwenActivePhase)}
          <footer>
            <div><b>Note:</b> if a week feels flat or overly sore, drop the stairmaster or a gym session before the long run. Stairmaster and gym upper/lower are tap-to-confirm since Strava can&apos;t reliably tell them apart.</div>
          </footer>
        </div>
      )}

      {activeTab === "weekly" && (
        <div>
          <div className="scoreboard-head">
            <div className={`score-block ${myLikelihood >= owenLikelihood ? "leader" : ""}`}>
              <div className="score-block-name">Shannon</div>
              <div className="score-block-n">{myLikelihood}%</div>
              <div className="score-block-l">likely on track for sub-15h</div>
            </div>
            <div className="score-block-vs">VS</div>
            <div className={`score-block ${owenLikelihood >= myLikelihood ? "leader" : ""}`}>
              <div className="score-block-name">Owen</div>
              <div className="score-block-n">{owen.authState === "connected" ? `${owenLikelihood}%` : "—"}</div>
              <div className="score-block-l">likely on track for sub-15h</div>
            </div>
          </div>
          {owen.authState !== "connected" && (
            <div className="vs-note">Owen hasn&apos;t connected his Strava yet — head to his tab to link it and this scoreboard fills in for real.</div>
          )}
          <p className="scoreboard-caption">
            A directional estimate, not a guarantee — blends plan completion (40%), category balance from the
            confidence radar (20%), and Strava-reported weekly volume, 14-day vert, longest run, and average pace (40%).
          </p>

          <div className="metric-grid">
            <MetricTile
              label="Plan complete"
              mineVal={`${myTotals.pct}%`} minePct={myTotals.pct}
              owenVal={`${owenTotals.pct}%`} owenPct={owenTotals.pct}
            />
            <MetricTile
              label="Sessions done"
              mineVal={`${myTotals.done}/${myTotals.total}`} minePct={myTotals.total ? (myTotals.done / myTotals.total) * 100 : 0}
              owenVal={`${owenTotals.done}/${owenTotals.total}`} owenPct={owenTotals.total ? (owenTotals.done / owenTotals.total) * 100 : 0}
            />
            <MetricTile
              label="Week streak"
              mineVal={`${streak}`} minePct={myWeekTotals.length ? (streak / myWeekTotals.length) * 100 : 0}
              owenVal={`${owenStreak}`} owenPct={owenWeekTotals.length ? (owenStreak / owenWeekTotals.length) * 100 : 0}
            />
            <MetricTile
              label="Weeks at 100%"
              mineVal={`${weeksDone}`} minePct={myWeekTotals.length ? (weeksDone / myWeekTotals.length) * 100 : 0}
              owenVal={`${owenWeeksDone}`} owenPct={owenWeekTotals.length ? (owenWeeksDone / owenWeekTotals.length) * 100 : 0}
            />
            <MetricTile
              label="Confidence radar avg"
              mineVal={`${myConfidence}%`} minePct={myConfidence}
              owenVal={`${owenConfidence}%`} owenPct={owenConfidence}
            />
            <MetricTile
              label="Weekly volume (Strava)"
              mineVal={myFitness.hasData ? `${myFitness.weeklyKm.toFixed(1)}km` : "—"} minePct={Math.min(100, (myFitness.weeklyKm / 55) * 100)}
              owenVal={owenFitness.hasData ? `${owenFitness.weeklyKm.toFixed(1)}km` : "—"} owenPct={Math.min(100, (owenFitness.weeklyKm / 55) * 100)}
            />
            <MetricTile
              label="Vert, last 14d (Strava)"
              mineVal={myFitness.hasData ? `${Math.round(myFitness.elevGain14)}m` : "—"} minePct={Math.min(100, (myFitness.elevGain14 / 1200) * 100)}
              owenVal={owenFitness.hasData ? `${Math.round(owenFitness.elevGain14)}m` : "—"} owenPct={Math.min(100, (owenFitness.elevGain14 / 1200) * 100)}
            />
            <MetricTile
              label="Longest run (Strava)"
              mineVal={myFitness.hasData ? `${myFitness.longestKm.toFixed(1)}km` : "—"} minePct={Math.min(100, (myFitness.longestKm / 35) * 100)}
              owenVal={owenFitness.hasData ? `${owenFitness.longestKm.toFixed(1)}km` : "—"} owenPct={Math.min(100, (owenFitness.longestKm / 35) * 100)}
            />
            <MetricTile
              label="Avg pace (Strava)"
              mineVal={myFitness.avgPace ? `${myFitness.avgPace.toFixed(2)}/km` : "—"} minePct={myFitness.avgPace ? Math.min(100, (7.5 / myFitness.avgPace) * 100) : 0}
              owenVal={owenFitness.avgPace ? `${owenFitness.avgPace.toFixed(2)}/km` : "—"} owenPct={owenFitness.avgPace ? Math.min(100, (7.5 / owenFitness.avgPace) * 100) : 0}
            />
            <MetricTile
              label="Points"
              mineVal={`${myTotals.earnedPoints}`} minePct={Math.max(myTotals.earnedPoints, owenTotals.earnedPoints, 1) > 0 ? (myTotals.earnedPoints / Math.max(myTotals.earnedPoints, owenTotals.earnedPoints, 1)) * 100 : 0}
              owenVal={`${owenTotals.earnedPoints}`} owenPct={Math.max(myTotals.earnedPoints, owenTotals.earnedPoints, 1) > 0 ? (owenTotals.earnedPoints / Math.max(myTotals.earnedPoints, owenTotals.earnedPoints, 1)) * 100 : 0}
            />
          </div>

          <div className="radar-compare">
            <div className="radar-card">
              <div className="radar-head"><span className="radar-title">Shannon</span><span className="radar-score">{myConfidence}%</span></div>
              <ConfidenceRadar data={myRadar} color="var(--moss)" size={180} />
            </div>
            <div className="radar-card">
              <div className="radar-head"><span className="radar-title">Owen</span><span className="radar-score">{owenConfidence}%</span></div>
              <ConfidenceRadar data={owenRadar} color="var(--amber)" size={180} />
            </div>
          </div>
        </div>
      )}

      {activeTab === "bingo" && (
        <div>
          {!bingoShared && (
            <div className="connect-banner">
              <p>Shared storage isn&apos;t configured yet, so ticks only save on this device until Upstash is set up (see README).</p>
            </div>
          )}

          <div className="connect-banner">
            <p>Tapping as:</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="who-toggle-btn"
                style={whoAmI === "mine" ? { background: "var(--moss-ink)", borderColor: "var(--moss-ink)", color: "#fff" } : { background: "transparent", borderColor: "var(--line)", color: "var(--text-dim)" }}
                onClick={() => setWhoAmI("mine")}
              >
                Shannon
              </button>
              <button
                className="who-toggle-btn"
                style={whoAmI === "owen" ? { background: "var(--amber-ink)", borderColor: "var(--amber-ink)", color: "#fff" } : { background: "transparent", borderColor: "var(--line)", color: "var(--text-dim)" }}
                onClick={() => setWhoAmI("owen")}
              >
                Owen
              </button>
            </div>
          </div>

          {bingo && (
            <div className="score-cards">
              <div className="score-card">
                <div className="n" style={{ color: "var(--moss-ink)" }}>{bingo.mine.filter(Boolean).length}/25</div>
                <div className="l">Shannon&apos;s squares</div>
              </div>
              <div className="score-card">
                <div className="n" style={{ color: "var(--amber-ink)" }}>{bingo.owen.filter(Boolean).length}/25</div>
                <div className="l">Owen&apos;s squares</div>
              </div>
              <div className="score-card">
                <div className="n">{countCompletedLines(bingo.mine)} / {countCompletedLines(bingo.owen)}</div>
                <div className="l">Lines: Shannon / Owen</div>
              </div>
            </div>
          )}

          {bingo && countCompletedLines(bingo[whoAmI]) > 0 && (
            <div className="bingo-celebrate">
              🎉 BINGO — {countCompletedLines(bingo[whoAmI])} line{countCompletedLines(bingo[whoAmI]) > 1 ? "s" : ""} complete
            </div>
          )}

          <div className="bingo-grid">
            {BINGO_SQUARES.map((label, i) => {
              const isFree = i === FREE_INDEX;
              const myTick = bingo?.mine[i];
              const owenTick = bingo?.owen[i];
              let cellClass = "bingo-cell";
              if (isFree) cellClass += " free";
              else if (myTick && owenTick) cellClass += " ticked-both";
              else if (myTick) cellClass += " ticked-mine";
              else if (owenTick) cellClass += " ticked-owen";
              return (
                <div key={i} className={cellClass} onClick={() => toggleBingoCell(i)}>
                  <div className="cell-label">{isFree ? "FREE" : label}</div>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 16, lineHeight: 1.6, textAlign: "center" }}>
            Coral = Shannon&apos;s tick, red-orange = Owen&apos;s, split = both. Tap a square to toggle it for whoever you&apos;re tapping as above.
          </p>
        </div>
      )}
    </div>
  );
}
