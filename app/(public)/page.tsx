import { HomeClient } from "./home-client";

// Requerimiento técnico #4: Estrategia SSG para Home
export const dynamic = "force-static";

export default function HomePage() {
  return <HomeClient />;
}
