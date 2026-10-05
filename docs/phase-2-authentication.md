# Phase 2 — Authentication

| | |
|---|---|
| **Period** | 29–30 September 2026 |
| **Commits** | `9c85444`, `bc1e62b`, and the follow-up refactor `d76bcd7` (see [Commits](#commits)) |
| **Previous phase** | [Phase 1 — Kanban Board with Full CRUD](phase-1-kanban-crud.md) |
| **Next phase** | [Phase 3 — Deployment to Google App Engine](phase-3-app-engine-deployment.md) |

> This document describes the app **as it was at the end of this phase**. For the current structure, see the [README](../README.md#project-structure).

## Goal

Add registration and login with **Firebase Authentication (email and password)**, so that only signed-in users can use the board, and record which account created each task. The data itself had to be protected too, not just hidden behind a login page.

## Result

- Three pages:

  | Route | Who can open it | Content |
  |---|---|---|
  | `/` | Signed-in users | The board. Signed-out visitors are sent to `/login` |
  | `/login` | Signed-out users | Login form. Signed-in users are sent to `/` |
  | `/register` | Signed-out users | Registration form. A new account is signed in right away |

- The board's header shows the signed-in user's email and a **Keluar** (sign out) button.
- The board is **shared**: every signed-in user sees, edits, and deletes the same tasks.
- Every new task stores its creator in a `createdBy` field: `{ uid, email }`.
- Database rules allow access only to signed-in users, check every field of every task, and make `createdBy` impossible to forge or change.
- Each page has its own browser tab title ("Masuk · Kanban Board", "Daftar · Kanban Board", "Kanban Board").

## Decisions made with the user

| Question | Decision |
|---|---|
| A shared board or one board per user? | Shared, with the creator recorded on each task |
| Registration in the app, or accounts created only in the Firebase Console? | Registration in the app |
| Login on the same page or on its own route? | Separate `/login` and `/register` routes |
| Password reset or email verification? | Not for now |

## Data model change

One field was added to each task:

| Field | Type | Description |
|---|---|---|
| `createdBy` | `{ uid: string, email: string }` | The account that created the task. Set automatically by `createTask` from the signed-in user and never changed afterwards. Tasks created before this phase don't have it, so the field is optional |

User accounts are stored in Firebase Authentication, not in the database.

## Code structure at the end of the phase

```
src/
├── app/
│   ├── layout.tsx              # Adds <AuthProvider> around every page
│   ├── (auth)/                 # Route group: pages for signed-out users
│   │   ├── layout.tsx          # <AuthGuard access="guest">
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   └── (board)/                # Route group: pages for signed-in users
│       ├── layout.tsx          # <AuthGuard access="user">
│       └── page.tsx            # Renders <Board />
├── components/
│   ├── AuthForm/               # Login and register form
│   ├── AuthGuard/              # Shows a page only to the right users
│   ├── AuthProvider/           # Shares the signed-in user (useAuth)
│   ├── Board/                  # The board, moved here from app/page.tsx
│   ├── FieldError/             # Validation message under a form field
│   └── … (Button, ConfirmDialog, Modal, ModalForm, TaskCard)
├── services/
│   ├── authService.ts          # signIn, signUp, signOut, subscribeAuth
│   ├── firebase.ts             # Now also exports getFirebaseAuth()
│   └── tasksService.ts         # createTask adds createdBy
└── styles/
    └── _form.scss              # Shared form styles (SCSS mixins)
database.rules.json             # Database rules, kept in the repo
firebase.json                   # Firebase CLI and emulator config
scripts/test-rules.mjs          # Rules tests (yarn test:rules)
```

Right after this phase, commit `d76bcd7` reorganized the code by feature: `src/features/auth/` and `src/features/board/` (each with its components and service), `src/lib/firebase.ts`, and only the generic UI (`Button`, `Modal`, `ConfirmDialog`, `FieldError`) left in `src/components/`. The app's behavior did not change.

## How it works

- **`AuthProvider`** listens to Firebase Auth once for the whole app (`onAuthStateChanged`) and shares `{ user, isLoading }` through the `useAuth()` hook. `isLoading` stays true until Firebase has restored any session saved in the browser.
- **`AuthGuard`** wraps each route group. While the session is being checked, or while a redirect is happening, it shows a "Memuat..." screen so the wrong page never flashes. It redirects with `router.replace`, so the Back button doesn't bounce between pages.
- **`AuthForm`** is one form for both pages (`mode="login"` or `mode="register"`). Registration adds a password confirmation and a 6-character minimum (Firebase's own minimum). Firebase error codes are turned into Indonesian messages by `getAuthErrorMessage`. The form never redirects by itself: once Firebase reports the signed-in user, `AuthGuard` moves the page.
- **Signing out** first removes the `/tasks` listener and then calls `signOut()`. In the other order, Firebase would cancel the listener with a `permission_denied` error once the rules no longer saw a signed-in user.
- **`createTask`** reads the current user from Firebase Auth and adds `createdBy`. Updates can only change the six task fields, so `createdBy` is never sent again.

## Database rules

The rules live in [`database.rules.json`](../database.rules.json) and are the only copy; the README links to the file instead of repeating it. They enforce:

- Only signed-in users can read or write tasks.
- Any signed-in user can edit or delete any task (the board is shared).
- Every task has exactly the six task fields plus `createdBy`, with valid values: a non-blank title of at most 200 characters, a description of at most 2000 characters, a known `status` and `priority`, dates in `YYYY-MM-DD` format, and a deadline on or after the start date. Any other field is rejected (`$other`).
- A new task's `createdBy` must match the account writing it, so nobody can create a task in someone else's name.
- `createdBy` can never be changed or removed afterwards, not even by the creator.
- Tasks created before this phase (without `createdBy`) can still be edited and deleted.

These checks apply to every write, including ones made directly through the REST API rather than the app. The form limits the title and description with the same lengths (`maxTitleLength` and `maxDescriptionLength` in `tasksService.ts`), so the app never sends text the rules would reject.

## Technical decisions

- **Redirects run in the browser, not in `proxy.ts`.** Firebase keeps the signed-in session in the browser's IndexedDB rather than in a cookie, so the server cannot tell who is signed in. Doing it on the server would need session cookies and the Firebase Admin SDK. The real protection is the database rules; the guard only decides which page is shown.
- **Route groups.** `(auth)` and `(board)` don't appear in the URL. Each group's layout applies its access rule once, instead of every page repeating it.
- **Pages stay Server Components.** `page.tsx` and `layout.tsx` have no `"use client"`, so they can export `metadata` (the tab title). The interactive parts live in client components (`Board`, `AuthForm`).
- **The same message for a wrong email and a wrong password.** "Email atau password salah." avoids telling anyone which emails have an account.
- **Rules are tested, not just written.** The rules are part of the repo and run against the Firebase Emulator with `yarn test:rules`.

## Best-practice review

After the feature worked, the code was reviewed against best practices and three issues were fixed in the same phase:

1. **The rules didn't check task fields.** Only `createdBy` was validated, so a signed-in user could write an unknown `status` through the API, and that task would disappear from every column. Every field is now validated, and unknown fields are rejected.
2. **The rules only existed in the README.** They are now in `database.rules.json`, with `firebase.json` and a test script, so they can be versioned, deployed with the Firebase CLI, and tested.
3. **Form styles were duplicated.** The field styles and the field error message were copied between the task form and the login form. They now come from `src/styles/_form.scss` (SCSS mixins) and the shared `FieldError` component. The compiled CSS was compared before and after to confirm nothing changed visually.

## Problems and fixes

| Problem | Cause | Fix |
|---|---|---|
| A hydration warning in Chrome DevTools about `<body>` attributes | The Grammarly extension adds attributes to `<body>` before React starts | `suppressHydrationWarning` on `<body>` only, which still checks everything inside it |
| The rules emulator refused to load the rules | Realtime Database rules don't support `\S` in regular expressions | Use a character class: `[^ \t\n]` |

## How it was tested

- **Database rules:** `yarn test:rules` runs 40 checks against the Firebase Emulator — signed out, signed in, invalid fields, a forged or changed `createdBy`, old tasks without `createdBy`, and so on. All pass.
- **The app in a browser:** an end-to-end test in headless Chrome against the Firebase emulators (not kept in the repo) ran 31 checks: redirects in every direction, form validation, Indonesian error messages, `createdBy` saved and kept after edits, the session surviving a reload, sign-out without console errors, and a second user seeing and deleting the first user's task. All passed, again after the stricter rules were added.
- Lint, type checking, Prettier, and a production build.

## Known limitations

- Every signed-in user can read every task creator's email, because the board is shared.
- Anyone can register, and every account can edit or delete any task.
- The password minimum is Firebase's default of 6 characters.
- No password reset or email verification.
- `createdBy` is stored but not shown on the cards.

## Commits

| Commit | Date | Summary |
|---|---|---|
| `9c85444` | 2026-09-29 | Format `eslint.config.mjs` and `next.config.ts` with Prettier |
| `bc1e62b` | 2026-09-29 | Authentication, `createdBy`, database rules and tests, shared form styles, hydration fix |
| `d76bcd7` | 2026-09-30 | Reorganize the code into `src/features/` (follow-up refactor) |
