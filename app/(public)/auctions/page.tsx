import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { listInclude, toAuctionDto, statusWhere } from "@/services/auction-service";
import { AuctionCountdown } from "@/components/auctions/auction-countdown";
import { type AuctionStatus } from "@/services/auction-status";

interface Props {
  searchParams: Promise<{
    categoryId?: string;
    status?: AuctionStatus;
  }>;
}

export const dynamic = "force-dynamic";

export default async function AuctionsPage({ searchParams }: Props) {
  const { categoryId, status } = await searchParams;
  const now = new Date();

  const where: any = {};
  if (categoryId) {
    where.categoryId = categoryId;
  }
  if (status) {
    Object.assign(where, statusWhere(status, now));
  }

  const [auctions, categories] = await Promise.all([
    prisma.auction.findMany({
      where,
      include: listInclude,
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  const dtos = auctions.map(toAuctionDto);

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "2.4rem", fontWeight: 800, marginBottom: "8px" }}>
          Catálogo de Subastas
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1.05rem" }}>
          Explora artículos de colección con estado en tiempo real.
        </p>
      </div>

      {/* Filters */}
      <div
        className="glass-panel"
        style={{
          padding: "16px 20px",
          marginBottom: "32px",
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <form method="GET" style={{ display: "flex", gap: "16px", flexWrap: "wrap", width: "100%" }}>
          <select
            name="categoryId"
            defaultValue={categoryId ?? ""}
            className="input-field"
            style={{ maxWidth: "220px", cursor: "pointer" }}
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            name="status"
            defaultValue={status ?? ""}
            className="input-field"
            style={{ maxWidth: "200px", cursor: "pointer" }}
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVE">Activa</option>
            <option value="CLOSED">Cerrada</option>
            <option value="DESERTED">Desierta</option>
            <option value="CANCELLED">Cancelada</option>
          </select>

          <button type="submit" className="btn-primary" style={{ padding: "10px 20px" }}>
            Filtrar
          </button>
        </form>
      </div>

      {/* Grid */}
      {dtos.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: "60px 20px",
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📦</div>
          <h3>No se encontraron subastas</h3>
          <p style={{ marginTop: "4px" }}>Intenta cambiando los filtros o vuelve más tarde.</p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "24px",
          }}
        >
          {dtos.map((auc) => {
            const badgeClass =
              auc.status === "ACTIVE"
                ? "badge-active"
                : auc.status === "CLOSED"
                ? "badge-closed"
                : auc.status === "DESERTED"
                ? "badge-deserted"
                : "badge-cancelled";

            return (
              <Link
                key={auc.id}
                href={`/auctions/${auc.id}`}
                className="glass-panel"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
              >
                {/* Image */}
                <div style={{ position: "relative", width: "100%", height: "200px", backgroundColor: "#1e293b" }}>
                  <Image
                    src={auc.imageUrl}
                    alt={auc.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    style={{ objectFit: "cover" }}
                  />
                  <div style={{ position: "absolute", top: "12px", right: "12px" }}>
                    <span className={`badge ${badgeClass}`}>{auc.status}</span>
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: "20px", display: "flex", flexDirection: "column", flexGrow: 1 }}>
                  <span style={{ fontSize: "0.8rem", color: "#38bdf8", fontWeight: 600, marginBottom: "4px" }}>
                    {auc.category.name}
                  </span>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "8px", color: "var(--text-main)" }}>
                    {auc.title}
                  </h3>

                  <div style={{ marginTop: "auto", paddingTop: "16px", borderTop: "1px solid var(--border-color)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
                      <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Precio actual:</span>
                      <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#34d399" }}>
                        ${auc.currentPrice.toLocaleString()}
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>{auc.bidsCount} ofertas</span>
                      {auc.status === "ACTIVE" ? (
                        <AuctionCountdown closesAt={auc.closesAt} />
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                          Cerrada
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
