import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { handleError, parseBody } from "@/lib/http";

export const slugify = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(50),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
});

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: categories });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const data = await parseBody(request, categorySchema);
    const category = await prisma.category.create({
      data: { name: data.name, slug: data.slug ?? slugify(data.name) },
    });
    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}