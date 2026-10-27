import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { handleError, HttpError, parseBody } from "@/lib/http";
import { categorySchema, slugify } from "../route";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const data = await parseBody(request, categorySchema);

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpError(404, "Categoría no encontrada");
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug ?? slugify(data.name),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleError(error);
  }
}

// Regla #17: Una categoría con subastas asociadas no se puede eliminar (409 Conflict)
export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { auctions: true },
        },
      },
    });

    if (!existing) {
      throw new HttpError(404, "Categoría no encontrada");
    }

    if (existing._count.auctions > 0) {
      throw new HttpError(
        409,
        "No se puede eliminar la categoría porque tiene subastas asociadas"
      );
    }

    await prisma.category.delete({ where: { id } });

    return NextResponse.json({
      data: { message: "Categoría eliminada exitosamente" },
    });
  } catch (error) {
    return handleError(error);
  }
}
