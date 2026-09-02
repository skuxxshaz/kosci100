import { PlanSession } from "./plan";
// Strava sport_type values that count as a match for each session type.
// Stairmaster and Strength (gym) are now trackable since both are logged
// as specific Strava activity types.
const AUTO_DETECT_TYPES: Partial<Record<string, string[]>> = {
  run: ["Run", "TrailRun"],
  long: ["Run", "TrailRun"],
  bike: ["VirtualRide", "Ride"],
  swim: ["Swim"],
  gymL: ["WeightTraining"],
  gymU: ["WeightTraining"],
  stair: ["StairStepper"],
  race: ["Run", "TrailRun"],
};
export interface StravaActivity {
  id: number;
  name: string;
  sport_type: string;
  start_date_local: string; // ISO, e.g. 2026-08-24T16:57:23Z
  distance: number; // metres
  moving_time: number; // seconds
  total_elevation_gain: number; // metres
}
export interface MatchResult {
  detected: boolean;
  autoDetectable: boolean;
  matched?: StravaActivity;
}
export function matchSession(
  session: PlanSession,
  activities: StravaActivity[]
): MatchResult {
  if (session.type === "rest") {
    return { detected: true, autoDetectable: false };
  }
  if (session.type === "other") {
    return { detected: false, autoDetectable: false };
  }
  const sportTypes = AUTO_DETECT_TYPES[session.type];
  if (!sportTypes) return { detected: false, autoDetectable: false };
  const dayActivities = activities.filter(
    (a) =>
      (a.start_date_local || "").slice(0, 10) === session.date &&
      sportTypes.includes(a.sport_type)
  );
  if (dayActivities.length === 0) {
    return { detected: false, autoDetectable: true };
  }
  if (session.targetKm) {
    const totalKm =
      dayActivities.reduce((s, a) => s + (a.distance || 0), 0) / 1000;
    return {
      detected: totalKm >= session.targetKm * 0.75,
      autoDetectable: true,
      matched: dayActivities[0],
    };
  }
  if (session.targetMin) {
    const totalMin =
      dayActivities.reduce((s, a) => s + (a.moving_time || 0), 0) / 60;
    return {
      detected: totalMin >= session.targetMin * 0.75,
      autoDetectable: true,
      matched: dayActivities[0],
    };
  }
  return { detected: true, autoDetectable: true, matched: dayActivities[0] };
}
export interface BonusActivity {
  activity: StravaActivity;
  date: string;
}
export function findBonusActivities(
  sessions: PlanSession[],
  activities: StravaActivity[]
): BonusActivity[] {
  const claimedIds = new Set<number>();
  sessions.forEach((session) => {
    const result = matchSession(session, activities);
    if (result.matched) claimedIds.add(result.matched.id);
  });
  const matchableSportTypes = new Set(
    Object.values(AUTO_DETECT_TYPES).flat()
  );
  return activities
    .filter((a) => !claimedIds.has(a.id) && matchableSportTypes.has(a.sport_type))
    .map((a) => ({ activity: a, date: (a.start_date_local || "").slice(0, 10) }));
}
