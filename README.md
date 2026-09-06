# DEKurs · Deutsch A1–B2

An installable, offline-first German trainer: vocabulary, grammar, verbs and sentence
building across eight course levels from A1.1 to B2.2. Progress is kept on the device and
can optionally be synced to an account so the same Karteikasten works on phone and computer.

Live app: https://patriciabardaji.github.io/DEKursApp/

The whole app is one `index.html`. No framework, no build step, no dependencies.

## What's inside

| Level | Vokabeln | Grammatik | Verben | Satzbau | Cards |
|-------|---------:|----------:|-------:|--------:|------:|
| A1.1 · Erste Schritte  | 117 |  56 | 28 | 16 | 217 |
| A1.2 · A1 abschließen  | 102 |  56 | 34 | 16 | 208 |
| A2.1 · Grundstufe      | 113 |  70 | 34 | 20 | 237 |
| A2.2 · A2 abschließen  | 107 |  70 | 36 | 20 | 233 |
| B1.1 · Mittelstufe     | 250 | 105 | 56 | 24 | 435 |
| B1.2 · B1 abschließen  | 217 | 112 | 60 | 24 | 413 |
| B2.1 · Oberstufe       | 113 |  70 | 45 | 22 | 250 |
| B2.2 · B2 abschließen  |  97 |  70 | 45 | 22 | 234 |
| **Total** | | | | | **2,227** |

Progress is tracked per level. You pick a level on the welcome screen and can switch at any
time by tapping the DEKurs title; each level keeps its own box.

### First minutes

The interface is deliberately German; every explanation is English. A new learner sees, in
order: the first-start screen (name, optional account), a one-page **How DEKurs works** intro
(shown once, only to someone with no cards answered yet), then the level picker with two folded
guides, *Add to your home screen* and *How it works*. The first time a section is opened, its
ⓘ explanation in the tab is open by default; after that it stays closed until tapped.

### Sections

- **Vokabeln** — type the translation. Three directions, switchable on the card:
  DE → EN, EN → DE, or flip-card. Several German words can share one English meaning, so any
  of them counts. Small typos are graded "Fast" and still count; if the app is wrong you can
  mark your own answer as correct.
- **Grammatik** — fill-the-gap multiple choice, grouped by topic (8–16 topics per level), with
  a short English explanation after each answer. A wrong answer also shows the topic's rule in
  plain words with the topic's key words translated. The **§** button on the card opens the cheat
  sheet for the current topic: the rule in one sentence, the key words with their English meaning,
  one translated example, the matching reference tables side by side, and the rest of the level's
  tables folded away. Looking it up before answering costs no points, but the card then stays in its box and
  comes back tomorrow instead of moving up. Opening it after answering has no effect.
- **Verben** — type two forms of a verb. Which forms depends on the level: Präsens (du / er)
  at A1.1, Präsens + Perfekt at A1.2, Präteritum + Perfekt from A2.1 upwards.
- **Satzbau** — rebuild a German sentence from shuffled word chips, given the English.
- **Blitz** — 60 seconds, mixed vocabulary and grammar, four options each, a wrong answer
  costs three seconds. Points only; it never moves cards between boxes.
- **Spickzettel** — a one-page cheat sheet per level with reference tables.
- **Fortschritt** — 7-day history, box board, stamps, daily-goal setting, name, account,
  backup and reset.

### How learning works

- **Karteikasten (Leitner box).** Every card sits in box 1–5. A correct answer moves it up
  one box, a wrong answer sends it back to box 1. Review intervals are 1, 2, 4, 8 and 16 days.
  A card answered wrong comes back later in the same session and again the next day.
- **Daily plan.** The home screen shows what is due today. The goal is 10, 15, 25 or 40
  minutes (about 15 seconds per card), split across the four sections. Due reviews come
  first, the rest is filled with new cards. When today is done you can pull tomorrow's cards
  forward as a bonus round.
- **Sessions** are 16 cards long. Points and combos accumulate into eight ranks, from
  Zettelwirtschaft to Paragraphenreiter, and 14 stamps reward streaks, error-free sessions,
  mastered topics and more.
- **Keyboard** (desktop): Enter or Space presses the primary button, keys 1–4 pick an option.

## Sharing it

Send the link with a couple of sentences, for example:

> DEKurs is a small German trainer I use: vocabulary, grammar, verbs and sentence building from
> A1 to B2, about 15 minutes a day. Open https://patriciabardaji.github.io/DEKursApp/ in Safari
> (iPhone) or Chrome (Android), add it to your home screen, and pick your level. Everything is
> explained in English on the first screen.

The app takes it from there: intro page, install guide, and an explanation the first time each
section is opened.

## Progress, account and backup

Three layers, from simplest to most robust:

1. **On the device.** Progress lives in the browser's local storage for the URL
   (key `dekurs-v3`). Safari deletes site data after about a week without a visit, so the
   home screen shows a backup reminder to users without an account.
2. **Backup file.** In *Fortschritt → Sicherung*, **Sicherung speichern** downloads
   `karteikasten-fortschritt.json`; **Sicherung laden** restores it on another device.
