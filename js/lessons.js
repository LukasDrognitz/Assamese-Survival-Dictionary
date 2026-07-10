import { getDictionaryMutations } from "./storage.js";

let lessonsCache = null;

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

export async function loadLessons() {
  if (lessonsCache) return lessonsCache;
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
      const isFavorite = favorites.lessons.includes(lesson.id);
      return `
        <article class="lesson-card">
          <div class="row">
            <h4>${lesson.icon} ${lesson.title}</h4>
            <span class="pill">${lesson.items.length} words</span>
          </div>
          <p class="meta">${lesson.description}</p>
          <div class="progress-wrap" style="margin:10px 0"><div class="progress-bar" style="width:${pct}%"></div></div>
          <div class="row">
            <button class="btn ${active ? "accent" : "ghost"}" data-action="open-lesson" data-lesson="${lesson.id}">${buttonLabel}</button>
            <button class="icon-btn" data-action="favorite-lesson" data-lesson="${lesson.id}" aria-label="Toggle favorite lesson">${isFavorite ? "⭐" : "☆"}</button>
          </div>
          ${
            isCompleted
              ? `<div class="row" style="justify-content:flex-start; margin-top:8px;"><button class="btn ghost small" data-action="restart-lesson" data-lesson="${lesson.id}">Restart lesson</button></div>`
              : ""
          }
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
  const learned = progress.wordsLearned.includes(item.id);

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
      <p class="meta">Pronunciation: ${item.pronunciation}</p>
      <p style="margin:8px 0">Example: ${item.example}</p>
      <p class="meta">Notes: ${item.notes || "No extra notes"}</p>

      <div class="row" style="margin-top:28px; flex-wrap: wrap;">
        <button class="btn ghost" data-action="lesson-prev">Previous</button>
        <button class="btn ghost" data-action="lesson-next">Next</button>
        <button class="btn secondary" data-action="mark-learned" data-word="${item.id}">${learned ? "Learned" : "Mark as learned"}</button>
      </div>
    </article>
  `;
}
