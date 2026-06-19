// Only file that interacts with backend
const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function asJson(res) {
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      detail = (await res.json()).detail || detail;
    } catch {
      
    }
    throw new Error(detail);
  }
  return res.json();
}

export function getTransactions(month) {
  const qs = month ? `?month=${encodeURIComponent(month)}` : "";
  return fetch(`${BASE}/transactions${qs}`).then(asJson);
}

export function getUnlabelled() {
  return fetch(`${BASE}/transactions/unlabelled`).then(asJson);
}

export function uploadPdf(file) {
  const form = new FormData();
  form.append("file", file);
  return fetch(`${BASE}/transactions/upload`, {
    method: "POST",
    body: form,
  }).then(asJson);
}

export function postLabels(labels) {
  return fetch(`${BASE}/labels/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(labels),
  }).then(asJson);
}

export function trainModel() {
  return fetch(`${BASE}/model/train`, { method: "POST" }).then(asJson);
}

export function predict() {
  return fetch(`${BASE}/model/predict`, { method: "POST" }).then(asJson);
}

// --- analytics / forecast / budget ---
export const getMonthly = () => fetch(`${BASE}/analytics/monthly`).then(asJson);
export const getCategories = (month) =>
  fetch(`${BASE}/analytics/categories${month ? `?month=${month}` : ""}`).then(asJson);
export const getTreemap = (month) =>
  fetch(`${BASE}/analytics/treemap${month ? `?month=${month}` : ""}`).then(asJson);
export const getSankey = (month) =>
  fetch(`${BASE}/analytics/sankey${month ? `?month=${month}` : ""}`).then(asJson);
export const getDaily = () => fetch(`${BASE}/analytics/daily`).then(asJson);
export const getAnomalies = (threshold = 2) =>
  fetch(`${BASE}/analytics/anomalies?threshold=${threshold}`).then(asJson);
export const getForecast = () => fetch(`${BASE}/forecast`).then(asJson);
export const getBudget = (month) =>
  fetch(`${BASE}/budget${month ? `?month=${month}` : ""}`).then(asJson);
export const postBudget = (limits) =>
  fetch(`${BASE}/budget`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(limits),
  }).then(asJson);

// Wipe all data (transactions, labels, budgets, model) to start fresh.
export const resetData = () => fetch(`${BASE}/admin/reset`, { method: "POST" }).then(asJson);

export const CATEGORIES = [
  "Dining & Food",
  "Transport",
  "Fitness & Health",
  "Groceries",
  "Retail & Shopping",
  "Utilities & Bills",
  "Transfer",
  "Entertainment",
  "Medical",
  "Income",
  "Other",
];
