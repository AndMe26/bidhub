"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  auctionId: string;
  sellerId: string;
  minNextBid: number;
  isActive: boolean;
}

export function BidForm({ auctionId, minNextBid, isActive }: Props) {
  const router = useRouter();
  const [amount, setAmount] = useState<number>(minNextBid);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isActive) {
    return (
      <div style={{ padding: "16px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", textAlign: "center", color: "var(--text-muted)" }}>
        Esta subasta ya no está activa para recibir ofertas.
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/auctions/${auctionId}/bids`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount) }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Error al procesar la oferta");
      }

      setSuccess("¡Oferta realizada con éxito!");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div>
        <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "6px" }}>
          Monto de tu oferta (mínimo ${minNextBid.toLocaleString()} USD):
        </label>
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            type="number"
            min={minNextBid}
            step="1"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="input-field"
            required
            style={{ fontSize: "1.1rem", fontWeight: 700 }}
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ padding: "12px 24px", whiteSpace: "nowrap" }}
          >
            {loading ? "Ofertando..." : "Pujar ahora"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ color: "#fb7185", fontSize: "0.85rem", background: "rgba(244,63,94,0.1)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(244,63,94,0.2)" }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ color: "#34d399", fontSize: "0.85rem", background: "rgba(16,185,129,0.1)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(16,185,129,0.2)" }}>
          {success}
        </div>
      )}
    </form>
  );
}
