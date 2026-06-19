import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, getUnlabelled, postLabels } from "../api/client.js";
import { ACCENT, COLORS, MONO, catColor, byPeriodThenDate } from "../theme.js";
import { Panel, Loading, Empty } from "../components/ui.jsx";

function buildLabel(row, category) {
  return {
    Date: row.Date, Vendor: row.Vendor, Amount: row.Amount, Category: category,
    Details: row.Details, Location: row.Location, "Sale Type": row["Sale Type"],
    Debit_amt: row.Debit_amt, Credit_amt: row.Credit_amt, Account: row.Account,
  };
}

export default function Label() {
  const [rows, setRows] = useState(null);
  const [chosen, setChosen] = useState({});
  const [status, setStatus] = useState(null);

  // year-desc → month-desc → date-asc, via the shared helper.
  async function load() {
    const data = await getUnlabelled();
    setRows(byPeriodThenDate(data));
  }

  useEffect(() => {
    load().catch((e) => setStatus(e.message));
  }, []);

  // Group by vendor for the bulk panel.
  const vendors = useMemo(() => {
    if (!rows) return [];
    const map = {};
    rows.forEach((r) => {
      const v = r.Vendor || "(unknown)";
      map[v] = map[v] || { vendor: v, count: 0, total: 0 };
      map[v].count++;
      map[v].total += Number(r.Debit_amt) || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [rows]);

  const [bulk, setBulk] = useState({});

  async function saveChosen() {
    const labels = rows.map((row, i) => (chosen[i] ? buildLabel(row, chosen[i]) : null)).filter(Boolean);
    if (!labels.length) return;
    try {
      const res = await postLabels(labels);
      setStatus(`Saved ${res.saved} label(s).`);
      setChosen({});
      await load(); // applied rows vanish from both panels
    } catch (e) { setStatus(e.message); }
  }

  async function applyVendor(vendor) {
    const cat = bulk[vendor];
    if (!cat) return;
    const labels = rows.filter((r) => (r.Vendor || "(unknown)") === vendor).map((r) => buildLabel(r, cat));
    try {
      const res = await postLabels(labels);
      setStatus(`Labeled ${res.saved} ${vendor} transaction(s) as ${cat}.`);
      setBulk((p) => ({ ...p, [vendor]: "" }));
      await load(); // vendor disappears once all its txns are labeled
    } catch (e) { setStatus(e.message); }
  }

  if (!rows) return <Loading />;
  if (!rows.length) return <Empty title="Nothing to label" hint="Upload a statement first." />;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18, maxWidth: 1080, margin: "0 auto" }}>
      <Panel pad={20}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Transactions</h3>
          <button onClick={saveChosen} disabled={!Object.keys(chosen).length}
            style={{ border: 0, background: ACCENT, color: "#fff", fontFamily: "inherit", fontWeight: 600, fontSize: 12, padding: "7px 13px", borderRadius: 8, cursor: "pointer", opacity: Object.keys(chosen).length ? 1 : 0.5 }}>
            Save selected
          </button>
        </div>
        <p style={{ margin: "4px 0 16px", fontSize: 12, color: COLORS.muted }}>Pick a category for any row, then save.</p>
        {status && <p style={{ fontSize: 12.5, color: COLORS.good, margin: "0 0 12px" }}>{status}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 560, overflow: "auto" }}>
          {rows.slice(0, 100).map((row, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", border: `1px solid ${COLORS.borderSoft}`, borderRadius: 11 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{row.Vendor}</span>
                <span style={{ fontSize: 11, color: COLORS.faint, fontFamily: MONO }}>{row.Date} · {row.Amount}</span>
              </div>
              <select value={chosen[i] || ""} onChange={(e) => setChosen((p) => ({ ...p, [i]: e.target.value }))}
                style={{ fontFamily: "inherit", fontSize: 12.5, padding: "7px 10px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff" }}>
                <option value="">— category —</option>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          ))}
        </div>
      </Panel>

      <Panel pad={20}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700 }}>Bulk by vendor</h3>
        <p style={{ margin: "0 0 16px", fontSize: 12, color: COLORS.muted }}>Label every transaction from a vendor in one move.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {vendors.map((v) => (
            <div key={v.vendor} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 13px", border: `1px solid ${COLORS.borderSoft}`, borderRadius: 11, gap: 8 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.vendor}</span>
                <span style={{ fontSize: 11, color: COLORS.faint, fontFamily: MONO }}>{v.count} txns · RM{Math.round(v.total).toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", gap: 6, flex: "0 0 auto" }}>
                <select value={bulk[v.vendor] || ""} onChange={(e) => setBulk((p) => ({ ...p, [v.vendor]: e.target.value }))}
                  style={{ fontFamily: "inherit", fontSize: 12, padding: "6px 8px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#f6f6f1" }}>
                  <option value="">—</option>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
                <button onClick={() => applyVendor(v.vendor)} disabled={!bulk[v.vendor]}
                  style={{ border: 0, background: catColor(bulk[v.vendor]) , color: "#fff", fontFamily: "inherit", fontWeight: 600, fontSize: 12, padding: "6px 11px", borderRadius: 8, cursor: "pointer", opacity: bulk[v.vendor] ? 1 : 0.4 }}>
                  Apply
                </button>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
