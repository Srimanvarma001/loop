# Project Plan — Item CRUD API

> **Agent instructions — read before starting any feature.**
>
> You implement features from this file **one at a time, in file order, never skipping ahead**.
> Each feature is a `## Feature N: Title` section. The driver (`drive.sh`) picks the first
> feature whose `- **Status:**` line is still `[ ]` and opens a fresh session for it.
>
> **Definition of Done — every feature must do ALL of these:**
> 1. Meet the feature's **Goal** and **Acceptance criteria** below, using the **Architecture** section.
> 2. Run the project's test suite — all tests must pass. (`npm test` here.)
> 3. Commit **all** source changes **and** this file, message: `feat: <id> <title>`.
> 4. Push to the default branch (`origin main`).
> 5. Only **then** flip `- **Status:** [ ]` → `- **Status:** [x]` in this file, and include that change in the commit.
>
> Do **not** touch any other feature's code, spec, or status. Do **not** commit `drive.log` or `.drive/`.

## Architecture

- **Stack:** Node.js 24 + Express 4 + SQLite via the built-in `node:sqlite` module (no native build tools needed on Windows). Tests use the built-in `node:test` runner — no test framework to install.
- **Key files:**
  - `package.json` — `"type": "module"`; scripts: `start`, `dev`, `test` (`node --test`)
  - `src/server.js` — starts the app (`npm start`), reads `PORT` env (default 3000)
  - `src/app.js` — builds and exports the Express app (kept separate from `server.js` so tests can import it without binding a port)
  - `src/db.js` — opens SQLite via `DatabaseSync`; creates the `items` table on boot; export `initDb()` + `db`
  - `src/items.js` — Express router with all CRUD routes
  - `test/items.test.js` — `node:test` suite covering the API
  - `.gitignore` — ignore `node_modules/`, `items.db`, `*.db`, `drive.log`, `.drive/`
- **Conventions:**
  - JSON in/out; item shape: `{ id: number, title: string, done: boolean }`
  - Routes: `GET /items`, `GET /items/:id`, `POST /items`, `PUT /items/:id`, `DELETE /items/:id`
  - Use `express.json()` middleware; respond `404` `{ "error": "Not found" }` for unknown ids, `400` `{ "error": … }` for bad input
  - Keep all DB access behind `src/db.js`; never open a second connection elsewhere
- **Gotchas:**
  - `node:sqlite` needs Node ≥ 22.5 (this machine has 24.x — fine) and is **synchronous** — no `async`/`await` around queries
  - `src/db.js` must honor `DB_PATH` env (default `items.db`); tests set `DB_PATH=:memory:` before importing so real `items.db` is never touched
  - Only runtime dependency is `express`; add nothing else unless a feature needs it

## Feature 1: Scaffold + list items

- **ID:** scaffold-list
- **Status:** [x] done

**Goal:** The project boots and `GET /items` returns the item list (empty to start).

**Acceptance criteria:**
- [ ] `npm install && npm start` boots the server; `GET /items` returns `200` and `[]` when no items exist
- [ ] `src/db.js` creates the `items` table on first boot
- [ ] A test group boots the app against an in-memory DB and asserts `GET /items` returns `[]`

**Test hints:** create `test/items.test.js` using `node:test` + `assert`; set `DB_PATH=:memory:` before importing the app.

## Feature 2: Create an item

- **ID:** create-item
- **Status:** [x] done

**Goal:** `POST /items` accepts `{ title }` and creates an item with `done: false`.

**Acceptance criteria:**
- [ ] `POST /items` with `{ "title": "…" }` returns `201` and the created item (auto-increment `id`, `done: false`)
- [ ] Missing or empty `title` returns `400` with an error message
- [ ] The created item appears in a subsequent `GET /items`

**Test hints:** post, assert `201`, then GET and confirm it's listed; also cover the `400` case.

## Feature 3: Read a single item

- **ID:** get-item
- **Status:** [ ] pending

**Goal:** `GET /items/:id` returns one item by id.

**Acceptance criteria:**
- [ ] `GET /items/1` returns `200` with the item
- [ ] Unknown id returns `404` `{ "error": "Not found" }`
- [ ] Non-numeric id returns `400`

**Test hints:** create an item then fetch it by id; cover both error cases.

## Feature 4: Update an item

- **ID:** update-item
- **Status:** [ ] pending

**Goal:** `PUT /items/:id` updates `title` and/or `done`.

**Acceptance criteria:**
- [ ] `PUT /items/1` with `{ "done": true }` returns `200` and the updated item
- [ ] Updating a title persists (visible in a follow-up `GET /items/:id`)
- [ ] Unknown id returns `404`

**Test hints:** update each field and verify it persists across requests; cover the `404` case.

## Feature 5: Delete an item

- **ID:** delete-item
- **Status:** [ ] pending

**Goal:** `DELETE /items/:id` removes an item.

**Acceptance criteria:**
- [ ] `DELETE /items/1` returns `204`; the item is gone from a follow-up `GET /items`
- [ ] Deleting an unknown / already-deleted id returns `404`
- [ ] Deleting the last item leaves an empty list

**Test hints:** delete, then confirm the list count drops; cover the `404` case.
