export type AuctionStatus = "ACTIVE" | "CLOSED" | "DESERTED" | "CANCELLED";

export interface AuctionLike {
  isCancelled: boolean;
  closesAt: Date;
}

/**
 * Reglas #12 y #13:
 * El estado se calcula dinámicamente en tiempo de ejecución sin cron jobs:
 * - isCancelled === true -> CANCELLED
 * - closesAt > now -> ACTIVE
 * - closesAt <= now && bidsCount > 0 -> CLOSED
 * - closesAt <= now && bidsCount === 0 -> DESERTED
 */
export function getAuctionStatus(
  auction: AuctionLike,
  bidsCount: number,
  now: Date = new Date()
): AuctionStatus {
  if (auction.isCancelled) {
    return "CANCELLED";
  }

  const closesAtTime = new Date(auction.closesAt).getTime();
  const nowTime = now.getTime();

  if (closesAtTime > nowTime) {
    return "ACTIVE";
  }

  if (bidsCount > 0) {
    return "CLOSED";
  }

  return "DESERTED";
}
