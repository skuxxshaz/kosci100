"use client";

import { useEffect, useMemo, useState } from "react";
import { PLAN, POINTS, PlanPhase, PlanSession, GYM_SESSIONS } from "@/lib/plan";
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

export default function Page() {
  const mine = usePersonStrava("mine");
  const owen = usePersonStrava("owen");

  const [manual, setManual] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"myplan" | "weekly" | "owen" | "bingo">("myplan");
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

  const streak = useMemo(() => {
    let s = 0;
    for (const w of myWeekTotals) {
      if (w.total > 0 && w.done === w.total) s++;
      else break;
    }
    return s;
  }, [myWeekTotals]);
  const weeksDone = myWeekTotals.filter((w) => w.total > 0 && w.done === w.total).length;

  const badges = [
    { label: "Trailblazer 25%", min: 25 },
    { label: "Peak Bagger 50%", min: 50 },
    { label: "Summit Push 75%", min: 75 },
    { label: "Kosci Ready 100%", min: 100 },
  ];

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
              const wResult = results.filter((r) => r.weekId === week.id);
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
                      const isDone = match?.detected;
                      const manualToggle = !!match && !match.autoDetectable && session.type !== "rest";
                      return (
                        <div className={`row ${isDone ? "done" : ""}`} key={date}>
                          <div
                            className={`chk ${isDone ? "on" : ""} ${manualToggle ? "manual" : ""}`}
                            onClick={() => manualToggle && toggleManual(key)}
                          >
                            <svg viewBox="0 0 12 12"><polyline points="1,6 4.5,10 11,2" /></svg>
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
                              const isDone = match?.detected;
                              const manualToggle = !!match && !match.autoDetectable && session.type !== "rest";
                              return (
                                <div className={`ampm-col ${isDone ? "done" : ""}`} key={key}>
                                  <div className="ampm-head">
                                    <div
                                      className={`chk small ${isDone ? "on" : ""} ${manualToggle ? "manual" : ""}`}
                                      onClick={() => manualToggle && toggleManual(key)}
                                    >
                                      <svg viewBox="0 0 12 12"><polyline points="1,6 4.5,10 11,2" /></svg>
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
        <button className={activeTab === "myplan" ? "active" : ""} onClick={() => setActiveTab("myplan")}>My Plan</button>
        <button className={activeTab === "weekly" ? "active" : ""} onClick={() => setActiveTab("weekly")}>Weekly Totals</button>
        <button className={activeTab === "owen" ? "active" : ""} onClick={() => setActiveTab("owen")}>Owen&apos;s Plan</button>
        <button className={activeTab === "bingo" ? "active" : ""} onClick={() => setActiveTab("bingo")}>Bingo Card</button>
      </div>

      {activeTab === "myplan" && (
        <div>
          {connectBanner("mine", mine.authState, "your")}
          {renderPlanBody(PLAN, "mine", myResults, myActivePhase, setMyActivePhase, myBonus)}
          <footer>
            <div><b>Note:</b> if a week feels flat or overly sore, drop the stairmaster or a gym session before the long run.</div>
          </footer>
        </div>
      )}

      {activeTab === "weekly" && (
        <div>
          <div className="score-cards">
            <div className="score-card"><div className="n">{myTotals.earnedPoints}</div><div className="l">Points</div></div>
            <div className="score-card"><div className="n">{streak}</div><div className="l">Week streak</div></div>
            <div className="score-card"><div className="n">{weeksDone}</div><div className="l">Weeks 100%</div></div>
          </div>
          <div className="badge-row">
            {badges.map((b) => (
              <span key={b.label} className={`badge ${myTotals.pct >= b.min ? "earned" : ""}`}>
                {myTotals.pct >= b.min ? "\u2713 " : ""}{b.label}
              </span>
            ))}
          </div>

          <div className="vs-card">
            <div className="vs-title">Head to head</div>
            <div className="vs-row">
              <div className="vs-name">You</div>
              <div className="vs-bar-track"><div className="vs-bar mine" style={{ width: `${myTotals.pct}%` }} /></div>
              <div className="vs-pct">{myTotals.pct}%</div>
            </div>
            <div className="vs-row">
              <div className="vs-name">Owen</div>
              <div className="vs-bar-track"><div className="vs-bar owen" style={{ width: `${owenTotals.pct}%` }} /></div>
              <div className="vs-pct">{owen.authState === "connected" ? `${owenTotals.pct}%` : "—"}</div>
            </div>
            {owen.authState !== "connected" && (
              <div className="vs-note">Owen hasn&apos;t connected his Strava yet — head to his tab to link it and this fills in for real.</div>
            )}
          </div>

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
              <button className={whoAmI === "mine" ? "btn" : "btn secondary"} onClick={() => setWhoAmI("mine")}>Me</button>
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
                      <span className={`bingo-dot mine ${myTick ? "on" : ""}`}>Me</span>
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
