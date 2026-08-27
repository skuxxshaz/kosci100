export type SessionType =
  | "run"
  | "long"
  | "bike"
  | "stair"
  | "swim"
  | "gymL"
  | "gymU"
  | "rest"
  | "other"
  | "race";

export interface PlanSession {
  date: string; // YYYY-MM-DD
  type: SessionType;
  label: string;
  targetKm?: number;
  targetMin?: number;
}

export interface PlanWeek {
  id: string;
  label: string;
  dateRange: string;
  sessions: PlanSession[];
}

export interface PlanPhase {
  id: string;
  name: string;
  range: string;
  note: string;
  weeks: PlanWeek[];
}

export const POINTS: Record<SessionType, number> = {
  run: 10,
  long: 25,
  bike: 10,
  stair: 15,
  swim: 10,
  gymL: 15,
  gymU: 15,
  rest: 0,
  other: 5,
  race: 100,
};

export const PLAN: PlanPhase[] = [
  {
    id: "p1",
    name: "Marathon Taper & Recovery",
    range: "24 Aug – 6 Sep",
    note: "Taper into and recover out of the Sydney Marathon before any ultra-specific loading starts.",
    weeks: [
      {
        id: "w1",
        label: "Week 1 — race week",
        dateRange: "24–30 Aug",
        sessions: [
          { date: "2026-08-24", type: "run", label: "Run 5km, easy (HR ≤150bpm)", targetKm: 5 },
          { date: "2026-08-25", type: "bike", label: "Rouvy Zone2 bike 60min", targetMin: 60 },
          { date: "2026-08-26", type: "run", label: "Run 8km, fartlek — surges @ ~4:15–4:30/km within an easy 5:20/km base (HR ≤150bpm)", targetKm: 8 },
          { date: "2026-08-27", type: "rest", label: "Rest" },
          { date: "2026-08-28", type: "rest", label: "Rest" },
          { date: "2026-08-29", type: "run", label: "Run 5km, easy (HR ≤150bpm)", targetKm: 5 },
          { date: "2026-08-30", type: "race", label: "Sydney Marathon — race day", targetKm: 42.2 },
        ],
      },
      {
        id: "w2",
        label: "Week 2 — post-marathon recovery",
        dateRange: "31 Aug – 6 Sep",
        sessions: [
          { date: "2026-08-31", type: "rest", label: "Rest, legs will be trashed — this is normal" },
          { date: "2026-09-01", type: "rest", label: "Rest, or gentle walk/swim" },
          { date: "2026-09-02", type: "run", label: "Run very easy 20–30min (~4–5km) @ 5:45–6:00/km recovery pace (HR ≤150bpm)", targetMin: 25, targetKm: 4.3 },
          { date: "2026-09-03", type: "swim", label: "Swim 1km, easy, recovery only", targetKm: 1 },
          { date: "2026-09-04", type: "run", label: "Run easy 30min (~5.5km) @ 5:20/km (HR ≤150bpm)", targetMin: 30, targetKm: 5.6 },
          { date: "2026-09-05", type: "bike", label: "Rouvy Zone2 45min, easy", targetMin: 45 },
          { date: "2026-09-06", type: "run", label: "Run easy 45–60min (~9km) @ 5:20/km (HR ≤150bpm)", targetMin: 50, targetKm: 9.4 },
        ],
      },
    ],
  },
  {
    id: "p2",
    name: "Reintegration",
    range: "7–13 Sep",
    note: "Pick the six-tool structure back up ahead of travel — a bit more load this week since doubles are fine.",
    weeks: [
      {
        id: "w3",
        label: "Week 3",
        dateRange: "7–13 Sep",
        sessions: [
          { date: "2026-09-07", type: "gymL", label: "Gym – Lower, hip-safe strength A: trap bar deadlift, glute bridge, single-leg calf raise, banded lateral walk (band below knee, stay neutral)" },
          { date: "2026-09-07", type: "run", label: "Run easy 40min (~7.5km) @ 5:20/km (HR ≤150bpm)", targetMin: 40, targetKm: 7.5 },
          { date: "2026-09-08", type: "bike", label: "Rouvy Zone2 60min", targetMin: 60 },
          { date: "2026-09-08", type: "stair", label: "Stairmaster 30min", targetMin: 30 },
          { date: "2026-09-09", type: "run", label: "Run 60min, tempo — 20min easy (HR ≤150bpm), 20min build to threshold (~4:45–4:55/km), 20min easy cool-down (HR ≤150bpm) (~11.5km total)", targetMin: 60, targetKm: 11.6 },
          { date: "2026-09-10", type: "gymU", label: "Gym – Upper + anti-rotation core (Pallof press, dead bug) — pelvis stability, no hip loading" },
          { date: "2026-09-10", type: "swim", label: "Swim 1km", targetKm: 1 },
          { date: "2026-09-11", type: "stair", label: "Stairmaster 30min", targetMin: 30 },
          { date: "2026-09-11", type: "run", label: "Run easy 40min shakeout (~7km) @ 5:20/km (HR ≤150bpm)", targetMin: 40, targetKm: 6.9 },
          { date: "2026-09-12", type: "long", label: "Long run 1h45, moderate (~19km) @ ~5:25–5:35/km + pack/travel prep", targetMin: 105, targetKm: 19.4 },
          { date: "2026-09-13", type: "rest", label: "Fly to Queenstown, arrive & check in" },
        ],
      },
    ],
  },
  {
    id: "pq",
    name: "Queenstown Running",
    range: "14–20 Sep",
    note: "Replaces structured training — just these trail runs slotted around everything else you've got planned.",
    weeks: [
      {
        id: "wq",
        label: "Trip week",
        dateRange: "14–20 Sep",
        sessions: [
          { date: "2026-09-15", type: "run", label: "Run 10km, morning", targetKm: 10 },
          { date: "2026-09-16", type: "long", label: "Jack's Point Track run — trail, route-dependent (~8–10km loop, easy-moderate, flat-rolling — check trail map on the day)" },
          { date: "2026-09-19", type: "long", label: "Roy's Peak Track — key long/vert session, ~16km return, ~1240m vert, moderate-hard effort on the climb, easy on the descent", targetKm: 16 },
        ],
      },
    ],
  },
  {
    id: "p3",
    name: "Rebuild",
    range: "21–27 Sep",
    note: "Close out the trip with the last trail run and travel home, then absorb the big vert block.",
    weeks: [
      {
        id: "w4",
        label: "Week 4",
        dateRange: "21–27 Sep",
        sessions: [
          { date: "2026-09-21", type: "long", label: "Lowe Shotover / Kimi Ākau Trail run — route-dependent, plan for 60–90min continuous, easy-moderate effort" },
          { date: "2026-09-22", type: "run", label: "Optional easy shakeout run (~20min, ~3.5km) @ 5:45/km (HR ≤150bpm), then depart", targetMin: 20, targetKm: 3.4 },
          { date: "2026-09-23", type: "rest", label: "Rest / travel recovery" },
          { date: "2026-09-24", type: "run", label: "Run easy 45min, flat, very easy (~7.7km) @ 5:45/km (HR ≤150bpm)", targetMin: 45, targetKm: 7.7 },
          { date: "2026-09-25", type: "bike", label: "Rouvy Zone2 50min", targetMin: 50 },
          { date: "2026-09-26", type: "gymL", label: "Gym – full body, light: glute bridge, calf raise, isometric hip hold only" },
          { date: "2026-09-27", type: "long", label: "Long run 1h45, easy (~19.5km) @ 5:20–5:30/km (HR ≤150bpm)", targetMin: 105, targetKm: 19.7 },
        ],
      },
    ],
  },
  {
    id: "p4",
    name: "Build 1",
    range: "28 Sep – 18 Oct",
    note: "Rebuild volume, extend the long run, bring stairmaster back as dedicated vert training.",
    weeks: [
      {
        id: "w5",
        label: "Week 5",
        dateRange: "28 Sep – 4 Oct",
        sessions: [
          { date: "2026-09-28", type: "gymL", label: "Gym – Lower, hip-safe strength B: hip thrust, single-leg RDL, step-up (controlled, no hip drop), Copenhagen plank (short lever)" },
          { date: "2026-09-29", type: "run", label: "Run 50min, tempo (15 easy/20 tempo/15 easy, ~9.5km) — easy @ 5:20/km (HR ≤150bpm), tempo @ ~4:45–4:55/km", targetMin: 50, targetKm: 9.8 },
          { date: "2026-09-30", type: "bike", label: "Rouvy Zone2 60min", targetMin: 60 },
          { date: "2026-10-01", type: "gymU", label: "Gym – Upper + anti-rotation core (Pallof press, dead bug) — pelvis stability, no hip loading" },
          { date: "2026-10-02", type: "stair", label: "Stairmaster 40min steady", targetMin: 40 },
          { date: "2026-10-03", type: "swim", label: "Rest / swim recovery 1km", targetKm: 1 },
          { date: "2026-10-04", type: "long", label: "Long run 2h45, trail, moderate vert (~21km, ~500–600m vert) — effort-based not paced, steady aerobic RPE 4–5/10, hike anything steep, practice race-day fuel (70g carb/hr)", targetMin: 165, targetKm: 21.3 },
        ],
      },
      {
        id: "w6",
        label: "Week 6",
        dateRange: "5–11 Oct",
        sessions: [
          { date: "2026-10-05", type: "rest", label: "Rest" },
          { date: "2026-10-06", type: "gymL", label: "Gym – Lower, hip-safe strength A: trap bar deadlift, glute bridge, single-leg calf raise, banded lateral walk (band below knee, stay neutral)" },
          { date: "2026-10-07", type: "run", label: "Run 60min, fartlek (6x3min surge/2min easy, ~11.5–12km) — surges @ ~4:15–4:30/km, jog @ 5:20–5:30/km (HR ≤150bpm)", targetMin: 60, targetKm: 12 },
          { date: "2026-10-08", type: "bike", label: "Rouvy Zone2 75min", targetMin: 75 },
          { date: "2026-10-09", type: "gymU", label: "Gym – Upper + anti-rotation core (Pallof press, dead bug) — pelvis stability, no hip loading" },
          { date: "2026-10-09", type: "swim", label: "Swim 1km", targetKm: 1 },
          { date: "2026-10-10", type: "stair", label: "Stairmaster 45min, repeats", targetMin: 45 },
          { date: "2026-10-11", type: "long", label: "Long run 3h, trail, vert focus (~22km, ~700–900m vert) — effort-based not paced, hike all sustained climbs, practice descent cadence", targetMin: 180, targetKm: 21.8 },
        ],
      },
      {
        id: "w7",
        label: "Week 7 — cutback",
        dateRange: "12–18 Oct",
        sessions: [
          { date: "2026-10-12", type: "rest", label: "Rest" },
          { date: "2026-10-13", type: "gymL", label: "Gym – Lower, light: glute bridge, calf raise, isometric hip hold — deload, no new stimulus" },
          { date: "2026-10-14", type: "run", label: "Run easy 50min (~9.5km) @ 5:20/km (HR ≤150bpm)", targetMin: 50, targetKm: 9.4 },
          { date: "2026-10-15", type: "bike", label: "Rouvy Zone2 50min", targetMin: 50 },
          { date: "2026-10-16", type: "stair", label: "Stairmaster 25min, easy", targetMin: 25 },
          { date: "2026-10-17", type: "swim", label: "Swim 1.5km recovery", targetKm: 1.5 },
          { date: "2026-10-18", type: "long", label: "Long run 1h45, easy (~19.5km) @ 5:20–5:30/km (HR ≤150bpm)", targetMin: 105, targetKm: 19.7 },
        ],
      },
    ],
  },
  {
    id: "p5",
    name: "Build 2 / Peak",
    range: "19 Oct – 8 Nov",
    note: "Highest-volume block — back-to-back long days to simulate race-day fatigue, peak stairmaster vert.",
    weeks: [
      {
        id: "w8",
        label: "Week 8",
        dateRange: "19–25 Oct",
        sessions: [
          { date: "2026-10-19", type: "gymL", label: "Gym – Lower, hip-safe strength B: hip thrust, single-leg RDL, step-up (controlled, no hip drop), Copenhagen plank (short lever)" },
          { date: "2026-10-20", type: "run", label: "Run 60min, intervals (5x3min @5k effort/2min jog, ~12km) — reps @ ~4:00–4:10/km, jog @ 5:45–5:55/km (HR ≤150bpm)", targetMin: 60, targetKm: 12 },
          { date: "2026-10-21", type: "bike", label: "Rouvy Zone2 75min", targetMin: 75 },
          { date: "2026-10-22", type: "gymU", label: "Gym – Upper + anti-rotation core (Pallof press, dead bug) — pelvis stability, no hip loading" },
          { date: "2026-10-23", type: "stair", label: "Stairmaster 50min, repeats", targetMin: 50 },
          { date: "2026-10-24", type: "long", label: "Long run #1: 2h45, moderate (~30km) @ ~5:25–5:35/km, flat-rolling — slow down for any climbs", targetMin: 165, targetKm: 30 },
          { date: "2026-10-25", type: "long", label: "Long run #2 (back-to-back): 2h easy (~21km) @ ~5:40–5:50/km (HR ≤150bpm) — expect pace to drift slower on tired legs, that's fine", targetMin: 120, targetKm: 20.9 },
        ],
      },
      {
        id: "w9",
        label: "Week 9 — biggest week",
        dateRange: "26 Oct – 1 Nov",
        sessions: [
          { date: "2026-10-26", type: "rest", label: "Rest" },
          { date: "2026-10-27", type: "gymL", label: "Gym – Lower, maintenance: glute bridge, single-leg calf raise, isometric hip hold — keep dose low, big run week" },
          { date: "2026-10-28", type: "run", label: "Run easy 60min (~11.3km) @ 5:20/km (HR ≤150bpm)", targetMin: 60, targetKm: 11.3 },
          { date: "2026-10-29", type: "bike", label: "Rouvy Zone2 100min", targetMin: 100 },
          { date: "2026-10-30", type: "stair", label: "Stairmaster 50–60min, max vert", targetMin: 55 },
          { date: "2026-10-31", type: "long", label: "Long run #1: 3h30–4h, biggest run of the plan (~26–30km, ~800–1000m vert) — effort-based not paced, race-day fuel rehearsal (70g carb/hr), practice descents", targetMin: 225, targetKm: 28 },
          { date: "2026-11-01", type: "long", label: "Long run #2 (back-to-back): 2h30 easy (~25km, HR ≤150bpm) — expect significant pace drift on tired legs, that's the point", targetMin: 150, targetKm: 25 },
        ],
      },
      {
        id: "w10",
        label: "Week 10 — cutback",
        dateRange: "2–8 Nov",
        sessions: [
          { date: "2026-11-02", type: "rest", label: "Rest" },
          { date: "2026-11-03", type: "gymL", label: "Gym – Lower, light: glute bridge, calf raise, isometric hip hold — deload, no new stimulus" },
          { date: "2026-11-04", type: "run", label: "Run easy 50min (~9.5km) @ 5:20/km (HR ≤150bpm)", targetMin: 50, targetKm: 9.4 },
          { date: "2026-11-05", type: "bike", label: "Rouvy Zone2 60min", targetMin: 60 },
          { date: "2026-11-06", type: "gymU", label: "Gym – Upper + anti-rotation core (Pallof press, dead bug) — pelvis stability, no hip loading" },
          { date: "2026-11-06", type: "swim", label: "Swim 1km", targetKm: 1 },
          { date: "2026-11-07", type: "stair", label: "Stairmaster 35min easy", targetMin: 35 },
          { date: "2026-11-08", type: "long", label: "Long run 2h, easy (~21.5km) @ 5:25–5:35/km (HR ≤150bpm)", targetMin: 120, targetKm: 21.8 },
        ],
      },
    ],
  },
  {
    id: "p6",
    name: "Taper",
    range: "9–22 Nov",
    note: "Shed fatigue, keep the legs remembering climbing/descending — don't add anything new.",
    weeks: [
      {
        id: "w11",
        label: "Week 11",
        dateRange: "9–15 Nov",
        sessions: [
          { date: "2026-11-09", type: "rest", label: "Rest" },
          { date: "2026-11-10", type: "gymL", label: "Gym – Lower, light maintenance: isometric hip hold, calf raise only — taper, keep the hip ticking over" },
          { date: "2026-11-11", type: "run", label: "Run easy 50min (~9.5km) @ 5:20/km (HR ≤150bpm)", targetMin: 50, targetKm: 9.4 },
          { date: "2026-11-12", type: "bike", label: "Rouvy Zone2 60min", targetMin: 60 },
          { date: "2026-11-13", type: "stair", label: "Stairmaster 25min, easy", targetMin: 25 },
          { date: "2026-11-14", type: "long", label: "Long run 2h, easy, some vert (~18.5km, ~200–300m vert) @ conversational effort (HR ≤150bpm)", targetMin: 120, targetKm: 18.5 },
          { date: "2026-11-15", type: "swim", label: "Swim 1km recovery", targetKm: 1 },
        ],
      },
      {
        id: "w12",
        label: "Week 12",
        dateRange: "16–22 Nov",
        sessions: [
          { date: "2026-11-16", type: "rest", label: "Rest" },
          { date: "2026-11-17", type: "run", label: "Run easy 40min (~7.5km) @ 5:20/km (HR ≤150bpm) + strides", targetMin: 40, targetKm: 7.5 },
          { date: "2026-11-18", type: "bike", label: "Rouvy Zone2 45min, easy", targetMin: 45 },
          { date: "2026-11-19", type: "gymL", label: "Gym – light activation: glute bridge, calf raise — no new stimulus this close to race" },
          { date: "2026-11-20", type: "stair", label: "Stairmaster 15min, very easy", targetMin: 15 },
          { date: "2026-11-21", type: "run", label: "Run 1h15, easy, some vert (~12km, ~150–200m vert) @ conversational effort (HR ≤150bpm)", targetMin: 75, targetKm: 12 },
          { date: "2026-11-22", type: "rest", label: "Rest" },
        ],
      },
    ],
  },
  {
    id: "p7",
    name: "Race Week",
    range: "23–27 Nov",
    note: "Final sharpening. Race day is Friday. Shared sub-15h target with Owen — target moving time ~14:30, splits from a 7:47am start: CP1 16.2km ~10:03am · CP2 40.3km (via Kosci summit) ~1:37pm · CP3 50.1km ~2:55pm · CP4 62.3km ~4:35pm · CP5 74.9km ~5:56pm (top of the big descent) · CP6 82.5km ~6:42pm (valley flat — fastest km of the day) · CP7 93.9km ~8:19pm · WP 104km ~9:55pm · Finish ~10:33pm. That's ~14h46m with aid stops — a buffer of roughly 14min under cutoff. Bank time on the CP4→CP5 descent and the CP5→CP6 flat, not on the two climbs bookending the Kosci summit.",
    weeks: [
      {
        id: "wr",
        label: "Race Week",
        dateRange: "23–27 Nov",
        sessions: [
          { date: "2026-11-23", type: "run", label: "Run easy 30min (~5.5km) @ 5:20/km (HR ≤150bpm)", targetMin: 30, targetKm: 5.6 },
          { date: "2026-11-24", type: "rest", label: "Rest" },
          { date: "2026-11-25", type: "bike", label: "Rouvy Zone2 30min, very easy", targetMin: 30 },
          { date: "2026-11-26", type: "rest", label: "Rest, gear check, early night" },
          { date: "2026-11-27", type: "race", label: "RACE DAY — Kosci100. Running with Owen, sub-15 goal, sub-16 fallback.", targetKm: 100 },
        ],
      },
    ],
  },
];
