import {
  getProgress,
  saveProgress,
  getSettings,
  saveSettings,
  getFavorites,
  saveFavorites,
  getRecentActivity,
  saveRecentActivity,
  getSearchHistory,
  saveSearchHistory,
  getRecentWords,
  saveRecentWords,
  exportDataBundle,
  importDataBundle,
  resetAllData,
  todayIso
} from "./storage.js";
import {
  loadDictionary,
  filterDictionary,
  categoriesFromDictionary,
  renderDictionaryView,
  addCustomDictionaryWord,
  editDictionaryWord,
  deleteDictionaryWord,
  restoreDeletedDictionaryWord,
  resetDictionaryCache
} from "./dictionary.js";
import { loadLessons, renderLessonsOverview, renderLessonDetail, flattenLessonWords, resetLessonsCache } from "./lessons.js";
import { pickFlashcards, updateSpacedRepetition, shuffleCards, renderFlashcard, renderFlashSummary } from "./flashcards.js";
import { buildQuizQuestions, renderQuizView } from "./quiz.js";
import {
  NAV_ITEMS,
  renderNavigation,
  renderProgressCircle,
  toast,
  safeSpeak,
  randomWordOfTheDay,
  drawConfetti,
  renderTeacherAvatar
} from "./ui.js";

const AVATAR_REWARDS = [
  { value: "🦜", unlockLevel: 1 },
  { value: "🐯", unlockLevel: 1 },
  { value: "🦊", unlockLevel: 2 },
  { value: "🐼", unlockLevel: 3 },
  { value: "🦉", unlockLevel: 4 },
  { value: "🐘", unlockLevel: 5 },
  { value: "🐢", unlockLevel: 6 },
  { value: "🦋", unlockLevel: 7 },
  { value: "🐬", unlockLevel: 8 },
  { value: "🐙", unlockLevel: 9 },
  { value: "🦄", unlockLevel: 10 }
];

const state = {
  view: "home",
  practiceTab: "flashcards",
  lessonsScreen: "overview",
  lessons: [],
  dictionary: [],
  activeLessonId: null,
  activeLessonIndex: 0,
  dictionaryFilters: {
    query: "",
    category: "all",
    favoritesOnly: false
  },
  dictionaryEdit: {
    key: "",
    english: "",
    assamese: "",
    category: "Custom"
  },
  dictionaryPendingDelete: null,
  flash: {
    cards: [],
    index: 0,
    flipped: false,
    randomMode: false,
    mode: "session",
    reviewedCount: 0,
    sessionTotal: 0,
    hardCount: 0,
    easyCount: 0,
    hardWordIds: []
  },
  quiz: {
    questions: [],
    index: 0,
    score: 0,
    answered: false,
    selected: "",
    showCongrats: false,
    showSummary: false
  },
  chat: [
    {
      who: "bot",
      text: "Nomoskar! Type a message and I will reply with Assamese practice phrases.",
      translation: "Hello!"
    }
  ],
  progress: getProgress(),
  settings: getSettings(),
  favorites: getFavorites(),
  history: getRecentActivity(),
  searchHistory: getSearchHistory(),
  recentWords: getRecentWords(),
  chart: null,
  deferredInstallPrompt: null,
  onboarding: {
    isOpen: false,
    step: 1,
    name: "Learner",
    avatar: "🦜",
    dailyWordsTarget: 5,
    preferredTheme: "light"
  }
};

const dom = {
  appContent: document.getElementById("app-content"),
  mobileNav: document.getElementById("mobile-nav"),
  desktopNav: document.getElementById("desktop-nav"),
  sidebar: document.getElementById("sidebar"),
  welcomeName: document.getElementById("welcome-name"),
  themeToggle: document.getElementById("theme-toggle"),
  installBtn: document.getElementById("install-btn"),
  sidebarToggle: document.getElementById("sidebar-toggle")
};

function normalizeSettings() {
  state.settings.onboardingCompleted = Boolean(state.settings.onboardingCompleted);
  state.settings.profileName = state.settings.profileName || "Learner";
  const knownAvatars = AVATAR_REWARDS.map((item) => item.value);
  const defaultAvatar = knownAvatars[0] || "🦜";
  state.settings.avatar = knownAvatars.includes(state.settings.avatar) ? state.settings.avatar : defaultAvatar;
}

function persist() {
  saveProgress(state.progress);
  saveSettings(state.settings);
  saveFavorites(state.favorites);
  saveRecentActivity(state.history);
  saveSearchHistory(state.searchHistory);
  saveRecentWords(state.recentWords);
}

function addActivity(text) {
  state.history.unshift({
    text,
    at: new Date().toLocaleString()
  });
  state.history = state.history.slice(0, 20);
}

function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.settings.theme);
}

function updateHeaderControls() {
  const currentLevel = levelMetaFromXp(state.progress.xp).level;
  dom.themeToggle.textContent = state.settings.theme === "dark" ? "🌙" : "☀️";
  dom.welcomeName.innerHTML = `
    <span class="welcome-avatar" aria-label="Profile avatar ${state.settings.avatar}">
      <span class="welcome-avatar-glyph">${state.settings.avatar}</span>
      <span class="welcome-level-badge" aria-label="Level ${currentLevel}">${currentLevel}</span>
    </span>
    <span>${state.settings.profileName}</span>
  `;
}

function createOnboardingModal() {
  const container = document.createElement("section");
  container.id = "onboarding-modal";
  container.className = "onboarding hidden";
  container.setAttribute("role", "dialog");
  container.setAttribute("aria-modal", "true");
  container.setAttribute("aria-label", "Guided onboarding");
  container.innerHTML = `
    <div class="onboarding-shell glass" id="onboarding-shell"></div>
  `;
  document.body.appendChild(container);
}

