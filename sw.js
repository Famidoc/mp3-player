/**
 * KTV MP3 Player - PWA Service Worker
 * 用於處理前端靜態資源的離線快取
 */

const CACHE_NAME = 'mp3player-v2';

// 需要快取的靜態資源清單 (相對路徑以支援 GitHub Pages 的子目錄)
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

// 3. 攔截請求：優先讀取快取 (快取優先原則，音頻流與 API 則直接聯網)
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // 排除 Google Drive 的 MP3 音頻串流與 GAS 的 API 請求，避免 CORS 混亂或跨域快取失敗
  if (
    url.includes('docs.google.com') || 
    url.includes('googleusercontent') || 
    url.includes('script.google.com')
  ) {
    return; // 讓瀏覽器直接走標準網絡請求
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // 若有快取則使用快取，否則發送網絡請求
      return cachedResponse || fetch(event.request);
    })
  );
});