"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import { useAuth } from "@/components/auth-provider";

export function Navbar() {
  const { t, locale, setLocale } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace("/");
    router.refresh();
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backgroundColor: "rgba(10, 14, 23, 0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border-color)",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 24px",
          height: "68px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Brand */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "1.4rem",
            fontWeight: 800,
            background: "linear-gradient(135deg, #60a5fa, #38bdf8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-0.02em",
          }}
        >
          <span style={{ fontSize: "1.6rem" }}>💎</span>
          {t.nav.brand}
        </Link>

        {/* Links */}
        <nav style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <Link
            href="/auctions"
            style={{
              color: pathname === "/auctions" ? "var(--text-main)" : "var(--text-muted)",
              fontWeight: 500,
              fontSize: "0.95rem",
              transition: "color 0.2s",
            }}
          >
            {t.nav.auctions}
          </Link>

          {user && (
            <>
              <Link
                href="/publish"
                style={{
                  color: pathname === "/publish" ? "var(--text-main)" : "var(--text-muted)",
                  fontWeight: 500,
                  fontSize: "0.95rem",
                  transition: "color 0.2s",
                }}
              >
                {t.nav.publish}
              </Link>
              <Link
                href="/dashboard"
                style={{
                  color: pathname === "/dashboard" ? "var(--text-main)" : "var(--text-muted)",
                  fontWeight: 500,
                  fontSize: "0.95rem",
                  transition: "color 0.2s",
                }}
              >
                {t.nav.dashboard}
              </Link>
            </>
          )}

          {user?.role === "ADMIN" && (
            <Link
              href="/admin"
              style={{
                color: pathname.startsWith("/admin") ? "#38bdf8" : "#93c5fd",
                fontWeight: 600,
                fontSize: "0.95rem",
                padding: "4px 10px",
                borderRadius: "6px",
                background: "rgba(59, 130, 246, 0.15)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
              }}
            >
              🛡️ {t.nav.admin}
            </Link>
          )}
        </nav>

        {/* User controls + Locale Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* Selector de idioma */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              padding: "2px",
            }}
          >
            <button
              onClick={() => setLocale("es")}
              style={{
                background: locale === "es" ? "rgba(59, 130, 246, 0.3)" : "transparent",
                color: locale === "es" ? "#fff" : "var(--text-muted)",
                border: "none",
                borderRadius: "6px",
                padding: "4px 8px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ES
            </button>
            <button
              onClick={() => setLocale("en")}
              style={{
                background: locale === "en" ? "rgba(59, 130, 246, 0.3)" : "transparent",
                color: locale === "en" ? "#fff" : "var(--text-muted)",
                border: "none",
                borderRadius: "6px",
                padding: "4px 8px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              EN
            </button>
          </div>

          {loading ? (
            <div style={{ width: "90px", height: "32px" }} />
          ) : user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
                {user.name}
              </span>
              <button onClick={handleLogout} className="btn-secondary" style={{ padding: "6px 12px", fontSize: "0.85rem" }}>
                {t.nav.logout}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Link href="/login" className="btn-secondary" style={{ padding: "8px 16px", fontSize: "0.9rem" }}>
                {t.nav.login}
              </Link>
              <Link href="/register" className="btn-primary" style={{ padding: "8px 16px", fontSize: "0.9rem" }}>
                {t.nav.register}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer
      style={{
        marginTop: "auto",
        borderTop: "1px solid var(--border-color)",
        backgroundColor: "var(--bg-secondary)",
        padding: "32px 24px",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          color: "var(--text-muted)",
          fontSize: "0.88rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontWeight: 700, color: "var(--text-main)" }}>BidHub</span> &copy;{" "}
          {new Date().getFullYear()} — Plataforma de subastas en línea para coleccionistas.
        </div>
        <div style={{ display: "flex", gap: "20px" }}>
          <span>Next.js 16</span>
          <span>PostgreSQL + Supabase</span>
          <span>TypeScript Estricto</span>
        </div>
      </div>
    </footer>
  );
}
