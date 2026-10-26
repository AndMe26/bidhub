import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, HttpError, parseBody } from "@/lib/http";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";
import { hashToken } from "@/lib/token-hash";
import { setAccessCookie, setRefreshCookie } from "@/lib/cookies";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const data = await parseBody(request, loginSchema);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    const valid =
      user !== null && (await bcrypt.compare(data.password, user.passwordHash));
    if (!user || !valid) throw new HttpError(401, "Credenciales inválidas");

    const session = { sub: user.id, role: user.role };
    const accessToken = await signAccessToken(session);
    const refreshToken = await signRefreshToken(session);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: hashToken(refreshToken) },
    });

    await setAccessCookie(accessToken);
    await setRefreshCookie(refreshToken);

    return NextResponse.json({
      data: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    return handleError(error);
  }
}