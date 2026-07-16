const CACHE_NAME = "assamese-survival-dictionary-v200";

const APP_SHELL = [
  "./",
  "./index.html",
  "./css/style.css?v=20260716-188",
  "./js/app.js?v=20260716-188",
  "./js/dictionary.js?v=20260710-45",
  "./js/lessons.js?v=20260715-07",
  "./js/flashcards.js?v=20260713-38",
  "./js/quiz.js?v=20260710-33",
  "./js/storage.js?v=20260715-41",
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
  "./assets/images/avatars/tiger.svg",
  "./assets/images/avatars/elephant.svg",
  "./assets/images/avatars/peacock.svg",
  "./assets/images/avatars/rhino.svg",
  "./assets/images/avatars/sloth-bear.svg",
  "./assets/images/avatars/nilgai.svg",
  "./assets/images/avatars/fox.svg",
  "./assets/images/avatars/langur.svg",
  "./assets/images/avatars/Peacock.png?v=20260716-188",
  "./assets/images/avatars/Peacock_Profile.png?v=20260716-188",
  "./assets/images/avatars/Monkey.png?v=20260716-188",
  "./assets/images/avatars/Monkey_Profile.png?v=20260716-188",
  "./assets/images/avatars/langur_monkey_clothed_same_style_full_body.png?v=20260716-188",
  "./assets/images/avatars/langur_monkey_clothed_same_style_profile.png?v=20260716-188",
  "./assets/images/avatars/langur_monkey_high_quality_same_style_full_body_no_background.png?v=20260716-188",
  "./assets/images/avatars/langur_monkey_high_quality_same_style_profile_no_background.png?v=20260716-188",
  "./assets/images/avatars/Bear.png?v=20260716-188",
  "./assets/images/avatars/Bear_Profile.png?v=20260716-188",
  "./assets/images/avatars/Rhino.png?v=20260716-188",
  "./assets/images/avatars/rani_rhino_one_horn_full_body.png?v=20260716-188",
  "./assets/images/avatars/rani_rhino_one_horn_clothed_full_body.png?v=20260716-188",
  "./assets/images/avatars/rani_rhino_one_horn_clothed_profile.png?v=20260716-188",
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
      fetch(event.request, { cache: "no-store" })
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", clone));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  const isCodeAsset = /\.(js|css)$/i.test(requestUrl.pathname);
  if (isCodeAsset) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then((response) => {
          if (!response || response.status !== 200 || response.type === "opaque") {
            return response;
          }

          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
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
