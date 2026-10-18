import { NextRequest, NextResponse } from "next/server";
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV !== "production";
  const apiOrigin = new URL(
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
  ).origin;
  const socketOrigin = new URL(process.env.NEXT_PUBLIC_SOCKET_URL || apiOrigin)
    .origin;
  const wsOrigin = socketOrigin.replace(/^http/, "ws");
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'nonce-" +
      nonce +
      "' 'strict-dynamic'" +
      (dev ? " 'unsafe-eval'" : ""),
    "style-src 'self' 'nonce-" + nonce + "'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' " +
      apiOrigin +
      " " +
      socketOrigin +
      " " +
      wsOrigin +
      (dev ? " ws://localhost:3000" : ""),
    "frame-src https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(!dev ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
