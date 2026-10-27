import { Navbar, Footer } from "@/components/layout/navbar";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main style={{ minHeight: "calc(100vh - 160px)" }}>{children}</main>
      <Footer />
    </>
  );
}
