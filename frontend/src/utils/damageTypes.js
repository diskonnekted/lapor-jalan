export const DAMAGE_TYPES = [
  {
    id: "crack_alligator",
    category: "Retakan",
    label: "Retak Buaya (Jaring)",
    description: "Retakan saling terhubung menyerupai kulit buaya",
    severity_default: "sedang",
  },
  {
    id: "crack_longitudinal",
    category: "Retakan",
    label: "Retak Memanjang",
    description: "Garis retakan searah dengan arah jalan",
    severity_default: "ringan",
  },
  {
    id: "crack_transverse",
    category: "Retakan",
    label: "Retak Melintang",
    description: "Garis retakan memotong melintang arah jalan",
    severity_default: "ringan",
  },
  {
    id: "crack_block",
    category: "Retakan",
    label: "Retak Blok",
    description: "Retakan membentuk pola kotak-kotak atau balok",
    severity_default: "sedang",
  },
  {
    id: "crack_edge",
    category: "Retakan",
    label: "Retak Tepi",
    description: "Retakan di pinggiran jalan",
    severity_default: "ringan",
  },
  {
    id: "dis_pothole",
    category: "Lubang & Pelepasan",
    label: "Lubang (Pothole)",
    description: "Terdapat lubang pada permukaan jalan",
    severity_default: "sedang",
  },
  {
    id: "dis_raveling",
    category: "Lubang & Pelepasan",
    label: "Pengelupasan / Berkerikil",
    description: "Permukaan jalan kasar, batu kerikil lepas",
    severity_default: "ringan",
  },
  {
    id: "dis_patching",
    category: "Lubang & Pelepasan",
    label: "Tambalan Rusak",
    description: "Kerusakan pada area yang sudah ditambal",
    severity_default: "sedang",
  },
  {
    id: "def_rutting",
    category: "Deformasi",
    label: "Alur (Rutting)",
    description: "Cekungan memanjang pada bekas lintasan roda",
    severity_default: "sedang",
  },
  {
    id: "def_settlement",
    category: "Deformasi",
    label: "Amblas / Penurunan",
    description: "Permukaan jalan turun/ambles membentuk cekungan",
    severity_default: "berat",
  },
  {
    id: "def_corrugation",
    category: "Deformasi",
    label: "Gelembung / Bergelombang",
    description: "Permukaan jalan menonjol atau bergelombang",
    severity_default: "sedang",
  },
  {
    id: "surf_ponding",
    category: "Permukaan & Drainase",
    label: "Genangan Air",
    description: "Air menggenang di badan jalan",
    severity_default: "ringan",
  },
  {
    id: "surf_bleeding",
    category: "Permukaan & Drainase",
    label: "Aspal Meleleh (Licin)",
    description: "Aspal berlebih, hitam mengkilap dan licin",
    severity_default: "sedang",
  },
  {
    id: "surf_shoulder_drop",
    category: "Permukaan & Drainase",
    label: "Bahu Jalan Turun",
    description: "Tebing/penurunan tajam di tepi jalan",
    severity_default: "berat",
  },
];

// Group by category
export const DAMAGE_TYPES_BY_CATEGORY = {};
DAMAGE_TYPES.forEach((dt) => {
  if (!DAMAGE_TYPES_BY_CATEGORY[dt.category]) {
    DAMAGE_TYPES_BY_CATEGORY[dt.category] = [];
  }
  DAMAGE_TYPES_BY_CATEGORY[dt.category].push(dt);
});

// Lookup by id
export const getDamageTypeById = (id) => DAMAGE_TYPES.find((dt) => dt.id === id);
