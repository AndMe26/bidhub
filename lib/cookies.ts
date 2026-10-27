import { cookies } from "next/headers";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/jwt";

function toSeconds(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) throw new Error(`Duración inválida: ${value}`);
  const units = { s: 1, m: 60, h: 3600, d: 86400 } as const;
  return Number(match[1]) * units[match[2] as keyof typeof units];
}

const baseOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function setAccessCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_COOKIE, token, {
    ...baseOptions,
    maxAge: toSeconds(process.env.ACCESS_TOKEN_EXPIRES_IN ?? "15m"),
  });
}

export async function setRefreshCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(REFRESH_COOKIE, token, {
    ...baseOptions,
    maxAge: toSeconds(process.env.REFRESH_TOKEN_EXPIRES_IN ?? "7d"),
  });
}

export async function clearAuthCookies(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}