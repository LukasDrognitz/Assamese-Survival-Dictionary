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
  getCustomWords,
  exportDataBundle,
  importDataBundle,
  resetAllData,
  todayIso,
  testSyncConnection,
  syncStateFromServer,
  startAutoSync
} from "./storage.js?v=20260715-41";
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
} from "./dictionary.js?v=20260710-45";
import {
  loadLessons,
  renderLessonsOverview,
  renderLessonDetail,
  flattenLessonWords,
  resetLessonsCache,
  createLessonLearningSession,
  markLessonReviewComplete,
  lessonReviewComplete,
  startLessonMatchingStage,
  selectLessonMatchingCard,
  startLessonWritingStage,
  submitLessonWritingAnswer
} from "./lessons.js?v=20260715-07";
import { updateSpacedRepetition, shuffleCards, renderFlashcard, renderFlashSummary } from "./flashcards.js?v=20260713-38";
import { buildQuizQuestions, renderQuizView } from "./quiz.js?v=20260710-33";
import {
  NAV_ITEMS,
  renderNavigation,
  renderProgressCircle,
  toast,
  safeSpeak,
  drawConfetti,
  renderTeacherAvatar
} from "./ui.js?v=20260710-32";

const AVATAR_REWARDS = [
  { value: "tiger", label: "Tara the Tiger", unlockLevel: 1 },
  { value: "elephant", label: "Eli the Elephant", unlockLevel: 1 },
  { value: "peacock", label: "Pavo the Peacock", unlockLevel: 2 },
  { value: "rhino", label: "Rani the Rhino", unlockLevel: 3 },
  { value: "sloth-bear", label: "Balu the Sloth Bear", unlockLevel: 4 },
  { value: "nilgai", label: "Nila the Nilgai", unlockLevel: 5 },
  { value: "fox", label: "Kanu the Indian Fox", unlockLevel: 6 },
  { value: "langur", label: "Langur the Monkey", unlockLevel: 7 }
];

const LEGACY_AVATAR_MAP = {
  "🦜": "langur",
  "🐯": "tiger",
  "🦊": "fox",
  "🐼": "sloth-bear",
  "🦉": "langur",
  "🐘": "elephant",
  "🐢": "nilgai",
  "🦋": "peacock",
  "🐬": "langur",
  "🐙": "rhino",
  "🦄": "rhino",
  "deer": "nilgai",
  "hoolock": "langur",
  "hornbill": "langur",
  "buffalo": "rhino",
  "river-dolphin": "langur",
  "tortoise": "nilgai",
  "snow-leopard": "fox"
};

const AVATAR_META_BY_ID = Object.fromEntries(AVATAR_REWARDS.map((item) => [item.value, item]));
const FIXED_AVATAR_ID = "peacock";
const FIXED_AVATAR_LABEL = "Pavo the Peacock";
const FIXED_AVATAR_IMAGE_PATH = "assets/images/avatars/Peacock.png";
const FIXED_PROFILE_IMAGE_PATH = "assets/images/avatars/Peacock_Profile.png";

const AVATAR_SHEET_DEFAULTS = {
  eyewear: "none",
  outfit: "classic",
  headwear: "none"
};

const AVATAR_SHEET_OPTIONS = {
  eyewear: [
    { value: "none", label: "No Glasses" },
    { value: "glasses", label: "Classic Glasses" },
    { value: "sunglasses", label: "Sunglasses" }
  ],
  outfit: [
    { value: "classic", label: "Classic Outfit" },
    { value: "kurta", label: "Traditional Kurta" },
    { value: "hoodie", label: "Cozy Hoodie" }
  ],
  headwear: [
    { value: "none", label: "No Headwear" },
    { value: "cap", label: "Explorer Cap" },
    { value: "crown", label: "Royal Crown" }
  ]
};

const ASSAM_DID_YOU_KNOW_FACTS = [
  {
    title: "Kaziranga is a UNESCO World Heritage Site.",
    detail: "Kaziranga National Park in Assam is home to the world's largest population of one-horned rhinoceroses.",
    sourceLabel: "UNESCO - Kaziranga National Park",
    sourceUrl: "https://whc.unesco.org/en/list/337/",
    imageQuery: "Kaziranga one horned rhinoceros Assam",
    imageAlt: "One-horned rhinoceros in Kaziranga National Park",
    imageEmoji: "🦏"
  },
  {
    title: "Assam tea is famous worldwide.",
    detail: "The state's lowland tea gardens produce bold black tea that is used in breakfast blends across the globe.",
    sourceLabel: "Britannica - Assam Tea",
    sourceUrl: "https://www.britannica.com/topic/Assam-tea",
    imageQuery: "Assam tea garden India",
    imageAlt: "Tea plantation landscape in Assam",
    imageEmoji: "🍃"
  },
  {
    title: "Bihu celebrates Assam's seasons.",
    detail: "Assam has three Bihu festivals, and Rongali Bihu in spring is known for music, dance, and community feasts.",
    sourceLabel: "Government of Assam - Festivals",
    sourceUrl: "https://assam.gov.in/inside-page/festivals",
    imageQuery: "Bihu dance Assam",
    imageAlt: "Traditional Bihu dance performance",
    imageEmoji: "💃"
  },
  {
    title: "Majuli is one of the world's largest river islands.",
    detail: "Located in the Brahmaputra, Majuli is known for satras, mask making, and vibrant Vaishnavite culture.",
    sourceLabel: "UNESCO - Majuli (Cultural Landscape)",
    sourceUrl: "https://whc.unesco.org/en/tentativelists/5892/",
    imageQuery: "Majuli river island Assam",
    imageAlt: "River island landscape in Majuli",
    imageEmoji: "🏝️"
  },
  {
    title: "The Brahmaputra shapes Assamese life.",
    detail: "This mighty river supports farming, transport, and local livelihoods while shaping Assam's geography and identity.",
    sourceLabel: "Britannica - Brahmaputra River",
    sourceUrl: "https://www.britannica.com/place/Brahmaputra-River",
    imageQuery: "Brahmaputra river Assam",
    imageAlt: "Brahmaputra river view in Assam",
    imageEmoji: "🌊"
  },
  {
    title: "Muga silk is unique to Assam.",
    detail: "Muga silk has a natural golden shine and is prized for durability, often passed down across generations.",
    sourceLabel: "India Handloom Brand - Muga Silk",
    sourceUrl: "https://www.indiahandloombrand.gov.in/muga-silk",
    imageQuery: "Muga silk weaving Assam",
    imageAlt: "Traditional Muga silk weaving",
    imageEmoji: "🧵"
  },
  {
    title: "Kamakhya Temple is an important pilgrimage site.",
    detail: "Situated on Nilachal Hill in Guwahati, the temple is one of the most significant Shakti peethas in India.",
    sourceLabel: "Wikipedia - Kamakhya Temple",
    sourceUrl: "https://en.wikipedia.org/wiki/Kamakhya_Temple",
    imageQuery: "Kamakhya temple Guwahati Assam",
    imageAlt: "Kamakhya Temple in Guwahati",
    imageEmoji: "🛕"
  },
  {
    title: "Traditional Assamese food uses local herbs.",
    detail: "Many dishes feature fresh greens, bamboo shoot, and regional flavors that balance simplicity and nutrition.",
    sourceLabel: "Assam Tourism - Cuisine",
    sourceUrl: "https://tourism.assam.gov.in/portlets/cuisine",
    imageQuery: "Assamese traditional food",
    imageAlt: "Traditional Assamese cuisine served on table",
    imageEmoji: "🍲"
  },
  {
    title: "Bhaona is a classical Assamese theater tradition.",
    detail: "Introduced by Srimanta Sankardev, Bhaona combines storytelling, music, costume, and devotional performance.",
    sourceLabel: "Sangeet Natak Akademi - Bhaona",
    sourceUrl: "https://www.sangeetnatak.gov.in/sna/Bhaona.php",
    imageQuery: "Bhaona performance Assam",
    imageAlt: "Artists performing Bhaona theater",
    imageEmoji: "🎭"
  },
  {
    title: "Xorai is a symbol of Assamese hospitality.",
    detail: "The decorated metal offering stand called Xorai is used to welcome guests during cultural and ceremonial events.",
    sourceLabel: "Sahapedia - Xorai",
    sourceUrl: "https://www.sahapedia.org/xorai-the-symbol-assamese-hospitality",
    imageQuery: "Xorai Assamese hospitality",
    imageAlt: "Traditional Assamese Xorai ceremonial stand",
    imageEmoji: "🏺"
  },
  {
    title: "Sualkuchi is known as Assam's silk village.",
    detail: "This town near Guwahati is famous for handloom weaving, especially Mekhela Chador made with local silk.",
    sourceLabel: "Assam Tourism - Sualkuchi",
    sourceUrl: "https://tourism.assam.gov.in/portlets/sualkuchi",
    imageQuery: "Sualkuchi handloom Assam",
    imageAlt: "Handloom weaving in Sualkuchi",
    imageEmoji: "🧶"
  },
  {
    title: "Assamese has its own script tradition.",
    detail: "The Assamese script evolved over centuries and is closely related to Bengali while retaining distinct forms.",
    sourceLabel: "Britannica - Assamese Language",
    sourceUrl: "https://www.britannica.com/topic/Assamese-language",
    imageQuery: "Assamese script calligraphy",
    imageAlt: "Assamese script written on paper",
    imageEmoji: "✍️"
  }
];

const ACHIEVEMENT_CANDIDATES = [
  {
    id: "dictionary-starter",
    label: "Dictionary Starter",
    icon: "🔤",
    description: "Add your first word or phrase to Dictionary.",
    check: () => customDictionaryEntryCount() >= 1
  },
  {
    id: "dictionary-builder",
    label: "Dictionary Builder",
    icon: "📘",
    description: "Add 10 words or phrases to Dictionary.",
    check: () => customDictionaryEntryCount() >= 10
  },
  {
    id: "dictionary-master",
    label: "Dictionary Master",
    icon: "🧭",
    description: "Add 100 words or phrases to Dictionary.",
    check: () => customDictionaryEntryCount() >= 100
  },
  {
    id: "lesson-starter",
    label: "Lesson Starter",
    icon: "📚",
    description: "Complete your first lesson.",
    check: () => state.progress.lessonsCompleted.length >= 1
  },
  {
    id: "lesson-climber",
    label: "Lesson Climber",
    icon: "🗻",
    description: "Complete 10 lessons.",
    check: () => state.progress.lessonsCompleted.length >= 10
  },
  {
    id: "quiz-starter",
    label: "Quiz Starter",
    icon: "🧠",
    description: "Attempt your first quiz question.",
    check: () => state.progress.quizAttempts >= 1
  },
  {
    id: "quiz-master",
    label: "Quiz Master",
    icon: "🎯",
    description: "Complete 100 quizzes.",
    check: () => Number(state.progress.quizzesCompleted || 0) >= 100
  },
  {
    id: "xp-rookie",
    label: "XP Rookie",
    icon: "⚡",
    description: "Earn 100 total XP.",
    check: () => state.progress.xp >= 100
  },
  {
    id: "xp-pro",
    label: "XP Pro",
    icon: "🚀",
    description: "Earn 500 total XP.",
    check: () => state.progress.xp >= 500
  },
  {
    id: "streak-hero",
    label: "Streak Hero",
    icon: "🔥",
    description: "Build a 7-day learning streak.",
    check: () => state.progress.longestStreak >= 7
  },
  {
    id: "level-5-learner",
    label: "Level 5 Learner",
    icon: "🧗",
    description: "Reach Level 5.",
    check: () => levelMetaFromXp(state.progress.xp).level >= 5
  },
  {
    id: "level-10-learner",
    label: "Level 10 Learner",
    icon: "👑",
    description: "Reach Level 10.",
    check: () => levelMetaFromXp(state.progress.xp).level >= 10
  }
];

const CONVERSATION_TOPICS = {
  greetings: {
    label: "Greetings",
    categoryHints: ["greetings", "introduction", "introductions", "questions", "conversations"],
    wordHints: ["hello", "hi", "name", "how are", "good morning", "good evening", "nomoskar"]
  },
  family: {
    label: "Family",
    categoryHints: ["family", "introduction", "introductions", "conversations"],
    wordHints: ["family", "mother", "father", "brother", "sister", "home"]
  },
  food: {
    label: "Food",
    categoryHints: ["food & drinks", "food", "conversations"],
    wordHints: ["food", "eat", "rice", "tea", "water", "drink", "hungry"]
  },
  travel: {
    label: "Travel",
    categoryHints: ["questions", "conversations", "introduction", "introductions", "time"],
    wordHints: ["where", "go", "come", "from", "bus", "train", "road", "travel"]
  },
  work: {
    label: "Work",
    categoryHints: ["work", "work & study", "conversations", "time"],
    wordHints: ["work", "office", "job", "study", "student", "teacher", "business"]
  },
  hobbies: {
    label: "Hobbies",
    categoryHints: ["actions", "conversations", "time"],
    wordHints: ["play", "read", "sing", "dance", "music", "like", "love"]
  },
  shopping: {
    label: "Shopping",
    categoryHints: ["numbers", "questions", "conversations", "food & drinks"],
    wordHints: ["price", "how much", "buy", "sell", "market", "shop", "money"]
  },
  culture: {
    label: "Culture",
    categoryHints: ["conversations", "greetings", "family", "love"],
    wordHints: ["festival", "bihu", "assam", "temple", "traditional", "culture"]
  }
};

const START_SCREEN_SESSION_KEY = "assamese-app-start-screen-seen";
const LOVE_MILESTONE_STEP_XP = 2110;
const LOVE_MILESTONE_MESSAGE = "Candles may fade and cake will be gone but my love for you burns brightly forever strong!";
const APP_BUILD_VERSION = "20260715-177";
const CHEST_OPEN_ANIMATION_MS = 1050;

function customDictionaryEntryCount() {
  return getCustomWords().length;
}

const CHEST_RUPEE_TIERS = [
  { rarity: "common", weight: 62, min: 80, max: 140 },
  { rarity: "rare", weight: 30, min: 141, max: 230 },
  { rarity: "epic", weight: 8, min: 231, max: 320 }
];

function pickWeighted(items) {
  const total = items.reduce((sum, item) => sum + Math.max(0, Number(item.weight) || 0), 0);
  if (total <= 0) return null;

  let roll = Math.random() * total;
  for (const item of items) {
    roll -= Math.max(0, Number(item.weight) || 0);
    if (roll <= 0) return item;
  }
  return items[items.length - 1] || null;
}

