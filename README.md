# Techdeck

A scrollable reader for system-design concepts. One idea per screen, swiped vertically.
Content is bundled at build time; there is no backend and nothing leaves the device.

**The feed shows one topic at a time.** You pick a topic on the Topics tab and scroll only
that topic's cards; it ends with an end-of-topic screen rather than running on into the
next one. The Topics list is ordered by the prerequisite graph, so the *suggested order*
still comes from the content — you are just never forced to scroll through all of it.

## Running it

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone. The project targets **Expo SDK 57**, which is
what current Expo Go ships — no dev client, no `expo prebuild`, no native modules outside
the Expo SDK.

If port 8081 is busy, `npx expo start --port 8085` (or any free port) works the same.

## Checks

```bash
npm test         # Jest: content validation + feed sequencing
npm run typecheck   # tsc --noEmit, strict
npm run doctor      # expo-doctor: SDK version alignment
```

## Adding a topic

Drop a new `*.json` file into `content/`. Nothing else. The loader
(`src/content/registry.ts`) uses Metro's `require.context`, so every JSON file in that
directory is bundled and validated automatically, and the feed orders topics by the
`prerequisites` field in each file.

## Layout

```
content/            topic files — the source of truth, never edited by app code
src/content/        loader + runtime validation
src/feed/           all sequencing logic, pure and unit-tested (no React)
src/state/          AsyncStorage persistence, settings, the feed state machine
src/theme/          colours and type scale, light + dark
src/components/     card, quiz, end-of-feed rendering, tab icons
app/(tabs)/         feed, topics, settings
app/topic/[id].tsx  one topic: progress, bookmarks, per-topic reset
```

## Navigation

Tapping a topic opens that topic's screen. `Continue` / `Read from the start` there scopes
the feed to that topic and switches to it; tapping a bookmark does the same and lands on
that card. The Feed tab remembers which topic is open, so switching topics costs a tap
only when you actually change topic.

Two decks exist, and the distinction matters:

- `libraryDeck` — every topic in prerequisite order. Drives the Topics list, per-topic
  progress and bookmark lookups. Never read from.
- `deck` — exactly one topic. This is what the sequencer sees, which is why the feed
  cannot contain another topic's cards.

Progress stays **global**, keyed by card id. A card seen while reading one topic still
satisfies another topic's quiz prerequisite. Each topic remembers its own resume card.

### Why `src/feed/` is separate

Every sequencing rule is a pure function over plain data. The core one is:

```ts
nextScreen(deck, progress, cursor): FeedNode
```

Given the deck, what the reader has seen and answered, and where they are, it returns the
next screen. No React, no rendering, no storage. `src/feed/__tests__/` drives it directly,
including a `simulate()` helper that walks a whole run and returns it as a readable
sequence like `['c1', 'c2', 'c3', 'c4', 'Q:Q1', 'c5', ...]`.

The React layer (`src/state/FeedContext.tsx`) does nothing but feed this function real
progress and hold onto the screens it produces.

## Content validation

Every file is checked on load. **Duplicate ids, dangling prerequisites, unknown audiences
and malformed shapes throw in dev** so they cannot be shipped past unnoticed; in
production they are logged and the app carries on rather than crashing a reader mid-card.
**Word-count violations are logged only, never fatal** — a card body outside 60–80 words
warns and still renders.

Word count is a whitespace-token count, so hyphenated terms count as one word.

## Behaviour notes

These are the places where the spec left a choice, and what was chosen.

- **Quiz cadence.** A quiz is considered once at least 4 content cards have passed since
  the last one. If nothing is eligible at that point, the check repeats on each following
  screen rather than waiting for the next exact multiple of 4 — so a question appears as
  soon as its prerequisites are met, and consecutive quizzes are still never closer than
  4 content cards apart.
- **Review cards** do not count as content cards. They move neither the quiz cadence nor
  the seen set — a re-surfaced card is already seen; looking at it again only clears the
  review debt that is blocking its question.
- **Skipped reviews.** If a reader swipes past a review card without dwelling on it long
  enough to count, it is offered again 6 content cards later, so a question cannot be
  stranded behind a review that was never re-read.
- **End of topic.** Any review still owed when the topic's cards run out is flushed before
  the end screen, once each, rather than being dropped. The end screen offers the next
  topic that still has unread cards.
- **Undeliverable reviews.** A review card the current deck cannot show — it belongs to
  another topic, or the audience mode hides it — does not hold its question back. Nothing
  would ever re-surface it, so blocking on it would retire the question by accident.
- **Ordinals** (`3 / 9`) count visible cards in the current audience mode, so the total
  never includes a card the reader will not be shown.
- **Audience prerequisites.** A quiz whose prerequisite card is filtered out by the
  current audience mode can never become eligible in that mode. This is intentional —
  it is a content-authoring constraint, and validation will not flag it.
- **Restarting** replays the base sequence with progress intact. Because everything is
  already seen, any question left unanswered becomes eligible immediately.
- **Bookmarks** are not part of progress. They do not affect sequencing, quiz eligibility
  or review scheduling, and **neither reset clears them** — they are what the reader chose
  to keep, not a record of what they did. They live in their own context so that saving a
  card cannot cause the feed to retile.
- **Bookmarked cards hidden by the audience mode** are counted and reported on the topic
  screen rather than silently omitted, so a bookmark never appears to have vanished.
- **Per-topic reset** (topic screen) clears one topic's cards and questions and leaves every
  other topic alone. It resets against the *topic file*, not the audience-filtered deck,
  so a card hidden by the current audience mode still has its seen state cleared.
  Resetting a topic also drops its cards from any other topic's outstanding review debt —
  those cards are returning to the normal rotation, so a question waiting on them would
  otherwise be stranded. `Reset all progress` in Settings remains the blanket version.

## Seen tracking

A card counts as seen once it has been at least 80% visible for 600 ms — expressed
directly as the `FlatList` viewability config, not as a hand-rolled timer. Both the seen
set and the last card viewed are persisted, so the app resumes on the card the reader left
off on rather than at a screen index that may have shifted.
