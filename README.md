# Kanban Board — Firebase Realtime Database

A simple kanban board built with Next.js, Firebase Realtime Database, and Firebase Authentication, with full CRUD (Create, Read, Update, Delete). Made for a Cloud Computing course assignment on Backend as a Service (BaaS): the app has no backend of its own — the browser signs in and reads and writes data directly to Firebase.

## Features

- **Accounts** — register and log in with email and password (Firebase Authentication). A new account must verify its email address first: Firebase sends a verification link, and the board stays locked until the link is opened. Each account also has a record in the database at `/users/{uid}` that shows whether it is verified. All verified users share the same board.
- **Create** — add a task through a modal form (title, description, status, priority, start date, deadline). The account that created it is saved with the task.
- **Read** — tasks are grouped into three columns (To Do / In Progress / Done) and stay in sync in realtime across every open tab and device.
- **Update** — edit a task's details through the same form, or move it to another column with the status dropdown on its card.
- **Delete** — remove a task after confirming in a dialog.

The UI text is in Bahasa Indonesia.

## Development Phases

The app was built in four phases. Each has its own document with the goals, technical decisions, problems and fixes, and how it was tested:

1. [Kanban board with full CRUD](docs/phase-1-kanban-crud.md) — the board, Firebase Realtime Database, and create, read, update, and delete.
2. [Authentication](docs/phase-2-authentication.md) — registration and login, the task creator in `createdBy`, and database rules with emulator tests.
3. [Deployment to Google App Engine](docs/phase-3-app-engine-deployment.md) — hosting the app on App Engine, and the build problems solved along the way.
4. [Email verification](docs/phase-4-email-verification.md) — a verification email after registering, the `/verify-email` page, `/users/{uid}` records, and rules that require a verified email.

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
   - Only signed-in users **with a verified email** can read or write tasks. The login page alone doesn't protect the data — without these rules, anyone who knows the database URL could still read and change it.
   - Any verified user can edit or delete any task (the board is shared).
   - Every task has exactly the fields in the [data model](#data-model), with valid values: a non-blank title of at most 200 characters, a description of at most 2000 characters, a known `status` and `priority`, dates in `YYYY-MM-DD` format, and a deadline on or after the start date. Any other field is rejected. This applies to every write, including ones made through the REST API rather than the app.
   - A new task must have a `createdBy` that matches the account writing it, so nobody can create a task in someone else's name.
   - `createdBy` can never be changed or removed afterwards, not even by the task's creator.
   - Tasks created before sign-in was added (without `createdBy`) can still be edited and deleted.
   - Each user can read and write only their own record at `/users/{uid}`, with exactly `email` (their account's email) and `isVerified`. `isVerified` must match whether Firebase Authentication considers the email verified, so nobody can mark themselves as verified. The record cannot be deleted.

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

Open [http://localhost:3000](http://localhost:3000). You'll be sent to `/login`; create an account on `/register` first. After registering you land on `/verify-email`: open the link in the verification email Firebase sends you, and the board opens.

If something doesn't work:
- **Registering or logging in shows "Login dengan email & password belum diaktifkan di Firebase Console."** — the Email/Password sign-in method from step 3.2 isn't enabled.
- **Saving a task fails with `PERMISSION_DENIED`, or the board stays empty and the browser console shows a `permission_denied` error** — the database rules from step 3.4 weren't published.
- **The verification email doesn't arrive** — check the spam folder, then use **Kirim Ulang Email** on `/verify-email`. Firebase sends it from `noreply@<project-id>.firebaseapp.com`.
- **Sending the verification email shows "Domain aplikasi ini belum diizinkan di Firebase…"** — the domain the app runs on is missing from Firebase Console → Authentication → Settings → **Authorized domains**. `localhost` is there by default; a deployed domain has to be added.

## Scripts

| Command | Description |
|---|---|
| `yarn dev` | Start the development server |
| `yarn build` | Build for production |
| `yarn start` | Serve the production build (run `yarn build` first) |
| `yarn gcp-build` | Production build with webpack, run by App Engine during a deploy |
| `yarn lint` | Run ESLint |
| `yarn format` | Format every file with Prettier (run before committing) |
| `yarn format:check` | Check formatting without changing files |
| `yarn test:rules` | Test `database.rules.json` against the Firebase Emulator |

## Testing the database rules

`yarn test:rules` starts the Firebase Auth and Realtime Database emulators on your machine, runs [`scripts/test-rules.mjs`](scripts/test-rules.mjs) against them, and stops them again. It never touches your real Firebase project and needs no login. The script creates test accounts — verifying some of them through the emulator, like a user clicking the email link — and tries about 60 reads and writes — signed out, signed in with and without a verified email, with invalid fields, with a forged `createdBy` or `isVerified`, and so on — and checks that each one is allowed or denied as expected. The command fails if any check fails.

Requirements: **Java 21 or newer** (the Realtime Database emulator runs on Java). The Firebase CLI is downloaded automatically through `npx` on the first run.

## Pages

| Route | Who can open it | Content |
|---|---|---|
| `/` | Signed-in users with a verified email | The board |
| `/login` | Signed-out users | Login form |
| `/register` | Signed-out users | Registration form (email, password, password confirmation). A new account is signed in right away and gets a verification email |
| `/verify-email` | Signed-in users whose email isn't verified yet | Instructions, plus buttons to check again, resend the email (at most once a minute), and sign out. The page also checks on its own when it opens and when its tab becomes visible again |

Anyone on a page that isn't for them is sent to the one that is: signed-out visitors to `/login`, unverified users to `/verify-email`, and verified users to `/`.

The redirects run in the browser, because Firebase keeps the signed-in session in the browser rather than in a cookie the server could read. They only decide which page is shown; the data itself is protected by the database rules.

## Data Model

User accounts live in Firebase Authentication. Each account also has a record at `/users/{uid}`, where `uid` is the account's Firebase Authentication ID:

| Field | Type | Description |
|---|---|---|
| `email` | string | The account's email address |
| `isVerified` | boolean | Whether the email has been verified. `false` after registering, `true` once the link in the verification email has been opened |

The app creates the record when an account first signs in and updates it when the email gets verified.

Each task is stored at `/tasks/{taskId}`, where `taskId` is generated by Firebase:

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
.gcloudignore               # Files App Engine deploys leave out
docs/                       # One document per development phase
app.example.yaml            # App Engine config template (copy to app.yaml, which is ignored by Git)
database.rules.json         # Realtime Database rules (publish these to Firebase)
firebase.json               # Firebase CLI config: rules file and emulator ports
scripts/
└── test-rules.mjs          # Rules tests, run with `yarn test:rules`
src/
├── app/
│   ├── fonts/              # Inter font files, loaded with next/font/local
│   ├── layout.tsx          # Root layout: font, Font Awesome, and AuthProvider
│   ├── (auth)/             # Pages for signed-out users (the folder name isn't part of the URL)
│   │   ├── layout.tsx      # Sends everyone else away
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (verify)/           # Pages for signed-in users whose email isn't verified yet
│   │   ├── layout.tsx
│   │   └── verify-email/page.tsx
│   └── (board)/            # Pages for verified users
│       ├── layout.tsx
│       └── page.tsx        # The board
├── components/             # Generic UI, not tied to any feature
│   ├── Button/             # Shared button
│   ├── ConfirmDialog/      # Confirmation dialog (used for deleting a task)
│   ├── FieldError/         # Validation message under a form field
│   └── Modal/              # Base modal built on the native <dialog> element
├── features/               # One folder per feature: its components and its Firebase service
│   ├── auth/
│   │   ├── components/
│   │   │   ├── AuthCard/       # The centered card used by the login, register, and verify-email pages
│   │   │   ├── AuthForm/       # Login and register form
│   │   │   ├── AuthGuard/      # Redirects based on sign-in and verification state, used by the layouts above
│   │   │   ├── AuthProvider/   # Shares the signed-in user and verification state with every page (useAuth)
│   │   │   └── VerifyEmail/    # The /verify-email page
│   │   └── services/
│   │       ├── authService.ts  # Register, login, logout, sign-in state, and verification emails
│   │       └── usersService.ts # The account's record at /users/{uid}
│   └── board/
│       ├── components/
│       │   ├── Board/          # The board: columns, task cards, and the task modals
│       │   ├── ModalForm/      # Create/edit task form
│       │   └── TaskCard/       # A single task card
│       └── services/
│           └── tasksService.ts # All reads and writes to /tasks
├── lib/
│   └── firebase.ts         # Firebase initialization, shared by both services
└── styles/
    └── _form.scss          # Shared form field and error styles (SCSS mixins)
```

How the folders depend on each other:
- `app/` only defines routes; each page renders a component from `features/`.
- `features/` may use `components/`, `lib/`, and `styles/`. The `board` feature uses `auth` (to show the signed-in user and to sign out), never the other way around.
- `components/` knows nothing about tasks, accounts, or Firebase, so its components could be reused in another project as they are.
- Components never call Firebase directly — every access goes through a feature's service (`authService.ts`, `usersService.ts`, or `tasksService.ts`).

## Deployment (Google App Engine)

The app runs as a Next.js server on the [App Engine standard environment](https://cloud.google.com/appengine/docs/standard/nodejs/runtime) (Node.js 22 runtime). It can use the same Google Cloud project as Firebase.

### One-time setup

Requires the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) (`gcloud`), signed in with an account that owns the project.

1. Make sure billing is enabled for the project — App Engine builds the app with Cloud Build, which needs it.
2. Create the App Engine application. **The region cannot be changed afterwards**:
   ```bash
   gcloud app create --project <project-id> --region asia-southeast2
   ```
3. Enable the Cloud Build API:
   ```bash
   gcloud services enable cloudbuild.googleapis.com --project <project-id>
   ```
4. After the first deploy, add the app's domain (`<project-id>.<region-code>.r.appspot.com`) to Firebase Console → Authentication → Settings → **Authorized domains**. Without it, the verification email cannot link back to the app, and sending it fails.

### Deploying

1. Create `app.yaml` from the template and fill in every value under `build_env_variables`: your Font Awesome token, and the `NEXT_PUBLIC_FIREBASE_*` values from `.env.local`.
   ```bash
   cp app.example.yaml app.yaml
   ```
   `app.yaml` is ignored by Git because it contains the Font Awesome token — never commit it.
2. Deploy, then open the app:
   ```bash
   gcloud app deploy --project <project-id>
   gcloud app browse --project <project-id>
   ```
   The URL looks like `https://<project-id>.<region-code>.r.appspot.com`.

What happens during a deploy:
- `gcloud` uploads only the files needed to build and run the app; everything else is listed in `.gcloudignore`. `.env.local` is never uploaded, which is why the Firebase config goes into `app.yaml` instead.
- Cloud Build runs `yarn install` and then the `gcp-build` script with the `build_env_variables`, then removes the devDependencies. The `NEXT_PUBLIC_*` values are built into the JavaScript bundle at this point, so changing them requires a new deploy.
- `gcp-build` is required: for Yarn projects, App Engine does not run the `build` script on its own. Without it the deploy still succeeds, but every page returns 502/503 and the logs show `Could not find a production build in the '.next' directory`.
- `gcp-build` builds with webpack (`next build --webpack`) instead of Turbopack. On App Engine, `node_modules` is a symlink to a folder outside the project, and Turbopack fails on that with `Symlink [project]/node_modules is invalid, it points out of the filesystem root`.
- The app starts with `node node_modules/next/dist/bin/next start` rather than `yarn start`: Yarn reads `.npmrc` first, and that fails on the running app because the Font Awesome token only exists during the build.
- `max_instances: 1` keeps the app on a single F1 instance, which stays within the free daily instance hours for a small app.

If something goes wrong:
- **See the server logs:** `gcloud app logs tail --project <project-id>`.
- **Sending the verification email fails with "Domain aplikasi ini belum diizinkan di Firebase…" (`auth/unauthorized-continue-uri`):** the `appspot.com` domain is missing from Firebase Console → Authentication → Settings → Authorized domains (one-time setup step 4).