function rollChestRupeeReward() {
  const tier = pickWeighted(CHEST_RUPEE_TIERS) || CHEST_RUPEE_TIERS[0];
  const value = tier.min + Math.floor(Math.random() * (tier.max - tier.min + 1));
  return { rarity: tier.rarity, value };
}


function avatarStyleAllowedValue(slot, value) {
  const options = AVATAR_SHEET_OPTIONS[slot] || [];
  const fallback = AVATAR_SHEET_DEFAULTS[slot];
  return options.some((item) => item.value === value) ? value : fallback;
}

function normalizeAvatarSheetSelection(selection) {
  return {
    eyewear: avatarStyleAllowedValue("eyewear", String(selection?.eyewear || "")),
    outfit: avatarStyleAllowedValue("outfit", String(selection?.outfit || "")),
    headwear: avatarStyleAllowedValue("headwear", String(selection?.headwear || ""))
  };
}

function ensureAvatarSheetSelections() {
  const stored = state.progress.avatarSheetSelections && typeof state.progress.avatarSheetSelections === "object"
    ? { ...state.progress.avatarSheetSelections }
    : {};

  AVATAR_REWARDS.forEach((item) => {
    const key = String(item.value || "");
    stored[key] = normalizeAvatarSheetSelection(stored[key] || AVATAR_SHEET_DEFAULTS);
  });

  state.progress.avatarSheetSelections = stored;
  return stored;
}

let chatPinIntervalId = null;

