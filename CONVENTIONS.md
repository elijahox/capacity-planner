# Conventions

## File Structure
- One view = one file in `public/js/views/`
- No business logic in `index.html` — shell only
- CSS variables defined once at top of `index.html` `<style>` block
- No external CSS frameworks — vanilla CSS only
- No frontend build step — plain JS, no bundler

## Data Model
- All state lives in a single object:
  `{ squads, initiatives, people, initiativeDates, workProfiles, scenarios }`
- Saved as one JSON blob in SQLite under key `'state'`
- Never split this into multiple DB tables without a migration plan

## Rendering Pattern
- Views are functions that return HTML strings
- Injected via `innerHTML` in `app.js` `renderContent()`
- Any JS that depends on rendered DOM uses `setTimeout(..., 0)`
- Canvas-based charts redraw completely on every update — no partial updates

## Auto-save Pattern
- Every data change calls `scheduleSave()`
- `scheduleSave` debounces 1.2s then calls `persistSave()`
- `persistSave` POSTs full state to `/api/data`
- Never save partial state — always send the full object

## Adding a New View
1. Create `public/js/views/newview.js`
2. Export a `renderNewView()` function
3. Add to the views map in `app.js`
4. Add nav button in `index.html`
5. Add to CLAUDE.md architecture section

## Styling Rules
- Use CSS variables exclusively (`--bg`, `--accent`, `--text-muted` etc)
- Badges are pill shaped: `border-radius: 999px`
- Cards: `border-radius: 10px`, `1px solid var(--border)`, subtle `box-shadow`
- Interactive elements always have a hover state
- Fonts: Inter for UI, JetBrains Mono for numbers/code/dates

## Testing
- Tests live in `tests/api.test.js`
- Run with: `npm test`
- Tests use a separate `test.db` — never touches production data
- Always run tests before pushing
