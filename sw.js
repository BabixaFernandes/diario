// Service worker: guarda os ficheiros da app para funcionar sem internet.
// Sobe a versão sempre que mudares ficheiros, para forçar actualização.
const VERSAO = 'diario-v2';

const FICHEIROS = [
  './',
  './index.html',
  './app.css',
  './manifest.webmanifest',
  './icone.svg',
  './icone-maskable.svg',
  './js/app.js',
  './js/tema.js',
  './js/store.js',
  './js/ciclo.js',
  './js/data/plano.js',
  './js/data/alimentos.js',
  './js/vistas/treinos.js',
  './js/vistas/balanco.js',
  './js/vistas/ciclo.js',
  './js/vistas/calendario.js',
  './js/vistas/peso.js',
  './js/vistas/comida.js',
  './js/vistas/ementa.js',
  './js/vistas/definicoes.js',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches.open(VERSAO)
      .then((c) => c.addAll(FICHEIROS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (ev) => {
  if (ev.request.method !== 'GET') return;
  ev.respondWith(
    fetch(ev.request)
      .then((resposta) => {
        const copia = resposta.clone();
        caches.open(VERSAO).then((c) => c.put(ev.request, copia)).catch(() => { });
        return resposta;
      })
      .catch(() => caches.match(ev.request).then((r) => r || caches.match('./index.html')))
  );
});
