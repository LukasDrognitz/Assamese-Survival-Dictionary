import { renderTeacherAvatar } from "./ui.js";

export function pickFlashcards(words, progress, limit = 30) {
  const now = Date.now();

  const withDue = words.map((word) => {
    const dueInfo = progress.spacedRepetition[word.id] || { dueAt: 0, interval: 1 };
    const due = dueInfo.dueAt <= now;
    return { word, dueInfo, due };
  });

  const dueCards = withDue.filter((item) => item.due).map((item) => item.word);
  const rest = withDue.filter((item) => !item.due).map((item) => item.word);

  const ordered = [...dueCards, ...rest];
  return ordered.slice(0, limit);
}

export function updateSpacedRepetition(progress, wordId, grade) {
  const current = progress.spacedRepetition[wordId] || { interval: 1 };
  const multiplier = {
    again: 0.5,
    hard: 1.2,
    good: 2,
    easy: 3
  }[grade] || 1;

  const nextInterval = Math.max(1, Math.round(current.interval * multiplier));
  const dueAt = Date.now() + nextInterval * 24 * 60 * 60 * 1000;

  progress.spacedRepetition[wordId] = {
    interval: nextInterval,
    dueAt
  };

  return progress;
}

export function shuffleCards(cards) {
  const arr = [...cards];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function renderFlashcard(word, flipped, index, total) {
  if (!word) {
    return `<article class="card"><p>No cards available. Learn a few words first.</p></article>`;
  }

  return `
    <article class="card grid">
      <div class="row">
        <h3>Flashcards</h3>
        <span class="pill">${index + 1}/${total}</span>
      </div>
      <div class="flip">
        <section class="flash-card ${flipped ? "flipped" : ""}" id="flash-card">
          <div class="flash-face front">
            <h2>${word.assamese}</h2>
            <p class="meta">Tap to flip</p>
          </div>
          <div class="flash-face back">
            <h2>${word.english}</h2>
            <p>${word.pronunciation || ""}</p>
          </div>
        </section>
      </div>
      <div class="grid two">
        <button class="btn ghost" data-action="flash-grade" data-grade="hard">Hard</button>
        <button class="btn accent" data-action="flash-grade" data-grade="easy">Easy</button>
      </div>
      <div class="row" style="flex-wrap: wrap;">
        <button class="btn ghost" data-action="flash-shuffle">Shuffle</button>
        <button class="btn ghost" data-action="flash-random">Random mode</button>
      </div>
    </article>
  `;
}

export function renderFlashSummary({ total, hardCount, easyCount, hasHardWords }) {
  const pose = hardCount === 0 ? "good-job" : "bad-job";

  return `
    <article class="card grid flash-summary">
      <h3>Flashcards Summary</h3>
      <p class="meta">Session complete (${total}/${total}).</p>
      ${renderTeacherAvatar(pose, "summary")}
      <div class="grid two flash-summary-stats">
        <div class="stat"><span class="label">Hard words</span><span class="value">${hardCount}</span></div>
        <div class="stat"><span class="label">Easy words</span><span class="value">${easyCount}</span></div>
      </div>
      <div class="row flash-summary-actions" style="flex-wrap: wrap;">
        <button class="btn accent" data-action="flash-repeat-hard" ${hasHardWords ? "" : "disabled"}>Repeat Hard Words</button>
        <button class="btn ghost" data-action="flash-restart">Restart Full Deck</button>
      </div>
      ${hasHardWords ? "" : "<p class='meta flash-summary-note'>No hard words in this round. Great work!</p>"}
    </article>
  `;
}
