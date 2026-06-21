/**
 * Seed script: imports peta_desa_v3.geojson (village boundaries) into SQLite.
 * Run: npm run seed-desa
 */
const fs = require("fs");
const path = require("path");

require("./db");
const { db } = require("./db");

const GEOJSON_PATH = path.join(__dirname, "data/peta_desa_v3.geojson");

if (!fs.existsSync(GEOJSON_PATH)) {
  console.error("GeoJSON file not found:", GEOJSON_PATH);
  process.exit(1);
}

console.log("Reading peta_desa_v3.geojson...");
const geojson = JSON.parse(fs.readFileSync(GEOJSON_PATH, "utf-8"));
const features = geojson.features;
console.log(`Found ${features.length} desa/kelurahan`);

// Create table for desa boundaries
db.exec(`
CREATE TABLE IF NOT EXISTS desa_boundaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  object_id INTEGER,
  nama_desa TEXT NOT NULL,
  kecamatan TEXT,
  kabupaten TEXT,
  geometry TEXT NOT NULL
);
`);

// Clear existing data
db.exec("DELETE FROM desa_boundaries");

const insert = db.prepare(`
  INSERT INTO desa_boundaries (object_id, nama_desa, kecamatan, kabupaten, geometry)
  VALUES (?, ?, ?, ?, ?)
`);

const insertMany = db.transaction((rows) => {
  for (const r of rows) {
    insert.run(r);
  }
});

const rows = features.map((f) => {
  const p = f.properties;
  return [
    p.OBJECTID || null,
    p.Nama_Desa_ || null,
    p.Kecamatan || null,
    p.Kabupaten || null,
    JSON.stringify(f.geometry),
  ];
});

console.log("Inserting into SQLite...");
insertMany(rows);

const count = db.prepare("SELECT COUNT(*) as c FROM desa_boundaries").get();
console.log(`Done! ${count.c} desa boundaries imported.`);

// Show kecamatan breakdown
const breakdown = db.prepare("SELECT kecamatan, COUNT(*) as cnt FROM desa_boundaries GROUP BY kecamatan ORDER BY cnt DESC").all();
console.log("\nKecamatan breakdown:");
breakdown.forEach((r) => console.log(`  ${r.kecamatan}: ${r.cnt} desa`));

db.close();
