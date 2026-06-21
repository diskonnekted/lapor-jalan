/**
 * Script to fix existing laporan records that are missing desa/kecamatan.
 * Uses point-in-polygon to detect desa from lat/lng.
 * Run: node fix-desa.js
 */
require("dotenv").config();
const { db } = require("./db");

/**
 * Ray-casting point-in-polygon algorithm.
 */
function isPointInPolygon(lng, lat, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function isPointInGeometry(lng, lat, geometry) {
  if (geometry.type === "Polygon") {
    return isPointInPolygon(lng, lat, geometry.coordinates[0]);
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((polygon) =>
      isPointInPolygon(lng, lat, polygon[0])
    );
  }
  return false;
}

async function fixDesaData() {
  console.log("Loading desa boundaries...");
  const desaRows = db.prepare("SELECT * FROM desa_boundaries").all();
  console.log(`Loaded ${desaRows.length} desa boundaries`);

  // Parse geometries for faster lookup
  const parsedDesa = desaRows.map((d) => ({
    ...d,
    geometry: JSON.parse(d.geometry),
  }));

  console.log("Finding laporan without desa/kecamatan...");
  const missingDesa = db.prepare(
    "SELECT id, lat, lng FROM laporan WHERE (desa IS NULL OR desa = '') AND lat IS NOT NULL"
  ).all();

  console.log(`Found ${missingDesa.length} laporan without desa`);
  if (missingDesa.length === 0) {
    console.log("Nothing to fix. Exiting.");
    db.close();
    return;
  }

  const updateStmt = db.prepare(
    "UPDATE laporan SET desa = ?, kecamatan = ? WHERE id = ?"
  );

  const updateMany = db.transaction((updates) => {
    for (const u of updates) {
      updateStmt.run(u.desa, u.kecamatan, u.id);
    }
  });

  const updates = [];
  let notFound = 0;

  for (const l of missingDesa) {
    let matched = null;
    for (const d of parsedDesa) {
      try {
        if (isPointInGeometry(l.lng, l.lat, d.geometry)) {
          matched = {
            id: l.id,
            desa: d.nama_desa,
            kecamatan: d.kecamatan,
          };
          break;
        }
      } catch (e) {
        // Skip invalid geometry
      }
    }

    if (matched) {
      updates.push(matched);
    } else {
      notFound++;
    }
  }

  if (updates.length > 0) {
    console.log(`Updating ${updates.length} laporan...`);
    updateMany(updates);
    console.log(`✅ Updated ${updates.length} laporan with desa/kecamatan`);
  }

  if (notFound > 0) {
    console.log(`⚠️ ${notFound} laporan could not be matched to any desa (coordinates outside boundaries)`);
  }

  // Verify
  const remaining = db.prepare(
    "SELECT COUNT(*) as c FROM laporan WHERE (desa IS NULL OR desa = '') AND lat IS NOT NULL"
  ).get();
  console.log(`Remaining without desa: ${remaining.c}`);

  db.close();
}

fixDesaData().catch(console.error);
