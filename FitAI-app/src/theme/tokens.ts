/**
 * FitAI Design Tokens
 * -------------------------------------------------------------------------
 * Direction: "warm effort" — a bright, paper-white base with a single
 * coral-flame accent standing in for the burn of a workout, paired with a
 * deep forest green for nutrition/recovery. The signature motif is the
 * flame-shaped streak tracker and a layered macro ring on the Home screen.
 * Display type is Manrope (confident, geometric); body/data type is Inter
 * (excellent at small sizes and tabular numerals for calorie/weight data).
 */

export const color = {
  // Base surfaces
  bg: "#FAF7F2",
  bgAlt: "#F1EBE1",
  surface: "#FFFFFF",
  surfaceSoft: "#F6F1E9",
  border: "#EAE2D3",
  borderStrong: "#DED2B8",

  // Ink
  ink: "#1C1B1A",
  inkSoft: "#6F675C",
  inkFaint: "#A79E90",
  onDark: "#FFF9F2",

  // Brand
  primary: "#FF5A36", // coral flame — effort / calories burned / primary actions
  primaryDark: "#E24523",
  primarySoft: "#FFE4D8",
  primarySofter: "#FFF1E9",

  secondary: "#1F6F54", // forest — nutrition / recovery / completion
  secondaryDark: "#15503C",
  secondarySoft: "#DCEEE6",

  gold: "#F0A93A", // streak / rank / gamification accent
  goldSoft: "#FCEACB",

  // Macro coding (functional, kept distinct from brand hues on purpose)
  protein: "#FF5A36",
  carbs: "#F0A93A",
  fat: "#4C6EF5",

  // Feedback
  success: "#1F6F54",
  successSoft: "#DCEEE6",
  danger: "#D6482F",
  dangerSoft: "#FBE1DB",
  info: "#4C6EF5",
  infoSoft: "#E4E9FD",
} as const;

export const gradient = {
  flame: ["#FF7A50", "#FF5A36"] as const,
  forest: ["#2C8B69", "#1F6F54"] as const,
  ink: ["#2B2A28", "#171615"] as const,
};

export const font = {
  display: "Manrope_800ExtraBold",
  displaySemi: "Manrope_700Bold",
  displayMed: "Manrope_600SemiBold",
  body: "Inter_400Regular",
  bodyMed: "Inter_500Medium",
  bodySemi: "Inter_600SemiBold",
  bodyBold: "Inter_700Bold",
};

export const type = {
  display: { fontFamily: font.display, fontSize: 30, lineHeight: 36 },
  h1: { fontFamily: font.displaySemi, fontSize: 24, lineHeight: 30 },
  h2: { fontFamily: font.displaySemi, fontSize: 19, lineHeight: 25 },
  h3: { fontFamily: font.displayMed, fontSize: 16, lineHeight: 22 },
  bodyLg: { fontFamily: font.body, fontSize: 16, lineHeight: 23 },
  body: { fontFamily: font.body, fontSize: 14, lineHeight: 20 },
  bodySmall: { fontFamily: font.body, fontSize: 12.5, lineHeight: 18 },
  label: { fontFamily: font.bodySemi, fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
  numberLg: { fontFamily: font.displaySemi, fontSize: 34, lineHeight: 38 },
  number: { fontFamily: font.displaySemi, fontSize: 20, lineHeight: 24 },
};

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
};

export const shadow = {
  card: {
    shadowColor: "#3A2A1C",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  soft: {
    shadowColor: "#3A2A1C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  float: {
    shadowColor: "#3A2A1C",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 26,
    elevation: 8,
  },
};

export const dayLabels: Record<string, string> = {
  Monday: "Th 2",
  Tuesday: "Th 3",
  Wednesday: "Th 4",
  Thursday: "Th 5",
  Friday: "Th 6",
  Saturday: "Th 7",
  Sunday: "CN",
};

export const dayOrder = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const todayKey = () => dayOrder[(new Date().getDay() + 6) % 7];
