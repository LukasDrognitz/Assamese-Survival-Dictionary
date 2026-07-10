import { getDictionaryMutations } from "./storage.js";
import { normalizeDictionaryCategory, compareCategoryDisplayOrder } from "./dictionary.js";

let lessonsCache = null;

const LESSON_ICON_BY_CATEGORY = {
  Greetings: "👋",
  Introduction: "🙋",
  Introductions: "🙋",
  Family: "👨‍👩‍👧",
  House: "🏠",
  "Food & Drinks": "🍛",
  Conversations: "💬",
  "Daily Conversation": "💬",
  Work: "💼",
  "Work & Study": "💼",
  Love: "❤️",
  "Love & Relationships": "❤️",
  "Human Body": "🧍",
  Numbers: "🔢",
  Questions: "❓",
  Actions: "🏃",
  Pronouns: "🧩",
  Time: "⏰",
  Custom: "✨"
};

function lessonItemKey(item) {
  return `${String(item.english || "").trim().toLowerCase()}|${String(item.assamese || "").trim().toLowerCase()}`;
}

function applyLessonMutations(lessons) {
  const mutations = getDictionaryMutations();
  const deleted = new Set(mutations.deleted || []);
  const overrides = mutations.overrides || {};

  return lessons.map((lesson) => ({
    ...lesson,
    items: (lesson.items || [])
      .map((item) => {
        const key = lessonItemKey(item);
        if (deleted.has(key)) return null;
        const override = overrides[key] || {};
        return {
          ...item,
          ...override
        };
      })
      .filter(Boolean)
  }));
}

function dedupeItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = lessonItemKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeLessons(lessons) {
  return lessons.map((lesson) => ({
    ...lesson,
    items: dedupeItems(lesson.items || [])
  }));
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function lessonHeadlineSizeClass(title) {
  const normalizedTitle = String(title || "").trim().replace(/\s+/g, " ");
  const words = normalizedTitle.split(" ").filter(Boolean);
  const longestWord = words.reduce((max, word) => Math.max(max, word.length), 0);

  if (longestWord >= 12 || normalizedTitle.length >= 20) return "lesson-title-text-xs";
  if (longestWord >= 9 || normalizedTitle.length >= 14) return "lesson-title-text-sm";
  return "lesson-title-text-md";
}

function renderLessonHeadline(icon, title) {
  const safeIcon = escapeHtml(icon || "📘");
  const normalizedTitle = String(title || "").trim().replace(/\s+/g, " ");
  const sizeClass = lessonHeadlineSizeClass(normalizedTitle);
  return `<span class="lesson-title-icon">${safeIcon}</span><span class="lesson-title-text ${sizeClass}">${escapeHtml(normalizedTitle)}</span>`;
}

function cleanLessonCardTitle(title) {
  return String(title || "")
    .trim()
    .replace(/\s*\((words|phrases)\)$/i, "")
    .replace(/\s+/g, " ");
}

function lessonIdFromCategory(category) {
  return `cat-${String(category || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
}

function tokenizePhrase(text) {
  return String(text || "")
    .replace(/[()\[\],/\\-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function isPhraseOrSentence(text) {
  const value = String(text || "").trim();
  if (!value) return false;
  if (/[?.!]/.test(value)) return true;
  return tokenizePhrase(value).length > 1;
}

function normalizeEntryType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["phrase", "phrases", "phrase-sentence", "sentence", "sentences"].includes(normalized)) {
    return "phrase";
  }
  if (["word", "words", "single-word", "single word"].includes(normalized)) {
    return "word";
  }
  return "";
}

function isPhraseEntry(item) {
  const normalizedType = normalizeEntryType(item?.entryType);
  if (normalizedType === "phrase") return true;
  if (normalizedType === "word") return false;
  return isPhraseOrSentence(item.assamese) || isPhraseOrSentence(item.english);
}

function buildLessonsFromDictionary(entries) {
  const grouped = new Map();

  (entries || []).forEach((entry) => {
    const category = normalizeDictionaryCategory(entry.category);
    if (!category) return;

    const explicitEntryType = normalizeEntryType(entry.entryType) || undefined;

    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category).push({
      id: String(entry.id || lessonItemKey(entry)),
      ...(explicitEntryType ? { entryType: explicitEntryType } : {}),
      assamese: entry.assamese || "-",
      english: entry.english || "-",
      pronunciation: entry.pronunciation || "-",
      example: entry.example || `${entry.assamese || ""} · ${entry.english || ""}`.trim(),
      notes: entry.notes || `Vocabulary from the ${category} category.`
    });
  });

  const lessons = Array.from(grouped.entries())
    .sort(([a], [b]) => compareCategoryDisplayOrder(a, b))
    .flatMap(([category, items]) => {
      const uniqueItems = dedupeItems(items);
      const singleWordItems = uniqueItems.filter((item) => !isPhraseEntry(item));
      const phraseItems = uniqueItems.filter((item) => isPhraseEntry(item));
      const baseId = lessonIdFromCategory(category);
      const icon = LESSON_ICON_BY_CATEGORY[category] || "📘";

      const bucketed = [];
      if (singleWordItems.length) {
        bucketed.push({
          id: `${baseId}-words`,
          title: category,
          icon,
          kind: "single-word",
          description: `Practice single words from the ${category} dictionary category.`,
          items: singleWordItems
        });
      }

      if (phraseItems.length) {
        bucketed.push({
          id: `${baseId}-phrases`,
          title: category,
          icon,
          kind: "phrase-sentence",
          description: `Practice whole phrases and sentences from the ${category} dictionary category.`,
          items: phraseItems
        });
      }

      return bucketed;
    })
    .filter((lesson) => lesson.items.length > 0);

  return dedupeLessons(lessons);
}

export async function loadLessons(dictionaryEntries = null) {
  if (lessonsCache) return lessonsCache;

  if (Array.isArray(dictionaryEntries) && dictionaryEntries.length) {
    lessonsCache = buildLessonsFromDictionary(dictionaryEntries);
    return lessonsCache;
  }

  const response = await fetch("data/lessons.json");
  const raw = await response.json();
  lessonsCache = dedupeLessons(applyLessonMutations(raw));
  return lessonsCache;
}

export function resetLessonsCache() {
  lessonsCache = null;
}

export function lessonProgressPercent(lessonId, progress) {
  if (progress.lessonsCompleted.includes(lessonId)) return 100;
  return 0;
}

export function flattenLessonWords(lessons) {
  const flat = lessons.flatMap((lesson) => lesson.items.map((item) => ({ ...item, lessonId: lesson.id })));
  return dedupeItems(flat);
}

export function renderLessonsOverview(lessons, progress, activeLessonId, favorites = { lessons: [] }) {
  const cards = lessons
    .map((lesson) => {
      const pct = lessonProgressPercent(lesson.id, progress);
      const active = activeLessonId === lesson.id;
      const isCompleted = progress.lessonsCompleted.includes(lesson.id);
      const buttonLabel = isCompleted ? "Completed" : active ? "Continue" : "Start";
      const lessonActionButton = isCompleted
        ? `<button class="btn ghost" disabled aria-disabled="true">${buttonLabel}</button>`
        : `<button class="btn ${active ? "accent" : "ghost"}" data-action="open-lesson" data-lesson="${lesson.id}">${buttonLabel}</button>`;
      const isFavorite = favorites.lessons.includes(lesson.id);
      const favoriteButton = isCompleted
        ? ""
        : `<button class="icon-btn" data-action="favorite-lesson" data-lesson="${lesson.id}" aria-label="Toggle favorite lesson">${isFavorite ? "⭐" : "☆"}</button>`;
      const unitLabel = lesson.kind === "phrase-sentence" ? "phrases" : "words";
      const displayTitle = cleanLessonCardTitle(lesson.title);
      return `
        <article class="lesson-card">
          <span class="pill lesson-word-count">${lesson.items.length} ${unitLabel}</span>
          <div class="row lesson-card-head">
            <h4>${renderLessonHeadline(lesson.icon, displayTitle)}</h4>
          </div>
          <div class="progress-wrap lesson-progress"><div class="progress-bar" style="width:${pct}%"></div></div>
          <div class="row lesson-main-actions">
            ${lessonActionButton}
            ${favoriteButton}
          </div>
          <div class="row lesson-restart-row">
            <button
              class="btn ghost small ${isCompleted ? "" : "lesson-restart-placeholder"}"
              data-action="restart-lesson"
              data-lesson="${lesson.id}"
              ${isCompleted ? "" : "disabled tabindex='-1' aria-hidden='true'"}
            >Restart lesson</button>
          </div>
        </article>
      `;
    })
    .join("");

  return `<div class="grid auto">${cards}</div>`;
}

export function renderLessonDetail(lesson, index, progress, isFavorite) {
  if (!lesson) {
    return `<article class="card"><p>Select a lesson to begin learning.</p></article>`;
  }

  const item = lesson.items[index] || lesson.items[0];
  const pct = Math.round(((index + 1) / lesson.items.length) * 100);
  const learned = progress.wordsLearned.includes(String(item.id));

  return `
    <article class="card lesson-detail-card">
      <div class="row" style="flex-wrap: wrap;">
        <button class="btn ghost" data-action="lesson-back">Back to lessons</button>
        <h3>${lesson.icon} ${lesson.title}</h3>
        <span class="pill">${index + 1}/${lesson.items.length}</span>
      </div>
      <div class="progress-wrap" style="margin:8px 0 10px"><div class="progress-bar" style="width:${pct}%"></div></div>

      <h2>${item.assamese}</h2>
      <p><strong>${item.english}</strong></p>
      <p style="margin:8px 0">Example: ${item.example}</p>

      <div class="row" style="margin-top:28px; flex-wrap: wrap;">
        <button class="btn ghost" data-action="lesson-prev">Previous</button>
        <button class="btn ghost" data-action="lesson-next">Next</button>
        <button class="btn secondary" data-action="mark-learned" data-word="${item.id}">${learned ? "Learned" : "Mark as learned"}</button>
      </div>
    </article>
  `;
}
