import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/http";
import { maskName } from "@/lib/mask";
import {
  getAuctionStatus,
  type AuctionStatus,
} from "@/services/auction-status";

const HOUR_MS = 60 * 60 * 1000;
export const MIN_DURATION_MS = HOUR_MS;
export const MAX_DURATION_MS = 7 * 24 * HOUR_MS;
export const MAX_ACTIVE_AUCTIONS = 5;

export const auctionBodySchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2000),
  imageUrl: z.url(),
  initialPrice: z.number().positive().max(1_000_000_000),
  minIncrement: z.number().positive().max(1_000_000_000),
  closesAt: z.iso.datetime({ offset: true }).transform((value) => new Date(value)),
  categoryId: z.string().min(1),
});

export const listInclude = {
  category: true,
  seller: { select: { id: true, name: true } },
  bids: { orderBy: { amount: "desc" }, take: 1 },
  _count: { select: { bids: true } },
} satisfies Prisma.AuctionInclude;

export type AuctionWithMeta = Prisma.AuctionGetPayload<{
  include: typeof listInclude;
}>;

export function statusWhere(
  status: AuctionStatus,
  now: Date
): Prisma.AuctionWhereInput {
  switch (status) {
    case "ACTIVE":
      return { isCancelled: false, closesAt: { gt: now } };
    case "CLOSED":
      return { isCancelled: false, closesAt: { lte: now }, bids: { some: {} } };
    case "DESERTED":
      return { isCancelled: false, closesAt: { lte: now }, bids: { none: {} } };
    case "CANCELLED":
      return { isCancelled: true };
  }
}

export function toAuctionDto(auction: AuctionWithMeta) {
  const top: (typeof auction.bids)[number] | undefined = auction.bids[0];
  const bidsCount = auction._count.bids;
  return {
    id: auction.id,
    title: auction.title,
    description: auction.description,
    imageUrl: auction.imageUrl,
    initialPrice: auction.initialPrice.toNumber(),
    minIncrement: auction.minIncrement.toNumber(),
    currentPrice: top ? top.amount.toNumber() : auction.initialPrice.toNumber(),
    bidsCount,
    createdAt: auction.createdAt,
    closesAt: auction.closesAt,
    cancelReason: auction.cancelReason,
    status: getAuctionStatus(auction, bidsCount),
    category: {
      id: auction.category.id,
      name: auction.category.name,
      slug: auction.category.slug,
    },
    seller: { id: auction.seller.id, name: auction.seller.name },
  };
}

// Regla #2
export function assertValidCloseDate(closesAt: Date, now: Date): void {
  const diff = closesAt.getTime() - now.getTime();
  if (diff < MIN_DURATION_MS || diff > MAX_DURATION_MS) {
    throw new HttpError(
      400,
      "La fecha de cierre debe estar entre 1 hora y 7 días desde ahora"
    );
  }
}

// Regla #3
export async function assertCategoryExists(categoryId: string): Promise<void> {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!category) throw new HttpError(404, "La categoría no existe");
}

// Regla #4
export async function assertSellerBelowLimit(
  sellerId: string,
  now: Date
): Promise<void> {
  const active = await prisma.auction.count({
    where: { sellerId, isCancelled: false, closesAt: { gt: now } },
  });
  if (active >= MAX_ACTIVE_AUCTIONS) {
    throw new HttpError(
      409,
      `Ya tienes ${MAX_ACTIVE_AUCTIONS} subastas activas, el máximo permitido`
    );
  }
}

// Regla #19
export async function getOwnedAuction(id: string, userId: string) {
  const auction = await prisma.auction.findUnique({
    where: { id },
    include: { _count: { select: { bids: true } } },
  });
  if (!auction) throw new HttpError(404, "Subasta no encontrada");
  if (auction.sellerId !== userId) {
    throw new HttpError(403, "No eres el dueño de esta subasta");
  }
  return auction;
}

// Reglas #5 y #14
export function assertEditable(
  auction: { isCancelled: boolean; closesAt: Date; _count: { bids: number } },
  action: "editar" | "cancelar"
): void {
  const status = getAuctionStatus(auction, auction._count.bids);
  if (status !== "ACTIVE" || auction._count.bids > 0) {
    throw new HttpError(
      409,
      `Solo se puede ${action} una subasta activa y sin ofertas`
    );
  }
}

export async function findAuctionDto(id: string) {
  const auction = await prisma.auction.findUnique({
    where: { id },
    include: listInclude,
  });
  if (!auction) throw new HttpError(404, "Subasta no encontrada");
  return toAuctionDto(auction);
}

export { maskName };