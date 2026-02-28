# CLAUDE.md — Capacity Planner

## Project Overview
- **What**: Internal capacity planning tool for C&S Ecomm Experience teams
- **Live URL**: https://capacity-planner-production-e917.up.railway.app
- **Stack**: Node.js + Express + PostgreSQL (pg) + vanilla JS frontend
- **Auth**: Single shared team password (`PLANNER_PASSWORD` env var, default `ecomm2026`)

## Architecture

```
capacity-planner/
├── server.js              # Express server, API routes, auth, serves public/
├── db.js                  # PostgreSQL setup, save/load state as single JSON blob
├── tests/
│   └── api.test.js        # Backend API tests using node:test (8 tests)
├── public/
│   ├── index.html         # App shell: CSS, nav, modal overlay, auth screen, <script> tags
│   └── js/
│       ├── data.js        # squads, initiatives, people, initiativeDates, workProfiles
│       ├── utils.js       # Helper functions: dates, currency, badge classes, allocation calc
│       ├── persistence.js # Auth, save/load, 30s polling, auto-save (1.2s debounce)
│       ├── app.js         # View router, renderSidebar, openModal/closeModal, boot IIFE
│       └── views/
│           ├── overview.js
│           ├── squads.js
│           ├── people.js
│           ├── orgchart.js    # Two-tier org chart: tribes → squads → person cards, drag-and-drop
│           ├── contractors.js
│           ├── initiatives.js
│           ├── pipeline.js    # Pipeline view: status filter, table, modal, status advancement
│           ├── roadmap.js
│           ├── demand.js      # Includes profile editor modal + canvas drawing
│           └── financials.js
```

**Script load order** (index.html): `data.js → utils.js → persistence.js → views/*.js → app.js`

### Key functions by file

| File | Key functions |
|------|--------------|
| `utils.js` | `getSquadAllocation`, `getEffectiveSquadSize`, `utilColor/Class/Label`, `getExpiryClass/Label`, `parseCSV`, `parseCsvDate`, `parseCsvDayRate`, `parseCsvType`, `matchSquadByName` |
| `persistence.js` | `submitAuth`, `loadAndInit`, `persistSave`, `scheduleSave`, `applyState`, `collectState` |
| `app.js` | `renderSidebar`, `showView`, `renderContent`, `openModal`, `closeModal`, boot IIFE |
| `views/people.js` | `renderPeople`, `openPersonModal`, `savePerson`, `openAddPersonModal`, `addPerson`, `openCsvImportModal`, `processCsvImport`, `importPeopleFromCsv` |
| `views/orgchart.js` | `renderOrgChart`, `renderOrgTribeGroup`, `renderOrgSquadCol`, `renderOrgPersonCard`, `orgChartRenameSquad`, `orgChartNewSquad`, `orgChartConfirmNewSquad`, `orgChartDragStart/End/Over/Leave/Drop` |
| `views/demand.js` | `renderDemand`, `drawDemandChart`, `openProfileEditor`, `applyProfilePreset_v2`, `saveProfileAndClose` |
| `views/pipeline.js` | `renderPipeline`, `setPipelineFilter`, `openPipelineModal`, `savePipelineModal`, `advancePipelineStatus`, `fmtBudget`, `getPipelineStatusClass/Label` |
| `views/squads.js` | `renderSquads`, `setSquadsTab`, `renderHeatMap`, `showHeatTip`, `hideHeatTip` |

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | None | Returns `{ ok: true }` |
| POST | `/api/auth` | None | Verify password → `{ ok: true/false }` |
| GET | `/api/data` | None | Load state → `{ ok: true, data: null\|object }` |
| POST | `/api/data` | Password in body | Save state → `{ ok: true }` |

## Data Model

All state is saved as a single JSON blob in PostgreSQL under key `'state'`.

