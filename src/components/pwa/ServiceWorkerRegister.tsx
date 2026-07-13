"use client";

import { useEffect } from "react";

/** 앱 로드 시 서비스 워커를 등록한다 (PWA 설치 + 오프라인 캐시 + 푸시 수신). */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // 등록 실패는 앱 동작에 치명적이지 않으므로 무시
      });
    }
  }, []);

  return null;
}