const state = {
  view: "home",
  practiceTab: "flashcards",
  lessonsScreen: "overview",
  lessonsTypeFilter: "all",
  lessonLearning: {
    session: null
  },
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
    example: "",
    exampleEnglish: "",
    category: "Custom",
    entryType: "word"
  },
  dictionaryPendingDelete: null,
  dictionaryDeleteDialog: {
    isOpen: false,
    key: "",
    entryAssamese: "",
    entryEnglish: "",
    entryType: "word"
  },
  flash: {
    cards: [],
    index: 0,
    flipped: false,
    setupStage: "display-mode",
    displayMode: "",
    playMode: "normal",
    categoryTypeFilter: "",
    selectedCategories: [],
    mode: "session",
    reviewedCount: 0,
    sessionTotal: 0,
    hardCount: 0,
    easyCount: 0,
    hardWordIds: [],
    categoryDropAnimating: false,
    categoryDropFromType: "words"
  },
  quiz: {
    questions: [],
    index: 0,
    score: 0,
    answered: false,
    selected: "",
    showCongrats: false,
    showSummary: false,
    mode: "",
    setupStage: "mode"
  },
  chat: [
    {
      who: "bot",
      text: "Nomoskar!",
      translation: "Hello"
    }
  ],
  chatSession: {
    topicId: "",
    isStarted: false,
    isStopped: false,
    stage: "idle",
    currentQuestionId: "",
    answerOptions: [],
    askOptions: [],
    turn: 0,
    introducedEntryIds: [],
    recentEntryIds: [],
    lastExplainedEntryId: "",
    lastUserText: ""
  },
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
    avatar: "rhino",
    dailyXpTarget: 120,
    preferredTheme: "light"
  },
  startScreen: {
    isOpen: false
  },
  achievementQueue: [],
  achievementCelebrationActive: false,
  levelUpQueue: [],
  levelUpCelebrationActive: false,
  loveMilestoneQueue: [],
  loveMilestoneCelebrationActive: false,
  chestResultDialog: {
    isOpen: false,
    rarity: "common",
    rupees: 0
  },
  dailyChestDialog: {
    isOpen: false
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

function hasLearningProgress() {
  const learnedCount = learnedWordsCount();
  return state.progress.xp > 0 || learnedCount > 0 || state.progress.lessonsCompleted.length > 0;
}

function normalizeAvatarId(value) {
  const raw = String(value || "").trim();
  return LEGACY_AVATAR_MAP[raw] || raw;
}

function avatarMeta(avatarId) {
  const safeId = FIXED_AVATAR_ID || normalizeAvatarId(avatarId);
  return AVATAR_META_BY_ID[safeId] || AVATAR_REWARDS[0];
}

function avatarDisplayName(avatarId) {
  return FIXED_AVATAR_LABEL || avatarMeta(avatarId)?.label || "Animal Avatar";
}

function avatarSheetSelectionFor(avatarId) {
  const safeId = avatarMeta(avatarId).value;
  const selections = ensureAvatarSheetSelections();
  const current = selections[safeId] || AVATAR_SHEET_DEFAULTS;
  return normalizeAvatarSheetSelection(current);
}

function setAvatarSheetSelection(avatarId, patch) {
  const safeId = avatarMeta(avatarId).value;
  const selections = ensureAvatarSheetSelections();
  const merged = {
    ...avatarSheetSelectionFor(safeId),
    ...(patch || {})
  };
  selections[safeId] = normalizeAvatarSheetSelection(merged);
  state.progress.avatarSheetSelections = selections;
}

function avatarSheetImagePath(avatarId, selection) {
  const safeId = avatarMeta(avatarId).value;
  const normalized = normalizeAvatarSheetSelection(selection || AVATAR_SHEET_DEFAULTS);
  return `assets/images/avatar-sheets/${safeId}/${safeId}-${normalized.eyewear}-${normalized.outfit}-${normalized.headwear}.png`;
}

function renderAnimalBadge(avatarId, variant = "mini") {
  const safeVariant = ["mini", "chip"].includes(variant) ? variant : "mini";
  const src = safeVariant === "mini" ? FIXED_PROFILE_IMAGE_PATH : FIXED_AVATAR_IMAGE_PATH;
  const label = avatarDisplayName(FIXED_AVATAR_ID);
  return `
    <span class="animal-badge-image ${safeVariant} animal-${FIXED_AVATAR_ID}" aria-hidden="true">
      <img src="${src}" alt="${label}" loading="lazy" decoding="async" />
    </span>
  `;
}

function escapeHtmlAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function normalizeSettings() {
  state.settings.onboardingCompleted = Boolean(state.settings.onboardingCompleted);
  state.settings.profileName = state.settings.profileName || "Learner";
  state.settings.avatar = FIXED_AVATAR_ID;
  state.settings.syncEndpoint = String(state.settings.syncEndpoint || "").trim();
  state.settings.syncToken = String(state.settings.syncToken || "").trim();
}

function persist() {
  saveProgress(state.progress);
  saveSettings(state.settings);
  saveFavorites(state.favorites);
  saveRecentActivity(state.history);
  saveSearchHistory(state.searchHistory);
  saveRecentWords(state.recentWords);
}

function pruneCompletedLessonFavorites() {
  const completed = new Set((state.progress.lessonsCompleted || []).map((id) => String(id)));
  if (!completed.size) return 0;

  const before = state.favorites.lessons.length;
  state.favorites.lessons = state.favorites.lessons.filter((lessonId) => !completed.has(String(lessonId)));
  return before - state.favorites.lessons.length;
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
  const avatarLabel = avatarDisplayName(state.settings.avatar);
  dom.themeToggle.textContent = state.settings.theme === "dark" ? "🌙" : "☀️";
  dom.welcomeName.innerHTML = `
    <span class="welcome-avatar" aria-label="Profile avatar ${avatarLabel}">
      <span class="welcome-avatar-art">${renderAnimalBadge(state.settings.avatar, "mini")}</span>
      <span class="welcome-level-badge" aria-label="Level ${currentLevel}">${currentLevel}</span>
    </span>
    <span>${state.settings.profileName}</span>
  `;
}

function animateHeaderLevelBadge(fromLevel, toLevel) {
  const badge = document.querySelector(".welcome-level-badge");
  if (!badge) return;

  badge.innerHTML = `
    <span class="level-badge-number level-badge-old">${fromLevel}</span>
    <span class="level-badge-number level-badge-new">${toLevel}</span>
  `;
  badge.classList.remove("level-badge-transition");
  void badge.offsetWidth;
  badge.classList.add("level-badge-transition");
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

function createAppStartScreenModal() {
  if (document.getElementById("app-start-screen")) return;

  const cleanName = (state.settings.profileName || "Learner").trim() || "Learner";
  const safeName = escapeHtmlAttr(cleanName);

  const container = document.createElement("section");
  container.id = "app-start-screen";
  container.className = "app-start-screen hidden";
  container.setAttribute("role", "dialog");
  container.setAttribute("aria-modal", "true");
  container.setAttribute("aria-label", "Welcome back");
  container.innerHTML = `
    <article class="app-start-screen-shell glass">
      <img class="app-start-screen-image" src="assets/images/App Start Screen.png" alt="Assamese Survival Dictionary welcome screen" loading="eager" decoding="async" />
      <div class="app-start-screen-copy">
        <p class="eyebrow">Welcome Back</p>
        <h2>Hello, ${safeName}!</h2>
      </div>
      <div class="app-start-screen-action-row">
        <button class="btn app-start-screen-btn" data-action="app-start-continue">It's great to be back!</button>
      </div>
    </article>
  `;

  document.body.appendChild(container);
}

function shouldShowAppStartScreen() {
  if (!state.settings.onboardingCompleted) return false;

  try {
    return sessionStorage.getItem(START_SCREEN_SESSION_KEY) !== "1";
  } catch {
    return true;
  }
}

function openAppStartScreen() {
  const modal = document.getElementById("app-start-screen");
  if (!modal) return;

  const nameNode = modal.querySelector(".app-start-screen-copy h2");
  if (nameNode) {
    const cleanName = (state.settings.profileName || "Learner").trim() || "Learner";
    nameNode.textContent = `Hello, ${cleanName}!`;
  }

  state.startScreen.isOpen = true;
  modal.classList.remove("hidden");
  document.body.classList.add("lock-scroll");
}

function closeAppStartScreen() {
  const modal = document.getElementById("app-start-screen");
  if (!modal) return;

  state.startScreen.isOpen = false;
  modal.classList.add("hidden");
  document.body.classList.remove("lock-scroll");

  try {
    sessionStorage.setItem(START_SCREEN_SESSION_KEY, "1");
  } catch {
    // Continue without session persistence if browser storage is blocked.
  }
}

function createDictionaryDeleteModal() {
  if (document.getElementById("dictionary-delete-modal")) return;

  const container = document.createElement("section");
  container.id = "dictionary-delete-modal";
  container.className = "dictionary-delete-confirmation hidden";
  container.setAttribute("role", "dialog");
  container.setAttribute("aria-modal", "true");
  container.setAttribute("aria-label", "Confirm dictionary deletion");
  container.innerHTML = `
    <article class="dictionary-delete-card glass">
      <p class="eyebrow">Delete Entry</p>
      <h2 id="dictionary-delete-title">Delete this entry?</h2>
      <p class="meta" id="dictionary-delete-subtitle">This will remove it from Dictionary, Lessons, Flashcards, and Quiz.</p>
      <div class="row" style="justify-content:flex-end;">
        <button class="btn ghost" data-action="dictionary-cancel-delete">Cancel</button>
        <button class="btn danger" data-action="dictionary-confirm-delete">Delete</button>
      </div>
    </article>
  `;
  document.body.appendChild(container);
}

function openDictionaryDeleteDialog(entry, key) {
  const modal = document.getElementById("dictionary-delete-modal");
  const title = document.getElementById("dictionary-delete-title");
  const subtitle = document.getElementById("dictionary-delete-subtitle");
  if (!modal || !title || !subtitle) return;

  const entryType = inferDictionaryEntryType(entry);
  const entryTypeLabel = entryType === "phrase" ? "phrase" : "word";
  const assamese = String(entry?.assamese || "").trim() || "(no Assamese text)";
  const english = String(entry?.english || "").trim() || "(no English text)";

  state.dictionaryDeleteDialog = {
    isOpen: true,
    key,
    entryAssamese: assamese,
    entryEnglish: english,
    entryType
  };

  title.textContent = `Delete this ${entryTypeLabel}?`;
  subtitle.textContent = `"${assamese}" (${english}) will be removed from Dictionary, Lessons, Flashcards, and Quiz.`;
  modal.classList.remove("hidden");
  document.body.classList.add("lock-scroll");
}

function closeDictionaryDeleteDialog() {
  const modal = document.getElementById("dictionary-delete-modal");
  if (!modal) return;

  modal.classList.add("hidden");
  document.body.classList.remove("lock-scroll");
  state.dictionaryDeleteDialog = {
    isOpen: false,
    key: "",
    entryAssamese: "",
    entryEnglish: "",
    entryType: "word"
  };
}

function performDictionaryDelete(key) {
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
      example: "",
      exampleEnglish: "",
      category: "Custom",
      entryType: "word"
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
}

function createAchievementCelebrationModal() {
  if (document.getElementById("achievement-celebration")) return;

  const container = document.createElement("section");
  container.id = "achievement-celebration";
  container.className = "achievement-celebration hidden";
  container.setAttribute("role", "dialog");
  container.setAttribute("aria-modal", "true");
  container.setAttribute("aria-live", "polite");
  container.setAttribute("aria-label", "Achievement unlocked");
  container.innerHTML = `
    <article class="achievement-celebration-card glass">
      <div class="achievement-unlock-copy" id="achievement-unlock-copy">
        <p class="eyebrow">New Achievement</p>
        <h2 id="achievement-unlock-title">Congratulations!</h2>
        <p class="meta" id="achievement-unlock-subtitle">You unlocked a new achievement.</p>
      </div>
      <div class="achievement-unlock-trophy" id="achievement-unlock-trophy" aria-hidden="true">🏆</div>
      <button class="btn accent" data-action="unlock-achievement">Unlock Achievement</button>
    </article>
  `;
  document.body.appendChild(container);
}

function createLevelUpCelebrationModal() {
  if (document.getElementById("level-up-celebration")) return;

  const container = document.createElement("section");
  container.id = "level-up-celebration";
  container.className = "level-up-celebration hidden";
  container.setAttribute("role", "dialog");
  container.setAttribute("aria-modal", "true");
  container.setAttribute("aria-live", "polite");
  container.setAttribute("aria-label", "Level up");
  container.innerHTML = `
    <article class="level-up-card glass">
      <p class="eyebrow">Level Up</p>
      <h2 id="level-up-title">Congratulations!</h2>
      <p class="meta" id="level-up-subtitle">You reached a new level.</p>
      <div class="level-up-meter" aria-label="Level transition">
        <span class="level-up-number level-up-old" id="level-up-old">1</span>
        <span class="level-up-number level-up-new" id="level-up-new">2</span>
      </div>
      <button class="btn accent" data-action="level-up-continue">Continue</button>
    </article>
  `;
  document.body.appendChild(container);
}

function createLoveMilestoneCelebrationModal() {
  if (document.getElementById("love-milestone-celebration")) return;

  const container = document.createElement("section");
  container.id = "love-milestone-celebration";
  container.className = "love-milestone-celebration hidden";
  container.setAttribute("role", "dialog");
  container.setAttribute("aria-modal", "true");
  container.setAttribute("aria-live", "polite");
  container.setAttribute("aria-label", "Special milestone reached");
  container.innerHTML = `
    <article class="love-milestone-card glass">
      <p class="eyebrow">Special Milestone</p>
      <h2 id="love-milestone-title">You reached 2110 XP!</h2>
      <img class="love-milestone-image" src="assets/images/Kiss.png" alt="Celebration image" loading="lazy" />
      <p class="meta love-milestone-message" id="love-milestone-message">${LOVE_MILESTONE_MESSAGE}</p>
      <button class="btn accent" data-action="love-milestone-continue">Continue</button>
    </article>
  `;
  document.body.appendChild(container);
}

function createChestResultModal() {
  if (document.getElementById("chest-result-celebration")) return;

  const container = document.createElement("section");
  container.id = "chest-result-celebration";
  container.className = "chest-result-celebration hidden";
  container.setAttribute("role", "dialog");
  container.setAttribute("aria-modal", "true");
  container.setAttribute("aria-live", "polite");
  container.setAttribute("aria-label", "Treasure chest reward");
  container.innerHTML = `
    <article class="chest-result-card glass">
      <div class="chest-visual" id="chest-result-visual" aria-hidden="true">
        <span class="chest-base"></span>
        <span class="chest-lid"></span>
        <span class="chest-burst"></span>
      </div>
      <p class="eyebrow" id="chest-result-rarity">COMMON CHEST</p>
      <h2 id="chest-result-rupees">+0 Rupees</h2>
      <p class="meta" id="chest-result-item">Collect your daily coins and come back tomorrow.</p>
      <button class="btn accent" data-action="chest-result-continue">Continue</button>
    </article>
  `;
  document.body.appendChild(container);
}

function createDailyChestModal() {
  if (document.getElementById("daily-chest-modal")) return;

  const container = document.createElement("section");
  container.id = "daily-chest-modal";
  container.className = "daily-chest-modal hidden";
  container.setAttribute("role", "dialog");
  container.setAttribute("aria-modal", "true");
  container.setAttribute("aria-live", "polite");
  container.setAttribute("aria-label", "Daily treasure chest");
  container.innerHTML = `
    <article class="daily-chest-card glass">
      <p class="eyebrow">Daily Reward</p>
      <div class="daily-chest-hero" aria-hidden="true">
        <span class="chest-base"></span>
        <span class="chest-lid"></span>
      </div>
      <h2>Your Treasure Chest Is Ready</h2>
      <p class="meta">Open once per day to collect Rupees.</p>
      <div class="row" style="justify-content:center; gap:10px; flex-wrap:wrap;">
        <button class="btn accent" data-action="daily-chest-open">Open Chest</button>
        <button class="btn ghost" data-action="daily-chest-later">Maybe Later</button>
      </div>
    </article>
  `;
  document.body.appendChild(container);
}

function openDailyChestModal() {
  const modal = document.getElementById("daily-chest-modal");
  if (!modal) return;

  state.dailyChestDialog.isOpen = true;
  modal.classList.remove("hidden");
  document.body.classList.add("lock-scroll");
}

function closeDailyChestModal() {
  const modal = document.getElementById("daily-chest-modal");
  if (!modal) return;

  state.dailyChestDialog.isOpen = false;
  modal.classList.add("hidden");
  document.body.classList.remove("lock-scroll");
}

function maybeShowDailyChestPrompt() {
  if (!state.settings.onboardingCompleted) return;
  if (state.startScreen.isOpen || state.onboarding.isOpen || state.dailyChestDialog.isOpen) return;

  const today = todayIso();
  if (state.progress.lastChestDate === today) return;
  if (state.progress.lastChestPromptDate === today) return;

  state.progress.lastChestPromptDate = today;
  persist();
  openDailyChestModal();
}

function claimDailyChestReward() {
  const today = todayIso();
  if (state.progress.lastChestDate === today) {
    toast("Treasure chest already opened today");
    return false;
  }

  const rupeeDrop = rollChestRupeeReward();
  const reward = rupeeDrop.value;

  state.progress.lastChestDate = today;
  state.progress.lastChestPromptDate = today;
  state.progress.rupees = Math.max(0, Number(state.progress.rupees) || 0) + reward;
  persist();
  renderProfile();
  openChestResultModal({
    rarity: rupeeDrop.rarity,
    rupees: reward
  });
  return true;
}

function openChestResultModal(payload) {
  const dialog = document.getElementById("chest-result-celebration");
  const rarityNode = document.getElementById("chest-result-rarity");
  const rupeeNode = document.getElementById("chest-result-rupees");
  const itemNode = document.getElementById("chest-result-item");
  const chestVisual = document.getElementById("chest-result-visual");
  if (!dialog || !rarityNode || !rupeeNode || !itemNode || !chestVisual) return;

  const rarity = String(payload?.rarity || "common").toLowerCase();
  const rupees = Math.max(0, Number(payload?.rupees) || 0);
  state.chestResultDialog = {
    isOpen: true,
    rarity,
    rupees
  };

  dialog.classList.remove("common", "rare", "epic");
  dialog.classList.add(rarity === "rare" || rarity === "epic" ? rarity : "common");
  dialog.classList.add("opening");
  chestVisual.classList.remove("open");
  void chestVisual.offsetWidth;
  chestVisual.classList.add("open");

  rarityNode.textContent = `${rarity.toUpperCase()} CHEST`;
  rupeeNode.textContent = `+${rupees} Rupees`;
  itemNode.textContent = "No bonus item pool is active. Come back tomorrow for another chest.";

  dialog.classList.remove("hidden");
  document.body.classList.add("lock-scroll");

  window.setTimeout(() => {
    dialog.classList.remove("opening");
  }, CHEST_OPEN_ANIMATION_MS);
}

function closeChestResultModal() {
  const dialog = document.getElementById("chest-result-celebration");
  const chestVisual = document.getElementById("chest-result-visual");
  if (!dialog) return;

  dialog.classList.add("hidden");
  dialog.classList.remove("common", "rare", "epic", "opening");
  chestVisual?.classList.remove("open");
  document.body.classList.remove("lock-scroll");
  state.chestResultDialog = {
    isOpen: false,
    rarity: "common",
    rupees: 0
  };
}

function queueLoveMilestones(previousXp, nextXp) {
  if (!Number.isFinite(previousXp) || !Number.isFinite(nextXp) || nextXp <= previousXp) return;

  const seenXp = Math.max(0, Number(state.progress.loveMilestoneXpSeen) || 0);
  const startMultiple = Math.floor(previousXp / LOVE_MILESTONE_STEP_XP) + 1;
  const endMultiple = Math.floor(nextXp / LOVE_MILESTONE_STEP_XP);
  if (endMultiple < startMultiple) return;

  for (let multiple = startMultiple; multiple <= endMultiple; multiple += 1) {
    const milestoneXp = multiple * LOVE_MILESTONE_STEP_XP;
    if (milestoneXp <= seenXp) continue;
    state.loveMilestoneQueue.push({ xp: milestoneXp });
  }
}

function showNextLoveMilestoneCelebration() {
  if (state.loveMilestoneCelebrationActive) return;
  if (state.levelUpCelebrationActive || state.achievementCelebrationActive) return;

  const payload = state.loveMilestoneQueue.shift();
  if (!payload) return;

  const dialog = document.getElementById("love-milestone-celebration");
  const title = document.getElementById("love-milestone-title");
  const message = document.getElementById("love-milestone-message");
  if (!dialog || !title || !message) return;

  title.textContent = `You reached ${payload.xp} XP!`;
  message.textContent = LOVE_MILESTONE_MESSAGE;
  dialog.classList.remove("hidden");
  document.body.classList.add("love-milestone-open");
  state.loveMilestoneCelebrationActive = true;
  state.progress.loveMilestoneXpSeen = Math.max(Number(state.progress.loveMilestoneXpSeen) || 0, payload.xp);
}

function closeLoveMilestoneCelebration() {
  const dialog = document.getElementById("love-milestone-celebration");
  if (!dialog) return;

  dialog.classList.add("hidden");
  document.body.classList.remove("love-milestone-open");
  state.loveMilestoneCelebrationActive = false;
}

function showNextLevelUpCelebration() {
  if (state.levelUpCelebrationActive) return;
  const payload = state.levelUpQueue.shift();
  if (!payload) return;

  const dialog = document.getElementById("level-up-celebration");
  const title = document.getElementById("level-up-title");
  const subtitle = document.getElementById("level-up-subtitle");
  const oldNode = document.getElementById("level-up-old");
  const newNode = document.getElementById("level-up-new");
  if (!dialog || !title || !subtitle || !oldNode || !newNode) return;

  title.textContent = "Congratulations!";
  subtitle.textContent = `Level ${payload.to} unlocked. Keep the streak alive.`;
  oldNode.textContent = String(payload.from);
  newNode.textContent = String(payload.to);

  dialog.classList.remove("hidden");
  dialog.classList.remove("animate");
  document.body.classList.add("level-up-open");
  state.levelUpCelebrationActive = true;

  window.setTimeout(() => {
    dialog.classList.add("animate");
  }, 20);

  if (state.settings.animations) {
    drawConfetti();
    toast(`Level ${payload.to} reached!`);
  }
}

function closeLevelUpCelebration() {
  const dialog = document.getElementById("level-up-celebration");
  if (!dialog) return;
  dialog.classList.add("hidden");
  dialog.classList.remove("animate");
  document.body.classList.remove("level-up-open");
  state.levelUpCelebrationActive = false;
  showNextLoveMilestoneCelebration();
}

function getProfileNavButton() {
  const mobile = document.querySelector("#mobile-nav [data-nav='profile']");
  if (mobile && mobile.offsetParent !== null) return mobile;

  const desktop = document.querySelector("#desktop-nav [data-nav='profile']");
  if (desktop && desktop.offsetParent !== null) return desktop;

  return null;
}

function syncAchievements(showCelebration = false) {
  const previous = new Set(state.progress.achievements || []);
  const unlockedNow = ACHIEVEMENT_CANDIDATES.filter((item) => item.check());
  const nextIds = unlockedNow.map((item) => item.id);
  const next = new Set(nextIds);
  const newlyUnlocked = unlockedNow.filter((item) => !previous.has(item.id));

  state.progress.achievements = nextIds;

  if (showCelebration && newlyUnlocked.length) {
    state.achievementQueue.push(...newlyUnlocked);
    showNextAchievementCelebration();
  }

  return previous.size !== next.size || [...previous].some((id) => !next.has(id));
}

function showNextAchievementCelebration() {
  if (state.achievementCelebrationActive) return;
  const nextAchievement = state.achievementQueue.shift();
  if (!nextAchievement) return;

  const dialog = document.getElementById("achievement-celebration");
  const title = document.getElementById("achievement-unlock-title");
  const subtitle = document.getElementById("achievement-unlock-subtitle");
  const badge = document.getElementById("achievement-unlock-trophy");
  if (!dialog || !title || !subtitle || !badge) return;

  title.textContent = `Congratulations! ${nextAchievement.label}`;
  subtitle.textContent = `${nextAchievement.description} Tap the button to send your trophy to Profile.`;
  badge.textContent = nextAchievement.icon || "🏆";
  dialog.classList.remove("hidden");
  dialog.classList.remove("flying");
  document.body.classList.add("achievement-open");
  state.achievementCelebrationActive = true;
}

function closeAchievementCelebration() {
  const dialog = document.getElementById("achievement-celebration");
  if (!dialog) return;
  dialog.classList.add("hidden");
  dialog.classList.remove("flying");
  document.body.classList.remove("achievement-open");
  state.achievementCelebrationActive = false;
  showNextLoveMilestoneCelebration();
}

function animateAchievementToProfile() {
  const dialog = document.getElementById("achievement-celebration");
  const source = document.getElementById("achievement-unlock-trophy");
  const target = getProfileNavButton();

  if (!dialog || !source || !target) {
    closeAchievementCelebration();
    showNextAchievementCelebration();
    return;
  }

  dialog.classList.add("flying");

  const sourceRect = source.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();

  const flyer = document.createElement("div");
  flyer.className = "achievement-flyer";
  flyer.setAttribute("aria-hidden", "true");
  flyer.textContent = source.textContent || "🏆";
  document.body.appendChild(flyer);

  const startX = sourceRect.left + sourceRect.width / 2;
  const startY = sourceRect.top + sourceRect.height / 2;
  const endX = targetRect.left + targetRect.width / 2;
  const endY = targetRect.top + targetRect.height / 2;

  flyer.style.left = `${startX}px`;
  flyer.style.top = `${startY}px`;

  const animation = flyer.animate(
    [
      { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
      { transform: `translate(${endX - startX - 10}px, ${endY - startY - 10}px) scale(0.6)`, opacity: 1 }
    ],
    {
      duration: 850,
      easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      fill: "forwards"
    }
  );

  animation.onfinish = () => {
    flyer.remove();
    target.classList.add("achievement-target-hit");
    setTimeout(() => target.classList.remove("achievement-target-hit"), 700);
    closeAchievementCelebration();
    showNextAchievementCelebration();
  };
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
        (avatar) => {
          const meta = avatarMeta(avatar);
          return `<button class="avatar-chip ${state.onboarding.avatar === avatar ? "selected" : ""}" data-action="onboarding-avatar" data-avatar="${avatar}" aria-label="Choose avatar ${meta.label}">${renderAnimalBadge(avatar, "chip")}<span class="avatar-chip-name">${meta.label}</span></button>`;
        }
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
    <label for="onboarding-daily-xp" class="meta">Daily XP target</label>
    <input class="input" id="onboarding-daily-xp" type="number" min="20" max="5000" value="${state.onboarding.dailyXpTarget}" aria-label="Daily XP target" />
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
  state.onboarding.avatar = normalizeAvatarId(state.settings.avatar) || "rhino";
  state.onboarding.dailyXpTarget = state.progress.dailyGoal.targetXp || 120;
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
  const dailyXp = Math.max(20, Math.min(5000, Number(state.onboarding.dailyXpTarget) || 120));

  state.settings.profileName = cleanName;
  state.settings.avatar = FIXED_AVATAR_ID;
  state.settings.theme = state.onboarding.preferredTheme;
  state.settings.onboardingCompleted = true;

  state.progress.dailyGoal.targetXp = dailyXp;

  applyTheme();
  updateHeaderControls();
  persist();
  closeOnboarding();
  renderCurrentView();
  toast(`Welcome, ${cleanName}!`);
  maybeShowDailyChestPrompt();
}

function xpGain(amount, reason) {
  const previousXp = Math.max(0, Number(state.progress.xp) || 0);
  const previousLevel = levelMetaFromXp(state.progress.xp).level;
  state.progress.xp += amount;
  state.progress.dailyGoal.gainedXp += amount;
  const currentXp = Math.max(0, Number(state.progress.xp) || 0);
  const currentLevel = levelMetaFromXp(state.progress.xp).level;

  if (currentLevel > previousLevel) {
    for (let level = previousLevel + 1; level <= currentLevel; level += 1) {
      state.levelUpQueue.push({ from: level - 1, to: level });
    }
  }

  syncAchievements(true);
  updateHeaderControls();

  if (currentLevel > previousLevel) {
    animateHeaderLevelBadge(previousLevel, currentLevel);
    showNextLevelUpCelebration();
  }

  queueLoveMilestones(previousXp, currentXp);
  showNextLoveMilestoneCelebration();

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
    state.lessons = await loadLessons(state.dictionary);
  }
}

function homeCompletionPercent() {
  const goals = state.progress.dailyGoal;
  const targetXp = Math.max(1, Number(goals.targetXp) || 0);
  const gainedXp = Math.max(0, Number(goals.gainedXp) || 0);
  return Math.round(Math.min(gainedXp / targetXp, 1) * 100);
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
  const navIconById = Object.fromEntries(
    NAV_ITEMS.map((item) => {
      const parts = String(item.label || "").split(" ");
      return [item.id, parts[0] || ""];
    })
  );

  return [
    { id: "lessons", title: "Lessons", subtitle: "Scenario based units", icon: navIconById.lessons || "📚" },
    { id: "dictionary", title: "Dictionary", subtitle: "Search full vocabulary", icon: navIconById.dictionary || "📖" },
    { id: "flashcards", title: "Flashcards", subtitle: "Spaced repetition", icon: navIconById.practice || "🧠" },
    { id: "quiz", title: "Quiz", subtitle: "Challenge mode", icon: navIconById.practice || "🧠" },
    { id: "conversation", title: "Conversation", subtitle: "Chat practice", icon: navIconById.practice || "🧠" }
  ];
}

function getDailyAssamFact(seedDate) {
  const key = String(seedDate || todayIso());
  if (!ASSAM_DID_YOU_KNOW_FACTS.length) {
    return {
      title: "Assam has a rich linguistic heritage.",
      detail: "Come back tomorrow for another cultural fact.",
      sourceLabel: "Encyclopaedia Britannica",
      sourceUrl: "https://www.britannica.com/place/Assam",
      imageQuery: "Assam landscape",
      imageAlt: "Landscape view from Assam",
      imageEmoji: "🌄"
    };
  }

  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }

  return ASSAM_DID_YOU_KNOW_FACTS[hash % ASSAM_DID_YOU_KNOW_FACTS.length];
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
  const hasStartedLearning = hasLearningProgress();
  const continueCtaLabel = hasStartedLearning ? "Resume" : "Start";
  const didYouKnowFact = getDailyAssamFact(todayIso());
  const quickCards = buildQuickCards()
    .map(
      (card) => `
        <article class="quick-card" data-action="quick-open" data-target="${card.id}">
          <span class="quick-card-icon" aria-hidden="true">${card.icon || ""}</span>
          <h4>${card.title}</h4>
          <p>${card.subtitle}</p>
        </article>
      `
    )
    .join("");

  home.innerHTML = `
    <section class="grid" style="gap:14px">
      <article class="card grid continue-card" style="gap:12px; background: linear-gradient(150deg, rgba(76,175,80,0.2), rgba(63,81,181,0.15));">
        <div class="row continue-head">
          <div>
            <h3>Continue Learning</h3>
          </div>
          <div class="stat continue-streak-head">
            <span class="value">${state.progress.streak} 🔥</span>
          </div>
        </div>
        <div class="grid continue-stats">
          <div class="stat"><span class="label">Words learned</span><span class="value">${learnedCount}</span></div>
          <div class="stat"><span class="label">XP</span><span class="value">${state.progress.xp}</span></div>
          <div class="stat daily-goal-stat">
            <span class="label">Daily goal</span>
            <span class="value">${renderProgressCircle(progressPercent, 100)}</span>
          </div>
        </div>
        <div class="row continue-actions">
          <button class="btn primary continue-cta" data-action="continue-learning">${continueCtaLabel}</button>
        </div>
      </article>

      <article class="card">
        <h3>Quick Access</h3>
        <div class="grid auto" style="margin-top:12px">${quickCards}</div>
      </article>

      <article class="card">
        <h3>Did You Know?</h3>
        <div class="did-you-know-tile" role="group" aria-label="Daily Assam fact">
          <p class="did-you-know-emoji" aria-hidden="true">${didYouKnowFact.imageEmoji || "🌿"}</p>
          <p class="did-you-know-title">${didYouKnowFact.title}</p>
          <p class="did-you-know-detail">${didYouKnowFact.detail}</p>
          <p><a class="did-you-know-link" href="${didYouKnowFact.sourceUrl}" target="_self" rel="noreferrer">Learn more: ${didYouKnowFact.sourceLabel}</a></p>
        </div>
      </article>
    </section>
  `;
}

function renderLessons() {
  const panel = document.getElementById("view-lessons");
  const removedFavorites = pruneCompletedLessonFavorites();
  if (removedFavorites > 0) {
    saveFavorites(state.favorites);
  }

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
    const isPhraseMode = state.lessonsTypeFilter === "phrase-sentence";
    const isSingleWordMode = state.lessonsTypeFilter === "single-word";
    const selectedLessons = state.lessons.filter((lesson) => {
      if (isPhraseMode) return lesson.kind === "phrase-sentence";
      if (isSingleWordMode) return lesson.kind !== "phrase-sentence";
      return true;
    });
    const favoriteLessons = selectedLessons.filter((lesson) => state.favorites.lessons.includes(lesson.id));
    const favoritesArea = favoriteLessons.length
      ? renderLessonsOverview(favoriteLessons, state.progress, state.activeLessonId, state.favorites)
      : "<p class='meta'>No favorite lessons yet. Tap ☆ on a lesson to add it here.</p>";
    const lessonsArea = selectedLessons.length
      ? renderLessonsOverview(selectedLessons, state.progress, state.activeLessonId, state.favorites)
      : isPhraseMode
        ? "<p class='meta'>No phrase/sentence lessons available yet.</p>"
        : isSingleWordMode
          ? "<p class='meta'>No single-word lessons available yet.</p>"
          : "<p class='meta'>No lessons available yet.</p>";
    const lessonsHeading = isPhraseMode
      ? "Whole Phrases / Sentences"
      : isSingleWordMode
        ? "Single Words"
        : "All Lessons";
    const lessonsDescription = isPhraseMode
      ? "Practice complete expressions and sentence patterns."
      : isSingleWordMode
        ? "Learn one-word vocabulary items first."
        : "See both single-word and phrase/sentence lessons together.";

    panel.classList.remove("lesson-focus");
    document.body.classList.remove("lesson-immersive");
    panel.innerHTML = `
      <section class="grid" style="gap:14px">
        <article class="card grid" style="gap:10px;">
          <h3>Lesson Type</h3>
          <p class="meta">Choose which lesson type to practice.</p>
          <select id="lessons-type-filter" class="input" aria-label="Lesson type filter">
            <option value="all" ${state.lessonsTypeFilter === "all" ? "selected" : ""}>All lessons</option>
            <option value="single-word" ${state.lessonsTypeFilter === "single-word" ? "selected" : ""}>Single words</option>
            <option value="phrase-sentence" ${state.lessonsTypeFilter === "phrase-sentence" ? "selected" : ""}>Whole phrases / sentences</option>
          </select>
        </article>

        <article class="card">
          <h3>Favorite Lessons</h3>
          <p class="meta">Your starred lessons in this lesson type.</p>
          <div style="margin-top:10px">${favoritesArea}</div>
        </article>

        <article class="card">
          <h3>${lessonsHeading}</h3>
          <p class="meta">${lessonsDescription}</p>
          <div style="margin-top:10px">${lessonsArea}</div>
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
    state.favorites.words.includes(activeWord?.id),
    state.lessonLearning.session
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

function focusDictionaryEditPanel() {
  const editPanel = document.querySelector("#view-dictionary [data-action='dictionary-save-edit']")?.closest(".card");
  if (!editPanel) return;

  editPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => {
    const firstInput = document.getElementById("edit-word-english");
    firstInput?.focus();
  }, 120);
}

function refreshLanguageData() {
  resetDictionaryCache();
  resetLessonsCache();
  state.dictionary = [];
  state.lessons = [];
}

function allFlashCategoryIds() {
  return state.lessons.map((lesson) => lesson.id);
}

function cleanFlashCategoryLabel(title) {
  return String(title || "")
    .trim()
    .replace(/\s*\((words|phrases)\)$/i, "")
    .replace(/\s+/g, " ");
}

function inferDictionaryEntryType(entry) {
  if (entry?.entryType === "phrase") return "phrase";
  if (entry?.entryType === "word") return "word";

  const looksLikePhrase = [entry?.english, entry?.assamese]
    .map((text) => String(text || "").trim())
    .some((text) => /[?.!]/.test(text) || text.split(/\s+/).filter(Boolean).length > 1);

  return looksLikePhrase ? "phrase" : "word";
}

function flashLessonsByType() {
  if (!state.flash.categoryTypeFilter || !["words", "phrases"].includes(state.flash.categoryTypeFilter)) {
    return [];
  }

  const wantsPhrases = state.flash.categoryTypeFilter === "phrases";
  return state.lessons.filter((lesson) =>
    wantsPhrases ? lesson.kind === "phrase-sentence" : lesson.kind !== "phrase-sentence"
  );
}

function normalizeFlashCategorySelection() {
  const allowed = new Set(allFlashCategoryIds());
  const selected = (state.flash.selectedCategories || []).filter((id) => allowed.has(id));
  state.flash.selectedCategories = selected;
}

function applyFlashTypeSelectionFilter() {
  normalizeFlashCategorySelection();
  const visibleIds = new Set(flashLessonsByType().map((lesson) => lesson.id));
  const selectedVisible = (state.flash.selectedCategories || []).filter((id) => visibleIds.has(id));
  state.flash.selectedCategories = selectedVisible;
}

function filteredFlashWords() {
  normalizeFlashCategorySelection();
  const selected = new Set(state.flash.selectedCategories || []);
  const words = flattenLessonWords(state.lessons);
  return words.filter((word) => selected.has(word.lessonId));
}

function selectedFlashCategoryWords() {
  normalizeFlashCategorySelection();
  const selected = new Set(state.flash.selectedCategories || []);

  return state.lessons
    .filter((lesson) => selected.has(lesson.id))
    .flatMap((lesson) =>
      (lesson.items || []).map((item) => ({
        ...item,
        lessonId: lesson.id
      }))
    );
}

function buildFlashDeckByMode(words, mode) {
  const orderedWords = [...words];

  if (mode === "random") {
    return shuffleCards(orderedWords).slice(0, 40);
  }

  if (mode === "shuffle") {
    const byCategory = new Map();
    orderedWords.forEach((word) => {
      if (!byCategory.has(word.lessonId)) byCategory.set(word.lessonId, []);
      byCategory.get(word.lessonId).push(word);
    });

    const selectedInOrder = state.lessons
      .map((lesson) => lesson.id)
      .filter((lessonId) => byCategory.has(lessonId));

    const groupedShuffled = selectedInOrder.flatMap((lessonId) => shuffleCards(byCategory.get(lessonId)));
    return groupedShuffled.slice(0, 40);
  }

  return orderedWords.slice(0, 40);
}

function resetFlashSession(words) {
  state.flash.cards = words;
  state.flash.index = 0;
  state.flash.flipped = false;
  state.flash.setupStage = "session";
  state.flash.mode = "session";
  state.flash.reviewedCount = 0;
  state.flash.sessionTotal = words.length;
  state.flash.hardCount = 0;
  state.flash.easyCount = 0;
  state.flash.hardWordIds = [];
}

function renderFlashCategoryControls() {
  applyFlashTypeSelectionFilter();
  const selected = new Set(state.flash.selectedCategories || []);
  const categoryOptions = flashLessonsByType();
  const typeLabel = state.flash.categoryTypeFilter === "phrases" ? "Phrases" : "Words";
  const animateDrop = state.flash.categoryDropAnimating;
  const sourceType = state.flash.categoryDropFromType === "phrases" ? "phrases" : "words";

  const chips = categoryOptions
    .map((lesson) => {
      const active = selected.has(lesson.id);
      return `<button class="flash-category-chip ${active ? "active" : ""}" data-action="flash-toggle-category" data-category="${lesson.id}" aria-pressed="${active}">${cleanFlashCategoryLabel(lesson.title)}</button>`;
    })
    .join("");

  return `
    <article class="card grid flash-setup-card" style="gap:10px;">
      <div class="row" style="flex-wrap: wrap; align-items: center;">
        <h3>Flashcard Categories</h3>
        <span class="pill">${selected.size} selected</span>
      </div>
      <div class="flash-setup-main ${animateDrop ? "flash-categories-main-enter" : ""}">
        <p class="meta">Type: ${typeLabel}</p>
        <div class="flash-drop-origin ${sourceType}">
          <span class="flash-drop-origin-label">${sourceType === "phrases" ? "Phrases" : "Words"}</span>
        </div>
        <div class="flash-category-drop ${animateDrop ? "is-entering" : ""}">
          <div class="flash-category-grid flash-category-grid-scroll">${chips}</div>
        </div>
      </div>
      <div class="row flash-setup-actions" style="justify-content:space-between; flex-wrap:wrap;">
        <button class="btn ghost" data-action="flash-back-type">Back</button>
        <button class="btn accent" data-action="flash-next-mode">Next: Choose mode</button>
      </div>
    </article>
  `;
}

function renderFlashTypeControls() {
  const selectedType = ["words", "phrases"].includes(state.flash.categoryTypeFilter)
    ? state.flash.categoryTypeFilter
    : "";
  const hasSelectedType = Boolean(selectedType);
  const selected = new Set(state.flash.selectedCategories || []);
  const categoryOptions = flashLessonsByType();
  const animateDrop = state.flash.categoryDropAnimating;

  const typeCard = (type, title, detail) => `
    <button class="btn flash-type-btn ${selectedType === type ? "accent" : "ghost"}" data-action="flash-set-type" data-type="${type}">
      <strong>${title}</strong><br /><span class="meta">${detail}</span>
    </button>
  `;

  const chips = categoryOptions
    .map((lesson) => {
      const active = selected.has(lesson.id);
      return `<button class="flash-category-chip ${active ? "active" : ""}" data-action="flash-toggle-category" data-category="${lesson.id}" aria-pressed="${active}">${cleanFlashCategoryLabel(lesson.title)}</button>`;
    })
    .join("");

  const singleTypeCard =
    selectedType === "phrases"
      ? typeCard("phrases", "Phrases", "Practice whole phrases and sentences.")
      : typeCard("words", "Words", "Practice single-word vocabulary.");

  const typeOptionsHtml = hasSelectedType
    ? singleTypeCard
    : `${typeCard("words", "Words", "Practice single-word vocabulary.")}${typeCard("phrases", "Phrases", "Practice whole phrases and sentences.")}`;

  const categoriesHtml = hasSelectedType
    ? `<div class="flash-category-drop ${animateDrop ? "is-entering" : ""}">
          <div class="flash-category-grid flash-category-grid-scroll">${chips}</div>
        </div>`
    : "";

  const heading = hasSelectedType ? "Flashcard Categories" : "Flashcard Type";
  const subline = hasSelectedType
    ? "Choose the categories by clicking on them."
    : "First choose what you want to learn.";
  const nextModeDisabled = hasSelectedType && selected.size ? "" : "disabled";
  const backButtonHtml = hasSelectedType
    ? `<button class="btn ghost" data-action="flash-back-type"><span class="flash-nav-arrow" aria-hidden="true">←</span> Back</button>`
    : "";
  const actionButtonsHtml = hasSelectedType
    ? `<div class="row flash-setup-actions" style="justify-content:space-between;">
        ${backButtonHtml}
        <button class="btn accent" data-action="flash-next-mode" ${nextModeDisabled}>Next <span class="flash-nav-arrow" aria-hidden="true">→</span></button>
      </div>`
    : `<div class="row flash-setup-actions" style="justify-content:space-between;">
        <button class="btn ghost" data-action="flash-back-display-mode"><span class="flash-nav-arrow" aria-hidden="true">←</span> Back</button>
      </div>`;

  return `
    <article class="card grid flash-setup-card ${hasSelectedType ? "flash-categories-stage" : "flash-type-stage"}" style="gap:10px;">
      <h3>${heading}</h3>
      <div class="flash-setup-main ${hasSelectedType && animateDrop ? "flash-categories-main-enter" : ""}">
        <p class="meta">${subline}</p>
        <div class="grid flash-type-options ${hasSelectedType ? "flash-type-options-single" : ""}" style="gap:8px;">
          ${typeOptionsHtml}
        </div>
        ${categoriesHtml}
      </div>
      ${actionButtonsHtml}
    </article>
  `;
}

function renderFlashDisplayModeControls() {
  const mode = ["english-first", "assamese-first", "mixed"].includes(state.flash.displayMode)
    ? state.flash.displayMode
    : "";

  const modeCard = (value, title, detail, flagsHtml) => `
    <button class="btn quiz-mode-btn ${mode === value ? "accent" : "ghost"}" data-action="flash-set-display-mode" data-display-mode="${value}">
      <span class="quiz-mode-title">${title}</span>
      <span class="quiz-mode-detail">${detail}</span>
      <span class="quiz-mode-flags" aria-hidden="true">${flagsHtml}</span>
    </button>
  `;

  const nextDisabled = mode ? "" : "disabled";

  return `
    <article class="card quiz-mode-card grid" style="gap:10px;">
      <h3>Flashcards Mode</h3>
      <p class="meta">Choose which side is shown first before selecting Words or Phrases.</p>
      <div class="grid quiz-mode-grid" style="gap:8px;">
        ${modeCard(
          "english-first",
          "English First",
          "See English first, then flip to Assamese.",
          `<span class="quiz-flag-pill" title="USA flag" aria-label="USA flag"><span class="quiz-flag-symbol">🇺🇸</span><span class="quiz-flag-label">English</span></span><span class="quiz-flag-arrow">→</span><span class="quiz-flag-pill assam" title="India flag" aria-label="India flag"><span class="quiz-flag-symbol">🇮🇳</span><span class="quiz-flag-label">Assamese</span></span>`
        )}
        ${modeCard(
          "assamese-first",
          "Assamese First",
          "See Assamese first, then flip to English.",
          `<span class="quiz-flag-pill assam" title="India flag" aria-label="India flag"><span class="quiz-flag-symbol">🇮🇳</span><span class="quiz-flag-label">Assamese</span></span><span class="quiz-flag-arrow">→</span><span class="quiz-flag-pill" title="USA flag" aria-label="USA flag"><span class="quiz-flag-symbol">🇺🇸</span><span class="quiz-flag-label">English</span></span>`
        )}
        ${modeCard(
          "mixed",
          "Mixed",
          "Cards alternate between Assamese-first and English-first.",
          `<span class="quiz-flag-pill"><span class="quiz-flag-symbol">🇺🇸</span><span class="quiz-flag-label">English</span></span><span class="quiz-flag-pill assam"><span class="quiz-flag-symbol">🇮🇳</span><span class="quiz-flag-label">Assamese</span></span>`
        )}
      </div>
      <div class="row" style="justify-content:flex-end;">
        <button class="btn accent" data-action="flash-next-type" ${nextDisabled}>Next</button>
      </div>
    </article>
  `;
}

function renderFlashModeControls() {
  const mode = state.flash.playMode || "normal";
  const modeCard = (value, title, detail) => `
    <button class="btn ${mode === value ? "accent" : "ghost"}" data-action="flash-set-mode" data-mode="${value}">
      <strong>${title}</strong><br /><span class="meta">${detail}</span>
    </button>
  `;

  return `
    <article class="card grid flash-setup-card flash-mode-stage" style="gap:10px;">
      <h3>Flashcard Mode</h3>
      <div class="flash-setup-main">
        <p class="meta">Pick how cards are ordered for this session.</p>
        <div class="grid" style="gap:8px;">
          ${modeCard("normal", "Normal", "Cards stay in normal category order.")}
          ${modeCard("shuffle", "Shuffle", "Cards are shuffled inside each category, one category after another.")}
          ${modeCard("random", "Random", "Cards from all selected categories are fully random.")}
        </div>
      </div>
      <div class="row flash-setup-actions" style="flex-wrap:wrap; justify-content:space-between;">
        <button class="btn ghost" data-action="flash-back-categories"><span class="flash-nav-arrow" aria-hidden="true">←</span> Back</button>
        <button class="btn accent" data-action="flash-start-session">Start session</button>
      </div>
    </article>
  `;
}

function ensureFlashDeck() {
  if (state.flash.cards.length) return;
  const words = selectedFlashCategoryWords();
  const deck = buildFlashDeckByMode(words, state.flash.playMode);
  resetFlashSession(deck);
}

function renderConversationPanel() {
  if (state.chatSession.isStopped) {
    return `
      <article class="card grid" style="justify-items:center; text-align:center; gap:12px;">
        <h3>Conversation Practice</h3>
        <img src="assets/images/Come back soon.png" alt="Tutor in a flower garden" style="display:block; margin:0 auto; width:min(170px, 45vw); height:auto;" />
        <p style="max-width:560px;">See you soon! I'll be relaxing in my mom's garden while I wait for you. The chrysanthemums are in bloom and smell amazing!</p>
        <button class="btn accent" data-action="chat-start">Start Again</button>
      </article>
    `;
  }

  if (!state.chatSession.isStarted) {
    return `
      <article class="card grid" style="justify-items:center; text-align:center; gap:12px;">
        <h3>Conversation Practice</h3>
        <img src="assets/images/Tutor.png" alt="Conversation tutor" style="width:min(280px, 70vw); height:auto;" />
        <p style="max-width:540px;">👋 Hey there! Think you're ready? Hit Start and let's have a conversation. Let's see what you already know!</p>
        <button class="btn accent" data-action="chat-start">Start</button>
      </article>
    `;
  }

  const bubbles = state.chat
    .map(
      (msg) => `
      <div class="chat-bubble ${msg.who}">
        <p>${msg.text}</p>
      </div>
    `
    )
    .join("");

  const answerOptionButtons = (state.chatSession.answerOptions || [])
    .map((entryId) => getDictionaryEntryById(entryId))
    .filter(Boolean)
    .map((entry) => `
      <button class="btn ghost" data-action="chat-answer-option" data-entry-id="${entry.id}" style="text-align:left; display:block; width:100%;">
        <strong>${entry.assamese}</strong>
      </button>
    `)
    .join("");

  const askOptionButtons = (state.chatSession.askOptions || [])
    .map((entryId) => getDictionaryEntryById(entryId))
    .filter(Boolean)
    .map((entry) => `
      <button class="btn ghost" data-action="chat-ask-option" data-entry-id="${entry.id}" style="text-align:left; display:block; width:100%;">
        <strong>${entry.assamese}</strong>
      </button>
    `)
    .join("");

  const controls = state.chatSession.stage === "answer"
    ? `
      <div class="grid" style="gap:8px;">
        <p class="meta">Choose the best Assamese answer:</p>
        ${answerOptionButtons}
      </div>
    `
    : `
      <div class="grid" style="gap:8px;">
        <p class="meta">Now choose one question to ask the tutor:</p>
        ${askOptionButtons}
      </div>
    `;

  return `
    <article class="card grid">
      <h3>Conversation Practice</h3>
      <div class="chat-panel" id="chat-panel">${bubbles}</div>
      ${controls}
      <div class="row" style="justify-content:flex-end; flex-wrap:wrap; gap:8px;">
        <button class="btn ghost" data-action="chat-stop">Stop Conversation</button>
      </div>
      <p class="meta">Only Assamese phrases are shown in this mode.</p>
    </article>
  `;
}

function renderQuizModeControls() {
  const mode = ["english-to-assamese", "assamese-to-english", "mixed"].includes(state.quiz.mode)
    ? state.quiz.mode
    : "";
  const startDisabled = mode ? "" : "disabled";
  const modeCard = (value, title, detail, flagsHtml) => `
    <button class="btn quiz-mode-btn ${mode === value ? "accent" : "ghost"}" data-action="quiz-set-mode" data-mode="${value}">
      <span class="quiz-mode-title">${title}</span>
      <span class="quiz-mode-detail">${detail}</span>
      <span class="quiz-mode-flags" aria-hidden="true">${flagsHtml}</span>
    </button>
  `;

  return `
    <article class="card quiz-mode-card grid" style="gap:10px;">
      <h3>Quiz Mode</h3>
      <p class="meta">Pick your language direction before the challenge starts.</p>
      <div class="grid quiz-mode-grid" style="gap:8px;">
        ${modeCard(
          "english-to-assamese",
          "English to Assamese",
          "See English prompts and pick Assamese answers.",
          `<span class="quiz-flag-pill" title="USA flag" aria-label="USA flag"><span class="quiz-flag-symbol">🇺🇸</span><span class="quiz-flag-label">USA</span></span><span class="quiz-flag-arrow">→</span><span class="quiz-flag-pill assam" title="India flag" aria-label="India flag"><span class="quiz-flag-symbol">🇮🇳</span><span class="quiz-flag-label">Assam</span></span>`
        )}
        ${modeCard(
          "assamese-to-english",
          "Assamese to English",
          "See Assamese prompts and pick English answers.",
          `<span class="quiz-flag-pill assam" title="India flag" aria-label="India flag"><span class="quiz-flag-symbol">🇮🇳</span><span class="quiz-flag-label">Assam</span></span><span class="quiz-flag-arrow">→</span><span class="quiz-flag-pill" title="USA flag" aria-label="USA flag"><span class="quiz-flag-symbol">🇺🇸</span><span class="quiz-flag-label">USA</span></span>`
        )}
        ${modeCard(
          "mixed",
          "Mixed",
          "Questions randomly switch both directions.",
          `<span class="quiz-flag-pill"><span class="quiz-flag-symbol">🇺🇸</span><span class="quiz-flag-label">USA</span></span><span class="quiz-flag-pill assam"><span class="quiz-flag-symbol">🇮🇳</span><span class="quiz-flag-label">Assam</span></span>`
        )}
      </div>
      <div class="row" style="justify-content:flex-end;">
        <button class="btn accent" data-action="quiz-start" ${startDisabled}>Start Quiz</button>
      </div>
    </article>
  `;
}

function renderPractice() {
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
            : state.flash.setupStage === "display-mode"
              ? renderFlashDisplayModeControls()
              : state.flash.setupStage === "type"
              ? renderFlashTypeControls()
              : state.flash.setupStage === "mode"
                ? renderFlashModeControls()
                : `${(() => {
                    ensureFlashDeck();
                    const sessionIndex = Math.min(state.flash.cards.length - 1, Math.max(0, state.flash.index));
                    const sessionCard = state.flash.cards[sessionIndex];
                    return renderFlashcard(
                      sessionCard,
                      state.flash.flipped,
                      state.flash.reviewedCount,
                      state.flash.sessionTotal,
                      state.flash.playMode,
                      state.flash.displayMode
                    );
                  })()}`
          : ""
      }
      ${
        state.practiceTab === "quiz"
          ? state.quiz.setupStage === "mode"
            ? renderQuizModeControls()
            : renderQuizView({
                question: currentQuestion,
                total: state.quiz.questions.length,
                score: state.quiz.score,
                answered: state.quiz.answered,
                selected: state.quiz.selected,
                showCongrats: state.quiz.showCongrats,
                showSummary: state.quiz.showSummary,
                mode: state.quiz.mode
              })
          : ""
      }
      ${state.practiceTab === "conversation" ? renderConversationPanel() : ""}
    </section>
  `;

  const pinConversationToLatest = () => {
    const chatPanel = document.getElementById("chat-panel");
    if (!chatPanel) return;
    chatPanel.style.overflowAnchor = "none";
    chatPanel.scrollTop = chatPanel.scrollHeight;
    const lastBubble = chatPanel.querySelector(".chat-bubble:last-child");
    if (lastBubble && typeof lastBubble.scrollIntoView === "function") {
      lastBubble.scrollIntoView({ block: "end" });
    }
  };

  if (chatPinIntervalId) {
    clearInterval(chatPinIntervalId);
    chatPinIntervalId = null;
  }

  if (state.practiceTab === "conversation") {
    pinConversationToLatest();
    requestAnimationFrame(pinConversationToLatest);
    [0, 50, 120, 250, 400, 600, 900].forEach((delay) => setTimeout(pinConversationToLatest, delay));

    const startedAt = Date.now();
    chatPinIntervalId = setInterval(() => {
      if (Date.now() - startedAt > 3000 || state.practiceTab !== "conversation") {
        clearInterval(chatPinIntervalId);
        chatPinIntervalId = null;
        return;
      }
      pinConversationToLatest();
    }, 100);
  }
}

function renderAchievements() {
  const earned = new Set(state.progress.achievements || []);
  const tiers = [
    {
      title: "Beginner",
      ids: ["dictionary-starter", "lesson-starter", "quiz-starter", "xp-rookie"]
    },
    {
      title: "Intermediate",
      ids: ["dictionary-builder", "lesson-climber", "dictionary-master", "level-5-learner"]
    },
    {
      title: "Advanced",
      ids: ["quiz-master", "xp-pro", "streak-hero", "level-10-learner"]
    }
  ];

  const byId = new Map(ACHIEVEMENT_CANDIDATES.map((item) => [item.id, item]));

  return tiers
    .map((tier) => {
      const cards = tier.ids
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((item) => `
          <div class="achievement ${earned.has(item.id) ? "unlocked" : "locked"}">
            <div class="achievement-badge" aria-hidden="true">
              <span class="achievement-trophy">🏆</span>
              <span class="achievement-icon">${item.icon}</span>
            </div>
            <h4>${item.label}</h4>
            <p class="achievement-desc">${item.description}</p>
            <p class="achievement-state">${earned.has(item.id) ? "Unlocked" : "Locked"}</p>
          </div>
        `)
        .join("");

      return `
        <section class="achievement-tier">
          <h4 class="achievement-tier-title">${tier.title}</h4>
          <div class="grid auto achievement-tier-grid">${cards}</div>
        </section>
      `;
    })
    .join("");
}

function renderProfile() {
  syncAchievements(false);
  const panel = document.getElementById("view-profile");
  const accuracy = state.progress.quizAttempts
    ? Math.round((state.progress.quizCorrect / state.progress.quizAttempts) * 100)
    : 0;
  const currentLevel = levelMetaFromXp(state.progress.xp).level;
  const xpToNextLevel = xpNeededForNextLevel(state.progress.xp);
  const nextLevelCopy = xpToNextLevel === 0 ? "Max level reached" : `${xpToNextLevel} XP to next level`;
  const syncEndpoint = escapeHtmlAttr(state.settings.syncEndpoint || "");
  const syncToken = escapeHtmlAttr(state.settings.syncToken || "");
  const activeAvatar = FIXED_AVATAR_ID;

  panel.innerHTML = `
    <section class="grid" style="gap:14px">
      <article class="card row" style="align-items:flex-start; flex-wrap: wrap;">
        <div>
          <h3>👤 Learner Profile</h3>
          <p class="meta">Settings, statistics and achievements.</p>
        </div>
        <div class="pill">Avatar: ${avatarDisplayName(activeAvatar)}</div>
      </article>

      <article class="card grid">
        <h3>Profile</h3>
        <p class="meta">Update your display name and use your fixed peacock identity.</p>
        <label for="profile-name" class="meta">Display name</label>
        <input id="profile-name" class="input" value="${state.settings.profileName}" maxlength="30" aria-label="Display name" />
      </article>

      <article class="card grid" style="gap:12px;">
        <h3>Profile Picture</h3>
        <figure class="profile-picture-frame" aria-label="Profile picture preview">
          <img class="profile-picture-image" src="${FIXED_PROFILE_IMAGE_PATH}" alt="${FIXED_AVATAR_LABEL} profile picture" loading="eager" decoding="async" />
        </figure>
      </article>

      <article class="card grid" style="gap:12px;">
        <h3>Avatar</h3>
        <figure class="profile-avatar-frame" aria-label="Avatar preview">
          <img class="profile-avatar-image" src="${FIXED_AVATAR_IMAGE_PATH}" alt="${FIXED_AVATAR_LABEL} avatar" loading="eager" decoding="async" />
        </figure>
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
        <div class="achievement-groups" style="margin-top:10px">${renderAchievements()}</div>
      </article>

      <article class="card grid xp-rules-card">
        <h3>XP Rewards</h3>
        <p class="meta">How XP is earned in each activity.</p>
        <ul class="xp-rules-list" aria-label="XP reward rules">
          <li><span>Complete a lesson</span><strong>+40 XP</strong></li>
          <li><span>Restart a lesson</span><strong>+10 XP</strong></li>
          <li><span>Flashcard review</span><strong>+4 XP</strong></li>
          <li><span>Correct quiz answer</span><strong>+8 XP</strong></li>
          <li><span>Finish a quiz</span><strong>+20 XP</strong></li>
          <li><span>Conversation message</span><strong>+2 XP</strong></li>
        </ul>
      </article>

      <article class="card grid">
        <h3>Cloud Sync (Cross-Device)</h3>
        <p class="meta">Use a hosted API to sync progress between laptop and iPhone, even when your laptop is offline.</p>
        <label for="profile-sync-endpoint" class="meta">Sync endpoint</label>
        <input id="profile-sync-endpoint" class="input" value="${syncEndpoint}" placeholder="https://your-worker-domain/api/state" aria-label="Cloud sync endpoint" />
        <label for="profile-sync-token" class="meta">Sync token</label>
        <input id="profile-sync-token" class="input" type="password" value="${syncToken}" placeholder="Optional shared secret" aria-label="Cloud sync token" />
        <div class="row" style="flex-wrap: wrap; justify-content:flex-start;">
          <button class="btn accent" data-action="sync-save-config">Save Sync Settings</button>
          <button class="btn ghost" data-action="sync-test-config">Test Sync</button>
          <button class="btn ghost" data-action="sync-clear-config">Clear</button>
          <button class="btn secondary" data-action="force-refresh-app">Force Refresh App</button>
        </div>
        <p class="meta">Use Force Refresh when mobile still shows an older app version.</p>
      </article>

      <article class="card grid">
        <h3>Daily XP Goal</h3>
        <input id="profile-daily-goal" class="input" type="number" min="20" max="5000" value="${state.progress.dailyGoal.targetXp}" aria-label="Daily XP goal" />
        <div class="row" style="flex-wrap: wrap;">
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

function normalizeChatText(text) {
  return String(text || "").trim().toLowerCase();
}

function getDictionaryEntryById(entryId) {
  return state.dictionary.find((entry) => String(entry.id) === String(entryId)) || null;
}

function getDictionaryEntryByEnglish(englishText) {
  const wanted = normalizeChatText(englishText);
  return state.dictionary.find((entry) => normalizeChatText(entry.english) === wanted) || null;
}

function getDictionaryEntryByAssamese(assameseText) {
  const wanted = normalizeChatText(assameseText);
  return state.dictionary.find((entry) => normalizeChatText(entry.assamese) === wanted) || null;
}

function getQuestionEntries() {
  return state.dictionary.filter((entry) => {
    const as = String(entry?.assamese || "").trim();
    const en = String(entry?.english || "").trim();
    return as.includes("?") || en.includes("?");
  });
}

function pushChatEntry(who, entry, translationOverride = "") {
  if (!entry) return;
  const translation = translationOverride || String(entry.english || "").trim();
  state.chat.push({
    who,
    text: String(entry.assamese || "").trim(),
    translation
  });
}

function pickUniqueEntries(entries, maxCount = 4) {
  const seen = new Set();
  const picked = [];
  entries.forEach((entry) => {
    if (!entry) return;
    const id = String(entry.id);
    if (seen.has(id)) return;
    seen.add(id);
    picked.push(entry);
  });
  return picked.slice(0, maxCount);
}

function buildGuidedConversationRound(turn) {
  const howAreYou = getDictionaryEntryByEnglish("How are you?");
  const iAmFine = getDictionaryEntryByEnglish("I am fine");
  const whereFrom = getDictionaryEntryByEnglish("Where are you from?");
  const iLiveIn = getDictionaryEntryByEnglish("I live in...");
  const hello = getDictionaryEntryByEnglish("Hello") || getDictionaryEntryByAssamese("Nomoskar");
  const thankYou = getDictionaryEntryByEnglish("Thank you");

  const templates = [
    {
      question: howAreYou,
      correctAnswer: iAmFine,
      distractors: [hello, thankYou, iLiveIn]
    },
    {
      question: whereFrom,
      correctAnswer: iLiveIn,
      distractors: [iAmFine, hello, thankYou]
    }
  ].filter((template) => template.question && template.correctAnswer);

  const fallbackQuestion = getQuestionEntries()[0] || state.dictionary[0] || null;
  const fallbackAnswer = state.dictionary.find((entry) => String(entry.assamese || "").trim()) || fallbackQuestion;
  const activeTemplate = templates.length ? templates[turn % templates.length] : {
    question: fallbackQuestion,
    correctAnswer: fallbackAnswer,
    distractors: state.dictionary.slice(0, 6)
  };

  const answerOptions = pickUniqueEntries([
    activeTemplate.correctAnswer,
    ...(activeTemplate.distractors || []),
    ...state.dictionary
  ], 4);

  const preferredAskEntries = [howAreYou, whereFrom, getDictionaryEntryByEnglish("What is your name?")].filter(Boolean);
  const askOptions = pickUniqueEntries([
    ...preferredAskEntries,
    ...getQuestionEntries(),
    ...state.dictionary
  ], 4);

  return {
    question: activeTemplate.question,
    correctAnswer: activeTemplate.correctAnswer,
    answerOptions,
    askOptions
  };
}

function beginNextGuidedConversationRound() {
  const round = buildGuidedConversationRound(state.chatSession.turn || 0);
  state.chatSession.currentQuestionId = String(round.question?.id || "");
  state.chatSession.answerOptions = round.answerOptions.map((entry) => String(entry.id));
  state.chatSession.askOptions = round.askOptions.map((entry) => String(entry.id));
  state.chatSession.lastExplainedEntryId = String(round.question?.id || "");
  state.chatSession.stage = "answer";
  pushChatEntry("bot", round.question);
}

function startGuidedConversationSession() {
  state.chatSession.isStarted = true;
  state.chatSession.isStopped = false;
  state.chatSession.stage = "answer";
  state.chatSession.currentQuestionId = "";
  state.chatSession.answerOptions = [];
  state.chatSession.askOptions = [];
  state.chatSession.turn = 0;
  state.chatSession.introducedEntryIds = [];
  state.chatSession.recentEntryIds = [];
  state.chatSession.lastExplainedEntryId = "";
  state.chatSession.lastUserText = "";
  state.chat = [];

  const greeting = getDictionaryEntryByEnglish("Hello") || getDictionaryEntryByAssamese("Nomoskar");
  pushChatEntry("bot", greeting);
  beginNextGuidedConversationRound();
}

function guidedAnswerForLearnerQuestion(questionEntry) {
  const answerMap = {
    "How are you?": "I am fine",
    "Where are you from?": "I live in...",
    "What is your name?": "Hello"
  };

  const matched = getDictionaryEntryByEnglish(answerMap[String(questionEntry?.english || "")]);
  if (matched) return matched;

  return getDictionaryEntryByEnglish("I am fine") ||
    getDictionaryEntryByEnglish("I live in...") ||
    getDictionaryEntryByEnglish("Hello") ||
    state.dictionary[0] ||
    null;
}

function ensureLessonProgressStore() {
  if (!state.progress.lessonWordProgress || typeof state.progress.lessonWordProgress !== "object") {
    state.progress.lessonWordProgress = {};
  }
}

function ensureLessonWordProgressEntry(item) {
  ensureLessonProgressStore();
  const id = String(item?.id || "");
  if (!id) return null;

  const existing = state.progress.lessonWordProgress[id] || {};
  state.progress.lessonWordProgress[id] = {
    id,
    term: String(item?.assamese || "").trim(),
    translation: String(item?.english || "").trim(),
    reviewCompleted: Boolean(existing.reviewCompleted),
    matchingCorrectCount: Math.max(0, Number(existing.matchingCorrectCount) || 0),
    writingCorrectCount: Math.max(0, Number(existing.writingCorrectCount) || 0),
    mistakeCount: Math.max(0, Number(existing.mistakeCount) || 0),
    learned: Boolean(existing.learned),
    lastPracticedAt: existing.lastPracticedAt || null
  };

  return state.progress.lessonWordProgress[id];
}

function touchLessonWordProgress(wordId) {
  const id = String(wordId || "");
  if (!id) return;
  ensureLessonProgressStore();
  if (!state.progress.lessonWordProgress[id]) return;
  state.progress.lessonWordProgress[id].lastPracticedAt = new Date().toISOString();
}

function markLessonWordReviewed(item) {
  const entry = ensureLessonWordProgressEntry(item);
  if (!entry) return;
  entry.reviewCompleted = true;
  touchLessonWordProgress(entry.id);
}

function recordLessonMatchResult(item, isCorrect) {
  const entry = ensureLessonWordProgressEntry(item);
  if (!entry) return;
  if (isCorrect) {
    entry.matchingCorrectCount += 1;
  } else {
    entry.mistakeCount += 1;
    entry.learned = false;
  }
  touchLessonWordProgress(entry.id);
}

function recordLessonWritingResult(item, isCorrect) {
  const entry = ensureLessonWordProgressEntry(item);
  if (!entry) return;
  if (isCorrect) {
    entry.writingCorrectCount += 1;
  } else {
    entry.writingCorrectCount = Math.max(0, entry.writingCorrectCount - 1);
    entry.mistakeCount += 1;
    entry.learned = false;
  }
  touchLessonWordProgress(entry.id);
}

function startLessonLearningSession(lesson) {
  if (!state.lessonLearning || typeof state.lessonLearning !== "object") {
    state.lessonLearning = { session: null };
  }
  state.lessonLearning.session = createLessonLearningSession(lesson);
  state.activeLessonIndex = 0;
}

function finishLessonLearningSession(lesson) {
  const session = state.lessonLearning.session;
  if (!lesson || !session) return;

  ensureLessonProgressStore();
  state.progress.wordsLearned = [...new Set((state.progress.wordsLearned || []).filter(Boolean).map((id) => String(id)))];

  let learnedNowCount = 0;
  session.words.forEach((item) => {
    const id = String(item.id || "");
    if (!id) return;
    const entry = ensureLessonWordProgressEntry(item);
    if (!entry) return;

    const unresolvedMistake = Boolean(session.unresolvedMistakesByWord?.[id]);
    const learned = entry.reviewCompleted
      && entry.matchingCorrectCount >= 1
      && entry.writingCorrectCount >= 2
      && !unresolvedMistake;

    entry.learned = learned;
    touchLessonWordProgress(id);

    if (learned) {
      if (!state.progress.wordsLearned.includes(id)) {
        state.progress.wordsLearned.push(id);
        xpGain(12, "Learned a new word");
        addActivity(`Learned word ${id}`);
      }
      addRecentWord(id);
      learnedNowCount += 1;
    }
  });

  session.learnedNowCount = learnedNowCount;

  const allLessonWordsLearned = lesson.items.every((item) => {
    const id = String(item.id || "");
    const progressEntry = state.progress.lessonWordProgress?.[id];
    return Boolean(progressEntry?.learned);
  });

  if (allLessonWordsLearned && !state.progress.lessonsCompleted.includes(lesson.id)) {
    state.progress.lessonsCompleted.push(lesson.id);
    pruneCompletedLessonFavorites();
    state.progress.dailyGoal.lessonsDone += 1;
    xpGain(40, `Completed lesson ${lesson.title}`);
    if (state.settings.animations) drawConfetti();
  }
}

function addRecentWord(wordId) {
  state.recentWords = [wordId, ...state.recentWords.filter((id) => id !== wordId)].slice(0, 20);
}

async function onClick(event) {
  const rawTarget = event.target;
  const target = rawTarget instanceof Element
    ? rawTarget
    : rawTarget instanceof Node
      ? rawTarget.parentElement
      : null;
  if (!target) return;
  const actionTarget = target.closest("[data-action]");
  const action = actionTarget?.dataset.action;
  const actionSource = actionTarget || target;
  const wordCard = target.closest("[data-word-id]");

  if (wordCard) {
    addRecentWord(wordCard.dataset.wordId);
    persist();
  }

  const navTarget = target.closest("[data-nav]");
  if (navTarget?.dataset.nav) {
    setView(navTarget.dataset.nav);
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
    const entryType = document.getElementById("new-word-entry-type")?.value || "word";
    const exampleAssamese = document.getElementById("new-word-example-assamese")?.value || "";
    const exampleEnglish = document.getElementById("new-word-example-english")?.value || "";

    const result = addCustomDictionaryWord({ english, assamese, category, entryType, exampleAssamese, exampleEnglish });
    if (!result.ok) {
      toast(result.reason === "duplicate" ? "That word pair already exists" : "Please enter both English and Assamese");
      return;
    }

    refreshLanguageData();
    state.dictionaryEdit = {
      key: "",
      english: "",
      assamese: "",
      example: "",
      exampleEnglish: "",
      category: "Custom",
      entryType: "word"
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
      example: current.example || "",
      exampleEnglish: current.exampleEnglish || current.exampleTranslation || current.translation || "",
      category: current.category || "Custom",
      entryType: inferDictionaryEntryType(current)
    };
    renderDictionary();
    requestAnimationFrame(() => focusDictionaryEditPanel());
    return;
  }

  if (action === "dictionary-save-edit") {
    const key = state.dictionaryEdit.key;
    if (!key) return;

    const currentEntry = state.dictionary.find((entry) => encodeURIComponent(entry.__baseKey || "") === key);
    const previousEntryType = inferDictionaryEntryType(currentEntry);
    const nextEntryType = state.dictionaryEdit.entryType === "phrase" ? "phrase" : "word";

    const result = editDictionaryWord(key, {
      english: state.dictionaryEdit.english,
      assamese: state.dictionaryEdit.assamese,
      exampleAssamese: state.dictionaryEdit.example,
      exampleEnglish: state.dictionaryEdit.exampleEnglish,
      category: state.dictionaryEdit.category,
      entryType: state.dictionaryEdit.entryType
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
      example: "",
      exampleEnglish: "",
      category: "Custom",
      entryType: "word"
    };
    renderCurrentView();
    if (previousEntryType !== nextEntryType) {
      const nextEntryLabel = nextEntryType === "phrase" ? "Phrase" : "Word";
      toast(`Word updated. Lessons moved to ${nextEntryLabel}.`);
    } else {
      toast("Word updated");
    }
    return;
  }

  if (action === "dictionary-cancel-edit") {
    state.dictionaryEdit = {
      key: "",
      english: "",
      assamese: "",
      example: "",
      exampleEnglish: "",
      category: "Custom",
      entryType: "word"
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

    openDictionaryDeleteDialog(deletedEntry, key);
    return;
  }

  if (action === "dictionary-cancel-delete") {
    closeDictionaryDeleteDialog();
    return;
  }

  if (action === "dictionary-confirm-delete") {
    const key = state.dictionaryDeleteDialog.key;
    closeDictionaryDeleteDialog();
    if (!key) {
      toast("Word not found");
      return;
    }
    performDictionaryDelete(key);
    return;
  }

  if (action === "onboarding-avatar") {
    state.onboarding.avatar = normalizeAvatarId(actionSource.dataset.avatar || state.onboarding.avatar);
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

  if (action === "app-start-continue") {
    closeAppStartScreen();
    maybeShowDailyChestPrompt();
    return;
  }

  if (action === "daily-chest-open") {
    closeDailyChestModal();
    claimDailyChestReward();
    return;
  }

  if (action === "daily-chest-later") {
    closeDailyChestModal();
    return;
  }

  if (action === "unlock-achievement") {
    animateAchievementToProfile();
    return;
  }

  if (action === "level-up-continue") {
    closeLevelUpCelebration();
    showNextLevelUpCelebration();
    return;
  }

  if (action === "love-milestone-continue") {
    closeLoveMilestoneCelebration();
    persist();
    showNextLoveMilestoneCelebration();
    return;
  }

  if (action === "chest-result-continue") {
    closeChestResultModal();
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
    const requestedLessonId = String(
      actionSource.dataset.lesson
      || actionSource.closest("[data-lesson]")?.dataset.lesson
      || ""
    ).trim();
    if (!requestedLessonId) {
      toast("Lesson not found");
      return;
    }

    state.activeLessonId = requestedLessonId;
    state.activeLessonIndex = 0;
    state.lessonsScreen = "detail";
    const lesson = state.lessons.find((item) => item.id === state.activeLessonId);
    if (lesson) {
      startLessonLearningSession(lesson);
    } else {
      toast("Lesson not found");
      return;
    }
    renderLessons();
    return;
  }

  if (action === "restart-lesson") {
    const requestedLessonId = String(
      actionSource.dataset.lesson
      || actionSource.closest("[data-lesson]")?.dataset.lesson
      || state.activeLessonId
      || ""
    ).trim();
    if (!requestedLessonId) {
      toast("Lesson not found");
      return;
    }

    state.activeLessonId = requestedLessonId;
    state.activeLessonIndex = 0;
    state.lessonsScreen = "detail";
    const lesson = state.lessons.find((item) => item.id === state.activeLessonId);
    if (lesson) {
      xpGain(10, `Restarted lesson ${lesson.title}`);
      startLessonLearningSession(lesson);
    } else {
      toast("Lesson not found");
      return;
    }
    renderLessons();
    return;
  }

  if (action === "lesson-back") {
    state.lessonsScreen = "overview";
    state.lessonLearning.session = null;
    renderLessons();
    return;
  }

  if (action === "lesson-congrats-overview") {
    state.lessonsScreen = "overview";
    state.lessonLearning.session = null;
    renderLessons();
    return;
  }

  if (action === "lesson-congrats-review") {
    state.lessonsScreen = "detail";
    const lesson = state.lessons.find((item) => item.id === state.activeLessonId);
    if (lesson) {
      startLessonLearningSession(lesson);
    }
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
    if (state.lessonLearning.session?.stage && state.lessonLearning.session.stage !== "review") return;
    state.activeLessonIndex = Math.max(0, state.activeLessonIndex - 1);
    renderLessons();
    return;
  }

  if (action === "lesson-next") {
    if (state.lessonLearning.session?.stage && state.lessonLearning.session.stage !== "review") return;
    const lesson = state.lessons.find((item) => item.id === state.activeLessonId);
    if (!lesson) return;

    if (!state.lessonLearning.session) {
      startLessonLearningSession(lesson);
    }

    const session = state.lessonLearning.session;
    if (!session || session.stage !== "review") return;

    const currentItem = lesson.items[state.activeLessonIndex] || lesson.items[0];
    if (!currentItem) return;

    markLessonWordReviewed(currentItem);
    markLessonReviewComplete(session, currentItem.id);

    if (lessonReviewComplete(session)) {
      startLessonMatchingStage(session);
      persist();
      renderLessons();
      return;
    }

    state.activeLessonIndex = Math.min(lesson.items.length - 1, state.activeLessonIndex + 1);
    persist();
    renderLessons();
    renderHome();
    return;
  }

  if (action === "mark-learned") {
    const wordId = String(actionSource.dataset.word || "").trim();
    if (!wordId) {
      toast("This lesson item cannot be marked as learned");
      return;
    }
    const lesson = state.lessons.find((item) => item.id === state.activeLessonId);
    if (!lesson) return;
    if (!state.lessonLearning.session) {
      startLessonLearningSession(lesson);
    }

    const session = state.lessonLearning.session;
    if (session?.stage !== "review") return;

    const currentItem = lesson.items.find((item) => String(item.id) === wordId) || lesson.items[state.activeLessonIndex];
    if (!currentItem) return;

    markLessonWordReviewed(currentItem);
    markLessonReviewComplete(session, currentItem.id);

    if (lessonReviewComplete(session)) {
      startLessonMatchingStage(session);
      persist();
      renderLessons();
      return;
    }

    state.activeLessonIndex = Math.min(lesson.items.length - 1, state.activeLessonIndex + 1);
    persist();
    renderLessons();
    renderHome();
    return;
  }

  if (action === "lesson-match-select") {
    const lesson = state.lessons.find((item) => item.id === state.activeLessonId);
    const session = state.lessonLearning.session;
    if (!lesson || !session) return;
    if (session.stage !== "matching") return;

    const side = actionSource.dataset.side;
    const cardId = actionSource.dataset.cardId;
    const result = selectLessonMatchingCard(session, side, cardId);
    if (!result?.changed) return;
    const wrongPairToken = !result.correct ? result?.wrongPair?.token : null;

    if (result.resolved) {
      (result.wordIds || []).forEach((id) => {
        const item = lesson.items.find((entry) => String(entry.id) === String(id));
        if (!item) return;

        if (result.correct) {
          recordLessonMatchResult(item, true);
          updateSpacedRepetition(state.progress, item.id, "good");
          session.unresolvedMistakesByWord[String(item.id)] = false;
        } else {
          recordLessonMatchResult(item, false);
          updateSpacedRepetition(state.progress, item.id, "hard");
          session.unresolvedMistakesByWord[String(item.id)] = true;
        }
      });

    }

    persist();
    renderLessons();

    if (wrongPairToken) {
      window.setTimeout(() => {
        const latestSession = state.lessonLearning.session;
        if (!latestSession || latestSession.stage !== "matching" || !latestSession.matching) return;
        if (latestSession.matching.wrongPair?.token !== wrongPairToken) return;

        latestSession.matching.wrongPair = null;
        if (state.view === "lessons" && state.lessonsScreen === "detail") {
          renderLessons();
        }
      }, 650);
    }

    return;
  }

  if (action === "lesson-match-continue") {
    const session = state.lessonLearning.session;
    if (!session || session.stage !== "matching" || !session.matching) return;

    const totalPairs = session.matching.leftCards.length;
    const matchedPairs = session.matching.matchedWordIds.length;
    if (matchedPairs < totalPairs) return;

    startLessonWritingStage(session);
    persist();
    renderLessons();
    return;
  }

  if (action === "lesson-writing-submit") {
    const lesson = state.lessons.find((item) => item.id === state.activeLessonId);
    const session = state.lessonLearning.session;
    if (!lesson || !session || session.stage !== "writing") return;

    const input = document.getElementById("lesson-writing-input");
    const typed = String(input?.value || "");
    const result = submitLessonWritingAnswer(session, typed);
    if (!result?.changed) return;

    const currentItem = lesson.items.find((item) => String(item.id) === String(result.wordId));
    if (currentItem) {
      if (result.correct) {
        recordLessonWritingResult(currentItem, true);
        updateSpacedRepetition(state.progress, currentItem.id, "good");
        session.unresolvedMistakesByWord[String(currentItem.id)] = false;
      } else {
        recordLessonWritingResult(currentItem, false);
        updateSpacedRepetition(state.progress, currentItem.id, "hard");
        session.unresolvedMistakesByWord[String(currentItem.id)] = true;
      }
    }

    if (result.completed) {
      finishLessonLearningSession(lesson);
      state.lessonsScreen = "congrats";
    }

    persist();
    renderLessons();
    renderHome();
    return;
  }

  if (action === "lesson-session-finish") {
    state.lessonsScreen = "congrats";
    renderLessons();
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
    const isCompleted = state.progress.lessonsCompleted.includes(lessonId);

    if (isCompleted) {
      if (idx >= 0) {
        list.splice(idx, 1);
        persist();
      }
      toast("Completed lessons are removed from favorites");
      if (state.view === "lessons") renderLessons();
      return;
    }

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
    if (nextTab === "quiz") {
      state.quiz.questions = [];
      state.quiz.index = 0;
      state.quiz.score = 0;
      state.quiz.answered = false;
      state.quiz.selected = "";
      state.quiz.showCongrats = false;
      state.quiz.showSummary = false;
      state.quiz.mode = "";
      state.quiz.setupStage = "mode";
    }
    if (nextTab === "flashcards") {
      state.flash.setupStage = "display-mode";
      state.flash.displayMode = "";
      state.flash.categoryTypeFilter = "";
      state.flash.selectedCategories = [];
      state.flash.cards = [];
      state.flash.mode = "session";
      state.flash.flipped = false;
    }
    if (nextTab === "conversation") {
      state.chatSession.isStarted = false;
      state.chatSession.isStopped = false;
      state.chatSession.stage = "idle";
      state.chatSession.currentQuestionId = "";
      state.chatSession.answerOptions = [];
      state.chatSession.askOptions = [];
      state.chatSession.turn = 0;
      state.chatSession.lastExplainedEntryId = "";
      state.chatSession.lastUserText = "";
      state.chat = [{ who: "bot", text: "Nomoskar!", translation: "Hello" }];
    }
    state.practiceTab = nextTab;
    renderPractice();
    return;
  }

  if (action === "chat-start") {
    startGuidedConversationSession();
    renderPractice();
    return;
  }

  if (action === "chat-stop") {
    state.chatSession.isStarted = false;
    state.chatSession.isStopped = true;
    state.chatSession.stage = "idle";
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
      persist();
      renderPractice();
      return;
    }

    state.flash.index = Math.min(state.flash.cards.length - 1, state.flash.index + 1);

    persist();
    renderPractice();
    return;
  }

  if (action === "flash-next-mode") {
    if (!state.flash.selectedCategories.length) {
      toast("Choose at least one category first");
      return;
    }
    state.flash.categoryDropAnimating = false;
    state.flash.setupStage = "mode";
    renderPractice();
    return;
  }

  if (action === "flash-next-categories") {
    applyFlashTypeSelectionFilter();
    state.flash.categoryDropFromType = state.flash.categoryTypeFilter === "phrases" ? "phrases" : "words";
    state.flash.categoryDropAnimating = true;
    state.flash.setupStage = "type";
    renderPractice();
    return;
  }

  if (action === "flash-next-type") {
    if (!["english-first", "assamese-first", "mixed"].includes(state.flash.displayMode)) {
      toast("Choose a flashcards mode first");
      return;
    }
    state.flash.setupStage = "type";
    renderPractice();
    return;
  }

  if (action === "flash-back-display-mode") {
    state.flash.setupStage = "display-mode";
    state.flash.categoryTypeFilter = "";
    state.flash.selectedCategories = [];
    state.flash.cards = [];
    renderPractice();
    return;
  }

  if (action === "flash-back-categories") {
    state.flash.categoryDropAnimating = false;
    state.flash.setupStage = "type";
    renderPractice();
    return;
  }

  if (action === "flash-back-type") {
    state.flash.categoryTypeFilter = "";
    state.flash.categoryDropAnimating = false;
    state.flash.categoryDropFromType = "words";
    state.flash.selectedCategories = [];
    state.flash.cards = [];
    state.flash.setupStage = "type";
    renderPractice();
    return;
  }

  if (action === "flash-set-display-mode") {
    const nextMode = actionSource.dataset.displayMode;
    if (!["english-first", "assamese-first", "mixed"].includes(nextMode)) return;
    state.flash.displayMode = nextMode;
    state.flash.cards = [];
    renderPractice();
    return;
  }

  if (action === "flash-set-type") {
    const nextType = actionSource.dataset.type;
    if (!nextType || !["words", "phrases"].includes(nextType)) return;

    const changedType = state.flash.categoryTypeFilter !== nextType;
    state.flash.categoryTypeFilter = nextType;
    state.flash.categoryDropFromType = nextType;
    state.flash.categoryDropAnimating = changedType;
    state.flash.cards = [];
    applyFlashTypeSelectionFilter();
    renderPractice();
    return;
  }

  if (action === "flash-set-mode") {
    const nextMode = actionSource.dataset.mode;
    if (!nextMode || !["normal", "shuffle", "random"].includes(nextMode)) return;
    state.flash.playMode = nextMode;
    renderPractice();
    return;
  }

  if (action === "flash-start-session") {
    if (!["english-first", "assamese-first", "mixed"].includes(state.flash.displayMode)) {
      toast("Choose a flashcards mode first");
      state.flash.setupStage = "display-mode";
      renderPractice();
      return;
    }

    const words = selectedFlashCategoryWords();
    const deck = buildFlashDeckByMode(words, state.flash.playMode);
    if (!deck.length) {
      toast("No words available for selected categories");
      return;
    }

    resetFlashSession(deck);
    renderPractice();
    return;
  }

  if (action === "flash-back-overview") {
    state.flash.cards = [];
    state.flash.index = 0;
    state.flash.flipped = false;
    state.flash.mode = "session";
    state.flash.setupStage = "display-mode";
    state.flash.displayMode = "";
    state.flash.categoryTypeFilter = "";
    state.flash.categoryDropAnimating = false;
    state.flash.categoryDropFromType = "words";
    state.flash.selectedCategories = [];
    state.flash.reviewedCount = 0;
    state.flash.sessionTotal = 0;
    state.flash.hardCount = 0;
    state.flash.easyCount = 0;
    state.flash.hardWordIds = [];
    renderPractice();
    return;
  }

  if (action === "flash-repeat-hard") {
    const words = filteredFlashWords();
    const hardSet = new Set(state.flash.hardWordIds);
    const hardCards = words.filter((word) => hardSet.has(word.id));
    if (!hardCards.length) {
      toast("No hard words to repeat");
      return;
    }

    resetFlashSession(hardCards);
    renderPractice();
    return;
  }

  if (action === "flash-restart") {
    const words = selectedFlashCategoryWords();
    const deck = buildFlashDeckByMode(words, state.flash.playMode);
    resetFlashSession(deck);
    renderPractice();
    return;
  }

  if (action === "flash-new-session") {
    state.flash.cards = [];
    state.flash.index = 0;
    state.flash.flipped = false;
    state.flash.mode = "session";
    state.flash.setupStage = "display-mode";
    state.flash.displayMode = "";
    state.flash.categoryTypeFilter = "";
    state.flash.categoryDropAnimating = false;
    state.flash.categoryDropFromType = "words";
    state.flash.selectedCategories = [];
    state.flash.reviewedCount = 0;
    state.flash.sessionTotal = 0;
    state.flash.hardCount = 0;
    state.flash.easyCount = 0;
    state.flash.hardWordIds = [];
    renderPractice();
    return;
  }

  if (action === "flash-toggle-category") {
    const categoryId = actionSource.dataset.category;
    if (!categoryId) return;

    normalizeFlashCategorySelection();
    const selected = new Set(state.flash.selectedCategories || []);
    if (selected.has(categoryId)) {
      selected.delete(categoryId);
    } else {
      selected.add(categoryId);
    }

    state.flash.selectedCategories = Array.from(selected);
    state.flash.cards = [];
    state.flash.categoryDropAnimating = false;
    state.flash.setupStage = "type";
    renderPractice();
    return;
  }

  if (action === "quiz-start") {
    if (!["english-to-assamese", "assamese-to-english", "mixed"].includes(state.quiz.mode)) {
      toast("Choose a quiz mode first");
      state.quiz.setupStage = "mode";
      renderPractice();
      return;
    }

    state.quiz.questions = buildQuizQuestions(state.dictionary, 10, state.quiz.mode);
    state.quiz.index = 0;
    state.quiz.score = 0;
    state.quiz.answered = false;
    state.quiz.selected = "";
    state.quiz.showCongrats = false;
    state.quiz.showSummary = false;
    state.quiz.setupStage = "session";
    if (!state.quiz.questions.length) {
      toast("No words available for quiz");
      state.quiz.setupStage = "mode";
      renderPractice();
      return;
    }
    renderPractice();
    return;
  }

  if (action === "quiz-set-mode") {
    const mode = actionSource.dataset.mode;
    if (!["english-to-assamese", "assamese-to-english", "mixed"].includes(mode)) return;
    state.quiz.mode = mode;
    state.quiz.setupStage = "mode";
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
    syncAchievements(true);
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
      state.progress.quizzesCompleted = Math.max(0, Number(state.progress.quizzesCompleted) || 0) + 1;
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
    state.quiz.questions = [];
    state.quiz.index = 0;
    state.quiz.score = 0;
    state.quiz.answered = false;
    state.quiz.selected = "";
    state.quiz.showCongrats = false;
    state.quiz.showSummary = false;
    state.quiz.mode = "";
    state.quiz.setupStage = "mode";
    renderPractice();
    return;
  }

  if (action === "chat-answer-option") {
    if (!state.chatSession.isStarted || state.chatSession.stage !== "answer") return;
    const chosenEntry = getDictionaryEntryById(actionSource.dataset.entryId);
    const questionEntry = getDictionaryEntryById(state.chatSession.currentQuestionId);
    if (!chosenEntry || !questionEntry) return;

    const round = buildGuidedConversationRound(state.chatSession.turn || 0);
    const correctAnswer = round.correctAnswer || chosenEntry;
    const isCorrect = String(chosenEntry.id) === String(correctAnswer.id);

    pushChatEntry("user", chosenEntry);
    pushChatEntry(
      "bot",
      correctAnswer,
      isCorrect
        ? `Correct. "${correctAnswer.english}" is the best answer for "${questionEntry.english}".`
        : `Not quite. "${correctAnswer.english}" is a better answer for "${questionEntry.english}".`
    );

    state.chatSession.lastExplainedEntryId = String(correctAnswer.id || "");
    state.chatSession.stage = "ask";
    xpGain(2, "Conversation practice");
    persist();
    renderPractice();
    return;
  }

  if (action === "chat-ask-option") {
    if (!state.chatSession.isStarted || state.chatSession.stage !== "ask") return;
    const learnerQuestion = getDictionaryEntryById(actionSource.dataset.entryId);
    if (!learnerQuestion) return;

    pushChatEntry("user", learnerQuestion);

    const tutorAnswer = guidedAnswerForLearnerQuestion(learnerQuestion);
    pushChatEntry("bot", tutorAnswer);

    state.chatSession.lastExplainedEntryId = String(tutorAnswer?.id || "");
    state.chatSession.turn += 1;
    beginNextGuidedConversationRound();

    xpGain(2, "Conversation practice");
    persist();
    renderPractice();
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

  if (action === "sync-save-config") {
    const endpointInput = document.getElementById("profile-sync-endpoint");
    const tokenInput = document.getElementById("profile-sync-token");
    state.settings.syncEndpoint = String(endpointInput?.value || "").trim();
    state.settings.syncToken = String(tokenInput?.value || "").trim();
    persist();
    toast("Sync settings saved");
    return;
  }

  if (action === "sync-clear-config") {
    state.settings.syncEndpoint = "";
    state.settings.syncToken = "";
    persist();
    renderProfile();
    toast("Sync settings cleared");
    return;
  }

  if (action === "sync-test-config") {
    const endpointInput = document.getElementById("profile-sync-endpoint");
    const tokenInput = document.getElementById("profile-sync-token");
    state.settings.syncEndpoint = String(endpointInput?.value || "").trim();
    state.settings.syncToken = String(tokenInput?.value || "").trim();
    persist();

    const result = await testSyncConnection();
    const ok = typeof result === "boolean" ? result : Boolean(result?.ok);
    if (!ok) {
      const authFailed = typeof result === "object" && result?.status === "auth-failed";
      toast(authFailed ? "Sync auth failed" : "Sync connection failed");
      return;
    }

    const changed = await syncStateFromServer();
    if (changed) {
      refreshStateFromStorage();
      refreshLanguageData();
      updateHeaderControls();
      await renderCurrentView();
    }

    toast("Sync connection successful");
    return;
  }

  if (action === "force-refresh-app") {
    toast("Refreshing app shell...");
    await forceRefreshAppShell();
    return;
  }

  if (action === "reset-progress") {
    const ok = window.confirm(
      "Reset all saved progress? Your custom dictionary words and dictionary edits will be kept."
    );
    if (!ok) return;
    resetAllData({ preserveDictionaryData: true });
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
    setView("home");
    if (!state.settings.onboardingCompleted) {
      openOnboarding();
    }
    toast("Progress reset. Dictionary words and edits kept.");
  }
}

function onInput(event) {
  const target = event.target;

  if (target.id === "onboarding-name") {
    state.onboarding.name = target.value;
  }

  if (target.id === "onboarding-daily-xp") {
    state.onboarding.dailyXpTarget = target.value;
  }

  if (target.name === "onboarding-theme") {
    state.onboarding.preferredTheme = target.value;
  }

  if (target.id === "profile-name") {
    state.settings.profileName = target.value.trim() || "Learner";
    updateHeaderControls();
    persist();
  }

  if (target.id === "profile-daily-goal") {
    const next = Math.max(20, Math.min(5000, Number(target.value) || 120));
    state.progress.dailyGoal.targetXp = next;
    persist();
    if (state.view === "home") {
      renderHome();
    }
  }

  if (target.id === "profile-sync-endpoint") {
    state.settings.syncEndpoint = String(target.value || "").trim();
  }

  if (target.id === "profile-sync-token") {
    state.settings.syncToken = String(target.value || "").trim();
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

  if (target.id === "lessons-type-filter") {
    state.lessonsTypeFilter = ["all", "single-word", "phrase-sentence"].includes(target.value)
      ? target.value
      : "all";
    renderLessons();
  }

  if (target.id === "edit-word-english") {
    state.dictionaryEdit.english = target.value;
  }

  if (target.id === "edit-word-assamese") {
    state.dictionaryEdit.assamese = target.value;
  }

  if (target.id === "edit-word-example-assamese") {
    state.dictionaryEdit.example = target.value;
  }

  if (target.id === "edit-word-example-english") {
    state.dictionaryEdit.exampleEnglish = target.value;
  }

  if (target.id === "edit-word-entry-type") {
    state.dictionaryEdit.entryType = target.value === "phrase" ? "phrase" : "word";
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
  document.addEventListener("change", onInput);

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
      .register("sw.js?v=189", { updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch(() => {
        // App should continue even if service worker update fails.
      });
  }
}

async function ensureLatestBuildLoaded() {
  try {
    const key = "assamese-app-build-version";
    const previous = localStorage.getItem(key);
    if (previous !== APP_BUILD_VERSION) {
      localStorage.setItem(key, APP_BUILD_VERSION);
      await forceRefreshAppShell();
      return false;
    }
  } catch {
    // Ignore storage failures and continue with best effort.
  }
  return true;
}

async function forceRefreshAppShell() {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ("caches" in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
    }
  } catch {
    // Continue to reload even if cleanup partially fails.
  }

  const url = new URL(window.location.href);
  url.searchParams.set("cb", String(Date.now()));
  window.location.replace(url.toString());
}

function refreshStateFromStorage() {
  Object.assign(state, {
    progress: getProgress(),
    settings: getSettings(),
    favorites: getFavorites(),
    history: getRecentActivity(),
    searchHistory: getSearchHistory(),
    recentWords: getRecentWords()
  });
  if (pruneCompletedLessonFavorites() > 0) {
    saveFavorites(state.favorites);
  }
  normalizeSettings();
  ensureAvatarSheetSelections();
}

async function init() {
  const isCurrentBuild = await ensureLatestBuildLoaded();
  if (!isCurrentBuild) return;

  await syncStateFromServer();
  refreshStateFromStorage();
  if (!state.settings.onboardingCompleted) {
    state.view = "home";
  }
  createAppStartScreenModal();
  createOnboardingModal();
  createDictionaryDeleteModal();
  createAchievementCelebrationModal();
  createLevelUpCelebrationModal();
  createLoveMilestoneCelebrationModal();
  createChestResultModal();
  createDailyChestModal();
  syncAchievements(false);
  applyTheme();
  updateHeaderControls();
  bindGlobalEvents();
  startAutoSync(async () => {
    refreshStateFromStorage();
    refreshLanguageData();
    updateHeaderControls();
    await renderCurrentView();
  });
  updateStreak();
  updateTopbarVisibility();
  renderNavigation(dom.mobileNav, state.view);
  renderNavigation(dom.desktopNav, state.view);
  await renderCurrentView();
  initServiceWorker();
  if (!state.settings.onboardingCompleted) {
    openOnboarding();
  } else if (shouldShowAppStartScreen()) {
    openAppStartScreen();
  } else {
    maybeShowDailyChestPrompt();
  }
  persist();
}

init();