```js
// squads — tribes: web, range, app, cp
{ id, tribe, name, size }

// initiatives
{ id, name, tier (1/2/3), status, owner,
  allocations: { squadId: pct },          // drives utilisation calculations
  estimatedCapacity: { squadId: pct },    // pre-approval planning only
  budget,                                 // number (dollars) or null
  estimatedHeadcount,                     // number or null
  expectedStart,                          // 'YYYY-MM-DD' or null
  expectedDuration,                       // weeks (number) or null
  sponsor,                                // string or null
  pipelineStatus }                        // 'submitted'|'approved'|'in_delivery'|'complete'
// On activation (→ in_delivery), estimatedCapacity is copied into allocations

// people
{ id, name, squad, role, type ('perm'|'contractor'|'msp'),
  dayRate, agency, startDate, endDate, status ('active'|'inactive'),
  nextAction, actionStatus, comments }

// initiativeDates — { initId: { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' } }
// workProfiles    — { initId: [weeklyPct, ...] }  (index 0 = first week of initiative)
```

## Key Concepts

**Work profiles** — each initiative has a weekly % capacity shape (bell curve by default) rather than a flat allocation. The profile drives the demand chart. Edit via the ✏ Profile button in the Demand Chart view.

**Demand chart** — overlays initiative work profiles as weekly line/area curves over a Jan 2025–Dec 2026 window. Shows peak collision analysis: flags months where combined demand exceeds 100%.

**Org chart** — two-tier visual: tribe header nodes (coloured by tribe) across the top, squad columns below connected by horizontal bar + vertical drops in tribe colour. Person cards are draggable (HTML5 API) between squads; drop updates `person.squad`, recalculates headcount, and auto-saves. Squad names are double-click renameable inline. New squads can be added per tribe via an inline form at the end of each tribe row. Nav position: between People Register and Contractor Watch.

**Contractor watch** — groups non-perm active people by contract expiry: expired, <14d, 14–30d, 30–90d, 90+. Badge on nav button shows count expiring within 30 days.

**Pipeline** — tracks initiatives through status stages: `submitted` (pending) → `approved` (committed) → `in_delivery` (active) → `complete`. Each initiative carries `estimatedCapacity` (pre-approval planning map) separate from `allocations` (what feeds utilisation). Quick-action buttons advance status; on activation, `estimatedCapacity` is copied into `allocations`.

**Commitment Heat Map** — tab within the Squads view. Rows = squads grouped by tribe, columns = next 12 months. Committed % = sum of `allocations` from `approved`/`in_delivery` initiatives whose date range overlaps that month. Pending % = `estimatedCapacity` from `submitted` initiatives. Cells are colour-coded; dashed amber border indicates pending demand exists.

**Utilisation** — calculated from `getSquadAllocation()` which sums `allocations` across all initiatives. `getEffectiveSquadSize()` uses people register headcount (falls back to `squad.size` if empty).

**CSV import (People Register)** — "↑ Import CSV" button opens a modal with a file picker and column-mapping reference. Logic in `importPeopleFromCsv(csvText)`:
- Skips any row where `Type = Permanent` (case-insensitive); also never overwrites existing `perm` records
- Matches existing contractors/MSPs by name (case-insensitive); updates via `Object.assign` or pushes a new record
- Accepts date formats: `DD/MM/YYYY`, `D/M/YY`, `YYYY-MM-DD`, `DD-MMM-YY`, natural language
- Day rate fields must be quoted in the CSV if they contain commas (e.g. `"$1,350"`) — standard Excel export behaviour
- Returns `{ added, updated, skipped }`; `scheduleSave()` is called after import

## Auth Flow

1. On load: check `sessionStorage.cp_pw` → verify with `/api/auth` → skip login screen if valid
2. Login: POST to `/api/auth`, store password in `_sessionPassword` + `sessionStorage`
3. Every save: POST to `/api/data` with `{ password, data: collectState() }`
4. 60s polling: GET `/api/data`, call `applyState()` to merge remote changes

## Dev Workflow

