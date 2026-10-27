"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import { useAuth } from "@/components/auth-provider";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Error al iniciar sesión");
      }

      await refreshUser();
      // Usar replace para que /login no quede en la pila de historial
      router.replace("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: "1.7rem", fontWeight: 800, marginBottom: "8px" }}>
        {t.auth.loginTitle}
      </h2>
      <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: "28px" }}>
        {t.auth.loginSubtitle}
      </p>

      {error && (
        <div style={{ color: "#fb7185", fontSize: "0.88rem", background: "rgba(244,63,94,0.1)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(244,63,94,0.2)", marginBottom: "20px" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "6px" }}>
            {t.auth.email}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            placeholder="ejemplo@bidhub.com"
            required
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "6px" }}>
            {t.auth.password}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
          style={{ width: "100%", padding: "12px", marginTop: "8px" }}
        >
          {loading ? "Iniciando..." : t.auth.submitLogin}
        </button>
      </form>

      <div style={{ marginTop: "24px", textAlign: "center", fontSize: "0.9rem", color: "var(--text-muted)" }}>
        <Link href="/register" style={{ color: "#38bdf8", fontWeight: 500 }}>
          {t.auth.noAccount}
        </Link>
      </div>
    </div>
  );
}
