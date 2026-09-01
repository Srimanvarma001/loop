# Project Plan

> **Agent instructions — read before starting any feature.**
>
> You implement features from this file **one at a time, in file order, never skipping ahead**.
> Each feature is a `## Feature N: Title` section. The driver (`drive.sh`) picks the first
> feature whose `- **Status:**` line is still `[ ]` and opens a fresh session for it.
>
> **Definition of Done — every feature must do ALL of these:**
> 1. Meet the feature's **Goal** and **Acceptance criteria** below, using the **Architecture** section.
> 2. Run the project's test suite — all tests must pass. (Choose whatever fits: `npm test`, `pytest`, `go test`, ….)
> 3. Commit **all** source changes **and** this file, message: `feat: <id> <title>`.
> 4. Push to the default branch (`origin main` or your configured default).
> 5. Only **then** flip `- **Status:** [ ]` → `- **Status:** [x]` in this file, and include that change in the commit.
>
> Do **not** touch any other feature's code, spec, or status. Do **not** commit `drive.log` or `.drive/`.

## Architecture

<!-- Paste your real architecture here: stack, key files, conventions, gotchas.
     Every fresh session reads this before implementing — keep it accurate. -->

- **Stack:** …
- **Key files:** …
- **Conventions:** …
- **Gotchas:** …

## Feature 1: Authentication

- **ID:** auth
- **Status:** [ ] pending

**Goal:** Users can sign up, log in, and log out.

**Acceptance criteria:**
- [ ] Sign-up creates a user and hashes the password
- [ ] Login issues a session token
- [ ] Logout invalidates the token

**Test hints:** add an `auth` test group; the existing suite must stay green.

## Feature 2: Dashboard

- **ID:** dashboard
- **Status:** [ ] pending

**Goal:** Logged-in users see a dashboard with their recent activity.

**Acceptance criteria:**
- [ ] Dashboard route requires login
- [ ] Shows the 10 most recent actions for the user

## Feature 3: Notifications

- **ID:** notifications
- **Status:** [ ] pending

**Goal:** Users get an in-app notification when someone mentions them.

**Acceptance criteria:**
- [ ] Mentioning a user creates a notification
- [ ] Unread count appears in the nav bar
