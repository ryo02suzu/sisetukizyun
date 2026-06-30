import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー ｜ 歯科 施設基準 届出可否 診断アプリ",
  description: "本ツールにおける情報の取扱いについて。",
};

// プライバシーポリシー。設計上の境界（入力は端末内localStorageのみ・サーバ非送信、
// AI解説時も基準名と判定結果のみ送信し患者情報・実績数値は送信しない）をUIから参照できる
// 形で明文化し、透明性と安全管理措置の説明を補う。
export default function PrivacyPage() {
  return (
    <div className="container legal-page">
      <p className="legal-back no-print">
        <a href="/">← アプリに戻る</a>
      </p>
      <h1>プライバシーポリシー</h1>
      <p className="legal-updated">最終更新日：2026-06-14</p>

      <section>
        <h2>1. 取得・保存する情報</h2>
        <p>
          本ツールの問診で入力された回答（設備・人員・体制・実績・研修に関する自院の状況、
          選択した管轄の地方厚生局）は、<strong>お使いのブラウザの端末内（localStorage）にのみ保存</strong>されます。
          これらはサーバーへ送信・収集されません。患者の個人情報・診療情報を入力する項目はありません。
        </p>
      </section>

      <section>
        <h2>2. サーバーへの送信（AI解説機能を使う場合のみ）</h2>
        <p>
          「解説を表示」を押してAI解説を生成する場合に限り、<strong>施設基準の名称・判定結果（可否区分）・
          不足要件や要確認のラベル</strong>のみを、解説文生成のためにサーバー経由でAIサービス（Anthropic）へ送信します。
          自院の実績件数・患者数などの数値や、その他の入力値は送信しません。AI解説を使わない場合、
          外部送信は発生しません。
        </p>
      </section>

      <section>
        <h2>3. Cookie・アクセス解析</h2>
        <p>
          本ツール自体は、トラッキングCookieや広告目的の計測を使用しません。ホスティング事業者
          （配信基盤）が、稼働・セキュリティのために標準的なアクセスログを取得する場合があります。
        </p>
      </section>

      <section>
        <h2>4. データの削除</h2>
        <p>
          保存された回答は、アプリ内の「回答をリセット」、またはブラウザの履歴・サイトデータの削除により消去できます。
          受付PC等の<strong>共用端末</strong>を使う場合は、利用後にリセットすることを推奨します。
        </p>
      </section>

      <section>
        <h2>5. 改定</h2>
        <p>本ポリシーは、機能変更等に応じて改定することがあります。</p>
      </section>

      <p className="legal-note">
        ※ 本ポリシーは公開情報をもとにした雛形であり、確定的な法的助言ではありません。
        商用提供にあたっては、内容を専門家が確認することを前提とします。
      </p>
      <p className="legal-back no-print">
        <a href="/">← アプリに戻る</a>
      </p>
    </div>
  );
}