```bash
# Run locally
node server.js          # http://localhost:3000, password: ecomm2026

# Run tests
npm test                # node --test tests/api.test.js (8 tests)

# Deploy
npm test && git add . && git commit -m "message" && git push
# Railway auto-deploys on push to main (elijahox/capacity-planner)
```

**Local dev requires `DATABASE_URL` in `.env`**:
- Copy the Postgres connection string from the Railway dashboard (project → Postgres service → Variables → `DATABASE_URL`)
- Paste it into `.env`: `DATABASE_URL=postgresql://...`
- `.env` is gitignored and never committed
- Alternatively, install Postgres locally and point `DATABASE_URL` at it
- Tests load `.env` automatically via `dotenv` (now a real dependency, always installed)
- Use `TEST_DATABASE_URL` env var to point tests at a separate database if needed

**Environment variables** (set in Railway):
- `PLANNER_PASSWORD` — team password
- `PORT` — set automatically by Railway
- `DATABASE_URL` — set automatically by Railway Postgres plugin

## Common Patterns

**Adding a new view**:
1. Create `public/js/views/myview.js` with `function renderMyView() { return \`...\`; }`
2. Add `<script src="js/views/myview.js"></script>` to `index.html` before `app.js`
3. Add nav button in `index.html`: `<button class="nav-btn" onclick="showView('myview',this)">My View</button>`
4. Add `myview: renderMyView` to the `views` object in `renderContent()` in `app.js`

**Modifying data model**:
- Add fields to the relevant array in `data.js`
- Update `collectState()` / `applyState()` in `persistence.js` if adding a new top-level key
- Update modal HTML in the relevant view file

**CSV import helpers** (all in `utils.js`):
- `parseCSV(text)` — splits by newline (quoted-field-aware), returns `[{ header: value }]`
- `parseCsvDate(str)` → `YYYY-MM-DD` or `null`
- `parseCsvDayRate(str)` — strips `$`, commas, spaces → float or `null`
- `parseCsvType(str)` → `'perm'` | `'contractor'` | `'msp'`
- `matchSquadByName(name)` — exact-then-partial match against `squads` array → `squadId` or `null`

**CSS** — all styles are inline in `index.html` `<style>` block. CSS variables defined in `:root`.

## Conventions
- Always use CSS variables, never hardcode colours
- New views go in `public/js/views/` as their own file
- Always run `npm test` before committing
- Use the existing modal pattern from `app.js` — never create a new modal system
- All API routes go in `server.js`
- Database queries go in `db.js` only — never query the db directly from `server.js`

## Ground Rules for Claude Code
- Never refactor or modify code that isn't directly related to the current task
- If you notice something that could be improved elsewhere, flag it as a comment but do not change it
- Always work in the most specific file possible — if the change is in `demand.js`, only touch `demand.js`
- Before any large change, summarise your approach in plain English and wait for confirmation
- Never change CSS variables or base styles unless the task explicitly asks for it
- Always run `npm test` after making changes
- After completing any task that introduces a new pattern, architectural decision, or convention, update DECISIONS.md with what was decided and why. Keep entries concise — 2–3 sentences maximum.

## Scoping Rules
- UI changes → `public/js/views/[viewname].js`
- Layout/style changes → `public/index.html` CSS section
- API changes → `server.js`
- Database changes → `db.js`
- Shared utilities → `public/js/utils.js`
- Data and constants → `public/js/data.js`
- Auth and save/load → `public/js/persistence.js`

## Deployment
- Always run `npm test` before `git push`
- Commit messages should be: `type: description`
  e.g. `feat: add org chart view`
       `fix: contractor watch expiry calculation`
       `refactor: split views into separate files`
       `style: UI refresh slate blue palette`

## Hard Lessons Learned

### 1. Never save during initialisation
The app must never call `scheduleSave()` or `persistSave()` during the startup sequence. The load order must always be:
1. Fetch state from API
2. Set global state from API response
3. Render app
4. THEN start polling and save cycle

Any deviation from this order risks a race condition where default data overwrites real database data.

