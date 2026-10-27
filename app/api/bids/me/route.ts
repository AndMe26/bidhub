import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { handleError } from "@/lib/http";
import { getAuctionStatus } from "@/services/auction-status";

// Regla #20: Un usuario solo puede ver el listado completo de sus propias ofertas
export async function GET() {
  try {
    const session = await requireAuth();

    const bids = await prisma.bid.findMany({
      where: { bidderId: session.sub },
      orderBy: { createdAt: "desc" },
      include: {
        auction: {
          include: {
            category: true,
            bids: {
              orderBy: { amount: "desc" },
              take: 1,
            },
            _count: {
              select: { bids: true },
            },
          },
        },
      },
    });

    const now = new Date();

    const dtos = bids.map((b) => {
      const auction = b.auction;
      const topBid = auction.bids[0];
      const status = getAuctionStatus(auction, auction._count.bids, now);
      const isWinning = topBid ? topBid.bidderId === session.sub : false;

      return {
        id: b.id,
        amount: b.amount.toNumber(),
        createdAt: b.createdAt,
        auction: {
          id: auction.id,
          title: auction.title,
          imageUrl: auction.imageUrl,
          initialPrice: auction.initialPrice.toNumber(),
          currentPrice: topBid ? topBid.amount.toNumber() : auction.initialPrice.toNumber(),
          closesAt: auction.closesAt,
          status,
          isWinning,
          isWinner: status === "CLOSED" && isWinning,
          category: {
            id: auction.category.id,
            name: auction.category.name,
          },
        },
      };
    });

    return NextResponse.json({ data: dtos });
  } catch (error) {
    return handleError(error);
  }
}
