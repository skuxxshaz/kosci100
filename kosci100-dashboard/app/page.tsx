"use client";

import { useEffect, useMemo, useState } from "react";
import { PLAN, POINTS, PlanPhase, PlanWeek, PlanSession, SessionType, GYM_SESSIONS } from "@/lib/plan";
import { OWEN_PLAN } from "@/lib/owen-plan";
import { matchSession, findBonusActivities, StravaActivity, MatchResult, BonusActivity } from "@/lib/match";
import { BINGO_SQUARES, FREE_INDEX, countCompletedLines, defaultTicks } from "@/lib/bingo";

const TAG_COLORS: Record<string, string> = {
  run: "#52572a", long: "#8a6d16", bike: "#b5476f", stair: "#7a5c3a",
  swim: "#b5476f", gymL: "#8a5a26", gymU: "#8a5a26", rest: "#75746c",
  other: "#75746c", race: "#8a6d16",
};

const MANUAL_KEY = "kosci100-manual-checks";

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

function distanceHeading(session: PlanSession): string | null {
  if (session.targetKm) {
    return session.targetKm >= 10 ? `${Math.round(session.targetKm)}KM` : `${session.targetKm}KM`;
  }
  if (session.targetMin) return `${session.targetMin}MIN`;
  return null;
}

// Sport types that count toward "km logged" bragging rights - deliberately
// the same set match.ts auto-detects against the plan, so a stray Strava
// "Walk" or "Yoga" activity doesn't skew the head-to-head number.
const LOGGED_SPORT_TYPES = new Set([
  "Run", "TrailRun", "VirtualRide", "Ride", "Swim", "WeightTraining", "StairStepper",
]);

// Running-only (no bike/swim/gym) — used for the "km run" and "avg pace"
// scoreboard stats, which should reflect actual running, not cross-training.
const RUNNING_SPORT_TYPES = new Set(["Run", "TrailRun"]);

function runningStatsFor(activities: StravaActivity[] | null) {
  const acts = (activities || []).filter((a) => RUNNING_SPORT_TYPES.has(a.sport_type));
  return {
    km: acts.reduce((s, a) => s + (a.distance || 0), 0) / 1000,
    movingSec: acts.reduce((s, a) => s + (a.moving_time || 0), 0),
  };
}