### 2. Test data must never touch the database
Test data (`TEST SQUAD ONLY`, `Alice`, `test-s1` etc.) must only exist inside `tests/api.test.js`. Never in `db.js`, `seed.js`, `server.js`, or any initialisation code. Claude Code must never write test state to the database under any circumstances.

### 3. The seeded flag is sacred
The `store` table has two keys: `'state'` and `'seeded'`. The `'seeded'` flag is a one-way door — once written it must never be overwritten or deleted except by a deliberate manual action in the Railway query editor. No code should ever delete or overwrite the seeded flag.

### 4. Seed data must match production data shape
`seed.js` must always be rebuilt from `public/js/data.js` when people or squads are added. It must never contain empty arrays, test data, or placeholder values. After any significant data change, update `seed.js` to match.

### 5. Scroll position must be preserved on every re-render
Every function that calls `renderOrgChart()` or any view re-render must save and restore scroll position using `requestAnimationFrame`. This applies to: drag-drop, modal save, inline edit, polling, squad rename, leadership changes, add person. Use the pattern:
```js
const scrollLeft = container?.scrollLeft || 0;
const scrollTop = window.scrollY;
render();
requestAnimationFrame(() => {
  if (container) container.scrollLeft = scrollLeft;
  window.scrollTo(0, scrollTop);
});
```

### 6. Event listeners must be cleaned up
Never add event listeners inside render functions without cleanup. Use event delegation on parent containers instead of attaching listeners to individual cards. Always clear intervals before setting new ones (`pollInterval`, `saveTimeout`).

### 7. Global state is the single source of truth
The module-level variables (`squads`, `initiatives`, `people`, `initiativeDates`, `workProfiles`, `tribeLeadership`, `squadOrder`) are the only source of truth. When a modal saves, it must update these globals directly before calling `scheduleSave()`. Never update only the DOM or a local copy — the global state must always reflect reality before a save is triggered.

### 8. Deploy checklist
Before every `git push`:
1. Run `npm test`
2. Verify the app works locally
3. Confirm no test data exists outside test files
4. Check no `scheduleSave()` calls exist in init code
5. `git add . && git commit -m "type: description" && git push`

### 9. Never use Object.assign() to merge state
`applyState()` must always do full replacement of the global state, never `Object.assign()` or shallow merge. Merging defaults with DB data causes deleted items to resurrect and user changes to be contaminated with default values. Always clear existing keys first, then assign DB data. Never merge on top of defaults.

### 10. Guard scheduleSave() with an _initialized flag
`scheduleSave()` must check `_initialized === true` before doing anything. Set `_initialized = true` only after the API data has been fully loaded and applied. This prevents any stray event handler or `beforeunload` from writing default state to the database during boot.

### 11. npm test was nuking the production database
`deleteState()` used to delete both `'state'` AND `'seeded'` keys. Tests ran against the production `DATABASE_URL` (from `.env`). The deploy checklist said to run `npm test` before every push. So every deploy cycle: (1) `npm test` deletes the seeded flag, (2) `git push` triggers Railway deploy, (3) server starts, `seedIfEmpty()` sees no seeded flag, re-seeds with defaults → user data lost. Fix: `deleteState()` now only deletes `'state'`, never `'seeded'`. The test script also sets `NODE_ENV=test`. Always use `TEST_DATABASE_URL` when available to isolate tests from production.

### 12. Debug the right layer first
We spent weeks fixing symptoms (race conditions, Object.assign merges, 304 caching) while the root cause was a single line in `deleteState()` wiping the seeded flag on every test run. The one line summary: "Always verify what your tools are actually doing to production systems, not what you assume they are doing." When data loss happens:
1. Stop shipping fixes immediately
2. Add instrumentation first — logs, network tab, direct database queries
3. Form one specific hypothesis
4. Test it in isolation — one change, one deploy, one verification
5. Confirm it works through 3 full deploy cycles before declaring victory
