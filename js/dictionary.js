import {
  getCustomWords,
  saveCustomWords,
  getDictionaryMutations,
  saveDictionaryMutations
} from "./storage.js";

let dictionaryCache = null;

function entryKey(entry) {
  return `${String(entry.english || "").trim().toLowerCase()}|${String(entry.assamese || "").trim().toLowerCase()}`;
}

function normalizedCategory(category) {
  const text = String(category || "").trim();
  if (!text) return "Custom";

  const lower = text.toLowerCase();

  if (["bedroom", "kitchen", "living room", "livingroom"].includes(lower) || lower.includes("house")) {
    return "House";
  }

  if (lower === "food vocabulary") {
    return "Food & Drinks";
  }

  return text;
}

function getBaseKey(entry) {
  if (entry?.__baseKey) return entry.__baseKey;
  if (String(entry?.id || "").startsWith("c-")) return `custom:${entry.id}`;
  return entryKey(entry);
}

function applyMutations(entries, mutations) {
  const deleted = new Set(mutations.deleted || []);
  const overrides = mutations.overrides || {};

  return entries
    .map((entry) => {
      const baseKey = getBaseKey(entry);
      if (deleted.has(baseKey)) return null;

      const override = overrides[baseKey] || {};
      return {
        ...entry,
        ...override,
        __baseKey: baseKey
      };
    })
    .filter(Boolean);
}

function dedupeDictionary(entries) {
  const seen = new Set();
  const unique = [];

  entries.forEach((entry) => {
    const key = entryKey(entry);
    if (!key || seen.has(key)) return;
    seen.add(key);
    unique.push(entry);
  });

  return unique;
}

export async function loadDictionary() {
  if (dictionaryCache) return dictionaryCache;
  const response = await fetch("data/dictionary.json");
  const raw = await response.json();
  const baseWords = raw.map((entry) => ({ ...entry, __baseKey: getBaseKey(entry), __isCustom: false }));
  const customWords = getCustomWords().map((entry) => ({
    ...entry,
    __baseKey: getBaseKey(entry),
    __isCustom: true
  }));
  const mutations = getDictionaryMutations();
  dictionaryCache = dedupeDictionary(applyMutations([...baseWords, ...customWords], mutations));
  return dictionaryCache;
}

export function resetDictionaryCache() {
  dictionaryCache = null;
}

export function addCustomDictionaryWord({
  english,
  assamese,
  category = "Custom",
  exampleAssamese = "",
  exampleEnglish = ""
}) {
  const englishText = String(english || "").trim();
  const assameseText = String(assamese || "").trim();
  const categoryText = String(category || "Custom").trim() || "Custom";
  const exampleAssameseText = String(exampleAssamese || "").trim();
  const exampleEnglishText = String(exampleEnglish || "").trim();

  if (!englishText || !assameseText) {
    return { ok: false, reason: "missing-fields" };
  }

  const entry = {
    id: `c-${Date.now()}`,
    category: categoryText,
    assamese: assameseText,
    english: englishText,
    pronunciation: "-",
    example: exampleAssameseText || assameseText,
    exampleEnglish: exampleEnglishText,
    __baseKey: `custom:c-${Date.now()}`,
    __isCustom: true
  };

  entry.__baseKey = `custom:${entry.id}`;

  const incomingKey = entryKey(entry);
  const current = dictionaryCache || [];
  const exists = current.some((item) => entryKey(item) === incomingKey);
  if (exists) {
    return { ok: false, reason: "duplicate" };
  }

  const customWords = getCustomWords();
  const nextCustomWords = [...customWords, { ...entry, __isCustom: true }];
  saveCustomWords(nextCustomWords);
  dictionaryCache = dedupeDictionary([...current, entry]);

  return { ok: true, entry };
}

