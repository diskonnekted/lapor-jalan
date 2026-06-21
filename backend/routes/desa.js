const express = require("express");
const { db } = require("../db");

const router = express.Router();

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

/**
 * Check if point is inside a polygon (supports MultiPolygon).
 */
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

// Cache parsed geometries
let cachedDesa = null;

/**
 * Load and parse all desa geometries (cached).
 */
function getDesaGeometries() {
  if (cachedDesa) return cachedDesa;
  const rows = db.prepare("SELECT * FROM desa_boundaries").all();
  cachedDesa = rows.map((d) => ({
    ...d,
    geometry: JSON.parse(d.geometry),
  }));
  return cachedDesa;
}

/**
 * GET /api/desa/at-location?lat=X&lng=Y
 * Returns the desa/kelurahan that contains the given point.
 */
router.get("/at-location", (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ error: "lat and lng are required" });
  }

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);

  const allDesa = getDesaGeometries();

  let matched = null;
  for (const desa of allDesa) {
    try {
      if (isPointInGeometry(lngNum, latNum, desa.geometry)) {
        matched = {
          nama_desa: desa.nama_desa,
          kecamatan: desa.kecamatan,
          kabupaten: "Banjarnegara",
        };
        break;
      }
    } catch (e) {
      // Skip invalid geometry
    }
  }

  if (matched) {
    res.json(matched);
  } else {
    res.json({
      nama_desa: null,
      kecamatan: null,
      kabupaten: "Banjarnegara",
      outside_boundary: true,
    });
  }
});

/**
 * GET /api/desa/list
 * Returns list of all desa grouped by kecamatan.
 */
router.get("/list", (req, res) => {
  const rows = db.prepare("SELECT nama_desa, kecamatan FROM desa_boundaries ORDER BY kecamatan, nama_desa").all();

  const grouped = {};
  rows.forEach((r) => {
    if (!grouped[r.kecamatan]) grouped[r.kecamatan] = [];
    grouped[r.kecamatan].push(r.nama_desa);
  });

  res.json(grouped);
});

/**
 * GET /api/desa/boundaries
 * Returns all desa boundaries (lightweight - only name, kecamatan, geometry).
 */
router.get("/boundaries", (req, res) => {
  const rows = db.prepare("SELECT nama_desa, kecamatan, geometry FROM desa_boundaries").all();
  res.json(rows);
});

module.exports = router;
