import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { handleError } from "@/lib/http";
import { listInclude, toAuctionDto } from "@/services/auction-service";

export async function GET() {
  try {
    const session = await requireAuth();

    const auctions = await prisma.auction.findMany({
      where: { sellerId: session.sub },
      include: listInclude,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: auctions.map(toAuctionDto) });
  } catch (error) {
    return handleError(error);
  }
}
