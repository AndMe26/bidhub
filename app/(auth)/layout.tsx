import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={{ marginBottom: "28px" }}>
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "1.7rem",
            fontWeight: 800,
            background: "linear-gradient(135deg, #60a5fa, #38bdf8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          <span>💎</span> BidHub
        </Link>
      </div>
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "440px",
          padding: "36px",
        }}
      >
        {children}
      </div>
    </div>
  );
}
