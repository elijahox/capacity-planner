# CLAUDE.md — Capacity Planner

## Project Overview
- **What**: Capacity planning tool for C&S Ecomm Experience delivery teams
- **Live URL**: https://capacityplanner.net
- **Stack**: Node.js + Express + PostgreSQL (pg) + vanilla JS frontend
- **User**: Single user (Elijah)
- **GitHub**: elijahox/capacity-planner
- **Hosting**: Railway — auto-deploys from `main` branch on `git push`

## Architecture

```
capacity-planner/
├── server.js              # Express server, API routes, auth, serves public/
├── db.js                  # PostgreSQL setup, save/load state as single JSON blob
├── seed.js                # Baseline seed data — updated via "Save as Seed" button
├── public/
│   ├── index.html         # App shell: CSS, nav, modal overlay, auth screen, <script> tags
│   └── js/
│       ├── data.js        # Default state: squads, initiatives, people, etc.
│       ├── utils.js       # Helper functions: dates, currency, badge classes, allocation calc
│       ├── persistence.js # Auth, save/load, polling, auto-save (1.2s debounce)
│       ├── app.js         # View router, renderSidebar, openModal/closeModal, boot IIFE
│       └── views/
│           ├── overview.js    # Summary stats, FY27 planned headcount
│           ├── squads.js      # Capacity overview + commitment heat map tabs
│           ├── orgchart.js    # Tribes → squads → person cards, leadership, vacancies, drag-drop
│           ├── people.js      # People register: all staff, filter by type, CSV import
│           ├── contractors.js # Contractor watch: expiring contracts
│           ├── initiatives.js # Allocation management
│           ├── pipeline.js    # Business case tracking: submitted → approved → in_delivery → complete
│           ├── roadmap.js     # Initiative timeline
│           ├── demand.js      # Work profiles + canvas chart
│           └── financials.js  # Cost tracking
```

**Script load order** (index.html): `data.js → utils.js → persistence.js → views/*.js → app.js`

## Current Views
- **Overview** — summary stats, FY27 planned headcount
- **Squads** — capacity overview + commitment heat map tabs
- **Org Chart** — tribes, squads, people, leadership, vacancy cards, discipline counts
- **People Register** — all staff, filter by type, CSV import
- **Contractor Watch** — expiring contracts grouped by urgency
- **Initiatives** — allocation management
- **Pipeline** — business case tracking (submitted → approved → in_delivery → complete)
- **Roadmap** — initiative timeline
- **Demand** — work profiles + peak collision analysis
- **Financials** — cost tracking

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
// Top-level state keys (managed by collectState/applyState):
{
  squads,              // array
  initiatives,         // array
  people,              // array
  initiativeDates,     // object
  workProfiles,        // object
  tribeLeadership,     // object
  squadOrder,          // object
  fy27PlannedHeadcount // number or null
}

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

// people
{ id, name, squad, secondarySquad,        // secondarySquad = 50/50 split
  role, type ('perm'|'contractor'|'msp'),
  dayRate, agency, startDate, endDate,
  status ('active'|'inactive'),
  nextAction, actionStatus, comments,
  isVacant,                               // boolean — vacant role slot
  vacancyStatus,                          // 'pending'|'approved'|null
  vacancyProject }                        // string or null

// tribeLeadership — { tribeId: [personId x4] }  (4 leadership slots per tribe)
// squadOrder      — { squadId: [personId, ...] } (explicit display ordering)
// initiativeDates — { initId: { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' } }
// workProfiles    — { initId: [weeklyPct, ...] } (index 0 = first week)
// fy27PlannedHeadcount — number or null (editable on Overview)
```

## Capacity Logic
- **Actual headcount** = dynamic count from people array (excludes `isVacant`, counts `secondarySquad` as 0.5)
- **Committed headcount** = `(totalAllocationPct / 100) * squad.size`
- **RAG status**: Green = fully staffed, Amber = 1–2 people short, Red = 3+ short or over-allocated
- **Discipline counts**:
  - 💻 Dev = engineers, tech leads, lead engineers
  - 🔍 QE = quality engineers
  - Engineering Managers = Delivery discipline
  - BAs = Product discipline

## Tribes and Colours
| Tribe | Colour |
|-------|--------|
| Web | `#1a5276` |
| Range | `#1e8449` |
| App | `#6c3483` |
| Customer Platform | `#c17f24` |

