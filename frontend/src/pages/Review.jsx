import { useEffect, useMemo, useState } from "react";
import { getTransactions } from "../api/client.js";
import { COLORS, MONO, monthOf, byPeriodThenDate, monthLabel } from "../theme.js";
import { Panel, Loading, Empty } from "../components/ui.jsx";

const ALL = "all";

export default function Review() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [year, setYear] = useState(ALL);
  const [month, setMonth] = useState(ALL);

  useEffect(() => {
    getTransactions().then(setRows).catch((e) => setError(e.message));
  }, []);

  // Distinct years present in the data, descending.
  const years = useMemo(() => {
    if (!rows) return [];
    const set = new Set(rows.map((r) => String(r.Date).slice(0, 4)).filter(Boolean));
    return [...set].sort((a, b) => (a < b ? 1 : -1));
  }, [rows]);

  // Distinct months (YYYY-MM) within the selected year (or all years), descending.
  const months = useMemo(() => {
    if (!rows) return [];
    const scoped = year === ALL ? rows : rows.filter((r) => String(r.Date).slice(0, 4) === year);
    const set = new Set(scoped.map((r) => monthOf(r.Date)).filter(Boolean));
    return [...set].sort((a, b) => (a < b ? 1 : -1));
  }, [rows, year]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (year !== ALL && String(r.Date).slice(0, 4) !== year) return false;
      if (month !== ALL && monthOf(r.Date) !== month) return false;
      if (q && !`${r.Vendor} ${r["Sale Type"]} ${r.Amount} ${r.Date}`.toLowerCase().includes(q)) return false;
      return true;
    });
    return byPeriodThenDate(out);
  }, [rows, query, year, month]);

  if (error) return <Empty title="Couldn't load transactions" hint={error} />;
  if (!rows) return <Loading />;
  if (!rows.length) return <Empty title="No transactions yet" hint="Upload a statement to get started." />;

  const spend = filtered.reduce((s, r) => s + (Number(r.Debit_amt) || 0), 0);
  const income = filtered.reduce((s, r) => s + (Number(r.Credit_amt) || 0), 0);

  const selectStyle = { fontFamily: "inherit", fontSize: 13, padding: "9px 11px", borderRadius: 10, border: `1px solid ${COLORS.border}`, background: "#fff", color: COLORS.ink };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1080, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "9px 13px", flex: 1, minWidth: 220 }}>
          <span style={{ width: 13, height: 13, border: "2px solid #c2c2b7", borderRadius: "50%" }} />
          <input placeholder="Search merchant, type, amount, date…" value={query} onChange={(e) => setQuery(e.target.value)}
            style={{ border: 0, outline: 0, background: "transparent", fontFamily: "inherit", fontSize: 13, flex: 1, color: COLORS.ink }} />
        </div>
        <select value={year} onChange={(e) => { setYear(e.target.value); setMonth(ALL); }} style={selectStyle}>
          <option value={ALL}>All years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={month} onChange={(e) => setMonth(e.target.value)} style={selectStyle}>
          <option value={ALL}>All months</option>
          {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <Chip label="Transactions" value={filtered.length.toLocaleString()} />
        <Chip label="Total spend" value={`RM${Math.round(spend).toLocaleString()}`} />
        <Chip label="Total income" value={`RM${Math.round(income).toLocaleString()}`} />
      </div>

      <Panel pad="4px 18px 10px">
        <Head />
        {filtered.slice(0, 200).map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "0.8fr 1.8fr 1.1fr 0.9fr 0.7fr", gap: 12, padding: "11px 4px", alignItems: "center", borderBottom: "1px solid #f3f3ed", fontSize: 13 }}>
            <span style={{ fontFamily: MONO, fontSize: 12, color: COLORS.muted }}>{r.Date}</span>
            <span style={{ fontWeight: 500 }}>{r.Vendor}</span>
            <span style={{ fontSize: 12, color: COLORS.muted }}>{r["Sale Type"]}</span>
            <span style={{ textAlign: "right", fontFamily: MONO, fontWeight: 600, color: Number(r.Credit_amt) > 0 ? COLORS.good : COLORS.ink }}>
              {Number(r.Credit_amt) > 0 ? "+" : "−"}RM{(Number(r.Credit_amt) > 0 ? Number(r.Credit_amt) : Number(r.Debit_amt) || 0).toFixed(2)}
            </span>
            <span style={{ textAlign: "right", fontSize: 11, color: "#9a9a90", fontFamily: MONO }}>{Number(r.Credit_amt) > 0 ? "credit" : "debit"}</span>
          </div>
        ))}
        <div style={{ padding: "14px 4px", fontSize: 12, color: COLORS.faint, fontFamily: MONO }}>
          Showing {Math.min(filtered.length, 200)} of {filtered.length.toLocaleString()}
        </div>
      </Panel>
    </div>
  );
}

const Chip = ({ label, value }) => (
  <Panel pad="13px 16px" style={{ flex: 1 }}>
    <span style={{ fontSize: 11, color: "#9a9a90", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", display: "block" }}>{label}</span>
    <span style={{ fontFamily: MONO, fontSize: 18, fontWeight: 600 }}>{value}</span>
  </Panel>
);
const Head = () => (
  <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1.8fr 1.1fr 0.9fr 0.7fr", gap: 12, padding: "14px 4px", fontSize: 11, fontWeight: 600, color: "#a3a399", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${COLORS.borderSoft}` }}>
    <span>Date</span><span>Vendor</span><span>Type</span><span style={{ textAlign: "right" }}>Amount</span><span style={{ textAlign: "right" }}>Flow</span>
  </div>
);
