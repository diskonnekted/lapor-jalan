/**
 * Seed script: imports ruas_jalan data from GeoJSON into SQLite.
 * Run: npm run seed
 */
const fs = require("fs");
const path = require("path");

// Import db.js first to ensure tables are created, then use its db instance
const { db } = require("./db");

const GEOJSON_PATH = path.join(__dirname, "data/ruas_jalan.geojson");

if (!fs.existsSync(GEOJSON_PATH)) {
  console.error("GeoJSON file not found:", GEOJSON_PATH);
  process.exit(1);
}

const geojson = JSON.parse(fs.readFileSync(GEOJSON_PATH, "utf-8"));
const features = geojson.features;

console.log(`Importing ${features.length} ruas jalan into SQLite...`);

// Clear existing data
db.exec("DELETE FROM ruas_jalan");

const insert = db.prepare(`
  INSERT OR REPLACE INTO ruas_jalan (id, nomor_ruas, nama_ruas, titik_awal, titik_akhir, from_lat, from_lng, to_lat, to_lng, panjang_km, lebar_m)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertMany = db.transaction((rows) => {
  for (const r of rows) {
    insert.run(r);
  }
});

const rows = features
  .map((f) => {
    const p = f.properties;
    const c = f.geometry.coordinates;
    return [
      p.id,
      p.nomor_ruas || "",
      p.nama_ruas || "Unknown",
      p.titik_awal || "",
      p.titik_akhir || "",
      c[0][1], // from_lat
      c[0][0], // from_lng
      c[1][1], // to_lat
      c[1][0], // to_lng
      p.panjang_km || 0,
      p.lebar_m || 0,
    ];
  })
  .filter((r) => r[2] !== "Unknown" || r[0] !== null); // keep all, but default name

insertMany(rows);

const count = db.prepare("SELECT COUNT(*) as c FROM ruas_jalan").get();
console.log(`Done! ${count.c} ruas jalan imported.`);
db.close();
