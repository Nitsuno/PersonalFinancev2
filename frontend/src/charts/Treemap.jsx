import * as d3 from "d3";
import { useD3, showTip, hideTip } from "./useD3.js";
import { MONO, SANS, catColor, fMoney } from "../theme.js";

// Draws the current treemap node, clicking a tile with children calls onDrill(name)
export default function Treemap({ node, topCategory, onDrill }) {
  const ref = useD3(
    (el, width) => {
      const W = Math.max(width, 300),
        H = 300;

      const root = d3
        .hierarchy(node)
        .sum((d) => d.value || 0)
        .sort((a, b) => b.value - a.value);

      d3.treemap().size([W, H]).paddingInner(3).round(true)(root);

      const leaves = root.children || [];
      if (!leaves.length) return;

      const total = root.value || 1;

      const svg = d3
        .select(el)
        .append("svg")
        .attr("width", "100%")
        .attr("height", H)
        .attr("viewBox", `0 0 ${W} ${H}`)
        .style("display", "block")
        .style("font-family", SANS);

      const g = svg
        .selectAll("g")
        .data(leaves)
        .join("g")
        .style("cursor", (d) => (d.data.children ? "pointer" : "default"))
        .on("click", (e, d) => {
          if (d.data.children && onDrill) onDrill(d.data.name);
        })
        .on("mousemove", (e, d) =>
          showTip(
            `<b>${d.data.name}</b><br>${fMoney(d.value)} · ${(
              (d.value / total) *
              100
            ).toFixed(1)}%`,
            e
          )
        )
        .on("mouseleave", hideTip);

      g.append("rect")
        .attr("x", (d) => d.x0)
        .attr("y", (d) => d.y0)
        .attr("width", (d) => Math.max(0, d.x1 - d.x0))
        .attr("height", (d) => Math.max(0, d.y1 - d.y0))
        .attr("rx", 4)
        .attr("fill", (d, i) => {
          const base = topCategory || d.data.name;
          const c = d3.color(catColor(base));
          if (topCategory)
            c.opacity = 0.55 + 0.4 * (1 - i / Math.max(leaves.length, 1));
          return c + "";
        })
        .attr("stroke", "#fff")
        .attr("stroke-width", 1);

      g.each(function (d) {
        const w = d.x1 - d.x0,
          h = d.y1 - d.y0;

        if (w > 56 && h > 30) {
          const t = d3.select(this);

          t.append("text")
            .attr("x", d.x0 + 9)
            .attr("y", d.y0 + 19)
            .attr("fill", "#fff")
            .attr("font-size", 12)
            .attr("font-weight", 600)
            .text(
              d.data.name.length > 16
                ? d.data.name.slice(0, 15) + "…"
                : d.data.name
            );

          t.append("text")
            .attr("x", d.x0 + 9)
            .attr("y", d.y0 + 34)
            .attr("fill", "rgba(255,255,255,0.88)")
            .attr("font-size", 10.5)
            .attr("font-family", MONO)
            .text(fMoney(d.value));
        }
      });
    },
    [node, topCategory]
  );

  return <div ref={ref} style={{ width: "100%" }} />;
}