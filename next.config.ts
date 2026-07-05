import type { NextConfig } from "next";

/**
 * Backend wiring.
 *
 * - Server Components fetch the backend DIRECTLY (absolute URL) via
 *   `lib/api/server`.
 * - The browser also fetches the backend directly (see `API_BASE_URL` in
 *   `lib/config.ts`) — now that the backend is served over HTTPS, there's no
 *   mixed-content concern, and the backend allowlists our origin via CORS.
 * - Media is loaded via plain <img> from the backend (cross-origin image loads
 *   are not CORS-restricted), so no proxy needed there.
 */
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
  // No `images` config on purpose: media renders via plain <img> against the
  // backend's pre-resized variants (see lib/media.ts), never next/image. Keeping
  // remotePatterns around (esp. a wildcard host) would silently turn the image
  // optimizer into an open proxy if next/image were ever introduced.
};

export default nextConfig;
