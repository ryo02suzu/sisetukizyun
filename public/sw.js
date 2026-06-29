// シンプルな Service Worker。アプリシェルをキャッシュし、オフラインでも判定・試算が動くようにする。
// 戦略：
//  - ナビゲーション（HTML）と静的アセットの GET は network-first → 失敗時 cache。
//  - 取得成功した GET は実行時キャッシュに保存（Next の hash 付きチャンクに対応）。
//  - POST（/api/explain 等）はキャッシュせずネットワークへ。
const CACHE = "shisetsu-kijun-v1";
const APP_SHELL = ["/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // POST等はそのまま
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 外部（厚労省PDF・LLM）はキャッシュしない

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === "navigate") {
          const shell = await caches.match("/");
          if (shell) return shell;
        }
        return new Response("オフラインです。一度オンラインで開くと、以降はオフラインでも利用できます。", {
          status: 503,
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      }),
  );
});
