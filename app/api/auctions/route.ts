import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { handleError, parseBody } from "@/lib/http";
import {
  auctionBodySchema,
  assertValidCloseDate,
  assertCategoryExists,
  assertSellerBelowLimit,
  listInclude,
  toAuctionDto,
  statusWhere,
} from "@/services/auction-service";
import { type AuctionStatus } from "@/services/auction-status";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId") ?? undefined;
    const status = searchParams.get("status") as AuctionStatus | null;
    const now = new Date();

    const where: any = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (status) {
      const statusCondition = statusWhere(status, now);
      Object.assign(where, statusCondition);
    }

    const auctions = await prisma.auction.findMany({
      where,
      include: listInclude,
      orderBy: { createdAt: "desc" },
    });

    const dtos = auctions.map(toAuctionDto);
    return NextResponse.json({ data: dtos });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const data = await parseBody(request, auctionBodySchema);
    const now = new Date();

    // Regla #2: La fecha de cierre debe estar entre 1 hora y 7 días desde ahora
    assertValidCloseDate(data.closesAt, now);

    // Regla #3: Cada subasta pertenece a una categoría existente
    await assertCategoryExists(data.categoryId);

    // Regla #4: Máximo 5 subastas activas simultáneas por vendedor
    await assertSellerBelowLimit(session.sub, now);

    const created = await prisma.auction.create({
      data: {
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        initialPrice: data.initialPrice,
        minIncrement: data.minIncrement,
        closesAt: data.closesAt,
        categoryId: data.categoryId,
        sellerId: session.sub,
      },
      include: listInclude,
    });

    return NextResponse.json({ data: toAuctionDto(created) }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
