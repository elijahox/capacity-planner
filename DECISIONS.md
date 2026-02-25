# Architecture Decisions

## 2026-02-21: SQLite over Postgres
Chose SQLite (better-sqlite3) for simplicity — small team,
no complex queries, single JSON blob storage. Can migrate
to Postgres later if needed. Railway free tier caveat:
storage is ephemeral, upgrade to paid or migrate to Postgres
for production reliability.

## 2026-02-21: Single JSON blob storage
Store entire app state as one JSON blob under key `'state'`
rather than normalised tables. Simpler to read/write, matches
the frontend data shape exactly, easy to inspect and debug.
Tradeoff: no ability to query individual records at the DB level.

## 2026-02-21: Vanilla JS frontend, no framework
No React/Vue/Svelte — plain JS with HTML string rendering.
Keeps the build simple (no bundler), easy to deploy anywhere,
Claude Code can modify without framework knowledge.
Tradeoff: manual DOM updates, no component reactivity.

## 2026-02-21: Single shared password auth
One team password via environment variable. Simple to
implement and manage for a small internal team. Not suitable
if individual audit trails are needed later.

## 2026-02-21: Railway over Vercel
Chose Railway because Express + SQLite needs a persistent
process. Vercel's serverless model doesn't support SQLite
file storage. Railway runs the app as a normal Node process.

## 2026-02-25: Component file split
Split from single index.html into separate view files to
prevent Claude Code from making rogue edits across unrelated
views. Each view is now independently editable.
