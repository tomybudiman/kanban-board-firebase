# CLAUDE.md

## Tentang Proyek
Kanban board sederhana untuk tugas mata kuliah Cloud Computing — implementasi Backend as a Service (BaaS) menggunakan Firebase Realtime Database dengan fungsi CRUD penuh (Create, Read, Update, Delete), plus Firebase Authentication (email & password) untuk registrasi dan login dengan verifikasi email.

## Repository
- **Nama:** `kanban-board-firebase` (GitHub: `tomybudiman/kanban-board-firebase`)
- **Deskripsi:** Aplikasi kanban board sederhana berbasis React dan Firebase Realtime Database dengan fungsi CRUD lengkap — dibuat untuk tugas mata kuliah Cloud Computing (Backend as a Service).

## Stack Teknis
- **Next.js 16** (App Router) + React 19 + TypeScript. React Compiler aktif (`reactCompiler: true` di `next.config.ts`), jadi fungsi & objek di komponen sudah otomatis di-memo — tidak perlu `useCallback` / `useMemo` manual
- **Yarn** (classic 1.x) sebagai package manager — jangan pakai `npm install` karena akan membuat `package-lock.json` yang bentrok dengan `yarn.lock`
- **React Hook Form** untuk form (tanpa library validasi tambahan — aturan validasi ditulis lewat opsi `register`)
- **Font Awesome Pro** untuk ikon (`@fortawesome/pro-solid-svg-icons` + `@fortawesome/react-fontawesome`), di-setup di `layout.tsx` (`config.autoAddCss = false`). Paket Pro diambil dari registry privat lewat `.npmrc`, yang tokennya dibaca dari env `FONTAWESOME_PACKAGE_TOKEN` — tanpa env ini **semua** perintah `yarn` gagal ("Failed to replace env in config"). Token harus di-export di shell; `.env.local` tidak berpengaruh karena Yarn membaca `.npmrc` sebelum Next.js memuat file env
- **SCSS Modules** untuk styling per komponen (contoh: `TaskCard.module.scss`) — tanpa framework CSS/UI eksternal seperti Bootstrap
- **Firebase JS SDK** (Realtime Database + Authentication) — seluruh akses Firebase diisolasi di service milik tiap fitur (`src/features/<fitur>/services/`) dan `src/lib/firebase.ts`; komponen React tidak memanggil Firebase API secara langsung, dan tidak meng-import apa pun dari `firebase/*`

