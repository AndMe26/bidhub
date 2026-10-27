import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { handleError, parseBody } from "@/lib/http";
import { getOwnedAuction, assertEditable, toAuctionDto, listInclude } from "@/services/auction-service";
import { z } from "zod";

interface Params {
  params: Promise<{ id: string }>;
}

const cancelSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

// Reglas #14, #16 y #19: El vendedor puede cancelar si no tiene ofertas, la subasta se conserva cancelada
export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await parseBody(request, cancelSchema).catch(() => ({ reason: undefined }));

    const owned = await getOwnedAuction(id, session.sub);
    assertEditable(owned, "cancelar");

    const cancelled = await prisma.auction.update({
      where: { id },
      data: {
        isCancelled: true,
        cancelReason: body.reason ?? "Cancelada por el vendedor",
      },
      include: listInclude,
    });

    return NextResponse.json({ data: toAuctionDto(cancelled) });
  } catch (error) {
    return handleError(error);
  }
}
