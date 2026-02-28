# Architecture Decisions

## 2026-02-21: SQLite → PostgreSQL migration
Initially chose SQLite (better-sqlite3) for simplicity. Migrated to
PostgreSQL (pg module) for Railway production reliability — SQLite on
Railway has ephemeral storage. Postgres provides persistent data, automatic
backups, and multi-user safety. Single JSON blob pattern retained.

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
Chose Railway because Express + PostgreSQL needs a persistent
process. Vercel's serverless model doesn't support long-running
servers. Railway runs the app as a normal Node process with
managed Postgres and automatic daily backups.

## 2026-02-25: Component file split
Split from single index.html into separate view files to
prevent Claude Code from making rogue edits across unrelated
views. Each view is now independently editable.

## 2026-02-25: Removed Scenarios view
Scenarios (temporary what-if allocation overlays) were removed
from the app entirely — nav, file, data model, utils, persistence.
The feature was superseded by the Pipeline view's estimated capacity
planning workflow, which is persisted and more structured.

## 2026-02-25: Pipeline status vs initiative status
Initiatives now carry a `pipelineStatus` field (`submitted` |
`approved` | `in_delivery` | `complete`) separate from the legacy
`status` string. On activation (`in_delivery`), `estimatedCapacity`
is copied into `allocations` so the capacity planning engine picks it up.
The `estimatedCapacity` map is pre-approval planning only; `allocations`
drives all utilisation calculations.

## 2026-02-25: Heat map tooltip via _hmTips map
The Commitment Heat Map builds a module-level `_hmTips` object
keyed by `${squadId}_${year}_${month}` during render, rather than
encoding tooltip HTML in data attributes. Avoids HTML-escaping issues
and keeps large tooltip strings out of the DOM. Tooltip div is
`position:fixed`, positioned on `clientX/clientY` via `showHeatTip(event, tipId)`.

## 2026-02-25: Sentinel pattern for filter/tab state
Filter state in views (e.g. pipeline filter, people filter) uses a
module-level `_active` boolean sentinel: set to `true` when a filter
button is clicked, reset to `false` at the top of the render function.
This preserves the selected filter across re-renders while naturally
resetting to the default when navigating away and back.

## 2026-02-27: Database seeding with dedicated flag
`seedIfEmpty()` uses a dedicated `seeded` flag row in the `store` table
rather than validating existing data. First boot: seeds defaults + writes
flag. All subsequent boots: sees flag and skips entirely — never overwrites
user data regardless of state shape. To re-seed: `DELETE FROM store WHERE key = 'seeded'`.

## 2026-02-27: Database backup strategy
Railway Postgres paid plan includes automatic daily backups with 7-day
retention, managed entirely by Railway (no code changes needed). To
restore: Railway dashboard → Postgres service → Backups tab → select
restore point. `seed.js` provides baseline recovery for fresh database
instances. App also has "Download Backup" and "Restore from Backup" buttons
for manual JSON export/import.

## 2026-02-27: Split squad assignments (secondarySquad)
People can now belong to two squads at 50/50 split via a `secondarySquad` field.
Shared members count 0.5 headcount in each squad for capacity calculations.
Org chart renders shared cards in both columns with a diagonal gradient background
and "Shared" / "50%" badges; drag-drop is context-aware (primary vs secondary).

## 2026-02-27: Org chart scroll preservation
Added `orgChartRerender()` helper that captures and restores both horizontal
(`#orgchart-scroll.scrollLeft`) and vertical (`#content.scrollTop`) scroll
positions around `renderContent()` calls. Prevents scroll jumping on drag-drop,
squad creation, and rename operations.

## 2026-02-27: Robust save pipeline with retry and response checking
`persistSave()` now checks the HTTP response status — only shows "✓ Saved" on
200, retries after 3s on failure. Saves deferred (not dropped) when another save
is in-flight. `beforeunload` handler fires `navigator.sendBeacon` for emergency
saves when closing the tab with pending changes.

## 2026-02-28: Test cleanup and seed merge
Tests now call `deleteState()` in both `before()` and `after()` hooks so test data
never persists in the database after a test run. `seedIfEmpty()` merges any surviving
user data (initiativeDates, workProfiles, tribeLeadership, squadOrder) before
seeding defaults, protecting customisations across re-seeds.

## 2026-02-28: Initialization guard and full state replacement
`applyState()` now clears all existing keys before merging DB data for object-type
state (initiativeDates, workProfiles, tribeLeadership, squadOrder) — prevents stale
default keys from persisting. An `_initialized` flag blocks `scheduleSave()` and
`beforeunload` from firing before API data has loaded, preventing defaults from
overwriting real data in the database.

## 2026-02-28: Test suite permanently removed
The test suite (`tests/api.test.js`) was connecting to the production database via
`DATABASE_URL` and running `deleteState()` which wiped the seeded flag, causing
data loss on every deploy cycle. Rather than risk this happening again, the test
suite was permanently removed from the deploy workflow. Tests should not be
re-added without a fully isolated `TEST_DATABASE_URL`.

## 2026-02-28: Vacant role support
Added vacancy tracking embedded in the people array (`isVacant: true`) rather than
a separate data structure. Vacant roles have `vacancyStatus` (pending/approved) and
optional `vacancyProject`. They appear as special cards in the org chart and are
excluded from actual headcount calculations.

## 2026-02-28: Discipline capacity breakdown
Added per-squad discipline counts to org chart: 💻 Dev (engineers, tech leads, lead
engineers) and 🔍 QE (quality engineers). Engineering Managers map to Delivery
discipline, BAs to Product discipline. Discipline icons updated from earlier
"Eng" label to "Dev" for clarity.

## 2026-02-28: Swimlanes reverted
Fixed-height swimlane bands were added to the org chart to group squads by tribe
visually, but reverted because they weren't viable without auto-sort functionality.
The existing tribe header + column layout was kept as-is.
