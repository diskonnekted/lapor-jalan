const express = require("express");
const https = require("https");
const { getAllRuasJalan, getRuasJalanById, db } = require("../db");

const router = express.Router();

// Cache for OSRM-generated routes (in-memory)
const routeCache = new Map();

/**
 * Haversine distance in km
 */
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Check if a point is close to a polyline (road geometry).
 * Returns the minimum distance in km.
 */
function pointToLineDistance(pointLat, pointLng, geometry) {
  let minDist = Infinity;
  for (let i = 0; i < geometry.length; i++) {
    const d = haversine(pointLat, pointLng, geometry[i][0], geometry[i][1]);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

/**
 * Fetch OSRM route between two points.
 * Returns route object with polyline geometry.
 */
function fetchOSRMRoute(fromLng, fromLat, toLng, toLat) {
  return new Promise((resolve, reject) => {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=polyline&steps=false`;
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (json.code === "Ok" && json.routes && json.routes.length > 0) {
              resolve(json.routes[0]);
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        });
      })
      .on("error", () => resolve(null));
  });
}

/**
 * Decode polyline string to array of [lat, lng] pairs.
 */
function decodePolyline(encoded) {
  const coordinates = [];
  let index = 0,
    lat = 0,
    lng = 0;
  while (index < encoded.length) {
    let b,
      shift = 0,
      result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;
    coordinates.push([lat / 1e5, lng / 1e5]);
  }
  return coordinates;
}

/**
 * Mark roads that have damage reports nearby.
 * Strategy: For each report, find the SINGLE nearest road and mark it.
 * This avoids coloring parallel/intersecting roads.
 */
function markDamagedRoads(results) {
  const laporan = db.prepare("SELECT lat, lng FROM laporan WHERE lat IS NOT NULL").all();
  if (laporan.length === 0) {
    return results.map((r) => ({ ...r, hasDamage: false }));
  }

  // Initialize all as no damage
  results.forEach((r) => { r.hasDamage = false; });

  // For each report, find the nearest road
  for (const l of laporan) {
    let minDist = Infinity;
    let nearestId = null;

    for (const r of results) {
      if (!r.geometry) continue;
      const dist = pointToLineDistance(l.lat, l.lng, r.geometry);
      if (dist < minDist) {
        minDist = dist;
        nearestId = r.id;
      }
    }

    // Only mark if within 500m (reasonable max distance for road matching)
    if (nearestId !== null && minDist < 0.5) {
      const road = results.find((r) => r.id === nearestId);
      if (road) road.hasDamage = true;
    }
  }

  return results;
}

/**
 * Get official ruas jalan with OSRM-generated route geometry.
 * Also marks roads with nearby damage reports (within 150m).
 */
router.get("/official", async (req, res) => {
  const ruasJalan = getAllRuasJalan.all();

  // Check cache first, fetch OSRM for uncached ones
  const results = [];
  const toFetch = [];

  for (const r of ruasJalan) {
    const cacheKey = `${r.id}`;
    if (routeCache.has(cacheKey)) {
      results.push({ ...r, geometry: routeCache.get(cacheKey) });
    } else {
      toFetch.push(r);
    }
  }

  // If all cached, just mark damaged and return
  if (toFetch.length === 0) {
    return res.json(markDamagedRoads(results));
  }

  // Fetch OSRM routes in batches to avoid rate limiting
  for (let i = 0; i < toFetch.length; i += 5) {
    const batch = toFetch.slice(i, i + 5);
    const promises = batch.map(async (r) => {
      const route = await fetchOSRMRoute(r.from_lng, r.from_lat, r.to_lng, r.to_lat);
      let geometry;
      if (route && route.geometry) {
        geometry = decodePolyline(route.geometry);
      } else {
        geometry = [
          [r.from_lat, r.from_lng],
          [r.to_lat, r.to_lng],
        ];
      }
      routeCache.set(r.id.toString(), geometry);
      results.push({ ...r, geometry });
    });
    await Promise.all(promises);
    if (i + 5 < toFetch.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  res.json(markDamagedRoads(results));
});

/**
 * Get all OSM road segments with geometry.
 */
router.get("/", (req, res) => {
  const { types } = req.query;

  if (types) {
    const typeList = types.split(",").map((t) => t.trim());
    const placeholders = typeList.map(() => "?").join(",");
    const rows = db
      .prepare(`SELECT * FROM osm_roads WHERE type IN (${placeholders})`)
      .all(...typeList);

    const result = rows.map((r) => ({
      ...r,
      geometry: JSON.parse(r.geometry),
    }));

    return res.json(result);
  }

  const mainRoads = db
    .prepare(
      `SELECT * FROM osm_roads WHERE type IN ('primary', 'secondary', 'tertiary', 'trunk', 'unclassified', 'living_street')`
    )
    .all();

  const result = mainRoads.map((r) => ({
    ...r,
    geometry: JSON.parse(r.geometry),
  }));

  res.json(result);
});

module.exports = router;

// Export for cache warming
module.exports.fetchOSRMRoute = fetchOSRMRoute;
module.exports.decodePolyline = decodePolyline;
module.exports.routeCache = routeCache;
