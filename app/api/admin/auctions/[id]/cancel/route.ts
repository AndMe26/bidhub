import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { handleError, parseBody } from "@/lib/http";
import { toAuctionDto, listInclude } from "@/services/auction-service";
import { z } from "zod";

interface Params {
  params: Promise<{ id: string }>;
}

const cancelSchema = z.object({
  reason: z.string().trim().min(3, "El motivo de cancelación es obligatorio").max(500),
});

// Reglas #15 y #16: El administrador puede cancelar cualquier subasta activa (incluso con ofertas) con motivo obligatorio. No se elimina.
export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await parseBody(request, cancelSchema);

    const auction = await prisma.auction.findUnique({
      where: { id },
      include: listInclude,
    });

    if (!auction) {
      return NextResponse.json(
        { error: { message: "Subasta no encontrada" } },
        { status: 404 }
      );
    }

    const cancelled = await prisma.auction.update({
      where: { id },
      data: {
        isCancelled: true,
        cancelReason: body.reason,
      },
      include: listInclude,
    });

    return NextResponse.json({ data: toAuctionDto(cancelled) });
  } catch (error) {
    return handleError(error);
  }
}
