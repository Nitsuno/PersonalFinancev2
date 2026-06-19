import { NavLink, useLocation } from "react-router-dom";
import { ACCENT, COLORS, MONO } from "../theme.js";

const NAV = {
  Workflow: [
    { to: "/upload", num: "01", label: "Upload" },
    { to: "/review", num: "02", label: "Review" },
    { to: "/label", num: "03", label: "Label" },
    { to: "/predict", num: "04", label: "Predict" },
  ],
  Analytics: [
    { to: "/insights", num: "05", label: "Insights" },
    { to: "/budget", num: "06", label: "Budget" },
  ],
};

const META = {
  "/upload": ["Upload & Process", "Import statements and run the parse pipeline"],
  "/review": ["Review", "Browse, search and filter every transaction"],
  "/label": ["Label", "Assign categories — single or bulk by vendor"],
  "/predict": ["Predict", "Train the classifier and review its predictions"],
  "/insights": ["Insights", "Trends, flow, rhythm, anomalies and forecast"],
  "/budget": ["Budget", "Limits, budget-vs-actual and report export"],
};

function NavItem({ to, num, label }) {
  return (
    <NavLink to={to} style={{ textDecoration: "none" }}>
      {({ isActive }) => (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            padding: "9px 10px",
            borderRadius: 9,
            position: "relative",
            background: isActive ? "#f1f1ea" : "transparent",
            color: isActive ? COLORS.ink : "#78786e",
            fontWeight: isActive ? 600 : 500,
            fontSize: 13.5,
          }}
        >
          <span
            style={{
              position: "absolute", left: -14, top: "50%", transform: "translateY(-50%)",
              width: 3, height: 17, borderRadius: "0 3px 3px 0",
              background: isActive ? ACCENT : "transparent",
            }}
          />
          <span style={{ fontFamily: MONO, fontSize: 10.5, color: COLORS.fainter, fontWeight: 500, width: 16 }}>{num}</span>
          <span>{label}</span>
        </div>
      )}
    </NavLink>
  );
}

export default function Shell({ children }) {
  const { pathname } = useLocation();
  const [title, subtitle] = META[pathname] || ["Finance Manager", ""];

  return (
    <div style={{ display: "flex", height: "100vh", width: "100%", color: COLORS.ink, background: COLORS.bg, overflow: "hidden" }}>
      <aside style={{ width: 250, flex: "0 0 250px", background: COLORS.panelAlt, borderRight: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", padding: "20px 14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "4px 8px 20px" }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16, boxShadow: "0 2px 6px rgba(0,0,0,0.12)" }}>$</div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
            <span style={{ fontWeight: 700, fontSize: 14.5, letterSpacing: "-0.015em", whiteSpace: "nowrap" }}>Finance Manager</span>
          </div>
        </div>

        {Object.entries(NAV).map(([section, items]) => (
          <div key={section}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#aeaea4", fontWeight: 700, padding: "14px 10px 6px" }}>{section}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {items.map((it) => <NavItem key={it.to} {...it} />)}
            </div>
          </div>
        ))}
      </aside>

      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 32px", borderBottom: `1px solid ${COLORS.border}`, background: "rgba(250,250,247,0.85)", backdropFilter: "blur(6px)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>{title}</h1>
            <span style={{ fontSize: 12.5, color: COLORS.muted }}>{subtitle}</span>
          </div>
        </header>
        <div style={{ flex: 1, overflow: "auto", padding: 32 }}>{children}</div>
      </main>
    </div>
  );
}
