import type { Metadata } from "next";
import { Sora, Manrope, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

/* Display / headings */
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

/* Body / UI */
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

/* Bengali accents (৳, বাংলা, ঈদ) */
const notoBengali = Noto_Sans_Bengali({
  variable: "--font-bengali",
  subsets: ["bengali"],
  weight: ["600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://gcl.com.bd"),
  title: {
    default: "GCL — Bangladesh's marketplace",
    template: "%s · GCL",
  },
  description:
    "Shop 36,000+ products from 1,200 verified Bangladeshi sellers. Cash on delivery, 64-district shipping, 7-day easy returns.",
  openGraph: {
    title: "GCL — Bangladesh's marketplace",
    description:
      "Big brands. Local prices. Cash on delivery, everywhere in Bangladesh.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${manrope.variable} ${notoBengali.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
