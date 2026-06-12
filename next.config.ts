import type { NextConfig } from "next";

/**
 * Backend wiring.
 *
 * - Server Components fetch the backend DIRECTLY (absolute URL, no CORS) via
 *   `lib/api/server`.
 * - The browser fetches through a SAME-ORIGIN BFF proxy (`/bff/v1/*` →
 *   backend `/v1/*`) so client requests never hit cross-origin CORS — the
 *   storefront works against any backend (incl. a remote VPS) without needing
 *   that backend to allowlist the storefront origin.
 * - Media is loaded via plain <img> from the backend (cross-origin image loads
 *   are not CORS-restricted), so no proxy needed there.
 */
const apiBase = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://62.72.58.29:4000/v1"
).replace(/\/+$/, "");

let apiHost = "localhost";
let apiProtocol: "http" | "https" = "http";
try {
  const u = new URL(apiBase);
  apiHost = u.hostname;
  apiProtocol = u.protocol === "https:" ? "https" : "http";
} catch {
  /* keep defaults */
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/bff/v1/:path*", destination: `${apiBase}/:path*` }];
  },
  images: {
    remotePatterns: [
      { protocol: apiProtocol, hostname: apiHost, port: "", pathname: "/**" },
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