3. **Account (optional).** The first-start screen asks for a name, e-mail and password:
   **Konto erstellen** makes the account, **Anmelden** signs a returning user in and pulls their
   name, level and progress from the account, **Ohne Konto weiter** skips it. Signing in or out
   later is done in *Fortschritt → Konto*, which also holds the backup-file buttons.
   After every session, on app start and whenever the device comes back online, the app
   pulls the remote copy, merges it with the local one and pushes the result back. The merge
   keeps the better of each card (higher box wins, ties go to the later due date), the higher
   counters, and the busier day in the history. Signed-in users don't see the backup reminder.

### Supabase backend

The account feature uses Supabase Auth (e-mail + password) and one table read through the
REST API with the public anon key. Constants `SUPA_URL` and `SUPA_KEY` sit at the top of the
*KONTO & SYNC* block in `index.html`.

Expected table:

```sql
create table public.progress (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.progress enable row level security;
create policy "own row" on public.progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

The client upserts on `user_id` and selects without a filter, so row-level security is what
keeps one learner's data from another. If e-mail confirmation is enabled in Supabase Auth,
new users confirm by mail first and then sign in; with confirmation off, sign-up logs in
directly.

## Files

| File | Purpose |
|------|---------|
| `index.html` | The whole app: styles, data, courses, storage, account & sync, game rules, screens |
| `sw.js` | Service worker. Cache-first; the `CACHE` name is the version switch |
| `manifest.webmanifest` | App name, icons, standalone display |
| `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | Home-screen icons |

## Editing the content

All data is plain arrays near the top of the script, one set per level, named
`VOCAB_A11 … VOCAB_B22`, `GRAMMAR_*`, `GTOPICS_*`, `VERBS_*`, `SENTENCES_*`. The `COURSES`
object in the *KURSE* block wires them to the level names.

```js
// Vokabel:  German, English, topic, example sentence
["der Name, -n", "name", "Kennenlernen", "Mein Name ist Anna Weber."]

// Grammatik: topic key, prompt with ___, options, answer, explanation (HTML allowed)
["konj", "Ich ___ in Berlin.", ["wohne","wohnst","wohnt"], "wohne", "<b>ich</b> always takes the ending <b>-e</b>."]

// Grammatik-Thema: key, title, example
["konj", "Präsens", "ich wohne · du wohnst"]

// Verb: infinitive, English, form 1, form 2, example 1, example 2
["sein", "to be", "bist", "ist", "Er ist heute nicht da.", "Du bist sehr freundlich."]

// Satzbau: words in the correct order, rule, English
[["Ich","heiße","Patricia"], "Verb in second position, subject first.", "My name is Patricia."]
```

Cheat-sheet tables live in `TABLES`, and `LEVEL_TABLES` says which tables each level shows.
`RULES` holds one entry per grammar topic key: `r` the rule in one sentence, `w` the key words
as `[German, English]` pairs, `ex` one `[German, English]` example (shown in the § panel, on the
Spickzettel and under a wrong answer). `SHEET_FOR` maps a topic key to the tables that help with
it. A new grammar topic needs an entry in both.

## Develop and deploy

Run locally with any static server, since service workers need `http://`, not `file://`:

```sh
python3 -m http.server 8000     # then open http://localhost:8000/
```

While developing, tick *Update on reload* under DevTools → Application → Service Workers,
otherwise you keep seeing the cached copy.

Two automated tests load the app in jsdom. One clicks through grammar cards and checks the §
panel, the peek rule and that no card's answer leaks into its own cheat sheet; the other runs the
first-start screen against a fake Supabase (sign-up, sign-in, wrong password, e-mail confirmation,
skip):

```sh
npm i --no-save jsdom          # once; node_modules is git-ignored
node tests/grammar-sheet.test.js
node tests/start-screen.test.js
node tests/satzbau.test.js       # repeated words are judged by word, not by chip
```

Before pushing, also check that the inline script still parses:

```sh
node -e 'const h=require("fs").readFileSync("index.html","utf8");
[...h.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].forEach((m,i)=>{new Function(m[1]);console.log("script",i+1,"ok")})'
```

**Deploying is a push to `main`.** GitHub Pages serves the branch as-is. Two rules:

1. **Bump the version in `sw.js` every time** (`CACHE = "dekurs-v44"` → `v45`), and
   `APP_VERSION` in `index.html` to match — it shows at the bottom of *Fortschritt*.
   The service worker is cache-first, so an installed phone keeps the old files until it
   sees a changed `sw.js`.
2. **Allow ten minutes.** GitHub Pages caches for 10 minutes. After that, opening the app
   online is enough: it fetches the new worker, swaps the cache and reloads itself. Nobody
   needs to reinstall, and local storage, login and progress are untouched.

## Install on the phone

**iPhone** — open the URL in **Safari** (Chrome on iOS can't do this): Share → *Zum
Home-Bildschirm* → *Hinzufügen*. Open it once from the new icon while online so the
service worker finishes caching; after that it runs in airplane mode.

**Android** — open the URL in Chrome, then menu → *App installieren* / *Zum Startbildschirm
zufügen*.

**Desktop** — just bookmark it. Everything works in a normal browser tab.
