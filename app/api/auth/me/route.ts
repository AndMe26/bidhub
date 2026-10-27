import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { handleError, HttpError } from "@/lib/http";

export async function GET() {
  try {
    const session = await requireAuth();
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new HttpError(404, "Usuario no encontrado");
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    return handleError(error);
  }
}