## Key Concepts

**Work profiles** — each initiative has a weekly % capacity shape (bell curve by default) rather than a flat allocation. The profile drives the demand chart. Edit via the ✏ Profile button in the Demand Chart view.

**Org chart** — two-tier visual: tribe header nodes (coloured by tribe) across the top, squad columns below. Person cards are draggable (HTML5 API) between squads. Squad names are double-click renameable. New squads can be added per tribe. Supports leadership slots (4 per tribe), vacancy cards, discipline counts (Dev/QE), and explicit card ordering via `squadOrder`.

**Pipeline** — tracks initiatives through status stages: `submitted` → `approved` → `in_delivery` → `complete`. Each initiative carries `estimatedCapacity` (pre-approval planning) separate from `allocations` (feeds utilisation). On activation, `estimatedCapacity` is copied into `allocations`.

**Commitment Heat Map** — tab within the Squads view. Rows = squads grouped by tribe, columns = next 12 months. Committed % from `approved`/`in_delivery` initiatives; pending % from `submitted` initiatives. Colour-coded cells; dashed amber border for pending demand.

**Vacancies** — embedded in the people array as records with `isVacant: true`. Can have `vacancyStatus` (pending/approved) and `vacancyProject`. Excluded from actual headcount calculations. Displayed as special cards in the org chart.

**CSV import (People Register)** — "↑ Import CSV" button opens a modal with a file picker. Skips `Type = Permanent` rows; matches existing contractors/MSPs by name. Accepts multiple date formats. Returns `{ added, updated, skipped }`.

## Auth Flow

1. On load: check `sessionStorage.cp_pw` → verify with `/api/auth` → skip login screen if valid
2. Login: POST to `/api/auth`, store password in `_sessionPassword` + `sessionStorage`
3. Every save: POST to `/api/data` with `{ password, data: collectState() }`
4. Polling: GET `/api/data`, call `applyState()` to merge remote changes

## Dev Workflow

```bash
# Run locally
node server.js          # http://localhost:3000, password: ecomm2026

# Deploy
git add . && git commit -m "type: description" && git push
# Railway auto-deploys on push to main
```

**Local dev requires `DATABASE_URL` in `.env`** (gitignored).

**Environment variables** (set in Railway):
- `PLANNER_PASSWORD` — team password
- `PORT` — set automatically by Railway
- `DATABASE_URL` — set automatically by Railway Postgres plugin

## Common Patterns

**Adding a new view**:
1. Create `public/js/views/myview.js` with `function renderMyView() { return \`...\`; }`
2. Add `<script src="js/views/myview.js"></script>` to `index.html` before `app.js`
3. Add nav button in `index.html`
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
- Use the existing modal pattern from `app.js` — never create a new modal system
- All API routes go in `server.js`
- Database queries go in `db.js` only — never query the db directly from `server.js`

