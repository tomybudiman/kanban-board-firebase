# Phase 4 — Email Verification

| | |
|---|---|
| **Period** | October 2026 |
| **Status** | Implemented and tested locally against the Firebase emulators; **not deployed yet** (see [Rollout](#rollout)) |
| **Commits** | Not committed yet |
| **Course material** | Module 3 – Lecture Note 10, "Webmailer using Firebase" (Cloud Computing, IMT01306610) |
| **Previous phase** | [Phase 3 — Deployment to Google App Engine](phase-3-app-engine-deployment.md) |

## Goal

The lecture asks for **user registration with email verification** using Firebase Authentication and Realtime Database: after registering, the user receives a verification email from Firebase, and their record in the database changes from `is_verified: false` to `true` once they click the link. The feature is added to the existing app, pushed to GitHub, and deployed.

## Result

- Registering now also sends a **verification email** (in Bahasa Indonesia) from `noreply@<project-id>.firebaseapp.com`.
- A new page, **`/verify-email`**, tells the user to check their email and offers three buttons: **Saya Sudah Verifikasi** (check now), **Kirim Ulang Email** (resend, at most once a minute), and **Keluar** (sign out).
- **Unverified users are blocked**: they cannot open the board, and the database rules refuse their reads and writes to `/tasks`.
- Each account has a record at **`/users/{uid}`** with `email` and `isVerified`. It is `false` after registering and becomes `true` once the link is opened.
- After clicking the link, the user lands back on `/verify-email`, which notices the verification and opens the board. A tab left open on `/verify-email` also moves on by itself when the user switches back to it.
- Accounts created before this phase are treated the same way: they are sent to `/verify-email` and get a `/users/{uid}` record on their next sign-in.

## Decisions made with the user

| Question | Decision |
|---|---|
| Follow the lecture's PHP server code, or keep using the Firebase SDK in the browser? | Keep the browser SDK, like the rest of the app |
| Key of the user record: `md5(email)` as in the lecture, or the account's `uid`? | `uid` |
| What can an unverified user do? | Nothing until they verify: blocked from the board |
| Language of the verification email | Bahasa Indonesia |

## Compared with the lecture

The lecture uses PHP on a server with the Firebase Admin SDK (`kreait/firebase-php`). This app has no server code for Firebase, so the same flow is built with the browser SDK:

| Lecture (PHP) | This app | Why |
|---|---|---|
| Code in a `public` folder | Code in `src/` | In Next.js, everything in `public/` is served to anyone as a file |
| `firebase_config.php` with a service account key | `src/lib/firebase.ts` with the web config | No secret key is needed in the browser |
| `$auth->createUser()` | `createUserWithEmailAndPassword()` in `authService.signUp` | Already used since Phase 2 |
| `$auth->sendEmailVerificationLink($email, $settings)` | `sendEmailVerification(user, settings)` | Firebase sends the email in both cases. (The Admin SDK for Node.js can only *create* the link, not send it) |
| `continueUrl: …/verify.php?email=…`, `handleCodeInApp: false` | `url: <origin>/verify-email`, `handleCodeInApp: false` | The page checks the signed-in account, so the email doesn't need to be in the URL, browser history, or server logs |
| `users/` + `md5($email)` | `users/{uid}` | Database keys can't contain `.`, which is why the lecture hashes the email. `uid` has no dots, never changes, matches `createdBy.uid` in tasks, and lets the rules say "only the owner" with `auth.uid === $uid` — the rules have no md5 function |
| `{ email, is_verified }` | `{ email, isVerified }` | The project's camelCase naming convention |
| `verify.php`: `getUserByEmail()`, then update `is_verified`; "Email tidak ditemukan." without `?email=` | `/verify-email`: reload the signed-in user, then update `isVerified`; signed-out visitors are sent to `/login` | Same check, done in the browser for the current account |
| Messages: "Registrasi berhasil! Cek email untuk verifikasi." and "Email belum diverifikasi." | The same two messages on `/verify-email` | |
| Admin SDK writes skip the database rules | Browser writes are checked by the rules | The rules make sure `isVerified` can only be `true` when Firebase Authentication says so |

## Data model

A new record per account, next to the existing `/tasks`:

```
users/
└── <uid>
    ├── email: "carol@example.com"
    └── isVerified: false        → true after the link is opened
```

| Field | Type | Description |
|---|---|---|
| `email` | string | The account's email address |
| `isVerified` | boolean | Whether the email has been verified |

The app decides who may open the board from Firebase Authentication itself, not from this record; `/users` mirrors the account's status, as the lecture asks.

## How it works

```
/register ──► account created ──► Firebase sends the email ──► /verify-email
                                                                   │
        email link ──► Firebase's verification page ──► "Continue" ┘
                                                                   │
              /verify-email checks again ──► verified ──► board (/)
```

- **`authService.signUp`** creates the account and calls `sendEmailVerification` with `url: <origin>/verify-email`. Firebase signs the new user in right away, so `AuthGuard` moves the page to `/verify-email` while the email is being sent. The register form is gone by then, so `signUp` hands the sending over to that page (`takeSignUpVerificationEmail`), which shows **"Registrasi berhasil! Cek email untuk verifikasi."** — the lecture's message — or, if sending failed, the reason and a pointer to **Kirim Ulang Email**.
- **`AuthGuard`** now has three levels instead of two. Each route group has one, and anyone on a page meant for someone else is sent to the page for their state:

  | Route group | `access` | Pages | Everyone else goes to… |
  |---|---|---|---|
  | `(auth)` | `"guest"` | `/login`, `/register` | unverified → `/verify-email`, verified → `/` |
  | `(verify)` | `"unverified"` | `/verify-email` | signed out → `/login`, verified → `/` |
  | `(board)` | `"verified"` | `/` | signed out → `/login`, unverified → `/verify-email` |

- **`AuthProvider`** works out `isEmailVerified` on every sign-in, sign-out, and token refresh, and calls `usersService.syncUserProfile` to bring `/users/{uid}` up to date.
- **`authService.refreshVerificationStatus`** reloads the user from Firebase and, if the email is now verified, gets a new ID token. `subscribeAuth` uses `onIdTokenChanged`, so the new token reaches `AuthProvider` and the board opens.
- **`VerifyEmail`** asks the user to verify the email shown, without claiming an email was just sent (an older account may never have received one). It calls `refreshVerificationStatus` quietly when the page opens (which is what happens after the "Continue" button) and whenever its tab becomes visible again, and with a visible result when the user presses **Saya Sudah Verifikasi**.
- **`usersService.syncUserProfile`** reads `email` and `email_verified` from the ID token and writes `{ email, isVerified }` only when the record is missing or different. It also creates the record for accounts made before this phase.

## Database rules

[`database.rules.json`](../database.rules.json) changed in two places:

- **`/tasks`** now requires a verified email: `auth != null && auth.token.email_verified === true` for both reading and writing. Blocking unverified users is enforced on the data, not just by hiding the board.
- **`/users/{uid}`** is new:
  - only the owner can read or write it (`auth.uid === $uid`), and it cannot be deleted;
  - it must contain exactly `email` and `isVerified`;
  - `email` must equal the account's email (`auth.token.email`);
  - `isVerified` must be a boolean that **equals** `auth.token.email_verified`, so nobody can mark themselves as verified, and a verified account can't be set back to `false`.

## Technical decisions

- **The verification state comes from the ID token.** The database rules read the `email_verified` claim of the token, so the app uses the same source (`authService.hasVerifiedEmail`). When Firebase already knows the email is verified but the token is older, the app asks for a new token first. See problem 1 below.
- **A verified account always gets a new token.** A token made before the email was verified keeps `email_verified: false` until it is replaced, and the rules keep refusing it. `refreshVerificationStatus` and `hasVerifiedEmail` both request a new one. `hasVerifiedEmail` does so at most once per account per page load, so a token that somehow stays out of date cannot cause an endless loop of renewals.
- **Only the newest auth change updates the state.** Checking the token takes a moment, and Firebase can report another change meanwhile (for example a sign-out). `AuthProvider` numbers the changes and ignores results from older ones.
- **Firebase's own verification page.** With `handleCodeInApp: false`, as in the lecture, Firebase verifies the email on its own page and then offers a "Continue" button to `/verify-email`. Handling the link inside the app would need a custom action URL in the email template.
- **Resend cooldown.** Firebase limits how often verification emails can be sent; the button waits 60 seconds after each email, and an `auth/too-many-requests` error is still shown in Indonesian if the limit is hit anyway.
- **A shared `AuthCard`.** The login, register, and verify-email pages use the same centered card. It was taken out of `AuthForm` into its own component, and the compiled CSS was compared before and after to confirm nothing changed visually.

## Problems and fixes

### 1. The board opened, but its data was refused

The first browser test opened the verification link in a new tab. The board appeared, but the console showed `permission_denied at /tasks`, and `isVerified` stayed `false`.

**Cause:** when a page loads, Firebase reloads the signed-in user from the server, so `user.emailVerified` was already `true`. The saved ID token, however, was from before the verification and still said `email_verified: false`. The app used `user.emailVerified` to open the board, while the rules use the token.

**Fix:** `AuthProvider` takes the state from the token through `authService.hasVerifiedEmail`, which requests a new token whenever the two disagree. After the fix, the same test passed with no console errors.

### 2. Found in the review before committing

A second read-through of the finished code found three more issues that the tests had not covered:

| Issue | Fix |
|---|---|
| If the first verification email failed to send, the error was lost: the register form had already closed, and `/verify-email` still said the link "had been sent" | `signUp` hands the sending result to `/verify-email`, which shows either the lecture's success message or the error |
| `/verify-email` told every unverified user that a link "had been sent", including older accounts that never received one | The instructions now only ask the user to verify the email shown, with a hint to resend |
| A token that stayed out of date after renewal would make `hasVerifiedEmail` renew it again on every change, without end | Renew at most once per account per page load |

## How it was tested

- **Database rules:** `yarn test:rules` runs 60 checks (40 from Phase 2, re-run with verified accounts, plus 20 new ones). Test accounts are verified the way a real user would: the emulator keeps sent emails instead of sending them, so the script takes the code from the link, applies it, and signs in again for a new token. New checks include: unverified accounts refused on `/tasks`; creating your own record with `false` allowed but `true` refused before verifying; `true` allowed and `false` refused after verifying; an old token from before verifying still refused; another user's record, extra fields, a different email, and deleting the record all refused. All pass.
- **The app in a browser:** an end-to-end test in headless Chrome against the Firebase emulators (not kept in the repo) ran 30 checks: registering leads to `/verify-email`, not the board, with the message "Registrasi berhasil! Cek email untuk verifikasi."; a failed first email shows a clear error; the email request uses Bahasa Indonesia and links back to `/verify-email`; `/users/{uid}` starts as `false`; unverified users are sent back from `/` and `/login`; "check" before clicking shows the right message; resending works and starts the countdown; opening the link (in a new tab) leads to the board and sets `isVerified` to `true`; the other tab follows when shown again; a verified user can create, edit, move, and delete tasks under the new rules; signing in again goes straight to the board; an older unverified account is sent to `/verify-email`, sees no registration message, and gets its record; and **Keluar** signs out. All passed with no console errors.
- Lint, type checking, Prettier, and a production build.

## Rollout

These steps change the live app and the real Firebase project, so they are done separately and in this order:

1. **Add the App Engine domain** (`alpha-bravo-00001.et.r.appspot.com`) to Firebase Console → Authentication → Settings → Authorized domains. Without it, sending the verification email from the live app fails with `auth/unauthorized-continue-uri`.
2. **Deploy the app** (`gcloud app deploy app.yaml --project alpha-bravo-00001`).
3. **Publish the new database rules** — only after step 2. With the new rules but the old app, every unverified account would be locked out with no page to verify from.
4. **Test on the live app** with a real email address, since only the real service actually sends emails.

Existing accounts on the live app are all unverified, so after step 3 each of them has to verify (with **Kirim Ulang Email**) before using the board again. Existing tasks are not affected.

## Known limitations

- The verification email uses Firebase's default template; its sender name and wording can only be changed in the Firebase Console.
- `/users/{uid}` is written by the browser, so it is updated when the user next opens the app, not at the exact moment the link is clicked.
- No password reset yet.
- The end-to-end browser test is not part of the repo; only the rules tests can be re-run with one command.

## Commits

To be added when the phase is committed.