## Menjalankan Project
Project sudah diinisialisasi. Langkah setup lengkap untuk orang lain (Firebase project, sign-in method Email/Password, rules database, env) ada di `README.md`.
- Kredensial Firebase disimpan di `.env.local` (salin dari `.env.example`, jangan di-commit) dan diinisialisasi di `src/lib/firebase.ts`. Semua variabel env Firebase wajib berawalan `NEXT_PUBLIC_`
- Perintah: `yarn dev`, `yarn build`, `yarn lint`, `yarn format`, `yarn format:check`, `yarn test:rules`
- **Rules Realtime Database** ada di `database.rules.json` — satu-satunya sumber rules (README hanya merujuk ke file ini). Rules mensyaratkan **email terverifikasi** (`auth.token.email_verified`) untuk membaca/menulis `/tasks`, memvalidasi setiap field task (tipe, enum, format tanggal, panjang teks, deadline ≥ tanggal mulai), menolak field lain (`$other`), menjaga `createdBy`, dan membatasi `/users/{uid}` hanya untuk pemiliknya dengan `isVerified` yang wajib sama dengan status verifikasi di token. Setiap kali struktur data atau batasnya berubah, ubah rules ini **dan** `scripts/test-rules.mjs`, lalu jalankan `yarn test:rules`
- `yarn test:rules` menjalankan Firebase Emulator (auth + database, project demo `demo-kanban`, konfigurasi di `firebase.json`) lewat `npx firebase-tools@15 emulators:exec`, lalu `scripts/test-rules.mjs` menguji rules lewat REST API emulator (60 kasus; akun uji diverifikasi lewat kode verifikasi yang disimpan emulator di `/emulator/v1/projects/<id>/oobCodes`, lalu login ulang supaya token-nya membawa `email_verified: true`). Butuh Java 21+. Tidak menyentuh project Firebase sungguhan. Regex di rules RTDB hanya mendukung sebagian sintaks — misalnya `\S` tidak didukung (emulator menolak rules-nya), jadi pakai kelas karakter seperti `[0-9]` atau `[^ \t\n]`
- Deploy rules: `npx firebase-tools@15 deploy --only database --project <project-id>`, atau salin isi file ke tab Rules di Console
- **Deploy aplikasi: Google App Engine standard**, runtime `nodejs22`, project yang sama dengan Firebase (`alpha-bravo-00001`, region `asia-southeast2` — sudah dibuat dan permanen). Perintah: `gcloud app deploy`. Konfigurasinya di `app.yaml`, yang **di-ignore git** karena berisi token Font Awesome; template yang di-commit adalah `app.example.yaml` — setiap mengubah `app.yaml`, samakan juga strukturnya di template
  - Token Font Awesome dan semua `NEXT_PUBLIC_FIREBASE_*` diberikan lewat `build_env_variables` (hanya ada saat Cloud Build menjalankan `yarn install` + script `gcp-build`). `.env.local` tidak ikut ter-upload, dan nilai `NEXT_PUBLIC_*` tertanam di bundle saat build, jadi perubahan nilainya butuh deploy ulang
  - Script `gcp-build` (`next build --webpack`) di `package.json` **wajib ada**: untuk project Yarn, buildpack App Engine hanya menjalankan `gcp-build`, tidak pernah `build`. Tanpanya deploy tetap "berhasil", tapi semua halaman 502/503 dengan log `Could not find a production build in the '.next' directory`. Dengan `gcp-build`, devDependencies (TypeScript, Sass, dst.) ikut di-install untuk build lalu dibuang sebelum app dijalankan
  - `gcp-build` sengaja memakai **webpack**, bukan Turbopack: buildpack membuat `node_modules` sebagai symlink ke `/layers/...` (di luar folder project), dan Turbopack gagal dengan `Symlink [project]/node_modules is invalid, it points out of the filesystem root` (issue terbuka vercel/next.js#98111). Script `build` lokal tetap Turbopack
  - `entrypoint: node node_modules/next/dist/bin/next start` — sengaja **bukan** `yarn start`/`npm start`, karena package manager membaca `.npmrc` dan gagal saat token tidak ada di runtime
  - `.gcloudignore` menentukan file yang di-upload: hanya `app.yaml`, `.npmrc`, `package.json`, `yarn.lock`, `next.config.ts`, `tsconfig.json`, `src/`, `public/`. Cek dengan `gcloud meta list-files-for-upload`
  - `automatic_scaling.max_instances: 1` membatasi biaya ke satu instance F1
- Tambah paket: `yarn add <paket>` / `yarn add -D <paket>`

## Dokumentasi Per Fase
Riwayat pengerjaan ada di `docs/`, satu dokumen per fase, ditulis dalam **Bahasa Inggris** dan ditautkan dari bagian "Development Phases" di README:
- `docs/phase-1-kanban-crud.md` — persiapan project + CRUD kanban (23–24 Sep 2026)
- `docs/phase-2-authentication.md` — login/registrasi, `createdBy`, rules database + tes (29–30 Sep 2026)
- `docs/phase-3-app-engine-deployment.md` — deploy ke App Engine (30 Sep – 1 Okt 2026)
- `docs/phase-4-email-verification.md` — verifikasi email saat registrasi, halaman `/verify-email`, data `/users/{uid}` (Okt 2026; materi Module 3 – Lecture Note 10 "Webmailer using Firebase")

Setiap dokumen menggambarkan kondisi **saat fase itu selesai** (struktur kode terbaru tetap di README), dengan pola bagian yang sama: tujuan, hasil, keputusan teknis, masalah & solusi, cara menguji, keterbatasan, dan daftar commit. Saat menyelesaikan fase baru, tambahkan `docs/phase-N-<nama>.md` dengan pola yang sama, lalu tautkan dari README — jangan menulis ulang dokumen fase sebelumnya kecuali ada fakta yang salah.

## Struktur Data
Path Realtime Database: `/tasks/{taskId}` — `taskId` adalah key otomatis dari `push()`, bukan field di dalam task. Urutan kartu dalam satu kolom mengikuti urutan key tersebut (kronologis, task terlama di atas).

| Field | Tipe | Keterangan |
|---|---|---|
| `title` | string | Judul task (wajib, tidak boleh kosong/spasi saja, maksimal 200 karakter) |
| `description` | string | Deskripsi singkat task (opsional, boleh string kosong, maksimal 2000 karakter) |
| `status` | string (enum) | `todo` / `in_progress` / `done` — menentukan kolom penempatan kartu |
| `priority` | string (enum) | `low` / `medium` / `high` |
| `startDate` | string (`YYYY-MM-DD`) | Tanggal mulai pengerjaan (wajib) |
| `deadline` | string (`YYYY-MM-DD`) | Tanggal target penyelesaian (wajib, ≥ `startDate`) |
| `createdBy` | object `{ uid, email }` | Akun pembuat task — diisi otomatis oleh `createTask` dari user yang sedang login, tidak pernah diubah sesudahnya (rules database menolak perubahannya). Tidak ada di task yang dibuat sebelum fitur login, jadi bertipe opsional |

Path data user: `/users/{uid}` — `uid` = ID akun di Firebase Authentication (bukan `md5(email)` seperti di slide kuliah: `uid` stabil, cocok dengan rules `auth.uid === $uid`, dan sama dengan `createdBy.uid` di task).

| Field | Tipe | Keterangan |
|---|---|---|
| `email` | string | Email akun (wajib sama dengan `auth.token.email`) |
| `isVerified` | boolean | `false` setelah registrasi, `true` setelah link verifikasi dibuka. Wajib sama dengan `auth.token.email_verified` saat ditulis |

Dibuat/diperbarui oleh `usersService.syncUserProfile` setiap kali status login atau token berubah (termasuk untuk akun lama yang belum punya data). Aplikasi tidak membaca `isVerified` untuk menentukan akses — sumber kebenarannya token Firebase Auth; `/users` adalah cerminan yang diminta tugas.

Format tanggal `YYYY-MM-DD` adalah format yang dihasilkan `<input type="date">`. Akun user disimpan di Firebase Authentication; `/users/{uid}` hanya menyimpan email dan status verifikasinya. Papan bersifat **bersama**: semua user yang login melihat, mengedit, dan menghapus task yang sama.

## Pemetaan Fungsi CRUD
- **Create** — form/modal penambahan task baru, nilai default `status: "todo"`; `createdBy` ditambahkan otomatis
- **Read** — papan 3 kolom (desktop) atau tab + daftar bertumpuk (mobile, belum diimplementasi), kartu difilter dari `status`, sinkron realtime via listener `onValue()`
- **Update** — dua jalur: (1) edit detail task lewat form, (2) perpindahan kolom lewat dropdown `status` pada tiap kartu
- **Delete** — tombol hapus per kartu memicu `ConfirmDialog` (ikon tong sampah, judul task yang akan dihapus, tombol Batal & Hapus Task) sebelum eksekusi permanen

## Routing & Autentikasi
| Route | File | Akses |
|---|---|---|
| `/` | `src/app/(board)/page.tsx` → `<Board />` | `verified`: login **dan** email terverifikasi |
| `/login` | `src/app/(auth)/login/page.tsx` → `<AuthForm mode="login" />` | `guest`: belum login |
| `/register` | `src/app/(auth)/register/page.tsx` → `<AuthForm mode="register" />` | `guest` |
| `/verify-email` | `src/app/(verify)/verify-email/page.tsx` → `<VerifyEmail />` | `unverified`: login tapi email belum terverifikasi |

- `(board)`, `(auth)`, dan `(verify)` adalah route group — nama dalam kurung tidak masuk URL. Layout masing-masing grup hanya membungkus halaman dengan `<AuthGuard access="verified">` / `"guest"` / `"unverified"`, jadi aturan akses cukup ditulis sekali per grup. User yang membuka halaman yang bukan untuknya dipindah ke halaman "rumah" statusnya: `guest` → `/login`, `unverified` → `/verify-email`, `verified` → `/`
- File `page.tsx` dan `layout.tsx` sengaja tetap Server Component (tanpa `"use client"`) supaya bisa mengekspor `metadata`. Judul tab: `title.template` di root layout (`"%s · Kanban Board"`), halaman cukup mengisi namanya sendiri (`"Masuk"`, `"Daftar"`). Isi interaktif diletakkan di komponen client (`Board`, `AuthForm`)
- Guard berjalan di browser, bukan di `proxy.ts` (nama baru `middleware.ts` sejak Next.js 16): Firebase menyimpan sesi login di IndexedDB browser, bukan cookie, jadi server tidak tahu siapa yang login. HTML statis tiap route hanya berisi layar "Memuat...". Pengaman data yang sebenarnya adalah rules database (`auth != null`)
- Tidak ada redirect di dalam form: setelah `signIn`/`signUp` berhasil, `onIdTokenChanged` (lewat `authService.subscribeAuth`) memperbarui `AuthProvider`, lalu `AuthGuard` yang memindahkan halaman (`router.replace`, bukan `push`, supaya tombol Back tidak memantul). Registrasi otomatis login, jadi user baru langsung dipindah ke `/verify-email` (belum terverifikasi), bukan ke papan
- **Verifikasi email** (fase 4): `signUp` membuat akun lalu memanggil `sendEmailVerification` dengan `url: <origin>/verify-email` dan `handleCodeInApp: false` — link di email membuka halaman verifikasi bawaan Firebase, lalu tombol "Continue" membawa user ke `/verify-email`. Email dikirim dalam Bahasa Indonesia (`auth.languageCode = "id"` di `src/lib/firebase.ts`). Domain `continueUrl` wajib ada di Firebase **Authorized domains** (`localhost` sudah ada; domain App Engine harus ditambahkan) — kalau tidak, error `auth/unauthorized-continue-uri`
- **Status verifikasi diambil dari token, bukan dari `user.emailVerified`.** Rules membaca claim `email_verified` di ID token. Saat link dibuka di tab lain, Firebase memperbarui `user.emailVerified` ketika halaman dimuat, tapi token tersimpan masih `false` — kalau aplikasi memakai `user.emailVerified`, papan terbuka padahal `/tasks` ditolak (`permission_denied`). `authService.hasVerifiedEmail(user)` membaca claim token dan meminta token baru kalau keduanya berbeda. `subscribeAuth` memakai `onIdTokenChanged` (bukan `onAuthStateChanged`) supaya token baru ikut memperbarui state
- Belum ada fitur lupa password

## Struktur Folder
```
src/
├── app/           route saja: layout, page, font, globals.scss
├── components/    UI umum: Button, Modal, ConfirmDialog, FieldError
├── features/
│   ├── auth/      components/ (AuthCard, AuthForm, AuthGuard, AuthProvider, VerifyEmail) + services/ (authService.ts, usersService.ts)
│   └── board/     components/ (Board, TaskCard, ModalForm) + services/tasksService.ts
├── lib/           firebase.ts (inisialisasi Firebase, dipakai kedua service)
└── styles/        mixin SCSS bersama (_form.scss)
```
- **`components/` vs `features/`:** komponen yang tidak tahu apa-apa soal task, akun, atau Firebase — sehingga bisa dipakai di project lain tanpa diubah — masuk `src/components/`. Komponen yang mengenal domain aplikasi masuk `src/features/<fitur>/components/`, dan service Firebase-nya di `src/features/<fitur>/services/`
- **Arah ketergantungan:** `app/` → `features/` → `components/`, `lib/`, `styles/`. `components/` dan `lib/` tidak boleh meng-import dari `features/`. Antar fitur hanya satu arah: `board` boleh memakai `auth` (`Board` memakai `useAuth` dan `authService.signOut`), `auth` tidak boleh memakai `board`
- Tidak ada file `index.ts` (barrel); import selalu ke file-nya langsung, mis. `@/features/board/components/TaskCard/TaskCard`
- Fitur baru: buat `src/features/<nama>/` dengan `components/` dan, kalau perlu, `services/`; route-nya tetap di `src/app/`

## Struktur Komponen
- `src/app/layout.tsx` — root layout: font Inter, setup Font Awesome, `metadata` (dengan `title.template`), dan `<AuthProvider>` yang membungkus seluruh halaman
- `AuthProvider` (`"use client"`) — berlangganan `authService.subscribeAuth` sekali untuk seluruh app, lalu membagikan `{ user, isEmailVerified, isLoading }` lewat hook `useAuth()`. `isEmailVerified` dihitung dengan `authService.hasVerifiedEmail` (claim token) dan disimpan terpisah dari `user`, karena Firebase memperbarui objek user yang sama (tidak memicu render ulang). Karena pengecekan token asynchronous, hanya perubahan terbaru yang boleh mengubah state (counter `latestChange`), supaya hasil lama tidak menimpa sign-out. Setiap perubahan juga memanggil `usersService.syncUserProfile`. `isLoading` bernilai `true` sampai Firebase selesai memulihkan (atau memastikan tidak ada) sesi yang tersimpan di browser
- `AuthGuard` (`"use client"`) — prop `access` (`"guest"` / `"unverified"` / `"verified"`). Menampilkan halaman hanya ke user dengan status yang sama, memindahkan sisanya lewat `router.replace`, dan menampilkan layar "Memuat..." (`role="status"`) selama `isLoading` atau saat redirect sedang berjalan, supaya halaman yang salah tidak sempat terlihat
- `AuthCard` — kartu putih di tengah layar (judul, subjudul, isi) yang dipakai `AuthForm` dan `VerifyEmail`; tanpa `"use client"`
- `AuthForm` (`"use client"`) — form login/registrasi berbasis React Hook Form, prop `mode` (`"login"` / `"register"`), dibungkus `AuthCard`. Login: email + password. Registrasi: email + password (minimal 6 karakter, batas minimum Firebase) + konfirmasi password. Error dari Firebase diterjemahkan lewat `getAuthErrorMessage` dan tampil di atas tombol; email tidak terdaftar dan password salah sengaja menghasilkan pesan yang sama ("Email atau password salah."). Di bawah form ada link ke halaman satunya (`next/link`)
- `VerifyEmail` (`"use client"`) — isi `/verify-email`. Saat dibuka tepat setelah registrasi, mengambil hasil pengiriman email pertama lewat `authService.takeSignUpVerificationEmail()` (hanya bisa diambil sekali) dan menampilkan "Registrasi berhasil! Cek email untuk verifikasi." atau error-nya. Teks instruksi sengaja tidak mengklaim email baru saja dikirim (akun lama mungkin belum pernah menerimanya). Isi: email user, instruksi, tombol **Saya Sudah Verifikasi** (`refreshVerificationStatus`; kalau belum: "Email belum diverifikasi…"), **Kirim Ulang Email** (`resendVerificationEmail`, lalu nonaktif 60 detik dengan hitung mundur), dan **Keluar**. Memeriksa status sendiri (tanpa menampilkan error) saat halaman dibuka dan saat tab terlihat lagi (`visibilitychange`). Setelah terverifikasi, `AuthGuard` yang memindahkan ke papan
- `Board` (`"use client"`) — isi halaman `/`. Berlangganan `/tasks` lewat `taskService.subscribeTasks` di `useEffect`, membagi task ke 3 kolom per `status` (state `content`), dan me-render kolom beserta daftar `TaskCard` langsung di dalamnya — tidak ada komponen `Column` terpisah. Header berisi email user, tombol "Keluar", dan "Tambah Task". Saat keluar, listener `/tasks` dilepas **dulu** (disimpan di `unsubscribeTasksRef`) baru `authService.signOut()` dipanggil — kalau urutannya terbalik, Firebase membatalkan listener dengan error `permission_denied`. Juga memegang state `ModalForm` (`modalType` `"create"`/`"edit"`, `editingTask`) dan `ConfirmDialog` (`deletingTask`). Ketiga state itu sengaja **tidak** di-reset saat modal ditutup, supaya judul & isi modal tidak berubah selama animasi tutup
- `TaskCard` (`"use client"`) — komponen presentational: menerima data task lewat props plus callback `onStatusChange(status)`, `onEdit`, `onDelete`, dan tidak memanggil Firebase. Menampilkan badge prioritas (label Rendah / Sedang / Tinggi), judul (dicoret dan berwarna `#6B6B70` saat `status` = `done`), deskripsi, rentang tanggal, dropdown status (mengisi sisa lebar baris aksi), serta tombol edit/hapus. Rentang tanggal diformat dengan `Intl.DateTimeFormat` locale `id-ID`, nama bulan lengkap, `timeZone: "UTC"` (supaya tanggal tidak bergeser antar zona waktu); tahun hanya ditampilkan kalau tahun `startDate` dan `deadline` berbeda — contoh "20 September – 24 September" dan "31 Desember 2026 – 1 Januari 2027"
- `ModalForm` (`"use client"`, modal) — form task berbasis **React Hook Form**, dipakai untuk Create maupun Update. Props: `isOpen`, `onClose`, `title` (judul modal), `defaultValues` (nilai awal mode edit), `onSubmit(values)` (boleh async; kalau reject, pesan error tampil dan modal tetap terbuka). Yang dikirim ke `onSubmit` hanya 6 field task (tanpa `id`), dengan spasi di awal/akhir judul & deskripsi sudah dibuang. Layout: 1 field per baris (Judul, Deskripsi, Status, Prioritas), kecuali Tanggal Mulai + Deadline dalam 1 baris. Validasi: judul wajib, tanggal mulai & deadline wajib, deadline ≥ tanggal mulai; deskripsi opsional. Panjang judul & deskripsi dibatasi lewat atribut `maxLength` dari konstanta `maxTitleLength` / `maxDescriptionLength` di `tasksService`, yang nilainya harus sama dengan batas di `database.rules.json`. Default: `status: "todo"`, `priority: "medium"`, `startDate` hari ini. Klik di mana pun pada field tanggal membuka kalender lewat `showPicker()`. Ikon bawaan browser di select & field tanggal disembunyikan dan diganti ikon Font Awesome lewat komponen internal `FieldControl`. Form di-render di dalam `Modal`, jadi selalu kosong lagi setiap kali dibuka
- `FieldError` — pesan validasi di bawah field form (`<p id>` yang dirujuk `aria-describedby` field-nya); tidak me-render apa pun kalau `message` kosong. Dipakai `ModalForm` dan `AuthForm`
- `ConfirmDialog` (`"use client"`, modal) — dialog konfirmasi **generik** (`role="alertdialog"`). Props: `title`, `description` (ReactNode), `icon` opsional, `variant` (`"default"` / `"danger"` → warna ikon & tombol konfirmasi), `confirmLabel` (default "Konfirmasi"), `cancelLabel` (default "Batal"), `onConfirm` (boleh async). Saat `onConfirm` berjalan tombol disabled + "Memproses..."; berhasil → dialog menutup sendiri; gagal → pesan error tampil & dialog tetap terbuka. Fokus awal di tombol Batal. Dipakai untuk hapus task: ikon tong sampah, judul "Hapus Task Ini?", nama task, tombol Batal / Hapus Task (`variant="danger"`)
- `Modal` (`"use client"`) — komponen dasar berbasis `<dialog>` native yang dipakai `ModalForm` & `ConfirmDialog`; **controlled** lewat props `isOpen` + `onClose` (bukan method via ref), plus `className`, `role` (`"dialog"` / `"alertdialog"`), dan `aria-label` / `aria-labelledby` / `aria-describedby`. Komponen di dalamnya bisa menutup modal lewat `useModal().close()`. Klik overlay dan tombol Escape juga menutup modal. Saat ditutup, animasi keluar dijalankan dulu (class `Modal--closing`) baru `dialog.close()` dipanggil; isi modal hanya di-render selama modal terbuka. Elemen dengan atribut `data-autofocus` otomatis difokus saat modal terbuka (`autoFocus` React tidak berfungsi di dalam `<dialog>`)
- `Button` — tombol dasar untuk seluruh app; props `color` (`primary` / `secondary` / `danger` / `warning` / `neutral`), `variant` (`solid` / `outlined` / `text`), `size` (`small` / `medium` / `large`), default `primary` + `solid` + `medium` + `type="button"`; menerima semua props `<button>` native. Area sentuh selalu ≥ 44×44px. Ikon lewat `startIcon` / `endIcon` (tipe `IconDefinition` Font Awesome); tanpa `children` otomatis jadi tombol ikon persegi dan **wajib** diberi `aria-label`
- `src/features/board/services/tasksService.ts` — satu-satunya titik akses ke Firebase RTDB; dipakai lewat default export `taskService` (mis. `taskService.createTask(values)`). Juga mengekspor tipe `Task`, `TaskData` (task tanpa `id`, bentuk data di database), `TaskInput` (6 field yang diisi user — tanpa `id` dan `createdBy`; dipakai sebagai `TaskFormValues` di `ModalForm`), `TaskCreator`, `TaskStatus`, dan `TaskPriority`, serta konstanta `maxTitleLength` (200) dan `maxDescriptionLength` (2000). Fungsi:
  - `subscribeTasks(onChange, onError)` — listener `onValue` ke `/tasks`, mengembalikan fungsi unsubscribe
  - `createTask(task: TaskInput)` — menambahkan `createdBy` dari `currentUser` Firebase Auth (reject kalau belum login), lalu `push` ke `/tasks`; resolve setelah Firebase mengonfirmasi
  - `updateTask(id, changes: Partial<TaskInput>)` — `update`, hanya field yang dikirim (`createdBy` tidak bisa ikut diubah); dipakai dropdown status di `TaskCard` dan mode edit `ModalForm`
  - `deleteTask(id)` — `remove`, dipanggil lewat `ConfirmDialog`
- `src/features/auth/services/authService.ts` — satu-satunya titik akses ke Firebase Auth; default export `authService` dengan `subscribeAuth(onChange)` (`onIdTokenChanged`), `signIn(email, password)`, `signUp(email, password)` (langsung login + kirim email verifikasi; promise pengirimannya disimpan untuk `takeSignUpVerificationEmail()`), `hasVerifiedEmail(user)` (claim `email_verified` di token; refresh token kalau berbeda dengan `user.emailVerified`, maksimal sekali per akun per page load lewat `renewedTokenUids` supaya tidak loop), `resendVerificationEmail()`, `refreshVerificationStatus()` (`reload` + token baru kalau sudah terverifikasi; mengembalikan status), dan `signOut()`. Juga mengekspor `getAuthErrorMessage(error)` (kode error Firebase → pesan Bahasa Indonesia) dan tipe `AuthUser` (= `User` Firebase), supaya komponen tidak perlu import dari `firebase/auth`
- `src/features/auth/services/usersService.ts` — akses `/users/{uid}`: `syncUserProfile(user)` membaca `email` dan `email_verified` dari token, lalu menulis `{ email, isVerified }` hanya kalau data belum ada atau berbeda
- `src/lib/firebase.ts` — inisialisasi Firebase secara lazy (`getFirebaseApp()`) supaya Firebase hanya berjalan di browser, bukan saat Next.js melakukan prerender; mengekspor `getDb()` dan `getFirebaseAuth()` (yang juga memasang `languageCode = "id"`)

## Desain UI

### Halaman Login, Registrasi & Verifikasi Email
Kartu putih di tengah layar (`AuthCard`, lebar maksimal 400px) di atas latar `#F6F5F1`: judul ("Masuk" / "Buat Akun" / "Verifikasi Email"), subjudul, isi, dan tombol utama selebar kartu. Login/registrasi: field satu per baris dengan gaya yang sama seperti field `ModalForm`, dan link ke halaman satunya di bagian bawah. Verifikasi email: instruksi, pesan sukses (hijau `#27704F` di `#E2F2EA`) atau error (`form.alert`), lalu tiga tombol bertumpuk — utama, outlined, dan teks "Keluar".

### Layout Desktop (≥ 1024px)
3 kolom tetap (To Do / In Progress / Done) dengan lebar sama rata. Header berisi judul papan di kiri; di kanan: email user, tombol "Keluar" (neutral outlined), dan tombol "Tambah Task". Breakpoint 1024px dipilih karena di bawah lebar itu kartu (dropdown status + 2 tombol aksi + padding) mulai terlalu sesak untuk 3 kolom sekaligus.

### Layout Mobile (< 1024px) — belum diimplementasi
Saat ini papan tetap 3 kolom di semua lebar layar, dan `ModalForm` tetap selebar 480px. Target desainnya:

Tab/segmented control (To Do / In Progress / Done) di bagian atas, kartu tersusun vertikal penuh lebar layar untuk kolom yang aktif. Tombol tambah task menjadi floating action button (FAB) di kanan bawah. Form tambah/edit task tampil full-screen. Tombol edit/hapus pada kartu berupa ikon (bukan teks) untuk menghemat ruang horizontal, tetap disertai `aria-label`. Semua elemen interaktif menjaga touch target minimal 44×44px.

### Kartu Task — elemen yang ditampilkan
Badge prioritas berwarna, judul, deskripsi singkat, rentang `startDate`–`deadline`, dropdown status, tombol edit & hapus.

### Dialog Konfirmasi Hapus
Modal terpusat (desktop) / dialog terpusat dengan margin layar (mobile) di atas overlay gelap — bukan full-screen seperti form tambah task, karena hanya perlu satu keputusan singkat. Berisi ikon tong sampah, judul "Hapus Task Ini?", nama task yang ditarget, serta tombol Batal (outline) dan Hapus Task (merah destruktif).

### Palet & Tipografi (referensi visual — styling final SCSS di tangan developer)
- Hanya tema terang. `globals.scss` memasang `color-scheme: light` supaya kontrol bawaan browser (ikon kalender, dropdown, scrollbar) tidak ikut gelap saat OS memakai Dark Mode
- Latar: off-white hangat `#F6F5F1`; teks utama `#1B1B1D`; teks sekunder `#6B6B70`
- Aksen utama: `#5750E8` (tombol utama, aksi edit)
- Warna destruktif (aksi hapus): `#C23A3A` — sama dengan warna badge prioritas Tinggi
- Badge prioritas: rendah `#2E7D5B` teks / `#E2F2EA` latar; sedang `#8A6B14` / `#FBF1D6`; tinggi `#C23A3A` / `#FBE4E4`
- Tipografi: **Inter** untuk seluruh teks (heading & body), weight 400 / 500 / 600 / 700 saja — file lokal optical size 18pt di `src/app/fonts/`, dimuat lewat `next/font/local` sebagai CSS variable `--font-inter`
- Kartu: latar putih, border 1px `#E4E2DC`, radius 14px, shadow halus (`0 1px 2px rgba(27,27,29,0.05)`)

## Konvensi Kode
- Nama field data pakai camelCase (contoh: `startDate`, bukan `start_date`)
- Label/teks UI dalam Bahasa Indonesia; nama variabel, fungsi, dan komponen dalam Bahasa Inggris. Komentar kode dalam Bahasa Inggris; fungsi dan handler diberi JSDoc `/** @description … */`
- Nama handler mengikuti pola `on<Aksi><Objek>` (mis. `onClickCreateTask`, `onSubmitTask`, `onChangeTaskStatus`)
- Tipe TypeScript ditulis eksplisit: setiap variabel (`const isClosing: boolean`), parameter, dan return type fungsi — termasuk komponen (`: ReactElement`) serta callback/handler inline (`(event: MouseEvent<HTMLButtonElement>): void => …`). Hook memakai generic (`useState<boolean>`, `useRef<HTMLDialogElement>`); tipe diambil dari export resmi library (mis. `Database`, `Unsubscribe` dari Firebase)
- Import antar folder `src/` memakai alias `@/` (mis. `@/components/Button/Button`, `@/features/auth/services/authService`)
- Tidak menggunakan framework CSS (Bootstrap dsb.) — styling murni SCSS Modules per komponen. Satu folder per komponen berisi `Nama.tsx` + `Nama.module.scss`. Style yang dipakai lebih dari satu komponen disimpan sebagai mixin di `src/styles/` (tidak menghasilkan CSS sendiri) — saat ini `_form.scss` berisi `form.field` (label + input/select/textarea, termasuk state fokus & invalid) dan `form.alert` (kotak error form), dipakai lewat `@use` dengan path relatif ke `src/styles/form` (dari komponen fitur: `@use "../../../../styles/form";`) lalu `@include form.field;`
- Class SCSS memakai pola BEM dengan nesting: blok = nama komponen dalam PascalCase (`.TaskCard`), elemen `&__camelCase`, modifier `&--nilai`; di TSX diakses sebagai `styles.TaskCard__priority`. Selector bersarang yang tidak punya properti sendiri tidak menghasilkan class, sehingga `styles.<nama>` bernilai `undefined`
- Gaya penulisan SCSS: properti dalam satu blok diurutkan dari baris terpendek ke terpanjang, dan file SCSS tidak diberi komentar
- Format kode dengan Prettier (`.prettierrc`): kutip ganda, trailing comma, import diurutkan otomatis (library → `@/…` → relatif, dipisah baris kosong), kode warna di SCSS jadi huruf kecil. Jalankan `yarn format` sebelum commit; file Markdown tidak ikut diformat
- Directive `"use client"` ditulis di baris paling atas file, sebelum import lain, untuk setiap komponen yang memakai hook React, mendefinisikan event handler, atau memanggil `taskService` / `authService` (App Router menganggap komponen sebagai Server Component secara default). `Button` sengaja tanpa directive — ia tetap berjalan sebagai client component saat di-import dari komponen client