## Ground Rules for Claude Code
- Never refactor or modify code that isn't directly related to the current task
- If you notice something that could be improved elsewhere, flag it as a comment but do not change it
- Always work in the most specific file possible — if the change is in `demand.js`, only touch `demand.js`
- Before any large change, summarise your approach in plain English and wait for confirmation
- Never change CSS variables or base styles unless the task explicitly asks for it
- After completing any task that introduces a new pattern, architectural decision, or convention, update DECISIONS.md with what was decided and why. Keep entries concise — 2–3 sentences maximum.
- DO NOT run `npm test` — the test suite has been removed (see lesson #11).

## Scoping Rules
- UI changes → `public/js/views/[viewname].js`
- Layout/style changes → `public/index.html` CSS section
- API changes → `server.js`
- Database changes → `db.js`
- Shared utilities → `public/js/utils.js`
- Data and constants → `public/js/data.js`
- Auth and save/load → `public/js/persistence.js`

## Deployment
- Commit messages should be: `type: description`
  e.g. `feat: add org chart view`
       `fix: contractor watch expiry calculation`
       `refactor: split views into separate files`
       `style: UI refresh slate blue palette`

## Backup Strategy
1. **Railway automatic daily backups** (7-day retention)
2. **"Save as Seed" button** — checkpoints current data to `seed.js`
3. **"Download Backup" button** — exports JSON to local machine
4. **"Restore from Backup" button** — imports JSON back

## Hard Lessons Learned (CRITICAL — READ EVERY SESSION)

### 1. Never save during initialisation
Load order must be: fetch API → set state → render → THEN start polling/save cycle. Never before. Any deviation risks default data overwriting real database data.

### 2. Test data must never touch the database
No test data in `db.js`, `seed.js`, `server.js`, or any init code. Only in test files (which are now deleted).

### 3. The seeded flag is sacred
The `store` table has two keys: `'state'` and `'seeded'`. Never delete the seeded flag in code. Only manually via Railway query editor if intentionally reseeding.

### 4. seed.js must match production data shape
After significant people/squad changes, update `seed.js` using the "Save as Seed" button in the app. Never let `seed.js` contain test data or empty arrays.

### 5. Scroll position must be preserved on every re-render
Every `renderOrgChart()` call must save/restore scroll:
```js
const el = document.getElementById('org-chart-scroll');
const sl = el?.scrollLeft || 0;
const st = window.scrollY;
render();
requestAnimationFrame(() => {
  if (el) el.scrollLeft = sl;
  window.scrollTo(0, st);
});
```

### 6. Event listeners must be cleaned up
Use event delegation on parent containers. Never add listeners inside render functions without cleanup. Always clear intervals before setting new ones.

### 7. Global state is the single source of truth
The module-level variables (`squads`, `initiatives`, `people`, `initiativeDates`, `workProfiles`, `tribeLeadership`, `squadOrder`, `fy27PlannedHeadcount`) are the only source of truth. Modal saves must update these globals BEFORE calling `scheduleSave()`. Never update DOM only.

### 8. Deploy checklist
Before every `git push`:
1. Verify app works locally
2. `git add .`
3. `git commit -m "type: description"`
4. `git push`
DO NOT run `npm test` — test suite has been removed.

### 9. Never use Object.assign() to merge state
`applyState()` must do full replacement, never merge. Merging defaults with DB data causes deleted items to resurrect. Always clear existing keys first, then assign DB data.

### 10. Guard scheduleSave() with an _initialized flag
`scheduleSave()` must check `_initialized === true` before doing anything. Set `_initialized = true` only after API data fully loaded. Prevents default state from overwriting real data during boot.

### 11. Tests were permanently removed
The test suite connected to production DB and wiped data on every run via `deleteState()`. Removed permanently. DO NOT add tests back without a fully isolated `TEST_DATABASE_URL` that never falls back to `DATABASE_URL`.

### 12. Debug the right layer first
When data loss happens:
1. Stop shipping fixes
2. Check the database directly (Railway → Postgres → Data)
3. Check Network tab for POST `/api/data` payload
4. Run console query to verify DB contents
5. Form one hypothesis, test in isolation
"Always verify what your tools are actually doing to production, not what you assume they are doing."

### 13. Save as Seed before major changes
Before risky work:
1. Click "Save as Seed" in the app
2. `git add seed.js`
3. `git commit -m "chore: checkpoint seed data"`
4. `git push`
This makes your current data the recovery baseline.

### 14. Never redeploy old deployments
Always deploy by pushing a new commit. Old deployments have old code — redeploying them can reintroduce fixed bugs. Railway → always deploy from latest GitHub commit.

### 15. Cache busting on all API calls
All `GET /api/data` calls must include cache busting: `fetch('/api/data?t=' + Date.now())`. Server must return `Cache-Control: no-store` headers.
