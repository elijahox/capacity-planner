# CLAUDE.md — Capacity Planner

## Project Overview
- **What**: Internal capacity planning tool for C&S Ecomm Experience teams
- **Live URL**: https://capacity-planner-production-e917.up.railway.app
- **Stack**: Node.js + Express + SQLite (better-sqlite3) + vanilla JS frontend
- **Auth**: Single shared team password (`PLANNER_PASSWORD` env var, default `ecomm2026`)

## Architecture

```
capacity-planner/
├── server.js              # Express server, API routes, auth, serves public/
├── db.js                  # SQLite setup, save/load state as single JSON blob
├── tests/
│   └── api.test.js        # Backend API tests using node:test (8 tests)
├── public/
│   ├── index.html         # App shell: CSS, nav, modal overlay, auth screen, <script> tags
│   └── js/
│       ├── data.js        # squads, initiatives, people, initiativeDates, workProfiles, scenarios
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
│           ├── roadmap.js
│           ├── demand.js      # Includes profile editor modal + canvas drawing
│           ├── scenarios.js
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

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | None | Returns `{ ok: true }` |
| POST | `/api/auth` | None | Verify password → `{ ok: true/false }` |
| GET | `/api/data` | None | Load state → `{ ok: true, data: null\|object }` |
| POST | `/api/data` | Password in body | Save state → `{ ok: true }` |

## Data Model

All state is saved as a single JSON blob in SQLite under key `'state'`.

```js
// squads — tribes: web, range, app, cp
{ id, tribe, name, size }

// initiatives
{ id, name, tier (1/2/3), status, owner, allocations: { squadId: pct } }

// people
{ id, name, squad, role, type ('perm'|'contractor'|'msp'),
  dayRate, agency, startDate, endDate, status ('active'|'inactive'),
  nextAction, actionStatus, comments }

// initiativeDates — { initId: { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' } }
// workProfiles    — { initId: [weeklyPct, ...] }  (index 0 = first week of initiative)
// scenarios       — [{ id, squadId, label, delta }]  (temporary what-if changes)
```

## Key Concepts

**Work profiles** — each initiative has a weekly % capacity shape (bell curve by default) rather than a flat allocation. The profile drives the demand chart. Edit via the ✏ Profile button in the Demand Chart view.

**Demand chart** — overlays initiative work profiles as weekly line/area curves over a Jan 2025–Dec 2026 window. Shows peak collision analysis: flags months where combined demand exceeds 100%.

**Org chart** — two-tier visual: tribe header nodes (coloured by tribe) across the top, squad columns below connected by horizontal bar + vertical drops in tribe colour. Person cards are draggable (HTML5 API) between squads; drop updates `person.squad`, recalculates headcount, and auto-saves. Squad names are double-click renameable inline. New squads can be added per tribe via an inline form at the end of each tribe row. Nav position: between People Register and Contractor Watch.

**Contractor watch** — groups non-perm active people by contract expiry: expired, <14d, 14–30d, 30–90d, 90+. Badge on nav button shows count expiring within 30 days.

**Scenarios** — temporary what-if overlays on utilisation (add/remove allocation %, hire/lose headcount). Not persisted separately — included in saved state.

**Utilisation** — calculated from `getSquadAllocation()` which sums initiative allocations + scenario deltas. `getEffectiveSquadSize()` uses people register headcount (falls back to `squad.size` if empty).

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
4. 30s polling: GET `/api/data`, call `applyState()` to merge remote changes

## Dev Workflow

```bash
# Run locally
node server.js          # http://localhost:3000, password: ecomm2026

# Run tests
npm test                # node --test tests/api.test.js (8 tests, no extra deps)

# Deploy
npm test && git add . && git commit -m "message" && git push
# Railway auto-deploys on push to main (elijahox/capacity-planner)
```

**Environment variables** (set in Railway):
- `PLANNER_PASSWORD` — team password
- `PORT` — set automatically by Railway
- `DB_PATH` — optional, defaults to `./data.db`

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
