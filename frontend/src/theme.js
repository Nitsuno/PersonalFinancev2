export const ACCENT = "#2f8f6b";

export const COLORS = {
  bg: "#f5f5f1",
  panel: "#fff",
  panelAlt: "#fbfbf9",
  border: "#e6e6df",
  borderSoft: "#ececE4",
  ink: "#1b1d1a",
  inkSoft: "#55554d",
  muted: "#8a8a80",
  faint: "#a3a399",
  fainter: "#bdbdb2",
  good: "#2f7d57",
  goodBg: "#e7f1eb",
  bad: "#c1502e",
  badBg: "#fbeae3",
  warn: "#9a7416",
  warnBg: "#f6edd6",
};

// Category palette keyed to the CATEGORIES list.
export const PALETTE = {
  "Dining & Food": "#dca63c",
  Transport: "#4f86c6",
  "Fitness & Health": "#3fae9f",
  Groceries: "#4caf7d",
  "Retail & Shopping": "#9b6dc6",
  "Utilities & Bills": "#e07a45",
  Transfer: "#7a9bb5",
  Entertainment: "#d76a98",
  Medical: "#d9648a",
  Income: "#2f8f6b",
  Other: "#a3a399",
  Uncategorized: "#c2c2b7",
};

export const catColor = (name) => PALETTE[name] || "#a3a399";

export const MONO = "'JetBrains Mono', ui-monospace, monospace";
export const SANS = "'Hanken Grotesk', system-ui, sans-serif";

const CUR = "RM";
export const fMoney = (n) => CUR + Math.round(n || 0).toLocaleString("en-US");
export const fSigned = (n) => {
  const v = Math.round(n || 0);
  return (v >= 0 ? "+" : "−") + CUR + Math.abs(v).toLocaleString("en-US");
};
export const fPct = (n) => (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(1) + "%";

// "2026-01" -> "Jan 2026"
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthLabel = (ym) => {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  return `${MONTHS[Number(m) - 1] || m} ${y}`;
};
export const shortMonth = (ym) => (ym ? MONTHS[Number(ym.split("-")[1]) - 1] : "");

// "YYYY-MM-DD" -> "YYYY-MM"
export const monthOf = (date) => String(date || "").slice(0, 7);

// Sort rows newest-period-first: month descending, then full date ascending
// within each month. Returns a new array (does not mutate input).
export const byPeriodThenDate = (rows) =>
  [...rows].sort((a, b) => {
    const ma = monthOf(a.Date), mb = monthOf(b.Date);
    if (ma !== mb) return mb < ma ? -1 : 1; // month descending
    const da = String(a.Date), db = String(b.Date);
    return da < db ? -1 : da > db ? 1 : 0; // date ascending
  });