function onboardingStepTemplate() {
  const step = state.onboarding.step;
  const shell = document.getElementById("onboarding-shell");
  if (!shell) return;

  const dots = [1, 2, 3]
    .map((index) => `<span class="dot ${index <= step ? "active" : ""}" aria-hidden="true"></span>`)
    .join("");

  if (step === 1) {
    shell.innerHTML = `
      <p class="eyebrow">Step 1 of 3</p>
      <h2>Welcome to Assamese Survival Dictionary</h2>
      <p class="meta">Let's personalize your learning path in under a minute.</p>
      <label for="onboarding-name" class="meta">What should we call you?</label>
      <input class="input" id="onboarding-name" value="${state.onboarding.name}" maxlength="30" aria-label="Your name" />
      <div class="onboarding-dots">${dots}</div>
      <div class="row">
        <button class="btn ghost" data-action="onboarding-skip">Skip</button>
        <button class="btn primary" data-action="onboarding-next">Next</button>
      </div>
    `;
    return;
  }

  if (step === 2) {
    const currentLevel = levelMetaFromXp(state.progress.xp).level;
    const avatarButtons = unlockedAvatars(currentLevel)
      .map(
        (avatar) =>
          `<button class="avatar-chip ${state.onboarding.avatar === avatar ? "selected" : ""}" data-action="onboarding-avatar" data-avatar="${avatar}" aria-label="Choose avatar ${avatar}">${avatar}</button>`
      )
      .join("");

    shell.innerHTML = `
      <p class="eyebrow">Step 2 of 3</p>
      <h2>Choose your avatar</h2>
      <p class="meta">Pick a learning buddy for your profile.</p>
      <div class="avatar-grid">${avatarButtons}</div>
      <div class="onboarding-dots">${dots}</div>
      <div class="row">
        <button class="btn ghost" data-action="onboarding-back">Back</button>
        <button class="btn primary" data-action="onboarding-next">Next</button>
      </div>
    `;
    return;
  }

  shell.innerHTML = `
    <p class="eyebrow">Step 3 of 3</p>
    <h2>Set your first goal</h2>
    <p class="meta">Choose a daily target and your preferred theme.</p>
    <label for="onboarding-daily-words" class="meta">Daily words target</label>
    <input class="input" id="onboarding-daily-words" type="number" min="1" max="30" value="${state.onboarding.dailyWordsTarget}" aria-label="Daily words target" />
    <div class="row" style="justify-content:flex-start;">
      <label class="pill"><input type="radio" name="onboarding-theme" value="light" ${state.onboarding.preferredTheme === "light" ? "checked" : ""} /> Light</label>
      <label class="pill"><input type="radio" name="onboarding-theme" value="dark" ${state.onboarding.preferredTheme === "dark" ? "checked" : ""} /> Dark</label>
    </div>
    <div class="onboarding-dots">${dots}</div>
    <div class="row">
      <button class="btn ghost" data-action="onboarding-back">Back</button>
      <button class="btn accent" data-action="onboarding-finish">Start Learning</button>
    </div>
  `;
}

function openOnboarding() {
  state.onboarding.isOpen = true;
  state.onboarding.step = 1;
  state.onboarding.name = state.settings.profileName || "Learner";
  state.onboarding.avatar = state.settings.avatar || "🦜";
  state.onboarding.dailyWordsTarget = state.progress.dailyGoal.targetWords || 5;
  state.onboarding.preferredTheme = state.settings.theme || "light";

  const modal = document.getElementById("onboarding-modal");
  if (!modal) return;
  modal.classList.remove("hidden");
  document.body.classList.add("lock-scroll");
  onboardingStepTemplate();
}

