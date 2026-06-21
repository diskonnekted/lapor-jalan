const Database = require("better-sqlite3");
const path = require("path");
const bcrypt = require("bcryptjs");

const DB_PATH = path.join(__dirname, "data.sqlite");
const db = new Database(DB_PATH);

// Enable WAL mode and foreign keys
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Create tables
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ruas_jalan (
  id INTEGER PRIMARY KEY,
  nomor_ruas TEXT,
  nama_ruas TEXT NOT NULL,
  titik_awal TEXT,
  titik_akhir TEXT,
  from_lat REAL,
  from_lng REAL,
  to_lat REAL,
  to_lng REAL,
  panjang_km REAL,
  lebar_m REAL
);

CREATE TABLE IF NOT EXISTS laporan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama_pelapor TEXT,
  no_hp TEXT,
  foto_path TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  alamat TEXT,
  desa TEXT,
  kecamatan TEXT,
  jenis_kerusakan TEXT,
  tingkat_kerusakan TEXT CHECK(tingkat_kerusakan IN ('ringan', 'sedang', 'berat')),
  deskripsi TEXT,
  ai_prediction TEXT,
  ai_confidence REAL,
  status TEXT DEFAULT 'masuk' CHECK(status IN ('masuk', 'diverifikasi', 'diperbaiki', 'selesai')),
  foto_perbaikan_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS laporan_draft (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama_pelapor TEXT,
  no_hp TEXT,
  foto_data TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  alamat TEXT,
  tingkat_kerusakan TEXT,
  deskripsi TEXT,
  ai_prediction TEXT,
  ai_confidence REAL,
  synced INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// Add new columns if they don't exist (for existing databases)
try {
  db.exec("ALTER TABLE laporan ADD COLUMN foto_perbaikan_path TEXT");
} catch (e) {}
try {
  db.exec("ALTER TABLE laporan ADD COLUMN jenis_kerusakan TEXT");
} catch (e) {}
try {
  db.exec("ALTER TABLE laporan ADD COLUMN desa TEXT");
} catch (e) {}
try {
  db.exec("ALTER TABLE laporan ADD COLUMN kecamatan TEXT");
} catch (e) {}

// Create default admin user if not exists
const existingUser = db.prepare("SELECT id FROM users WHERE username = ?").get("admin");
if (!existingUser) {
  const hash = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run(
    "admin",
    hash,
    "admin"
  );
  console.log("Default admin user created (username: admin, password: admin123)");
}

// Prepared statements
module.exports = {
  db,
  // Users
  getUserByUsername: db.prepare("SELECT * FROM users WHERE username = ?"),
  // Ruas Jalan
  getAllRuasJalan: db.prepare("SELECT * FROM ruas_jalan"),
  getRuasJalanById: db.prepare("SELECT * FROM ruas_jalan WHERE id = ?"),
  // Laporan
  getAllLaporan: db.prepare(
    "SELECT * FROM laporan ORDER BY created_at DESC"
  ),
  getLaporanById: db.prepare("SELECT * FROM laporan WHERE id = ?"),
  getLaporanStats: db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'masuk' THEN 1 ELSE 0 END) as masuk,
      SUM(CASE WHEN status = 'diverifikasi' THEN 1 ELSE 0 END) as diverifikasi,
      SUM(CASE WHEN status = 'diperbaiki' THEN 1 ELSE 0 END) as diperbaiki,
      SUM(CASE WHEN status = 'selesai' THEN 1 ELSE 0 END) as selesai,
      SUM(CASE WHEN tingkat_kerusakan = 'ringan' THEN 1 ELSE 0 END) as ringan,
      SUM(CASE WHEN tingkat_kerusakan = 'sedang' THEN 1 ELSE 0 END) as sedang,
      SUM(CASE WHEN tingkat_kerusakan = 'berat' THEN 1 ELSE 0 END) as berat
    FROM laporan
  `),
  createLaporan: db.prepare(`
    INSERT INTO laporan (nama_pelapor, no_hp, foto_path, lat, lng, alamat, desa, kecamatan, jenis_kerusakan, tingkat_kerusakan, deskripsi, ai_prediction, ai_confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  updateLaporanStatus: db.prepare(`
    UPDATE laporan SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `),
  updateLaporan: db.prepare(`
    UPDATE laporan SET nama_pelapor = ?, no_hp = ?, tingkat_kerusakan = ?, deskripsi = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `),
  deleteLaporan: db.prepare("DELETE FROM laporan WHERE id = ?"),
  searchLaporan: db.prepare(`
    SELECT * FROM laporan
    WHERE (:status IS NULL OR status = :status)
      AND (:tingkat IS NULL OR tingkat_kerusakan = :tingkat)
      AND (:nama IS NULL OR nama_pelapor LIKE '%' || :nama || '%' OR alamat LIKE '%' || :nama || '%')
    ORDER BY created_at DESC
  `),
};
