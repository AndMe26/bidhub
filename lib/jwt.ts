import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "node:crypto";

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";

export type Role = "USER" | "ADMIN";

export interface SessionPayload {
  sub: string;
  role: Role;
}

type SecretName = "JWT_ACCESS_SECRET" | "JWT_REFRESH_SECRET";

function getSecret(name: SecretName): Uint8Array {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return new TextEncoder().encode(value);
}

async function sign(
  payload: SessionPayload,
  secretName: SecretName,
  expiresIn: string
): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret(secretName));
}

async function verify(
  token: string,
  secretName: SecretName
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(secretName), {
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string") return null;
    if (payload.role !== "USER" && payload.role !== "ADMIN") return null;
    return { sub: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

export function signAccessToken(payload: SessionPayload): Promise<string> {
  return sign(
    payload,
    "JWT_ACCESS_SECRET",
    process.env.ACCESS_TOKEN_EXPIRES_IN ?? "15m"
  );
}

export function signRefreshToken(payload: SessionPayload): Promise<string> {
  return sign(
    payload,
    "JWT_REFRESH_SECRET",
    process.env.REFRESH_TOKEN_EXPIRES_IN ?? "7d"
  );
}

export function verifyAccessToken(token: string): Promise<SessionPayload | null> {
  return verify(token, "JWT_ACCESS_SECRET");
}

export function verifyRefreshToken(token: string): Promise<SessionPayload | null> {
  return verify(token, "JWT_REFRESH_SECRET");
}