export function editDictionaryWord(baseKey, updates) {
  const key = decodeURIComponent(String(baseKey || ""));
  const current = dictionaryCache || [];
  const target = current.find((entry) => getBaseKey(entry) === key);
  if (!target) return { ok: false, reason: "not-found" };

  const english = String(updates.english || "").trim();
  const assamese = String(updates.assamese || "").trim();
  const category = String(updates.category || target.category || "Custom").trim() || "Custom";
  if (!english || !assamese) return { ok: false, reason: "missing-fields" };

  const duplicate = current.some((entry) => {
    if (getBaseKey(entry) === key) return false;
    return entryKey({ english, assamese }) === entryKey(entry);
  });
  if (duplicate) return { ok: false, reason: "duplicate" };

  const nextEntry = {
    ...target,
    english,
    assamese,
    category,
    example: target.example || `${assamese} · ${english}`
  };

  if (String(key).startsWith("custom:")) {
    const customWords = getCustomWords().map((item) =>
      getBaseKey(item) === key
        ? {
            ...item,
            english: nextEntry.english,
            assamese: nextEntry.assamese,
            category: nextEntry.category,
            example: nextEntry.example
          }
        : item
    );
    saveCustomWords(customWords);
  } else {
    const mutations = getDictionaryMutations();
    mutations.overrides = {
      ...(mutations.overrides || {}),
      [key]: {
        english: nextEntry.english,
        assamese: nextEntry.assamese,
        category: nextEntry.category,
        example: nextEntry.example
      }
    };
    mutations.deleted = (mutations.deleted || []).filter((item) => item !== key);
    saveDictionaryMutations(mutations);
  }

  dictionaryCache = dedupeDictionary(
    current.map((item) => (getBaseKey(item) === key ? { ...nextEntry, __baseKey: key } : item))
  );

  return { ok: true };
}

export function deleteDictionaryWord(baseKey) {
  const key = decodeURIComponent(String(baseKey || ""));
  const current = dictionaryCache || [];
  const target = current.find((entry) => getBaseKey(entry) === key);
  if (!target) return { ok: false, reason: "not-found" };

  if (String(key).startsWith("custom:")) {
    const customWords = getCustomWords().filter((item) => getBaseKey(item) !== key);
    saveCustomWords(customWords);
  } else {
    const mutations = getDictionaryMutations();
    const deleted = new Set(mutations.deleted || []);
    deleted.add(key);
    mutations.deleted = [...deleted];
    if (mutations.overrides?.[key]) {
      delete mutations.overrides[key];
    }
    saveDictionaryMutations(mutations);
  }

  dictionaryCache = current.filter((item) => getBaseKey(item) !== key);
  return { ok: true };
}

export function restoreDeletedDictionaryWord(entry) {
  if (!entry) return { ok: false, reason: "missing-entry" };

  const key = getBaseKey(entry);
  if (!key) return { ok: false, reason: "missing-key" };

  if (String(key).startsWith("custom:")) {
    const customWords = getCustomWords();
    const exists = customWords.some((item) => getBaseKey(item) === key);
    if (!exists) {
      const restoredCustom = {
        id: entry.id,
        category: entry.category,
        assamese: entry.assamese,
        english: entry.english,
        pronunciation: entry.pronunciation,
        example: entry.example,
        __baseKey: key,
        __isCustom: true
      };
      saveCustomWords([...customWords, restoredCustom]);
    }
  } else {
    const mutations = getDictionaryMutations();
    mutations.deleted = (mutations.deleted || []).filter((item) => item !== key);
    saveDictionaryMutations(mutations);
  }

  const current = dictionaryCache || [];
  const existsInCache = current.some((item) => getBaseKey(item) === key);
  if (!existsInCache) {
    dictionaryCache = dedupeDictionary([
      ...current,
      {
        ...entry,
        __baseKey: key
      }
    ]);
  }

  return { ok: true };
}

export function filterDictionary(entries, { query = "", category = "all", favoritesOnly = false, favoriteIds = [] }) {
  const text = query.trim().toLowerCase();
  return entries
    .filter((entry) => (category === "all" ? true : normalizedCategory(entry.category) === category))
    .filter((entry) => {
      if (!favoritesOnly) return true;
      return favoriteIds.includes(entry.id);
    })
    .filter((entry) => {
      if (!text) return true;
      return [entry.assamese, entry.english, entry.category, entry.pronunciation]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(text));
    })
    .sort((a, b) => a.english.localeCompare(b.english));
}

export function categoriesFromDictionary(entries) {
  return [
    "all",
    ...Array.from(new Set(entries.map((item) => normalizedCategory(item.category)))).sort((a, b) => a.localeCompare(b))
  ];
}

