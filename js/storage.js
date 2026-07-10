const KEYS = {
  progress: "assamese_progress_v1",
  settings: "assamese_settings_v1",
  favorites: "assamese_favorites_v1",
  history: "assamese_history_v1",
  search: "assamese_search_history_v1",
  recentWords: "assamese_recent_words_v1",
  customWords: "assamese_custom_words_v1",
  dictionaryMutations: "assamese_dictionary_mutations_v1"
};

const todayKey = () => new Date().toISOString().slice(0, 10);

const DEFAULT_PROGRESS = {
  xp: 0,
  streak: 0,
  longestStreak: 0,
  wordsLearned: [],
  lessonsCompleted: [],
  quizAttempts: 0,
  quizCorrect: 0,
  dailyGoal: {
    targetWords: 5,
    learnedWords: 0,
    flashcardsTarget: 10,
    flashcardsDone: 0,
    lessonsTarget: 1,
    lessonsDone: 0,
    quizTarget: 1,
    quizDone: 0,
    date: todayKey()
  },
  spacedRepetition: {},
  achievements: [],
  activity: []
};

const DEFAULT_SETTINGS = {
  theme: "light",
  animations: true,
  audio: true,
  notifications: false,
  onboardingCompleted: false,
  profileName: "Learner",
  avatar: "🦜"
};

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function read(key, fallback) {
  return safeParse(localStorage.getItem(key), fallback);
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getProgress() {
  const progress = { ...DEFAULT_PROGRESS, ...read(KEYS.progress, DEFAULT_PROGRESS) };

  if (progress.dailyGoal.date !== todayKey()) {
    progress.dailyGoal = { ...DEFAULT_PROGRESS.dailyGoal, date: todayKey() };
  }

  return progress;
}

export function saveProgress(progress) {
  write(KEYS.progress, progress);
}

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...read(KEYS.settings, DEFAULT_SETTINGS) };
}

export function saveSettings(settings) {
  write(KEYS.settings, settings);
}

export function getFavorites() {
  return read(KEYS.favorites, {
    words: [],
    sentences: [],
    lessons: []
  });
}

export function saveFavorites(favorites) {
  write(KEYS.favorites, favorites);
}

export function getRecentActivity() {
  return read(KEYS.history, []);
}

export function saveRecentActivity(history) {
  write(KEYS.history, history.slice(0, 30));
}

export function getSearchHistory() {
  return read(KEYS.search, []);
}

export function saveSearchHistory(items) {
  write(KEYS.search, items.slice(0, 20));
}

export function getRecentWords() {
  return read(KEYS.recentWords, []);
}

export function saveRecentWords(items) {
  write(KEYS.recentWords, items.slice(0, 30));
}

export function getCustomWords() {
  return read(KEYS.customWords, []);
}

export function saveCustomWords(items) {
  write(KEYS.customWords, items);
}

export function getDictionaryMutations() {
  return read(KEYS.dictionaryMutations, {
    overrides: {},
    deleted: []
  });
}

export function saveDictionaryMutations(mutations) {
  write(KEYS.dictionaryMutations, {
    overrides: mutations?.overrides || {},
    deleted: Array.isArray(mutations?.deleted) ? mutations.deleted : []
  });
}

export function exportDataBundle() {
  const bundle = {
    progress: getProgress(),
    settings: getSettings(),
    favorites: getFavorites(),
    history: getRecentActivity(),
    search: getSearchHistory(),
    recentWords: getRecentWords(),
    customWords: getCustomWords(),
    dictionaryMutations: getDictionaryMutations(),
    exportedAt: new Date().toISOString()
  };
  return JSON.stringify(bundle, null, 2);
}

export function importDataBundle(rawText) {
  const parsed = JSON.parse(rawText);

  if (parsed.progress) saveProgress({ ...DEFAULT_PROGRESS, ...parsed.progress });
  if (parsed.settings) saveSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
  if (parsed.favorites) saveFavorites(parsed.favorites);
  if (parsed.history) saveRecentActivity(parsed.history);
  if (parsed.search) saveSearchHistory(parsed.search);
  if (parsed.recentWords) saveRecentWords(parsed.recentWords);
  if (parsed.customWords) saveCustomWords(parsed.customWords);
  if (parsed.dictionaryMutations) saveDictionaryMutations(parsed.dictionaryMutations);
}

export function resetAllData() {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
}

export function todayIso() {
  return todayKey();
}