function closeOnboarding() {
  state.onboarding.isOpen = false;
  const modal = document.getElementById("onboarding-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  document.body.classList.remove("lock-scroll");
}

function finishOnboarding() {
  const cleanName = (state.onboarding.name || "Learner").trim() || "Learner";
  const dailyWords = Math.max(1, Math.min(30, Number(state.onboarding.dailyWordsTarget) || 5));

  state.settings.profileName = cleanName;
  state.settings.avatar = state.onboarding.avatar;
  state.settings.theme = state.onboarding.preferredTheme;
  state.settings.onboardingCompleted = true;

  state.progress.dailyGoal.targetWords = dailyWords;

  applyTheme();
  updateHeaderControls();
  persist();
  closeOnboarding();
  renderCurrentView();
  toast(`Welcome, ${cleanName}!`);
}

function xpGain(amount, reason) {
  state.progress.xp += amount;
  updateHeaderControls();
  addActivity(`+${amount} XP: ${reason}`);
  if (state.settings.animations) toast(`+${amount} XP`);
}

function updateTopbarVisibility() {
  document.body.classList.toggle("hide-topbar", state.view !== "home");
}

function setView(view) {
  state.view = view;
  updateTopbarVisibility();
  document.querySelectorAll(".view").forEach((node) => node.classList.remove("active"));
  document.getElementById(`view-${view}`)?.classList.add("active");
  renderNavigation(dom.mobileNav, view);
  renderNavigation(dom.desktopNav, view);
  renderCurrentView();
}

async function ensureData() {
  if (!state.dictionary.length) {
    state.dictionary = await loadDictionary();
  }
  if (!state.lessons.length) {
    state.lessons = await loadLessons();
  }
}

function homeCompletionPercent() {
  const goals = state.progress.dailyGoal;
  const parts = [
    Math.min(goals.learnedWords / goals.targetWords, 1),
    Math.min(goals.flashcardsDone / goals.flashcardsTarget, 1),
    Math.min(goals.lessonsDone / goals.lessonsTarget, 1),
    Math.min(goals.quizDone / goals.quizTarget, 1)
  ];
  return Math.round((parts.reduce((sum, value) => sum + value, 0) / parts.length) * 100);
}

function updateStreak() {
  const today = todayIso();
  const last = state.progress.lastActiveDate;

  if (last === today) return;

  if (!last) {
    state.progress.streak = Math.max(1, state.progress.streak);
  } else {
    const dayMs = 24 * 60 * 60 * 1000;
    const diffDays = Math.round((new Date(today).getTime() - new Date(last).getTime()) / dayMs);
    state.progress.streak = diffDays === 1 ? state.progress.streak + 1 : 1;
  }

  state.progress.longestStreak = Math.max(state.progress.streak, state.progress.longestStreak);
  state.progress.lastActiveDate = today;
}

function buildQuickCards() {
  return [
    { id: "lessons", title: "Lessons", subtitle: "Scenario based units" },
    { id: "dictionary", title: "Dictionary", subtitle: "Search full vocabulary" },
    { id: "flashcards", title: "Flashcards", subtitle: "Spaced repetition" },
    { id: "quiz", title: "Quiz", subtitle: "Challenge mode" },
    { id: "conversation", title: "Conversation", subtitle: "Chat practice" }
  ];
}

function learnedWordsCount() {
  return new Set((state.progress.wordsLearned || []).filter(Boolean)).size;
}

function levelMetaFromXp(xp) {
  const safeXp = Math.max(0, Number(xp) || 0);

  let level = 1;
  let minXp = 0;
  let maxXp = 1000;

  while (level < 10 && safeXp > maxXp) {
    level += 1;
    minXp = maxXp + 1;
    maxXp += level * 1000;
  }

  return {
    level,
    minXp,
    maxXp
  };
}

function avatarUnlockLevel(avatar) {
  const reward = AVATAR_REWARDS.find((item) => item.value === avatar);
  return reward?.unlockLevel || 1;
}

function isAvatarUnlocked(avatar, level) {
  return level >= avatarUnlockLevel(avatar);
}

function unlockedAvatars(level) {
  return AVATAR_REWARDS.filter((item) => item.unlockLevel <= level).map((item) => item.value);
}

function xpNeededForNextLevel(xp) {
  const safeXp = Math.max(0, Number(xp) || 0);
  const meta = levelMetaFromXp(safeXp);

  if (meta.level >= 10) return 0;
  return Math.max(0, meta.maxXp - safeXp + 1);
}

function renderHome() {
  const home = document.getElementById("view-home");
  const progressPercent = homeCompletionPercent();
  const learnedCount = learnedWordsCount();
  const wordDay = randomWordOfTheDay(state.dictionary, todayIso());
  const quickCards = buildQuickCards()
    .map(
      (card) => `
        <article class="quick-card" data-action="quick-open" data-target="${card.id}">
          <h4>${card.title}</h4>
          <p>${card.subtitle}</p>
        </article>
      `
    )
    .join("");

  home.innerHTML = `
    <section class="grid" style="gap:14px">
      <article class="card grid" style="gap:12px; background: linear-gradient(150deg, rgba(76,175,80,0.2), rgba(63,81,181,0.15));">
        <div class="row">
          <div>
            <h3>Continue Learning</h3>
            <p class="meta">${learnedCount} words learned so far</p>
          </div>
          <button class="btn primary" data-action="continue-learning">Resume</button>
        </div>
        <div class="grid auto">
          <div class="stat"><span class="label">Current streak</span><span class="value">${state.progress.streak} 🔥</span></div>
          <div class="stat"><span class="label">XP</span><span class="value">${state.progress.xp}</span></div>
          <div class="stat"><span class="label">Words learned</span><span class="value">${learnedCount}</span></div>
          <div class="stat daily-goal-stat">
            <span class="label">Daily goal</span>
            <span class="value">${renderProgressCircle(progressPercent, 88)}</span>
          </div>
        </div>
      </article>

      <article class="card">
        <h3>Quick Access</h3>
        <div class="grid auto" style="margin-top:12px">${quickCards}</div>
      </article>

      <article class="card">
        <h3>Word Of The Day</h3>
        <p><strong>${wordDay.assamese}</strong> · ${wordDay.english}</p>
        <p class="meta">${wordDay.example}</p>
      </article>
    </section>
  `;
}

function renderLessons() {
  const panel = document.getElementById("view-lessons");

  if (state.lessonsScreen === "congrats") {
    const lesson = state.lessons.find((item) => item.id === state.activeLessonId) || null;
    if (!lesson) {
      state.lessonsScreen = "overview";
      renderLessons();
      return;
    }

    panel.classList.add("lesson-focus");
    document.body.classList.add("lesson-immersive");
    panel.innerHTML = `
      <section class="grid lesson-screen" style="gap:14px">
        <article class="card lesson-congrats">
          <p class="eyebrow">Lesson Complete</p>
          <h2>Congratulations!</h2>
          <p class="meta">You completed ${lesson.title}.</p>
          ${renderTeacherAvatar("good-job", "congrats")}
          <p>Bohut bhal! Keep going with your next Assamese lesson.</p>
          <div class="row" style="justify-content:center; flex-wrap: wrap; margin-top:6px;">
            <button class="btn accent" data-action="lesson-congrats-overview">Back to lessons</button>
            <button class="btn ghost" data-action="lesson-congrats-review">Review lesson</button>
          </div>
        </article>
      </section>
    `;
    return;
  }

  if (state.lessonsScreen === "overview") {
    const favoriteLessons = state.lessons.filter((lesson) => state.favorites.lessons.includes(lesson.id));
    const favoritesArea = favoriteLessons.length
      ? renderLessonsOverview(favoriteLessons, state.progress, state.activeLessonId, state.favorites)
      : "<p class='meta'>No favorite lessons yet. Tap ☆ on a lesson to add it here.</p>";

    panel.classList.remove("lesson-focus");
    document.body.classList.remove("lesson-immersive");
    panel.innerHTML = `
      <section class="grid" style="gap:14px">
        <article class="card">
          <h3>Favorite Lessons</h3>
          <p class="meta">Your starred lessons only.</p>
          <div style="margin-top:10px">${favoritesArea}</div>
        </article>

        <article class="card">
          <h3>Lesson Categories</h3>
          <p class="meta">Choose a lesson to open its dedicated learning screen.</p>
          <div style="margin-top:10px">${renderLessonsOverview(state.lessons, state.progress, state.activeLessonId, state.favorites)}</div>
        </article>
      </section>
    `;
    return;
  }

  const lesson = state.lessons.find((item) => item.id === state.activeLessonId) || null;
  if (!lesson) {
    state.lessonsScreen = "overview";
    renderLessons();
    return;
  }

  panel.classList.add("lesson-focus");
  document.body.classList.add("lesson-immersive");

  const activeWord = lesson.items[state.activeLessonIndex] || lesson.items[0];
  const detail = renderLessonDetail(
    lesson,
    state.activeLessonIndex,
    state.progress,
    state.favorites.words.includes(activeWord?.id)
  );

  panel.innerHTML = `
    <section class="grid lesson-screen" style="gap:14px">
      ${detail}
    </section>
  `;
}

function renderDictionary() {
  const panel = document.getElementById("view-dictionary");
  const categories = categoriesFromDictionary(state.dictionary);
  const filtered = filterDictionary(state.dictionary, {
    ...state.dictionaryFilters,
    favoriteIds: state.favorites.words
  });
  panel.innerHTML = renderDictionaryView({
    entries: filtered,
    categories,
    filters: state.dictionaryFilters,
    favorites: state.favorites,
    searchHistory: state.searchHistory,
    editDraft: state.dictionaryEdit
  });
}

function renderDictionaryPreserveSearchCaret() {
  const searchEl = document.getElementById("dictionary-search");
  const hadFocus = document.activeElement === searchEl;
  const start = searchEl?.selectionStart ?? null;
  const end = searchEl?.selectionEnd ?? null;

  renderDictionary();

  if (!hadFocus) return;

  const nextSearchEl = document.getElementById("dictionary-search");
  if (!nextSearchEl) return;
  nextSearchEl.focus();

  if (start !== null && end !== null) {
    nextSearchEl.setSelectionRange(start, end);
  }
}

function refreshLanguageData() {
  resetDictionaryCache();
  resetLessonsCache();
  state.dictionary = [];
  state.lessons = [];
}

function ensureFlashDeck() {
  if (state.flash.cards.length) return;
  const words = flattenLessonWords(state.lessons);
  state.flash.cards = pickFlashcards(words, state.progress, 40);
  state.flash.index = 0;
  state.flash.flipped = false;
  state.flash.mode = "session";
  state.flash.reviewedCount = 0;
  state.flash.sessionTotal = state.flash.cards.length;
  state.flash.hardCount = 0;
  state.flash.easyCount = 0;
  state.flash.hardWordIds = [];
}

function renderConversationPanel() {
  const bubbles = state.chat
    .map(
      (msg) => `
      <div class="chat-bubble ${msg.who}">
        <p>${msg.text}</p>
        ${msg.translation ? `<p class="meta">${msg.translation}</p>` : ""}
      </div>
    `
    )
    .join("");

  return `
    <article class="card grid">
      <h3>Conversation Practice</h3>
      <div class="chat-panel" id="chat-panel">${bubbles}</div>
      <div class="row">
        <input id="chat-input" class="input" placeholder="Type: Hello / How are you?" aria-label="Chat input" />
        <button class="btn accent" data-action="chat-send">Send</button>
      </div>
      <div class="row" style="flex-wrap: wrap;">
        <button class="btn ghost" data-action="chat-voice">Voice Input</button>
      </div>
    </article>
  `;
}

function renderPractice() {
  ensureFlashDeck();

  if (!state.quiz.questions.length) {
    state.quiz.questions = buildQuizQuestions(state.dictionary, 10);
  }

  const currentIndex = Math.min(state.flash.cards.length - 1, Math.max(0, state.flash.index));
  const currentFlash = state.flash.cards[currentIndex];

  const currentQuestion = state.quiz.showCongrats || state.quiz.showSummary ? null : state.quiz.questions[state.quiz.index];

  const panel = document.getElementById("view-practice");
  panel.innerHTML = `
    <section class="grid" style="gap:14px">
      <article class="card row" style="flex-wrap:wrap;">
        <h3>Practice Hub</h3>
        <div class="row" style="flex-wrap: wrap;">
          <button class="btn ${state.practiceTab === "flashcards" ? "primary" : "ghost"}" data-action="practice-tab" data-tab="flashcards">Flashcards</button>
          <button class="btn ${state.practiceTab === "quiz" ? "primary" : "ghost"}" data-action="practice-tab" data-tab="quiz">Quiz</button>
          <button class="btn ${state.practiceTab === "conversation" ? "primary" : "ghost"}" data-action="practice-tab" data-tab="conversation">Conversation</button>
        </div>
      </article>
      ${
        state.practiceTab === "flashcards"
          ? state.flash.mode === "summary"
            ? renderFlashSummary({
                total: state.flash.sessionTotal,
                hardCount: state.flash.hardCount,
                easyCount: state.flash.easyCount,
                hasHardWords: state.flash.hardWordIds.length > 0
              })
            : renderFlashcard(currentFlash, state.flash.flipped, state.flash.reviewedCount, state.flash.sessionTotal)
          : ""
      }
      ${
        state.practiceTab === "quiz"
          ? renderQuizView({
              question: currentQuestion,
              total: state.quiz.questions.length,
              score: state.quiz.score,
              answered: state.quiz.answered,
              selected: state.quiz.selected,
              showCongrats: state.quiz.showCongrats,
              showSummary: state.quiz.showSummary
            })
          : ""
      }
      ${state.practiceTab === "conversation" ? renderConversationPanel() : ""}
    </section>
  `;
}

function renderAchievements() {
  const earned = new Set(state.progress.achievements);
  const candidates = [
    { id: "first-word", label: "First Word", check: () => state.progress.wordsLearned.length >= 1 },
    { id: "ten-words", label: "Word Collector", check: () => state.progress.wordsLearned.length >= 10 },
    { id: "first-quiz", label: "Quiz Starter", check: () => state.progress.quizAttempts >= 1 },
    { id: "xp-100", label: "XP Rookie", check: () => state.progress.xp >= 100 }
  ];

  candidates.forEach((item) => {
    if (item.check()) earned.add(item.id);
  });

  state.progress.achievements = [...earned];

  return candidates
    .map((item) => `<div class="achievement"><h4>${item.label}</h4><p>${earned.has(item.id) ? "Unlocked" : "Locked"}</p></div>`)
    .join("");
}

function renderProfile() {
  const panel = document.getElementById("view-profile");
  const accuracy = state.progress.quizAttempts
    ? Math.round((state.progress.quizCorrect / state.progress.quizAttempts) * 100)
    : 0;
  const currentLevel = levelMetaFromXp(state.progress.xp).level;
  const xpToNextLevel = xpNeededForNextLevel(state.progress.xp);
  const nextLevelCopy = xpToNextLevel === 0 ? "Max level reached" : `${xpToNextLevel} XP to next level`;
  const avatarChips = AVATAR_REWARDS.map((item) => {
    const isCurrent = state.settings.avatar === item.value;
    const unlocked = isAvatarUnlocked(item.value, currentLevel) || isCurrent;
    const lockNote = unlocked ? "" : `<span class="avatar-lock">L${item.unlockLevel}</span>`;
    const lockTitle = unlocked ? "" : `title="Unlocks at Level ${item.unlockLevel}"`;

    return `<button class="avatar-chip ${isCurrent ? "selected" : ""} ${unlocked ? "" : "locked"}" data-action="profile-avatar" data-avatar="${item.value}" aria-label="Set avatar ${item.value}" ${lockTitle}>${item.value}${lockNote}</button>`;
  }).join("");

  panel.innerHTML = `
    <section class="grid" style="gap:14px">
      <article class="card row" style="align-items:flex-start; flex-wrap: wrap;">
        <div>
          <h3>👤 Learner Profile</h3>
          <p class="meta">Achievements, settings, export/import, and statistics.</p>
        </div>
        <div class="pill">Avatar: ${state.settings.avatar}</div>
      </article>

      <article class="card grid">
        <h3>Avatar Customization</h3>
        <p class="meta">Update your display name and unlock new avatars as you level up.</p>
        <label for="profile-name" class="meta">Display name</label>
        <input id="profile-name" class="input" value="${state.settings.profileName}" maxlength="30" aria-label="Display name" />
        <div class="avatar-grid">
          ${avatarChips}
        </div>
      </article>

      <article class="card grid auto">
        <div class="stat"><span class="label">Level Progress</span><span class="value">${nextLevelCopy}</span></div>
        <div class="stat"><span class="label">Lessons completed</span><span class="value">${state.progress.lessonsCompleted.length}</span></div>
        <div class="stat"><span class="label">Words learned</span><span class="value">${state.progress.wordsLearned.length}</span></div>
        <div class="stat"><span class="label">Quiz accuracy</span><span class="value">${accuracy}%</span></div>
        <div class="stat"><span class="label">Longest streak</span><span class="value">${state.progress.longestStreak}</span></div>
      </article>

      <article class="card">
        <h3>Achievements</h3>
        <div class="grid auto" style="margin-top:10px">${renderAchievements()}</div>
      </article>

      <article class="card grid">
        <h3>Settings</h3>
        <label class="pill"><input type="checkbox" id="setting-notifications" ${state.settings.notifications ? "checked" : ""} /> Notifications</label>
        <div class="row" style="flex-wrap: wrap;">
          <button class="btn ghost" data-action="export-data">Export Data</button>
          <label class="btn ghost" for="import-data-input" style="display:inline-flex; align-items:center;">Import Data</label>
          <input class="hidden" id="import-data-input" type="file" accept="application/json" />
          <button class="btn danger" data-action="reset-progress">Reset progress</button>
        </div>
      </article>
    </section>
  `;

}

function renderChart() {
  const canvas = document.getElementById("stats-chart");
  if (!canvas || !window.Chart) return;

  const ctx = canvas.getContext("2d");
  state.chart?.destroy();
  state.chart = new window.Chart(ctx, {
    type: "bar",
    data: {
      labels: ["XP", "Words", "Lessons", "Streak"],
      datasets: [
        {
          data: [
            state.progress.xp,
            state.progress.wordsLearned.length,
            state.progress.lessonsCompleted.length,
            state.progress.streak
          ],
          backgroundColor: ["#4CAF50", "#FFC107", "#3F51B5", "#EF5350"]
        }
      ]
    },
    options: {
      plugins: { legend: { display: false } },
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } }
    }
  });
}

