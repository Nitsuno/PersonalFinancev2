import * as d3 from "d3";
import { sankey as d3sankey, sankeyLinkHorizontal } from "d3-sankey";
import { useD3, showTip, hideTip } from "./useD3.js";
import { ACCENT, MONO, SANS, catColor, fMoney, PALETTE } from "../theme.js";

const BUCKET_COLOR = { Income: ACCENT, Fixed: "#9aa39a", Variable: "#bdbdb2", Savings: "#7a9bb5" };
const colorOf = (name) => PALETTE[name] || BUCKET_COLOR[name] || "#bdbdb2";

export default function Sankey({ data }) {
  const ref = useD3(
    (el, width) => {
      if (!data || !data.nodes.length || !data.links.length) return;

      const W = Math.max(width, 600),
        H = 380;

      const layout = d3sankey()
        .nodeId((d) => d.name)
        .nodeWidth(13)
        .nodePadding(15)
        .extent([
          [2, 8],
          [W - 2, H - 8],
        ]);

      let graph;
      try {
        graph = layout({
          nodes: data.nodes.map((d) => ({ ...d })),
          links: data.links.map((d) => ({ ...d })),
        });
      } catch {
        return;
      }

      const svg = d3
        .select(el)
        .append("svg")
        .attr("width", "100%")
        .attr("height", H)
        .attr("viewBox", `0 0 ${W} ${H}`)
        .style("display", "block")
        .style("font-family", SANS);

      const linkColor = (l) =>
        PALETTE[l.target.name]
          ? catColor(l.target.name)
          : colorOf(l.target.name);

      svg
        .append("g")
        .attr("fill", "none")
        .selectAll("path")
        .data(graph.links)
        .join("path")
        .attr("d", sankeyLinkHorizontal())
        .attr("stroke", (d) => linkColor(d))
        .attr("stroke-opacity", 0.28)
        .attr("stroke-width", (d) => Math.max(1, d.width))
        .on("mousemove", function (e, d) {
          d3.select(this).attr("stroke-opacity", 0.6);
          showTip(
            `<b>${d.source.name} → ${d.target.name}</b><br>${fMoney(d.value)}`,
            e
          );
        })
        .on("mouseleave", function () {
          d3.select(this).attr("stroke-opacity", 0.28);
          hideTip();
        });

      const nodeG = svg
        .append("g")
        .selectAll("g")
        .data(graph.nodes)
        .join("g");

      nodeG
        .append("rect")
        .attr("x", (d) => d.x0)
        .attr("y", (d) => d.y0)
        .attr("width", (d) => d.x1 - d.x0)
        .attr("height", (d) => Math.max(1, d.y1 - d.y0))
        .attr("rx", 3)
        .attr("fill", (d) => colorOf(d.name))
        .on("mousemove", (e, d) =>
          showTip(`<b>${d.name}</b><br>${fMoney(d.value)}`, e)
        )
        .on("mouseleave", hideTip);

      nodeG
        .append("text")
        .attr("x", (d) => (d.x0 < W / 2 ? d.x1 + 7 : d.x0 - 7))
        .attr("y", (d) => (d.y0 + d.y1) / 2)
        .attr("dy", "0.32em")
        .attr("text-anchor", (d) => (d.x0 < W / 2 ? "start" : "end"))
        .attr("fill", "#55554d")
        .attr("font-size", 11.5)
        .attr("font-weight", 600)
        .text((d) => d.name);

      nodeG
        .append("text")
        .attr("x", (d) => (d.x0 < W / 2 ? d.x1 + 7 : d.x0 - 7))
        .attr("y", (d) => (d.y0 + d.y1) / 2 + 13)
        .attr("text-anchor", (d) => (d.x0 < W / 2 ? "start" : "end"))
        .attr("fill", "#b4b4aa")
        .attr("font-size", 9.5)
        .attr("font-family", MONO)
        .text((d) => fMoney(d.value));
    },
    [data]
  );

  return <div ref={ref} style={{ width: "100%" }} />;
}
