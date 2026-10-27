"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";

function PublishForm() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [initialPrice, setInitialPrice] = useState(10);
  const [minIncrement, setMinIncrement] = useState(5);
  // Default closesAt: 24 horas a partir de ahora en formato datetime-local
  const [closesAt, setClosesAt] = useState(() => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 16);
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((d) => {
        if (d.data) {
          setCategories(d.data);
          if (d.data.length > 0 && !categoryId) setCategoryId(d.data[0].id);
        }
      });

    if (editId) {
      fetch(`/api/auctions/${editId}`)
        .then((res) => res.json())
        .then((d) => {
          if (d.data) {
            setTitle(d.data.title);
            setDescription(d.data.description);
            setImageUrl(d.data.imageUrl);
            setCategoryId(d.data.category.id);
            setInitialPrice(d.data.initialPrice);
            setMinIncrement(d.data.minIncrement);
            setClosesAt(new Date(d.data.closesAt).toISOString().slice(0, 16));
          }
        });
    }
  }, [editId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        title,
        description,
        imageUrl,
        categoryId,
        initialPrice: Number(initialPrice),
        minIncrement: Number(minIncrement),
        closesAt: new Date(closesAt).toISOString(),
      };

      const url = editId ? `/api/auctions/${editId}` : "/api/auctions";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Error al procesar la subasta");
      }

      router.push(`/auctions/${data.data.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto" }}>
      <div className="glass-panel" style={{ padding: "40px" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "8px" }}>
          {editId ? t.publish.editTitle : t.publish.title}
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: "32px" }}>
          Completa los campos para publicar tu artículo coleccionable.
        </p>

        {error && (
          <div style={{ color: "#fb7185", fontSize: "0.88rem", background: "rgba(244,63,94,0.1)", padding: "12px 16px", borderRadius: "8px", border: "1px solid rgba(244,63,94,0.2)", marginBottom: "24px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "6px" }}>
              {t.publish.titleLabel}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              placeholder="Ej: Carta Charizard 1st Edition Shadowless"
              required
              minLength={3}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "6px" }}>
              {t.publish.descriptionLabel}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
              rows={4}
              placeholder="Estado de conservación, procedencia y detalles..."
              required
              minLength={10}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "6px" }}>
                {t.publish.categoryLabel}
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="input-field"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "6px" }}>
                {t.publish.imageUrlLabel}
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="input-field"
                placeholder="https://picsum.photos/seed/item/600/400"
                required
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "6px" }}>
                {t.publish.initialPriceLabel}
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={initialPrice}
                onChange={(e) => setInitialPrice(Number(e.target.value))}
                className="input-field"
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "6px" }}>
                {t.publish.minIncrementLabel}
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={minIncrement}
                onChange={(e) => setMinIncrement(Number(e.target.value))}
                className="input-field"
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "6px" }}>
              {t.publish.closesAtLabel}
            </label>
            <input
              type="datetime-local"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ flexGrow: 1, padding: "14px" }}
            >
              {loading ? "Procesando..." : editId ? t.publish.submitEdit : t.publish.submit}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary"
              style={{ padding: "14px 24px" }}
            >
              {t.publish.cancel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PublishPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", padding: "40px" }}>Cargando formulario...</div>}>
      <PublishForm />
    </Suspense>
  );
}
