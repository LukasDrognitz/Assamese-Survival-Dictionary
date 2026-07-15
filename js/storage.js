const KEYS = {
  progress: "assamese_progress_v1",
  settings: "assamese_settings_v1",
  favorites: "assamese_favorites_v1",
  history: "assamese_history_v1",
  search: "assamese_search_history_v1",
  recentWords: "assamese_recent_words_v1",
  customWords: "assamese_custom_words_v1",
  customWordsBackup: "assamese_custom_words_backup_v1",
  dictionaryMutations: "assamese_dictionary_mutations_v1",
  dictionaryMutationsBackup: "assamese_dictionary_mutations_backup_v1",
  syncMeta: "assamese_sync_meta_v1"
};

const DEFAULT_SHARED_STATE_ENDPOINT = "/api/state";
const SYNC_INTERVAL_MS = 3000;

const todayKey = () => new Date().toISOString().slice(0, 10);

const DEFAULT_PROGRESS = {
  xp: 0,
  streak: 0,
  longestStreak: 0,
  wordsLearned: [],
  lessonsCompleted: [],
  quizAttempts: 0,
  quizCorrect: 0,
  quizzesCompleted: 0,
  rupees: 0,
  lastChestDate: "",
  lastChestPromptDate: "",
  avatarSheetSelections: {},
  dailyGoal: {
    targetXp: 120,
    gainedXp: 0,
    startXp: 0,
    flashcardsTarget: 10,
    flashcardsDone: 0,
    lessonsTarget: 1,
    lessonsDone: 0,
    quizTarget: 1,
    quizDone: 0,
    date: todayKey()
  },
  spacedRepetition: {},
  lessonWordProgress: {},
  achievements: [],
  activity: [],
  loveMilestoneXpSeen: 0
};

const DEFAULT_SETTINGS = {
  theme: "light",
  animations: true,
  audio: true,
  notifications: false,
  onboardingCompleted: false,
  profileName: "Learner",
  avatar: "peacock",
  avatarOutfits: {
    monkey: "classic"
  },
  syncEndpoint: "",
  syncToken: ""
};

function getSyncConfigFromSettings() {
  const settings = { ...DEFAULT_SETTINGS, ...read(KEYS.settings, DEFAULT_SETTINGS) };
  const endpoint = String(settings.syncEndpoint || "").trim() || DEFAULT_SHARED_STATE_ENDPOINT;
  const token = String(settings.syncToken || "").trim();
  return { endpoint, token };
}

function buildSyncHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  const { token } = getSyncConfigFromSettings();

  if (token) {
    headers["X-Sync-Token"] = token;
  }

  return headers;
}

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

function safeReadFromPrimaryOrBackup(primaryKey, backupKey, fallback) {
  const primaryRaw = localStorage.getItem(primaryKey);
  const backupRaw = localStorage.getItem(backupKey);

  if (primaryRaw !== null) {
    const parsedPrimary = safeParse(primaryRaw, undefined);
    if (parsedPrimary !== undefined) {
      if (backupRaw === null) {
        localStorage.setItem(backupKey, JSON.stringify(parsedPrimary));
      }
      return parsedPrimary;
    }
  }

  if (backupRaw !== null) {
    const parsedBackup = safeParse(backupRaw, undefined);
    if (parsedBackup !== undefined) {
      localStorage.setItem(primaryKey, JSON.stringify(parsedBackup));
      return parsedBackup;
    }
  }

  return fallback;
}

function normalizeDictionaryMutations(mutations) {
  return {
    overrides: mutations?.overrides || {},
    deleted: Array.isArray(mutations?.deleted) ? mutations.deleted : []
  };
}

function estimateTodayXpFromActivity(items) {
  const today = todayKey();

  return (items || []).reduce((sum, entry) => {
    const when = new Date(entry?.at || "");
    if (Number.isNaN(when.getTime())) return sum;
    if (when.toISOString().slice(0, 10) !== today) return sum;

    const text = String(entry?.text || "").trim();
    const match = text.match(/^\+(\d+)\s+XP:/i);
    if (!match) return sum;
    return sum + Number(match[1] || 0);
  }, 0);
}

