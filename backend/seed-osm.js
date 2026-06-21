/**
 * Seed script: imports banjarnegara-jalan.geojson (OSM road segments) into SQLite.
 * Run: npm run seed-osm
 */
const fs = require("fs");
const path = require("path");

// Import db.js first to ensure tables are created
require("./db");
const { db } = require("./db");

const GEOJSON_PATH = path.join(__dirname, "../data/banjarnegara-jalan.geojson");

if (!fs.existsSync(GEOJSON_PATH)) {
  console.error("GeoJSON file not found:", GEOJSON_PATH);
  process.exit(1);
}

console.log("Reading banjarnegara-jalan.geojson...");
const geojson = JSON.parse(fs.readFileSync(GEOJSON_PATH, "utf-8"));
const features = geojson.features;
console.log(`Found ${features.length} road segments`);

// Create table for OSM road segments
db.exec(`
CREATE TABLE IF NOT EXISTS osm_roads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  osm_id INTEGER,
  name TEXT,
  ref TEXT,
  type TEXT,
  oneway INTEGER DEFAULT 0,
  bridge INTEGER DEFAULT 0,
  maxspeed TEXT,
  geometry TEXT NOT NULL
);
`);

// Clear existing data
db.exec("DELETE FROM osm_roads");

const insert = db.prepare(`
  INSERT INTO osm_roads (osm_id, name, ref, type, oneway, bridge, maxspeed, geometry)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertMany = db.transaction((rows) => {
  for (const r of rows) {
    insert.run(r);
  }
});

const rows = features.map((f) => {
  const p = f.properties;
  const coords = f.geometry.coordinates;
  return [
    p.osm_id || null,
    p.name || null,
    p.ref || null,
    p.type || "unknown",
    p.oneway || 0,
    p.bridge || 0,
    p.maxspeed || null,
    JSON.stringify(coords),
  ];
});

console.log("Inserting into SQLite...");
insertMany(rows);

const count = db.prepare("SELECT COUNT(*) as c FROM osm_roads").get();
console.log(`Done! ${count.c} OSM road segments imported.`);

// Show type breakdown
const breakdown = db.prepare("SELECT type, COUNT(*) as cnt FROM osm_roads GROUP BY type ORDER BY cnt DESC").all();
console.log("\nType breakdown:");
breakdown.forEach((r) => console.log(`  ${r.type}: ${r.cnt}`));

db.close();
