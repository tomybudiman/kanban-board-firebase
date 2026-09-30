# CLAUDE.md

## Tentang Proyek
Kanban board sederhana untuk tugas mata kuliah Cloud Computing — implementasi Backend as a Service (BaaS) menggunakan Firebase Realtime Database dengan fungsi CRUD penuh (Create, Read, Update, Delete), plus Firebase Authentication (email & password) untuk registrasi dan login.

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
- **Rules Realtime Database** ada di `database.rules.json` — satu-satunya sumber rules (README hanya merujuk ke file ini). Rules memvalidasi setiap field task (tipe, enum, format tanggal, panjang teks, deadline ≥ tanggal mulai), menolak field lain (`$other`), dan menjaga `createdBy`. Setiap kali struktur data atau batasnya berubah, ubah rules ini **dan** `scripts/test-rules.mjs`, lalu jalankan `yarn test:rules`
- `yarn test:rules` menjalankan Firebase Emulator (auth + database, project demo `demo-kanban`, konfigurasi di `firebase.json`) lewat `npx firebase-tools@15 emulators:exec`, lalu `scripts/test-rules.mjs` menguji rules lewat REST API emulator. Butuh Java 21+. Tidak menyentuh project Firebase sungguhan. Regex di rules RTDB hanya mendukung sebagian sintaks — misalnya `\S` tidak didukung (emulator menolak rules-nya), jadi pakai kelas karakter seperti `[0-9]` atau `[^ \t\n]`
- Deploy rules: `npx firebase-tools@15 deploy --only database --project <project-id>`, atau salin isi file ke tab Rules di Console
- Tambah paket: `yarn add <paket>` / `yarn add -D <paket>`

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

Format tanggal `YYYY-MM-DD` adalah format yang dihasilkan `<input type="date">`. Akun user disimpan di Firebase Authentication, bukan di Realtime Database. Papan bersifat **bersama**: semua user yang login melihat, mengedit, dan menghapus task yang sama.

## Pemetaan Fungsi CRUD
- **Create** — form/modal penambahan task baru, nilai default `status: "todo"`; `createdBy` ditambahkan otomatis
- **Read** — papan 3 kolom (desktop) atau tab + daftar bertumpuk (mobile, belum diimplementasi), kartu difilter dari `status`, sinkron realtime via listener `onValue()`
- **Update** — dua jalur: (1) edit detail task lewat form, (2) perpindahan kolom lewat dropdown `status` pada tiap kartu
- **Delete** — tombol hapus per kartu memicu `ConfirmDialog` (ikon tong sampah, judul task yang akan dihapus, tombol Batal & Hapus Task) sebelum eksekusi permanen

## Routing & Autentikasi
| Route | File | Akses |
|---|---|---|
| `/` | `src/app/(board)/page.tsx` → `<Board />` | Hanya user yang login; selain itu dipindah ke `/login` |
| `/login` | `src/app/(auth)/login/page.tsx` → `<AuthForm mode="login" />` | Hanya user yang belum login; selain itu dipindah ke `/` |
| `/register` | `src/app/(auth)/register/page.tsx` → `<AuthForm mode="register" />` | Sama seperti `/login` |

- `(board)` dan `(auth)` adalah route group — nama dalam kurung tidak masuk URL. Layout masing-masing grup hanya membungkus halaman dengan `<AuthGuard access="user">` / `<AuthGuard access="guest">`, jadi aturan akses cukup ditulis sekali per grup
- File `page.tsx` dan `layout.tsx` sengaja tetap Server Component (tanpa `"use client"`) supaya bisa mengekspor `metadata`. Judul tab: `title.template` di root layout (`"%s · Kanban Board"`), halaman cukup mengisi namanya sendiri (`"Masuk"`, `"Daftar"`). Isi interaktif diletakkan di komponen client (`Board`, `AuthForm`)
- Guard berjalan di browser, bukan di `proxy.ts` (nama baru `middleware.ts` sejak Next.js 16): Firebase menyimpan sesi login di IndexedDB browser, bukan cookie, jadi server tidak tahu siapa yang login. HTML statis tiap route hanya berisi layar "Memuat...". Pengaman data yang sebenarnya adalah rules database (`auth != null`)
- Tidak ada redirect di dalam form: setelah `signIn`/`signUp` berhasil, `onAuthStateChanged` memperbarui `AuthProvider`, lalu `AuthGuard` yang memindahkan halaman (`router.replace`, bukan `push`, supaya tombol Back tidak memantul). Registrasi otomatis login, jadi user baru langsung masuk ke papan
- Belum ada fitur lupa password maupun verifikasi email

## Struktur Folder
```
src/
├── app/           route saja: layout, page, font, globals.scss
├── components/    UI umum: Button, Modal, ConfirmDialog, FieldError
├── features/
│   ├── auth/      components/ (AuthForm, AuthGuard, AuthProvider) + services/authService.ts
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
- `AuthProvider` (`"use client"`) — berlangganan `authService.subscribeAuth` sekali untuk seluruh app, lalu membagikan `{ user, isLoading }` lewat hook `useAuth()`. `isLoading` bernilai `true` sampai Firebase selesai memulihkan (atau memastikan tidak ada) sesi yang tersimpan di browser
- `AuthGuard` (`"use client"`) — prop `access` (`"user"` / `"guest"`). Menampilkan halaman hanya ke user yang sesuai, memindahkan sisanya lewat `router.replace`, dan menampilkan layar "Memuat..." (`role="status"`) selama `isLoading` atau saat redirect sedang berjalan, supaya halaman yang salah tidak sempat terlihat
- `AuthForm` (`"use client"`) — form login/registrasi berbasis React Hook Form, prop `mode` (`"login"` / `"register"`). Login: email + password. Registrasi: email + password (minimal 6 karakter, batas minimum Firebase) + konfirmasi password. Error dari Firebase diterjemahkan lewat `getAuthErrorMessage` dan tampil di atas tombol; email tidak terdaftar dan password salah sengaja menghasilkan pesan yang sama ("Email atau password salah."). Di bawah form ada link ke halaman satunya (`next/link`)
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
- `src/features/auth/services/authService.ts` — satu-satunya titik akses ke Firebase Auth; default export `authService` dengan `subscribeAuth(onChange)` (`onAuthStateChanged`), `signIn(email, password)`, `signUp(email, password)` (langsung login), dan `signOut()`. Juga mengekspor `getAuthErrorMessage(error)` (kode error Firebase → pesan Bahasa Indonesia) dan tipe `AuthUser` (= `User` Firebase), supaya komponen tidak perlu import dari `firebase/auth`
- `src/lib/firebase.ts` — inisialisasi Firebase secara lazy (`getFirebaseApp()`) supaya Firebase hanya berjalan di browser, bukan saat Next.js melakukan prerender; mengekspor `getDb()` dan `getFirebaseAuth()`

## Desain UI

### Halaman Login & Registrasi
Kartu putih di tengah layar (lebar maksimal 400px) di atas latar `#F6F5F1`: judul ("Masuk" / "Buat Akun"), subjudul, field satu per baris dengan gaya yang sama seperti field `ModalForm`, tombol utama selebar kartu, dan link ke halaman satunya di bagian bawah.

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
