# CLAUDE.md

## Tentang Proyek
Kanban board sederhana untuk tugas mata kuliah Cloud Computing — implementasi Backend as a Service (BaaS) menggunakan Firebase Realtime Database dengan fungsi CRUD penuh (Create, Read, Update, Delete).

## Repository
- **Nama:** `kanban-board-firebase-rtdb`
- **Deskripsi:** Aplikasi kanban board sederhana berbasis React dan Firebase Realtime Database dengan fungsi CRUD lengkap — dibuat untuk tugas mata kuliah Cloud Computing (Backend as a Service).

## Stack Teknis
- **Next.js** (App Router) sebagai framework React
- **Yarn** (classic 1.x) sebagai package manager — jangan pakai `npm install` karena akan membuat `package-lock.json` yang bentrok dengan `yarn.lock`
- **React Hook Form** untuk form (tanpa library validasi tambahan — aturan validasi ditulis lewat opsi `register`)
- **Font Awesome Pro** untuk ikon (`@fortawesome/pro-solid-svg-icons` + `@fortawesome/react-fontawesome`), di-setup di `layout.tsx` (`config.autoAddCss = false`). Paket Pro diambil dari registry privat lewat `.npmrc`, yang tokennya dibaca dari env `FONTAWESOME_PACKAGE_TOKEN` — tanpa env ini **semua** perintah `yarn` gagal ("Failed to replace env in config")
- **SCSS Modules** untuk styling per komponen (contoh: `TaskCard.module.scss`) — tanpa framework CSS/UI eksternal seperti Bootstrap
- **Firebase JS SDK** (Realtime Database) — seluruh akses data diisolasi dalam satu service layer; komponen React tidak memanggil Firebase API secara langsung
- Karena seluruh board bersifat interaktif (form, listener realtime, dropdown status), hampir semua komponen memakai directive `"use client"` di baris pertama filenya — App Router menganggap komponen sebagai Server Component secara default kecuali dinyatakan sebaliknya

## Setup Awal (jika project belum diinisialisasi)
```
yarn create next-app .
yarn add firebase
yarn add -D sass
```
Saat prompt setup muncul, pilih **App Router** (bukan Pages Router). Project Firebase & Realtime Database dikonfigurasi terpisah lewat Firebase Console. Kredensial disimpan di file environment (`.env.local`, jangan di-commit) dan diinisialisasi di `src/services/firebase.ts`. Semua variabel env Firebase wajib berawalan `NEXT_PUBLIC_` (lihat `.env.example`).

## Struktur Data
Path Realtime Database: `/tasks/{taskId}`

| Field | Tipe | Keterangan |
|---|---|---|
| `title` | string | Judul task |
| `description` | string | Deskripsi singkat task |
| `status` | string (enum) | `todo` / `in_progress` / `done` — menentukan kolom penempatan kartu |
| `priority` | string (enum) | `low` / `medium` / `high` |
| `startDate` | string (date) | Tanggal mulai pengerjaan |
| `deadline` | string (date) | Tanggal target penyelesaian |

## Pemetaan Fungsi CRUD
- **Create** — form/modal penambahan task baru, nilai default `status: "todo"`
- **Read** — papan 3 kolom (desktop) atau tab + daftar bertumpuk (mobile), kartu difilter dari `status`, sinkron realtime via listener `onValue()`
- **Update** — dua jalur: (1) edit detail task lewat form, (2) perpindahan kolom lewat dropdown `status` pada tiap kartu
- **Delete** — tombol hapus per kartu memicu `ConfirmDialog` (ikon tong sampah, judul task yang akan dihapus, tombol Batal & Hapus Task) sebelum eksekusi permanen