async function renderCurrentView() {
  const activePanel = document.getElementById(`view-${state.view}`);
  if ((!state.dictionary.length || !state.lessons.length) && activePanel) {
    activePanel.innerHTML = `
      <section class="grid">
        <div class="skeleton"></div>
        <div class="skeleton"></div>
        <div class="skeleton"></div>
      </section>
    `;
  }

  await ensureData();

  if (state.view === "home") renderHome();
  if (state.view === "lessons") renderLessons();
  if (state.view === "dictionary") renderDictionary();
  if (state.view === "practice") renderPractice();
  if (state.view === "profile") renderProfile();
}

function toggleFavoriteWord(id) {
  const list = state.favorites.words;
  const index = list.indexOf(id);
  if (index >= 0) list.splice(index, 1);
  else list.push(id);
}

function chatbotReply(input) {
  const text = input.trim().toLowerCase();
  const patterns = [
    { keys: ["hello", "hi", "nomoskar"], answer: ["Nomoskar!", "Hello!"] },
    { keys: ["how are you", "ki khobor"], answer: ["Mur bhal! Tumar?", "I am fine! And you?"] },
    { keys: ["thank", "dhonnobad"], answer: ["Apunak dhonnobad!", "Thank you too!"] },
    { keys: ["hungry"], answer: ["Moi bhukat lagise.", "I am hungry."] },
    { keys: ["thirsty"], answer: ["Moi piasa lagise.", "I am thirsty."] }
  ];

  const found = patterns.find((item) => item.keys.some((key) => text.includes(key)));
  return found || { answer: ["Aru kobo? Let's keep practicing Assamese.", "Tell me more."] };
}

