import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { handleError, HttpError, parseBody } from "@/lib/http";
import {
  auctionBodySchema,
  assertValidCloseDate,
  assertCategoryExists,
  getOwnedAuction,
  assertEditable,
  listInclude,
  toAuctionDto,
  maskName,
} from "@/services/auction-service";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/auctions/[id] - Detalle de subasta con historial enmascarado (Regla #18)
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;

    const auction = await prisma.auction.findUnique({
      where: { id },
      include: {
        ...listInclude,
        bids: {
          orderBy: { createdAt: "desc" },
          include: {
            bidder: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!auction) {
      throw new HttpError(404, "Subasta no encontrada");
    }

    const dto = toAuctionDto(auction);

    // Regla #18: Enmascarar postores en el historial público
    const maskedBids = auction.bids.map((b) => ({
      id: b.id,
      amount: b.amount.toNumber(),
      createdAt: b.createdAt,
      bidder: {
        alias: maskName(b.bidder.name),
      },
    }));

    return NextResponse.json({
      data: {
        ...dto,
        bidsHistory: maskedBids,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

// PUT /api/auctions/[id] - Editar subasta (Reglas #5 y #19)
export async function PUT(request: Request, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const data = await parseBody(request, auctionBodySchema);
    const now = new Date();

    // Regla #19: Solo el dueño puede editar su subasta
    const owned = await getOwnedAuction(id, session.sub);

    // Regla #5: Solo mientras esté activa y no tenga ofertas
    assertEditable(owned, "editar");

    // Regla #2 y #3
    assertValidCloseDate(data.closesAt, now);
    await assertCategoryExists(data.categoryId);

    const updated = await prisma.auction.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        initialPrice: data.initialPrice,
        minIncrement: data.minIncrement,
        closesAt: data.closesAt,
        categoryId: data.categoryId,
      },
      include: listInclude,
    });

    return NextResponse.json({ data: toAuctionDto(updated) });
  } catch (error) {
    return handleError(error);
  }
}
