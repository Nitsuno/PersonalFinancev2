import { useRef, useState } from "react";
import { uploadPdf, resetData } from "../api/client.js";
import { ACCENT, COLORS, MONO } from "../theme.js";
import { Panel } from "../components/ui.jsx";

const PIPELINE = [
  ["Parse PDF", "pdfplumber → DataFrame, dates recovered from text"],
  ["Preprocess", "clean, split debit/credit, normalize vendors"],
  ["Save to Postgres", "dedupe by (date, vendor, amount)"],
  ["Classify", "TF-IDF + Logistic Regression"],
];

export default function Upload() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);
  const inputRef = useRef(null);

  async function handleReset() {
    if (!window.confirm("Wipe ALL data: transactions, labels, budgets and the trained model. This cannot be undone.")) return;
    setResetting(true); setError(null); setResult(null); setFile(null);
    try {
      await resetData();
      setResult({ reset: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setResetting(false);
    }
  }

  async function handleUpload(f) {
    const target = f || file;
    if (!target) return;
    setBusy(true); setError(null); setResult(null);
    try {
      setResult(await uploadPdf(target));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 920, margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
        <Panel pad={22}>
          <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700 }}>Import a statement</h3>
          <p style={{ margin: "0 0 16px", fontSize: 12.5, color: COLORS.muted }}>
            Drop a bank PDF named like <code>Jan 2026.pdf</code>. The parser extracts, preprocesses and saves transactions.
          </p>
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setFile(f); handleUpload(f); } }}
            style={{ border: "1.5px dashed #d3d3c8", borderRadius: 12, background: "#fafaf6", padding: "40px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, cursor: "pointer" }}
          >
            <div style={{ width: 46, height: 46, borderRadius: 12, background: "#eef0ea", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 14, height: 14, border: `2.5px solid ${ACCENT}`, borderBottom: 0, borderRight: 0, transform: "rotate(45deg)", marginTop: 5 }} />
            </div>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{file ? file.name : "Drag & drop PDF here"}</div>
            <div style={{ fontSize: 12, color: COLORS.faint }}>or <span style={{ color: ACCENT, fontWeight: 600 }}>browse files</span></div>
            <input ref={inputRef} type="file" accept="application/pdf" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files[0] || null; setFile(f); if (f) handleUpload(f); }} />
          </div>
          {busy && <p style={{ fontSize: 12.5, color: COLORS.muted, marginTop: 14 }}>Uploading…</p>}
          {result && (
            <p style={{ fontSize: 13, marginTop: 14, color: result.duplicate ? COLORS.warn : COLORS.good }}>
              {result.reset
                ? "All data cleared, import your statements one by one."
                : result.duplicate
                  ? `${result.month} already imported, nothing added.`
                  : `Imported ${result.inserted} transactions for ${result.month}.`}
            </p>
          )}
          {error && <p style={{ color: COLORS.bad, fontSize: 13, marginTop: 14 }}>{error}</p>}
        </Panel>

        <Panel pad={22}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>Pipeline</h3>
          {PIPELINE.map(([title, detail], i) => (
            <div key={title} style={{ display: "flex", alignItems: "flex-start", gap: 12, paddingBottom: 18 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#fff", border: `2px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 11, fontWeight: 600, color: COLORS.faint, flex: "0 0 auto" }}>{i + 1}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{title}</span>
                <span style={{ fontSize: 11.5, color: COLORS.faint, fontFamily: MONO }}>{detail}</span>
              </div>
            </div>
          ))}
        </Panel>
      </div>

      <Panel style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, borderColor: "#f0ddd5" }}>
        <div>
          <h3 style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 700, color: COLORS.bad }}>Reset all data</h3>
          <p style={{ margin: 0, fontSize: 12.5, color: COLORS.muted }}>Clears every transaction, label, budget and the trained model so you can start fresh.</p>
        </div>
        <button onClick={handleReset} disabled={resetting}
          style={{ border: `1px solid ${COLORS.bad}`, background: resetting ? COLORS.badBg : "#fff", color: COLORS.bad, fontFamily: "inherit", fontWeight: 600, fontSize: 13, padding: "10px 16px", borderRadius: 10, cursor: "pointer", flex: "0 0 auto" }}>
          {resetting ? "Clearing…" : "Reset everything"}
        </button>
      </Panel>
    </div>
  );
}
