"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useI18n } from "@/components/i18n-provider";
import { AuctionCountdown } from "@/components/auctions/auction-countdown";

export default function DashboardPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<"auctions" | "bids">("auctions");
  const [myAuctions, setMyAuctions] = useState<any[]>([]);
  const [myBids, setMyBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resAuctions, resBids] = await Promise.all([
        fetch("/api/auctions/mine"),
        fetch("/api/bids/me"),
      ]);

      if (resAuctions.ok) {
        const d = await resAuctions.json();
        setMyAuctions(d.data || []);
      }

      if (resBids.ok) {
        const d = await resBids.json();
        setMyBids(d.data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCancel = async (id: string) => {
    if (!confirm(t.dashboard.cancelConfirm)) return;
    setCancellingId(id);
    try {
      const res = await fetch(`/api/auctions/${id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelada por el vendedor" }),
      });

      if (res.ok) {
        await fetchData();
      } else {
        const d = await res.json();
        alert(d.error?.message || "No se pudo cancelar la subasta");
      }
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "2.2rem", fontWeight: 800 }}>{t.dashboard.title}</h1>
          <p style={{ color: "var(--text-muted)", marginTop: "4px" }}>
            Administra tus artículos publicados y haz seguimiento a tus pujas.
          </p>
        </div>

        <Link href="/publish" className="btn-primary" style={{ padding: "12px 24px" }}>
          ➕ {t.publish.title}
        </Link>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid var(--border-color)", marginBottom: "28px" }}>
        <button
          onClick={() => setTab("auctions")}
          style={{
            background: "none",
            border: "none",
            padding: "12px 18px",
            color: tab === "auctions" ? "#38bdf8" : "var(--text-muted)",
            fontWeight: 700,
            fontSize: "1rem",
            cursor: "pointer",
            borderBottom: tab === "auctions" ? "2px solid #38bdf8" : "2px solid transparent",
          }}
        >
          🏷️ {t.dashboard.myAuctions} ({myAuctions.length})
        </button>
        <button
          onClick={() => setTab("bids")}
          style={{
            background: "none",
            border: "none",
            padding: "12px 18px",
            color: tab === "bids" ? "#38bdf8" : "var(--text-muted)",
            fontWeight: 700,
            fontSize: "1rem",
            cursor: "pointer",
            borderBottom: tab === "bids" ? "2px solid #38bdf8" : "2px solid transparent",
          }}
        >
          💰 {t.dashboard.myBids} ({myBids.length})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
          Cargando datos del panel...
        </div>
      ) : tab === "auctions" ? (
        myAuctions.length === 0 ? (
          <div className="glass-panel" style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>
            <p>{t.dashboard.noMyAuctions}</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "24px" }}>
            {myAuctions.map((auc) => {
              const canEditOrCancel = auc.status === "ACTIVE" && auc.bidsCount === 0;

              return (
                <div key={auc.id} className="glass-panel" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div style={{ position: "relative", width: "100%", height: "180px", backgroundColor: "#1e293b" }}>
                    <Image src={auc.imageUrl} alt={auc.title} fill sizes="300px" style={{ objectFit: "cover" }} />
                    <div style={{ position: "absolute", top: "12px", right: "12px" }}>
                      <span className={`badge badge-${auc.status.toLowerCase()}`}>{auc.status}</span>
                    </div>
                  </div>

                  <div style={{ padding: "20px", display: "flex", flexDirection: "column", flexGrow: 1 }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "8px" }}>
                      {auc.title}
                    </h3>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", marginBottom: "12px" }}>
                      <span style={{ color: "var(--text-muted)" }}>{auc.bidsCount} ofertas</span>
                      <span style={{ fontWeight: 700, color: "#34d399" }}>${auc.currentPrice}</span>
                    </div>

                    <div style={{ marginTop: "auto", paddingTop: "14px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                      <Link href={`/auctions/${auc.id}`} className="btn-secondary" style={{ padding: "6px 12px", fontSize: "0.85rem" }}>
                        Ver
                      </Link>

                      {canEditOrCancel && (
                        <div style={{ display: "flex", gap: "8px" }}>
                          <Link href={`/publish?id=${auc.id}`} className="btn-secondary" style={{ padding: "6px 12px", fontSize: "0.85rem" }}>
                            {t.dashboard.edit}
                          </Link>
                          <button
                            onClick={() => handleCancel(auc.id)}
                            disabled={cancellingId === auc.id}
                            className="btn-danger"
                            style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                          >
                            {t.dashboard.cancel}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        myBids.length === 0 ? (
          <div className="glass-panel" style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>
            <p>{t.dashboard.noMyBids}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {myBids.map((b) => (
              <div
                key={b.id}
                className="glass-panel"
                style={{
                  padding: "16px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <Link href={`/auctions/${b.auction.id}`} style={{ fontWeight: 700, fontSize: "1.05rem", color: "#38bdf8" }}>
                    {b.auction.title}
                  </Link>
                  <div style={{ display: "flex", gap: "12px", color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
                    <span>{b.auction.category.name}</span>
                    <span>•</span>
                    <span>Ofertado: ${b.amount.toLocaleString()}</span>
                    <span>•</span>
                    <span>{new Date(b.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {b.auction.isWinner ? (
                    <span style={{ background: "rgba(16,185,129,0.2)", color: "#34d399", padding: "6px 12px", borderRadius: "20px", fontWeight: 700, fontSize: "0.85rem" }}>
                      🏆 {t.dashboard.won}
                    </span>
                  ) : b.auction.isWinning ? (
                    <span style={{ background: "rgba(59,130,246,0.2)", color: "#60a5fa", padding: "6px 12px", borderRadius: "20px", fontWeight: 700, fontSize: "0.85rem" }}>
                      👑 {t.dashboard.winning}
                    </span>
                  ) : null}

                  <span className={`badge badge-${b.auction.status.toLowerCase()}`}>
                    {b.auction.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
