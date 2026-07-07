/**
 * Ước tính tỷ lệ mỡ cơ thể theo công thức Hải quân Mỹ (US Navy Method).
 * Đây là công thức đo nhân trắc học (dùng vòng cổ/eo/hông), được các huấn
 * luyện viên và quân đội Mỹ khuyên dùng vì không cần thiết bị chuyên dụng
 * (so với DEXA/InBody) nhưng vẫn cho sai số chấp nhận được (~3-4%).
 *
 * Nguồn công thức: Hodgdon & Beckett (1984), Naval Health Research Center.
 */

export type Gender = "male" | "female";

export interface NavyInput {
  gender: Gender;
  heightCm: number;
  neckCm: number;
  waistCm: number;
  hipCm?: number; // bắt buộc với nữ
  weightKg?: number;
}

export interface NavyResult {
  bodyFatPercent: number;
  category: string;
  categoryTone: "gold" | "primary" | "secondary" | "danger" | "neutral";
  leanMassKg: number | null;
  fatMassKg: number | null;
  muscleTier: "low" | "moderate" | "athletic" | "very_lean";
  muscleTierLabel: string;
}

function log10(x: number) {
  return Math.log(x) / Math.LN10;
}

/** Tính % mỡ cơ thể. Trả về null nếu số đo không hợp lệ (vd. eo <= cổ ở nam). */
export function calculateNavyBodyFat(input: NavyInput): number | null {
  const { gender, heightCm, neckCm, waistCm, hipCm } = input;
  if (!heightCm || !neckCm || !waistCm) return null;

  if (gender === "male") {
    const diff = waistCm - neckCm;
    if (diff <= 0) return null;
    const bf = 495 / (1.0324 - 0.19077 * log10(diff) + 0.15456 * log10(heightCm)) - 450;
    return Math.round(bf * 10) / 10;
  }

  if (!hipCm) return null;
  const sum = waistCm + hipCm - neckCm;
  if (sum <= 0) return null;
  const bf = 495 / (1.29579 - 0.35004 * log10(sum) + 0.221 * log10(heightCm)) - 450;
  return Math.round(bf * 10) / 10;
}

/** Phân loại theo thang ACE (American Council on Exercise). */
export function classifyBodyFat(bodyFatPercent: number, gender: Gender): { label: string; tone: NavyResult["categoryTone"] } {
  const ranges =
    gender === "male"
      ? [
          { max: 5, label: "Mỡ thiết yếu", tone: "danger" as const },
          { max: 13, label: "Vận động viên", tone: "gold" as const },
          { max: 17, label: "Thể hình tốt", tone: "primary" as const },
          { max: 24, label: "Chấp nhận được", tone: "secondary" as const },
          { max: Infinity, label: "Béo phì", tone: "danger" as const },
        ]
      : [
          { max: 13, label: "Mỡ thiết yếu", tone: "danger" as const },
          { max: 20, label: "Vận động viên", tone: "gold" as const },
          { max: 24, label: "Thể hình tốt", tone: "primary" as const },
          { max: 31, label: "Chấp nhận được", tone: "secondary" as const },
          { max: Infinity, label: "Béo phì", tone: "danger" as const },
        ];
  const found = ranges.find((r) => bodyFatPercent <= r.max) || ranges[ranges.length - 1];
  return { label: found.label, tone: found.tone };
}

/**
 * Ước lượng "mức độ cơ bắp" (muscle tier) — đây là chỉ số MINH HOẠ dựa trên
 * tỷ lệ khối nạc (lean mass %), KHÔNG phải phép đo khối lượng cơ chính xác
 * như DEXA. Dùng để lái hình dáng mô hình 3D minh hoạ.
 */
function estimateMuscleTier(bodyFatPercent: number, gender: Gender): { tier: NavyResult["muscleTier"]; label: string } {
  const leanPercent = 100 - bodyFatPercent;
  const thresholds = gender === "male" ? { athletic: 88, moderate: 80 } : { athletic: 82, moderate: 74 };
  if (bodyFatPercent < (gender === "male" ? 7 : 15)) return { tier: "very_lean", label: "Rất săn chắc" };
  if (leanPercent >= thresholds.athletic) return { tier: "athletic", label: "Cơ bắp phát triển tốt" };
  if (leanPercent >= thresholds.moderate) return { tier: "moderate", label: "Cơ bắp trung bình" };
  return { tier: "low", label: "Nên tăng cường tập luyện cơ" };
}

export function computeNavyResult(input: NavyInput): NavyResult | null {
  const bf = calculateNavyBodyFat(input);
  if (bf === null || bf < 2 || bf > 60) return null;

  const { label, tone } = classifyBodyFat(bf, input.gender);
  const { tier, label: muscleLabel } = estimateMuscleTier(bf, input.gender);

  let leanMassKg: number | null = null;
  let fatMassKg: number | null = null;
  if (input.weightKg) {
    fatMassKg = Math.round(input.weightKg * (bf / 100) * 10) / 10;
    leanMassKg = Math.round((input.weightKg - fatMassKg) * 10) / 10;
  }

  return {
    bodyFatPercent: bf,
    category: label,
    categoryTone: tone,
    leanMassKg,
    fatMassKg,
    muscleTier: tier,
    muscleTierLabel: muscleLabel,
  };
}

/**
 * Chuyển kết quả body-fat/muscle-tier thành các tham số hình học (0..1)
 * để component mô hình 3D scale vòng eo, vai, tay chân cho phù hợp.
 */
export function shapeParamsFromResult(result: NavyResult, gender: Gender) {
  // waist: 0 = rất gọn, 1 = rất to
  const waist = Math.max(0, Math.min(1, (result.bodyFatPercent - (gender === "male" ? 6 : 14)) / (gender === "male" ? 26 : 26)));
  const muscleMap: Record<NavyResult["muscleTier"], number> = {
    very_lean: 0.55,
    low: 0.25,
    moderate: 0.55,
    athletic: 0.85,
  };
  const muscle = muscleMap[result.muscleTier];
  return { waist, muscle };
}