function addRecentWord(wordId) {
  state.recentWords = [wordId, ...state.recentWords.filter((id) => id !== wordId)].slice(0, 20);
}

function onClick(event) {
  const target = event.target;
  const actionTarget = target.closest("[data-action]");
  const action = actionTarget?.dataset.action;
  const actionSource = actionTarget || target;
  const wordCard = target.closest("[data-word-id]");

  if (wordCard) {
    addRecentWord(wordCard.dataset.wordId);
    persist();
  }

  if (target.dataset.nav) {
    setView(target.dataset.nav);
    return;
  }

  if (!action) {
    if (target.closest("#flash-card")) {
      state.flash.flipped = !state.flash.flipped;
      renderPractice();
    }
    return;
  }

  if (action === "apply-history") {
    state.dictionaryFilters.query = actionSource.dataset.query || "";
    renderDictionary();
    return;
  }

  if (action === "dictionary-add-word") {
    const english = document.getElementById("new-word-english")?.value || "";
    const assamese = document.getElementById("new-word-assamese")?.value || "";
    const category = document.getElementById("new-word-category")?.value || "Custom";
    const exampleAssamese = document.getElementById("new-word-example-assamese")?.value || "";
    const exampleEnglish = document.getElementById("new-word-example-english")?.value || "";

    const result = addCustomDictionaryWord({ english, assamese, category, exampleAssamese, exampleEnglish });
    if (!result.ok) {
      toast(result.reason === "duplicate" ? "That word pair already exists" : "Please enter both English and Assamese");
      return;
    }

    refreshLanguageData();
    state.dictionaryEdit = {
      key: "",
      english: "",
      assamese: "",
      category: "Custom"
    };
    renderCurrentView();
    toast("New word added");
    return;
  }

  if (action === "dictionary-edit-word") {
    const key = actionSource.dataset.key || "";
    const current = state.dictionary.find((entry) => encodeURIComponent(entry.__baseKey || "") === key);
    if (!current) {
      toast("Word not found");
      return;
    }
    state.dictionaryEdit = {
      key,
      english: current.english || "",
      assamese: current.assamese || "",
      category: current.category || "Custom"
    };
    renderDictionary();
    return;
  }

  if (action === "dictionary-save-edit") {
    const key = state.dictionaryEdit.key;
    if (!key) return;

    const result = editDictionaryWord(key, {
      english: state.dictionaryEdit.english,
      assamese: state.dictionaryEdit.assamese,
      category: state.dictionaryEdit.category
    });

    if (!result.ok) {
      toast(result.reason === "duplicate" ? "That word pair already exists" : "Unable to edit word");
      return;
    }

    refreshLanguageData();
    state.dictionaryEdit = {
      key: "",
      english: "",
      assamese: "",
      category: "Custom"
    };
    renderCurrentView();
    toast("Word updated");
    return;
  }

  if (action === "dictionary-cancel-edit") {
    state.dictionaryEdit = {
      key: "",
      english: "",
      assamese: "",
      category: "Custom"
    };
    renderDictionary();
    return;
  }

  if (action === "dictionary-delete-word") {
    const key = actionSource.dataset.key || "";
    const deletedEntry = state.dictionary.find((entry) => encodeURIComponent(entry.__baseKey || "") === key);
    if (!deletedEntry) {
      toast("Word not found");
      return;
    }

    const result = deleteDictionaryWord(key);
    if (!result.ok) {
      toast("Unable to delete word");
      return;
    }

    const token = Date.now();
    state.dictionaryPendingDelete = {
      token,
      entry: { ...deletedEntry }
    };

    refreshLanguageData();
    if (state.dictionaryEdit.key === key) {
      state.dictionaryEdit = {
        key: "",
        english: "",
        assamese: "",
        category: "Custom"
      };
    }
    renderCurrentView();
    toast("Word deleted", {
      actionLabel: "Undo",
      duration: 5000,
      onAction: () => {
        if (!state.dictionaryPendingDelete || state.dictionaryPendingDelete.token !== token) return;

        const undoResult = restoreDeletedDictionaryWord(state.dictionaryPendingDelete.entry);
        if (!undoResult.ok) {
          toast("Unable to undo delete");
          return;
        }

        state.dictionaryPendingDelete = null;
        refreshLanguageData();
        renderCurrentView();
        toast("Deletion undone");
      }
    });

    setTimeout(() => {
      if (state.dictionaryPendingDelete?.token === token) {
        state.dictionaryPendingDelete = null;
      }
    }, 5200);
    return;
  }

  if (action === "onboarding-avatar") {
    state.onboarding.avatar = actionSource.dataset.avatar || state.onboarding.avatar;
    onboardingStepTemplate();
    return;
  }

  if (action === "onboarding-next") {
    state.onboarding.step = Math.min(3, state.onboarding.step + 1);
    onboardingStepTemplate();
    return;
  }

  if (action === "onboarding-back") {
    state.onboarding.step = Math.max(1, state.onboarding.step - 1);
    onboardingStepTemplate();
    return;
  }

  if (action === "onboarding-skip") {
    state.settings.onboardingCompleted = true;
    persist();
    closeOnboarding();
    return;
  }

  if (action === "onboarding-finish") {
    finishOnboarding();
    return;
  }

  if (action === "profile-avatar") {
    const avatar = actionSource.dataset.avatar || state.settings.avatar;
    const currentLevel = levelMetaFromXp(state.progress.xp).level;

    if (!isAvatarUnlocked(avatar, currentLevel)) {
      toast(`Unlock this avatar at Level ${avatarUnlockLevel(avatar)}`);
      return;
    }

    state.settings.avatar = avatar;
    updateHeaderControls();
    persist();
    renderProfile();
    return;
  }

  if (action === "quick-open") {
    const targetView = actionSource.dataset.target;
    if (["home", "lessons", "dictionary", "practice", "profile"].includes(targetView)) {
      setView(targetView);
    } else if (["flashcards", "quiz", "conversation"].includes(targetView)) {
      state.practiceTab = targetView === "flashcards" ? "flashcards" : targetView;
      setView("practice");
    } else if (targetView === "favorites") {
      const hasFavoriteLessons = state.favorites.lessons.length > 0;
      const hasFavoriteWords = state.favorites.words.length > 0;

      if (hasFavoriteLessons) {
        state.lessonsScreen = "overview";
        setView("lessons");
      } else {
        state.dictionaryFilters.favoritesOnly = true;
        if (!hasFavoriteWords) {
          state.dictionaryFilters.query = "";
        }
        setView("dictionary");
      }
    }
    return;
  }

  if (action === "continue-learning") {
    setView("lessons");
    return;
  }

  if (action === "open-lesson") {
    state.activeLessonId = actionSource.dataset.lesson;
    state.activeLessonIndex = 0;
    state.lessonsScreen = "detail";
    renderLessons();
    return;
  }

  if (action === "restart-lesson") {
    state.activeLessonId = actionSource.dataset.lesson;
    state.activeLessonIndex = 0;
    state.lessonsScreen = "detail";
    renderLessons();
    return;
  }

  if (action === "lesson-back") {
    state.lessonsScreen = "overview";
    renderLessons();
    return;
  }

  if (action === "lesson-congrats-overview") {
    state.lessonsScreen = "overview";
    renderLessons();
    return;
  }

  if (action === "lesson-congrats-review") {
    state.lessonsScreen = "detail";
    state.activeLessonIndex = 0;
    renderLessons();
    return;
  }

  if (action === "lesson-jump") {
    const nextIndex = Number(actionSource.dataset.index);
    if (Number.isFinite(nextIndex)) {
      state.activeLessonIndex = nextIndex;
      renderLessons();
    }
    return;
  }

  if (action === "lesson-prev") {
    state.activeLessonIndex = Math.max(0, state.activeLessonIndex - 1);
    renderLessons();
    return;
  }

  if (action === "lesson-next") {
    const lesson = state.lessons.find((item) => item.id === state.activeLessonId);
    if (!lesson) return;
    state.activeLessonIndex = Math.min(lesson.items.length - 1, state.activeLessonIndex + 1);
    renderLessons();
    return;
  }

  if (action === "mark-learned") {
    const wordId = actionSource.dataset.word;
    if (!wordId) {
      toast("This lesson item cannot be marked as learned");
      return;
    }

    let didChange = false;
    let lessonJustCompleted = false;

    // Normalize persisted state before updating counters.
    state.progress.wordsLearned = [...new Set((state.progress.wordsLearned || []).filter(Boolean))];

    if (!state.progress.wordsLearned.includes(wordId)) {
      state.progress.wordsLearned.push(wordId);
      state.progress.dailyGoal.learnedWords += 1;
      xpGain(12, "Learned a new word");
      addActivity(`Learned word ${wordId}`);
      addRecentWord(wordId);
      didChange = true;
    }

    const lesson = state.lessons.find((item) => item.id === state.activeLessonId);
    if (lesson) {
      const allLessonWordsLearned = lesson.items.every((item) => state.progress.wordsLearned.includes(item.id));

      if (allLessonWordsLearned && !state.progress.lessonsCompleted.includes(lesson.id)) {
        state.progress.lessonsCompleted.push(lesson.id);
        state.progress.dailyGoal.lessonsDone += 1;
        xpGain(30, `Completed lesson ${lesson.title}`);
        if (state.settings.animations) drawConfetti();
        didChange = true;
        lessonJustCompleted = true;
      }
    }

    if (didChange) persist();

    if (lessonJustCompleted) {
      state.lessonsScreen = "congrats";
      renderLessons();
      renderHome();
      return;
    }

    if (lesson) {
      state.activeLessonIndex = Math.min(lesson.items.length - 1, state.activeLessonIndex + 1);
    }

    renderLessons();
    renderHome();
    return;
  }

  if (action === "favorite-word") {
    toggleFavoriteWord(actionSource.dataset.id);
    persist();
    renderCurrentView();
    return;
  }

  if (action === "favorite-lesson") {
    const lessonId = actionSource.dataset.lesson;
    const list = state.favorites.lessons;
    const idx = list.indexOf(lessonId);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(lessonId);
    persist();
    toast("Lesson favorites updated");
    if (state.view === "lessons") renderLessons();
    return;
  }

  if (action === "speak") {
    safeSpeak(actionSource.dataset.text, actionSource.dataset.lang || "as-IN");
    return;
  }

  if (action === "copy") {
    navigator.clipboard?.writeText(actionSource.dataset.text || "");
    toast("Copied to clipboard");
    return;
  }

  if (action === "practice-tab") {
    const nextTab = actionSource.dataset.tab;
    if (!nextTab || nextTab === state.practiceTab) return;
    state.practiceTab = nextTab;
    renderPractice();
    return;
  }

  if (action === "flash-grade") {
    if (state.flash.mode === "summary") return;
    const current = state.flash.cards[state.flash.index];
    if (!current) return;
    const grade = actionSource.dataset.grade;
    updateSpacedRepetition(state.progress, current.id, grade);

    if (grade === "hard") {
      state.flash.hardCount += 1;
      if (!state.flash.hardWordIds.includes(current.id)) {
        state.flash.hardWordIds.push(current.id);
      }
    }
    if (grade === "easy") {
      state.flash.easyCount += 1;
    }

    state.flash.reviewedCount += 1;
    state.progress.dailyGoal.flashcardsDone += 1;
    xpGain(4, "Flashcard review");
    state.flash.flipped = false;

    if (state.flash.reviewedCount >= state.flash.sessionTotal) {
      state.flash.mode = "summary";
      state.flash.randomMode = false;
      persist();
      renderPractice();
      return;
    }

    if (state.flash.randomMode) {
      state.flash.index = Math.floor(Math.random() * state.flash.cards.length);
    } else {
      state.flash.index = Math.min(state.flash.cards.length - 1, state.flash.index + 1);
    }

    persist();
    renderPractice();
    return;
  }

  if (action === "flash-shuffle") {
    state.flash.cards = shuffleCards(state.flash.cards);
    state.flash.index = 0;
    state.flash.flipped = false;
    renderPractice();
    return;
  }

  if (action === "flash-random") {
    state.flash.randomMode = !state.flash.randomMode;
    toast(state.flash.randomMode ? "Random mode on" : "Random mode off");
    renderPractice();
    return;
  }

  if (action === "flash-repeat-hard") {
    const words = flattenLessonWords(state.lessons);
    const hardSet = new Set(state.flash.hardWordIds);
    const hardCards = words.filter((word) => hardSet.has(word.id));
    if (!hardCards.length) {
      toast("No hard words to repeat");
      return;
    }

    state.flash.cards = hardCards;
    state.flash.index = 0;
    state.flash.flipped = false;
    state.flash.randomMode = false;
    state.flash.mode = "session";
    state.flash.reviewedCount = 0;
    state.flash.sessionTotal = hardCards.length;
    state.flash.hardCount = 0;
    state.flash.easyCount = 0;
    state.flash.hardWordIds = [];
    renderPractice();
    return;
  }

  if (action === "flash-restart") {
    const words = flattenLessonWords(state.lessons);
    const cards = pickFlashcards(words, state.progress, 40);
    state.flash.cards = cards;
    state.flash.index = 0;
    state.flash.flipped = false;
    state.flash.randomMode = false;
    state.flash.mode = "session";
    state.flash.reviewedCount = 0;
    state.flash.sessionTotal = cards.length;
    state.flash.hardCount = 0;
    state.flash.easyCount = 0;
    state.flash.hardWordIds = [];
    renderPractice();
    return;
  }

  if (action === "quiz-start") {
    state.quiz.questions = buildQuizQuestions(state.dictionary, 10);
    state.quiz.index = 0;
    state.quiz.score = 0;
    state.quiz.answered = false;
    state.quiz.selected = "";
    state.quiz.showCongrats = false;
    state.quiz.showSummary = false;
    renderPractice();
    return;
  }

  if (action === "quiz-answer") {
    if (state.quiz.answered) return;
    const option = actionSource.dataset.option;
    const current = state.quiz.questions[state.quiz.index];
    state.quiz.selected = option;
    state.quiz.answered = true;

    state.progress.quizAttempts += 1;
    if (option === current.answer) {
      state.quiz.score += 1;
      state.progress.quizCorrect += 1;
      xpGain(8, "Correct quiz answer");
    }

    persist();
    renderPractice();
    return;
  }

  if (action === "quiz-next") {
    if (!state.quiz.answered) return;
    state.quiz.index += 1;
    state.quiz.answered = false;
    state.quiz.selected = "";

    if (state.quiz.index >= state.quiz.questions.length) {
      const total = state.quiz.questions.length;
      const isPerfect = state.quiz.score === total;

      state.progress.dailyGoal.quizDone += 1;
      xpGain(20, "Finished quiz");
      state.quiz.showSummary = true;
      if (isPerfect) {
        state.quiz.showCongrats = true;
        if (state.settings.animations) drawConfetti();
        toast("Perfect score! 10/10");
      } else {
        state.quiz.showCongrats = false;
        toast(`Quiz complete. Score ${state.quiz.score}/${total}`);
      }
    }

    persist();
    renderPractice();
    return;
  }

  if (action === "quiz-restart") {
    state.quiz.questions = buildQuizQuestions(state.dictionary, 10);
    state.quiz.index = 0;
    state.quiz.score = 0;
    state.quiz.answered = false;
    state.quiz.selected = "";
    state.quiz.showCongrats = false;
    state.quiz.showSummary = false;
    renderPractice();
    return;
  }

  if (action === "chat-send") {
    const input = document.getElementById("chat-input");
    const text = input?.value.trim();
    if (!text) return;

    state.chat.push({ who: "user", text, translation: "" });
    const response = chatbotReply(text);
    state.chat.push({ who: "bot", text: response.answer[0], translation: response.answer[1] });
    input.value = "";
    xpGain(2, "Conversation practice");
    persist();
    renderPractice();
    return;
  }

  if (action === "chat-voice") {
    const recognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!recognitionCtor) {
      toast("Speech recognition is not supported in this browser");
      return;
    }

    const recognition = new recognitionCtor();
    recognition.lang = "en-US";
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      state.chat.push({ who: "user", text: transcript, translation: "(voice input)" });
      const response = chatbotReply(transcript);
      state.chat.push({ who: "bot", text: response.answer[0], translation: response.answer[1] });
      renderPractice();
    };
    recognition.start();
    return;
  }

  if (action === "export-data") {
    const blob = new Blob([exportDataBundle()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "axomia-learn-backup.json";
    a.click();
    URL.revokeObjectURL(a.href);
    return;
  }

  if (action === "reset-progress") {
    const ok = window.confirm("Reset all saved progress?");
    if (!ok) return;
    resetAllData();
    Object.assign(state, {
      progress: getProgress(),
      settings: getSettings(),
      favorites: getFavorites(),
      history: getRecentActivity(),
      searchHistory: getSearchHistory(),
      recentWords: getRecentWords()
    });
    refreshLanguageData();
    persist();
    applyTheme();
    updateHeaderControls();
    renderCurrentView();
    if (!state.settings.onboardingCompleted) {
      openOnboarding();
    }
    toast("Progress reset");
  }
}

function onInput(event) {
  const target = event.target;

  if (target.id === "onboarding-name") {
    state.onboarding.name = target.value;
  }

  if (target.id === "onboarding-daily-words") {
    state.onboarding.dailyWordsTarget = target.value;
  }

  if (target.name === "onboarding-theme") {
    state.onboarding.preferredTheme = target.value;
  }

  if (target.id === "profile-name") {
    state.settings.profileName = target.value.trim() || "Learner";
    updateHeaderControls();
    persist();
  }

  if (target.id === "dictionary-search") {
    state.dictionaryFilters.query = target.value;

    if (target.value.trim()) {
      const value = target.value.trim();
      state.searchHistory = [value, ...state.searchHistory.filter((item) => item !== value)].slice(0, 10);
    }

    renderDictionaryPreserveSearchCaret();
    persist();
  }

  if (target.id === "dictionary-category") {
    state.dictionaryFilters.category = target.value;
    renderDictionary();
    persist();
  }

  if (target.id === "edit-word-english") {
    state.dictionaryEdit.english = target.value;
  }

  if (target.id === "edit-word-assamese") {
    state.dictionaryEdit.assamese = target.value;
  }

  if (target.id === "edit-word-category") {
    state.dictionaryEdit.category = target.value;
  }

  if (target.id === "setting-notifications") {
    state.settings.notifications = target.checked;
    persist();
  }

  if (target.id === "import-data-input") {
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        importDataBundle(reader.result);
        Object.assign(state, {
          progress: getProgress(),
          settings: getSettings(),
          favorites: getFavorites(),
          history: getRecentActivity(),
          searchHistory: getSearchHistory(),
          recentWords: getRecentWords()
        });
        refreshLanguageData();
        applyTheme();
        updateHeaderControls();
        renderCurrentView();
        toast("Data imported");
      } catch {
        toast("Invalid backup file");
      }
    };

    reader.readAsText(file);
  }
}