function getSyncMeta() {
  const parsed = read(KEYS.syncMeta, { updatedAt: 0 });
  return {
    updatedAt: Number(parsed?.updatedAt || 0)
  };
}

function saveSyncMeta(meta) {
  localStorage.setItem(KEYS.syncMeta, JSON.stringify({
    updatedAt: Number(meta?.updatedAt || 0)
  }));
}

function bumpLocalSyncVersion() {
  const next = { updatedAt: Date.now() };
  saveSyncMeta(next);
  return next;
}

let suppressRemoteSync = false;
let syncTimerId = null;
let syncInFlight = false;
let lastKnownSnapshot = "";

function snapshotBundle(bundle) {
  return JSON.stringify(bundle);
}

function currentBundleObject() {
  return {
    progress: getProgress(),
    settings: getSettings(),
    favorites: getFavorites(),
    history: getRecentActivity(),
    search: getSearchHistory(),
    recentWords: getRecentWords(),
    customWords: getCustomWords(),
    dictionaryMutations: getDictionaryMutations(),
    _syncMeta: getSyncMeta()
  };
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));

  if (!suppressRemoteSync) {
    bumpLocalSyncVersion();
    scheduleRemoteSync();
  }
}

async function pushBundleToServer(bundle) {
  const { endpoint } = getSyncConfigFromSettings();
  const response = await fetch(endpoint, {
    method: "PUT",
    headers: buildSyncHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(bundle)
  });

  if (!response.ok) {
    throw new Error(`Failed to push shared state: ${response.status}`);
  }
}

function scheduleRemoteSync() {
  if (syncInFlight) return;
  syncInFlight = true;

  queueMicrotask(async () => {
    try {
      const bundle = currentBundleObject();
      const snapshot = snapshotBundle(bundle);

      if (snapshot === lastKnownSnapshot) return;

      await pushBundleToServer(bundle);
      lastKnownSnapshot = snapshot;
    } catch {
      // Keep local functionality working even when shared endpoint is unreachable.
    } finally {
      syncInFlight = false;
    }
  });
}

function applyBundleToLocalStorage(bundle) {
  suppressRemoteSync = true;

  try {
    if (bundle.progress) saveProgress({ ...DEFAULT_PROGRESS, ...bundle.progress });
    if (bundle.settings) saveSettings({ ...DEFAULT_SETTINGS, ...bundle.settings });
    if (bundle.favorites) saveFavorites(bundle.favorites);
    if (bundle.history) saveRecentActivity(bundle.history);
    if (bundle.search) saveSearchHistory(bundle.search);
    if (bundle.recentWords) saveRecentWords(bundle.recentWords);
    if (bundle.customWords) saveCustomWords(bundle.customWords);
    if (bundle.dictionaryMutations) saveDictionaryMutations(bundle.dictionaryMutations);
    saveSyncMeta({ updatedAt: Number(bundle?._syncMeta?.updatedAt || Date.now()) });
  } finally {
    suppressRemoteSync = false;
  }

  lastKnownSnapshot = snapshotBundle(currentBundleObject());
}

async function pullBundleFromServer() {
  const { endpoint } = getSyncConfigFromSettings();
  const response = await fetch(endpoint, {
    method: "GET",
    headers: buildSyncHeaders({ "Accept": "application/json" })
  });

  if (response.status === 204) return null;
  if (!response.ok) {
    throw new Error(`Failed to fetch shared state: ${response.status}`);
  }

  const payload = await response.json();
  return payload && typeof payload === "object" ? payload : null;
}

export async function testSyncConnection() {
  try {
    await pullBundleFromServer();
    return { ok: true, status: "connected" };
  } catch (error) {
    const message = String(error?.message || "");
    if (message.includes("401") || message.includes("403")) {
      return { ok: false, status: "auth-failed" };
    }
    return { ok: false, status: "offline" };
  }
}

