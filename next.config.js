/** @type {import('next').NextConfig} */

// セキュリティヘッダ（クリックジャッキング・MIMEスニッフィング・不要権限の抑止）。
// 注：strict な Content-Security-Policy は Next のインラインスクリプトを壊し得るため、
//     nonce 配信を整備するまで未導入（COMMERCIALIZATION.md に残課題として記載）。
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

module.exports = nextConfig;
