import { COLORS, MONO } from "../theme.js";

export function Panel({ children, style, pad = 18 }) {
  return (
    <div
      style={{
        background: COLORS.panel,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 14,
        padding: pad,
        boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function PanelHead({ title, subtitle, right }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>{title}</h3>
        {subtitle && <p style={{ margin: "3px 0 0", fontSize: 12, color: COLORS.muted }}>{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function KPI({ label, value, delta, deltaColor, deltaBg, sub }) {
  return (
    <Panel pad="16px 18px">
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "#9a9a90", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 25, fontWeight: 600, letterSpacing: "-0.02em" }}>{value}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 18 }}>
          {delta != null && (
            <span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 600, color: deltaColor, background: deltaBg, padding: "2px 7px", borderRadius: 6 }}>
              {delta}
            </span>
          )}
          {sub && <span style={{ fontSize: 11.5, color: "#a8a89e" }}>{sub}</span>}
        </div>
      </div>
    </Panel>
  );
}

export function Loading({ label = "Loading…" }) {
  return <div style={{ padding: 40, textAlign: "center", color: COLORS.faint, fontFamily: MONO, fontSize: 13 }}>{label}</div>;
}

export function Empty({ title, hint }) {
  return (
    <Panel style={{ textAlign: "center", padding: 48 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{title}</div>
      {hint && <div style={{ fontSize: 13, color: COLORS.muted }}>{hint}</div>}
    </Panel>
  );
}