export async function syncStateFromServer() {
  try {
    const localBundle = currentBundleObject();
    const localVersion = Number(localBundle?._syncMeta?.updatedAt || 0);
    const remote = await pullBundleFromServer();

    if (!remote) {
      await pushBundleToServer(localBundle);
      lastKnownSnapshot = snapshotBundle(localBundle);
      return false;
    }

    const remoteVersion = Number(remote?._syncMeta?.updatedAt || 0);

    if (remoteVersion > localVersion) {
      applyBundleToLocalStorage(remote);
      return true;
    }

    if (localVersion > remoteVersion) {
      await pushBundleToServer(localBundle);
      lastKnownSnapshot = snapshotBundle(localBundle);
      return false;
    }

    const remoteSnapshot = snapshotBundle(remote);
    const localSnapshot = snapshotBundle(localBundle);

    if (remoteSnapshot === localSnapshot) {
      lastKnownSnapshot = remoteSnapshot;
      return false;
    }

    applyBundleToLocalStorage(remote);
    return true;
  } catch {
    return false;
  }
}

export function startAutoSync(onRemoteUpdate) {
  if (syncTimerId) return;

  if (!getSyncMeta().updatedAt) {
    bumpLocalSyncVersion();
  }

  lastKnownSnapshot = snapshotBundle(currentBundleObject());

  syncTimerId = window.setInterval(async () => {
    const changed = await syncStateFromServer();
    if (changed && typeof onRemoteUpdate === "function") {
      onRemoteUpdate();
    }
  }, SYNC_INTERVAL_MS);

  window.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible") {
      const changed = await syncStateFromServer();
      if (changed && typeof onRemoteUpdate === "function") {
        onRemoteUpdate();
      }
    }
  });

  window.addEventListener("online", async () => {
    const changed = await syncStateFromServer();
    if (changed && typeof onRemoteUpdate === "function") {
      onRemoteUpdate();
    }
  });
}

