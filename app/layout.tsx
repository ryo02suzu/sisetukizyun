import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "歯科 施設基準 届出可否 診断",
  description: "令和8年度改定対応 歯科診療所の施設基準 届出可否診断・収益試算",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
