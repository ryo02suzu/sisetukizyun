import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "施設基準診断",
  title: {
    default: "歯科 施設基準 届出可否 診断（令和8年度改定対応）",
    template: "%s ｜ 歯科 施設基準 届出可否 診断",
  },
  description:
    "令和8年度（2026年6月施行）改定対応。歯科診療所の施設基準について届出可否を決定木で判定し、収益を係数調整型で試算。届出様式・申請手順もアプリ内で確認できます。",
  keywords: ["歯科", "施設基準", "届出", "令和8年度改定", "診療報酬", "ベースアップ評価料"],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "施設基準診断",
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "歯科 施設基準 届出可否 診断",
    title: "歯科 施設基準 届出可否 診断（令和8年度改定対応）",
    description:
      "歯科診療所の施設基準の届出可否を決定木で判定し、収益を試算。届出様式・申請手順もアプリ内で完結。",
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#1f6feb",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
