// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-blue; icon-glyph: book;

// Стройслова — construction English for an assistant project manager.
// Run it to train; add it as a widget to keep the current word in sight.
// Everything lives in iCloud Drive › Scriptable › Stroyslova, which Cyclop on
// the Mac reads and writes too.

const Engine = (() => {
  const INTERVALS = [0, 1, 2, 4, 7, 14, 30];
  const NEW_PER_SESSION = 3;
  const MAX_REVIEWS = 12;

  const idOf = (w) => w.en.toLowerCase();

  // Day number of the local calendar date — same numbering as the Mac app.
  function today(d = new Date()) {
    return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  }

  function shuffle(items) {
    const a = items.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function shuffledDifferently(items) {
    if (new Set(items).size < 2) return items.slice();
    for (let n = 0; n < 10; n++) {
      const s = shuffle(items);
      if (s.join("\u0001") !== items.join("\u0001")) return s;
    }
    return items.slice().reverse();
  }

  const boxOf = (progress, w) => (progress[idOf(w)] && progress[idOf(w)].box) || 0;
  const dueOf = (progress, w) => (progress[idOf(w)] && progress[idOf(w)].due) || 0;

  function dueWords(words, progress, day = today()) {
    return words.filter((w) => boxOf(progress, w) > 0 && dueOf(progress, w) <= day);
  }
  function newWords(words, progress) {
    return words.filter((w) => boxOf(progress, w) === 0);
  }

  // Exercises a word gets, by how well it is known. Producing the word
  // (spelling, then typing) is in every block: recognising is not remembering.
  function plan(box) {
    const two = (pool) => shuffle(pool).slice(0, 2);
    if (box === 0) return ["intro", "meaning", "listen", "letters", "fillBlank"];
    if (box <= 2) { const p = two(["listen", "toEnglish", "fillBlank", "meaning"]); return [p[0], "letters", p[1]]; }
    if (box <= 4) { const p = two(["fillBlank", "buildSentence", "toEnglish", "listen"]); return [p[0], "typing", p[1]]; }
    const p = two(["dictation", "buildSentence", "fillBlank"]);
    return [p[0], "typing", p[1]];
  }

  const NEEDS_EXAMPLE = ["fillBlank", "buildSentence", "dictation"];
  const hasExamples = (w) => Array.isArray(w.examples) && w.examples.length > 0;

  // Wrong options come first from the words being learnt together: telling
  // RFI from submittal is the real skill, telling it from ADU is not.
  function distractors(word, words, group) {
    const near = (group || []).filter((w) => idOf(w) !== idOf(word));
    const rest = shuffle(words.filter((w) => idOf(w) !== idOf(word) && !near.includes(w)));
    return [...near, ...rest].slice(0, 3);
  }

  function make(kind, word, words, retry = false, group = null) {
    if (!hasExamples(word) && NEEDS_EXAMPLE.includes(kind)) kind = kind === "dictation" ? "listen" : "toEnglish";
    const example = hasExamples(word)
      ? word.examples[Math.floor(Math.random() * word.examples.length)]
      : { en: word.en, ru: word.ru };
    const others = distractors(word, words, group);
    const ex = { kind, word, example, options: [], answer: "", pieces: [], target: [], retry, group: null };
    if (kind === "meaning") {
      ex.options = shuffle([word.ru, ...others.map((o) => o.ru)]);
      ex.answer = word.ru;
    } else if (kind === "listen" || kind === "toEnglish" || kind === "fillBlank") {
      ex.options = shuffle([word.en, ...others.map((o) => o.en)]);
      ex.answer = word.en;
    } else if (kind === "letters") {
      ex.target = [...word.en].filter((c) => c !== " ");
      ex.pieces = shuffledDifferently(ex.target);
    } else if (kind === "buildSentence" || kind === "dictation") {
      ex.target = example.en.split(" ");
      ex.pieces = shuffledDifferently(ex.target);
    } else if (kind === "typing") {
      ex.answer = word.en;
    }
    return ex;
  }

  // Match three English words with their meanings.
  function makePairs(group) {
    return {
      kind: "pairs", word: group[0], group, retry: false,
      left: shuffle(group.map((w) => w.en)), right: shuffle(group.map((w) => w.ru)),
      options: [], answer: "", pieces: [], target: [], example: { en: "", ru: "" },
    };
  }

  // A short message from the site that needs all the words of the group —
  // one example sentence of each, with the word taken out.
  function makeSituation(group) {
    const picks = shuffle(group.filter(hasExamples)).map((w) => {
      const ex = w.examples[Math.floor(Math.random() * w.examples.length)];
      const i = ex.en.toLowerCase().indexOf(w.en.toLowerCase());
      return { word: w, before: ex.en.slice(0, i), after: ex.en.slice(i + w.en.length), en: ex.en, ru: ex.ru };
    }).filter((p) => p.before.length + p.after.length > 0 && p.en.toLowerCase().includes(p.word.en.toLowerCase()));
    if (picks.length < 2) return null;
    const target = picks.map((p) => p.word.en);
    return {
      kind: "situation", word: picks[0].word, group: picks.map((p) => p.word), retry: false,
      segments: picks.map((p) => ({ before: p.before, after: p.after })),
      options: [], answer: "", pieces: shuffledDifferently(target), target,
      example: { en: picks.map((p) => p.en).join(" "), ru: picks.map((p) => p.ru).join(" ") },
    };
  }

  // Groups of at most three, as even as possible: 4 words make 2 + 2 and 5
  // make 3 + 2, so no word is left to train alone without the pairs and the
  // message.
  function balancedGroups(list, max = 3) {
    const n = list.length;
    if (!n) return [];
    const count = Math.ceil(n / max);
    const out = [];
    let i = 0;
    for (let k = 0; k < count; k++) {
      const size = Math.floor(n / count) + (k < n % count ? 1 : 0);
      out.push(list.slice(i, i + size));
      i += size;
    }
    return out;
  }

  // One group of up to three words, exercised in rounds rather than one word
  // at a time: every word gets its first exercise, then every word its
  // second, and so on — with the pairs after the first round and the site
  // message at the end. Between two exercises on the same word there are
  // others, so each answer has to be recalled, not just repeated.
  function buildGroup(group, words, progress) {
    const plans = group.map((w) => plan(boxOf(progress, w)));
    const counts = new Map(group.map((w) => [idOf(w), 0]));
    const queue = [];
    const rounds = Math.max(...plans.map((p) => p.length));
    let pairsPlaced = false;
    for (let r = 0; r < rounds; r++) {
      let items = shuffle(group.map((w, i) => ({ w, kind: plans[i][r] })).filter((x) => x.kind));
      const last = queue[queue.length - 1];
      if (last && items.length > 1 && last.word === items[0].w) items.push(items.shift());
      const isIntroRound = items.every((x) => x.kind === "intro");
      for (const x of items) { queue.push(make(x.kind, x.w, words, false, group)); counts.set(idOf(x.w), counts.get(idOf(x.w)) + 1); }
      if (!isIntroRound && !pairsPlaced && group.length >= 2) {
        queue.push(makePairs(group));
        for (const w of group) counts.set(idOf(w), counts.get(idOf(w)) + 1);
        pairsPlaced = true;
      }
    }
    const situation = group.length >= 2 ? makeSituation(group) : null;
    if (situation) {
      queue.push(situation);
      for (const w of situation.group) counts.set(idOf(w), counts.get(idOf(w)) + 1);
    }
    return { queue, counts };
  }

  function buildSession(words, progress, opts = {}) {
    let fresh = [], reviews = [];
    if (opts.only) {
      fresh = [opts.only];
    } else {
      if (!opts.extraNew) {
        reviews = dueWords(words, progress)
          .sort((a, b) => dueOf(progress, a) - dueOf(progress, b))
          .slice(0, MAX_REVIEWS);
      }
      fresh = newWords(words, progress).slice(0, NEW_PER_SESSION);
    }
    const queue = [];
    const remaining = {};
    // Reviews first, then the new words, cut into even groups — so a word
    // due for review is trained next to new ones rather than on its own.
    for (const group of balancedGroups([...reviews, ...fresh])) {
      const built = buildGroup(group, words, progress);
      queue.push(...built.queue);
      for (const [id, n] of built.counts) remaining[id] = n;
    }
    return { queue, pos: 0, remaining, failed: new Set(), total: fresh.length + reviews.length, clean: 0 };
  }

  // A finished block moves the word between boxes.
  function score(current, failed, day = today()) {
    const p = { box: (current && current.box) || 0, due: (current && current.due) || 0, t: Date.now() };
    if (failed) {
      p.box = Math.max(1, p.box - 1);
      p.due = day + 1;
    } else {
      p.box = Math.min(INTERVALS.length - 1, p.box + 1);
      p.due = day + INTERVALS[p.box];
    }
    return p;
  }

  // Two copies of the progress (this device and the shared file): for each
  // word keep the one changed last.
  function merge(a, b) {
    const out = Object.assign({}, a || {});
    for (const [id, p] of Object.entries(b || {})) {
      const mine = out[id];
      if (!mine || (p.t || 0) > (mine.t || 0)) out[id] = p;
    }
    return out;
  }

  // The few words to keep in front of the eyes — the same ones the next
  // training will bring: due first, then the next new ones, then words being
  // learnt. The Mac's Cyclop picks them the same way.
  // Words waiting for review never take over the whole set: one place is
  // kept for the next new word, and the waiting ones take turns in the rest
  // (`slot` moves every hour and a half), so skipping a few days does not
  // freeze the same three words on the screen.
  function focusSet(words, progress, n = 3, day = today(), slot = 0) {
    const due = dueWords(words, progress, day).sort((a, b) => dueOf(progress, a) - dueOf(progress, b));
    const fresh = newWords(words, progress);
    const learning = words
      .filter((w) => { const b = boxOf(progress, w); return b >= 1 && b <= 4 && dueOf(progress, w) > day; })
      .sort((a, b) => dueOf(progress, a) - dueOf(progress, b));
    const dueSlots = Math.min(due.length, fresh.length ? n - 1 : n);
    const start = due.length ? slot % due.length : 0;
    const rotated = due.slice(start).concat(due.slice(0, start)).slice(0, dueSlots);
    const out = [];
    for (const w of [...rotated, ...fresh, ...due, ...learning]) {
      if (!out.includes(w)) out.push(w);
      if (out.length === n) break;
    }
    if (!out.length && words.length) out.push(words[day % words.length]);
    return out;
  }

  // The word to keep in front of the eyes: due today first, then words being
  // learnt (rotating through the day), then the next new one.
  function focusWord(words, progress, now = new Date()) {
    const day = today(now);
    const due = dueWords(words, progress, day).sort((a, b) => dueOf(progress, a) - dueOf(progress, b));
    const learning = words.filter((w) => { const b = boxOf(progress, w); return b >= 1 && b <= 4; });
    const fresh = newWords(words, progress);
    const slot = Math.floor(now.getHours() / 3);
    if (due.length) return { word: due[slot % due.length], reason: "due", due: due.length };
    if (learning.length) return { word: learning[(day + slot) % learning.length], reason: "learning", due: 0 };
    if (fresh.length) return { word: fresh[0], reason: "new", due: 0 };
    return words.length ? { word: words[(day + slot) % words.length], reason: "known", due: 0 } : null;
  }

  function blank(sentence, word) {
    const i = sentence.toLowerCase().indexOf(word.toLowerCase());
    if (i < 0) return sentence;
    return sentence.slice(0, i) + "_____" + sentence.slice(i + word.length);
  }

  const normalize = (s) => s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9'\- ]/g, "").replace(/\s+/g, " ").trim();

  function distance(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }

  // "exact", "typo" (one slip in a longer word — counted right, spelling shown), or "wrong".
  function checkTyped(input, answer) {
    const a = normalize(input), b = normalize(answer);
    if (!a) return "wrong";
    if (a === b) return "exact";
    if (b.length >= 5 && distance(a, b) === 1) return "typo";
    return "wrong";
  }

  return { INTERVALS, NEW_PER_SESSION, MAX_REVIEWS, idOf, today, shuffle, dueWords, newWords, boxOf, dueOf, plan, make, buildSession, score, merge, focusSet, balancedGroups, focusWord, blank, makePairs, makeSituation, checkTyped, hasExamples };
})();
if (typeof module !== "undefined") module.exports = Engine;


// Where the app and the word list are downloaded from the first time.
const SOURCE = "https://raw.githubusercontent.com/Studi980-pgr/stroyslova/main/";

// iCloud when it is on (shared with other devices), this phone otherwise.
let fm;
try { fm = FileManager.iCloud(); fm.documentsDirectory(); } catch (e) { fm = FileManager.local(); }
const dir = fm.joinPath(fm.documentsDirectory(), "Stroyslova");
const path = (name) => fm.joinPath(dir, name);
if (!fm.fileExists(dir)) fm.createDirectory(dir, true);

// First run on a new phone: fetch the app and the starter words.
async function ensureFile(name, remote) {
  if (fm.fileExists(path(name))) return;
  try {
    const text = await new Request(SOURCE + remote).loadString();
    fm.writeString(path(name), text);
  } catch (e) {
    console.error("Could not download " + remote + ": " + e);
  }
}
await ensureFile("app.html", "index.html");
await ensureFile("words.json", "words.json");


async function readJSON(name, fallback) {
  const p = path(name);
  if (!fm.fileExists(p)) return fallback;
  try {
    await fm.downloadFileFromiCloud(p);
    return JSON.parse(fm.readString(p));
  } catch (e) {
    return fallback;
  }
}

function readStoreNow() {
  try { return JSON.parse(fm.readString(path("progress.json"))); } catch (e) { return { words: {}, custom: [] }; }
}

const baseWords = await readJSON("words.json", []);
const store = await readJSON("progress.json", { words: {}, custom: [] });
const custom = Array.isArray(store.custom) ? store.custom : [];
const seen = new Set(baseWords.map((w) => w.en.toLowerCase()));
const allWords = baseWords.concat(custom.filter((w) => !seen.has(w.en.toLowerCase())));
const progress = store.words || {};

if (config.runsInWidget || args.widgetParameter === "preview") {
  const widget = buildWidget();
  if (config.runsInWidget) Script.setWidget(widget);
  else await widget.presentMedium();
  Script.complete();
} else {
  await runApp();
}

// ---------------------------------------------------------------- app

async function runApp() {
  const htmlPath = path("app.html");
  await fm.downloadFileFromiCloud(htmlPath);
  const html = fm.readString(htmlPath);
  const data = { host: "scriptable", words: baseWords, progress, custom };
  const inject = "window.__STROY__ = " + JSON.stringify(data).replace(/<\//g, "<\\/") + ";";
  const page = html.replace("/*__HOST_DATA__*/", inject);

  const view = new WebView();
  // The page saves by "visiting" stroyslova://save?…; the visit is caught here,
  // written to iCloud and cancelled, so the page never leaves.
  view.shouldAllowRequest = (request) => {
    const url = request.url || "";
    if (!url.startsWith("stroyslova://")) return true;
    try {
      const raw = url.slice(url.indexOf("?") + 1).replace(/^d=/, "");
      const incoming = JSON.parse(decodeURIComponent(raw));
      const current = readStoreNow();
      const merged = {
        words: Engine.merge(current.words || {}, incoming.progress || {}),
        custom: Array.isArray(incoming.custom) ? incoming.custom : (current.custom || []),
        updated: Date.now(),
      };
      fm.writeString(path("progress.json"), JSON.stringify(merged));
    } catch (e) {
      console.error("Stroyslova save failed: " + e);
    }
    return false;
  };
  await view.loadHTML(page, "https://stroyslova.app/");
  await view.present(true);
}

// ---------------------------------------------------------------- widget

function buildWidget() {
  const family = config.widgetFamily || "medium";
  // The same three words the app shows under "Слова сейчас"; the widget
  // steps through them every half hour (iOS decides the exact moment).
  const slot = Math.floor(Date.now() / (30 * 60 * 1000));
  const set = Engine.focusSet(allWords, progress, 3, Engine.today(), Math.floor(slot / 3));
  const w = new ListWidget();
  w.url = "scriptable:///run/" + encodeURIComponent(Script.name());
  w.refreshAfterDate = new Date((slot + 1) * 30 * 60 * 1000 + 5000);

  const ink = Color.dynamic(new Color("#142033"), new Color("#e7edf4"));
  const muted = Color.dynamic(new Color("#5a6879"), new Color("#92a0b2"));
  const accent = Color.dynamic(new Color("#1d5bd0"), new Color("#5a8ef2"));

  if (!set.length) {
    const t = w.addText("Стройслова: нет слов");
    t.textColor = ink;
    return w;
  }
  const index = slot % set.length;
  const word = set[index];
  const box = Engine.boxOf(progress, word);
  const isDue = box > 0 && Engine.dueOf(progress, word) <= Engine.today();
  const label = box === 0 ? "НОВОЕ" : isDue ? "ПОВТОРИТЬ" : "УЧУ";

  if (family === "accessoryInline") {
    w.addText(word.en + " — " + word.ru);
    return w;
  }
  if (family === "accessoryRectangular" || family === "accessoryCircular") {
    const a = w.addText(word.en);
    a.font = Font.boldSystemFont(15);
    a.minimumScaleFactor = 0.6;
    const b = w.addText(word.ru);
    b.font = Font.systemFont(12);
    b.lineLimit = 2;
    return w;
  }

  w.backgroundColor = Color.dynamic(new Color("#ffffff"), new Color("#17202b"));
  w.setPadding(12, 16, 12, 16);

  const top = w.addStack();
  top.centerAlignContent();
  const l = top.addText(label + (set.length > 1 ? "  ·  " + (index + 1) + "/" + set.length : ""));
  l.font = Font.semiboldSystemFont(10);
  l.textColor = accent;
  top.addSpacer();
  const pips = top.addText("▮".repeat(box) + "▯".repeat(6 - box));
  pips.font = Font.systemFont(9);
  pips.textColor = muted;

  // Fill the medium widget: a short meaning leaves room for two examples,
  // a long one (two lines) for one.
  const longMeaning = word.ru.length > 42;
  const examples = (word.examples || []);
  const shown = family === "small" ? [] :
    examples.length === 0 ? [] :
    family === "large" ? examples.slice(0, 3) :
    longMeaning ? [examples[slot % examples.length]] :
    [examples[slot % examples.length], examples[(slot + 1) % examples.length]].filter((e, i, a) => a.indexOf(e) === i);

  // Three parts — the word, its meaning, the examples — with the free room
  // split between them, so the card is filled top to bottom whatever the
  // length of the word or the meaning.
  w.addSpacer();
  const head = w.addStack();
  head.bottomAlignContent();
  const en = head.addText(word.en);
  en.font = Font.boldSystemFont(family === "small" ? 22 : 30);
  en.textColor = ink;
  en.minimumScaleFactor = 0.5;
  en.lineLimit = 1;
  if (word.ipa && family !== "small") {
    head.addSpacer(8);
    const ipa = head.addText(word.ipa);
    ipa.font = Font.systemFont(15);
    ipa.textColor = muted;
    ipa.lineLimit = 1;
    ipa.minimumScaleFactor = 0.7;
  }
  if (word.ipa && family === "small") {
    const ipa = w.addText(word.ipa);
    ipa.font = Font.systemFont(12);
    ipa.textColor = muted;
  }

  w.addSpacer(4);
  const ru = w.addText(word.ru);
  ru.font = Font.systemFont(family === "small" ? 13 : 16);
  ru.textColor = ink;
  ru.lineLimit = family === "small" ? 3 : 2;
  ru.minimumScaleFactor = 0.85;

  if (shown.length) w.addSpacer();
  shown.forEach((ex, i) => {
    if (i > 0) w.addSpacer(6);
    const twoLines = shown.length === 1;
    // An accent bar on the left sets the example apart from the meaning.
    const row = w.addStack();
    row.layoutHorizontally();
    row.spacing = 8;
    const bar = row.addStack();
    bar.size = new Size(3, twoLines ? 62 : 31);
    bar.backgroundColor = accent;
    bar.cornerRadius = 1.5;
    const col = row.addStack();
    col.layoutVertically();
    col.spacing = 1;
    const e = col.addText(ex.en);
    e.font = Font.italicSystemFont(13.5);
    e.textColor = ink;
    e.lineLimit = twoLines ? 2 : 1;
    e.minimumScaleFactor = 0.75;
    const er = col.addText(ex.ru);
    er.font = Font.systemFont(12);
    er.textColor = muted;
    er.lineLimit = twoLines ? 2 : 1;
    er.minimumScaleFactor = 0.75;
  });
  // With examples the last one sits on the bottom edge; without them the
  // word and meaning stay centred.
  if (!shown.length) w.addSpacer();
  return w;
}
