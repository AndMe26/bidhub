import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { handleError, HttpError } from "@/lib/http";
import {
  REFRESH_COOKIE,
  verifyRefreshToken,
  signAccessToken,
} from "@/lib/jwt";
import { tokenMatchesHash } from "@/lib/token-hash";
import { setAccessCookie } from "@/lib/cookies";

export async function POST() {
  try {
    const store = await cookies();
    const token = store.get(REFRESH_COOKIE)?.value;

    if (!token) {
      throw new HttpError(401, "Refresh token no proporcionado");
    }

    const payload = await verifyRefreshToken(token);
    if (!payload) {
      throw new HttpError(401, "Refresh token inválido o expirado");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, refreshTokenHash: true },
    });

    if (!user || !user.refreshTokenHash) {
      throw new HttpError(401, "Sesión revocada o inexistente");
    }

    const matches = tokenMatchesHash(token, user.refreshTokenHash);
    if (!matches) {
      throw new HttpError(401, "Refresh token no coincide");
    }

    const newAccessToken = await signAccessToken({
      sub: user.id,
      role: user.role,
    });

    await setAccessCookie(newAccessToken);

    return NextResponse.json({
      data: { message: "Access token renovado exitosamente" },
    });
  } catch (error) {
    return handleError(error);
  }
}
