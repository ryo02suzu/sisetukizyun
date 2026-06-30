import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ページが見つかりません",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="container legal-page">
      <h1>ページが見つかりません（404）</h1>
      <p>
        お探しのページは存在しないか、移動した可能性があります。
      </p>
      <p className="legal-back">
        <a href="/">← 施設基準 届出可否 診断トップへ</a>
      </p>
    </div>
  );
}
