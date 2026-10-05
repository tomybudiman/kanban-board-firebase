# Phase 3 — Deployment to Google App Engine

| | |
|---|---|
| **Period** | 30 September – 1 October 2026 |
| **Commits** | `2c648e2` (see [Commits](#commits)) |
| **Live app** | https://alpha-bravo-00001.et.r.appspot.com |
| **Previous phase** | [Phase 2 — Authentication](phase-2-authentication.md) |

> For the step-by-step deploy instructions, see [Deployment (Google App Engine)](../README.md#deployment-google-app-engine) in the README. This document explains how the deployment was set up, why, and which problems came up along the way.

## Goal

Host the app on **Google App Engine**, Google Cloud's Platform as a Service (PaaS), so it is publicly available while Firebase keeps providing the database and authentication.

## Result

- The app runs on the **App Engine standard environment** with the Node.js 22 runtime, as a Next.js server (`next start`).
- It uses the same Google Cloud project as Firebase (`alpha-bravo-00001`), in region **`asia-southeast2` (Jakarta)**.
- `/`, `/login`, and `/register` return HTTP 200, and plain HTTP is redirected to HTTPS.
- Login with email and password works from the `appspot.com` domain without adding it to Firebase's authorized domains.
- One version is serving all traffic (`20261001t131121`); the first, broken version was deleted.

## Choosing how to deploy

Two ways were tested locally before deploying:

| | A. Next.js server (chosen) | B. Static site |
|---|---|---|
| What runs on App Engine | `next start` on the Node.js runtime | Only HTML, JS, and CSS files, served by App Engine's static file handlers |
| Where the app is built | On Google Cloud (Cloud Build) | Locally (`output: "export"`) |
| Font Awesome token | Must be given to Cloud Build | Stays on the developer's machine |
| Code changes | None | `output: "export"` in `next.config.ts` |

Both worked locally: option B passed the same 31 browser checks as Phase 2 when served as static files, and option A started without devDependencies. **Option A was chosen** because the course is about running an app on a PaaS: the app is built and run by App Engine itself, and the code stays a normal Next.js app.

## Region

App Engine's region is chosen once per project and can never be changed. The App Engine application in this project had already been created in `asia-southeast2` (Jakarta), so that is where the app runs. The only other Southeast Asian region, `asia-southeast1` (Singapore), would have needed a different project.

## Configuration

### `app.yaml` and `app.example.yaml`

`app.yaml` tells App Engine how to build and run the app. It contains the Font Awesome token, so it is **ignored by Git**; the committed [`app.example.yaml`](../app.example.yaml) is the same file without the values.

| Setting | Value | Why |
|---|---|---|
| `runtime` | `nodejs22` | Same major version as local development; Next.js 16 needs Node.js 20.9 or newer |
| `instance_class` | `F1` | The smallest instance class, which has a free daily quota |
| `automatic_scaling.max_instances` | `1` | Keeps the app on one instance so it cannot scale up and add cost |
| `entrypoint` | `node node_modules/next/dist/bin/next start` | Starts Next.js directly. `yarn start` would read `.npmrc` first and fail, because the Font Awesome token only exists during the build |
| `build_env_variables` | Font Awesome token and every `NEXT_PUBLIC_FIREBASE_*` value | Only available while the app is built. `.env.local` is never uploaded, and Next.js builds the `NEXT_PUBLIC_*` values into the JavaScript bundle, so changing them needs a new deploy |
| `handlers` | `/.*` with `secure: always` | Every request goes to Next.js; HTTP is redirected to HTTPS |

### `.gcloudignore`

[`.gcloudignore`](../.gcloudignore) lists the files `gcloud app deploy` leaves out. Only what is needed to build and run the app is uploaded: `app.yaml`, `.npmrc`, `package.json`, `yarn.lock`, `next.config.ts`, `tsconfig.json`, `src/`, and `public/`. The list can be checked with `gcloud meta list-files-for-upload`.

### The `gcp-build` script

`package.json` has a script just for App Engine:

```json
"gcp-build": "next build --webpack"
```

It is required — see problems 2 and 3 below. The normal `build` script stays unchanged, so local builds still use Turbopack.

## How a deploy works

1. `gcloud app deploy` uploads the files above to a Cloud Storage bucket (`staging.alpha-bravo-00001.appspot.com`).
2. Cloud Build installs the dependencies with Yarn, including devDependencies, using the Font Awesome token from `build_env_variables`.
3. Cloud Build runs `gcp-build`, which builds the app with webpack and the `NEXT_PUBLIC_*` values.
4. The devDependencies are removed, and the result is packaged as a new App Engine version.
5. The new version receives all traffic and starts with the `entrypoint` command, listening on the port App Engine provides in `PORT`.

## One-time setup on Google Cloud

These changes were made in the Google Cloud project, not in the code:

| Change | Why |
|---|---|
| Billing confirmed as enabled | App Engine builds apps with Cloud Build, which requires billing |
| **Cloud Build API** enabled (Artifact Registry was enabled with it) | Needed to build the app |
| Role **Storage Admin** (`roles/storage.admin`) granted to the Compute Engine default service account (`24404756464-compute@developer.gserviceaccount.com`) | See problem 1 below |

## Problems and fixes

### 1. Cloud Build could not read the uploaded files

The first deploy failed before building anything:

```
Failed to create cloud build: … invalid bucket "staging.alpha-bravo-00001.appspot.com";
service account 24404756464-compute@developer.gserviceaccount.com does not have access to the bucket
```

**Cause:** since mid-2024, Cloud Build in new projects runs as the Compute Engine default service account. That account already had the Editor role, but it was not enough to use App Engine's staging bucket.

**Fix:** grant it the Storage Admin role, as recommended by App Engine's deployment troubleshooting guide:

```bash
gcloud projects add-iam-policy-binding alpha-bravo-00001 \
  --member="serviceAccount:24404756464-compute@developer.gserviceaccount.com" \
  --role="roles/storage.admin"
```

### 2. Deployed, but every page returned 502 or 503

The second deploy reported success, but every page failed, and the server logs showed:

```
Error: Could not find a production build in the '.next' directory.
```

**Cause:** for projects that use Yarn, App Engine's build only runs a script named `gcp-build` and never runs `build`. The app was installed but never built, so `next start` had nothing to serve.

**Fix:** add the `gcp-build` script to `package.json`.

### 3. Turbopack could not build on Cloud Build

With `gcp-build` running `next build`, the build failed with:

```
Symlink [project]/node_modules is invalid, it points out of the filesystem root
```

**Cause:** Cloud Build places `node_modules` outside the project folder and links to it. Turbopack, the default bundler in Next.js 16, refuses links that point outside the project (an open Next.js issue, [vercel/next.js#98111](https://github.com/vercel/next.js/issues/98111)).

**Fix:** build with webpack on App Engine (`next build --webpack`). React Compiler and the Firebase config still work the same with webpack.

## How it was tested

- **Before deploying:** App Engine's build was reproduced locally in a clean folder that contained only the uploaded files: install with the build variables, build, remove devDependencies, then start with the `entrypoint` command and no token or Firebase config in the environment. The pages returned 200, an unknown page returned 404, and the real Firebase config was in the JavaScript bundle. After problem 3, the same check was repeated with `node_modules` as a link outside the project folder.
- **After deploying:** `/`, `/login`, and `/register` on the live URL returned 200, HTTP redirected to HTTPS, and the server logs showed no errors.

## Operations

| Task | Command |
|---|---|
| Deploy a new version | `gcloud app deploy app.yaml --project alpha-bravo-00001` |
| Open the app | `gcloud app browse --project alpha-bravo-00001` |
| Follow the server logs | `gcloud app logs tail --project alpha-bravo-00001` |
| List versions | `gcloud app versions list --project alpha-bravo-00001` |
| Delete an old version | `gcloud app versions delete <version-id> --project alpha-bravo-00001` |
| Stop a version without deleting it | `gcloud app versions stop <version-id> --project alpha-bravo-00001` |

Every deploy creates a new version and keeps the old ones, so delete versions that are no longer needed.

## Known limitations

- The Font Awesome token is stored in the App Engine version's build settings, where anyone with access to the Google Cloud project can see it.
- The Compute Engine default service account now has Storage Admin on the whole project, including Firebase's storage buckets.
- With one F1 instance and no minimum instances, the first request after a quiet period is slower while the instance starts.
- The app is built with webpack on App Engine but with Turbopack locally, so a problem specific to one bundler could appear in only one place.

## Commits

| Commit | Date | Summary |
|---|---|---|
| `2c648e2` | 2026-10-01 | App Engine config (`app.example.yaml`, `.gcloudignore`, `gcp-build` script) and deploy instructions in the README |
