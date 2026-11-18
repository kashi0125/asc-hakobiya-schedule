// 稼働予定表 サービスワーカー
// ・アプリ本体（同じサイト内のファイル）だけを保存。予定データ（Firebase）は保存しない
// ・ネットの最新版を優先。ただし1.5秒以内に届かなければ、保存してある本体ですぐ開く（裏で最新版に更新）
const CACHE = 'kadou-yotei-v4';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return; // Firebaseなど外部は素通し
  const net = fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  });
  e.waitUntil(net.catch(() => {}));
  const cached = () => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html'));
  e.respondWith(new Promise(resolve => {
    let done = false;
    const finish = r => { if (!done && r) { done = true; resolve(r); } };
    net.then(finish).catch(() => cached().then(r => { if (r) finish(r); else finish(Response.error()); }));
    setTimeout(() => cached().then(finish), 1500);   // 回線が遅いときは保存版で先に開く
  }));
});
