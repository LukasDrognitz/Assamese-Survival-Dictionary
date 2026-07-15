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

function shuffleItems(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function normalizeExerciseText(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function lessonWordPayload(item) {
  return {
    id: String(item?.id || ""),
    source: String(item?.assamese || "").trim(),
    target: String(item?.english || "").trim()
  };
}

function randomLessonFeedback(items, fallback) {
  if (!Array.isArray(items) || !items.length) return fallback;
  return items[Math.floor(Math.random() * items.length)];
}

export function lessonSessionProgressPercent(session) {
  if (!session || !Array.isArray(session.words) || !session.words.length) return 0;
  const total = session.words.length;
  const reviewRatio = (session.reviewedIds || []).length / total;
  const matchRatio = session.matching
    ? (session.matching.matchedWordIds.length / total)
    : (session.stage === "review" ? 0 : 1);

  const requiredWrites = Math.max(1, Number(session.writing?.requiredCorrectPerWord || 2));
  let writingScore = 0;
  if (session.writing) {
    writingScore = session.words.reduce((sum, item) => {
      const id = String(item.id);
      const count = Math.max(0, Number(session.writing.passCounts[id]) || 0);
      return sum + Math.min(requiredWrites, count);
    }, 0);
  } else if (session.stage === "complete") {
    writingScore = total * requiredWrites;
  }

  const writingRatio = writingScore / Math.max(1, total * requiredWrites);
  const weighted = (reviewRatio * 0.34) + (matchRatio * 0.33) + (writingRatio * 0.33);
  return Math.max(0, Math.min(100, Math.round(weighted * 100)));
}

export function createLessonLearningSession(lesson) {
  const words = (lesson?.items || []).map((item) => ({ ...item, id: String(item.id) }));
  const unresolvedMistakesByWord = words.reduce((acc, item) => {
    acc[String(item.id)] = false;
    return acc;
  }, {});

  return {
    stage: "review",
    words,
    reviewedIds: [],
    unresolvedMistakesByWord,
    matching: null,
    writing: null,
    learnedNowCount: 0
  };
}

export function markLessonReviewComplete(session, wordId) {
  if (!session || session.stage !== "review") return;
  const id = String(wordId || "");
  if (!id) return;
  if (!session.reviewedIds.includes(id)) {
    session.reviewedIds.push(id);
  }
}

export function lessonReviewComplete(session) {
  if (!session || !Array.isArray(session.words)) return false;
  return session.reviewedIds.length >= session.words.length;
}

export function startLessonMatchingStage(session) {
  if (!session) return;
  const pairs = session.words.map((item) => {
    const payload = lessonWordPayload(item);
    return {
      wordId: payload.id,
      left: payload.source,
      right: payload.target
    };
  });

  session.stage = "matching";
  session.matching = {
    leftCards: shuffleItems(pairs).map((pair, index) => ({
      id: `l-${pair.wordId}-${index}`,
      wordId: pair.wordId,
      label: pair.left
    })),
    rightCards: shuffleItems(pairs).map((pair, index) => ({
      id: `r-${pair.wordId}-${index}`,
      wordId: pair.wordId,
      label: pair.right
    })),
    selectedLeftId: "",
    selectedRightId: "",
    matchedWordIds: [],
    wrongPair: null,
    feedback: {
      tone: "neutral",
      text: "Tap one card from each column to match pairs."
    }
  };
}

export function selectLessonMatchingCard(session, side, cardId) {
  if (!session?.matching || session.stage !== "matching") return { changed: false };
  if (!cardId || !["left", "right"].includes(side)) return { changed: false };

  const matching = session.matching;
  const cards = side === "left" ? matching.leftCards : matching.rightCards;
  const selected = cards.find((item) => item.id === cardId);
  if (!selected) return { changed: false };
  if (matching.matchedWordIds.includes(selected.wordId)) return { changed: false };

  matching.wrongPair = null;
  if (side === "left") matching.selectedLeftId = selected.id;
  if (side === "right") matching.selectedRightId = selected.id;

  if (!matching.selectedLeftId || !matching.selectedRightId) {
    return { changed: true, resolved: false };
  }

  const left = matching.leftCards.find((item) => item.id === matching.selectedLeftId);
  const right = matching.rightCards.find((item) => item.id === matching.selectedRightId);
  if (!left || !right) {
    matching.selectedLeftId = "";
    matching.selectedRightId = "";
    return { changed: true, resolved: false };
  }

  if (left.wordId === right.wordId) {
    matching.matchedWordIds.push(left.wordId);
    matching.selectedLeftId = "";
    matching.selectedRightId = "";
    matching.feedback = {
      tone: "success",
      text: randomLessonFeedback(["Great!", "Correct!", "Nice match!"], "Correct!")
    };

    return {
      changed: true,
      resolved: true,
      correct: true,
      wordIds: [left.wordId],
      completed: matching.matchedWordIds.length === matching.leftCards.length
    };
  }

  matching.wrongPair = {
    leftId: left.id,
    rightId: right.id
  };
  matching.selectedLeftId = "";
  matching.selectedRightId = "";
  matching.feedback = {
    tone: "error",
    text: randomLessonFeedback(["Try again", "Not quite", "Keep going"], "Try again")
  };

  return {
    changed: true,
    resolved: true,
    correct: false,
    wordIds: [left.wordId, right.wordId],
    completed: false
  };
}

export function startLessonWritingStage(session) {
  if (!session) return;
  const ids = session.words.map((item) => String(item.id));
  const queue = shuffleItems(ids);

  session.stage = "writing";
  session.writing = {
    requiredCorrectPerWord: 2,
    queue,
    currentWordId: queue.shift() || "",
    passCounts: ids.reduce((acc, id) => {
      acc[id] = 0;
      return acc;
    }, {}),
    feedback: {
      tone: "neutral",
      text: "Type the matching translation."
    }
  };
}

export function submitLessonWritingAnswer(session, answer) {
  if (!session?.writing || session.stage !== "writing") return { changed: false };

  const writing = session.writing;
  const currentWordId = String(writing.currentWordId || "");
  if (!currentWordId) return { changed: false };

  const currentWord = session.words.find((item) => String(item.id) === currentWordId);
  if (!currentWord) {
    writing.currentWordId = writing.queue.shift() || "";
    return { changed: true, correct: false, completed: false, wordId: "" };
  }

  const payload = lessonWordPayload(currentWord);
  const expected = payload.target;
  const isCorrect = normalizeExerciseText(answer) === normalizeExerciseText(expected) && normalizeExerciseText(answer).length > 0;

  if (isCorrect) {
    writing.passCounts[currentWordId] = Math.max(0, Number(writing.passCounts[currentWordId]) || 0) + 1;
    writing.feedback = {
      tone: "success",
      text: randomLessonFeedback(["Great!", "Correct!", "Perfect"], "Correct!")
    };

    if (writing.passCounts[currentWordId] < writing.requiredCorrectPerWord) {
      writing.queue.push(currentWordId);
    }
  } else {
    writing.feedback = {
      tone: "error",
      text: `${randomLessonFeedback(["Try again", "Not quite", "Keep going"], "Try again")}. Correct: ${expected}`
    };
    writing.queue.push(currentWordId);
  }

  writing.currentWordId = writing.queue.shift() || "";

  const completed = !writing.currentWordId
    && session.words.every((item) => {
      const id = String(item.id);
      return Number(writing.passCounts[id] || 0) >= writing.requiredCorrectPerWord;
    });

  if (completed) {
    session.stage = "complete";
  }

  return {
    changed: true,
    correct: isCorrect,
    completed,
    wordId: currentWordId,
    expected
  };
}

function renderLessonSessionHeader(session, title) {
  const progress = lessonSessionProgressPercent(session);
  return `
    <div class="lesson-learning-header">
      <div class="row" style="flex-wrap: wrap;">
        <h3>${title}</h3>
        <span class="pill">${progress}%</span>
      </div>
      <div class="lesson-learning-progress" aria-label="Lesson learning progress">
        <span class="lesson-learning-progress-bar" style="width:${progress}%"></span>
      </div>
    </div>
  `;
}

function lessonMatchCardClass({ matched, selected, wrong }) {
  if (matched) return "matched";
  if (wrong) return "wrong";
  if (selected) return "selected";
  return "";
}

function renderLessonMatchingDetail(lesson, session) {
  const matching = session?.matching;
  if (!matching) return "";
  const matchedIds = new Set(matching.matchedWordIds || []);
  const wrongPair = matching.wrongPair || { leftId: "", rightId: "" };
  const totalPairs = Math.max(1, matching.leftCards.length);
  const matchedCount = matchedIds.size;
  const completed = matchedCount >= totalPairs;
  const feedbackTone = matching.feedback.tone || "neutral";

  const leftCards = matching.leftCards
    .map((card) => {
      const cardClass = lessonMatchCardClass({
        matched: matchedIds.has(card.wordId),
        selected: matching.selectedLeftId === card.id,
        wrong: wrongPair.leftId === card.id
      });
      return `
        <button class="lesson-match-card ${cardClass}" data-action="lesson-match-select" data-side="left" data-card-id="${card.id}" ${matchedIds.has(card.wordId) ? "disabled" : ""}>${escapeHtml(card.label)}</button>
      `;
    })
    .join("");

  const rightCards = matching.rightCards
    .map((card) => {
      const cardClass = lessonMatchCardClass({
        matched: matchedIds.has(card.wordId),
        selected: matching.selectedRightId === card.id,
        wrong: wrongPair.rightId === card.id
      });
      return `
        <button class="lesson-match-card ${cardClass}" data-action="lesson-match-select" data-side="right" data-card-id="${card.id}" ${matchedIds.has(card.wordId) ? "disabled" : ""}>${escapeHtml(card.label)}</button>
      `;
    })
    .join("");

  return `
    <article class="card lesson-detail-card lesson-learning-card">
      ${renderLessonSessionHeader(session, `${lesson.icon} ${lesson.title} · Step 2: Match`)}
      <div class="row lesson-match-meta" style="flex-wrap: wrap;">
        <p class="meta">Tap one card from each column to build a pair.</p>
        <span class="pill lesson-match-counter">${matchedCount}/${totalPairs} pairs</span>
      </div>
      <div class="lesson-match-grid">
        <div class="lesson-match-column">${leftCards}</div>
        <div class="lesson-match-column">${rightCards}</div>
      </div>
      <footer class="lesson-match-footer ${feedbackTone}">
        <p class="lesson-match-feedback-line">${matching.feedback.text}</p>
        ${completed
    ? '<button class="btn accent lesson-match-continue" data-action="lesson-match-continue">Continue to Step 3</button>'
    : '<p class="meta lesson-match-helper">Cards stay available until you find the correct pair.</p>'}
      </footer>
    </article>
  `;
}

function renderLessonWritingDetail(lesson, session) {
  const writing = session?.writing;
  if (!writing) return "";

  const currentWord = session.words.find((item) => String(item.id) === String(writing.currentWordId)) || null;
  const payload = currentWord ? lessonWordPayload(currentWord) : null;
  const required = Math.max(1, Number(writing.requiredCorrectPerWord) || 2);
  const score = session.words.reduce((sum, item) => {
    const count = Math.max(0, Number(writing.passCounts[String(item.id)]) || 0);
    return sum + Math.min(required, count);
  }, 0);
  const scoreTotal = Math.max(1, session.words.length * required);

  return `
    <article class="card lesson-detail-card lesson-learning-card">
      ${renderLessonSessionHeader(session, `${lesson.icon} ${lesson.title} · Step 3: Write`)}
      <div class="row" style="flex-wrap:wrap; align-items:center;">
        <p class="meta">Typed mastery: ${score}/${scoreTotal}</p>
        <span class="pill">Need ${required} correct per word</span>
      </div>
      <div class="lesson-writing-prompt">
        <p class="meta">Translate this Assamese prompt:</p>
        <h2>${escapeHtml(payload?.source || "Completed")}</h2>
      </div>
      <div class="grid" style="gap:8px;">
        <input id="lesson-writing-input" class="input" autocomplete="off" autocapitalize="off" placeholder="Type English answer" ${payload ? "" : "disabled"} />
        <button class="btn accent" data-action="lesson-writing-submit" ${payload ? "" : "disabled"}>Check answer</button>
      </div>
      <footer class="lesson-learning-feedback ${writing.feedback.tone || "neutral"}">${writing.feedback.text}</footer>
    </article>
  `;
}

function renderLessonCompleteDetail(lesson, session) {
  const totalWords = session.words.length;
  const learnedNow = Math.max(0, Number(session.learnedNowCount) || 0);
  const remaining = Math.max(0, totalWords - learnedNow);
  const message = remaining === 0
    ? "All words in this lesson reached mastery in this session."
    : `${remaining} word${remaining === 1 ? "" : "s"} still need extra practice next time.`;

  return `
    <article class="card lesson-detail-card lesson-learning-card">
      ${renderLessonSessionHeader(session, `${lesson.icon} ${lesson.title} · Complete`)}
      <h3>Great effort!</h3>
      <p class="meta">${learnedNow}/${totalWords} words met full mastery in this run.</p>
      <p class="meta">${message}</p>
      <div class="grid two flash-summary-stats">
        <div class="stat"><span class="label">Learned now</span><span class="value">${learnedNow}</span></div>
        <div class="stat"><span class="label">Still practicing</span><span class="value">${remaining}</span></div>
      </div>
      <div class="row" style="justify-content:center; flex-wrap:wrap; margin-top:8px;">
        <button class="btn accent" data-action="lesson-session-finish">Finish Lesson</button>
        <button class="btn ghost" data-action="lesson-back">Back to lessons</button>
      </div>
    </article>
  `;
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

export function renderLessonDetail(lesson, index, progress, isFavorite, learningSession = null) {
  if (!lesson) {
    return `<article class="card"><p>Select a lesson to begin learning.</p></article>`;
  }

  if (learningSession?.stage === "matching") {
    return renderLessonMatchingDetail(lesson, learningSession);
  }

  if (learningSession?.stage === "writing") {
    return renderLessonWritingDetail(lesson, learningSession);
  }

  if (learningSession?.stage === "complete") {
    return renderLessonCompleteDetail(lesson, learningSession);
  }

  const item = lesson.items[index] || lesson.items[0];
  const pct = Math.round(((index + 1) / lesson.items.length) * 100);
  const reviewed = learningSession?.reviewedIds?.includes(String(item.id));
  const buttonLabel = reviewed ? "Reviewed" : "Mark as reviewed";

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
        <button class="btn secondary" data-action="mark-learned" data-word="${item.id}">${buttonLabel}</button>
      </div>
    </article>
  `;
}