## Struktur Komponen
- `app/page.jsx` — entry point satu-satunya route; me-render `<Board />` (tidak ada multi-halaman/routing, seluruh app adalah satu tool)
- `Board` (`"use client"`) — komponen akar; menyimpan state array task lewat listener `onValue()`, me-render kolom per `status` langsung di dalamnya (3 kolom di desktop, navigasi tab di mobile) beserta daftar `TaskCard` — tidak ada komponen `Column` terpisah
- `TaskCard` (`"use client"`) — menampilkan judul, badge prioritas, rentang tanggal, dropdown status, tombol edit/hapus
- `ModalForm` (`"use client"`, modal) — form task berbasis **React Hook Form**, dipakai untuk Create maupun Update (judul modal via `title`, nilai awal edit via `defaultValues`, hasil lewat `onSubmit`). Layout: 1 field per baris (Judul, Deskripsi, Status, Prioritas), kecuali Tanggal Mulai + Deadline dalam 1 baris. Validasi: judul wajib, tanggal mulai & deadline wajib, deadline ≥ tanggal mulai; deskripsi opsional. Default: `status: "todo"`, `priority: "medium"`, `startDate` hari ini. Form di-render di dalam `Modal`, jadi selalu kosong lagi setiap kali dibuka
- `ConfirmDialog` (`"use client"`, modal) — dialog konfirmasi sebelum penghapusan; menampilkan judul task target serta tombol Batal / Hapus Task (destruktif)
- `Modal` (`"use client"`) — komponen dasar berbasis `<dialog>` native yang dipakai `ModalForm` & `ConfirmDialog`; **controlled** lewat props `isOpen` + `onClose` (bukan method via ref), plus `className` dan `aria-labelledby`/`aria-label`. Komponen di dalamnya bisa menutup modal lewat `useModal().close()`. Elemen dengan atribut `data-autofocus` otomatis difokus saat modal terbuka (`autoFocus` React tidak berfungsi di dalam `<dialog>`)
- `Button` — tombol dasar untuk seluruh app; props `color` (`primary` / `secondary` / `danger` / `warning` / `neutral`), `variant` (`solid` / `outlined` / `text`), `size` (`small` / `medium` / `large`), default `primary` + `solid` + `medium` + `type="button"`; menerima semua props `<button>` native. Area sentuh selalu ≥ 44×44px. Ikon lewat `startIcon` / `endIcon` (tipe `IconDefinition` Font Awesome); tanpa `children` otomatis jadi tombol ikon persegi dan **wajib** diberi `aria-label`
- `src/services/tasksService.ts` — satu-satunya titik akses ke Firebase RTDB; dipakai lewat default export `taskService` (mis. `taskService.createTask(values)`). Sudah ada: `subscribeTasks` (listener `onValue`) dan `createTask` (`push` ke `/tasks`, resolve setelah Firebase mengonfirmasi). Belum ada: update & delete. Koneksi Firebase diinisialisasi di `src/services/firebase.ts` (`getDb()`)

## Desain UI

### Layout Desktop (≥ 1024px)
3 kolom tetap (To Do / In Progress / Done). Header berisi judul papan + tombol "Tambah Task". Breakpoint 1024px dipilih karena di bawah lebar itu kartu (dropdown status + 2 tombol aksi + padding) mulai terlalu sesak untuk 3 kolom sekaligus.

### Layout Mobile (< 1024px)
Tab/segmented control (To Do / In Progress / Done) di bagian atas, kartu tersusun vertikal penuh lebar layar untuk kolom yang aktif. Tombol tambah task menjadi floating action button (FAB) di kanan bawah. Tombol edit/hapus pada kartu berupa ikon (bukan teks) untuk menghemat ruang horizontal, tetap disertai `aria-label`. Semua elemen interaktif menjaga touch target minimal 44×44px.

### Kartu Task — elemen yang ditampilkan
Badge prioritas berwarna, judul, deskripsi singkat, rentang `startDate`–`deadline`, dropdown status, tombol edit & hapus.

### Dialog Konfirmasi Hapus
Modal terpusat (desktop) / dialog terpusat dengan margin layar (mobile) di atas overlay gelap — bukan full-screen seperti form tambah task, karena hanya perlu satu keputusan singkat. Berisi ikon tong sampah, judul "Hapus Task Ini?", nama task yang ditarget, serta tombol Batal (outline) dan Hapus Task (merah destruktif).

### Palet & Tipografi (referensi visual — styling final SCSS di tangan developer)
- Latar: off-white hangat `#F6F5F1`; teks utama `#1B1B1D`; teks sekunder `#6B6B70`
- Aksen utama: `#5750E8` (tombol utama, aksi edit)
- Warna destruktif (aksi hapus): `#C23A3A` — sama dengan warna badge prioritas Tinggi
- Badge prioritas: rendah `#2E7D5B` teks / `#E2F2EA` latar; sedang `#8A6B14` / `#FBF1D6`; tinggi `#C23A3A` / `#FBE4E4`
- Tipografi: **Inter** untuk seluruh teks (heading & body), weight 400 / 500 / 600 / 700 saja — file lokal optical size 18pt di `src/app/fonts/`, dimuat lewat `next/font/local`
- Kartu: latar putih, border 1px `#E4E2DC`, radius 14px, shadow halus (`0 1px 2px rgba(27,27,29,0.05)`)

## Konvensi Kode
- Nama field data pakai camelCase (contoh: `startDate`, bukan `start_date`)
- Label/teks UI dalam Bahasa Indonesia; nama variabel, fungsi, dan komponen dalam Bahasa Inggris
- Tipe TypeScript ditulis eksplisit: setiap variabel (`const isClosing: boolean`), parameter, dan return type fungsi — termasuk komponen (`: ReactElement`) serta callback/handler inline (`(event: MouseEvent<HTMLButtonElement>): void => …`). Hook memakai generic (`useState<boolean>`, `useRef<HTMLDialogElement>`); tipe diambil dari export resmi library (mis. `Database`, `Unsubscribe` dari Firebase)
- Tidak menggunakan framework CSS (Bootstrap dsb.) — styling murni SCSS Modules per komponen
- Format kode dengan Prettier (`.prettierrc`): kutip ganda, trailing comma, import diurutkan otomatis (library → `@/…` → relatif, dipisah baris kosong). Jalankan `yarn format` sebelum commit; file Markdown tidak ikut diformat
- Directive `"use client"` ditulis di baris paling atas file, sebelum import lain, untuk setiap komponen yang memakai hook React atau Firebase SDK