export function getProgress() {
  const progress = { ...DEFAULT_PROGRESS, ...read(KEYS.progress, DEFAULT_PROGRESS) };
  progress.dailyGoal = { ...DEFAULT_PROGRESS.dailyGoal, ...(progress.dailyGoal || {}) };
  const legacyFlashProgress = progress.flashWordProgress && typeof progress.flashWordProgress === "object"
    ? progress.flashWordProgress
    : {};
  progress.lessonWordProgress = progress.lessonWordProgress && typeof progress.lessonWordProgress === "object"
    ? progress.lessonWordProgress
    : {};
  if (!Object.keys(progress.lessonWordProgress).length && Object.keys(legacyFlashProgress).length) {
    progress.lessonWordProgress = { ...legacyFlashProgress };
  }
  delete progress.flashWordProgress;
  progress.loveMilestoneXpSeen = Math.max(0, Number(progress.loveMilestoneXpSeen) || 0);
  progress.quizzesCompleted = Math.max(0, Number(progress.quizzesCompleted) || 0);
  progress.rupees = Math.max(0, Number(progress.rupees) || 0);
  progress.lastChestDate = String(progress.lastChestDate || "").trim();
  progress.lastChestPromptDate = String(progress.lastChestPromptDate || "").trim();
  progress.avatarSheetSelections = progress.avatarSheetSelections && typeof progress.avatarSheetSelections === "object"
    ? { ...progress.avatarSheetSelections }
    : {};

  if (typeof progress.dailyGoal.targetXp !== "number" || Number.isNaN(progress.dailyGoal.targetXp)) {
    const legacyTargetWords = Number(progress.dailyGoal.targetWords || 0);
    progress.dailyGoal.targetXp = legacyTargetWords > 0 ? legacyTargetWords * 24 : DEFAULT_PROGRESS.dailyGoal.targetXp;
  }

  if (typeof progress.dailyGoal.gainedXp !== "number" || Number.isNaN(progress.dailyGoal.gainedXp)) {
    const legacyLearnedWords = Number(progress.dailyGoal.learnedWords || 0);
    progress.dailyGoal.gainedXp = legacyLearnedWords > 0 ? legacyLearnedWords * 12 : 0;
  }

  const hadStoredStartXp = Number.isFinite(Number(progress.dailyGoal.startXp));
  const todayActivityXp = estimateTodayXpFromActivity(getRecentActivity());

  if (progress.dailyGoal.date !== todayKey()) {
    progress.dailyGoal = {
      ...DEFAULT_PROGRESS.dailyGoal,
      date: todayKey(),
      startXp: Math.max(0, Number(progress.xp) || 0),
      gainedXp: 0
    };
  } else {
    if (!hadStoredStartXp) {
      const safeXp = Math.max(0, Number(progress.xp) || 0);
      // Legacy migration: no baseline stored yet, so infer today's gain from the best available signal.
      const migratedGain = Math.max(
        Math.max(0, Number(progress.dailyGoal.gainedXp) || 0),
        Math.max(0, Number(todayActivityXp) || 0),
        safeXp
      );
      progress.dailyGoal.startXp = Math.max(0, safeXp - migratedGain);
      progress.dailyGoal.gainedXp = migratedGain;
    } else {
      const safeXp = Math.max(0, Number(progress.xp) || 0);
      const safeStartXp = Math.max(0, Number(progress.dailyGoal.startXp) || 0);
      const inferredFromBaseline = Math.max(0, safeXp - safeStartXp);
      progress.dailyGoal.gainedXp = Math.max(
        Math.max(0, Number(progress.dailyGoal.gainedXp) || 0),
        Math.max(0, Number(todayActivityXp) || 0),
        inferredFromBaseline
      );
    }
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
  const words = safeReadFromPrimaryOrBackup(KEYS.customWords, KEYS.customWordsBackup, []);
  return Array.isArray(words) ? words : [];
}

export function saveCustomWords(items) {
  const normalizedItems = Array.isArray(items) ? items : [];
  write(KEYS.customWords, normalizedItems);
  write(KEYS.customWordsBackup, normalizedItems);
}

export function getDictionaryMutations() {
  const mutations = safeReadFromPrimaryOrBackup(
    KEYS.dictionaryMutations,
    KEYS.dictionaryMutationsBackup,
    { overrides: {}, deleted: [] }
  );
  return normalizeDictionaryMutations(mutations);
}

export function saveDictionaryMutations(mutations) {
  const normalized = normalizeDictionaryMutations(mutations);
  write(KEYS.dictionaryMutations, normalized);
  write(KEYS.dictionaryMutationsBackup, normalized);
}

export function exportDataBundle() {
  const bundle = {
    ...currentBundleObject(),
    exportedAt: new Date().toISOString()
  };
  return JSON.stringify(bundle, null, 2);
}

export function importDataBundle(rawText) {
  const parsed = JSON.parse(rawText);
  applyBundleToLocalStorage(parsed);
  scheduleRemoteSync();
}

export function resetAllData(options = {}) {
  const preserveDictionaryData = options.preserveDictionaryData !== false;
  const preservedCustomWords = preserveDictionaryData ? read(KEYS.customWords, []) : null;
  const preservedDictionaryMutations = preserveDictionaryData
    ? read(KEYS.dictionaryMutations, { overrides: {}, deleted: [] })
    : null;

  suppressRemoteSync = true;
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));

  if (preserveDictionaryData) {
    const normalizedCustomWords = Array.isArray(preservedCustomWords) ? preservedCustomWords : [];
    const normalizedMutations = normalizeDictionaryMutations(preservedDictionaryMutations);

    localStorage.setItem(KEYS.customWords, JSON.stringify(normalizedCustomWords));
    localStorage.setItem(KEYS.customWordsBackup, JSON.stringify(normalizedCustomWords));
    localStorage.setItem(
      KEYS.dictionaryMutations,
      JSON.stringify(normalizedMutations)
    );
    localStorage.setItem(KEYS.dictionaryMutationsBackup, JSON.stringify(normalizedMutations));
  }

  suppressRemoteSync = false;
  scheduleRemoteSync();
}

export function todayIso() {
  return todayKey();
}
