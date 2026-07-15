const CACHE_NAME = "assamese-survival-dictionary-v170";

const APP_SHELL = [
  "./",
  "./index.html",
  "./css/style.css?v=20260713-82",
  "./js/app.js?v=20260715-158",
  "./js/dictionary.js?v=20260710-45",
  "./js/lessons.js?v=20260715-01",
  "./js/flashcards.js?v=20260713-38",
  "./js/quiz.js?v=20260710-33",
  "./js/storage.js?v=20260713-38",
  "./js/ui.js?v=20260710-32",
  "./data/dictionary.json",
  "./data/lessons.json",
  "./manifest.webmanifest",
  "./assets/icons/icon-192.svg",
  "./assets/icons/icon-512.svg",
  "./assets/images/App Start Screen.png",
  "./assets/images/Kiss.png",
  "./assets/images/Tutor.png",
  "./assets/images/Come back soon.png",
  "./assets/images/Bad_Job.png",
  "./assets/images/Good_Job.png",
  "./assets/images/Congratulations.png",
  "./assets/vendor/chart.umd.min.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
          return null;
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;

  if (!isSameOrigin) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (requestUrl.pathname.startsWith("/api/")) {
    event.respondWith(fetch(event.request, { cache: "no-store" }));
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", clone));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === "opaque") {
            return response;
          }

          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
          return new Response("Offline", { status: 503, statusText: "Offline" });
        });
    })
  );
});
