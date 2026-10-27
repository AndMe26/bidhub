import { Navbar, Footer } from "@/components/layout/navbar";

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main style={{ minHeight: "calc(100vh - 160px)", padding: "32px 24px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>{children}</div>
      </main>
      <Footer />
    </>
  );
}
