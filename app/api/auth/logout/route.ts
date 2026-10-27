import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/http";
import { REFRESH_COOKIE, ACCESS_COOKIE, verifyRefreshToken, verifyAccessToken } from "@/lib/jwt";
import { clearAuthCookies } from "@/lib/cookies";

export async function POST() {
  try {
    const store = await cookies();
    const refreshToken = store.get(REFRESH_COOKIE)?.value;
    const accessToken = store.get(ACCESS_COOKIE)?.value;

    let userId: string | null = null;

    if (refreshToken) {
      const payload = await verifyRefreshToken(refreshToken);
      if (payload) userId = payload.sub;
    }

    if (!userId && accessToken) {
      const payload = await verifyAccessToken(accessToken);
      if (payload) userId = payload.sub;
    }

    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { refreshTokenHash: null },
      });
    }

    await clearAuthCookies();

    return NextResponse.json({
      data: { message: "Sesión cerrada correctamente" },
    });
  } catch (error) {
    return handleError(error);
  }
}
