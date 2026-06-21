const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  getAllLaporan,
  getLaporanById,
  getLaporanStats,
  createLaporan,
  updateLaporanStatus,
  updateLaporan,
  deleteLaporan,
  searchLaporan,
  db,
} = require("../db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Multer config for photo upload
const storage = multer.diskStorage({
  destination: path.join(__dirname, "../uploads"),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, unique);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    cb(null, ext);
  },
});

// Public: Get all laporan (filtered)
router.get("/", (req, res) => {
  const { status, tingkat, nama } = req.query;

  if (status || tingkat || nama) {
    const results = searchLaporan.all({
      status: status || null,
      tingkat: tingkat || null,
      nama: nama || null,
    });
    return res.json(results);
  }

  const laporan = getAllLaporan.all();
  res.json(laporan);
});

// Public: Get stats
router.get("/stats", (req, res) => {
  const stats = getLaporanStats.get();
  // Replace null with 0 for empty table
  const cleanStats = {};
  for (const [k, v] of Object.entries(stats)) {
    cleanStats[k] = v === null ? 0 : v;
  }
  res.json(cleanStats);
});

// Public: Get single laporan
router.get("/:id", (req, res) => {
  const laporan = getLaporanById.get(req.params.id);
  if (!laporan) return res.status(404).json({ error: "Laporan not found" });
  res.json(laporan);
});

// Public: Create laporan (with optional photo upload)
router.post("/", upload.single("foto"), (req, res) => {
  const {
    nama_pelapor,
    no_hp,
    lat,
    lng,
    alamat,
    desa,
    kecamatan,
    jenis_kerusakan,
    tingkat_kerusakan,
    deskripsi,
    ai_prediction,
    ai_confidence,
  } = req.body;

  const fotoPath = req.file ? `/uploads/${req.file.filename}` : null;

  const result = createLaporan.run(
    nama_pelapor || null,
    no_hp || null,
    fotoPath,
    parseFloat(lat),
    parseFloat(lng),
    alamat || null,
    desa || null,
    kecamatan || null,
    jenis_kerusakan || null,
    tingkat_kerusakan || null,
    deskripsi || null,
    ai_prediction || null,
    ai_confidence ? parseFloat(ai_confidence) : null
  );

  res.status(201).json({ id: result.lastInsertRowid, message: "Laporan created" });
});

// Public: Bulk create (for offline sync)
router.post("/bulk", upload.array("fotos"), (req, res) => {
  let draftList;
  try {
    draftList = JSON.parse(req.body.drafts);
  } catch {
    return res.status(400).json({ error: "Invalid drafts JSON" });
  }

  if (!Array.isArray(draftList) || draftList.length === 0) {
    return res.status(400).json({ error: "No drafts provided" });
  }

  const uploadedFiles = req.files || [];
  let fileIndex = 0;
  const createdIds = [];

  const insertMany = require("../db").db.transaction((drafts) => {
    for (const draft of drafts) {
      let fotoPath = null;
      if (fileIndex < uploadedFiles.length) {
        fotoPath = `/uploads/${uploadedFiles[fileIndex].filename}`;
        fileIndex++;
      }

      const result = createLaporan.run(
        draft.nama_pelapor || null,
        draft.no_hp || null,
        fotoPath,
        parseFloat(draft.lat),
        parseFloat(draft.lng),
        draft.alamat || null,
        draft.desa || null,
        draft.kecamatan || null,
        draft.jenis_kerusakan || null,
        draft.tingkat_kerusakan || null,
        draft.deskripsi || null,
        draft.ai_prediction || null,
        draft.ai_confidence ? parseFloat(draft.ai_confidence) : null
      );
      createdIds.push(result.lastInsertRowid);
    }
  });

  insertMany.run(draftList);
  res.status(201).json({ ids: createdIds, message: `${createdIds.length} laporan created` });
});

