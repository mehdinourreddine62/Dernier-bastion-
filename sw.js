// « Service worker » : garde une copie du jeu sur l'appareil pour qu'il marche
// sans internet, et récupère automatiquement les nouvelles versions.
// La version vient de l'adresse d'enregistrement (sw.js?v=N, dans index.html) :
// augmenter ?v= partout suffit pour publier une mise à jour.

const VERSION = new URL(self.location).searchParams.get('v') || '0';
const CACHE = 'dernier-bastion-' + VERSION;

// Fichiers du jeu (les modules sont demandés avec ?v=VERSION)
const FILES = [
  'src/main.js', 'src/config.js', 'src/save.js', 'src/progress.js', 'src/achievements.js',
  'src/game/Game.js', 'src/game/Camera.js', 'src/game/Entity.js', 'src/game/Unit.js', 'src/game/Base.js',
  'src/game/Projectile.js', 'src/game/Spell.js', 'src/game/AI.js', 'src/game/Particles.js', 'src/game/Survival.js',
  'src/render/Renderer.js', 'src/render/sprites.js', 'src/render/background.js', 'src/render/bases.js', 'src/render/appIcon.js',
  'src/ui/HUD.js', 'src/ui/screens.js', 'src/ui/input.js', 'src/ui/widgets.js', 'src/ui/campaign.js',
  'src/ui/workshop.js', 'src/ui/tutorial.js',
  'src/audio/sfx.js', 'src/audio/music.js',
  'style.css',
].map((f) => f + '?v=' + VERSION)
  .concat(['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png']);

self.addEventListener('install', (e) => {
  // Copie de tous les fichiers ; la nouvelle version s'active tout de suite
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  // Supprime les copies des anciennes versions
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('dernier-bastion-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    // La page : d'abord internet (pour avoir la dernière version), sinon la copie
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put('index.html', copy));
        return res;
      }).catch(() => caches.match('index.html')),
    );
    return;
  }
  // Le reste : la copie si on l'a (les fichiers changent d'adresse à chaque version), sinon internet
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })),
  );
});
