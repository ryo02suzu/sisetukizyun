"use client";

import { useEffect } from "react";

// Service Worker を登録してオフライン動作・インストール（PWA）を有効化する。
// 本番（https / localhost）でのみ登録。判定・試算はクライアント完結のため、
// 一度開けば以降はオフラインでも利用できる。
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* 登録失敗は無視（オフライン非対応でも本体は動作） */
      });
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
