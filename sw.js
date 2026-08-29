/**
 * MP3 Player - PWA Service Worker
 * 用於處理前端靜態資源的離線快取
 */

const CACHE_NAME = 'mp3player-v15';

// 需要快取的靜態資源清單
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/vue@3.4.21/dist/vue.global.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js'
];

// 1. 安裝階段：強制寫入快取
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] 正在預先快取靜態資源...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. 啟用階段：清理舊版本的快取
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] 清理過期的舊快取:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. 攔截請求：極速避開跨網域 Range 媒體請求 Bug ＋ HTML 採用 Network-First
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 💡 關鍵修復：只要是跨來源請求（如 Google Drive docs.google.com），不予攔截
  if (url.origin !== self.location.origin) {
    return; 
  }

  // 💡 關鍵修復：針對主頁 HTML 與頁面導航，使用 Network-First 策略
  // 優先連線網路下載最新 HTML，失敗時（離線）才使用 Local Cache
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 靜態資源（CSS, JS, 圖片等）採用 Cache-First 提高載入速度
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request);
    })
  );
});