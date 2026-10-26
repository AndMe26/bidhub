import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, HttpError, parseBody } from "@/lib/http";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8).max(72),
});

export async function POST(request: Request) {
  try {
    const data = await parseBody(request, registerSchema);

    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) throw new HttpError(409, "El correo ya está registrado");

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: await bcrypt.hash(data.password, 10),
        role: "USER",
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}