function formatPace(km: number, movingSec: number): string {
  if (km < 0.1 || movingSec <= 0) return "—";
  const secPerKm = movingSec / km;
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${sec.toString().padStart(2, "0")}/km`;
}

function hoursTrainedFor(activities: StravaActivity[] | null): number {
  if (!activities) return 0;
  return (
    activities
      .filter((a) => LOGGED_SPORT_TYPES.has(a.sport_type))
      .reduce((s, a) => s + (a.moving_time || 0), 0) / 3600
  );
}

function elevationFor(activities: StravaActivity[] | null): number {
  if (!activities) return 0;
  return activities
    .filter((a) => LOGGED_SPORT_TYPES.has(a.sport_type))
    .reduce((s, a) => s + (a.total_elevation_gain || 0), 0);
}

// ---- points breakdown by training category, for the head-to-head scoreboard ----
const POINT_CATEGORY_DEFS: { label: string; types: SessionType[] }[] = [
  { label: "Long", types: ["long"] },
  { label: "Run", types: ["run"] },
  { label: "Gym", types: ["gymL", "gymU"] },
  { label: "Stair", types: ["stair"] },
  { label: "Bike", types: ["bike"] },
  { label: "Swim", types: ["swim"] },
  { label: "Race", types: ["race"] },
  { label: "Other", types: ["other"] },
];

function categoryPointsFor(results: { session: PlanSession; match: MatchResult }[], types: SessionType[]) {
  let earned = 0, total = 0;
  results.forEach(({ session, match }) => {
    if (!types.includes(session.type)) return;
    total += POINTS[session.type];
    if (match.detected) earned += POINTS[session.type];
  });
  return { earned, total, pct: total ? Math.round((earned / total) * 100) : 0 };
}

function pointsBreakdownFor(
  myResults: { session: PlanSession; match: MatchResult }[],
  owenResults: { session: PlanSession; match: MatchResult }[]
) {
  return POINT_CATEGORY_DEFS.map((def) => ({
    label: def.label,
    mine: categoryPointsFor(myResults, def.types),
    owen: categoryPointsFor(owenResults, def.types),
  })).filter((row) => row.mine.total > 0 || row.owen.total > 0);
}

// ---- "this week" + "weeks led" helpers, matched by chronological index ----
function weekEndDate(week: PlanWeek): string | undefined {
  const dates = week.sessions.map((s) => s.date).sort();
  return dates[dates.length - 1];
}

function currentWeekFor(plan: PlanPhase[], todayStr: string): { id: string } | null {
  const weeks = plan
    .flatMap((p) => p.weeks)
    .map((w) => ({ id: w.id, start: w.sessions.map((s) => s.date).sort()[0], end: weekEndDate(w) }))
    .filter((w) => w.start && w.end) as { id: string; start: string; end: string }[];
  const current = weeks.find((w) => todayStr >= w.start && todayStr <= w.end);
  if (current) return current;
  const upcoming = weeks.find((w) => w.start > todayStr);
  if (upcoming) return upcoming;
  return weeks[weeks.length - 1] || null;
}

function weeksLedTally(
  myPlan: PlanPhase[],
  myWeekTotals: { done: number; total: number }[],
  owenPlan: PlanPhase[],
  owenWeekTotals: { done: number; total: number }[],
  todayStr: string
) {
  const myWeeks = myPlan.flatMap((p) => p.weeks);
  const count = Math.min(myWeeks.length, myWeekTotals.length, owenWeekTotals.length);
  let mine = 0, owen = 0, scored = 0;
  for (let i = 0; i < count; i++) {
    const end = weekEndDate(myWeeks[i]);
    if (!end || end > todayStr) continue; // week hasn't finished yet
    const m = myWeekTotals[i], o = owenWeekTotals[i];
    if (m.total === 0 && o.total === 0) continue;
    scored++;
    const mPct = m.total ? m.done / m.total : 0;
    const oPct = o.total ? o.done / o.total : 0;
    if (mPct > oPct) mine++;
    else if (oPct > mPct) owen++;
  }
  return { mine, owen, scored };
}

// How you're tracking against the plan's own timeline: of everything
// scheduled up to today (rest days excluded), how much is actually done.
function paceStatus(results: { session: PlanSession; match: MatchResult }[]) {
  const today = new Date().toISOString().slice(0, 10);
  let expected = 0, done = 0;
  results.forEach(({ session, match }) => {
    if (session.type === "rest") return;
    if (session.date <= today) {
      expected++;
      if (match.detected) done++;
    }
  });
  return { expected, done, diff: done - expected };
}

// A rough, gamified read on goal confidence - overall completion plus how
// far ahead/behind schedule you are right now. Not a prediction, just a fun
// competitive gauge.
function confidenceFor(pct: number, diff: number): { label: string; tone: "good" | "ok" | "warn" } {
  const score = pct + diff * 4;
  if (score >= 85) return { label: "Strong", tone: "good" };
  if (score >= 60) return { label: "On track", tone: "ok" };
  return { label: "At risk", tone: "warn" };
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

  function buildResults(plan: PlanPhase[], who: "mine" | "owen", activities: StravaActivity[] | null) {
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

  const myBonus = useMemo(() => {
    const allSessions = PLAN.flatMap((p) => p.weeks.flatMap((w) => w.sessions));
    return findBonusActivities(allSessions, mine.activities || []);
  }, [mine.activities]);
  const owenBonus = useMemo(() => {
    const allSessions = OWEN_PLAN.flatMap((p) => p.weeks.flatMap((w) => w.sessions));
    return findBonusActivities(allSessions, owen.activities || []);
  }, [owen.activities]);

  function totalsFor(results: ReturnType<typeof buildResults>) {
    let total = 0, done = 0, totalPoints = 0, earnedPoints = 0;
    results.forEach(({ session, match }) => {
      if (session.type === "rest") return; // rest days aren't training - keep them out of the ratio entirely
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

  const myPace = useMemo(() => paceStatus(myResults), [myResults]);
  const myConfidence = useMemo(() => confidenceFor(myTotals.pct, myPace.diff), [myTotals.pct, myPace.diff]);

  const daysToRace = useMemo(() => {
    const race = new Date("2026-11-27T00:00:00");
    const now = new Date();
    return Math.max(0, Math.ceil((race.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }, []);

  function weekTotalsFor(plan: PlanPhase[], results: ReturnType<typeof buildResults>) {
    const byWeek: Record<string, { id: string; label: string; dateRange: string; done: number; total: number; points: number }> = {};
    plan.forEach((phase) => {
      phase.weeks.forEach((week) => {
        byWeek[week.id] = { id: week.id, label: week.label, dateRange: week.dateRange, done: 0, total: 0, points: 0 };
      });
    });
    results.forEach(({ session, weekId, match }) => {
      if (session.type === "rest") return; // rest days aren't training - keep them out of the ratio entirely
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

  const owenConnected = owen.authState === "connected";
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const myHours = useMemo(() => hoursTrainedFor(mine.activities), [mine.activities]);
  const owenHours = useMemo(() => hoursTrainedFor(owen.activities), [owen.activities]);
  const myRunning = useMemo(() => runningStatsFor(mine.activities), [mine.activities]);
  const owenRunning = useMemo(() => runningStatsFor(owen.activities), [owen.activities]);
  const myElevation = useMemo(() => elevationFor(mine.activities), [mine.activities]);
  const owenElevation = useMemo(() => elevationFor(owen.activities), [owen.activities]);

  const pointsBreakdown = useMemo(
    () => pointsBreakdownFor(myResults, owenResults),
    [myResults, owenResults]
  );

  const myCurrentWeekId = useMemo(() => currentWeekFor(PLAN, todayStr)?.id, [todayStr]);
  const owenCurrentWeekId = useMemo(() => currentWeekFor(OWEN_PLAN, todayStr)?.id, [todayStr]);
  const myThisWeek = useMemo(
    () => myWeekTotals.find((w) => w.id === myCurrentWeekId) || null,
    [myWeekTotals, myCurrentWeekId]
  );
  const owenThisWeek = useMemo(
    () => owenWeekTotals.find((w) => w.id === owenCurrentWeekId) || null,
    [owenWeekTotals, owenCurrentWeekId]
  );

  const weeksLed = useMemo(
    () => weeksLedTally(PLAN, myWeekTotals, OWEN_PLAN, owenWeekTotals, todayStr),
    [myWeekTotals, owenWeekTotals, todayStr]
  );

  const iAmLeading = owenConnected && myTotals.pct >= owenTotals.pct;
  const owenLeading = owenConnected && owenTotals.pct > myTotals.pct;

  // ---- render a single session row's content (used inside both single & AM/PM combined rows) ----
  function sessionContent(session: PlanSession, who: "mine" | "owen", idx: number, match?: MatchResult) {
    const key = sid(who, session.date, idx);
    const heading = distanceHeading(session);
    const gymContent = session.type === "gymL" || session.type === "gymU" ? GYM_SESSIONS[session.type] : null;
    return (
      <div className="sess-content">
        <div className="sesh">
          {heading && <span className="dist-heading">{heading}</span>}
          {session.label}
          {match?.matched && <span className="source-tag strava">— from Strava: {match.matched.name}</span>}
        </div>
        {gymContent && (
          <details className="gym-details">
            <summary>Session details</summary>
            <ul className="gym-list">
              {gymContent.map((ex) => (
                <li key={ex}>{ex}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    );
  }

  // ---- shared renderer for a plan tab (My Plan / Owen's Plan) ----
  function renderPlanBody(
    plan: PlanPhase[],
    who: "mine" | "owen",
    results: ReturnType<typeof buildResults>,
    activePhase: string,
    setActivePhase: (id: string) => void,
    bonus: BonusActivity[]
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
              const wResult = results.filter((r) => r.weekId === week.id && r.session.type !== "rest");
              const wDone = wResult.filter((r) => r.match.detected).length;
              const wPct = wResult.length ? Math.round((wDone / wResult.length) * 100) : 0;

              // group sessions by date for AM/PM combining
              const byDate: Record<string, { session: PlanSession; idx: number }[]> = {};
              week.sessions.forEach((session, idx) => {
                if (!byDate[session.date]) byDate[session.date] = [];
                byDate[session.date].push({ session, idx });
              });

              return (
                <div className="week" key={week.id}>
                  <div className="week-head">
                    <div>
                      <span className="wk">{week.label}</span>
                      <span className="dates">{week.dateRange}</span>
                      {week.weeklyKmGoal && <span className="km-goal">Target: {week.weeklyKmGoal}km running</span>}
                    </div>
                    <div className="week-head-right">
                      <div className="week-bar"><i style={{ width: `${wPct}%` }} /></div>
                      <div className="week-pct">{wPct}%</div>
                    </div>
                  </div>

                  {Object.entries(byDate).map(([date, entries]) => {
                    const dayLabel = new Date(date + "T00:00:00").toLocaleDateString("en-AU", {
                      weekday: "short", day: "numeric", month: "short",
                    });

                    if (entries.length === 1) {
                      const { session, idx } = entries[0];
                      const key = sid(who, session.date, idx);
                      const found = results.find((r) => r.key === key);
                      const match = found?.match;
                      const isRest = session.type === "rest";
                      const isDone = !isRest && match?.detected;
                      const manualToggle = !!match && !match.autoDetectable && !isRest;
                      return (
                        <div className={`row ${isDone ? "done" : ""} ${isRest ? "rest-row" : ""}`} key={date}>
                          <div
                            className={`chk ${isDone ? "on" : ""} ${manualToggle ? "manual" : ""} ${isRest ? "rest-marker" : ""}`}
                            onClick={() => manualToggle && toggleManual(key)}
                          >
                            {isRest ? (
                              <span className="rest-dash">–</span>
                            ) : (
                              <svg viewBox="0 0 12 12"><polyline points="1,6 4.5,10 11,2" /></svg>
                            )}
                          </div>
                          <div className="row-text">
                            <div className="day" style={{ ["--tag-color" as any]: TAG_COLORS[session.type] }}>{dayLabel}</div>
                            {sessionContent(session, who, idx, match)}
                          </div>
                        </div>
                      );
                    }

                    // two sessions same day — AM/PM combined row
                    return (
                      <div className="row ampm-row" key={date}>
                        <div className="row-text">
                          <div className="day">{dayLabel}</div>
                          <div className="ampm-grid">
                            {entries.map(({ session, idx }) => {
                              const key = sid(who, session.date, idx);
                              const found = results.find((r) => r.key === key);
                              const match = found?.match;
                              const isRest = session.type === "rest";
                              const isDone = !isRest && match?.detected;
                              const manualToggle = !!match && !match.autoDetectable && !isRest;
                              return (
                                <div className={`ampm-col ${isDone ? "done" : ""} ${isRest ? "rest-row" : ""}`} key={key}>
                                  <div className="ampm-head">
                                    <div
                                      className={`chk small ${isDone ? "on" : ""} ${manualToggle ? "manual" : ""} ${isRest ? "rest-marker" : ""}`}
                                      onClick={() => manualToggle && toggleManual(key)}
                                    >
                                      {isRest ? (
                                        <span className="rest-dash">–</span>
                                      ) : (
                                        <svg viewBox="0 0 12 12"><polyline points="1,6 4.5,10 11,2" /></svg>
                                      )}
                                    </div>
                                  </div>
                                  {sessionContent(session, who, idx, match)}
                                </div>
                              );
                            })}
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

        {bonus.length > 0 && (
          <div className="bonus-panel">
            <div className="bonus-title">Bonus sessions synced from Strava</div>
            <p className="bonus-note">Not in the plan, but they still count — logged automatically when they showed up.</p>
            {bonus.map((b) => (
              <div className="row done bonus-row" key={b.activity.id}>
                <div className="chk on"><svg viewBox="0 0 12 12"><polyline points="1,6 4.5,10 11,2" /></svg></div>
                <div className="row-text">
                  <div className="day">{new Date(b.date + "T00:00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}</div>
                  <div className="sesh">{b.activity.name} <span className="bonus-badge">+5 bonus</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
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
          <p>Connected to {label}&apos;s Strava. Runs, rides, swims, strength (gym), and stairmaster (StairStepper) all auto-detect. Rest and travel/cross-training days stay tap-to-confirm.</p>
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

        <div className="big-progress">
          <div className="big-progress-track">
            <div className="big-progress-fill" style={{ width: `${myTotals.pct}%` }} />
            <span className="big-progress-label">{myTotals.pct}% complete · {daysToRace} days to race</span>
          </div>
        </div>

        <div className="stats">
          <div className="stat"><div className="n">{myTotals.pct}%</div><div className="l">Complete</div></div>
          <div className="stat"><div className="n">{myTotals.done}</div><div className="l">Sessions done</div></div>
          <div className="stat"><div className="n">{myTotals.total}</div><div className="l">Total sessions</div></div>
          <div className="stat"><div className="n">{daysToRace}</div><div className="l">Days to race</div></div>
        </div>
      </header>

      <div className="tabbar">
        <button className={activeTab === "weekly" ? "active" : ""} onClick={() => setActiveTab("weekly")}>Head to Head</button>
        <button className={activeTab === "myplan" ? "active" : ""} onClick={() => setActiveTab("myplan")}>My Plan</button>
        <button className={activeTab === "owen" ? "active" : ""} onClick={() => setActiveTab("owen")}>Owen&apos;s Plan</button>
        <button className={activeTab === "bingo" ? "active" : ""} onClick={() => setActiveTab("bingo")}>Bingo Card</button>
      </div>

      {activeTab === "weekly" && (
        <div>
          <div className="confidence-banner">
            <div className={`confidence-pill ${myConfidence.tone}`}>{myConfidence.label}</div>
            <div className="confidence-text">
              {myPace.diff > 0 && `${myPace.diff} session${myPace.diff === 1 ? "" : "s"} ahead of schedule`}
              {myPace.diff === 0 && "Right on pace with the plan"}
              {myPace.diff < 0 && `${Math.abs(myPace.diff)} session${Math.abs(myPace.diff) === 1 ? "" : "s"} behind schedule`}
              {" — confidence read on hitting your sub-15h goal at the current rate."}
            </div>
          </div>

          <div className="scoreboard-card">
            <div className="scoreboard-cols">
              <div className="scoreboard-col">
                <div className="scoreboard-name">
                  {iAmLeading && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--gold-text)" stroke="none"><path d="M3 8l4 3 5-6 5 6 4-3-2 11H5L3 8z" /></svg>
                  )}
                  <span>Shannon</span>
                </div>
                <div className="scoreboard-pct mine">{myTotals.pct}%</div>
                <div className="scoreboard-label">Plan adherence</div>
                <div className="scoreboard-bar"><div className="scoreboard-bar-fill mine" style={{ width: `${myTotals.pct}%` }} /></div>
                <div className="scoreboard-stats">
                  <div className="scoreboard-stat"><span>Sessions done</span><span>{myTotals.done}</span></div>
                  <div className="scoreboard-stat"><span>Hours trained</span><span>{myHours.toFixed(1)}h</span></div>
                  <div className="scoreboard-stat"><span>Km run</span><span>{Math.round(myRunning.km)}km</span></div>
                  <div className="scoreboard-stat"><span>Elevation</span><span>{Math.round(myElevation).toLocaleString()}m</span></div>
                  <div className="scoreboard-stat last"><span>Avg run pace</span><span>{formatPace(myRunning.km, myRunning.movingSec)}</span></div>
                </div>
              </div>

              <div className="scoreboard-col owen">
                <div className="scoreboard-name">
                  {owenLeading && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--gold-text)" stroke="none"><path d="M3 8l4 3 5-6 5 6 4-3-2 11H5L3 8z" /></svg>
                  )}
                  <span>Owen</span>
                </div>
                <div className="scoreboard-pct owen">{owenConnected ? `${owenTotals.pct}%` : "—"}</div>
                <div className="scoreboard-label">Plan adherence</div>
                <div className="scoreboard-bar"><div className="scoreboard-bar-fill owen" style={{ width: `${owenConnected ? owenTotals.pct : 0}%` }} /></div>
                <div className="scoreboard-stats">
                  <div className="scoreboard-stat"><span>Sessions done</span><span>{owenConnected ? owenTotals.done : "—"}</span></div>
                  <div className="scoreboard-stat"><span>Hours trained</span><span>{owenConnected ? `${owenHours.toFixed(1)}h` : "—"}</span></div>
                  <div className="scoreboard-stat"><span>Km run</span><span>{owenConnected ? `${Math.round(owenRunning.km)}km` : "—"}</span></div>
                  <div className="scoreboard-stat"><span>Elevation</span><span>{owenConnected ? `${Math.round(owenElevation).toLocaleString()}m` : "—"}</span></div>
                  <div className="scoreboard-stat last"><span>Avg run pace</span><span>{owenConnected ? formatPace(owenRunning.km, owenRunning.movingSec) : "—"}</span></div>
                </div>
              </div>
            </div>
            <div className="scoreboard-vs">VS</div>
            {!owenConnected && (
              <div className="vs-note center">Owen hasn&apos;t connected his Strava yet — head to his tab to link it and this fills in for real.</div>
            )}
          </div>

          <div className="breakdown-card">
            <div className="breakdown-head">
              <div className="breakdown-title">Points breakdown</div>
              <div className="breakdown-total"><span className="mine">{myTotals.earnedPoints}</span> <span className="vs-word">vs</span> <span className="owen">{owenConnected ? owenTotals.earnedPoints : "—"}</span></div>
            </div>
            {pointsBreakdown.map((row) => (
              <div className="breakdown-row" key={row.label}>
                <div className="breakdown-label">{row.label}</div>
                <div className="breakdown-bars">
                  <div className="breakdown-bar mine" style={{ width: `${row.mine.pct}%` }}>{row.mine.earned > 0 && row.mine.earned}</div>
                  <div className="breakdown-bar owen" style={{ width: `${owenConnected ? row.owen.pct : 0}%` }}>{owenConnected && row.owen.earned > 0 && row.owen.earned}</div>
                </div>
              </div>
            ))}
          </div>

          {myThisWeek && (
            <div className="thisweek-card">
              <div className="thisweek-title">This week</div>
              <div className="thisweek-row">
                <div className="thisweek-name">Shannon</div>
                <div className="thisweek-track"><div className="thisweek-fill mine" style={{ width: `${myThisWeek.total ? (myThisWeek.done / myThisWeek.total) * 100 : 0}%` }} /></div>
                <div className="thisweek-frac">{myThisWeek.done}/{myThisWeek.total}</div>
              </div>
              <div className="thisweek-row">
                <div className="thisweek-name">Owen</div>
                <div className="thisweek-track"><div className="thisweek-fill owen" style={{ width: `${owenConnected && owenThisWeek?.total ? (owenThisWeek.done / owenThisWeek.total) * 100 : 0}%` }} /></div>
                <div className="thisweek-frac">{owenConnected && owenThisWeek ? `${owenThisWeek.done}/${owenThisWeek.total}` : "—"}</div>
              </div>
            </div>
          )}

          {owenConnected && (
            <div className="weeksled-card">
              <div className="weeksled-side">
                <div className="weeksled-n mine">{weeksLed.mine}</div>
                <div className="weeksled-l">weeks led — Shannon</div>
              </div>
              <div className="weeksled-mid">out of {weeksLed.scored} scored so far</div>
              <div className="weeksled-side">
                <div className="weeksled-n owen">{weeksLed.owen}</div>
                <div className="weeksled-l">weeks led — Owen</div>
              </div>
            </div>
          )}

          <table className="totals-table">
            <thead><tr><th>Week</th><th>Dates</th><th>Sessions</th><th>Progress</th><th>Points</th></tr></thead>
            <tbody>
              {myWeekTotals.map((w) => {
                const pct = w.total ? Math.round((w.done / w.total) * 100) : 0;
                return (
                  <tr key={w.label}>
                    <td>{w.label}</td>
                    <td style={{ color: "var(--text-dim)", fontSize: 11 }}>{w.dateRange}</td>
                    <td>{w.done}/{w.total}</td>
                    <td><span className="tbar"><i style={{ width: `${pct}%` }} /></span>{pct}%</td>
                    <td style={{ color: "var(--gold-text)", fontWeight: 700 }}>{w.points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "myplan" && (
        <div>
          {connectBanner("mine", mine.authState, "your")}
          {renderPlanBody(PLAN, "mine", myResults, myActivePhase, setMyActivePhase, myBonus)}
          <footer>
            <div><b>Note:</b> if a week feels flat or overly sore, drop the stairmaster or a gym session before the long run.</div>
          </footer>
        </div>
      )}

      {activeTab === "owen" && (
        <div>
          {connectBanner("owen", owen.authState, "Owen")}

          <div className="stats" style={{ marginBottom: 18 }}>
            <div className="stat"><div className="n">106.5k</div><div className="l">Kosci100</div></div>
            <div className="stat"><div className="n">{daysToRace}</div><div className="l">Days to race</div></div>
            <div className="stat"><div className="n">sub-15</div><div className="l">Goal</div></div>
            <div className="stat"><div className="n">Fri 27 Nov</div><div className="l">Race day</div></div>
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

          {renderPlanBody(OWEN_PLAN, "owen", owenResults, owenActivePhase, setOwenActivePhase, owenBonus)}
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
              <button className={whoAmI === "mine" ? "btn" : "btn secondary"} onClick={() => setWhoAmI("mine")}>Shannon</button>
              <button className={whoAmI === "owen" ? "btn" : "btn secondary"} onClick={() => setWhoAmI("owen")}>Owen</button>
            </div>
          </div>

          {bingo && (
            <div className="score-cards">
              <div className="score-card">
                <div className="n">{bingo.mine.filter(Boolean).length}/25</div>
                <div className="l">Your squares</div>
              </div>
              <div className="score-card">
                <div className="n">{bingo.owen.filter(Boolean).length}/25</div>
                <div className="l">Owen&apos;s squares</div>
              </div>
              <div className="score-card">
                <div className="n">{countCompletedLines(bingo.mine)} / {countCompletedLines(bingo.owen)}</div>
                <div className="l">Lines: you / Owen</div>
              </div>
            </div>
          )}

          {bingo && countCompletedLines(bingo[whoAmI]) > 0 && (
            <div className="badge-row">
              <span className="badge earned">🎉 BINGO — {countCompletedLines(bingo[whoAmI])} line{countCompletedLines(bingo[whoAmI]) > 1 ? "s" : ""} complete</span>
            </div>
          )}

          <div className="bingo-grid" style={{ maxWidth: 520 }}>
            {BINGO_SQUARES.map((label, i) => {
              const isFree = i === FREE_INDEX;
              const myTick = bingo?.mine[i];
              const owenTick = bingo?.owen[i];
              return (
                <div
                  key={i}
                  className={`bingo-cell ${isFree ? "free" : ""}`}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    padding: 4, textAlign: "center", cursor: isFree ? "default" : "pointer",
                  }}
                  onClick={() => toggleBingoCell(i)}
                >
                  <div style={{ fontSize: 9, lineHeight: 1.2, fontWeight: 700 }}>{label}</div>
                  {!isFree && (
                    <div className="bingo-dot-row">
                      <span className={`bingo-dot mine ${myTick ? "on" : ""}`}>Shannon</span>
                      <span className={`bingo-dot owen ${owenTick ? "on" : ""}`}>Owen</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 14, lineHeight: 1.6 }}>
            Green = your tick, purple = Owen&apos;s. Tap a square to toggle it for whoever you&apos;re tapping as above.
          </p>
        </div>
      )}
    </div>
  );
}
