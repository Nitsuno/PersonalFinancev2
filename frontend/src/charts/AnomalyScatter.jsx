import * as d3 from "d3";
import { useD3, showTip, hideTip } from "./useD3.js";
import { MONO, catColor, fMoney } from "../theme.js";

// Scatter of flagged anomalies over time, amount on a log axis
export default function AnomalyScatter({ anomalies }) {
  const ref = useD3(
    (el, width) => {
      if (!anomalies.length) return;

      const pts = anomalies.map((a) => ({ ...a, dt: new Date(a.date) }));

      const W = Math.max(width, 300),
        H = 120,
        m = { t: 8, r: 8, b: 18, l: 38 };

      const svg = d3
        .select(el)
        .append("svg")
        .attr("width", "100%")
        .attr("height", H)
        .attr("viewBox", `0 0 ${W} ${H}`)
        .style("display", "block")
        .style("font-family", MONO);

      const x = d3
        .scaleTime()
        .domain(d3.extent(pts, (d) => d.dt))
        .range([m.l, W - m.r]);

      const y = d3
        .scaleLog()
        .domain([5, d3.max(pts, (d) => d.amount)])
        .range([H - m.b, m.t])
        .clamp(true);

      [10, 100, 1000].forEach((tk) => {
        svg
          .append("text")
          .attr("x", m.l - 7)
          .attr("y", y(tk))
          .attr("dy", "0.32em")
          .attr("text-anchor", "end")
          .attr("fill", "#c2c2b7")
          .attr("font-size", 8.5)
          .text("RM" + tk);
      });

      svg
        .append("g")
        .selectAll("circle")
        .data(pts)
        .join("circle")
        .attr("cx", (d) => x(d.dt))
        .attr("cy", (d) => y(Math.max(d.amount, 5)))
        .attr("r", 3.4)
        .attr("fill", (d) => catColor(d.category))
        .attr("opacity", 0.95)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .on("mousemove", (e, d) =>
          showTip(
            `<b>${d.vendor}</b><br>${fMoney(d.amount)} · ${d.category}<br>z ${d.z.toFixed(2)}`,
            e
          )
        )
        .on("mouseleave", hideTip);
    },
    [anomalies]
  );

  return <div ref={ref} style={{ width: "100%", marginBottom: 8 }} />;
}