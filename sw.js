/**
 * MP3 Player - PWA Service Worker
 * 用於處理前端靜態資源的離線快取
 */

const CACHE_NAME = 'mp3player-v12';

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

// 3. 攔截請求：極速避開跨網域 Range 媒體請求 Bug
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 💡 關鍵修復：只要是跨來源請求（如 Google Drive docs.google.com），
  // Service Worker 徹底不予攔截、不予處理，直接 return 跳出！
  // 這能 100% 完美繞過瀏覽器在 Service Worker 內處理音訊分段 Range (206) 請求時引發的 CORS 阻擋 Bug！
  if (url.origin !== self.location.origin) {
    return; 
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request);
    })
  );
});