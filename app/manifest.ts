import type { MetadataRoute } from "next";

// PWA マニフェスト（/manifest.webmanifest として配信）。
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "歯科 施設基準 届出可否 診断",
    short_name: "施設基準診断",
    description:
      "令和8年度改定対応。歯科診療所の施設基準の届出可否を判定し、収益を試算し、公式様式へワンタップ。",
    lang: "ja",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f7f9",
    theme_color: "#1f6feb",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
