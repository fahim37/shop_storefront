import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";

export const alt = `${BRAND.name} — ${BRAND.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const mark = await readFile(
    join(process.cwd(), "public", "brand", "cartivo-mark.png"),
  );
  const wordmarkFont = await readFile(
    join(process.cwd(), "assets", "brand", "BricolageGrotesque-ExtraBold.ttf"),
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#F7F8FC",
          color: "#1E2A6E",
          borderBottom: "16px solid #F5B82E",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${mark.toString("base64")}`}
            width={160}
            height={160}
            alt=""
          />
          <span
            style={{
              fontFamily: "Bricolage Grotesque",
              fontSize: 112,
              fontWeight: 800,
              letterSpacing: -6,
            }}
          >
            {BRAND.name}
          </span>
        </div>
        <div style={{ display: "flex", marginTop: 34, fontSize: 38 }}>
          {BRAND.tagline}
        </div>
        <div
          style={{ display: "flex", marginTop: 28, fontSize: 22, color: "#6B7186" }}
        >
          Bangladesh&apos;s marketplace · Cash on delivery · Nationwide shipping
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Bricolage Grotesque",
          data: wordmarkFont,
          style: "normal",
          weight: 800,
        },
      ],
    },
  );
}
