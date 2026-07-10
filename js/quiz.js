import { renderTeacherAvatar } from "./ui.js";

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function uniqueOptions(correct, pool, count = 4) {
  const options = new Set([correct]);
  while (options.size < count && options.size < pool.length) {
    options.add(randomItem(pool));
  }
  return [...options].sort(() => Math.random() - 0.5);
}

export function buildQuizQuestions(words, size = 10, mode = "mixed") {
  const shuffled = [...words].sort(() => Math.random() - 0.5).slice(0, size);
  const englishPool = words.map((w) => w.english);
  const assamesePool = words.map((w) => w.assamese);

  return shuffled.map((word, idx) => {
    const toEnglish = mode === "assamese-to-english"
      ? true
      : mode === "english-to-assamese"
      ? false
      : Math.random() < 0.5;

    if (toEnglish) {
      return {
        id: `q-${word.id}-${idx}-en`,
        kind: "translate-english",
        prompt: `Translate to English: ${word.assamese}`,
        answer: word.english,
        options: uniqueOptions(word.english, englishPool)
      };
    }

    return {
      id: `q-${word.id}-${idx}-as`,
      kind: "translate-assamese",
      prompt: `Translate to Assamese: ${word.english}`,
      answer: word.assamese,
      options: uniqueOptions(word.assamese, assamesePool)
    };
  });
}

export function renderQuizView({ question, total, score, answered, selected, showCongrats, showSummary, mode = "mixed" }) {
  const modeLabelById = {
    "english-to-assamese": "English to Assamese",
    "assamese-to-english": "Assamese to English",
    mixed: "Mixed"
  };
  const modeLabel = modeLabelById[mode] || "Mixed";
  const wrong = Math.max(0, total - score);
  const summaryPose = score < 5 ? "bad-job" : "good-job";
  const summaryTitle = score >= 5 ? "Good Job!" : "Keep Going!";
  const summaryEyebrow = score >= 5 ? "Strong Progress" : "You Can Do This";
  const summaryCopy =
    score >= 5
      ? "Good Job! You got 5 or more answers correct. Keep practicing and aim for a perfect 10 out of 10 next round."
      : "Every round helps you improve. Stay confident, learn from each question, and come back stronger on the next quiz.";

  if (showCongrats) {
    return `
      <article class="quiz-card quiz-congrats card grid">
        <p class="eyebrow">Perfect Round</p>
        <h2>Congratulations!</h2>
        <p class="quiz-meta">You scored ${score}/${total} correct answers.</p>
        ${renderTeacherAvatar("congratulations", "congrats", false)}
        <p class="quiz-congrats-copy">Bohut bhal! Your Assamese teacher congratulates you.</p>
        <div class="quiz-summary-stats" aria-label="Quiz summary">
          <div class="quiz-result-chip">
            <span class="label">Correct</span>
            <strong>${score}</strong>
          </div>
          <div class="quiz-result-chip">
            <span class="label">Wrong</span>
            <strong>${wrong}</strong>
          </div>
        </div>
        <div class="row quiz-congrats-actions">
          <button class="btn accent" data-action="quiz-restart">Start New Quiz</button>
        </div>
      </article>
    `;
  }

  if (showSummary) {
    return `
      <article class="quiz-card quiz-summary card grid">
        <p class="eyebrow">${summaryEyebrow}</p>
        <h2>${summaryTitle}</h2>
        ${renderTeacherAvatar(summaryPose, "summary", false)}
        <div class="quiz-summary-stats" aria-label="Quiz summary">
          <div class="quiz-result-chip success">
            <span class="label">Correct</span>
            <strong>${score}</strong>
          </div>
          <div class="quiz-result-chip danger">
            <span class="label">Wrong</span>
            <strong>${wrong}</strong>
          </div>
        </div>
        <p class="quiz-congrats-copy">${summaryCopy}</p>
        <div class="row quiz-congrats-actions">
          <button class="btn accent" data-action="quiz-restart">Try Again</button>
        </div>
      </article>
    `;
  }

  if (!question) {
    return `<article class="card"><p>Start a quiz to test your Assamese.</p><button class="btn primary" data-action="quiz-start">Start Quiz</button></article>`;
  }

  const optionsHtml = question.options
    .map((option) => {
      const isSelected = option === selected;
      const isCorrect = answered && option === question.answer;
      const isWrongSelection = answered && isSelected && option !== question.answer;

      const classes = ["btn"];
      if (isCorrect) {
        classes.push("primary");
      } else if (isWrongSelection) {
        classes.push("danger");
      } else {
        classes.push("ghost");
      }

      return `<button class="${classes.join(" ")}" data-action="quiz-answer" data-option="${option}">${option}</button>`;
    })
    .join("");

  return `
    <article class="quiz-card card grid">
      <h3>Quiz Challenge</h3>
      <p class="quiz-meta">Mode: ${modeLabel}</p>
      <p class="quiz-meta">Score: ${score}/${total}</p>
      <h4>${question.prompt}</h4>
      <div class="grid">${optionsHtml}</div>
      <div class="row">
        <button class="btn ghost" data-action="quiz-restart">Restart</button>
        <button class="btn accent" data-action="quiz-next" ${answered ? "" : "disabled"}>Next</button>
      </div>
      ${answered ? `<p>${selected === question.answer ? "Correct!" : `Incorrect. Correct answer: ${question.answer}`}</p>` : ""}
    </article>
  `;
}
