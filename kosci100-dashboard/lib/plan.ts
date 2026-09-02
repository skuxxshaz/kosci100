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
  targetMin?: number; // used for non-run sessions (bike, stair, gym)
}

export interface PlanWeek {
  id: string;
  label: string;
  dateRange: string;
  weeklyKmGoal?: number; // total running km target for the week (run + long)
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

// Gym session content — shown inline under gymL/gymU rows since tooltips
// don't render reliably on mobile.
export const GYM_SESSIONS: Record<"gymL" | "gymU", string[]> = {
  gymL: [
    "Trap bar deadlift — 4×6",
    "Bulgarian split squat — 3×8/leg",
    "Standing cable/banded hip abduction — 3×12/side",
    "Weighted step-down, slow 3-count lower — 3×8/leg",
    "Single-leg calf raise — 3×15/leg",
    "Copenhagen plank — 3×20sec/side",
    "Nordic curl (or slider hamstring curl) — 3×6",
  ],
  gymU: [
    "Weighted pull-up or lat pulldown — 4×6",
    "DB shoulder press — 3×8",
    "Single-arm row — 3×10/side",
    "Face pull — 3×15",
    "Pallof press — 3×10/side",
    "Farmer's carry — 3×40m",
    "Plank + shoulder tap — 3×30sec",
  ],
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
        weeklyKmGoal: 60.2,
        sessions: [
          { date: "2026-08-24", type: "run", label: "Easy run", targetKm: 5 },
          { date: "2026-08-25", type: "bike", label: "Rouvy Zone2 bike", targetMin: 60 },
          { date: "2026-08-26", type: "run", label: "Fartlek run", targetKm: 8 },
          { date: "2026-08-27", type: "rest", label: "Rest" },
          { date: "2026-08-28", type: "rest", label: "Rest" },
          { date: "2026-08-29", type: "run", label: "Easy run", targetKm: 5 },
          { date: "2026-08-30", type: "race", label: "Sydney Marathon — race day", targetKm: 42.2 },
        ],
      },
      {
        id: "w2",
        label: "Week 2 — post-marathon recovery",
        dateRange: "31 Aug – 6 Sep",
        weeklyKmGoal: 18,
        sessions: [
          { date: "2026-08-31", type: "rest", label: "Rest, legs will be trashed — this is normal" },
          { date: "2026-09-01", type: "rest", label: "Rest, or gentle walk/swim" },
          { date: "2026-09-02", type: "run", label: "Very easy run, only if legs feel ready", targetKm: 4 },
          { date: "2026-09-03", type: "swim", label: "Easy recovery swim", targetKm: 1 },
          { date: "2026-09-04", type: "run", label: "Easy run", targetKm: 5 },
          { date: "2026-09-05", type: "bike", label: "Rouvy Zone2, easy", targetMin: 45 },
          { date: "2026-09-06", type: "run", label: "Easy run", targetKm: 9 },
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
        weeklyKmGoal: 43,
        sessions: [
          { date: "2026-09-07", type: "gymL", label: "Gym – Lower", targetMin: 60 },
          { date: "2026-09-07", type: "run", label: "Easy run", targetKm: 7 },
          { date: "2026-09-08", type: "bike", label: "Rouvy Zone2", targetMin: 75 },
          { date: "2026-09-08", type: "stair", label: "Stairmaster", targetMin: 30 },
          { date: "2026-09-09", type: "run", label: "Tempo run", targetKm: 12 },
          { date: "2026-09-10", type: "gymU", label: "Gym – Upper", targetMin: 60 },
          { date: "2026-09-10", type: "swim", label: "Swim", targetKm: 1 },
          { date: "2026-09-11", type: "stair", label: "Stairmaster", targetMin: 30 },
          { date: "2026-09-11", type: "run", label: "Easy shakeout run", targetKm: 7 },
          { date: "2026-09-12", type: "long", label: "Long run, moderate + pack/travel prep", targetKm: 17 },
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
        weeklyKmGoal: 32,
        sessions: [
          { date: "2026-09-15", type: "run", label: "Morning run", targetKm: 10 },
          { date: "2026-09-16", type: "long", label: "Jack's Point Track run" },
          { date: "2026-09-19", type: "long", label: "Roys Peak Track — key long/vert session of the block" },
        ],
      },
    ],
  },
  {
    id: "p3",
    name: "Rebuild",
    range: "21–27 Sep",
    note: "Close out the trip with the last trail run and travel home, then absorb the big vert block before loading again.",
    weeks: [
      {
        id: "w4",
        label: "Week 4",
        dateRange: "21–27 Sep",
        weeklyKmGoal: 30,
        sessions: [
          { date: "2026-09-21", type: "long", label: "Lowe Shotover / Kimi Ākau Trail run" },
          { date: "2026-09-22", type: "run", label: "Optional easy shakeout run, then depart", targetKm: 5 },
          { date: "2026-09-23", type: "rest", label: "Rest / travel recovery" },
          { date: "2026-09-24", type: "run", label: "Easy run, flat, very easy", targetKm: 8 },
          { date: "2026-09-25", type: "bike", label: "Rouvy Zone2", targetMin: 65 },
          { date: "2026-09-26", type: "gymL", label: "Gym – full body, light", targetMin: 30 },
          { date: "2026-09-27", type: "long", label: "Long run, easy", targetKm: 17 },
        ],
      },
    ],
  },
  {
    id: "p4",
    name: "Build 1",
    range: "28 Sep – 18 Oct",
    note: "Rebuild volume, extend the long run, bring stairmaster back as dedicated vert training. The 60km/week marathon base means volume can climb faster than a from-scratch base phase would allow — pushed further still to hit a ~300km October.",
    weeks: [
      {
        id: "w5",
        label: "Week 5",
        dateRange: "28 Sep – 4 Oct",
        weeklyKmGoal: 61.5,
        sessions: [
          { date: "2026-09-28", type: "gymL", label: "Gym – Lower", targetMin: 60 },
          { date: "2026-09-29", type: "run", label: "Tempo run (2.5km easy / 4.5km tempo / 2.5km easy)", targetKm: 9.5 },
          { date: "2026-09-30", type: "bike", label: "Rouvy Zone2", targetMin: 75 },
          { date: "2026-10-01", type: "gymU", label: "Gym – Upper", targetMin: 60 },
          { date: "2026-10-01", type: "run", label: "Easy run", targetKm: 8 },
          { date: "2026-10-02", type: "stair", label: "Stairmaster, steady", targetMin: 40 },
          { date: "2026-10-02", type: "run", label: "Easy run", targetKm: 8 },
          { date: "2026-10-03", type: "swim", label: "Recovery swim", targetKm: 1 },
          { date: "2026-10-04", type: "long", label: "Long trail run, moderate vert", targetKm: 36 },
        ],
      },
      {
        id: "w6",
        label: "Week 6",
        dateRange: "5–11 Oct",
        weeklyKmGoal: 68,
        sessions: [
          { date: "2026-10-05", type: "rest", label: "Rest" },
          { date: "2026-10-06", type: "gymL", label: "Gym – Lower", targetMin: 60 },
          { date: "2026-10-07", type: "run", label: "Easy run", targetKm: 13 },
          { date: "2026-10-08", type: "bike", label: "Rouvy Zone2", targetMin: 90 },
          { date: "2026-10-08", type: "run", label: "Easy run", targetKm: 9 },
          { date: "2026-10-09", type: "gymU", label: "Gym – Upper", targetMin: 60 },
          { date: "2026-10-09", type: "swim", label: "Swim", targetKm: 1 },
          { date: "2026-10-10", type: "stair", label: "Stairmaster, repeats", targetMin: 45 },
          { date: "2026-10-10", type: "run", label: "Short easy run", targetKm: 6 },
          { date: "2026-10-11", type: "long", label: "Long trail run, vert focus — peak of this build block", targetKm: 40 },
        ],
      },
      {
        id: "w7",
        label: "Week 7 — cutback",
        dateRange: "12–18 Oct",
        weeklyKmGoal: 48,
        sessions: [
          { date: "2026-10-12", type: "rest", label: "Rest" },
          { date: "2026-10-13", type: "gymL", label: "Gym – Lower, light", targetMin: 30 },
          { date: "2026-10-14", type: "run", label: "Easy run", targetKm: 11 },
          { date: "2026-10-15", type: "bike", label: "Rouvy Zone2", targetMin: 65 },
          { date: "2026-10-15", type: "run", label: "Easy run", targetKm: 7 },
          { date: "2026-10-16", type: "stair", label: "Stairmaster, easy", targetMin: 25 },
          { date: "2026-10-16", type: "gymU", label: "Gym – Upper, light accessory", targetMin: 30 },
          { date: "2026-10-17", type: "swim", label: "Recovery swim", targetKm: 1.5 },
          { date: "2026-10-18", type: "long", label: "Long run, easy — absorb the load", targetKm: 30 },
        ],
      },
    ],
  },
  {
    id: "p5",
    name: "Build 2 / Peak",
    range: "19 Oct – 8 Nov",
    note: "Highest-volume block — back-to-back long days to simulate race-day fatigue, peak stairmaster vert. The Bondi to Manly Ultra Relay (24 Oct) slots in as this week's key long effort, and week 9 carries a marathon-distance day for fun before the taper.",
    weeks: [
      {
        id: "w8",
        label: "Week 8 — relay week",
        dateRange: "19–25 Oct",
        weeklyKmGoal: 65,
        sessions: [
          { date: "2026-10-19", type: "gymL", label: "Gym – Lower", targetMin: 60 },
          { date: "2026-10-20", type: "run", label: "Easy run", targetKm: 13 },
          { date: "2026-10-21", type: "bike", label: "Rouvy Zone2", targetMin: 90 },
          { date: "2026-10-21", type: "run", label: "Easy run", targetKm: 10 },
          { date: "2026-10-22", type: "gymU", label: "Gym – Upper", targetMin: 60 },
          { date: "2026-10-23", type: "stair", label: "Stairmaster, repeats", targetMin: 50 },
          { date: "2026-10-23", type: "run", label: "Short easy run", targetKm: 6 },
          { date: "2026-10-24", type: "race", label: "Bondi to Manly Ultra Relay — your 20km leg", targetKm: 20 },
          { date: "2026-10-25", type: "long", label: "Recovery long run (back-to-back), tired legs from the relay", targetKm: 16 },
        ],
      },
      {
        id: "w9",
        label: "Week 9 — marathon-distance day",
        dateRange: "26 Oct – 1 Nov",
        weeklyKmGoal: 81.2,
        sessions: [
          { date: "2026-10-26", type: "rest", label: "Rest" },
          { date: "2026-10-27", type: "gymL", label: "Gym – Lower", targetMin: 60 },
          { date: "2026-10-28", type: "run", label: "Easy run", targetKm: 14 },
          { date: "2026-10-29", type: "bike", label: "Rouvy Zone2", targetMin: 115 },
          { date: "2026-10-29", type: "run", label: "Easy run", targetKm: 11 },
          { date: "2026-10-30", type: "stair", label: "Stairmaster, max vert this cycle", targetMin: 55 },
          { date: "2026-10-30", type: "gymU", label: "Gym – Upper, light accessory", targetMin: 30 },
          { date: "2026-10-31", type: "long", label: "Marathon-distance trail run — the milestone day, full race kit + poles, strong-but-controlled effort", targetKm: 42.2 },
          { date: "2026-11-01", type: "long", label: "Easy recovery run (back-to-back), tired legs from the marathon day", targetKm: 14 },
        ],
      },
      {
        id: "w10",
        label: "Week 10 — cutback",
        dateRange: "2–8 Nov",
        weeklyKmGoal: 33,
        sessions: [
          { date: "2026-11-02", type: "rest", label: "Rest" },
          { date: "2026-11-03", type: "gymL", label: "Gym – Lower, light", targetMin: 30 },
          { date: "2026-11-04", type: "run", label: "Easy run", targetKm: 9 },
          { date: "2026-11-05", type: "bike", label: "Rouvy Zone2", targetMin: 75 },
          { date: "2026-11-06", type: "gymU", label: "Gym – Upper", targetMin: 60 },
          { date: "2026-11-06", type: "swim", label: "Swim", targetKm: 1 },
          { date: "2026-11-07", type: "stair", label: "Stairmaster, easy", targetMin: 35 },
          { date: "2026-11-07", type: "run", label: "Short easy run", targetKm: 4 },
          { date: "2026-11-08", type: "long", label: "Long run, easy", targetKm: 20 },
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
        weeklyKmGoal: 29,
        sessions: [
          { date: "2026-11-09", type: "rest", label: "Rest" },
          { date: "2026-11-10", type: "gymL", label: "Gym – Lower, light, low volume", targetMin: 25 },
          { date: "2026-11-11", type: "run", label: "Easy run", targetKm: 9 },
          { date: "2026-11-12", type: "bike", label: "Rouvy Zone2", targetMin: 60 },
          { date: "2026-11-13", type: "stair", label: "Stairmaster, easy", targetMin: 25 },
          { date: "2026-11-13", type: "gymU", label: "Gym – Upper, light accessory", targetMin: 30 },
          { date: "2026-11-14", type: "long", label: "Long run, easy, some vert", targetKm: 20 },
          { date: "2026-11-15", type: "swim", label: "Recovery swim", targetKm: 1 },
        ],
      },
      {
        id: "w12",
        label: "Week 12",
        dateRange: "16–22 Nov",
        weeklyKmGoal: 23,
        sessions: [
          { date: "2026-11-16", type: "rest", label: "Rest" },
          { date: "2026-11-17", type: "run", label: "Easy run + strides", targetKm: 7 },
          { date: "2026-11-18", type: "bike", label: "Rouvy Zone2, easy", targetMin: 45 },
          { date: "2026-11-19", type: "gymL", label: "Gym – light full body activation", targetMin: 25 },
          { date: "2026-11-20", type: "stair", label: "Stairmaster, very easy", targetMin: 15 },
          { date: "2026-11-20", type: "run", label: "Short easy run", targetKm: 3 },
          { date: "2026-11-21", type: "run", label: "Easy run, some vert", targetKm: 13 },
          { date: "2026-11-22", type: "rest", label: "Rest" },
        ],
      },
    ],
  },
  {
    id: "p7",
    name: "Race Week",
    range: "23–27 Nov",
    note: "Final sharpening. Race day is Friday.",
    weeks: [
      {
        id: "wr",
        label: "Race Week",
        dateRange: "23–27 Nov",
        weeklyKmGoal: 105,
        sessions: [
          { date: "2026-11-23", type: "run", label: "Easy run", targetKm: 5 },
          { date: "2026-11-24", type: "rest", label: "Rest" },
          { date: "2026-11-25", type: "bike", label: "Rouvy Zone2, very easy", targetMin: 30 },
          { date: "2026-11-26", type: "rest", label: "Rest, gear check, early night" },
          { date: "2026-11-27", type: "race", label: "RACE DAY — Kosci100", targetKm: 100 },
        ],
      },
    ],
  },
];
