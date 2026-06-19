import { useState } from "react";
import { CATEGORIES, predict, trainModel, postLabels } from "../api/client.js";
import { ACCENT, COLORS, MONO, catColor } from "../theme.js";
import { Panel, KPI } from "../components/ui.jsx";

function buildLabel(row, category) {
  return {
    Date: row.Date, Vendor: row.Vendor, Amount: row.Amount, Category: category,
    Details: row.Details, Location: row.Location, "Sale Type": row["Sale Type"],
    Debit_amt: row.Debit_amt, Credit_amt: row.Credit_amt, Account: row.Account,
  };
}

export default function Predict() {
  const [metrics, setMetrics] = useState(null);
  const [preds, setPreds] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [overrides, setOverrides] = useState({}); 
  const [deselected, setDeselected] = useState({});
  const [status, setStatus] = useState(null);

  function loadPreds(rows) {
    setPreds(rows);
    setOverrides({});
    setDeselected({});
    setStatus(null);
  }

  async function run(fn, after) {
    setBusy(true); setError(null);
    try { after(await fn()); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  const catOf = (p, i) => overrides[i] ?? p.predicted_category;
  const selectedCount = preds.filter((_, i) => !deselected[i]).length;

  async function saveLabels() {
    const labels = preds
      .map((p, i) => (deselected[i] ? null : buildLabel(p, catOf(p, i))))
      .filter(Boolean);
    if (!labels.length) return;
    setBusy(true); setError(null);
    try {
      const res = await postLabels(labels);
      setStatus(`Saved ${res.saved} label(s).`);
      loadPreds([]); // clear saved predictions from view
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  const pct = (n) => (n == null ? "—" : (n * 100).toFixed(1) + "%");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1080, margin: "0 auto" }}>
      {metrics && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18 }}>
          <KPI label="CV accuracy" value={pct(metrics.cv_accuracy)} />
          <KPI label="CV F1 (weighted)" value={pct(metrics.cv_f1_weighted)} />
          <KPI label="Samples" value={metrics.n_samples} />
          <KPI label="Classes" value={metrics.n_classes} />
        </div>
      )}

      <Panel pad="18px 20px" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
        <div>
          <h3 style={{ margin: "0 0 3px", fontSize: 15, fontWeight: 700 }}>TF-IDF + Logistic Regression classifier</h3>
          <p style={{ margin: 0, fontSize: 12.5, color: COLORS.muted }}>Train on your labeled transactions, then predict the rest.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => run(trainModel, setMetrics)} disabled={busy} style={btn(false)}>Train model</button>
          <button onClick={() => run(predict, loadPreds)} disabled={busy} style={btn(true)}>{busy ? "Working…" : "Predict unlabelled"}</button>
        </div>
      </Panel>

      {error && <Panel><span style={{ color: COLORS.bad, fontSize: 13 }}>{error}</span></Panel>}
      {status && <Panel><span style={{ color: COLORS.good, fontSize: 13 }}>{status}</span></Panel>}

      {preds.length > 0 && (
        <Panel pad="4px 18px 14px">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "16px 4px 4px" }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Predictions to review ({selectedCount} of {preds.length} selected)</h3>
            <button onClick={saveLabels} disabled={busy || !selectedCount} style={saveBtn(busy || !selectedCount)}>Save as labels</button>
          </div>
          <p style={{ margin: "4px 4px 8px", fontSize: 12, color: COLORS.muted }}>Override any category, deselect rows to skip, then save the rest as labels.</p>
          <div style={{ display: "grid", gridTemplateColumns: "0.4fr 1.8fr 1.5fr 1.4fr 0.8fr", gap: 12, padding: "12px 4px", fontSize: 11, fontWeight: 600, color: "#a3a399", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${COLORS.borderSoft}` }}>
            <span>Keep</span><span>Merchant</span><span>Category</span><span>Confidence</span><span style={{ textAlign: "right" }}>Amount</span>
          </div>
          {preds.slice(0, 100).map((p, i) => {
            const conf = Number(p.confidence);
            const cc = conf >= 0.85 ? "#3a8c63" : conf >= 0.72 ? "#c79433" : "#c1502e";
            const off = !!deselected[i];
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "0.4fr 1.8fr 1.5fr 1.4fr 0.8fr", gap: 12, padding: "11px 4px", alignItems: "center", borderBottom: "1px solid #f3f3ed", fontSize: 13, opacity: off ? 0.45 : 1 }}>
                <input type="checkbox" checked={!off} onChange={() => setDeselected((s) => ({ ...s, [i]: !s[i] }))}
                  style={{ width: 15, height: 15, accentColor: ACCENT, cursor: "pointer" }} />
                <span style={{ fontWeight: 500 }}>{p.Vendor}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 3, background: catColor(catOf(p, i)), flex: "0 0 auto" }} />
                  <select value={catOf(p, i)} disabled={off} onChange={(e) => setOverrides((o) => ({ ...o, [i]: e.target.value }))}
                    style={{ fontFamily: "inherit", fontSize: 12.5, padding: "5px 8px", borderRadius: 7, border: `1px solid ${COLORS.border}`, background: "#fff", flex: 1, minWidth: 0 }}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <div style={{ flex: 1, height: 6, background: "#f0f0ea", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${conf * 100}%`, background: cc, borderRadius: 4 }} />
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 11.5, color: "#75756b", width: 42 }}>{(conf * 100).toFixed(0)}%</span>
                </div>
                <span style={{ textAlign: "right", fontFamily: MONO }}>{p.Amount}</span>
              </div>
            );
          })}
        </Panel>
      )}
    </div>
  );
}

const saveBtn = (disabled) => ({
  border: 0, background: ACCENT, color: "#fff", fontFamily: "inherit", fontWeight: 600,
  fontSize: 12, padding: "8px 14px", borderRadius: 8, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1,
});

const btn = (primary) => ({
  border: primary ? 0 : `1px solid ${COLORS.border}`, background: primary ? ACCENT : "#fff", color: primary ? "#fff" : "#44443d",
  fontFamily: "inherit", fontWeight: 600, fontSize: 13, padding: "10px 16px", borderRadius: 10, cursor: "pointer",
});
