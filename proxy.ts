import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const ACCESS_COOKIE = "access_token";

async function verifyToken(token: string) {
  try {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) return null;
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    return payload;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPrivate = pathname.startsWith("/dashboard") || pathname.startsWith("/publish");
  const isAdmin = pathname.startsWith("/admin");
  const isAuthRoute = pathname === "/login" || pathname === "/register";

  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;
  const isAuthenticated = payload !== null && typeof payload.sub === "string";

  // Si ya está autenticado e intenta ir a /login o /register (o retrocede en el historial), mantenerlo en /dashboard
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Si no es privada ni de admin, permitir continuar
  if (!isPrivate && !isAdmin) {
    return NextResponse.next();
  }

  // Si es privada/admin y no tiene sesión, redirigir al login
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Si la ruta es /admin y el rol no es ADMIN, redirigir al dashboard
  if (isAdmin && payload.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/publish/:path*",
    "/admin/:path*",
    "/login",
    "/register",
  ],
};
