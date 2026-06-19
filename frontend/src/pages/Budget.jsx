import { useEffect, useState } from "react";
import { getBudget, postBudget } from "../api/client.js";
import { ACCENT, COLORS, MONO, catColor, fMoney, fSigned } from "../theme.js";
import { Panel, PanelHead, KPI, Loading, Empty } from "../components/ui.jsx";
import BudgetBullets from "../charts/BudgetBullets.jsx";

const GAP = 18;
const STATUS = {
  under: ["On track", COLORS.good, COLORS.goodBg],
  close: ["Close", COLORS.warn, COLORS.warnBg],
  over: ["Over", COLORS.bad, COLORS.badBg],
  none: ["No budget", "#8a8a80", "#f0f0ea"],
};

export default function Budget() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(false);

  function load() {
    getBudget().then(setData).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function save() {
    const limits = {};
    for (const r of data.rows) limits[r.category] = drafts[r.category] != null ? Number(drafts[r.category]) : r.budget;
    setSaving(true);
    try {
      await postBudget(limits);
      setDrafts({});
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function exportCsv() {
    const head = "Category,Spent,Budget,Remaining,Percent,Status";
    const lines = data.rows.map((r) => [r.category, r.actual, r.budget, r.remaining, r.pct ?? "", r.status].join(","));
    const blob = new Blob([head + "\n" + lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `budget-${data.month}.csv`;
    a.click();
  }

  if (error) return <Empty title="Couldn't load budget" hint={error} />;
  if (!data) return <Loading label="Loading budget…" />;
  if (data.rows.length === 0) return <Empty title="No data yet" hint="Upload and label transactions to set budgets against your spending." />;

  const totBudget = data.rows.reduce((s, r) => s + r.budget, 0);
  const totSpent = data.rows.reduce((s, r) => s + r.actual, 0);
  const overCount = data.rows.filter((r) => r.status === "over").length;
  const dirty = Object.keys(drafts).length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: GAP, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: GAP }}>
        <KPI label="Total budget" value={fMoney(totBudget)} sub={`${data.rows.length} categories`} />
        <KPI label="Spent" value={fMoney(totSpent)} sub={totBudget ? `${((totSpent / totBudget) * 100).toFixed(0)}% used` : "—"} />
        <KPI label="Remaining" value={fSigned(totBudget - totSpent)} sub="avg / month" />
        <KPI label="Over budget" value={`${overCount} cats`} sub="need attention" />
      </div>

      <Panel>
        <PanelHead title="Budget vs. actual" subtitle="Normalized to % of each budget. The target tick sits at 100%"
          right={
            <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#75756b", alignItems: "center" }}>
              <Band c="#dfe9df">0–75%</Band><Band c="#f3e4c4">75–100%</Band><Band c="#f3d2c4">100%+</Band>
            </div>
          }
        />
        <BudgetBullets rows={data.rows} />
      </Panel>

      <Panel pad="6px 18px 8px">
        <Row header>
          <span>Category</span><span style={R}>Spent</span><span style={R}>Budget</span><span style={R}>Remaining</span><span style={R}>Status</span>
        </Row>
        {data.rows.map((r) => {
          const [label, fg, bg] = STATUS[r.status] || STATUS.none;
          return (
            <Row key={r.category}>
              <span style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 600 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: catColor(r.category) }} />{r.category}
              </span>
              <span style={{ ...R, fontFamily: MONO }}>{fMoney(r.actual)}</span>
              <span style={{ ...R, fontFamily: MONO }}>
                <input type="number" value={drafts[r.category] ?? r.budget}
                  onChange={(e) => setDrafts((d) => ({ ...d, [r.category]: e.target.value }))}
                  style={{ width: 80, textAlign: "right", fontFamily: MONO, fontSize: 13, border: `1px solid ${COLORS.border}`, borderRadius: 7, padding: "4px 7px", background: "#fff" }} />
              </span>
              <span style={{ ...R, fontFamily: MONO, color: r.remaining >= 0 ? "#55554d" : COLORS.bad }}>{fSigned(r.remaining)}</span>
              <span style={R}><span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: fg, background: bg, padding: "3px 9px", borderRadius: 6 }}>{label}</span></span>
            </Row>
          );
        })}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 4px" }}>
          <button onClick={exportCsv} style={btnGhost}><span style={{ fontFamily: MONO, color: ACCENT }}>CSV</span> Export budget report</button>
          <button onClick={save} disabled={!dirty || saving} style={{ ...btnPrimary, opacity: !dirty || saving ? 0.5 : 1 }}>{saving ? "Saving…" : "Save limits"}</button>
        </div>
      </Panel>
    </div>
  );
}

const R = { textAlign: "right" };
const Band = ({ c, children }) => (
  <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: c }} />{children}</span>
);
const Row = ({ children, header }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 0.9fr", gap: 12, padding: header ? "14px 4px" : "12px 4px", alignItems: "center", borderBottom: `1px solid ${header ? COLORS.borderSoft : "#f3f3ed"}`, fontSize: header ? 11 : 13, fontWeight: header ? 600 : 400, color: header ? COLORS.faint : "inherit", textTransform: header ? "uppercase" : "none", letterSpacing: header ? "0.05em" : "normal" }}>
    {children}
  </div>
);
const btnGhost = { border: `1px solid ${COLORS.border}`, background: "#fff", color: "#44443d", fontFamily: "inherit", fontWeight: 600, fontSize: 12.5, padding: "9px 15px", borderRadius: 9, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 };
const btnPrimary = { border: 0, background: ACCENT, color: "#fff", fontFamily: "inherit", fontWeight: 600, fontSize: 12.5, padding: "9px 15px", borderRadius: 9, cursor: "pointer" };
