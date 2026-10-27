import { cookies } from "next/headers";
import {
  ACCESS_COOKIE,
  verifyAccessToken,
  type SessionPayload,
} from "@/lib/jwt";
import { HttpError } from "@/lib/http";

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  return token ? verifyAccessToken(token) : null;
}

export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new HttpError(401, "No autenticado");
  return session;
}

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireAuth();
  if (session.role !== "ADMIN") {
    throw new HttpError(403, "Acceso restringido a administradores");
  }
  return session;
}