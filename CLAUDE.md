# CLAUDE.md

## Tentang Proyek
Kanban board sederhana untuk tugas mata kuliah Cloud Computing — implementasi Backend as a Service (BaaS) menggunakan Firebase Realtime Database dengan fungsi CRUD penuh (Create, Read, Update, Delete).

## Repository
- **Nama:** `kanban-board-firebase-rtdb`
- **Deskripsi:** Aplikasi kanban board sederhana berbasis React dan Firebase Realtime Database dengan fungsi CRUD lengkap — dibuat untuk tugas mata kuliah Cloud Computing (Backend as a Service).

## Stack Teknis
- **React** dengan **Vite** sebagai build tool
- **SCSS Modules** untuk styling per komponen (contoh: `TaskCard.module.scss`) — tanpa framework CSS/UI eksternal seperti Bootstrap
- **Firebase JS SDK** (Realtime Database) — seluruh akses data diisolasi dalam satu service layer; komponen React tidak memanggil Firebase API secara langsung

## Setup Awal (jika project belum diinisialisasi)
```
npm create vite@latest . -- --template react
npm install firebase sass
```
Project Firebase & Realtime Database dikonfigurasi terpisah lewat Firebase Console. Kredensial disimpan di file environment (`.env`, jangan di-commit) dan diinisialisasi di `services/firebase.js`.

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
- **Delete** — tombol hapus per kartu, disertai konfirmasi sebelum eksekusi

## Struktur Komponen
- `Board` — komponen akar; menyimpan state array task lewat listener `onValue()`, me-render `Column` (desktop) atau navigasi tab (mobile)
- `Column` — memfilter task berdasarkan `status`, me-render daftar `TaskCard`
- `TaskCard` — menampilkan judul, badge prioritas, rentang tanggal, dropdown status, tombol edit/hapus
- `TaskForm` (modal) — dipakai untuk Create maupun Update, mode dibedakan lewat props
- `services/tasksService.js` — satu-satunya titik akses ke Firebase RTDB (get/create/update/delete task)

## Desain UI

### Layout Desktop (≥ 1024px)
3 kolom tetap (To Do / In Progress / Done). Header berisi judul papan + tombol "Tambah Task". Breakpoint 1024px dipilih karena di bawah lebar itu kartu (dropdown status + 2 tombol aksi + padding) mulai terlalu sesak untuk 3 kolom sekaligus.

### Layout Mobile (< 1024px)
Tab/segmented control (To Do / In Progress / Done) di bagian atas, kartu tersusun vertikal penuh lebar layar untuk kolom yang aktif. Tombol tambah task menjadi floating action button (FAB) di kanan bawah. Tombol edit/hapus pada kartu berupa ikon (bukan teks) untuk menghemat ruang horizontal, tetap disertai `aria-label`. Semua elemen interaktif menjaga touch target minimal 44×44px.

### Kartu Task — elemen yang ditampilkan
Badge prioritas berwarna, judul, deskripsi singkat, rentang `startDate`–`deadline`, dropdown status, tombol edit & hapus.

### Palet & Tipografi (referensi visual — styling final SCSS di tangan developer)
- Latar: off-white hangat `#F6F5F1`; teks utama `#1B1B1D`; teks sekunder `#6B6B70`
- Aksen utama: `#5750E8` (tombol utama, aksi edit)
- Badge prioritas: rendah `#2E7D5B` teks / `#E2F2EA` latar; sedang `#8A6B14` / `#FBF1D6`; tinggi `#C23A3A` / `#FBE4E4`
- Tipografi: **Space Grotesk** untuk judul/heading, **Manrope** untuk isi/body
- Kartu: latar putih, border 1px `#E4E2DC`, radius 14px, shadow halus (`0 1px 2px rgba(27,27,29,0.05)`)

## Konvensi Kode
- Nama field data pakai camelCase (contoh: `startDate`, bukan `start_date`)
- Label/teks UI dalam Bahasa Indonesia; nama variabel, fungsi, dan komponen dalam Bahasa Inggris
- Tidak menggunakan framework CSS (Bootstrap dsb.) — styling murni SCSS Modules per komponen
