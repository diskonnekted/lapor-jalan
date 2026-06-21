require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const authRoutes = require("./routes/auth");
const laporanRoutes = require("./routes/laporan");
const ruasJalanRoutes = require("./routes/ruasJalan");
const aiRoutes = require("./routes/ai");
const desaRoutes = require("./routes/desa");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/uploads", express.static(uploadDir));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/laporan", laporanRoutes);
app.use("/api/ruas-jalan", ruasJalanRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/desa", desaRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  // Warm up OSRM cache in background
  warmCache();
});

// Warm up OSRM route cache in background
async function warmCache() {
  try {
    const { db } = require("./db");
    const rows = db.prepare("SELECT id, from_lat, from_lng, to_lat, to_lng FROM ruas_jalan WHERE from_lat IS NOT NULL").all();
    console.log(`Warming OSRM cache for ${rows.length} roads...`);
    const { fetchOSRMRoute, decodePolyline, routeCache } = require("./routes/ruasJalan");
    if (!fetchOSRMRoute) {
      console.log("Cache warming skipped (functions not exported)");
      return;
    }
    for (let i = 0; i < rows.length; i += 5) {
      const batch = rows.slice(i, i + 5);
      await Promise.all(batch.map(async (r) => {
        const route = await fetchOSRMRoute(r.from_lng, r.from_lat, r.to_lng, r.to_lat);
        if (route && route.geometry) {
          routeCache.set(r.id.toString(), decodePolyline(route.geometry));
        }
      }));
      if (i % 50 === 0 && i > 0) {
        console.log(`  Cached ${i}/${rows.length}...`);
      }
      if (i + 5 < rows.length) await new Promise((resolve) => setTimeout(resolve, 200));
    }
    console.log(`OSRM cache warmed: ${routeCache.size}/${rows.length} routes ready`);
  } catch (err) {
    console.error("Cache warming error:", err.message);
  }
}

server.on("error", (err) => {
  console.error("Server error:", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});
