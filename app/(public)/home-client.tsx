"use client";

import { useI18n } from "@/components/i18n-provider";
import Link from "next/link";

export function HomeClient() {
  const { t } = useI18n();

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "64px 24px" }}>
      {/* Hero Section */}
      <div style={{ textAlign: "center", maxWidth: "800px", margin: "0 auto 80px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(59, 130, 246, 0.12)",
            color: "#60a5fa",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            padding: "6px 16px",
            borderRadius: "30px",
            fontSize: "0.85rem",
            fontWeight: 600,
            marginBottom: "24px",
          }}
        >
          ✨ {t.home.badge}
        </div>

        <h1
          style={{
            fontSize: "3.2rem",
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: "20px",
            letterSpacing: "-0.03em",
            background: "linear-gradient(135deg, #ffffff 30%, #94a3b8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {t.home.title}
        </h1>

        <p
          style={{
            fontSize: "1.15rem",
            color: "var(--text-muted)",
            lineHeight: 1.6,
            marginBottom: "36px",
          }}
        >
          {t.home.subtitle}
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
          <Link href="/auctions" className="btn-primary" style={{ padding: "14px 28px", fontSize: "1.05rem" }}>
            🔍 {t.home.explore}
          </Link>
          <Link href="/publish" className="btn-secondary" style={{ padding: "14px 28px", fontSize: "1.05rem" }}>
            ➕ {t.home.publish}
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "24px",
        }}
      >
        <div className="glass-panel" style={{ padding: "32px" }}>
          <div style={{ fontSize: "2rem", marginBottom: "16px" }}>⚡</div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "8px" }}>
            {t.home.features.realtime}
          </h3>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.5 }}>
            {t.home.features.realtimeDesc}
          </p>
        </div>

        <div className="glass-panel" style={{ padding: "32px" }}>
          <div style={{ fontSize: "2rem", marginBottom: "16px" }}>🛡️</div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "8px" }}>
            {t.home.features.security}
          </h3>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.5 }}>
            {t.home.features.securityDesc}
          </p>
        </div>

        <div className="glass-panel" style={{ padding: "32px" }}>
          <div style={{ fontSize: "2rem", marginBottom: "16px" }}>🔒</div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "8px" }}>
            {t.home.features.privacy}
          </h3>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.5 }}>
            {t.home.features.privacyDesc}
          </p>
        </div>
      </div>
    </div>
  );
}
