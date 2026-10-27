import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { handleError, HttpError, parseBody } from "@/lib/http";
import { getAuctionStatus } from "@/services/auction-status";
import { maskName } from "@/lib/mask";
import { z } from "zod";

interface Params {
  params: Promise<{ id: string }>;
}

const bidSchema = z.object({
  amount: z.number().positive().max(1_000_000_000),
});

const FIVE_MINUTES_MS = 5 * 60 * 1000;

// POST /api/auctions/[id]/bids - Crear oferta atómica con transacción Prisma
export async function POST(request: Request, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id: auctionId } = await params;
    const data = await parseBody(request, bidSchema);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Obtener la subasta con bloqueo o lectura fresca
      const auction = await tx.auction.findUnique({
        where: { id: auctionId },
        include: {
          bids: {
            orderBy: { amount: "desc" },
            take: 1,
          },
          _count: {
            select: { bids: true },
          },
        },
      });

      if (!auction) {
        throw new HttpError(404, "Subasta no encontrada");
      }

      const now = new Date();
      const status = getAuctionStatus(auction, auction._count.bids, now);

      // Regla #7: Solo se puede ofertar en una subasta activa
      if (status !== "ACTIVE") {
        throw new HttpError(409, "La subasta no está activa para recibir ofertas");
      }

      // Regla #6: Un usuario no puede ofertar en su propia subasta
      if (auction.sellerId === session.sub) {
        throw new HttpError(403, "No puedes ofertar en tu propia subasta");
      }

      const topBid = auction.bids[0];
      const initialPrice = auction.initialPrice.toNumber();
      const minIncrement = auction.minIncrement.toNumber();

      // Regla #9: Un usuario que ya tiene la oferta más alta no puede volver a ofertar
      if (topBid && topBid.bidderId === session.sub) {
        throw new HttpError(409, "Ya tienes la oferta más alta actual");
      }

      // Regla #8: Monto mínimo de oferta
      if (!topBid) {
        if (data.amount < initialPrice) {
          throw new HttpError(
            400,
            `La primera oferta debe ser mayor o igual al precio inicial ($${initialPrice})`
          );
        }
      } else {
        const minRequired = topBid.amount.toNumber() + minIncrement;
        if (data.amount < minRequired) {
          throw new HttpError(
            400,
            `La oferta debe ser al menos de $${minRequired} (oferta actual + incremento mínimo)`
          );
        }
      }

      // Regla #11: Anti-sniping: Si faltan <= 5 min para el cierre, extender +5 minutos
      const timeLeft = auction.closesAt.getTime() - now.getTime();
      let newClosesAt = auction.closesAt;

      if (timeLeft <= FIVE_MINUTES_MS) {
        newClosesAt = new Date(auction.closesAt.getTime() + FIVE_MINUTES_MS);
        await tx.auction.update({
          where: { id: auction.id },
          data: { closesAt: newClosesAt },
        });
      }

      // Crear oferta (Regla #10: no hay endpoints de edición ni borrado)
      const bid = await tx.bid.create({
        data: {
          amount: data.amount,
          auctionId: auction.id,
          bidderId: session.sub,
        },
        include: {
          bidder: {
            select: { id: true, name: true },
          },
        },
      });

      return {
        bid: {
          id: bid.id,
          amount: bid.amount.toNumber(),
          createdAt: bid.createdAt,
          bidder: {
            id: bid.bidder.id,
            name: bid.bidder.name,
          },
        },
        extendedClosesAt: newClosesAt,
      };
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

// GET /api/auctions/[id]/bids - Historial público enmascarado (Regla #18)
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id: auctionId } = await params;

    const bids = await prisma.bid.findMany({
      where: { auctionId },
      orderBy: { createdAt: "desc" },
      include: {
        bidder: {
          select: { name: true },
        },
      },
    });

    const masked = bids.map((b) => ({
      id: b.id,
      amount: b.amount.toNumber(),
      createdAt: b.createdAt,
      bidder: {
        alias: maskName(b.bidder.name),
      },
    }));

    return NextResponse.json({ data: masked });
  } catch (error) {
    return handleError(error);
  }
}
