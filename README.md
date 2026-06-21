# 🗺️ Peta Jalan Banjarnegara

> Aplikasi Pemetaan dan Pelaporan Kerusakan Jalan Kabupaten Banjarnegara

<div align="center">

![Peta Jalan](peta-jalan.jpg)

*Sistem pemetaan ruas jalan dengan pelaporan kerusakan berbasis masyarakat*

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat&logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat&logo=node.js)](https://nodejs.org/)
[![SQLite](https://img.shields.io/badge/Database-SQLite-003B57?style=flat&logo=sqlite)](https://www.sqlite.org/)
[![Leaflet](https://img.shields.io/badge/Map-Leaflet-199900?style=flat&logo=leaflet)](https://leafletjs.com/)
[![TensorFlow.js](https://img.shields.io/badge/AI-TensorFlow.js-FF6F00?style=flat&logo=tensorflow)](https://www.tensorflow.org/js)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## 📋 Deskripsi

**Peta Jalan Banjarnegara** adalah aplikasi web full-stack untuk memetakan jaringan jalan dan mengumpulkan laporan kerusakan jalan dari masyarakat Kabupaten Banjarnegara. Aplikasi ini dirancang untuk memudahkan dinas terkait dalam memonitor kondisi jalan dan memprioritaskan perbaikan.

### ✨ Fitur Utama

| Fitur | Deskripsi |
|---|---|
| 🗺️ **Peta Interaktif** | Visualisasi 270 ruas jalan resmi + 11.656 segmen OSM dengan routing OSRM |
| 📸 **Pelaporan Foto** | Upload foto kerusakan + auto-detect GPS (lat/lng) |
| 🤖 **AI Klasifikasi** | Google Cloud Vision API (dengan fallback TensorFlow.js) untuk deteksi otomatis jenis & tingkat kerusakan |
| 📍 **Auto-Detect Lokasi** | Deteksi otomatis desa/kelurahan dan kecamatan berdasarkan koordinat GPS |
| 📊 **Dashboard Admin** | Manajemen laporan, verifikasi, update status, upload foto perbaikan |
| 📱 **Mobile PWA** | Tampilan mobile native-like dengan bottom navigation, bisa di-install di Android |
| 🔄 **Offline Mode** | Draft laporan tersimpan di IndexedDB, auto-sync saat online |
| 🏘️ **278 Desa/Kelurahan** | Batas administratif dari 20 kecamatan di Banjarnegara |
| 🎯 **14 Jenis Kerusakan** | Klasifikasi standar Bina Marga (Retakan, Lubang, Deformasi, Drainase) |
| 🔴 **Heatmap Visual** | Ruas jalan berwarna merah otomatis saat ada laporan kerusakan di sekitarnya |

---

## 🏗️ Arsitektur

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)              │
├─────────────────────────────────────────────────────────┤
│  Desktop App              │  Mobile App (PWA)           │
│  - Peta Leaflet + Layer   │  - Bottom Navigation        │
│  - Form Pelaporan         │  - Camera-First Interface   │
│  - Admin Dashboard        │  - Auto GPS + Desa Detect   │
│  - Daftar Laporan         │  - Installable              │
├─────────────────────────────────────────────────────────┤
│                    API Layer (Axios/Fetch)              │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  BACKEND (Node.js + Express)            │
├─────────────────────────────────────────────────────────┤
│  Routes                                                 │
│  ├── /api/auth          → Login JWT                    │
│  ├── /api/laporan       → CRUD Laporan + Upload Foto   │
│  ├── /api/ruas-jalan    → Data Ruas + OSRM Routing     │
│  ├── /api/desa          → Deteksi Desa/Kecamatan       │
│  └── /api/ai            → Google Vision Classification │
├─────────────────────────────────────────────────────────┤
│  Database: SQLite                                       │
│  ├── ruas_jalan     (270 ruas resmi)                   │
│  ├── osm_roads      (11.656 segmen)                    │
│  ├── desa_boundaries (278 desa)                        │
│  ├── laporan        (User reports)                     │
│  └── users          (Admin accounts)                   │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Tech Stack

### Frontend
- **React 18** + TypeScript-compatible JSX
- **Vite 5** — Build tool cepat
- **React Router 6** — Client-side routing
- **Leaflet + React-Leaflet** — Peta interaktif
- **Leaflet MarkerCluster** — Clustering marker
- **TensorFlow.js** — AI klasifikasi di browser
- **LocalForage** — IndexedDB untuk offline mode
- **Vite PWA Plugin** — Service Worker + manifest

### Backend
- **Node.js + Express 4** — REST API
- **better-sqlite3** — Database SQLite
- **bcryptjs** — Password hashing
- **jsonwebtoken** — JWT authentication
- **multer** — File upload handling
- **dotenv** — Environment variables

### Data & Mapping
- **OSRM (Open Source Routing Machine)** — Routing jalan asli
- **OpenStreetMap** — Tile layer & road data
- **GeoJSON** — Format data spasial
- **Polyline encoding/decoding** — Kompresi geometry

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0
- npm >= 9.0
- Python 3.x (opsional, untuk konversi data)

### 1. Clone Repository

```bash
git clone https://github.com/diskonnekted/lapor-jalan.git
cd lapor-jalan
```

### 2. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
cd ..
```

### 3. Setup Environment

```bash
# Copy dan edit file .env di folder backend
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```env
PORT=3005
JWT_SECRET=your-secret-key-here
GOOGLE_VISION_API_KEY=your-google-api-key (opsional)
```

### 4. Seed Database

```bash
cd backend
npm run seed        # Import 270 ruas jalan resmi
npm run seed-osm    # Import 11.656 segmen OSM
npm run seed-desa   # Import 278 desa/kelurahan
```

### 5. Jalankan Aplikasi

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Server berjalan di http://localhost:3005
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# Aplikasi berjalan di http://localhost:3006
```

### 6. Akses Aplikasi

| Halaman | URL | Deskripsi |
|---|---|---|
| 🗺️ Peta Publik | `http://localhost:3006` | Peta interaktif + filter layer |
| 📝 Lapor Kerusakan | `http://localhost:3006/lapor` | Form pelaporan + AI |
| 📋 Daftar Laporan | `http://localhost:3006/laporan` | Grid/Table view + filter |
| 🔐 Admin Login | `http://localhost:3006/admin/login` | Login admin |
| 🛠️ Admin Dashboard | `http://localhost:3006/admin/dashboard` | Manajemen laporan |

**Default Admin:**
- Username: `admin`
- Password: `admin123`

---

## 📱 Mobile PWA

Aplikasi otomatis mendeteksi perangkat mobile dan menampilkan interface mobile dengan:

- **Bottom Navigation** (Lapor, Laporan, Peta, Info)
- **Camera-first interface** — langsung buka kamera saat tab Lapor
- **Auto GPS detection** — lokasi, desa, kecamatan otomatis
- **Installable** — bisa di-install sebagai aplikasi Android

### Install di Android
1. Buka aplikasi di Chrome Android
2. Tap menu ⋮ → **"Install App"** atau **"Add to Home screen"**
3. Aplikasi akan muncul di home screen seperti aplikasi native

---

## 🗂️ Struktur Proyek

```
orionstack/
├── backend/
│   ├── server.js              # Express entry point
│   ├── db.js                  # SQLite setup + prepared statements
│   ├── seed.js                # Import ruas jalan resmi
│   ├── seed-osm.js            # Import segmen OSM
│   ├── seed-desa.js           # Import desa boundaries
│   ├── fix-desa.js            # Fix missing desa di laporan lama
│   ├── routes/
│   │   ├── auth.js            # POST /api/auth/login
│   │   ├── laporan.js         # CRUD laporan + upload foto
│   │   ├── ruasJalan.js       # Data ruas + OSRM routing
│   │   ├── desa.js            # Deteksi desa/kecamatan
│   │   └── ai.js              # Google Vision API
│   ├── middleware/auth.js     # JWT middleware
│   ├── uploads/               # Foto upload storage
│   └── data.sqlite            # Database (auto-created)
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Root component + mobile detect
│   │   ├── pages/
│   │   │   ├── Home.jsx       # Peta publik desktop
│   │   │   ├── ReportForm.jsx # Form pelaporan desktop
│   │   │   ├── LaporanList.jsx# Daftar laporan desktop
│   │   │   ├── MobileApp.jsx  # Mobile PWA (4 tab)
│   │   │   ├── AdminLogin.jsx # Login admin
│   │   │   └── AdminDashboard.jsx
│   │   ├── utils/
│   │   │   ├── api.js         # API client
│   │   │   ├── aiClassifier.js# TensorFlow.js MobileNet
│   │   │   ├── damageTypes.js # 14 jenis kerusakan
│   │   │   └── offlineStore.js# IndexedDB offline
│   │   └── components/
│   ├── public/
│   │   ├── manifest.json      # PWA manifest
│   │   └── icons/             # PWA icons
│   ├── index.html
│   └── vite.config.js         # Vite + PWA config
│
├── data/
│   ├── ruas_jalan.geojson     # 270 ruas jalan (converted)
│   ├── banjarnegara-jalan.geojson  # 11.656 segmen OSM
│   ├── peta_desa_v3.geojson   # 278 desa/kelurahan
│   ├── damage_types.json      # 14 jenis kerusakan
│   └── onlinkid_rambu.sql     # Source data SQL dump
│
├── vercel.json                # Vercel deployment config
├── railway.json               # Railway deployment config
├── convert_ruas_jalan.py      # SQL to GeoJSON converter
└── README.md
```

---

## 🗺️ Data Spasial

### Sumber Data

| Data | Sumber | Format | Jumlah |
|---|---|---|---|
| Ruas Jalan Resmi | Dinas PU Banjarnegara | SQL → GeoJSON | 270 ruas |
| Segmen Jalan OSM | OpenStreetMap extract | GeoJSON | 11.656 segmen |
| Batas Desa/Kelurahan | BPS/Pemda Banjarnegara | GeoJSON | 278 desa |
| Kecamatan | BPS Banjarnegara | (dalam file desa) | 20 kecamatan |

### Konversi Data

File SQL (`onlinkid_rambu.sql`) dikonversi ke GeoJSON menggunakan script Python:

```bash
python convert_ruas_jalan.py
# Output: data/ruas_jalan.geojson
```

---

## 🤖 AI Klasifikasi Kerusakan

### Google Cloud Vision API (Primary)
Menggunakan `LABEL_DETECTION` dan `WEB_DETECTION` untuk menganalisis foto kerusakan jalan.

**Keyword mapping:**
| Keyword | Berat | Label |
|---|---|---|
| pothole, broken, destroyed, collapse | 3 | Lubang/Rusak Parah |
| crack, fissure, erosion, damage | 2 | Retakan/Kerusakan |
| road, asphalt, pavement, construction | 0.5-1 | Jalan/Konstruksi |

### TensorFlow.js Fallback
Jika Google Vision API tidak tersedia (API key invalid / offline), aplikasi otomatis fallback ke MobileNet v2 yang berjalan di browser.

---

## 🏘️ Deteksi Desa/Kecamatan

Menggunakan algoritma **Ray-Casting Point-in-Polygon** untuk menentukan desa/kelurahan berdasarkan koordinat GPS:

1. User klik "Deteksi Lokasi Saya"
2. Browser mendapatkan koordinat lat/lng via GPS
3. Backend mencocokkan titik dengan boundary 278 desa
4. Jika cocok → auto-fill desa + kecamatan di form
5. Jika tidak cocok dalam batas → keterangan "Lokasi diluar Banjarnegara"

---

## 🔴 Deteksi Ruas Jalan Rusak

Sistem mendeteksi ruas jalan yang memiliki laporan kerusakan di sekitarnya:

1. Setiap laporan baru disimpan dengan koordinat GPS
2. Backend mencocokkan koordinat dengan geometry ruas jalan (OSRM)
3. Ruas jalan terdekat (< 500m) ditandai `hasDamage: true`
4. Di peta, ruas tersebut ditampilkan dengan **warna merah** dan tebal lebih besar

---

## 📊 Jenis Kerusakan (Standar Bina Marga)

| Kategori | Jenis | Default Severity |
|---|---|---|
| **Retakan** | Retak Buaya, Retak Memanjang, Retak Melintang, Retak Blok, Retak Tepi | Ringan-Sedang |
| **Lubang & Pelepasan** | Lubang (Pothole), Pengelupasan, Tambalan Rusak | Sedang |
| **Deformasi** | Alur (Rutting), Amblas/Penurunan, Gelembung/Bergelombang | Sedang-Berat |
| **Permukaan & Drainase** | Genangan Air, Aspal Meleleh, Bahu Jalan Turun | Ringan-Berat |

---

## 🌐 Deployment

### Opsi 1: Vercel + Railway (Rekomendasi)

```
Frontend → Vercel (gratis, CDN global)
Backend  → Railway (gratis, $5 credit/bulan)
```

**Langkah:**
1. Deploy backend ke Railway → set env vars (`JWT_SECRET`, dll)
2. Catat URL backend Railway
3. Deploy frontend ke Vercel → set `VITE_API_URL` = URL backend
4. Test!

Lihat [DEPLOY.md](DEPLOY.md) untuk panduan lengkap.

### Opsi 2: Self-Hosted (VPS)

```bash
# Install dependencies
npm install --prefix backend
npm install --prefix frontend

# Build frontend
cd frontend && npm run build

# Serve dengan PM2 + Nginx
pm2 start backend/server.js --name "api"
pm2 startup && pm2 save

# Nginx reverse proxy ke backend:3005 dan frontend dist
```

---

## 🔧 Environment Variables

### Backend (`.env`)

| Variable | Required | Default | Deskripsi |
|---|---|---|---|
| `PORT` | ✅ | `3005` | Port backend server |
| `JWT_SECRET` | ✅ | - | Secret key untuk JWT (harus panjang & random) |
| `GOOGLE_VISION_API_KEY` | ❌ | - | API key Google Cloud Vision (opsional) |

### Frontend

| Variable | Required | Default | Deskripsi |
|---|---|---|---|
| `VITE_API_URL` | ✅ (production) | `/api` (dev) | URL backend API |

---

## 🧪 API Endpoints

### Public
| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/laporan` | Daftar laporan (filter: status, tingkat, nama) |
| `GET` | `/api/laporan/stats` | Statistik laporan |
| `GET` | `/api/laporan/:id` | Detail laporan |
| `POST` | `/api/laporan` | Buat laporan baru (+ foto) |
| `POST` | `/api/laporan/bulk` | Bulk create (offline sync) |
| `GET` | `/api/ruas-jalan` | Data ruas jalan + OSM segments |
| `GET` | `/api/ruas-jalan/official` | Ruas jalan resmi + OSRM geometry |
| `GET` | `/api/desa/at-location?lat=X&lng=Y` | Deteksi desa berdasarkan koordinat |
| `GET` | `/api/desa/list` | Daftar semua desa per kecamatan |
| `POST` | `/api/ai/classify` | AI klasifikasi foto |

### Admin (Authenticated)
| Method | Endpoint | Deskripsi |
|---|---|---|
| `POST` | `/api/auth/login` | Login admin |
| `PATCH` | `/api/laporan/:id/status` | Update status laporan |
| `PUT` | `/api/laporan/:id` | Update full laporan |
| `DELETE` | `/api/laporan/:id` | Hapus laporan |
| `POST` | `/api/laporan/:id/foto-perbaikan` | Upload foto setelah perbaikan |

---

## 📸 Screenshots

<div align="center">

### Peta Interaktif
![Peta Interaktif](peta-jalan.jpg)
*Peta interaktif dengan layer ruas jalan, OSM roads, dan marker kerusakan*

### Mobile PWA
*(Tambahkan screenshot mobile di sini)*

### Admin Dashboard
*(Tambahkan screenshot dashboard di sini)*

</div>

---

## 🤝 Kontribusi

1. Fork repository
2. Buat branch fitur (`git checkout -b feature/nama-fitur`)
3. Commit perubahan (`git commit -m 'feat: deskripsi fitur'`)
4. Push ke branch (`git push origin feature/nama-fitur`)
5. Buat Pull Request

---

## 📝 License

[MIT License](LICENSE)

---

## 👨‍💻 Developer

**Clasnet Group**  
Software Development

---

<div align="center">

**Kabupaten Banjarnegara** 🗺️  
*Dibuat untuk memudahkan pelaporan dan monitoring kerusakan jalan*

</div>
