import * as d3 from "d3";
import { useD3, showTip, hideTip } from "./useD3.js";
import { MONO, SANS, fMoney } from "../theme.js";

// Small-multiple bullet charts, normalized to % of each category's budget
export default function BudgetBullets({ rows }) {
  const data = rows.filter((r) => r.pct != null);

  const ref = useD3(
    (el, width) => {
      if (!data.length) return;

      const W = Math.max(width, 520),
        valW = 86,
        rowH = 34,
        m = { t: 6, b: 22 };

      const H = m.t + data.length * rowH + m.b;

      const svg = d3
        .select(el)
        .append("svg")
        .attr("width", "100%")
        .attr("height", H)
        .attr("viewBox", `0 0 ${W} ${H}`)
        .style("display", "block")
        .style("font-family", SANS);

      const x0 = 110,
        x1 = W - valW,
        maxPct = 160;

      const x = d3
        .scaleLinear()
        .domain([0, maxPct])
        .range([x0, x1])
        .clamp(true);

      data.forEach((r, i) => {
        const cy = m.t + i * rowH + rowH / 2 - 4,
          bh = 14;

        svg
          .append("rect")
          .attr("x", x0)
          .attr("y", cy - bh / 2)
          .attr("width", x(75) - x0)
          .attr("height", bh)
          .attr("fill", "#dfe9df")
          .attr("rx", 2);

        svg
          .append("rect")
          .attr("x", x(75))
          .attr("y", cy - bh / 2)
          .attr("width", x(100) - x(75))
          .attr("height", bh)
          .attr("fill", "#f3e4c4");

        svg
          .append("rect")
          .attr("x", x(100))
          .attr("y", cy - bh / 2)
          .attr("width", x(maxPct) - x(100))
          .attr("height", bh)
          .attr("fill", "#f3d2c4")
          .attr("rx", 2);

        const barColor =
          r.status === "over"
            ? "#c1502e"
            : r.status === "close"
            ? "#c79433"
            : "#3a8c63";

        svg
          .append("rect")
          .attr("x", x0)
          .attr("y", cy - 4)
          .attr("width", Math.max(0, x(Math.min(r.pct, maxPct)) - x0))
          .attr("height", 8)
          .attr("fill", barColor)
          .attr("rx", 2);

        svg
          .append("line")
          .attr("x1", x(100))
          .attr("x2", x(100))
          .attr("y1", cy - bh / 2 - 3)
          .attr("y2", cy + bh / 2 + 3)
          .attr("stroke", "#44443d")
          .attr("stroke-width", 1.6);

        svg
          .append("text")
          .attr("x", 0)
          .attr("y", cy)
          .attr("dy", "0.32em")
          .attr("fill", "#33332c")
          .attr("font-size", 12.5)
          .attr("font-weight", 600)
          .text(
            r.category.length > 14
              ? r.category.slice(0, 13) + "…"
              : r.category
          );

        svg
          .append("text")
          .attr("x", W)
          .attr("y", cy)
          .attr("dy", "0.32em")
          .attr("text-anchor", "end")
          .attr("fill", barColor)
          .attr("font-size", 12)
          .attr("font-weight", 600)
          .attr("font-family", MONO)
          .text(Math.round(r.pct) + "%");

        svg
          .append("rect")
          .attr("x", x0)
          .attr("y", cy - rowH / 2)
          .attr("width", x1 - x0)
          .attr("height", rowH)
          .attr("fill", "transparent")
          .on("mousemove", (e) =>
            showTip(
              `<b>${r.category}</b><br>${fMoney(r.actual)} of ${fMoney(
                r.budget
              )}<br>${Math.round(r.pct)}% of budget`,
              e
            )
          )
          .on("mouseleave", hideTip);
      });

      ["0%", "75%", "100%"].forEach((lab, idx) => {
        const px = [0, 75, 100][idx];

        svg
          .append("text")
          .attr("x", x(px))
          .attr("y", H - 6)
          .attr("text-anchor", "middle")
          .attr("fill", "#b4b4aa")
          .attr("font-size", 9)
          .attr("font-family", MONO)
          .text(lab);
      });
    },
    [rows]
  );

  return <div ref={ref} style={{ width: "100%" }} />;
}
