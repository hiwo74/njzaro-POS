// From the validated dataviz reference palette (light surface). Fixed categorical
// order — never cycled or reassigned per render.
export const CATEGORICAL = [
  "#2a78d6", // 1 blue
  "#eb6834", // 2 orange
  "#1baf7a", // 3 aqua
  "#eda100", // 4 yellow
  "#e87ba4", // 5 magenta
  "#008300", // 6 green
  "#4a3aa7", // 7 violet
  "#e34948", // 8 red
];

export const SEQUENTIAL_BLUE = "#2a78d6";

export const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
};

export const CHART_INK = {
  primary: "#0b0b0b",
  secondary: "#52514e",
  muted: "#898781",
  grid: "#e1e0d9",
};

// Perfume type keeps the same slot across every render/range — it's a stable
// dimension, unlike a top-N ranking.
export const TYPE_COLOR: Record<string, string> = {
  EDP: CATEGORICAL[0],
  EDT: CATEGORICAL[1],
  PARFUM: CATEGORICAL[2],
  ATTAR: CATEGORICAL[3],
  OIL: CATEGORICAL[4],
};