function bindGlobalEvents() {
  document.addEventListener("click", onClick);
  document.addEventListener("input", onInput);

  dom.themeToggle.addEventListener("click", () => {
    state.settings.theme = state.settings.theme === "dark" ? "light" : "dark";
    applyTheme();
    updateHeaderControls();
    persist();
  });

  dom.sidebarToggle.addEventListener("click", () => {
    dom.sidebar.classList.toggle("collapsed");
    renderNavigation(dom.desktopNav, state.view);
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    dom.installBtn.classList.remove("hidden");
  });

  dom.installBtn.addEventListener("click", async () => {
    if (!state.deferredInstallPrompt) return;
    state.deferredInstallPrompt.prompt();
    await state.deferredInstallPrompt.userChoice;
    state.deferredInstallPrompt = null;
    dom.installBtn.classList.add("hidden");
  });
}

function initServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("sw.js?v=6", { updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch(() => {
        // App should continue even if service worker update fails.
      });
  }
}

async function init() {
  normalizeSettings();
  createOnboardingModal();
  applyTheme();
  updateHeaderControls();
  bindGlobalEvents();
  updateStreak();
  updateTopbarVisibility();
  renderNavigation(dom.mobileNav, state.view);
  renderNavigation(dom.desktopNav, state.view);
  await renderCurrentView();
  initServiceWorker();
  if (!state.settings.onboardingCompleted) {
    openOnboarding();
  }
  persist();
}

init();
