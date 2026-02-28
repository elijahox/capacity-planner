# Conventions

## File Structure
- One view = one file in `public/js/views/`
- No business logic in `index.html` — shell only
- CSS variables defined once at top of `index.html` `<style>` block
- No external CSS frameworks — vanilla CSS only
- No frontend build step — plain JS, no bundler

## Data Model
- All state lives in a single object:
  `{ squads, initiatives, people, initiativeDates, workProfiles }`
- Saved as one JSON blob in PostgreSQL under key `'state'`
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

## Filter / Tab State (Sentinel Pattern)
- Module-level `let _xyzFilter = 'all'` + `let _xyzFilterActive = false`
- Filter buttons call a setter that sets the value and `_active = true`, then `renderContent()`
- At the top of the render function: `if (!_active) _filter = 'default'; _active = false;`
- This preserves the selection across re-renders but resets on navigation away and back
- Tab state (e.g. `_squadsTab`) does NOT need a sentinel — tabs should persist across re-renders

## Heat Map Tooltips
- Build a module-level `_hmTips = {}` map keyed by `${squadId}_${year}_${month}` during render
- Cell elements use `onmouseenter="showHeatTip(event,'tipId')"` / `onmouseleave="hideHeatTip()"`
- `showHeatTip` positions a `position:fixed` div using `event.clientX` / `event.clientY`
- Never encode tooltip HTML in data attributes — too fragile with quotes and special characters

## Testing
- No automated test suite — permanently removed (was corrupting production database)
- Manual UI testing only until a properly isolated test database is set up
- See CLAUDE.md Hard Lesson #13 for full context
