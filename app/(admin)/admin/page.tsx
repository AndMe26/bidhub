"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/i18n-provider";

export default function AdminPage() {
  const { t } = useI18n();
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [activeAuctions, setActiveAuctions] = useState<any[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatSlug, setNewCatSlug] = useState("");
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);

  // Moderation state
  const [cancelModalId, setCancelModalId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [modLoading, setModLoading] = useState(false);

  const fetchCategories = async () => {
    const res = await fetch("/api/categories");
    if (res.ok) {
      const d = await res.json();
      setCategories(d.data || []);
    }
  };

  const fetchActiveAuctions = async () => {
    const res = await fetch("/api/auctions?status=ACTIVE");
    if (res.ok) {
      const d = await res.json();
      setActiveAuctions(d.data || []);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchActiveAuctions();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatError(null);
    setCatLoading(true);

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCatName,
          slug: newCatSlug.trim() ? newCatSlug.trim() : undefined,
        }),
      });

      const d = await res.json();
      if (!res.ok) {
        throw new Error(d.error?.message || "Error al crear categoría");
      }

      setNewCatName("");
      setNewCatSlug("");
      await fetchCategories();
    } catch (err: any) {
      setCatError(err.message);
    } finally {
      setCatLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("¿Eliminar esta categoría?")) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error?.message || "No se puede eliminar la categoría");
      } else {
        await fetchCategories();
      }
    } catch {
      alert("Error de conexión");
    }
  };

  const handleModerateCancel = async () => {
    if (!cancelModalId || !cancelReason.trim()) return;
    setModLoading(true);

    try {
      const res = await fetch(`/api/admin/auctions/${cancelModalId}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });

      if (!res.ok) {
        const d = await res.json();
        alert(d.error?.message || "Error al cancelar por moderación");
      } else {
        setCancelModalId(null);
        setCancelReason("");
        await fetchActiveAuctions();
      }
    } finally {
      setModLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "2.2rem", fontWeight: 800 }}>{t.admin.title}</h1>
        <p style={{ color: "var(--text-muted)", marginTop: "4px" }}>
          Control central de categorías de colección y moderación de subastas.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "32px" }}>
        {/* Categories Panel */}
        <div className="glass-panel" style={{ padding: "32px" }}>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "20px" }}>
            📂 {t.admin.categories}
          </h2>

          {catError && (
            <div style={{ color: "#fb7185", fontSize: "0.85rem", background: "rgba(244,63,94,0.1)", padding: "10px", borderRadius: "8px", marginBottom: "16px" }}>
              {catError}
            </div>
          )}

          <form onSubmit={handleCreateCategory} style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
            <input
              type="text"
              placeholder={t.admin.categoryName}
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="input-field"
              required
            />
            <input
              type="text"
              placeholder={t.admin.categorySlug}
              value={newCatSlug}
              onChange={(e) => setNewCatSlug(e.target.value)}
              className="input-field"
            />
            <button type="submit" disabled={catLoading} className="btn-primary" style={{ padding: "10px" }}>
              {catLoading ? "Creando..." : t.admin.create}
            </button>
          </form>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {categories.map((c) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>slug: {c.slug}</div>
                </div>
                <button
                  onClick={() => handleDeleteCategory(c.id)}
                  className="btn-danger"
                  style={{ padding: "4px 10px", fontSize: "0.8rem" }}
                >
                  {t.admin.delete}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Moderation Panel */}
        <div className="glass-panel" style={{ padding: "32px" }}>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "20px" }}>
            ⚖️ {t.admin.moderation}
          </h2>

          {activeAuctions.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>No hay subastas activas para moderar.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {activeAuctions.map((auc) => (
                <div
                  key={auc.id}
                  style={{
                    padding: "14px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{auc.title}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      Vendedor: {auc.seller.name} • {auc.bidsCount} ofertas • ${auc.currentPrice}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setCancelModalId(auc.id);
                      setCancelReason("");
                    }}
                    className="btn-danger"
                    style={{ padding: "6px 12px", fontSize: "0.82rem", whiteSpace: "nowrap" }}
                  >
                    Cancelar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Cancelación con motivo obligatorio (Reglas #15 y #16) */}
      {cancelModalId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 100,
          }}
        >
          <div className="glass-panel" style={{ maxWidth: "480px", width: "100%", padding: "32px", background: "var(--bg-secondary)" }}>
            <h3 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "8px", color: "#fb7185" }}>
              {t.admin.moderateCancel}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "20px" }}>
              Esta acción es irreversible y conservará la subasta marcada como cancelada.
            </p>

            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "6px" }}>
              {t.admin.cancelReason}
            </label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="input-field"
              placeholder="Ej: Infracción a los términos por artículo no auténtico..."
              required
              style={{ marginBottom: "20px" }}
            />

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setCancelModalId(null)}
                className="btn-secondary"
                style={{ padding: "10px 18px" }}
              >
                Volver
              </button>
              <button
                type="button"
                disabled={!cancelReason.trim() || modLoading}
                onClick={handleModerateCancel}
                className="btn-danger"
                style={{ padding: "10px 20px" }}
              >
                {modLoading ? "Cancelando..." : "Confirmar Cancelación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
