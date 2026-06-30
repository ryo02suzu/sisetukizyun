"use client";

// グローバルエラーバウンダリ。判定はクライアントのルールエンジンで動くため、
// 想定外の例外でも白画面にせず、再試行とトップ復帰の導線を出す。
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container legal-page">
      <h1>エラーが発生しました</h1>
      <p>
        処理中に問題が発生しました。お手数ですが、もう一度お試しください。
        繰り返し発生する場合は、ブラウザの再読み込みをお願いします。
      </p>
      {error?.digest && (
        <p className="legal-updated">エラーID: {error.digest}</p>
      )}
      <p className="actions">
        <button type="button" className="btn" onClick={() => reset()}>
          もう一度試す
        </button>
        <a className="btn ghost" href="/">
          トップへ戻る
        </a>
      </p>
    </div>
  );
}