export function renderDictionaryView({ entries, categories, filters, favorites, searchHistory = [], editDraft = null }) {
  const cards = entries
    .map((entry) => {
      const key = encodeURIComponent(getBaseKey(entry));
      const assameseExample = String(entry.example || "-").trim() || "-";
      const rawExampleTranslation =
        String(entry.exampleEnglish || "").trim() ||
        String(entry.exampleTranslation || "").trim() ||
        String(entry.translation || "").trim();
      const splitExampleTranslation = assameseExample.includes("·")
        ? assameseExample
            .split("·")
            .slice(1)
            .join("·")
            .trim()
        : "";
      const exampleTranslation = rawExampleTranslation || splitExampleTranslation || "Translation not available";

      return `
        <article class="word-card" data-word-id="${entry.id}">
          <div class="row">
            <h4>${entry.assamese}</h4>
          </div>
          <p><strong>${entry.english || "-"}</strong></p>
          <p class="meta">${normalizedCategory(entry.category)}</p>
          <p>${assameseExample}</p>
          <p>${exampleTranslation}</p>
          <div class="word-actions">
            <button class="btn ghost" data-action="dictionary-edit-word" data-key="${key}">Edit</button>
            <button class="btn danger" data-action="dictionary-delete-word" data-key="${key}">Delete</button>
          </div>
        </article>
      `;
    })
    .join("");

  const categoryOptions = categories
    .map((cat) => `<option value="${cat}" ${filters.category === cat ? "selected" : ""}>${cat === "all" ? "All categories" : cat}</option>`)
    .join("");
  const addWordCategories = ["Custom", ...categories.filter((cat) => cat !== "all" && cat !== "Custom")];
  const addCategoryOptions = addWordCategories
    .map((cat) => `<option value="${cat}" ${cat === "Custom" ? "selected" : ""}>${cat}</option>`)
    .join("");

  const history = searchHistory
    .slice(0, 8)
    .map((item) => `<button class="pill" data-action="apply-history" data-query="${item}" type="button">${item}</button>`)
    .join("");

  const editCard = editDraft?.key
    ? `
      <article class="card">
        <h3>Edit Word</h3>
        <p class="meta">Update the selected word for dictionary and learning areas.</p>
        <div class="grid" style="margin-top:10px">
          <input class="input" id="edit-word-english" value="${editDraft.english || ""}" placeholder="English" aria-label="Edit English word" />
          <input class="input" id="edit-word-assamese" value="${editDraft.assamese || ""}" placeholder="Assamese" aria-label="Edit Assamese word" />
          <input class="input" id="edit-word-category" value="${editDraft.category || "Custom"}" placeholder="Category" aria-label="Edit word category" />
          <div class="row" style="justify-content:flex-start;">
            <button class="btn accent" data-action="dictionary-save-edit">Save Changes</button>
            <button class="btn ghost" data-action="dictionary-cancel-edit">Cancel</button>
          </div>
        </div>
      </article>
    `
    : "";

  return `
    <section class="grid" style="gap:14px">
      <article class="card">
        <h3>Dictionary Search</h3>
        <div class="grid" style="margin-top:10px">
          <input class="input" id="dictionary-search" placeholder="Search Assamese, English, category..." value="${filters.query}" aria-label="Search dictionary" />
          <div class="row">
            <select class="select" id="dictionary-category" aria-label="Filter by category">${categoryOptions}</select>
          </div>
          <div class="row" style="flex-wrap: wrap;">${history || "<span class='meta'>Search history will appear here.</span>"}</div>
        </div>
      </article>

      <div class="grid auto">${cards || "<p class='meta'>No words match your search.</p>"}</div>

      <article class="card">
        <h3>Add New Word</h3>
        <p class="meta">Add your own vocabulary pair in English and Assamese.</p>
        <div class="grid" style="margin-top:10px">
          <input class="input" id="new-word-english" placeholder="English word or phrase" aria-label="New English word" />
          <input class="input" id="new-word-assamese" placeholder="Assamese translation" aria-label="New Assamese translation" />
          <input class="input" id="new-word-example-assamese" placeholder="Assamese example phrase (optional)" aria-label="New Assamese example phrase" />
          <input class="input" id="new-word-example-english" placeholder="English translation for example phrase (optional)" aria-label="New English example translation" />
          <select class="select" id="new-word-category" aria-label="New word category">${addCategoryOptions}</select>
          <div class="row" style="justify-content:flex-start;">
            <button class="btn accent" data-action="dictionary-add-word">Add Word</button>
          </div>
        </div>
      </article>

      ${editCard}
    </section>
  `;
}
