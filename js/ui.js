export const NAV_ITEMS = [
  { id: "home", label: "🏠 Home" },
  { id: "lessons", label: "📚 Lessons" },
  { id: "dictionary", label: "📖 Dictionary" },
  { id: "practice", label: "🧠 Practice" },
  { id: "profile", label: "👤 Profile" }
];

export function renderNavigation(container, activeView) {
  const isDesktopNav = container.id === "desktop-nav";
  const isMobileNav = container.id === "mobile-nav";
  const isCollapsed = Boolean(container.closest(".sidebar")?.classList.contains("collapsed"));

  container.innerHTML = NAV_ITEMS
    .map((item) => {
      const iconOnly = isDesktopNav && isCollapsed;
      const shortLabel = item.label.split(" ")[0];
      const label = iconOnly ? shortLabel : item.label;

      if (isMobileNav) {
        const parts = item.label.split(" ");
        const icon = parts[0] || "";
        const text = parts.slice(1).join(" ") || item.id;
        return `<button class="nav-btn ${item.id === activeView ? "active" : ""}" data-nav="${item.id}" aria-label="${item.label}"><span class="nav-icon">${icon}</span><span class="nav-text">${text}</span></button>`;
      }

      return `<button class="nav-btn ${item.id === activeView ? "active" : ""}" data-nav="${item.id}" aria-label="${item.label}">${label}</button>`;
    })
    .join("");
}

export function renderProgressCircle(percent, size = 120) {
  const clamped = Math.max(0, Math.min(100, percent));
  const lineWidth = Math.max(70, Math.round(size));
  return `
    <div class="progress-inline" aria-label="Progress ${clamped}%">
      <span class="progress-inline-track" style="width:${lineWidth}px">
        <span class="progress-inline-fill" style="width:${clamped}%"></span>
        <span class="progress-inline-inside">${clamped}%</span>
      </span>
    </div>
  `;
}

const TEACHER_POSES = {
  "bad-job": {
    src: "assets/images/Bad_Job.png",
    title: "Teacher showing a bad job pose",
    badge: "💪 Keep trying",
    subtitle: "Nice effort. Let us improve together in the next round.",
    className: "teacher--bad-job"
  },
  "good-job": {
    src: "assets/images/Good_Job.png",
    title: "Teacher showing a good job pose",
    badge: "👍 Good job",
    subtitle: "Good job. Keep building your Assamese skills.",
    className: "teacher--good-job"
  },
  congratulations: {
    src: "assets/images/Congratulations.png",
    title: "Teacher celebrating a perfect result",
    badge: "🎉 Perfect score",
    subtitle: "Excellent job! You answered everything correctly.",
    className: "teacher--congratulations"
  }
};

const TEACHER_IMAGE_VERSION = "20260706-3";

function normalizeTeacherPose(expression, context) {
  if (expression === "congratulations" || expression === "good-job" || expression === "bad-job") {
    return expression;
  }

  if (expression === "sad") {
    return "bad-job";
  }

  if (expression === "happy" && context === "congrats") {
    return "congratulations";
  }

  return "good-job";
}

export function renderTeacherAvatar(expression = "good-job", context = "congrats", showCaption = true) {
  const poseKey = normalizeTeacherPose(expression, context);
  const pose = TEACHER_POSES[poseKey] || TEACHER_POSES["good-job"];
  const poseSrc = `${pose.src}?v=${TEACHER_IMAGE_VERSION}`;

  return `
    <section class="teacher-panel ${context === "summary" ? "summary" : "congrats"}" aria-label="Teacher avatar">
      <div class="teacher-avatar ${pose.className}" role="img" aria-label="${pose.title}">
        <img
          class="teacher-photo ${pose.className}"
          src="${poseSrc}"
          alt="${pose.title}"
          loading="eager"
          decoding="async"
        />
        <span class="teacher-mood-badge">${pose.badge}</span>
      </div>
      ${showCaption ? `<p class="teacher-caption">${pose.subtitle}</p>` : ""}
    </section>
  `;
}

export function toast(message, options = {}) {
  const { duration = 2200, actionLabel = "", onAction = null } = options;
  const template = document.getElementById("toast-template");
  if (!template) return;
  const node = template.content.firstElementChild.cloneNode(true);

  const text = document.createElement("span");
  text.textContent = message;
  node.appendChild(text);

  let timeoutId = null;
  const removeToast = () => {
    if (node.isConnected) node.remove();
  };

  if (actionLabel && typeof onAction === "function") {
    const actionBtn = document.createElement("button");
    actionBtn.type = "button";
    actionBtn.className = "toast-action";
    actionBtn.textContent = actionLabel;
    actionBtn.addEventListener("click", () => {
      if (timeoutId) clearTimeout(timeoutId);
      onAction();
      removeToast();
    });
    node.appendChild(actionBtn);
  }

  document.body.appendChild(node);
  timeoutId = setTimeout(removeToast, duration);
}

export function safeSpeak(text, lang = "as-IN") {
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.93;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function randomWordOfTheDay(entries, todayIso) {
  const seed = Number(todayIso.replace(/-/g, ""));
  const index = seed % entries.length;
  return entries[index];
}

export function drawConfetti() {
  const canvas = document.createElement("canvas");
  canvas.className = "confetti";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  const pieces = Array.from({ length: 90 }, () => ({
    x: Math.random() * canvas.width,
    y: -10,
    s: Math.random() * 8 + 4,
    v: Math.random() * 2 + 1,
    c: ["#4CAF50", "#FFC107", "#3F51B5", "#EF5350"][Math.floor(Math.random() * 4)]
  }));

  let frame = 0;
  const anim = () => {
    frame += 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach((p) => {
      p.y += p.v;
      p.x += Math.sin(frame / 12) * 0.9;
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x, p.y, p.s, p.s);
    });

    if (frame < 140) {
      requestAnimationFrame(anim);
    } else {
      canvas.remove();
    }
  };

  anim();
}
