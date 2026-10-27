import Link from "next/link";
import { Navbar, Footer } from "@/components/layout/navbar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <div
        style={{
          borderBottom: "1px solid rgba(245, 158, 11, 0.2)",
          background: "rgba(245, 158, 11, 0.08)",
          padding: "8px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#fbbf24", fontSize: "0.88rem", fontWeight: 600 }}>
          <span>🛡️</span> Modo Administrador Activo — Moderación y Categorías
        </div>
        <Link href="/dashboard" style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
          Ir a Mi Dashboard
        </Link>
      </div>
      <main style={{ minHeight: "calc(100vh - 200px)", padding: "32px 24px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>{children}</div>
      </main>
      <Footer />
    </>
  );
}
