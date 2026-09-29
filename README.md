# Kanban Board — Firebase Realtime Database

A simple kanban board built with Next.js, Firebase Realtime Database, and Firebase Authentication, with full CRUD (Create, Read, Update, Delete). Made for a Cloud Computing course assignment on Backend as a Service (BaaS): the app has no backend of its own — the browser signs in and reads and writes data directly to Firebase.

## Features

- **Accounts** — register and log in with email and password (Firebase Authentication). The board is only available to signed-in users, and all of them share the same board.
- **Create** — add a task through a modal form (title, description, status, priority, start date, deadline). The account that created it is saved with the task.
- **Read** — tasks are grouped into three columns (To Do / In Progress / Done) and stay in sync in realtime across every open tab and device.
- **Update** — edit a task's details through the same form, or move it to another column with the status dropdown on its card.
- **Delete** — remove a task after confirming in a dialog.

The UI text is in Bahasa Indonesia.

## Tech Stack

- [Next.js](https://nextjs.org) 16 (App Router) with React 19 and TypeScript
- [Firebase JS SDK](https://firebase.google.com/docs/web/setup) — Realtime Database and Authentication
- [React Hook Form](https://react-hook-form.com) for the task, login, and register forms
- SCSS Modules for styling (no CSS framework)
- [Font Awesome Pro](https://fontawesome.com) for icons
- [Yarn](https://classic.yarnpkg.com) 1.x as the package manager

## Prerequisites

- **Node.js 20.9 or newer** (required by Next.js 16)
- **Yarn 1.22.22** — the version is pinned in `package.json`, so running `corepack enable` once is enough to get it. Don't use `npm install`: it creates a `package-lock.json` that conflicts with `yarn.lock`.
- **A Font Awesome Pro package token** — the icons come from Font Awesome's private registry, so installing requires a Pro license. You can find the token in your Font Awesome account settings.
- **A Firebase project** (the free Spark plan is enough)

## Getting Started

### 1. Set the Font Awesome token

`.npmrc` reads the token from the `FONTAWESOME_PACKAGE_TOKEN` environment variable. Without it, **every** `yarn` command fails — not only the install — with:

```
error Error: Failed to replace env in config: ${FONTAWESOME_PACKAGE_TOKEN}
```

Export it in your shell (add it to `~/.zshrc` or `~/.bashrc` to keep it):

```bash
export FONTAWESOME_PACKAGE_TOKEN=your-token-here
```

Putting it in `.env.local` does **not** work: Yarn reads `.npmrc` before Next.js loads any env file.

### 2. Install dependencies

```bash
yarn
```

### 3. Set up Firebase

1. In the [Firebase Console](https://console.firebase.google.com), create a project.
2. Go to **Build → Authentication → Get started**, open the **Sign-in method** tab, and enable **Email/Password**.
3. Go to **Build → Realtime Database → Create Database** and pick a location.
4. Publish the database rules from [`database.rules.json`](database.rules.json), in either of two ways:
   - **Console:** open the **Rules** tab of the database, replace its contents with the contents of `database.rules.json`, and click **Publish**.
   - **Firebase CLI:** from the project folder, run
     ```bash
     npx firebase-tools@15 deploy --only database --project <your-project-id>
     ```
     (the first time, run `npx firebase-tools@15 login` to sign in to your Google account).

   `database.rules.json` is the only source of the rules — after changing it, publish it again and run `yarn test:rules` (see [Testing the database rules](#testing-the-database-rules)). What the rules enforce:
   - Only signed-in users can read or write tasks. The login page alone doesn't protect the data — without these rules, anyone who knows the database URL could still read and change it.
   - Any signed-in user can edit or delete any task (the board is shared).
   - Every task has exactly the fields in the [data model](#data-model), with valid values: a non-blank title of at most 200 characters, a description of at most 2000 characters, a known `status` and `priority`, dates in `YYYY-MM-DD` format, and a deadline on or after the start date. Any other field is rejected. This applies to every write, including ones made through the REST API rather than the app.
   - A new task must have a `createdBy` that matches the account writing it, so nobody can create a task in someone else's name.
   - `createdBy` can never be changed or removed afterwards, not even by the task's creator.
   - Tasks created before sign-in was added (without `createdBy`) can still be edited and deleted.

   Avoid "test mode" rules: they expire after 30 days, after which the board silently stops loading.
5. Go to **Project settings → General → Your apps**, add a **Web app** (`</>`), and keep the `firebaseConfig` values it shows you for the next step.

### 4. Configure environment variables

Copy the example file:

```bash
cp .env.example .env.local
```

Then fill in each `NEXT_PUBLIC_FIREBASE_*` variable in `.env.local` from the `firebaseConfig` values of step 3. Authentication uses the same config, so no extra variables are needed. `.env.local` is ignored by Git — never commit it.

Make sure `NEXT_PUBLIC_FIREBASE_DATABASE_URL` is filled in. If you registered the web app before creating the database, `databaseURL` is missing from the config snippet; copy it from the top of the **Data** tab in Realtime Database instead. It looks like `https://<project-id>-default-rtdb.firebaseio.com`, or `https://<project-id>-default-rtdb.<region>.firebasedatabase.app` for locations outside the US.

### 5. Run the development server

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be sent to `/login`; create an account on `/register` first.

If something doesn't work:
- **Registering or logging in shows "Login dengan email & password belum diaktifkan di Firebase Console."** — the Email/Password sign-in method from step 3.2 isn't enabled.
- **Saving a task fails with `PERMISSION_DENIED`, or the board stays empty and the browser console shows a `permission_denied` error** — the database rules from step 3.4 weren't published.

## Scripts

| Command | Description |
|---|---|
| `yarn dev` | Start the development server |
| `yarn build` | Build for production |
| `yarn start` | Serve the production build (run `yarn build` first) |
| `yarn lint` | Run ESLint |
| `yarn format` | Format every file with Prettier (run before committing) |
| `yarn format:check` | Check formatting without changing files |
| `yarn test:rules` | Test `database.rules.json` against the Firebase Emulator |

## Testing the database rules

`yarn test:rules` starts the Firebase Auth and Realtime Database emulators on your machine, runs [`scripts/test-rules.mjs`](scripts/test-rules.mjs) against them, and stops them again. It never touches your real Firebase project and needs no login. The script creates test accounts and tries about 40 reads and writes — signed out, signed in, with invalid fields, with a forged `createdBy`, and so on — and checks that each one is allowed or denied as expected. The command fails if any check fails.

Requirements: **Java 21 or newer** (the Realtime Database emulator runs on Java). The Firebase CLI is downloaded automatically through `npx` on the first run.

## Pages

| Route | Who can open it | Content |
|---|---|---|
| `/` | Signed-in users | The board. Signed-out visitors are sent to `/login` |
| `/login` | Signed-out users | Login form. Signed-in users are sent to `/` |
| `/register` | Signed-out users | Registration form (email, password, password confirmation). A new account is signed in right away |

The redirects run in the browser, because Firebase keeps the signed-in session in the browser rather than in a cookie the server could read. They only decide which page is shown; the data itself is protected by the database rules.

## Data Model

User accounts live in Firebase Authentication. Each task is stored at `/tasks/{taskId}`, where `taskId` is generated by Firebase:

| Field | Type | Description |
|---|---|---|
| `title` | string | Task title (required, at most 200 characters) |
| `description` | string | Short description (optional, at most 2000 characters) |
| `status` | `"todo"` \| `"in_progress"` \| `"done"` | The column the task appears in |
| `priority` | `"low"` \| `"medium"` \| `"high"` | Shown as a colored badge on the card |
| `startDate` | string (`YYYY-MM-DD`) | Start date (required) |
| `deadline` | string (`YYYY-MM-DD`) | Due date (required, on or after `startDate`) |
| `createdBy` | `{ uid: string, email: string }` | The account that created the task. Set automatically and never changed afterwards; missing on tasks created before sign-in was added |

## Project Structure

```
database.rules.json         # Realtime Database rules (publish these to Firebase)
firebase.json               # Firebase CLI config: rules file and emulator ports
scripts/
└── test-rules.mjs          # Rules tests, run with `yarn test:rules`
src/
├── app/
│   ├── fonts/              # Inter font files, loaded with next/font/local
│   ├── layout.tsx          # Root layout: font, Font Awesome, and AuthProvider
│   ├── (auth)/             # Pages for signed-out users (the folder name isn't part of the URL)
│   │   ├── layout.tsx      # Sends signed-in users to /
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   └── (board)/            # Pages for signed-in users
│       ├── layout.tsx      # Sends signed-out users to /login
│       └── page.tsx        # The board
├── components/
│   ├── AuthForm/           # Login and register form
│   ├── AuthGuard/          # Redirects based on sign-in state, used by the two layouts above
│   ├── AuthProvider/       # Shares the signed-in user with every page (useAuth)
│   ├── Board/              # The board: columns, task cards, and the task modals
│   ├── Button/             # Shared button
│   ├── ConfirmDialog/      # Confirmation dialog (used for deleting a task)
│   ├── FieldError/         # Validation message under a form field
│   ├── Modal/              # Base modal built on the native <dialog> element
│   ├── ModalForm/          # Create/edit task form
│   └── TaskCard/           # A single task card
├── styles/
│   └── _form.scss          # Shared form field and error styles (SCSS mixins)
└── services/
    ├── firebase.ts         # Firebase initialization
    ├── authService.ts      # Register, login, logout, and sign-in state
    └── tasksService.ts     # All reads and writes to /tasks
```

Components never call Firebase directly — every access goes through `src/services/authService.ts` or `src/services/tasksService.ts`.

## Deployment

The app can be deployed to [Vercel](https://vercel.com). In the Vercel project settings, add these environment variables:

- every `NEXT_PUBLIC_FIREBASE_*` variable from `.env.local`
- `FONTAWESOME_PACKAGE_TOKEN` — Vercel runs `yarn install` during the build, so the install fails without it
