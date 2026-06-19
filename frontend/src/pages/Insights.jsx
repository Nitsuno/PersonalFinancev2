import { useEffect, useMemo, useState } from "react";
import {
  getMonthly, getCategories, getTreemap, getSankey, getDaily, getAnomalies, getForecast,
} from "../api/client.js";
import { ACCENT, COLORS, MONO, catColor, fMoney, fSigned, fPct, monthLabel } from "../theme.js";
import { Panel, PanelHead, KPI, Loading, Empty } from "../components/ui.jsx";
import SpendingTrend from "../charts/SpendingTrend.jsx";
import Treemap from "../charts/Treemap.jsx";
import Sankey from "../charts/Sankey.jsx";
import Calendar from "../charts/Calendar.jsx";
import ForecastChart from "../charts/ForecastChart.jsx";
import AnomalyScatter from "../charts/AnomalyScatter.jsx";

const GAP = 18;

export default function Insights() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [path, setPath] = useState([]);

  useEffect(() => {
    Promise.all([getMonthly(), getCategories("all"), getTreemap("all"), getSankey(), getDaily(), getAnomalies(2), getForecast()])
      .then(([monthly, categories, treemap, sankey, daily, anomalies, forecast]) =>
        setData({ monthly, categories, treemap, sankey, daily, anomalies, forecast }))
      .catch((e) => setError(e.message));
  }, []);

  const kpis = useMemo(() => {
    if (!data || data.monthly.length < 1) return [];
    const m = data.monthly;
    const cur = m[m.length - 1], prev = m[m.length - 2] || { income: 0, expense: 0, net: 0 };
    const pct = (a, b) => (b ? ((a - b) / Math.abs(b)) * 100 : 0);
    const sr = cur.income > 0 ? (cur.net / cur.income) * 100 : 0;
    const srPrev = prev.income > 0 ? (prev.net / prev.income) * 100 : 0;
    const k = (label, value, delta, goodUp, sub) => {
      const good = goodUp ? delta >= 0 : delta <= 0;
      return { label, value, delta: fPct(delta), sub, deltaColor: good ? COLORS.good : COLORS.bad, deltaBg: good ? COLORS.goodBg : COLORS.badBg };
    };
    return [
      k("Income", fMoney(cur.income), pct(cur.income, prev.income), true, "vs last month"),
      k("Spending", fMoney(cur.expense), pct(cur.expense, prev.expense), false, "vs last month"),
      k("Net cash flow", fSigned(cur.net), pct(cur.net, prev.net), true, "vs last month"),
      k("Savings rate", sr.toFixed(0) + "%", sr - srPrev, true, "of income"),
    ];
  }, [data]);

  // Walk the fetched category→vendor tree to the drilled node.
  const treeNode = useMemo(() => {
    if (!data) return null;
    let node = data.treemap.tree;
    for (const name of path) {
      const next = (node.children || []).find((c) => c.name === name);
      if (next) node = next;
    }
    return node;
  }, [data, path]);

  if (error) return <Empty title="Couldn't load insights" hint={error} />;
  if (!data) return <Loading label="Crunching analytics…" />;
  if (!data.monthly.length) return <Empty title="No data yet" hint="Upload a statement and label some transactions to see insights." />;

  const maxCat = Math.max(1, ...data.categories.rows.map((r) => r.amount));
  const crumbs = [{ label: "All spending", path: [] }, ...path.map((name, i) => ({ label: name, path: path.slice(0, i + 1) }))];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: GAP, maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: GAP }}>
        {kpis.map((k) => <KPI key={k.label} {...k} />)}
      </div>

      <Panel pad="18px 18px 12px">
        <PanelHead title="Cash flow & balance" subtitle="Net balance trend over income vs. expense per month"
          right={
            <div style={{ display: "flex", gap: 14, fontSize: 11.5, color: "#75756b", alignItems: "center" }}>
              <Legend swatch={<span style={{ width: 18, height: 3, borderRadius: 2, background: ACCENT }} />}>Balance</Legend>
              <Legend swatch={<span style={{ width: 10, height: 10, borderRadius: 3, background: ACCENT, opacity: 0.85 }} />}>Income</Legend>
              <Legend swatch={<span style={{ width: 10, height: 10, borderRadius: 3, background: "#d98a6a" }} />}>Expense</Legend>
            </div>
          }
        />
        <SpendingTrend monthly={data.monthly} />
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: GAP }}>
        <Panel>
          <PanelHead title="Where your money went" subtitle="Click a tile to drill into its vendors" />
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: MONO, fontSize: 11.5, marginBottom: 10, flexWrap: "wrap" }}>
            {crumbs.map((c, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button onClick={() => setPath(c.path)} style={{ border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 500, padding: "3px 9px", borderRadius: 6, background: i === crumbs.length - 1 ? ACCENT : "#f4f4ee", color: i === crumbs.length - 1 ? "#fff" : "#78786e" }}>{c.label}</button>
                {i < crumbs.length - 1 && <span style={{ color: "#cfcfc5" }}>›</span>}
              </span>
            ))}
          </div>
          <Treemap node={treeNode} topCategory={path[0]} onDrill={(name) => setPath([...path, name])} />
        </Panel>

        <Panel>
          <PanelHead title="Spending by category" subtitle="All time, ranked" />
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {data.categories.rows.map((c) => (
              <div key={c.category} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.5 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: catColor(c.category) }} />{c.category}
                  </span>
                  <span style={{ fontFamily: MONO, color: "#55554d" }}>{fMoney(c.amount)}</span>
                </div>
                <div style={{ position: "relative", height: 8, background: "#f0f0ea", borderRadius: 5, overflow: "hidden" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(c.amount / maxCat) * 100}%`, background: catColor(c.category), borderRadius: 5 }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHead title="Income → spending flow" subtitle="Income through fixed / variable / savings, to categories · all time · hover a flow to trace it" />
        <Sankey data={data.sankey.sankey} />
      </Panel>

      <Panel>
        <PanelHead title="Spending rhythm" subtitle="Daily spend intensity: paydays, weekend spikes, subscription clusters" />
        <Calendar daily={data.daily} />
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: GAP }}>
        <Panel>
          <PanelHead title="Next-month forecast" subtitle="Per-month regression prediction of next month expenditure"
            right={data.forecast && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 600, color: ACCENT }}>{fMoney(data.forecast.pred)}</div>
                <div style={{ fontSize: 11, color: COLORS.faint }}>projected · {monthLabel(data.forecast.next_month)}</div>
              </div>
            )}
          />
          {data.forecast ? <ForecastChart forecast={data.forecast} /> : <Sub>Need at least two months to forecast.</Sub>}
        </Panel>

        <Panel style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Flagged anomalies</h3>
            <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 600, color: COLORS.bad, background: COLORS.badBg, padding: "2px 7px", borderRadius: 6 }}>|z| &gt; 2</span>
          </div>
          <p style={{ margin: "3px 0 12px", fontSize: 12, color: COLORS.muted }}>Transactions far from their category's normal range</p>
          {data.anomalies.length ? (
            <>
              <AnomalyScatter anomalies={data.anomalies} />
              <div style={{ display: "flex", flexDirection: "column", gap: 2, overflow: "auto", maxHeight: 188 }}>
                {data.anomalies.map((a, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 4px", borderTop: "1px solid #f0f0ea" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.vendor}</span>
                      <span style={{ fontSize: 11, color: COLORS.faint, fontFamily: MONO }}>{a.date} · {a.category}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 600, display: "block" }}>{fMoney(a.amount)}</span>
                      <span style={{ fontFamily: MONO, fontSize: 10.5, color: COLORS.bad }}>z {a.z.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : <Sub>No anomalies flagged this period.</Sub>}
        </Panel>
      </div>
    </div>
  );
}

const Legend = ({ swatch, children }) => (
  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>{swatch}{children}</span>
);
const Sub = ({ children }) => <p style={{ fontSize: 12.5, color: COLORS.faint, padding: "24px 0" }}>{children}</p>;
