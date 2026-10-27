import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { listInclude, toAuctionDto, maskName } from "@/services/auction-service";
import { AuctionCountdown } from "@/components/auctions/auction-countdown";
import { BidForm } from "./bid-form";

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function AuctionDetailPage({ params }: Props) {
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
    notFound();
  }

  const dto = toAuctionDto(auction);

  // Regla #18: Anonimización de postores
  const maskedBids = auction.bids.map((b) => ({
    id: b.id,
    amount: b.amount.toNumber(),
    createdAt: b.createdAt.toISOString(),
    alias: maskName(b.bidder.name),
  }));

  const minNextBid =
    auction.bids.length === 0
      ? dto.initialPrice
      : dto.currentPrice + dto.minIncrement;

  const badgeClass =
    dto.status === "ACTIVE"
      ? "badge-active"
      : dto.status === "CLOSED"
      ? "badge-closed"
      : dto.status === "DESERTED"
      ? "badge-deserted"
      : "badge-cancelled";

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "40px",
        }}
      >
        {/* Left: Image & Description */}
        <div>
          <div
            className="glass-panel"
            style={{
              position: "relative",
              width: "100%",
              height: "400px",
              overflow: "hidden",
              marginBottom: "24px",
              backgroundColor: "#1e293b",
            }}
          >
            <Image
              src={dto.imageUrl}
              alt={dto.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              style={{ objectFit: "cover" }}
            />
            <div style={{ position: "absolute", top: "16px", right: "16px" }}>
              <span className={`badge ${badgeClass}`}>{dto.status}</span>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "28px" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "12px" }}>
              Descripción del artículo
            </h3>
            <p style={{ color: "var(--text-muted)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {dto.description}
            </p>
          </div>
        </div>

        {/* Right: Info, Countdown & Bid form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="glass-panel" style={{ padding: "32px" }}>
            <span style={{ fontSize: "0.85rem", color: "#38bdf8", fontWeight: 600 }}>
              {dto.category.name}
            </span>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginTop: "6px", marginBottom: "16px" }}>
              {dto.title}
            </h1>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px", color: "var(--text-muted)", fontSize: "0.9rem" }}>
              <span>Vendedor: <strong style={{ color: "var(--text-main)" }}>{dto.seller.name}</strong></span>
              <span>•</span>
              <span>Subastado el {new Date(dto.createdAt).toLocaleDateString()}</span>
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", padding: "20px", borderRadius: "12px", border: "1px solid var(--border-color)", marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Precio actual:</span>
                <span style={{ fontSize: "2rem", fontWeight: 800, color: "#34d399" }}>
                  ${dto.currentPrice.toLocaleString()}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", color: "var(--text-muted)" }}>
                <span>Precio base: ${dto.initialPrice.toLocaleString()}</span>
                <span>Incremento mín.: ${dto.minIncrement.toLocaleString()}</span>
              </div>
            </div>

            {/* Countdown / Estado */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "6px" }}>
                Tiempo restante de la subasta:
              </div>
              {dto.status === "ACTIVE" ? (
                <AuctionCountdown closesAt={dto.closesAt} />
              ) : (
                <div style={{ fontWeight: 600, color: "var(--accent-rose)" }}>
                  {dto.status === "CANCELLED"
                    ? `Cancelada: ${dto.cancelReason ?? "Por moderación"}`
                    : `Cerrada (${dto.status})`}
                </div>
              )}
            </div>

            {/* Bid Form Component */}
            <BidForm
              auctionId={dto.id}
              sellerId={dto.seller.id}
              minNextBid={minNextBid}
              isActive={dto.status === "ACTIVE"}
            />
          </div>

          {/* Bids History (Regla #18) */}
          <div className="glass-panel" style={{ padding: "28px" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "16px", display: "flex", justifyContent: "space-between" }}>
              <span>Historial de ofertas</span>
              <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>{maskedBids.length} registradas</span>
            </h3>

            {maskedBids.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Aún no hay ofertas. ¡Sé el primero en ofertar!
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {maskedBids.map((b, idx) => (
                  <div
                    key={b.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: idx === 0 ? "rgba(16, 185, 129, 0.08)" : "rgba(255,255,255,0.02)",
                      border: idx === 0 ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid var(--border-color)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{b.alias}</span>
                      {idx === 0 && (
                        <span style={{ fontSize: "0.75rem", background: "rgba(16,185,129,0.2)", color: "#34d399", padding: "2px 6px", borderRadius: "4px" }}>
                          Oferta más alta
                        </span>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, color: "#34d399", fontSize: "0.95rem" }}>
                        ${b.amount.toLocaleString()}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {new Date(b.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