// Admin only: Update status
router.patch("/:id/status", authMiddleware, (req, res) => {
  const { status } = req.body;
  const allowed = ["masuk", "diverifikasi", "diperbaiki", "selesai"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${allowed.join(", ")}` });
  }

  const laporan = getLaporanById.get(req.params.id);
  if (!laporan) return res.status(404).json({ error: "Laporan not found" });

  updateLaporanStatus.run(status, req.params.id);
  res.json({ message: "Status updated" });
});

// Admin only: Update full laporan
router.put("/:id", authMiddleware, (req, res) => {
  const { nama_pelapor, no_hp, tingkat_kerusakan, deskripsi, status } = req.body;
  const laporan = getLaporanById.get(req.params.id);
  if (!laporan) return res.status(404).json({ error: "Laporan not found" });

  updateLaporan.run(
    nama_pelapor || laporan.nama_pelapor,
    no_hp || laporan.no_hp,
    tingkat_kerusakan || laporan.tingkat_kerusakan,
    deskripsi || laporan.deskripsi,
    status || laporan.status,
    req.params.id
  );
  res.json({ message: "Laporan updated" });
});

// Admin only: Delete laporan
router.delete("/:id", authMiddleware, (req, res) => {
  const laporan = getLaporanById.get(req.params.id);
  if (!laporan) return res.status(404).json({ error: "Laporan not found" });

  // Delete associated photo files
  for (const photoField of ['foto_path', 'foto_perbaikan_path']) {
    if (laporan[photoField]) {
      const filePath = path.join(__dirname, "..", laporan[photoField]);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }

  deleteLaporan.run(req.params.id);
  res.json({ message: "Laporan deleted" });
});

// Upload foto perbaikan
router.post("/:id/foto-perbaikan", authMiddleware, upload.single("foto_perbaikan"), (req, res) => {
  const laporan = getLaporanById.get(req.params.id);
  if (!laporan) return res.status(404).json({ error: "Laporan not found" });

  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const fotoPath = `/uploads/${req.file.filename}`;

  db.prepare("UPDATE laporan SET foto_perbaikan_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
    fotoPath,
    req.params.id
  );

  res.json({ message: "Foto perbaikan uploaded", foto_path: fotoPath });
});

/**
 * POST /api/laporan/fix-desadata
 * Admin endpoint: auto-fill desa/kecamatan for laporan missing this data.
 * Uses point-in-polygon matching against desa_boundaries table.
 */
router.post("/fix-desadata", authMiddleware, (req, res) => {
  const { db } = require("../db");

  // Load desa boundaries
  const desaRows = db.prepare("SELECT * FROM desa_boundaries").all();
  const parsedDesa = desaRows.map((d) => ({
    ...d,
    geometry: JSON.parse(d.geometry),
  }));

  // Find laporan without desa
  const missingDesa = db.prepare(
    "SELECT id, lat, lng FROM laporan WHERE (desa IS NULL OR desa = '') AND lat IS NOT NULL"
  ).all();

  // Point-in-polygon
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

  const updateStmt = db.prepare(
    "UPDATE laporan SET desa = ?, kecamatan = ? WHERE id = ?"
  );

  const updateMany = db.transaction((updates) => {
    for (const u of updates) {
      updateStmt.run(u.desa, u.kecamatan, u.id);
    }
  });

  const updates = [];
  for (const l of missingDesa) {
    for (const d of parsedDesa) {
      try {
        if (isPointInGeometry(l.lng, l.lat, d.geometry)) {
          updates.push({ id: l.id, desa: d.nama_desa, kecamatan: d.kecamatan });
          break;
        }
      } catch (e) {}
    }
  }

  if (updates.length > 0) {
    updateMany(updates);
  }

  res.json({
    message: `Updated ${updates.length} laporan with desa/kecamatan`,
    updated: updates.length,
    remaining: missingDesa.length - updates.length,
  });
});

module.exports = router;
