import { SessionOptions } from "iron-session";

export interface StravaTokens {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number; // unix seconds
}

export interface SessionData {
  mine?: StravaTokens;
  owen?: StravaTokens;
}

export type Who = "mine" | "owen";

export function parseWho(value: string | null): Who {
  return value === "owen" ? "owen" : "mine";
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "kosci_strava_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
};
