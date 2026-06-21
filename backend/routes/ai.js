const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const https = require("https");

const router = express.Router();

const GOOGLE_API_KEY = process.env.GOOGLE_VISION_API_KEY;

console.log('Google Vision API Key loaded:', GOOGLE_API_KEY ? 'Yes (' + GOOGLE_API_KEY.substring(0, 10) + '...)' : 'NO - Check .env file');

// Multer config
const storage = multer.diskStorage({
  destination: path.join(__dirname, "../uploads/temp"),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, unique);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
  },
});

// Ensure temp dir exists
const tempDir = path.join(__dirname, "../uploads/temp");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

/**
 * POST /api/ai/classify
 * Upload an image and get AI damage classification via Google Vision API.
 */
router.post("/classify", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image file provided" });
  }

  // Read image as base64
  const imageBuffer = fs.readFileSync(req.file.path);
  const imageBase64 = imageBuffer.toString("base64");

  // Clean up temp file
  fs.unlinkSync(req.file.path);

  // Google Vision API request
  const requestBody = JSON.stringify({
    requests: [
      {
        image: { content: imageBase64 },
        features: [
          { type: "LABEL_DETECTION", maxResults: 15 },
          { type: "WEB_DETECTION", maxResults: 5 },
        ],
      },
    ],
  });

  const options = {
    hostname: "vision.googleapis.com",
    path: `/v1/images:annotate?key=${GOOGLE_API_KEY}`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(requestBody),
    },
  };

  const visionReq = https.request(options, (visionRes) => {
    let data = "";
    visionRes.on("data", (chunk) => (data += chunk));
    visionRes.on("end", () => {
      try {
        const result = JSON.parse(data);
        if (result.error) {
          console.error("Vision API Error:", JSON.stringify(result.error));
          return res.status(500).json({ error: "Vision API: " + result.error.message });
        }
        // Debug: log raw labels
        const labels = result.responses?.[0]?.labelAnnotations || [];
        console.log("Vision API labels:", labels.map(l => `${l.description} (${Math.round(l.score * 100)}%)`).join(", "));
        const response = analyzeDamage(result);
        res.json(response);
      } catch {
        console.error("Failed to parse Vision API response:", data.substring(0, 200));
        res.status(500).json({ error: "Failed to parse Vision API response" });
      }
    });
  });

  visionReq.on("error", (err) => {
    console.error("Vision API request error:", err.message);
    res.status(500).json({ error: "Vision API request failed: " + err.message });
  });

  visionReq.write(requestBody);
  visionReq.end();
});

/**
 * Analyze Google Vision API response to classify road damage.
 */
function analyzeDamage(visionResult) {
  const responses = visionResult.responses;
  if (!responses || !responses[0]) {
    return {
      prediction: "unknown",
      confidence: 0,
      message: "No analysis result",
    };
  }

  const labels = responses[0].labelAnnotations || [];
  const webLabels = responses[0].webDetection?.webEntities || [];
  const allLabels = [...labels, ...webLabels];

  // Damage-related keywords with severity weights
  const damageKeywords = {
    // Severe indicators
    "pothole": { weight: 3, label: "Lubang Jalan" },
    "crack": { weight: 2, label: "Retakan" },
    "fissure": { weight: 2, label: "Celah" },
    "broken": { weight: 3, label: "Rusak" },
    "destroyed": { weight: 3, label: "Hancur" },
    "collapse": { weight: 3, label: "Longsor/Runtuh" },
    "erosion": { weight: 2, label: "Erosi" },
    "landslide": { weight: 3, label: "Longsor" },
    "damage": { weight: 2, label: "Kerusakan" },
    "damaged": { weight: 2, label: "Rusak" },

    // Moderate indicators
    "road damage": { weight: 2, label: "Kerusakan Jalan" },
    "wear": { weight: 1, label: "Keausan" },
    "weathering": { weight: 1, label: "Pelapukan" },
    "asphalt": { weight: 1, label: "Aspal" },
    "pavement": { weight: 1, label: "Perkerasan" },
    "rough": { weight: 2, label: "Permukaan Kasar" },
    "road": { weight: 0.5, label: "Jalan" },
    "street": { weight: 0.5, label: "Jalan Raya" },
    "construction": { weight: 1, label: "Konstruksi" },
    "repair": { weight: 1, label: "Perbaikan" },
    "hole": { weight: 2, label: "Lubang" },
    "dirt": { weight: 1, label: "Tanah/Kotor" },
    "debris": { weight: 2, label: "Puing" },
    "gravel": { weight: 1, label: "Kerikil" },
    "mud": { weight: 1, label: "Lumpur" },
  };

  let damageScore = 0;
  let detectedFeatures = [];
  let maxConfidence = 0;

  for (const label of allLabels) {
    const text = (label.description || "").toLowerCase();
    const score = label.score || 0;

    for (const [keyword, info] of Object.entries(damageKeywords)) {
      if (text.includes(keyword)) {
        damageScore += info.weight * score;
        detectedFeatures.push({
          keyword: info.label,
          confidence: Math.round(score * 100),
          weight: info.weight,
        });
        if (score > maxConfidence) maxConfidence = score;
        break;
      }
    }
  }

  // If no damage detected but we have road-related labels, give a mild score
  const hasRoadContext = allLabels.some(l =>
    (l.description || "").toLowerCase().includes("road") ||
    (l.description || "").toLowerCase().includes("street") ||
    (l.description || "").toLowerCase().includes("asphalt")
  );

  if (damageScore === 0 && hasRoadContext) {
    damageScore = 0.3; // Minimal score if road is detected but no damage
  }

  // Classify severity based on damage score
  let prediction, confidence;
  if (damageScore >= 3) {
    prediction = "berat";
    confidence = Math.min(Math.round(damageScore * 25), 95);
  } else if (damageScore >= 1.5) {
    prediction = "sedang";
    confidence = Math.min(Math.round(damageScore * 30), 90);
  } else if (damageScore >= 0.5) {
    prediction = "ringan";
    confidence = Math.min(Math.round(damageScore * 40), 80);
  } else {
    prediction = "tidak_terdeteksi";
    confidence = Math.max(0, Math.min(Math.round((1 - damageScore) * 70), 85));
  }

  return {
    prediction,
    confidence,
    damageScore: Math.round(damageScore * 100) / 100,
    detectedFeatures: detectedFeatures.slice(0, 5),
    rawLabels: labels.slice(0, 10).map((l) => ({
      label: l.description,
      confidence: Math.round(l.score * 100),
    })),
  };
}

module.exports = router;
